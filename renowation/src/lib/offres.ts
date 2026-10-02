// Offres signées en ligne, encaissements et journal de commission.
// Avec Supabase, toutes les règles (totaux, gel après signature, commission) sont appliquées
// en base. Le mode local reproduit la même logique dans le navigateur, pour les démos.
import { listLeads, supabase, updateLead, type Lead } from './leads'

export type OffreStatut = 'brouillon' | 'envoyee' | 'signee' | 'refusee' | 'annulee'

export const OFFRE_STATUTS: Record<OffreStatut, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  signee: 'Signée',
  refusee: 'Refusée',
  annulee: 'Annulée',
}

export interface Ligne {
  libelle: string
  quantite: number
  unite: string
  prix_unitaire: number
}

export interface Offre {
  id: string
  lead_id: string
  numero: string
  statut: OffreStatut
  objet: string
  lignes: Ligne[]
  tva_taux: number
  montant_htva: number
  montant_tva: number
  montant_tvac: number
  conditions: string
  jeton: string
  valide_jusqu_au: string
  created_at: string
  envoyee_le: string | null
  signee_le: string | null
}

export interface OffrePublique {
  numero: string
  statut: OffreStatut
  objet: string
  lignes: Ligne[]
  tva_taux: number
  montant_htva: number
  montant_tva: number
  montant_tvac: number
  conditions: string
  valide_jusqu_au: string
  signee_le: string | null
  expiree: boolean
  client: { nom: string; commune: string }
  signataire: string | null
}

export interface Encaissement {
  id: string
  offre_id: string
  montant: number
  encaisse_le: string
  mode: 'virement' | 'carte' | 'especes' | 'autre'
  note: string
  created_at: string
}

export interface LigneCommission {
  id: string
  encaissement_id: string
  reference: string
  montant_encaisse: number
  taux: number
  commission: number
  encaisse_le: string
}

export const TAUX_COMMISSION = 0.1
export const CONDITIONS_DEFAUT =
  'Acompte de 30 % à la signature, solde à la réception des travaux. Prix HTVA, TVA au taux applicable. Offre valable 30 jours.'

export function totaux(lignes: Ligne[], tva: number) {
  const htva = lignes.reduce((s, l) => s + Math.round(l.quantite * l.prix_unitaire * 100) / 100, 0)
  const montantTva = Math.round(htva * tva) / 100
  return { htva, tva: montantTva, tvac: htva + montantTva }
}

export const lienOffre = (jeton: string) =>
  import.meta.env.VITE_PREVIEW === '1'
    ? `${window.location.origin}${window.location.pathname}#/offre/${jeton}`
    : `${window.location.origin}/offre/${jeton}`

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

