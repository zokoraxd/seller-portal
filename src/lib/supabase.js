// The Supabase client is created lazily and only when both env vars are set, so a fresh clone
// (no .env.local) runs in local-only mode and the supabase-js bundle is not even downloaded.
//
// Both values are PUBLIC by design: they identify the project and ship in the browser.
// Data is protected by row-level security in the database, not by hiding these.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabaseConfigured = Boolean(url && key)

let clientPromise = null

export function getSupabase() {
  if (!supabaseConfigured) return Promise.resolve(null)
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }),
  )
  return clientPromise
}
