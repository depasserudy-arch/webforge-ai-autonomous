import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle2, Loader2, Printer, ShieldCheck } from 'lucide-react'
import { Logo } from '../components/Layout'
import SignaturePad from '../components/SignaturePad'
import { company } from '../data/company'
import { offrePublique, signerOffre, type OffrePublique as Offre } from '../lib/offres'

const eur2 = (n: number) => new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(n)
const jour = (d: string) => new Date(d).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })

export default function OffrePublique() {
  const { jeton = '' } = useParams()
  const [offre, setOffre] = useState<Offre | null | undefined>(undefined)
  const [form, setForm] = useState({ nom: '', email: '', accepte: false })
  const [signature, setSignature] = useState('')
  const [etat, setEtat] = useState<'idle' | 'envoi' | 'erreur'>('idle')
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    offrePublique(jeton).then(setOffre).catch(() => setOffre(null))
  }, [jeton])

  async function signer(e: FormEvent) {
    e.preventDefault()
    if (!signature) return setErreur('Merci de signer dans le cadre.')
    setEtat('envoi')
    setErreur('')
    try {
      await signerOffre(jeton, form.nom.trim(), form.email.trim(), signature)
      setOffre(await offrePublique(jeton))
      setEtat('idle')
    } catch (err) {
      setEtat('erreur')
      setErreur(err instanceof Error ? err.message : 'Signature impossible')
    }
  }

  if (offre === undefined) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brass" /></div>
  if (offre === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <Logo />
        <h1 className="text-2xl font-semibold">Offre introuvable</h1>
        <p className="max-w-md text-ink-muted">Ce lien n’est plus valide. Contactez-nous au <a className="underline" href={company.phoneHref}>{company.phone}</a>.</p>
      </div>
    )
  }

  const signable = offre.statut === 'envoyee' && !offre.expiree

  return (
    <div className="min-h-screen bg-sand py-8 print:bg-white print:py-0">
      <div className="container-x max-w-4xl">
        <article className="rounded-3xl bg-white p-6 shadow-card sm:p-10 print:rounded-none print:shadow-none">
          <header className="flex flex-col justify-between gap-6 border-b border-ink/10 pb-8 sm:flex-row">
            <div>
              <Logo />
              <p className="mt-3 text-sm text-ink-muted">{company.address}, {company.city}<br />{company.phone} · {company.email}{company.vat && <><br />TVA {company.vat}</>}</p>
            </div>
            <div className="sm:text-right">
              <p className="eyebrow">Offre de prix</p>
              <p className="mt-1 font-display text-2xl font-semibold">{offre.numero}</p>
              <p className="mt-2 text-sm text-ink-muted">Valable jusqu’au {jour(offre.valide_jusqu_au)}</p>
              <p className="mt-3 text-sm"><span className="text-ink-muted">Client :</span> <b>{offre.client.nom}</b><br />{offre.client.commune}</p>
            </div>
          </header>

          {offre.objet && <h1 className="mt-8 text-2xl font-semibold">{offre.objet}</h1>}

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink-muted">
                  <th className="py-3 pr-4 font-medium">Désignation</th>
                  <th className="py-3 pr-4 text-right font-medium">Qté</th>
                  <th className="py-3 pr-4 text-right font-medium">Prix unit.</th>
                  <th className="py-3 text-right font-medium">Total HTVA</th>
                </tr>
              </thead>
              <tbody>
                {offre.lignes.map((l, i) => (
                  <tr key={i} className="border-b border-ink/5">
                    <td className="py-3 pr-4">{l.libelle}</td>
                    <td className="py-3 pr-4 text-right whitespace-nowrap">{l.quantite} {l.unite}</td>
                    <td className="py-3 pr-4 text-right whitespace-nowrap">{eur2(l.prix_unitaire)}</td>
                    <td className="py-3 text-right whitespace-nowrap">{eur2(l.quantite * l.prix_unitaire)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="ml-auto mt-6 max-w-xs space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-muted">Total HTVA</dt><dd>{eur2(offre.montant_htva)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-muted">TVA {offre.tva_taux} %</dt><dd>{eur2(offre.montant_tva)}</dd></div>
            <div className="flex justify-between border-t border-ink/10 pt-2 text-lg font-semibold"><dt>Total TVAC</dt><dd>{eur2(offre.montant_tvac)}</dd></div>
          </dl>
          {offre.tva_taux === 6 && (
            <p className="mt-4 text-xs text-ink-muted">TVA 6 % : sous réserve que l’habitation, utilisée à titre privé, ait plus de 10 ans. Le client le confirme en signant.</p>
          )}

          {offre.conditions && (
            <section className="mt-8 rounded-2xl bg-sand p-5 text-sm">
              <h2 className="font-sans text-sm font-semibold">Conditions</h2>
              <p className="mt-2 whitespace-pre-line text-ink-soft">{offre.conditions}</p>
            </section>
          )}

          {offre.statut === 'signee' ? (
            <div className="mt-8 flex items-start gap-3 rounded-2xl bg-emerald-50 p-5 text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
              <div>
                <p className="font-semibold">Offre signée{offre.signataire ? ` par ${offre.signataire}` : ''}{offre.signee_le ? ` le ${jour(offre.signee_le)}` : ''}.</p>
                <p className="mt-1 text-sm">Merci pour votre confiance. Nous vous contactons pour planifier le démarrage du chantier.</p>
              </div>
            </div>
          ) : offre.expiree ? (
            <p className="mt-8 rounded-2xl bg-amber-50 p-5 text-amber-900">Cette offre a expiré. Contactez-nous au {company.phone} pour la renouveler.</p>
          ) : null}

          {signable && (
            <form onSubmit={signer} className="mt-10 border-t border-ink/10 pt-8 print:hidden">
              <h2 className="text-xl font-semibold">Accepter et signer l’offre</h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div><label className="label" htmlFor="nom">Nom et prénom *</label><input id="nom" required minLength={2} autoComplete="name" className="field" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
                <div><label className="label" htmlFor="email">E-mail *</label><input id="email" required type="email" autoComplete="email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="sm:col-span-2"><span className="label">Signature *</span><SignaturePad onChange={setSignature} /></div>
              </div>
              <label className="mt-5 flex items-start gap-3 text-sm text-ink-soft">
                <input type="checkbox" required checked={form.accepte} onChange={(e) => setForm({ ...form, accepte: e.target.checked })} className="mt-1 accent-brass" />
                J’accepte la présente offre {offre.numero} d’un montant de {eur2(offre.montant_tvac)} TVAC ainsi que ses conditions, et je confirme les informations ci-dessus.
              </label>
              {erreur && <p className="mt-4 text-sm text-red-700">{erreur}</p>}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button type="submit" disabled={etat === 'envoi'} className="btn-primary disabled:opacity-60">
                  {etat === 'envoi' && <Loader2 className="h-4 w-4 animate-spin" />} Signer l’offre
                </button>
                <p className="flex items-center gap-1.5 text-xs text-ink-muted"><ShieldCheck className="h-4 w-4 text-brass" />Une copie de l’offre est figée et horodatée à la signature.</p>
              </div>
            </form>
          )}
        </article>
        <div className="mt-4 flex justify-center print:hidden">
          <button onClick={() => window.print()} className="btn text-ink-soft hover:bg-white"><Printer className="h-4 w-4" />Imprimer / PDF</button>
        </div>
      </div>
    </div>
  )
}
