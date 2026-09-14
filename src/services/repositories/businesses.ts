import { supabase } from '@/services/supabase'
import type { Business } from '@/types'

function requireClient() {
  if (!supabase) throw new Error('Supabase не подключён.')
  return supabase
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  const { data, error } = await requireClient()
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Business | null) ?? null
}

export async function getBusinessById(id: string): Promise<Business | null> {
  const { data, error } = await requireClient()
    .from('businesses')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Business | null) ?? null
}

export async function getOwnBusiness(ownerId: string): Promise<Business | null> {
  const { data, error } = await requireClient()
    .from('businesses')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as Business | null) ?? null
}

export interface BusinessPatch {
  name?: string
  description?: string
  phone?: string
  email?: string
  city?: string
  address?: string
  timezone?: string
  instagram?: string
  telegram?: string
  phone_note?: string
  avatar_url?: string
}

export async function updateBusiness(id: string, patch: BusinessPatch): Promise<Business> {
  const payload: Record<string, unknown> = { ...patch }
  let { data, error } = await requireClient()
    .from('businesses')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error && isUnknownColumn(error)) {
    // Миграция 0006 ещё не применена — сохраняем без новых полей.
    delete payload.instagram
    delete payload.telegram
    delete payload.phone_note
    ;({ data, error } = await requireClient()
      .from('businesses')
      .update(payload)
      .eq('id', id)
      .select()
      .single())
  }
  if (error) throw new Error(error.message)
  return data as Business
}

function isUnknownColumn(err: { code?: string; message?: string }): boolean {
  const code = err.code ?? ''
  const msg = (err.message ?? '').toLowerCase()
  return (
    code === '42703' ||
    code === 'PGRST204' ||
    (msg.includes('column') &&
      (msg.includes('instagram') || msg.includes('telegram') || msg.includes('phone_note')))
  )
}
