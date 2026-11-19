import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

// A malformed config file only fails at deploy time, so check the JSON files that deployment reads.
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('deploy and PWA config files', () => {
  it('vercel.json is valid JSON and rewrites every path to the SPA entry', () => {
    const config = JSON.parse(read('vercel.json'))
    expect(config.outputDirectory).toBe('dist')
    expect(config.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }])
  })

  it('the web manifest is valid JSON and its icon files exist', () => {
    const manifest = JSON.parse(read('public/manifest.webmanifest'))
    expect(manifest.dir).toBe('rtl')
    for (const icon of manifest.icons) expect(fs.existsSync(new URL(`../public${icon.src}`, import.meta.url))).toBe(true)
  })

  it('every icon and image linked from index.html exists in public/', () => {
    const html = read('index.html')
    const linked = [...html.matchAll(/(?:href|content)="(?:%VITE_SITE_URL%)?(\/[^"]+\.(?:png|svg|webmanifest))"/g)].map((m) => m[1])
    expect(linked.length).toBeGreaterThan(3)
    for (const file of new Set(linked)) expect(fs.existsSync(new URL(`../public${file}`, import.meta.url)), file).toBe(true)
  })
})
