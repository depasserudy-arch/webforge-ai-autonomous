import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ClipboardCheck, HardHat, MapPin, Phone, ShieldCheck, Timer } from 'lucide-react'
import PhotoTile from '../components/PhotoTile'
import { company, process, services } from '../data/company'
import { pick, usePhotos } from '../lib/photos'

const pillars = [
  { icon: HardHat, title: 'Un seul interlocuteur', text: 'Un chef de projet coordonne tous les corps de métier.' },
  { icon: Timer, title: 'Devis en 48 h', text: 'Après la visite, un devis détaillé poste par poste.' },
  { icon: ClipboardCheck, title: 'Suivi transparent', text: 'Planning partagé et photos d’avancement du chantier.' },
  { icon: ShieldCheck, title: 'Travail garanti', text: 'Matériaux de qualité et garanties légales assurées.' },
]

export default function Home() {
  const photos = usePhotos()

  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div className="absolute inset-0 -z-10 opacity-60">
          <PhotoTile photo={pick(photos, 0)} eager />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/30" />
        <div className="container-x py-24 sm:py-32 lg:py-40">
          <p className="eyebrow">Rénovation · Rhode-Saint-Genèse & Bruxelles</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-6xl">
            Votre rénovation, <span className="text-brass-light">maîtrisée</span> du premier relevé à la dernière finition.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-white/75">
            Toitures, façades, isolation, salles de bain, cuisines et rénovations complètes. Un interlocuteur unique, un devis clair en 48 h, un chantier tenu.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/devis" className="btn-primary">Estimer mon projet <ArrowRight className="h-4 w-4" /></Link>
            <a href={company.phoneHref} className="btn-ghost text-white"><Phone className="h-4 w-4" /> {company.phone}</a>
          </div>
          <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/70">
            {['Visite & devis gratuits', 'Prix détaillé, sans surprise', 'Chantier propre et suivi'].map((t) => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brass-light" />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* PILIERS */}
      <section className="container-x -mt-10 relative z-10">
        <div className="grid gap-4 rounded-3xl bg-white p-6 shadow-card sm:grid-cols-2 lg:grid-cols-4 lg:p-8">
          {pillars.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sand text-brass"><Icon className="h-5 w-5" /></div>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm text-ink-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="container-x scroll-mt-20 py-24">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">Nos expertises</p>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold sm:text-4xl">Tous les travaux de votre rénovation, sous un même toit.</h2>
          </div>
          <Link to="/devis" className="btn-dark self-start">Demander un devis</Link>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Link
              key={s.id}
              to={`/devis?service=${s.id}`}
              className="group overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-ink/5 transition hover:-translate-y-1 hover:shadow-card"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <PhotoTile photo={pick(photos, i, s.id)} label={s.title} className="transition duration-500 group-hover:scale-105" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.pitch}</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {s.points.map((p) => (
                    <li key={p} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-brass" />{p}</li>
                  ))}
                </ul>
                <p className="mt-5 flex items-center gap-1 text-sm font-semibold text-brass">Estimer ce projet <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* RÉALISATIONS */}
      <section className="bg-ink py-24 text-white">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="eyebrow">Réalisations</p>
              <h2 className="mt-3 max-w-xl text-3xl font-semibold sm:text-4xl">Des chantiers qui parlent pour nous.</h2>
            </div>
            <Link to="/realisations" className="btn-ghost self-start text-white">Voir toute la galerie <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-12 grid auto-rows-[180px] grid-cols-2 gap-3 sm:auto-rows-[220px] md:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={`overflow-hidden rounded-2xl ${i === 0 ? 'col-span-2 row-span-2' : ''} ${i === 3 || i === 6 ? 'md:col-span-2' : ''}`}>
                <PhotoTile photo={pick(photos, i + 1)} className="transition duration-500 hover:scale-105" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MÉTHODE */}
      <section id="methode" className="container-x scroll-mt-20 py-24">
        <p className="eyebrow">Notre méthode</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold sm:text-4xl">Un protocole clair, pour un chantier sans mauvaise surprise.</h2>
        <ol className="mt-12 grid gap-6 md:grid-cols-5">
          {process.map((p) => (
            <li key={p.step} className="rounded-3xl border border-ink/10 bg-white p-6">
              <span className="font-display text-3xl text-brass">{p.step}</span>
              <p className="mt-4 font-semibold">{p.title}</p>
              <p className="mt-2 text-sm text-ink-muted">{p.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ZONE */}
      <section id="zone" className="scroll-mt-20 bg-sand-deep py-24">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Zone d’intervention</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Basés à Rhode-Saint-Genèse, au service de Bruxelles et du Brabant.</h2>
            <p className="mt-4 text-ink-muted">Nos équipes interviennent rapidement dans le sud de Bruxelles et le Brabant. Votre commune n’est pas listée ? Contactez-nous.</p>
            <div className="mt-8 flex flex-wrap gap-2">
              {company.zones.map((z) => (
                <span key={z} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm"><MapPin className="h-3.5 w-3.5 text-brass" />{z}</span>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl shadow-card">
            <iframe
              title="Localisation Renowation"
              className="h-80 w-full grayscale-[40%]"
              loading="lazy"
              src={`https://www.google.com/maps?q=${encodeURIComponent(`${company.address}, ${company.city}`)}&output=embed`}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-x py-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink px-8 py-16 text-center text-white sm:px-16">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brass/20 blur-3xl" />
          <h2 className="relative text-3xl font-semibold sm:text-4xl">Un projet en tête ? Obtenez une estimation en 2 minutes.</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/70">Simulateur en ligne, puis visite gratuite et devis détaillé sous 48 h.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/devis" className="btn-primary">Lancer le simulateur <ArrowRight className="h-4 w-4" /></Link>
            <a href={company.phoneHref} className="btn-ghost text-white"><Phone className="h-4 w-4" />{company.phone}</a>
          </div>
        </div>
      </section>
    </>
  )
}
