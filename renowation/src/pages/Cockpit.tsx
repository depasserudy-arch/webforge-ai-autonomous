import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Download, Lock, LogOut, Mail, MessageCircle, Phone, RefreshCw } from 'lucide-react'
import { Logo } from '../components/Layout'
import { services } from '../data/company'
import { authMode, backend, eur, isSignedIn, listLeads, signIn, signOut, STATUSES, updateLead, type Lead, type LeadStatus } from '../lib/leads'

const COMMISSION = 0.1 // modèle ALSA : 10 % du chiffre d'affaires signé
const serviceLabel = (id: string) => services.find((s) => s.id === id)?.title ?? id
const date = (iso: string) => new Date(iso).toLocaleDateString('fr-BE', { day: '2-digit', month: 'short' })

function Login({ onDone }: { onDone: () => void }) {
  const [login, setLogin] = useState('')
  const [secret, setSecret] = useState('')
  const [error, setError] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    try {
      await signIn(login, secret)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-card">
        <Logo />
        <h1 className="mt-6 flex items-center gap-2 text-2xl font-semibold"><Lock className="h-5 w-5 text-brass" />Cockpit commercial</h1>
        <p className="mt-1 text-sm text-ink-muted">Accès réservé à l’équipe Renowation & ALSA.</p>
        {authMode === 'supabase' && (
          <input className="field mt-6" type="email" placeholder="E-mail" autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} required />
        )}
        <input
          className="field mt-3"
          type="password"
          placeholder={authMode === 'supabase' ? 'Mot de passe' : 'Code d’accès'}
          autoComplete="current-password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          required
        />
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <button className="btn-dark mt-6 w-full">Entrer</button>
      </form>
    </div>
  )
}

