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
  const { pathname, hash } = useLocation()
  const routeKey = (hash || '').replace('#','') || pathname
  const isQROnly = routeKey.startsWith('/qr')

  return (
    <div style={{minHeight:'100dvh'}}>
      {!isQROnly && (
        <header style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,.08)', position:'sticky', top:0, backdropFilter:'blur(6px)', background:'rgba(11,11,15,.6)', zIndex:10
        }}>
          <Link to={routes.home} style={{color:'#fff', textDecoration:'none', fontWeight:800}}>LiveVote</Link>
          <nav className="row">
            <Link className="btn" to={routes.admin}>Pannello Admin</Link>
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
