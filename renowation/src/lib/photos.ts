import { useEffect, useState } from 'react'
import type { ServiceId } from '../data/company'

export interface Photo {
  src: string
  alt: string
  category: ServiceId
  source?: string
}

let cache: Promise<Photo[]> | null = null

/** Photos importées depuis renowation.be par `npm run import:photos`. */
export function loadPhotos(): Promise<Photo[]> {
  cache ??= fetch('/photos/manifest.json')
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => [])
  return cache
}

export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[] | null>(null)
  useEffect(() => {
    loadPhotos().then(setPhotos)
  }, [])
  return photos
}

export function pick(photos: Photo[] | null, i: number, category?: ServiceId): Photo | undefined {
  if (!photos?.length) return undefined
  const pool = category ? photos.filter((p) => p.category === category) : photos
  const list = pool.length ? pool : photos
  return list[i % list.length]
}