export default function Cockpit() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      setLeads(await listLeads())
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    }
  }, [])

  useEffect(() => {
    isSignedIn().then(setAuthed)
  }, [])
  useEffect(() => {
    if (authed) refresh()
  }, [authed, refresh])

  const kpi = useMemo(() => {
    const active = leads.filter((l) => !['signe', 'perdu'].includes(l.status))
    const signed = leads.filter((l) => l.status === 'signe')
    const closed = leads.filter((l) => ['signe', 'perdu'].includes(l.status)).length
    const ca = signed.reduce((s, l) => s + (l.amount_signed ?? 0), 0)
    return {
      total: leads.length,
      pipeline: active.reduce((s, l) => s + (l.budget_low + l.budget_high) / 2, 0),
      ca,
      commission: ca * COMMISSION,
      conversion: closed ? Math.round((signed.length / closed) * 100) : 0,
    }
  }, [leads])

  async function move(lead: Lead, status: LeadStatus) {
    let amount_signed = lead.amount_signed
    if (status === 'signe') {
      const suggested = Math.round((lead.budget_low + lead.budget_high) / 2)
      const input = window.prompt('Montant signé (€ HTVA) :', String(lead.amount_signed ?? suggested))
      if (input === null) return
      amount_signed = Number(input.replace(/[^\d.]/g, '')) || 0
    }
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status, amount_signed } : l)))
    try {
      await updateLead(lead.id, { status, amount_signed })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mise à jour impossible')
      refresh()
    }
  }

  async function saveNotes(lead: Lead, notes: string) {
    if (notes === (lead.notes ?? '')) return
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, notes } : l)))
    try {
      await updateLead(lead.id, { notes })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible')
      refresh()
    }
  }

  function exportCsv() {
    const cols: (keyof Lead)[] = ['created_at', 'name', 'phone', 'email', 'city', 'service', 'surface', 'timing', 'budget_low', 'budget_high', 'status', 'amount_signed', 'message', 'notes']
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const csv = [cols.join(';'), ...leads.map((l) => cols.map((c) => esc(l[c])).join(';'))].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `renowation-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  if (authed === null) return null
  if (!authed) return <Login onDone={() => setAuthed(true)} />

  const tiles = [
    { label: 'Demandes reçues', value: String(kpi.total) },
    { label: 'Pipeline en cours', value: eur(kpi.pipeline) },
    { label: 'CA signé', value: eur(kpi.ca) },
    { label: 'Commission ALSA (10 %)', value: eur(kpi.commission), accent: true },
    { label: 'Taux de closing', value: `${kpi.conversion} %` },
  ]

  return (
    <div className="min-h-screen bg-sand">
      <header className="border-b border-ink/10 bg-white">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white sm:inline">Cockpit ALSA</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-ink-muted md:inline">Données : {backend}</span>
            <button onClick={refresh} className="btn !px-3 hover:bg-sand" aria-label="Actualiser"><RefreshCw className="h-4 w-4" /></button>
            <button onClick={exportCsv} className="btn !px-3 hover:bg-sand" aria-label="Exporter CSV"><Download className="h-4 w-4" /></button>
            <button onClick={() => signOut().then(() => setAuthed(false))} className="btn !px-3 hover:bg-sand" aria-label="Déconnexion"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      <main className="container-x py-8">
        {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {tiles.map((t) => (
            <div key={t.label} className={`rounded-2xl p-5 ${t.accent ? 'bg-ink text-white' : 'bg-white'}`}>
              <p className={`text-xs font-medium ${t.accent ? 'text-brass-light' : 'text-ink-muted'}`}>{t.label}</p>
              <p className="mt-2 font-display text-2xl font-semibold">{t.value}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-10 text-xl font-semibold">Pipeline</h2>
        {leads.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-white p-8 text-center text-ink-muted">
            Aucune demande pour l’instant. Les demandes du simulateur de devis apparaîtront ici.
          </p>
        ) : (
          <div className="mt-4 flex gap-4 overflow-x-auto pb-4 xl:grid xl:grid-cols-6 xl:gap-3 xl:overflow-visible">
            {STATUSES.map((s) => {
              const col = leads.filter((l) => l.status === s.id)
              return (
                <section key={s.id} className="w-72 shrink-0 rounded-2xl bg-sand-deep/60 p-3 xl:w-auto">
                  <h3 className="flex items-center justify-between px-1 font-sans text-sm font-semibold">
                    {s.label}<span className="rounded-full bg-white px-2 text-xs">{col.length}</span>
                  </h3>
                  <div className="mt-3 space-y-3">
                    {col.map((l) => (
                      <article key={l.id} className="rounded-xl bg-white p-4 text-sm shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold">{l.name}</p>
                          <span className="text-xs text-ink-muted">{date(l.created_at)}</span>
                        </div>
                        <p className="mt-1 text-ink-muted">{serviceLabel(l.service)} · {l.surface} m² · {l.city}</p>
                        <p className="mt-2 font-medium text-brass-dark">
                          {l.status === 'signe' && l.amount_signed != null ? `Signé : ${eur(l.amount_signed)}` : `${eur(l.budget_low)} – ${eur(l.budget_high)}`}
                        </p>
                        <p className="mt-1 text-xs text-ink-muted">{l.timing}</p>
                        {l.message && <p className="mt-2 line-clamp-3 text-xs text-ink-soft">{l.message}</p>}
                        <textarea
                          defaultValue={l.notes ?? ''}
                          onBlur={(e) => saveNotes(l, e.target.value)}
                          placeholder="Notes de suivi…"
                          rows={2}
                          maxLength={8000}
                          className="mt-3 w-full resize-y rounded-lg border border-ink/10 bg-sand/60 px-2 py-1.5 text-xs focus:border-brass focus:outline-none"
                          aria-label={`Notes sur ${l.name}`}
                        />
                        <div className="mt-3 flex flex-wrap items-center gap-1">
                          <a href={`tel:${l.phone}`} className="rounded-lg p-2 hover:bg-sand" aria-label="Appeler"><Phone className="h-4 w-4" /></a>
                          <a href={`https://wa.me/${l.phone.replace(/[^\d]/g, '').replace(/^0/, '32')}`} target="_blank" rel="noreferrer" className="rounded-lg p-2 hover:bg-sand" aria-label="WhatsApp"><MessageCircle className="h-4 w-4" /></a>
                          <a href={`mailto:${l.email}?subject=${encodeURIComponent('Votre projet de rénovation – Renowation')}`} className="rounded-lg p-2 hover:bg-sand" aria-label="E-mail"><Mail className="h-4 w-4" /></a>
                          <select
                            value={l.status}
                            onChange={(e) => move(l, e.target.value as LeadStatus)}
                            className="ml-auto rounded-lg border border-ink/10 bg-sand px-2 py-1 text-xs"
                            aria-label="Changer le statut"
                          >
                            {STATUSES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                          </select>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
