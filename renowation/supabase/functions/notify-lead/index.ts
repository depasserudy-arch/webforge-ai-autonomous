// Envoie un e-mail à l'équipe à chaque nouvelle demande de devis.
// Déclenché par un Database Webhook Supabase (INSERT sur public.renowation_leads).
//
// Secrets (supabase secrets set ...) :
//   RESEND_API_KEY   clé API Resend (https://resend.com)
//   WEBHOOK_SECRET   valeur envoyée dans l'en-tête x-webhook-secret par le webhook
//   NOTIFY_TO        destinataires séparés par des virgules (ex. info@renowation.be,rudy@…)
//   NOTIFY_FROM      expéditeur vérifié chez Resend (ex. "Renowation <devis@renowation.be>")
//   COCKPIT_URL      lien vers le cockpit (ex. https://renowation.be/cockpit)

interface Lead {
  name: string
  email: string
  phone: string
  city: string
  service: string
  surface: number
  timing: string
  budget_low: number
  budget_high: number
  message: string
}

const SERVICES: Record<string, string> = {
  renovation: 'Rénovation complète',
  toiture: 'Toiture',
  facade: 'Façades',
  isolation: 'Isolation & PEB',
  'salle-de-bain': 'Salle de bain',
  cuisine: 'Cuisine',
  interieur: 'Finitions intérieures',
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const eur = (n: number) =>
  new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = await req.json().catch(() => null)
  const lead: Lead | undefined = payload?.record
  if (payload?.type !== 'INSERT' || !lead) return new Response('Ignored', { status: 200 })

  const service = SERVICES[lead.service] ?? lead.service
  const tel = lead.phone.replace(/[^\d+]/g, '')
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;color:#16181d">
      <h2 style="margin:0 0 4px">Nouvelle demande de devis</h2>
      <p style="margin:0 0 20px;color:#b8864b;font-weight:bold">${esc(service)} · ${esc(lead.city)}</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:6px 0;color:#5b606b">Client</td><td><b>${esc(lead.name)}</b></td></tr>
        <tr><td style="padding:6px 0;color:#5b606b">Téléphone</td><td><a href="tel:${esc(tel)}">${esc(lead.phone)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#5b606b">E-mail</td><td><a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#5b606b">Surface</td><td>${esc(lead.surface)} m²</td></tr>
        <tr><td style="padding:6px 0;color:#5b606b">Démarrage</td><td>${esc(lead.timing)}</td></tr>
        <tr><td style="padding:6px 0;color:#5b606b">Estimation</td><td>${eur(lead.budget_low)} – ${eur(lead.budget_high)} HTVA</td></tr>
      </table>
      ${lead.message ? `<p style="margin-top:16px;padding:12px;background:#f5f1ea;border-radius:8px">${esc(lead.message)}</p>` : ''}
      <p style="margin-top:24px"><a href="${esc(Deno.env.get('COCKPIT_URL') ?? '')}" style="background:#16181d;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Ouvrir le cockpit</a></p>
      <p style="font-size:12px;color:#5b606b">Règle d'or : rappeler dans l'heure.</p>
    </div>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('NOTIFY_FROM'),
      to: (Deno.env.get('NOTIFY_TO') ?? '').split(',').map((s) => s.trim()).filter(Boolean),
      reply_to: lead.email,
      subject: `Nouveau devis — ${service} — ${lead.name} (${lead.city})`,
      html,
    }),
  })

  if (!res.ok) {
    console.error('Resend error', res.status, await res.text())
    return new Response('Email failed', { status: 502 })
  }
  return new Response('OK', { status: 200 })
})
