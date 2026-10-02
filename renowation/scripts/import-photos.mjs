#!/usr/bin/env node
/**
 * Importe toutes les photos du site renowation.be dans public/photos/
 * et génère public/photos/manifest.json, lu par la plateforme.
 *
 * Usage :  npm run import:photos            (site par défaut)
 *          npm run import:photos -- https://autre-site.be --max-pages 60
 *
 * Le crawler parcourt les pages internes, récupère <img src|srcset|data-src>,
 * <source srcset>, les background-image CSS inline et og:image, puis
 * télécharge chaque image unique (meilleure résolution de srcset).
 */
import { load } from 'cheerio'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const START = args.find((a) => a.startsWith('http')) ?? 'https://renowation.be'
const maxIdx = args.indexOf('--max-pages')
const MAX_PAGES = maxIdx >= 0 ? Number(args[maxIdx + 1]) : 40
const MIN_BYTES = 15_000 // ignore icônes, logos minuscules, pixels de tracking

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(root, 'public', 'photos')
const origin = new URL(START).origin
const host = new URL(START).hostname.replace(/^www\./, '')

const UA = 'Mozilla/5.0 (compatible; RenowationImporter/1.0)'
const IMG_EXT = /\.(jpe?g|png|webp|avif)(\?|$)/i

const CATEGORIES = [
  ['toiture', /toit|roof|tuile|ardoise|zinc|gouttiere|couverture/i],
  ['facade', /fa[cç]ade|crepi|enduit|brique|ravalement|exterieur/i],
  ['salle-de-bain', /bain|bath|douche|shower|sdb|wc/i],
  ['cuisine', /cuisine|kitchen/i],
  ['isolation', /isol|insulation|pir|laine/i],
  ['interieur', /interieur|salon|living|peinture|plafond|sol|parquet|carrelage|chambre/i],
]

// La photo elle-même (nom + alt) prime sur la page où elle apparaît.
function categorize(...texts) {
  for (const text of texts) for (const [cat, re] of CATEGORIES) if (re.test(text)) return cat
  return 'renovation'
}

function bestFromSrcset(srcset) {
  return srcset
    .split(',')
    .map((s) => s.trim().split(/\s+/))
    .filter(([u]) => u)
    .map(([u, d = '1x']) => ({ u, w: parseFloat(d) || 1 }))
    .sort((a, b) => b.w - a.w)[0]?.u
}

// WordPress : « photo-1024x683.jpg » → « photo.jpg » (original pleine résolution)
function upscaleWp(url) {
  return url.replace(/-\d{2,4}x\d{2,4}(?=\.(jpe?g|png|webp|avif)$)/i, '')
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
  if (!res.ok || !res.headers.get('content-type')?.includes('text/html')) return null
  return res.text()
}

async function crawl() {
  const queue = [START]
  const seen = new Set()
  const images = new Map() // url -> { alt, page }

  while (queue.length && seen.size < MAX_PAGES) {
    const url = queue.shift()
    const key = url.replace(/#.*$/, '').replace(/\/$/, '')
    if (seen.has(key)) continue
    seen.add(key)

    let html
    try {
      html = await fetchText(url)
    } catch (e) {
      console.warn(`  ! ${url} : ${e.message}`)
      continue
    }
    if (!html) continue
    console.log(`  page ${seen.size}/${MAX_PAGES} ${url}`)
    const $ = load(html)

    const add = (raw, alt = '') => {
      if (!raw || raw.startsWith('data:')) return
      try {
        const abs = new URL(raw, url).href
        if (!IMG_EXT.test(abs)) return
        if (!images.has(abs)) images.set(abs, { alt: alt.trim(), page: url })
      } catch {}
    }

    $('img').each((_, el) => {
      const $el = $(el)
      const alt = $el.attr('alt') ?? $el.attr('title') ?? ''
      const srcset = $el.attr('srcset') ?? $el.attr('data-srcset')
      add(srcset ? bestFromSrcset(srcset) : null, alt)
      add($el.attr('data-src') ?? $el.attr('data-lazy-src') ?? $el.attr('data-orig-file'), alt)
      add($el.attr('src'), alt)
    })
    $('source[srcset]').each((_, el) => add(bestFromSrcset($(el).attr('srcset'))))
    $('[style*="background"]').each((_, el) => {
      for (const m of ($(el).attr('style') ?? '').matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) add(m[1])
    })
    $('[data-bg],[data-background],[data-image]').each((_, el) => {
      const $el = $(el)
      add($el.attr('data-bg') ?? $el.attr('data-background') ?? $el.attr('data-image'))
    })
    add($('meta[property="og:image"]').attr('content'))
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (href && IMG_EXT.test(href)) add(href, $(el).attr('title') ?? '') // liens lightbox
    })

    $('a[href]').each((_, el) => {
      try {
        const next = new URL($(el).attr('href'), url)
        if (next.hostname.replace(/^www\./, '') !== host) return
        if (/\.(pdf|zip|jpe?g|png|webp|avif|gif|svg)$/i.test(next.pathname)) return
        if (/wp-(admin|login|json)|\/feed\/?$|\?replytocom/.test(next.href)) return
        next.hash = ''
        queue.push(next.href)
      } catch {}
    })
  }
  return images
}

async function download(images) {
  await mkdir(OUT_DIR, { recursive: true })
  const manifest = []
  const hashes = new Set()

  for (const [url, meta] of images) {
    const candidates = [...new Set([upscaleWp(url), url])]
    for (const candidate of candidates) {
      try {
        const res = await fetch(candidate, { headers: { 'User-Agent': UA, Referer: origin } })
        if (!res.ok) continue
        const buf = Buffer.from(await res.arrayBuffer())
        if (buf.length < MIN_BYTES) break
        const hash = createHash('sha1').update(buf).digest('hex').slice(0, 10)
        if (hashes.has(hash)) break
        hashes.add(hash)

        const ext = (candidate.match(IMG_EXT)?.[1] ?? 'jpg').toLowerCase().replace('jpeg', 'jpg')
        const base = path
          .basename(new URL(candidate).pathname)
          .replace(/\.[a-z]+$/i, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .slice(0, 50)
        const file = `${base}-${hash}.${ext}`
        await writeFile(path.join(OUT_DIR, file), buf)

        manifest.push({
          src: `/photos/${file}`,
          alt: meta.alt || base.replace(/-/g, ' '),
          category: categorize(`${path.basename(candidate)} ${meta.alt}`, new URL(meta.page).pathname),
          source: candidate,
        })
        console.log(`  ✓ ${file} (${Math.round(buf.length / 1024)} Ko)`)
        break
      } catch (e) {
        console.warn(`  ! ${candidate} : ${e.message}`)
      }
    }
  }

  await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))
  return manifest
}

console.log(`→ Exploration de ${START} (max ${MAX_PAGES} pages)`)
const images = await crawl()
console.log(`→ ${images.size} images détectées, téléchargement…`)
const manifest = await download(images)
console.log(`\n✔ ${manifest.length} photos importées dans public/photos/ (manifest.json mis à jour)`)
if (!manifest.length) {
  console.log('  Aucune photo : vérifiez l’URL ou la connexion, ou déposez les photos à la main (voir README).')
  process.exitCode = 1
}
