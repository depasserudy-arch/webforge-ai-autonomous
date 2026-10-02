import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import PhotoTile from '../components/PhotoTile'
import { services } from '../data/company'
import { usePhotos } from '../lib/photos'

export default function Realisations() {
  const photos = usePhotos()
  const [filter, setFilter] = useState<string>('all')
  const [active, setActive] = useState<number | null>(null)

  const categories = useMemo(() => {
    const present = new Set(photos?.map((p) => p.category))
    return services.filter((s) => present.has(s.id))
  }, [photos])
  const list = useMemo(() => (filter === 'all' ? photos ?? [] : (photos ?? []).filter((p) => p.category === filter)), [photos, filter])

  useEffect(() => {
    if (active === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActive(null)
      if (e.key === 'ArrowRight') setActive((a) => (a! + 1) % list.length)
      if (e.key === 'ArrowLeft') setActive((a) => (a! - 1 + list.length) % list.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, list.length])

  return (
    <section className="container-x py-16 sm:py-24">
      <p className="eyebrow">Galerie</p>
      <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Nos réalisations</h1>
      <p className="mt-4 max-w-2xl text-ink-muted">Un aperçu de nos chantiers : toitures, façades, intérieurs et rénovations complètes.</p>

      {categories.length > 1 && (
        <div className="mt-10 flex flex-wrap gap-2">
          {[{ id: 'all', title: 'Tout' }, ...categories].map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === c.id ? 'bg-ink text-white' : 'bg-white hover:bg-sand-deep'}`}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}

      {photos && photos.length === 0 ? (
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="aspect-[4/3] overflow-hidden rounded-2xl"><PhotoTile label="Photo à importer" /></div>
          ))}
        </div>
      ) : (
        <div className="mt-12 columns-1 gap-4 sm:columns-2 lg:columns-3">
          {list.map((p, i) => (
            <button key={p.src} onClick={() => setActive(i)} className="mb-4 block w-full overflow-hidden rounded-2xl">
              <img src={p.src} alt={p.alt} loading="lazy" className="w-full transition duration-500 hover:scale-105" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-16 text-center">
        <Link to="/devis" className="btn-primary">Démarrer mon projet</Link>
      </div>

      {active !== null && list[active] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4" role="dialog" aria-modal onClick={() => setActive(null)}>
          <button className="absolute right-4 top-4 text-white" aria-label="Fermer"><X className="h-8 w-8" /></button>
          <button className="absolute left-2 text-white sm:left-6" aria-label="Précédente" onClick={(e) => { e.stopPropagation(); setActive((active - 1 + list.length) % list.length) }}><ChevronLeft className="h-10 w-10" /></button>
          <img src={list[active].src} alt={list[active].alt} className="max-h-[85vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          <button className="absolute right-2 text-white sm:right-6" aria-label="Suivante" onClick={(e) => { e.stopPropagation(); setActive((active + 1) % list.length) }}><ChevronRight className="h-10 w-10" /></button>
        </div>
      )}
    </section>
  )
}