// --- Stockage local (démo) ---------------------------------------------------
const K = { offres: 'renowation.offres', enc: 'renowation.encaissements', com: 'renowation.commission', sig: 'renowation.signatures' }
function read<T>(k: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(k) ?? '[]')
  } catch {
    return []
  }
}
function write<T>(k: string, v: T[]) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {}
}
function jetonLocal() {
  const b = new Uint8Array(24)
  crypto.getRandomValues(b)
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

// --- Offres -----------------------------------------------------------------
export async function listOffres(): Promise<Offre[]> {
  if (supabase) {
    const { data, error } = await supabase.from('offres').select('*').order('created_at', { ascending: false })
    fail(error)
    return data as Offre[]
  }
  return read<Offre>(K.offres)
}

export async function creerOffre(lead: Lead, init: Pick<Offre, 'objet' | 'lignes' | 'tva_taux' | 'conditions'>): Promise<Offre> {
  if (supabase) {
    const { data, error } = await supabase.from('offres').insert({ lead_id: lead.id, ...init }).select().single()
    fail(error)
    return data as Offre
  }
  const all = read<Offre>(K.offres)
  const t = totaux(init.lignes, init.tva_taux)
  const offre: Offre = {
    ...init,
    id: crypto.randomUUID(),
    lead_id: lead.id,
    numero: `REN-${new Date().getFullYear()}-${String(all.length + 1).padStart(4, '0')}`,
    statut: 'brouillon',
    montant_htva: t.htva,
    montant_tva: t.tva,
    montant_tvac: t.tvac,
    jeton: jetonLocal(),
    valide_jusqu_au: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
    envoyee_le: null,
    signee_le: null,
  }
  write(K.offres, [offre, ...all])
  return offre
}

export async function modifierOffre(id: string, patch: Partial<Pick<Offre, 'objet' | 'lignes' | 'tva_taux' | 'conditions'>>) {
  if (supabase) {
    const { error } = await supabase.from('offres').update(patch).eq('id', id)
    return fail(error)
  }
  write(
    K.offres,
    read<Offre>(K.offres).map((o) => {
      if (o.id !== id) return o
      if (o.statut !== 'brouillon') throw new Error('Seul un brouillon peut être modifié.')
      const n = { ...o, ...patch }
      const t = totaux(n.lignes, n.tva_taux)
      return { ...n, montant_htva: t.htva, montant_tva: t.tva, montant_tvac: t.tvac }
    }),
  )
}

export async function changerStatut(offre: Offre, statut: 'envoyee' | 'refusee' | 'annulee') {
  if (supabase) {
    const { error } = await supabase.from('offres').update({ statut }).eq('id', offre.id)
    return fail(error)
  }
  if (statut === 'envoyee' && offre.montant_htva <= 0) throw new Error('Une offre vide ne peut pas être envoyée.')
  write(
    K.offres,
    read<Offre>(K.offres).map((o) => (o.id === offre.id ? { ...o, statut, envoyee_le: statut === 'envoyee' ? new Date().toISOString() : o.envoyee_le } : o)),
  )
  if (statut === 'envoyee') {
    const lead = (await listLeads()).find((l) => l.id === offre.lead_id)
    if (lead && ['nouveau', 'contacte', 'visite'].includes(lead.status)) await updateLead(lead.id, { status: 'devis' })
  }
}

// --- Côté client : lecture et signature par lien ------------------------------
export async function offrePublique(jeton: string): Promise<OffrePublique | null> {
  if (supabase) {
    const { data, error } = await supabase.rpc('offre_publique', { p_jeton: jeton })
    fail(error)
    return data as OffrePublique | null
  }
  const o = read<Offre>(K.offres).find((x) => x.jeton === jeton && ['envoyee', 'signee'].includes(x.statut))
  if (!o) return null
  const lead = (await listLeads()).find((l) => l.id === o.lead_id)
  const sig = read<{ offre_id: string; nom: string }>(K.sig).find((s) => s.offre_id === o.id)
  return {
    ...o,
    expiree: o.valide_jusqu_au < new Date().toISOString().slice(0, 10),
    client: { nom: lead?.name ?? '', commune: lead?.city ?? '' },
    signataire: sig?.nom ?? null,
  }
}

export async function signerOffre(jeton: string, nom: string, email: string, signature: string) {
  if (supabase) {
    const { error } = await supabase.rpc('signer_offre', {
      p_jeton: jeton,
      p_nom: nom,
      p_email: email,
      p_signature: signature,
      p_accepte: true,
      p_agent: navigator.userAgent,
    })
    return fail(error)
  }
  const o = read<Offre>(K.offres).find((x) => x.jeton === jeton)
  if (!o || o.statut !== 'envoyee') throw new Error('Cette offre n’est pas ouverte à la signature.')
  write(K.sig, [...read(K.sig), { offre_id: o.id, nom, email, signature, signe_le: new Date().toISOString() }])
  write(K.offres, read<Offre>(K.offres).map((x) => (x.id === o.id ? { ...x, statut: 'signee', signee_le: new Date().toISOString() } : x)))
  await updateLead(o.lead_id, { status: 'signe', amount_signed: o.montant_htva })
}

// --- Encaissements & commission -----------------------------------------------
export async function listEncaissements(): Promise<Encaissement[]> {
  if (supabase) {
    const { data, error } = await supabase.from('encaissements').select('*').order('encaisse_le', { ascending: false })
    fail(error)
    return data as Encaissement[]
  }
  return read<Encaissement>(K.enc)
}

export async function ajouterEncaissement(offre: Offre, e: Pick<Encaissement, 'montant' | 'encaisse_le' | 'mode' | 'note'>) {
  if (supabase) {
    const { error } = await supabase.from('encaissements').insert({ offre_id: offre.id, ...e })
    return fail(error)
  }
  if (offre.statut !== 'signee') throw new Error('Un encaissement ne peut être lié qu’à une offre signée.')
  if (!e.montant) throw new Error('Montant requis.')
  const enc: Encaissement = { ...e, id: crypto.randomUUID(), offre_id: offre.id, created_at: new Date().toISOString() }
  write(K.enc, [enc, ...read<Encaissement>(K.enc)])
  write(K.com, [
    {
      id: crypto.randomUUID(),
      encaissement_id: enc.id,
      reference: offre.numero,
      montant_encaisse: e.montant,
      taux: TAUX_COMMISSION,
      commission: Math.round(e.montant * TAUX_COMMISSION * 100) / 100,
      encaisse_le: e.encaisse_le,
    },
    ...read<LigneCommission>(K.com),
  ])
}

export async function listCommission(): Promise<LigneCommission[]> {
  if (supabase) {
    const { data, error } = await supabase.from('journal_commission').select('*').order('encaisse_le', { ascending: false })
    fail(error)
    return data as LigneCommission[]
  }
  return read<LigneCommission>(K.com)
}

// --- Documents de chantier (Supabase uniquement) ------------------------------
export interface Document {
  id: string
  lead_id: string
  type: string
  nom: string
  chemin: string
  taille: number
  mime: string
  legende: string
  cree_le: string
}

export const documentsDisponibles = !!supabase

export async function listDocuments(leadId: string): Promise<Document[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('documents').select('*').eq('lead_id', leadId).order('cree_le', { ascending: false })
  fail(error)
  return data as Document[]
}

export async function deposerDocument(leadId: string, file: File) {
  if (!supabase) throw new Error('Disponible une fois Supabase branché.')
  const chemin = `${leadId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_')}`
  const up = await supabase.storage.from('chantiers').upload(chemin, file, { contentType: file.type })
  fail(up.error)
  const { error } = await supabase.from('documents').insert({
    lead_id: leadId,
    type: file.type.startsWith('image/') ? 'photo' : 'autre',
    nom: file.name,
    chemin,
    taille: file.size,
    mime: file.type || 'application/octet-stream',
  })
  fail(error)
}

export async function lienDocument(chemin: string) {
  if (!supabase) return ''
  const { data, error } = await supabase.storage.from('chantiers').createSignedUrl(chemin, 600)
  fail(error)
  return data?.signedUrl ?? ''
}

export async function supprimerDocument(d: Document) {
  if (!supabase) return
  const rm = await supabase.storage.from('chantiers').remove([d.chemin])
  fail(rm.error)
  const { error } = await supabase.from('documents').delete().eq('id', d.id)
  fail(error)
}
