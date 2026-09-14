import { supabase } from '@/services/supabase'
import { defaultTimeSlots } from '@/data/timeSlots'
import type { TimeSlot } from '@/types'

export interface WorkingHoursRow {
  id?: string
  business_id: string
  weekday: number // 0 = воскресенье … 6 = суббота
  open_time: string | null // 'HH:MM:SS'
  close_time: string | null
  is_day_off: boolean
}

export interface BlockedPeriodRow {
  id: string
  business_id: string
  start_at: string
  end_at: string
  reason: string | null
}

function requireClient() {
  if (!supabase) throw new Error('Supabase не подключён.')
  return supabase
}

export async function getWorkingHours(businessId: string): Promise<WorkingHoursRow[]> {
  const { data, error } = await requireClient()
    .from('working_hours')
    .select('*')
    .eq('business_id', businessId)
  if (error) throw new Error(error.message)
  return (data ?? []) as WorkingHoursRow[]
}

export async function getBlockedPeriods(businessId: string): Promise<BlockedPeriodRow[]> {
  const { data, error } = await requireClient()
    .from('blocked_periods')
    .select('*')
    .eq('business_id', businessId)
    .order('start_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as BlockedPeriodRow[]
}

// Шаблон слотов на дату: из working_hours (часовая сетка) или дефолт 09:00–20:00.
export function buildTemplate(hours: WorkingHoursRow[], dateISO: string): TimeSlot[] {
  const weekday = new Date(dateISO + 'T12:00:00').getDay()
  const day = hours.find((h) => h.weekday === weekday)
  if (!day || day.is_day_off || !day.open_time || !day.close_time) {
    return day?.is_day_off ? [] : defaultTimeSlots.map((s) => ({ ...s }))
  }
  const open = Number(day.open_time.slice(0, 2))
  const close = Number(day.close_time.slice(0, 2))
  const slots: TimeSlot[] = []
  for (let h = open; h < close; h++) {
    slots.push({ time: `${String(h).padStart(2, '0')}:00`, available: true })
  }
  return slots
}

// Какие часовые слоты даты пересекаются с blocked_periods.
export function blockedTimesForDate(periods: BlockedPeriodRow[], dateISO: string): string[] {
  const dayStart = new Date(dateISO + 'T00:00:00').getTime()
  const result: string[] = []
  for (let h = 0; h < 24; h++) {
    const slotStart = dayStart + h * 3600000
    const slotEnd = slotStart + 3600000
    const hit = periods.some((p) => {
      const s = new Date(p.start_at).getTime()
      const e = new Date(p.end_at).getTime()
      return s < slotEnd && e > slotStart
    })
    if (hit) result.push(`${String(h).padStart(2, '0')}:00`)
  }
  return result
}

export interface WorkingHoursInput {
  weekday: number
  open_time: string | null
  close_time: string | null
  is_day_off: boolean
}

// Полная перезапись недельного графика (7 строк). Опирается на
// unique(business_id, weekday) из миграции 0001.
export async function saveWorkingHours(
  businessId: string,
  rows: WorkingHoursInput[],
): Promise<void> {
  const payload = rows.map((r) => ({ business_id: businessId, ...r }))
  const { error } = await requireClient()
    .from('working_hours')
    .upsert(payload, { onConflict: 'business_id,weekday' })
  if (error) throw new Error(error.message)
}

export const STANDARD_SCHEDULE: WorkingHoursInput[] = [
  { weekday: 1, open_time: '10:00', close_time: '19:00', is_day_off: false },
  { weekday: 2, open_time: '10:00', close_time: '19:00', is_day_off: false },
  { weekday: 3, open_time: '10:00', close_time: '19:00', is_day_off: false },
  { weekday: 4, open_time: '10:00', close_time: '19:00', is_day_off: false },
  { weekday: 5, open_time: '10:00', close_time: '19:00', is_day_off: false },
  { weekday: 6, open_time: '10:00', close_time: '16:00', is_day_off: false },
  { weekday: 0, open_time: null, close_time: null, is_day_off: true },
]

export async function blockHour(businessId: string, dateISO: string, time: string): Promise<void> {
  const [h, m] = time.split(':').map(Number)
  const start = new Date(dateISO + 'T00:00:00')
  start.setHours(h, m || 0, 0, 0)
  const end = new Date(start.getTime() + 3600000)
  const { error } = await requireClient().from('blocked_periods').insert({
    business_id: businessId,
    start_at: start.toISOString(),
    end_at: end.toISOString(),
    reason: 'Заблокировано мастером',
  })
  if (error) throw new Error(error.message)
}

// Снимаем блокировку: удаляем периоды, пересекающиеся с часом.
export async function unblockHour(businessId: string, dateISO: string, time: string): Promise<void> {
  const periods = await getBlockedPeriods(businessId)
  const [h, m] = time.split(':').map(Number)
  const start = new Date(dateISO + 'T00:00:00')
  start.setHours(h, m || 0, 0, 0)
  const slotStart = start.getTime()
  const slotEnd = slotStart + 3600000
  const client = requireClient()
  const ids: string[] = []
  for (const p of periods) {
    const s = new Date(p.start_at).getTime()
    const e = new Date(p.end_at).getTime()
    if (s < slotEnd && e > slotStart) ids.push(p.id)
  }
  if (ids.length === 0) return
  const { error } = await client.from('blocked_periods').delete().in('id', ids)
  if (error) throw new Error(error.message)
}

function dayBounds(dateISO: string): { start: number; end: number } {
  const start = new Date(dateISO + 'T00:00:00').getTime()
  return { start, end: start + 86400000 }
}

// Заблокировать весь день (почасовыми отрезками — чтобы потом можно было
// точечно открывать отдельные часы). Уже заблокированные часы пропускаем.
export async function blockDay(businessId: string, dateISO: string): Promise<number> {
  const periods = await getBlockedPeriods(businessId)
  const already = new Set(blockedTimesForDate(periods, dateISO))
  const rows = []
  for (let h = 0; h < 24; h++) {
    const time = `${String(h).padStart(2, '0')}:00`
    if (already.has(time)) continue
    const start = new Date(dateISO + 'T00:00:00')
    start.setHours(h, 0, 0, 0)
    rows.push({
      business_id: businessId,
      start_at: start.toISOString(),
      end_at: new Date(start.getTime() + 3600000).toISOString(),
      reason: 'Выходной (день целиком)',
    })
  }
  if (rows.length === 0) return 0
  const { error } = await requireClient().from('blocked_periods').insert(rows)
  if (error) throw new Error(error.message)
  return rows.length
}

// Разблокировать весь день.
export async function unblockDay(businessId: string, dateISO: string): Promise<number> {
  const periods = await getBlockedPeriods(businessId)
  const { start, end } = dayBounds(dateISO)
  const ids = periods
    .filter((p) => {
      const s = new Date(p.start_at).getTime()
      const e = new Date(p.end_at).getTime()
      return s < end && e > start
    })
    .map((p) => p.id)
  if (ids.length === 0) return 0
  const { error } = await requireClient().from('blocked_periods').delete().in('id', ids)
  if (error) throw new Error(error.message)
  return ids.length
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart
}

// Скопировать блокировки недели (7 дней от weekStartISO) вперёд на N недель.
// Так составляется график на месяцы: настроил одну неделю — размножил.
// Уже занятые часы в целевых неделях не дублируем. Возвращает число созданных.
export async function copyWeekBlocks(
  businessId: string,
  weekStartISO: string,
  weeksAhead: number,
): Promise<number> {
  const weekStart = new Date(weekStartISO + 'T00:00:00').getTime()
  const weekEnd = weekStart + 7 * 86400000
  const periods = await getBlockedPeriods(businessId)
  const source = periods.filter((p) => {
    const s = new Date(p.start_at).getTime()
    return s >= weekStart && s < weekEnd
  })
  if (source.length === 0 || weeksAhead < 1) return 0

  const known: Array<{ s: number; e: number }> = periods.map((p) => ({
    s: new Date(p.start_at).getTime(),
    e: new Date(p.end_at).getTime(),
  }))
  const rows = []
  for (let n = 1; n <= weeksAhead; n++) {
    const off = n * 7 * 86400000
    for (const p of source) {
      const s = new Date(p.start_at).getTime() + off
      const e = new Date(p.end_at).getTime() + off
      if (known.some((k) => rangesOverlap(s, e, k.s, k.e))) continue
      known.push({ s, e })
      rows.push({
        business_id: businessId,
        start_at: new Date(s).toISOString(),
        end_at: new Date(e).toISOString(),
        reason: p.reason || 'Копия недели',
      })
    }
  }
  if (rows.length === 0) return 0
  const { error } = await requireClient().from('blocked_periods').insert(rows)
  if (error) throw new Error(error.message)
  return rows.length
}
