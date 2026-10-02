import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Realisations from './pages/Realisations'
import Devis from './pages/Devis'
import Cockpit from './pages/Cockpit'
import OffrePublique from './pages/OffrePublique'
import NotFound from './pages/NotFound'
import { Confidentialite, MentionsLegales } from './pages/Legal'

export default function App() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])

  return (
    <Routes>
      <Route path="/cockpit" element={<Cockpit />} />
      <Route path="/offre/:jeton" element={<OffrePublique />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="/realisations" element={<Realisations />} />
        <Route path="/devis" element={<Devis />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/confidentialite" element={<Confidentialite />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
