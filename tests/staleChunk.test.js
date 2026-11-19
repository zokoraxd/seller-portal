import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearReloadFlag, isStaleChunkError, reloadOnceForNewDeployment } from '../src/lib/staleChunk'

describe('isStaleChunkError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://x.app/assets/AdminAnalytics-abc.js', // Chrome / Edge
    'error loading dynamically imported module: https://x.app/assets/a.js', // Firefox
    'Importing a module script failed.', // Safari
    'Unable to preload CSS for /assets/index-abc.css',
  ])('recognises %j', (message) => {
    expect(isStaleChunkError(new TypeError(message))).toBe(true)
    expect(isStaleChunkError(message)).toBe(true)
  })

  it.each([[new Error('Network request failed')], [new Error('Cannot read properties of undefined')], [null], [undefined], ['']])(
    'ignores unrelated error %j',
    (error) => {
      expect(isStaleChunkError(error)).toBe(false)
    },
  )
})

describe('reloadOnceForNewDeployment', () => {
  const store = new Map()
  const assign = vi.fn()
  vi.stubGlobal('sessionStorage', { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) })
  vi.stubGlobal('window', { location: { assign } })

  afterEach(() => {
    store.clear()
    assign.mockClear()
  })

  it('reloads the first time and not again, so a broken deployment cannot cause a reload loop', () => {
    expect(reloadOnceForNewDeployment('/admin/analytics')).toBe(true)
    expect(assign).toHaveBeenCalledWith('/admin/analytics')
    expect(reloadOnceForNewDeployment('/admin/analytics')).toBe(false)
    expect(assign).toHaveBeenCalledTimes(1)
  })

  it('can reload again after a successful navigation cleared the flag', () => {
    reloadOnceForNewDeployment('/a')
    clearReloadFlag()
    expect(reloadOnceForNewDeployment('/b')).toBe(true)
    expect(assign).toHaveBeenCalledTimes(2)
  })
})
