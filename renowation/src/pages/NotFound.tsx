import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="container-x py-32 text-center">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="mt-3 text-4xl font-semibold">Cette page n’existe pas.</h1>
      <Link to="/" className="btn-dark mt-8">Retour à l’accueil</Link>
    </section>
  )
}
