import { ImageIcon } from 'lucide-react'
import type { Photo } from '../lib/photos'

interface Props {
  photo?: Photo
  className?: string
  label?: string
  eager?: boolean
}

/** Affiche une photo importée, ou un visuel de remplacement soigné tant que l'import n'est pas fait. */
export default function PhotoTile({ photo, className = '', label, eager }: Props) {
  if (photo) {
    return (
      <img
        src={photo.src}
        alt={photo.alt}
        loading={eager ? 'eager' : 'lazy'}
        className={`h-full w-full object-cover ${className}`}
      />
    )
  }
  return (
    <div
      role="img"
      aria-label={label ?? 'Photo de réalisation à venir'}
      className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-ink-soft via-ink to-[#3a2f22] text-brass-light/70 ${className}`}
    >
      <ImageIcon className="h-8 w-8" strokeWidth={1.25} />
      {label && <span className="px-4 text-center text-xs uppercase tracking-widest">{label}</span>}
    </div>
  )
}
