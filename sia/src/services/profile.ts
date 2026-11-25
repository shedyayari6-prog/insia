import { supabase } from '@/lib/supabase'
import type { Profile, ProfilePreferences } from '@/types'
import { ServiceError } from './auth'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw new ServiceError('Could not load your account details.')
  return data as Profile | null
}

export async function updateProfile(
  userId: string,
  changes: { full_name?: string; preferences?: ProfilePreferences },
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...changes }, { onConflict: 'id' })
    .select('*')
    .single()
  if (error) throw new ServiceError('Could not save your account details. Try again.')
  return data as Profile
}
