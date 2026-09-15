import { supabase } from '@/services/supabase'
import type { Booking } from '@/types'

type CloudStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

interface AppointmentRow {
  id: string
  business_id: string
  service_id: string | null
  client_id: string | null
  start_at: string
  end_at: string
  status: CloudStatus
  notes: string | null
  created_at: string
  services?: { name: string } | null
  clients?: { name: string; phone: string } | null
}

function zonedParts(iso: string, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  const hour = get('hour') === '24' ? '00' : get('hour')
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${hour}:${get('minute')}` }
}

// timeZone — таймзона бизнеса: дата/время показываем её стеной,
// а не часовым поясом браузера (важно, если мастер и клиент в разных зонах).
export function mapAppointment(row: AppointmentRow, timeZone?: string): Booking {
  const pad = (n: number) => String(n).padStart(2, '0')
  let date: string
  let time: string
  if (timeZone) {
    ;({ date, time } = zonedParts(row.start_at, timeZone))
  } else {
    const start = new Date(row.start_at)
    date = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`
    time = `${pad(start.getHours())}:${pad(start.getMinutes())}`
  }
  return {
    id: row.id,
    serviceId: row.service_id ?? '',
    serviceName: row.services?.name ?? 'Услуга',
    date,
    time,
    name: row.clients?.name ?? '',
    phone: row.clients?.phone ?? '',
    comment: row.notes ?? '',
    createdAt: row.created_at,
    status: row.status === 'completed' || row.status === 'no_show' ? 'completed' : row.status,
  }
}

function requireClient() {
  if (!supabase) throw new Error('Supabase не подключён.')
  return supabase
}

// Собираем ISO с оффсетом таймзоны бизнеса (без date-fns/tz-библиотек).
// Пример: zonedISO('2026-09-12', '14:00', 'Europe/Moscow') → '2026-09-12T14:00:00+03:00'
export function zonedISO(date: string, time: string, timeZone: string): string {
  const guess = new Date(`${date}T${time}:00Z`)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(guess)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  const asUTC = Date.UTC(
    Number(get('year')),
    Number(get('month')) - 1,
    Number(get('day')),
    Number(get('hour')),
    Number(get('minute')),
    Number(get('second')),
  )
  const diffMin = Math.round((asUTC - guess.getTime()) / 60000)
  const sign = diffMin >= 0 ? '+' : '-'
  const abs = Math.abs(diffMin)
  const off = `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`
  return `${date}T${time}:00${off}`
}

export function addMinutesISO(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString()
}

export async function listAppointments(businessId: string, timeZone?: string): Promise<Booking[]> {
  const { data, error } = await requireClient()
    .from('appointments')
    .select('*, services(name), clients(name, phone)')
    .eq('business_id', businessId)
    .order('start_at', { ascending: true })
  if (error) throw new Error(error.message)
  return ((data ?? []) as AppointmentRow[]).map((row) => mapAppointment(row, timeZone))
}

export interface AppointmentInput {
  serviceId: string
  date: string
  time: string
  durationMinutes: number
  timezone: string
  name: string
  phone: string
  comment: string
}

// Гость без аккаунта: находим клиента по телефону в рамках бизнеса
// или создаём (уникальный индекс + повторный select закрывают гонку).
export async function createAppointment(businessId: string, input: AppointmentInput): Promise<Booking> {
  const client = requireClient()
  const phone = input.phone.trim()

  let clientId: string | null = null
  if (phone) {
    const found = await client
      .from('clients')
      .select('id')
      .eq('business_id', businessId)
      .eq('phone', phone)
      .maybeSingle()
    if (found.error) throw new Error(found.error.message)
    clientId = (found.data as { id: string } | null)?.id ?? null
  }
  if (!clientId) {
    const created = await client
      .from('clients')
      .insert({ business_id: businessId, name: input.name.trim(), phone, email: '' })
      .select('id')
      .single()
    if (created.error) {
      // Гонка двух одновременных записей: клиент уже создан — перечитываем.
      if (created.error.code === '23505' && phone) {
        const retry = await client
          .from('clients')
          .select('id')
          .eq('business_id', businessId)
          .eq('phone', phone)
          .single()
        if (retry.error) throw new Error(retry.error.message)
        clientId = (retry.data as { id: string }).id
      } else {
        throw new Error(created.error.message)
      }
    } else {
      clientId = (created.data as { id: string }).id
    }
  }

  const startAt = zonedISO(input.date, input.time, input.timezone)
  const endAt = addMinutesISO(startAt, input.durationMinutes)

  const { data, error } = await client
    .from('appointments')
    .insert({
      business_id: businessId,
      service_id: input.serviceId || null,
      client_id: clientId,
      start_at: startAt,
      end_at: endAt,
      status: 'pending',
      notes: input.comment.trim(),
    })
    .select('*, services(name), clients(name, phone)')
    .single()
  // Триггер prevent_appointment_overlap отвечает кодом P0001 + SLOT_TAKEN.
  if (error) throw new Error(error.message)
  return mapAppointment(data as AppointmentRow)
}

export interface DayTimes {
  booked: string[]
  blocked: string[]
}

// Публичный доступ к занятости даты (без PII): какие часы заняты
// записями, а какие заблокированы мастером. Работает и для anon.
export async function getDayTimes(
  businessId: string,
  dateISO: string,
  timezone: string,
): Promise<DayTimes> {
  const { data, error } = await requireClient().rpc('get_day_times', {
    p_business_id: businessId,
    p_date: dateISO,
    p_timezone: timezone,
  })
  if (error) throw new Error(error.message)
  const d = (data ?? {}) as { booked?: string[]; blocked?: string[] }
  return { booked: d.booked ?? [], blocked: d.blocked ?? [] }
}

export interface GuestBookingInput {
  serviceId: string
  date: string
  time: string
  durationMinutes: number
  timezone: string
  name: string
  phone: string
  comment: string
  captchaToken?: string
}

// Гостевая запись с сайта (anon): find-or-create клиента, вставка записи,
// пересечения ловит серверный триггер (SLOT_TAKEN). PII других клиентов
// гостю недоступны — в ответе только его собственная запись.
export async function createBookingGuest(
  businessId: string,
  input: GuestBookingInput,
): Promise<Booking> {
  const { data, error } = await requireClient().rpc('create_booking', {
    p_business_id: businessId,
    p_service_id: input.serviceId,
    p_date: input.date,
    p_time: input.time,
    p_duration_minutes: input.durationMinutes,
    p_timezone: input.timezone,
    p_name: input.name.trim(),
    p_phone: input.phone,
    p_comment: input.comment.trim(),
    p_captcha_token: input.captchaToken ?? '',
  })
  if (error) throw new Error(error.message)
  const r = data as {
    id: string
    service_name: string
    date: string
    time: string
    name: string
    phone: string
  }
  return {
    id: r.id,
    serviceId: input.serviceId,
    serviceName: r.service_name,
    date: r.date,
    time: r.time,
    name: input.name,
    phone: input.phone,
    comment: input.comment,
    createdAt: new Date().toISOString(),
    status: 'pending',
  }
}

export async function updateAppointmentStatus(id: string, status: CloudStatus): Promise<void> {
  const { error } = await requireClient().from('appointments').update({ status }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await requireClient().from('appointments').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
