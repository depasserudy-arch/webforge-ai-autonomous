import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ServiceId } from '../data/company'

export type LeadStatus = 'nouveau' | 'contacte' | 'visite' | 'devis' | 'signe' | 'perdu'

export const STATUSES: { id: LeadStatus; label: string }[] = [
  { id: 'nouveau', label: 'Nouveau' },
  { id: 'contacte', label: 'Contacté' },
  { id: 'visite', label: 'Visite planifiée' },
  { id: 'devis', label: 'Devis envoyé' },
  { id: 'signe', label: 'Signé' },
  { id: 'perdu', label: 'Perdu' },
]

export interface Lead {
  id: string
  created_at: string
  name: string
  email: string
  phone: string
  city: string
  service: ServiceId
  surface: number
  timing: string
  budget_low: number
  budget_high: number
  message: string
  status: LeadStatus
  amount_signed: number | null
  notes: string
}

export type NewLead = Omit<Lead, 'id' | 'created_at' | 'status' | 'amount_signed' | 'notes'>

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
export const backend = supabase ? 'Supabase' : 'Local (navigateur)'

const LS_KEY = 'renowation.leads'
function readLocal(): Lead[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
  } catch {
    return []
  }
}
function writeLocal(leads: Lead[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(leads))
  } catch {}
}

export async function createLead(input: NewLead): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('renowation_leads').insert(input)
    if (error) throw error
    return
  }
  const lead: Lead = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    status: 'nouveau',
    amount_signed: null,
    notes: '',
  }
  writeLocal([lead, ...readLocal()])
}

export async function listLeads(): Promise<Lead[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from('renowation_leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Lead[]
  }
  return readLocal()
}

export async function updateLead(id: string, patch: Partial<Pick<Lead, 'status' | 'amount_signed' | 'notes'>>) {
  if (supabase) {
    const { error } = await supabase.from('renowation_leads').update(patch).eq('id', id)
    if (error) throw error
    return
  }
  writeLocal(readLocal().map((l) => (l.id === id ? { ...l, ...patch } : l)))
}

export const eur = (n: number) =>
  new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

/**
 * Accès cockpit : avec Supabase, connexion email/mot de passe (RLS « authenticated ») ;
 * en mode local, simple code PIN (VITE_COCKPIT_PIN, défaut 2026) — démo uniquement.
 */
let pinSession = false

export const authMode: 'supabase' | 'pin' = supabase ? 'supabase' : 'pin'

export async function signIn(login: string, secret: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.auth.signInWithPassword({ email: login, password: secret })
    if (error) throw new Error('Identifiants incorrects')
    const { data: allowed } = await supabase.rpc('is_team_member')
    if (!allowed) {
      await supabase.auth.signOut()
      throw new Error('Ce compte n’a pas accès au cockpit')
    }
    return
  }
  const pin = (import.meta.env.VITE_COCKPIT_PIN as string | undefined) || '2026'
  if (secret !== pin) throw new Error('Code incorrect')
  try {
    sessionStorage.setItem('renowation.cockpit', '1')
  } catch {}
  pinSession = true
}

export async function isSignedIn(): Promise<boolean> {
  if (supabase) return !!(await supabase.auth.getSession()).data.session
  try {
    return pinSession || sessionStorage.getItem('renowation.cockpit') === '1'
  } catch {
    return pinSession
  }
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut()
  pinSession = false
  try {
    sessionStorage.removeItem('renowation.cockpit')
  } catch {}
}
