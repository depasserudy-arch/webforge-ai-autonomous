import type { ReactNode } from 'react'
import { company } from '../data/company'

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="container-x max-w-3xl py-16 sm:py-24">
      <p className="eyebrow">Informations légales</p>
      <h1 className="mt-3 text-4xl font-semibold">{title}</h1>
      <div className="mt-10 space-y-8 leading-relaxed text-ink-soft [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </section>
  )
}

const identity = [company.legalName, company.legalForm].filter(Boolean).join(' ')
const contact = (
  <>
    {company.address}, {company.city} — <a className="underline" href={company.phoneHref}>{company.phone}</a> —{' '}
    <a className="underline" href={`mailto:${company.email}`}>{company.email}</a>
  </>
)

export function MentionsLegales() {
  return (
    <Page title="Mentions légales">
      <div>
        <h2>Éditeur du site</h2>
        <p>{identity}</p>
        <p>{contact}</p>
        {company.vat && <p>Numéro d’entreprise / TVA : {company.vat}</p>}
      </div>
      <div>
        <h2>Hébergement</h2>
        <p>Site : {company.hosting}.</p>
        <p>Données des demandes de devis : {company.dataHosting}.</p>
      </div>
      <div>
        <h2>Propriété intellectuelle</h2>
        <p>Les textes, photographies de réalisations, logos et éléments graphiques de ce site sont la propriété de {company.legalName}. Toute reproduction sans autorisation écrite est interdite.</p>
      </div>
      <div>
        <h2>Estimations en ligne</h2>
        <p>Les fourchettes de prix affichées par le simulateur sont indicatives, non contractuelles et exprimées hors TVA. Seul le devis établi après visite technique engage {company.legalName}.</p>
      </div>
      <div>
        <h2>Droit applicable</h2>
        <p>Le présent site est soumis au droit belge. Tout litige relève des juridictions compétentes de l’arrondissement judiciaire du siège de l’éditeur.</p>
      </div>
    </Page>
  )
}

export function Confidentialite() {
  return (
    <Page title="Politique de confidentialité">
      <div>
        <h2>Responsable du traitement</h2>
        <p>{identity} — {contact}</p>
      </div>
      <div>
        <h2>Données collectées</h2>
        <p>Via le simulateur de devis : nom, téléphone, e-mail, commune du chantier, type de travaux, surface, délai souhaité, estimation et message libre.</p>
      </div>
      <div>
        <h2>Finalité et base légale</h2>
        <p>Ces données servent uniquement à vous recontacter, organiser la visite technique et établir votre devis. Le traitement repose sur votre consentement et sur l’exécution de mesures précontractuelles à votre demande (art. 6.1 a et b du RGPD).</p>
      </div>
      <div>
        <h2>Destinataires</h2>
        <ul>
          <li>L’équipe de {company.legalName} ;</li>
          <li>ALSA Consulting, partenaire commercial chargé du suivi des demandes, agissant pour le compte de {company.legalName} ;</li>
          <li>Nos sous-traitants techniques : Supabase (hébergement des données, UE), Vercel (hébergement du site), Resend (envoi des notifications e-mail).</li>
        </ul>
        <p>Vos données ne sont jamais vendues ni cédées à des fins publicitaires.</p>
      </div>
      <div>
        <h2>Durée de conservation</h2>
        <p>3 ans après le dernier contact si aucun contrat n’est conclu ; en cas de travaux, pendant la durée légale de conservation des documents comptables et de garantie.</p>
      </div>
      <div>
        <h2>Vos droits</h2>
        <p>Vous pouvez à tout moment demander l’accès, la rectification, l’effacement, la limitation ou la portabilité de vos données, et retirer votre consentement, en écrivant à <a className="underline" href={`mailto:${company.email}`}>{company.email}</a>. Vous pouvez également introduire une réclamation auprès de l’Autorité de protection des données (rue de la Presse 35, 1000 Bruxelles — www.autoriteprotectiondonnees.be).</p>
      </div>
      <div>
        <h2>Cookies</h2>
        <p>Ce site n’utilise aucun cookie publicitaire ni de mesure d’audience. Seul un stockage technique local peut être utilisé pour le bon fonctionnement du formulaire.</p>
      </div>
    </Page>
  )
}
