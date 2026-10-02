import { useEffect, useState, type FormEvent } from 'react'
import { Copy, ExternalLink, FileText, Mail, MessageCircle, Paperclip, Phone, Plus, Send, Trash2, X } from 'lucide-react'
import { services } from '../data/company'
import { eur, type Lead } from '../lib/leads'
import {
  ajouterEncaissement, changerStatut, CONDITIONS_DEFAUT, creerOffre, deposerDocument, documentsDisponibles,
  lienDocument, lienOffre, listDocuments, modifierOffre, OFFRE_STATUTS, supprimerDocument, totaux,
  type Document, type Encaissement, type Ligne, type Offre,
} from '../lib/offres'

const eur2 = (n: number) => new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)
const BADGE: Record<string, string> = {
  brouillon: 'bg-sand-deep text-ink-soft',
  envoyee: 'bg-blue-50 text-blue-800',
  signee: 'bg-emerald-50 text-emerald-800',
  refusee: 'bg-red-50 text-red-800',
  annulee: 'bg-ink/5 text-ink-muted',
}

function lignesInitiales(lead: Lead): Ligne[] {
  const s = services.find((x) => x.id === lead.service)
  if (!s) return [{ libelle: '', quantite: 1, unite: 'forfait', prix_unitaire: 0 }]
  return [{ libelle: s.title, quantite: lead.surface || 1, unite: 'm²', prix_unitaire: Math.round((s.priceRange[0] + s.priceRange[1]) / 2) }]
}

