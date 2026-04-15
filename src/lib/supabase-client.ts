'use client'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Browser-side Supabase client using the anon/publishable key.
 * Lazy-initialized and cached so we only open one websocket per tab.
 *
 * Intended for Realtime subscriptions — see REALTIME.md for the
 * notification channel pattern.
 */

let supabase: SupabaseClient | null = null

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY

    if (!url || !anonKey) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set'
      )
    }

    supabase = createClient(url, anonKey, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  }
  return supabase
}
