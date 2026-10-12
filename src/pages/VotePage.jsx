import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, nowTs } from '../firebase'
import {
  collection, onSnapshot, doc, runTransaction, increment
} from 'firebase/firestore'
import s from '../styles/VotePage.module.css'

export default function VotePage() {
  const navigate = useNavigate()
  const titoliCol = useMemo(()=> collection(db, 'TITOLI'), [])
  const stateRef  = useMemo(()=> doc(db, 'meta', 'state'), [])

  const submitting = useRef(false)
  const activeRound = useRef(null)
  const [stateReady, setStateReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [round, setRound] = useState(1)
  const [options, setOptions] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  // Load round + redirect if already voted this round
  useEffect(() => {
    const fail = (err) => {
      console.error(err)
      setError('Unable to load the survey. Please reload and try again.')
      setLoading(false)
    }
    const unsubState = onSnapshot(stateRef, { includeMetadataChanges: true }, snap => {
      // A cached previous round must not redirect participants after an admin reset.
      // Wait for the server to confirm the current round before enabling voting.
      if (snap.metadata.fromCache || snap.metadata.hasPendingWrites) return
      const r = snap.data()?.round || 1
      if (activeRound.current !== r) setSelectedId(null)
      activeRound.current = r
      setRound(r)
      setStateReady(true)
      try {
        if (localStorage.getItem('votedRound') === String(r)) {
          navigate('/thanks', { replace: true })
        }
      } catch { /* Voting still works if browser storage is unavailable. */ }
    }, fail)
    const unsubTitles = onSnapshot(titoliCol, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => (a.titolo || '').localeCompare(b.titolo || ''))
      setOptions(list)
      setSelectedId(selected => list.some(option => option.id === selected) ? selected : null)
      setLoading(false)
    }, fail)
    const checkOtherTab = (event) => {
      if (event.key === 'votedRound' && event.newValue === String(activeRound.current)) {
        navigate('/thanks', { replace: true })
      }
    }
    window.addEventListener('storage', checkOtherTab)
    return () => {
      unsubState(); unsubTitles()
      window.removeEventListener('storage', checkOtherTab)
    }
  }, [navigate, stateRef, titoliCol])

  const confirmVote = async () => {
    if (!selectedId || !stateReady || submitting.current || error) return
    submitting.current = true
    setSaving(true)
    try {
      const castVote = async () => {
        // Recheck inside the browser-wide lock: another tab may have just voted.
        try {
          if (localStorage.getItem('votedRound') === String(round)) return
        } catch { /* Browser storage may be unavailable. */ }
        await runTransaction(db, async transaction => {
          const state = await transaction.get(stateRef)
          if ((state.data()?.round || 1) !== round) {
            throw new Error('The round has changed. Reload the survey to vote again.')
          }
          transaction.update(doc(titoliCol, selectedId), {
            voto: increment(1), updatedAt: nowTs()
          })
        })
        try {
          localStorage.setItem('votedRound', String(round))
          localStorage.setItem('votedAt', new Date().toISOString())
        } catch { /* Do not report a successful vote as failed. */ }
      }
      if (navigator.locks?.request) {
        await navigator.locks.request('innovation-livevote', castVote)
      } else {
        await castVote()
      }
      navigate('/thanks', { replace: true })
    } catch (err) {
      alert(err.message === 'The round has changed. Reload the survey to vote again.'
        ? err.message : 'Unable to cast vote. Please try again.')
      console.error(err)
    } finally {
      submitting.current = false
      setSaving(false)
    }
  }

  return (
    <div className={s.wrap}>
      <section className={s.card}>
        <header className={s.head}>
          <h1 className={s.title}>Vote your favorite project name</h1>
          <p className={s.subtitle}>One vote per round. Select an option, then press Confirm.</p>
        </header>

        {error ? <div className={s.empty} role="alert">{error}</div> : loading || !stateReady ? (
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
                disabled={!selectedId || saving}
                onClick={confirmVote}
                aria-disabled={!selectedId || saving}
              >
                {saving ? 'Sending…' : 'Confirm'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
