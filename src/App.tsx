import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import Garderobe from './pages/Garderobe'
import Sortie from './pages/Sortie'
import Reglages from './pages/Reglages'

const onglets = [
  { vers: '/garde-robe', libelle: 'Garde-robe' },
  { vers: '/sortie', libelle: 'Sortie' },
  { vers: '/reglages', libelle: 'Réglages' },
]

export default function App() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <main className="flex-1 p-4 pb-24">
        <Routes>
          <Route path="/garde-robe" element={<Garderobe />} />
          <Route path="/sortie" element={<Sortie />} />
          <Route path="/reglages" element={<Reglages />} />
          <Route path="*" element={<Navigate to="/sortie" replace />} />
        </Routes>
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900/95">
        <ul className="mx-auto flex max-w-2xl">
          {onglets.map((o) => (
            <li key={o.vers} className="flex-1">
              <NavLink
                to={o.vers}
                className={({ isActive }) =>
                  `block py-4 text-center text-sm font-medium ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500'}`
                }
              >
                {o.libelle}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
