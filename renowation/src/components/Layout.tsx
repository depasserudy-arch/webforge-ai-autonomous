import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { ExternalLink, Mail, MapPin, Menu, Phone, X } from 'lucide-react'
import { company } from '../data/company'

const YEAR = new Date().getFullYear()

const nav = [
  { to: '/#services', label: 'Services' },
  { to: '/realisations', label: 'Réalisations' },
  { to: '/#methode', label: 'Méthode' },
  { to: '/#zone', label: 'Zone' },
]

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${light ? 'text-white' : 'text-ink'}`}>
      <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden>
        <rect width="64" height="64" rx="14" fill={light ? '#fff' : '#16181d'} />
        <path d="M14 34 32 18l18 16v14H38V36H26v12H14z" fill="#b8864b" />
      </svg>
      <span className="font-display text-xl font-semibold tracking-tight">Renowation</span>
    </Link>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-ink/5 bg-sand/85 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className="text-ink-soft transition hover:text-brass">
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <a href={company.phoneHref} className="text-sm font-semibold text-ink-soft hover:text-brass">
              {company.phone}
            </a>
            <Link to="/devis" className="btn-primary !py-2.5">Devis gratuit</Link>
          </div>
          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <div className="border-t border-ink/5 bg-sand md:hidden">
            <nav className="container-x flex flex-col gap-1 py-4">
              {nav.map((n) => (
                <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded-lg px-2 py-3 font-medium hover:bg-sand-deep">
                  {n.label}
                </Link>
              ))}
              <Link to="/devis" onClick={() => setOpen(false)} className="btn-primary mt-2">Devis gratuit en 48 h</Link>
              <a href={company.phoneHref} className="btn-dark mt-2"><Phone className="h-4 w-4" />{company.phone}</a>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-ink text-white/70">
        <div className="container-x grid gap-10 py-16 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo light />
            <p className="mt-4 max-w-sm text-sm leading-relaxed">{company.tagline} Entreprise de rénovation basée à Rhode-Saint-Genèse, active à Bruxelles et dans le Brabant.</p>
          </div>
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-white">Contact</p>
            <a href={company.phoneHref} className="flex items-center gap-2 hover:text-brass-light"><Phone className="h-4 w-4" />{company.phone}</a>
            <a href={`mailto:${company.email}`} className="flex items-center gap-2 hover:text-brass-light"><Mail className="h-4 w-4" />{company.email}</a>
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{company.address}<br />{company.city}</p>
          </div>
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-white">Liens</p>
            <Link to="/realisations" className="block hover:text-brass-light">Réalisations</Link>
            <Link to="/devis" className="block hover:text-brass-light">Demander un devis</Link>
            <a href={company.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-brass-light"><ExternalLink className="h-4 w-4" />Facebook</a>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container-x flex flex-col gap-2 py-6 text-xs sm:flex-row sm:justify-between">
            <p>
              © {YEAR} Renowation. Tous droits réservés. ·{' '}
              <Link to="/mentions-legales" className="hover:text-brass-light">Mentions légales</Link> ·{' '}
              <Link to="/confidentialite" className="hover:text-brass-light">Confidentialité</Link>
            </p>
            <p>Plateforme conçue par ALSA Consulting</p>
          </div>
        </div>
      </footer>

      <a href={company.phoneHref} className="btn-primary fixed bottom-4 right-4 z-40 shadow-card md:hidden" aria-label="Appeler Renowation">
        <Phone className="h-4 w-4" /> Appeler
      </a>
    </div>
  )
}