function Editeur({ lead, offre, onDone }: { lead: Lead; offre?: Offre; onDone: (err?: string) => void }) {
  const [objet, setObjet] = useState(offre?.objet ?? `${services.find((s) => s.id === lead.service)?.title ?? 'Travaux'} — ${lead.city}`)
  const [lignes, setLignes] = useState<Ligne[]>(offre?.lignes ?? lignesInitiales(lead))
  const [tva, setTva] = useState(offre?.tva_taux ?? 6)
  const [conditions, setConditions] = useState(offre?.conditions ?? CONDITIONS_DEFAUT)
  const t = totaux(lignes, tva)
  const set = (i: number, patch: Partial<Ligne>) => setLignes(lignes.map((l, j) => (j === i ? { ...l, ...patch } : l)))

  async function save(e: FormEvent) {
    e.preventDefault()
    const propres = lignes.filter((l) => l.libelle.trim())
    try {
      if (offre) await modifierOffre(offre.id, { objet, lignes: propres, tva_taux: tva, conditions })
      else await creerOffre(lead, { objet, lignes: propres, tva_taux: tva, conditions })
      onDone()
    } catch (err) {
      onDone(err instanceof Error ? err.message : 'Enregistrement impossible')
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-brass/40 bg-white p-4">
      <input className="field" value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Objet de l’offre" aria-label="Objet" />
      <div className="space-y-2">
        {lignes.map((l, i) => (
          <div key={i} className="grid grid-cols-12 gap-2">
            <input className="field col-span-12 !py-2 sm:col-span-5" placeholder="Désignation" value={l.libelle} onChange={(e) => set(i, { libelle: e.target.value })} aria-label="Désignation" />
            <input className="field col-span-3 !py-2 sm:col-span-2" type="number" min={0} step="0.01" value={l.quantite} onChange={(e) => set(i, { quantite: +e.target.value })} aria-label="Quantité" />
            <input className="field col-span-3 !py-2 sm:col-span-1 !px-2" value={l.unite} onChange={(e) => set(i, { unite: e.target.value })} aria-label="Unité" />
            <input className="field col-span-4 !py-2 sm:col-span-3" type="number" min={0} step="0.01" value={l.prix_unitaire} onChange={(e) => set(i, { prix_unitaire: +e.target.value })} aria-label="Prix unitaire HTVA" />
            <button type="button" onClick={() => setLignes(lignes.filter((_, j) => j !== i))} className="col-span-2 flex items-center justify-center rounded-lg hover:bg-sand sm:col-span-1" aria-label="Supprimer la ligne"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => setLignes([...lignes, { libelle: '', quantite: 1, unite: 'forfait', prix_unitaire: 0 }])} className="inline-flex items-center gap-1 text-sm font-medium text-brass-dark"><Plus className="h-4 w-4" />Ajouter une ligne</button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sand p-3 text-sm">
        <label className="flex items-center gap-2">TVA
          <select value={tva} onChange={(e) => setTva(+e.target.value)} className="rounded-lg border border-ink/10 bg-white px-2 py-1">
            <option value={6}>6 % (habitation &gt; 10 ans)</option>
            <option value={21}>21 %</option>
            <option value={0}>0 % (autoliquidation)</option>
          </select>
        </label>
        <span>HTVA <b>{eur2(t.htva)}</b> · TVAC <b>{eur2(t.tvac)}</b></span>
      </div>
      <textarea className="field text-sm" rows={3} value={conditions} onChange={(e) => setConditions(e.target.value)} aria-label="Conditions" />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => onDone()} className="btn text-ink-soft hover:bg-sand">Annuler</button>
        <button className="btn-dark">Enregistrer le brouillon</button>
      </div>
    </form>
  )
}

function Encaisser({ offre, onDone }: { offre: Offre; onDone: (err?: string) => void }) {
  const [montant, setMontant] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [mode, setMode] = useState<Encaissement['mode']>('virement')
  async function save(e: FormEvent) {
    e.preventDefault()
    try {
      await ajouterEncaissement(offre, { montant: Number(montant.replace(',', '.')), encaisse_le: date, mode, note: '' })
      setMontant('')
      onDone()
    } catch (err) {
      onDone(err instanceof Error ? err.message : 'Encaissement refusé')
    }
  }
  return (
    <form onSubmit={save} className="mt-3 flex flex-wrap items-end gap-2 text-sm">
      <input className="field w-32 !py-2" required inputMode="decimal" placeholder="Montant €" value={montant} onChange={(e) => setMontant(e.target.value)} aria-label="Montant encaissé" />
      <input className="field w-40 !py-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date d’encaissement" />
      <select className="field w-32 !py-2" value={mode} onChange={(e) => setMode(e.target.value as Encaissement['mode'])} aria-label="Mode">
        <option value="virement">Virement</option><option value="carte">Carte</option><option value="especes">Espèces</option><option value="autre">Autre</option>
      </select>
      <button className="btn-primary !py-2">Enregistrer</button>
    </form>
  )
}

export default function Dossier({ lead, offres, encaissements, onClose, onChange }: {
  lead: Lead
  offres: Offre[]
  encaissements: Encaissement[]
  onClose: () => void
  onChange: (err?: string) => void
}) {
  const [edition, setEdition] = useState<Offre | 'new' | null>(null)
  const [docs, setDocs] = useState<Document[]>([])
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (documentsDisponibles) listDocuments(lead.id).then(setDocs).catch(() => {})
  }, [lead.id])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const done = (err?: string) => {
    setEdition(null)
    onChange(err)
  }
  async function statut(o: Offre, s: 'envoyee' | 'refusee' | 'annulee') {
    try {
      await changerStatut(o, s)
      onChange()
    } catch (err) {
      onChange(err instanceof Error ? err.message : 'Action impossible')
    }
  }
  async function copier(o: Offre) {
    try {
      await navigator.clipboard.writeText(lienOffre(o.jeton))
      setInfo('Lien copié')
    } catch {
      setInfo(lienOffre(o.jeton))
    }
    setTimeout(() => setInfo(''), 4000)
  }
  async function deposer(files: FileList | null) {
    try {
      for (const f of Array.from(files ?? [])) await deposerDocument(lead.id, f)
      setDocs(await listDocuments(lead.id))
    } catch (err) {
      onChange(err instanceof Error ? err.message : 'Dépôt impossible')
    }
  }

  const mail = (o: Offre) =>
    `mailto:${lead.email}?subject=${encodeURIComponent(`Votre offre ${o.numero} — Renowation`)}&body=${encodeURIComponent(
      `Bonjour ${lead.name.split(' ')[0]},\n\nSuite à notre visite, voici votre offre ${o.numero} (${eur2(o.montant_tvac)} TVAC).\nVous pouvez la consulter et la signer en ligne ici :\n${lienOffre(o.jeton)}\n\nJe reste à votre disposition pour toute question.\n\nBien cordialement,\nL’équipe Renowation`,
    )}`

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <aside role="dialog" aria-modal aria-label={`Dossier ${lead.name}`} className="h-full w-full max-w-2xl overflow-y-auto bg-sand p-5 shadow-2xl sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Dossier client</p>
            <h2 className="mt-1 text-2xl font-semibold">{lead.name}</h2>
            <p className="mt-1 text-sm text-ink-muted">{services.find((s) => s.id === lead.service)?.title} · {lead.surface} m² · {lead.city} · {lead.timing}</p>
            <p className="mt-1 text-sm text-brass-dark">Estimation simulateur : {eur(lead.budget_low)} – {eur(lead.budget_high)}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white" aria-label="Fermer"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <a href={`tel:${lead.phone}`} className="btn !px-4 !py-2 bg-white hover:bg-sand-deep"><Phone className="h-4 w-4" />{lead.phone}</a>
          <a href={`https://wa.me/${lead.phone.replace(/[^\d]/g, '').replace(/^0/, '32')}`} target="_blank" rel="noreferrer" className="btn !px-4 !py-2 bg-white hover:bg-sand-deep"><MessageCircle className="h-4 w-4" />WhatsApp</a>
          <a href={`mailto:${lead.email}`} className="btn !px-4 !py-2 bg-white hover:bg-sand-deep"><Mail className="h-4 w-4" />{lead.email}</a>
        </div>
        {lead.message && <p className="mt-4 rounded-xl bg-white p-3 text-sm text-ink-soft">{lead.message}</p>}

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h3 className="font-sans text-lg font-semibold">Offres</h3>
            {edition === null && <button onClick={() => setEdition('new')} className="btn-dark !py-2"><Plus className="h-4 w-4" />Nouvelle offre</button>}
          </div>
          {info && <p className="mt-2 break-all rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900">{info}</p>}
          <div className="mt-4 space-y-3">
            {edition === 'new' && <Editeur lead={lead} onDone={done} />}
            {offres.length === 0 && edition === null && <p className="rounded-xl bg-white p-4 text-sm text-ink-muted">Aucune offre. Créez-en une après la visite technique.</p>}
            {offres.map((o) => {
              if (edition !== null && edition !== 'new' && edition.id === o.id) return <Editeur key={o.id} lead={lead} offre={o} onDone={done} />
              const encs = encaissements.filter((e) => e.offre_id === o.id)
              const encaisse = encs.reduce((s, e) => s + e.montant, 0)
              return (
                <article key={o.id} className="rounded-2xl bg-white p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold"><FileText className="mr-1 inline h-4 w-4 text-brass" />{o.numero} <span className="font-normal text-ink-muted">· {o.objet}</span></p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[o.statut]}`}>{OFFRE_STATUTS[o.statut]}</span>
                  </div>
                  <p className="mt-2">{eur2(o.montant_htva)} HTVA · <b>{eur2(o.montant_tvac)} TVAC</b> <span className="text-ink-muted">(TVA {o.tva_taux} %)</span></p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {o.statut === 'brouillon' && (
                      <>
                        <button onClick={() => setEdition(o)} className="btn !px-3 !py-1.5 bg-sand hover:bg-sand-deep">Modifier</button>
                        <button onClick={() => statut(o, 'envoyee')} className="btn-primary !px-3 !py-1.5"><Send className="h-3.5 w-3.5" />Envoyer au client</button>
                        <button onClick={() => statut(o, 'annulee')} className="btn !px-3 !py-1.5 text-ink-muted hover:bg-sand">Annuler</button>
                      </>
                    )}
                    {o.statut === 'envoyee' && (
                      <>
                        <a href={mail(o)} className="btn-primary !px-3 !py-1.5"><Mail className="h-3.5 w-3.5" />E-mail avec le lien</a>
                        <button onClick={() => copier(o)} className="btn !px-3 !py-1.5 bg-sand hover:bg-sand-deep"><Copy className="h-3.5 w-3.5" />Copier le lien</button>
                        <a href={lienOffre(o.jeton)} target="_blank" rel="noreferrer" className="btn !px-3 !py-1.5 bg-sand hover:bg-sand-deep"><ExternalLink className="h-3.5 w-3.5" />Voir</a>
                        <button onClick={() => statut(o, 'refusee')} className="btn !px-3 !py-1.5 text-ink-muted hover:bg-sand">Refusée</button>
                      </>
                    )}
                    {o.statut === 'signee' && (
                      <a href={lienOffre(o.jeton)} target="_blank" rel="noreferrer" className="btn !px-3 !py-1.5 bg-sand hover:bg-sand-deep"><ExternalLink className="h-3.5 w-3.5" />Offre signée</a>
                    )}
                  </div>
                  {o.statut === 'signee' && (
                    <div className="mt-4 border-t border-ink/10 pt-3">
                      <p className="font-medium">Encaissé {eur2(encaisse)} / {eur2(o.montant_tvac)} <span className="text-ink-muted">· reste {eur2(o.montant_tvac - encaisse)}</span></p>
                      {encs.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                          {encs.map((e) => <li key={e.id}>{new Date(e.encaisse_le).toLocaleDateString('fr-BE')} · {e.mode} · <b className={e.montant < 0 ? 'text-red-700' : ''}>{eur2(e.montant)}</b></li>)}
                        </ul>
                      )}
                      <Encaisser offre={o} onDone={onChange} />
                      <p className="mt-2 text-xs text-ink-muted">Correction : saisir un montant négatif (les encaissements ne se suppriment pas).</p>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        <section className="mt-8">
          <h3 className="font-sans text-lg font-semibold">Photos & documents</h3>
          {documentsDisponibles ? (
            <>
              <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 bg-white p-5 text-sm text-ink-muted hover:border-brass">
                <Paperclip className="h-4 w-4" />Déposer photos, plans ou PDF
                <input type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => deposer(e.target.files)} />
              </label>
              <ul className="mt-3 space-y-2 text-sm">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2">
                    <button onClick={async () => window.open(await lienDocument(d.chemin), '_blank')} className="truncate text-left hover:text-brass">{d.nom}</button>
                    <button onClick={async () => { await supprimerDocument(d); setDocs(await listDocuments(lead.id)) }} className="rounded-lg p-1.5 hover:bg-sand" aria-label={`Supprimer ${d.nom}`}><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 rounded-xl bg-white p-4 text-sm text-ink-muted">Le dépôt de photos de chantier s’active dès que Supabase est branché.</p>
          )}
        </section>
      </aside>
    </div>
  )
}
