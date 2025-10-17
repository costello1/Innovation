import React, { useEffect, useMemo, useState } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore'
import s from '../styles/ResultsPage.module.css'

export default function ResultsPage() {
  const titoliCol = useMemo(()=> collection(db, 'TITOLI'), [])
  const stateRef  = useMemo(()=> doc(db, 'meta', 'state'), [])

  const [titles, setTitles] = useState([])     // [{id,titolo,voto}]
  const [blurTitles, setBlurTitles] = useState(true)

  useEffect(() => {
    let unsub1 = () => {}, unsub2 = () => {}
    ;(async () => {
      const sSnap = await getDoc(stateRef)
      if (sSnap.exists()) setBlurTitles(!!sSnap.data().blurTitles)
      unsub1 = onSnapshot(stateRef, snap => {
        const d = snap.data() || {}
        setBlurTitles(d.blurTitles ?? true)
      })
      unsub2 = onSnapshot(titoliCol, snap => {
        const list = snap.docs.map(d => ({ id:d.id, ...(d.data()) }))
          .sort((a,b) => (b.voto||0) - (a.voto||0) || (a.titolo||'').localeCompare(b.titolo||''))
        setTitles(list)
      })
    })()
    return () => { unsub1(); unsub2() }
  }, [stateRef, titoliCol])

  const total = titles.reduce((sum, t)=> sum + (t.voto||0), 0)
  const max   = Math.max(1, ...titles.map(t => t.voto||0))

  return (
    <div className={s.wrap}>
      <header className={s.resultsHead}>
        <div className={s.headInner}>
          <h2 className={s.title}>Live Results</h2>
          <p className={s.subtitle}>Votes update in real time.</p>
          <span className={s.badge}>Total votes: <strong>{total}</strong></span>
        </div>
      </header>

      <section className={s.panel}>
        <div className={s.rankList}>
          {titles.map((t, idx) => {
            const votes = t.voto || 0
            const pct = max ? Math.round((votes / max) * 100) : 0
            const first = idx === 0
            return (
              <div key={t.id} className={`${s.rankItem} ${first ? s.first : ''}`}>
                <div className={s.label}>
                  <span className={s.pos}>{idx+1}</span>
                  <span className={blurTitles ? s.blurred : ''}>
                    {t.titolo || 'Untitled'}
                  </span>
                  {first && <span className={s.crown}>👑</span>}
                </div>
                <div className={s.count}>{votes}</div>
                <div className={s.rankBar}>
                  <span className={s.bar} style={{width:`${pct}%`}} />
                </div>
              </div>
            )
          })}
          {titles.length === 0 && (
            <div style={{opacity:.6}}>No titles yet.</div>
          )}
        </div>
      </section>
    </div>
  )
}
