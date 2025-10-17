import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, nowTs } from '../firebase'
import {
  collection, onSnapshot, doc, getDoc, updateDoc, increment
} from 'firebase/firestore'
import s from '../styles/VotePage.module.css'

export default function VotePage() {
  const navigate = useNavigate()
  const titoliCol = useMemo(()=> collection(db, 'TITOLI'), [])
  const stateRef  = useMemo(()=> doc(db, 'meta', 'state'), [])

  const [loading, setLoading] = useState(true)
  const [round, setRound] = useState(1)
  const [options, setOptions] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  // Load round + redirect if already voted this round
  useEffect(() => {
    let unsubState = () => {}, unsubTitles = () => {}
    ;(async () => {
      const sSnap = await getDoc(stateRef)
      let r = 1
      if (sSnap.exists()) r = sSnap.data().round || 1
      setRound(r)

      const votedRound = localStorage.getItem('votedRound')
      if (String(votedRound) === String(r)) {
        navigate('/thanks', { replace:true })
        return
      }

      unsubState = onSnapshot(stateRef, snap => {
        const d = snap.data() || {}
        const newRound = d.round || 1
        setRound(newRound)
      })

      unsubTitles = onSnapshot(titoliCol, snap => {
        const list = snap.docs.map(d => ({ id:d.id, ...(d.data()) }))
          .sort((a,b)=> (a.titolo||'').localeCompare(b.titolo||''))
        setOptions(list)
        setLoading(false)
      })
    })()
    return () => { unsubState(); unsubTitles() }
  }, [navigate, stateRef, titoliCol])

  const confirmVote = async () => {
    if (!selectedId) return
    try {
      await updateDoc(doc(titoliCol, selectedId), {
        voto: increment(1),
        updatedAt: nowTs()
      })
      localStorage.setItem('votedRound', String(round))
      localStorage.setItem('votedAt', new Date().toISOString())
      navigate('/thanks', { replace:true })
    } catch (e) {
      alert('Unable to cast vote. Please try again.')
      console.error(e)
    }
  }

  return (
    <div className={s.wrap}>
      <section className={s.card}>
        <header className={s.head}>
          <h1 className={s.title}>Vote your favorite project name</h1>
          <p className={s.subtitle}>One vote per round. Select an option, then press Confirm.</p>
        </header>

        {loading ? (
          <div className={s.empty}>Loading…</div>
        ) : options.length === 0 ? (
          <div className={s.empty}>No titles available yet.</div>
        ) : (
          <>
            <ul className={s.optionsList} role="radiogroup" aria-label="Project name choices">
              {options.map(opt => {
                const checked = selectedId === opt.id
                return (
                  <li key={opt.id}>
                    <label className={`${s.optionRow} ${checked ? s.selected : ''}`}>
                      <input
                        className={s.radio}
                        type="radio"
                        name="choice"
                        value={opt.id}
                        checked={checked}
                        onChange={() => setSelectedId(opt.id)}
                      />
                      <span className={s.optionLabel}>{opt.titolo || 'Untitled'}</span>
                    </label>
                  </li>
                )
              })}
            </ul>

            <div className={s.actions}>
              <button
                className={`${s.btn} ${s.primary}`}
                disabled={!selectedId}
                onClick={confirmVote}
                aria-disabled={!selectedId}
              >
                Confirm
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
