// After a new deployment the hashed file names change. A tab that still runs the old page then
// fails to download a screen's code ("Failed to fetch dynamically imported module"). Reloading
// once fetches the new index.html and everything works again.

const STALE_CHUNK = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i
const KEY = 'seller_portal_chunk_reload'

export const isStaleChunkError = (error) => STALE_CHUNK.test(String(error?.message ?? error ?? ''))

/** Reload to `url` once per session. Returns true if a reload was started (false = already tried). */
export function reloadOnceForNewDeployment(url) {
  try {
    if (sessionStorage.getItem(KEY)) return false
    sessionStorage.setItem(KEY, '1')
  } catch {
    return false // storage blocked: do not risk a reload loop
  }
  window.location.assign(url)
  return true
}

export function clearReloadFlag() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* nothing to clear */
  }
}
