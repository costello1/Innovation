import React from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import VotePage from './pages/VotePage'
import ResultsPage from './pages/ResultsPage'
import AdminPage from './pages/AdminPage'
import QROnlyPage from './pages/QROnlyPage'
import ThanksPage from './pages/ThanksPage'
import { routes } from './utils/routes'

export default function App() {
  // Con HashRouter il pathname funziona normalmente (niente parse dell'hash)
  const { pathname } = useLocation()
  const isQROnly = pathname.startsWith('/qr')

  return (
    <div style={{ minHeight: '100dvh' }}>
      {!isQROnly && (
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(0,0,0,.08)',
            position: 'sticky',
            top: 0,
            backdropFilter: 'blur(6px)',
            background: '#ffffff',
            zIndex: 10
          }}
        >
          <Link to={routes.home} style={{ color: '#111', textDecoration: 'none', fontWeight: 800 }}>
            LiveVote
          </Link>
          <nav className="row">
            <Link className="btn" to={routes.admin}>Admin Panel</Link>
          </nav>
        </header>
      )}

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/vote/:surveyId" element={<VotePage />} />
          <Route path="/results/:surveyId" element={<ResultsPage />} />
          <Route path="/qr/:surveyId" element={<QROnlyPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/thanks" element={<ThanksPage />} />
        </Routes>
      </main>
    </div>
  )
}
