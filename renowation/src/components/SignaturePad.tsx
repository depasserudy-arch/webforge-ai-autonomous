import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

/** Zone de signature manuscrite (souris, doigt, stylet). Renvoie un PNG en data URL, ou '' si vide. */
export default function SignaturePad({ onChange }: { onChange: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const c = ref.current!
    const ratio = window.devicePixelRatio || 1
    c.width = c.offsetWidth * ratio
    c.height = c.offsetHeight * ratio
    const ctx = c.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#16181d'
  }, [])

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top] as const
  }

  function start(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const ctx = ref.current!.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(...pos(e))
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return
    const ctx = ref.current!.getContext('2d')!
    ctx.lineTo(...pos(e))
    ctx.stroke()
  }
  function end() {
    if (!drawing.current) return
    drawing.current = false
    setEmpty(false)
    onChange(ref.current!.toDataURL('image/png'))
  }
  function clear() {
    const c = ref.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    setEmpty(true)
    onChange('')
  }

  return (
    <div>
      <div className="relative rounded-2xl border-2 border-dashed border-ink/20 bg-white">
        <canvas
          ref={ref}
          className="h-44 w-full touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          aria-label="Zone de signature"
        />
        {empty && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-ink-muted">Signez ici</span>}
      </div>
      <button type="button" onClick={clear} className="mt-2 inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
        <Eraser className="h-3.5 w-3.5" /> Effacer
      </button>
    </div>
  )
}
