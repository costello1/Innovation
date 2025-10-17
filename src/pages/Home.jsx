import React from 'react'
import { Link } from 'react-router-dom'
import { routes } from '../utils/routes'
import s from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={s.wrap}>
      <section className={`${s.card} ${s.hero}`}>
        <div>
          <h1 style={{margin:0, fontWeight:800}}>Realtime Project Naming Survey</h1>
          <p style={{opacity:.75, margin:'10px 0 0'}}>
            Scan the QR to vote from your phone and watch the live ranking update instantly.
          </p>
        </div>
      </section>

      <section className={s.card} style={{padding:'24px'}}>
        <div className={s.actions}>
          <Link className={s.row} to={routes.qr('any')}>
            <button className={s.row} style={{all:'unset'}}>
              <div style={{
                display:'inline-flex', gap:12, alignItems:'center',
                padding:'12px 16px', border:'1px solid #e5e7eb', borderRadius:14, fontWeight:700
              }}>
                Show QR-only Page
              </div>
            </button>
          </Link>

          <Link to={routes.vote('any')}>
            <div style={{
              display:'inline-flex', gap:12, alignItems:'center',
              padding:'12px 16px', border:'1px solid #e5e7eb', borderRadius:14, fontWeight:700
            }}>
              Go to Vote
            </div>
          </Link>

          <Link to={routes.results('any')}>
            <div style={{
              display:'inline-flex', gap:12, alignItems:'center',
              padding:'12px 16px', border:'1px solid #e5e7eb', borderRadius:14, fontWeight:700
            }}>
              View Results
            </div>
          </Link>

          <Link to={routes.admin}>
            <div style={{
              display:'inline-flex', gap:12, alignItems:'center',
              padding:'12px 16px', border:'1px solid #e5e7eb', borderRadius:14, fontWeight:700
            }}>
              Admin Panel
            </div>
          </Link>
        </div>
      </section>
    </div>
  )
}
