import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Phone } from 'lucide-react'
import { company, services, type ServiceId } from '../data/company'
import { createLead, eur } from '../lib/leads'

const levels = [
  { id: 'essentiel', label: 'Essentiel', text: 'Matériaux fiables, rapport qualité-prix', range: [0, 0.4] },
  { id: 'confort', label: 'Confort', text: 'Le meilleur équilibre, finitions soignées', range: [0.3, 0.7] },
  { id: 'prestige', label: 'Prestige', text: 'Matériaux haut de gamme, sur-mesure', range: [0.6, 1] },
] as const

const timings = ['Dès que possible', 'Dans 1 à 3 mois', 'Dans 3 à 6 mois', 'Je me renseigne']

export default function Devis() {
  const [params] = useSearchParams()
  const initial = services.find((s) => s.id === params.get('service'))?.id ?? null

  const [step, setStep] = useState(initial ? 1 : 0)
  const [service, setService] = useState<ServiceId | null>(initial)
  const [surface, setSurface] = useState(40)
  const [level, setLevel] = useState<(typeof levels)[number]['id']>('confort')
  const [timing, setTiming] = useState(timings[1])
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', message: '', consent: false })
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const svc = services.find((s) => s.id === service)
  const estimate = useMemo(() => {
    if (!svc) return null
    const [min, max] = svc.priceRange
    const [a, b] = levels.find((l) => l.id === level)!.range
    const round = (n: number) => Math.round(n / 100) * 100
    return { low: round(surface * (min + (max - min) * a)), high: round(surface * (min + (max - min) * b)) }
  }, [svc, surface, level])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!svc || !estimate) return
    setStatus('sending')
    try {
      await createLead({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        service: svc.id,
        surface,
        timing,
        budget_low: estimate.low,
        budget_high: estimate.high,
        message: `[${levels.find((l) => l.id === level)!.label}] ${form.message.trim()}`,
      })
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <section className="container-x max-w-2xl py-24 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-brass" />
        <h1 className="mt-6 text-4xl font-semibold">Merci {form.name.split(' ')[0]} !</h1>
        <p className="mt-4 text-ink-muted">Votre demande est bien reçue. Nous vous recontactons sous 24 h ouvrables pour planifier la visite gratuite.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/realisations" className="btn-dark">Voir nos réalisations</Link>
          <a href={company.phoneHref} className="btn-primary"><Phone className="h-4 w-4" />Appeler maintenant</a>
        </div>
      </section>
    )
  }

  return (
    <section className="container-x grid gap-10 py-16 lg:grid-cols-[1fr_380px] lg:py-24">
      <div>
        <p className="eyebrow">Simulateur de devis</p>
        <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Estimez votre projet en 2 minutes.</h1>

        <div className="mt-8 flex gap-2" aria-label={`Étape ${step + 1} sur 3`}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-brass' : 'bg-ink/10'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold">Quel type de travaux ?</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setService(s.id); setStep(1) }}
                  className={`rounded-2xl border p-5 text-left transition hover:border-brass ${service === s.id ? 'border-brass bg-white' : 'border-ink/10 bg-white/60'}`}
                >
                  <p className="font-semibold">{s.title}</p>
                  <p className="mt-1 text-sm text-ink-muted">{s.pitch}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && svc && (
          <div className="mt-10 space-y-10">
            <div>
              <label htmlFor="surface" className="text-xl font-semibold">Surface concernée</label>
              <p className="text-sm text-ink-muted">En {svc.unit}</p>
              <div className="mt-5 flex items-center gap-4">
                <input id="surface" type="range" min={5} max={400} step={5} value={surface} onChange={(e) => setSurface(+e.target.value)} className="flex-1 accent-brass" />
                <input type="number" min={1} value={surface} onChange={(e) => setSurface(Math.max(1, +e.target.value))} className="field w-28 text-center" aria-label="Surface" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Niveau de finition</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {levels.map((l) => (
                  <button key={l.id} onClick={() => setLevel(l.id)} className={`rounded-2xl border p-5 text-left transition ${level === l.id ? 'border-brass bg-white ring-2 ring-brass/30' : 'border-ink/10 bg-white/60 hover:border-brass'}`}>
                    <p className="font-semibold">{l.label}</p>
                    <p className="mt-1 text-sm text-ink-muted">{l.text}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Quand souhaitez-vous démarrer ?</h2>
              <div className="mt-5 flex flex-wrap gap-2">
                {timings.map((t) => (
                  <button key={t} onClick={() => setTiming(t)} className={`rounded-full px-4 py-2 text-sm font-medium ${timing === t ? 'bg-ink text-white' : 'bg-white hover:bg-sand-deep'}`}>{t}</button>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(0)} className="btn text-ink-soft"><ArrowLeft className="h-4 w-4" />Retour</button>
              <button onClick={() => setStep(2)} className="btn-primary">Continuer <ArrowRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={submit} className="mt-10 grid gap-5 sm:grid-cols-2">
            <h2 className="text-xl font-semibold sm:col-span-2">Où pouvons-nous vous recontacter ?</h2>
            <div><label className="label" htmlFor="name">Nom complet *</label><input id="name" required autoComplete="name" className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label" htmlFor="phone">Téléphone *</label><input id="phone" required type="tel" autoComplete="tel" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label" htmlFor="email">E-mail *</label><input id="email" required type="email" autoComplete="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label" htmlFor="city">Commune du chantier *</label><input id="city" required className="field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="message">Votre projet en quelques mots</label><textarea id="message" rows={4} className="field" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            <label className="flex items-start gap-3 text-sm text-ink-muted sm:col-span-2">
              <input type="checkbox" required checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-1 accent-brass" />
              J’accepte que Renowation utilise ces données pour me recontacter au sujet de ma demande (RGPD).
            </label>
            {status === 'error' && <p className="text-sm text-red-700 sm:col-span-2">Envoi impossible pour le moment. Appelez-nous au {company.phone}.</p>}
            <div className="flex justify-between sm:col-span-2">
              <button type="button" onClick={() => setStep(1)} className="btn text-ink-soft"><ArrowLeft className="h-4 w-4" />Retour</button>
              <button type="submit" disabled={status === 'sending'} className="btn-primary disabled:opacity-60">
                {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Recevoir mon devis gratuit
              </button>
            </div>
          </form>
        )}
      </div>

      <aside className="h-fit rounded-3xl bg-ink p-8 text-white lg:sticky lg:top-24">
        <p className="eyebrow">Votre estimation</p>
        {svc && estimate ? (
          <>
            <p className="mt-4 text-sm text-white/60">{svc.title} · {surface} {svc.unit}</p>
            <p className="mt-2 font-display text-4xl text-brass-light">{eur(estimate.low)} – {eur(estimate.high)}</p>
            <p className="mt-1 text-xs text-white/50">HTVA, fourchette indicative</p>
          </>
        ) : (
          <p className="mt-4 text-white/60">Choisissez un type de travaux pour voir une première fourchette de prix.</p>
        )}
        <ul className="mt-8 space-y-3 text-sm text-white/75">
          {['Visite technique gratuite', 'Devis détaillé sous 48 h', 'Aide aux primes régionales'].map((t) => (
            <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brass-light" />{t}</li>
          ))}
        </ul>
        <p className="mt-8 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/50">
          Estimation non contractuelle basée sur des moyennes de marché. Le prix définitif est établi après visite sur place.
        </p>
      </aside>
    </section>
  )
}
