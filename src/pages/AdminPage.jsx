import React, { useEffect, useMemo, useState } from 'react'
import { db, nowTs } from '../firebase'
import {
  collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc,
  getDoc, setDoc, getDocs, writeBatch, increment
} from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { routes } from '../utils/routes'
import s from '../styles/AdminPage.module.css'

const DEFAULT_ADMIN = { user: 'admin', pass: 'T&I-admin' }

export default function AdminPage() {
  const [isAuthed, setIsAuthed] = useState(false)
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')

  const titoliCol = useMemo(()=> collection(db, 'TITOLI'), [])
  const stateRef = useMemo(()=> doc(db, 'meta', 'state'), [])

  const [round, setRound] = useState(1)
  const [blurTitles, setBlurTitles] = useState(false)
  const [titoli, setTitoli] = useState([]) // [{id,titolo,voto}]
  const [newTitolo, setNewTitolo] = useState('')

  const login = (e) => {
    e.preventDefault()
    if (user === DEFAULT_ADMIN.user && pass === DEFAULT_ADMIN.pass) setIsAuthed(true)
    else alert('Wrong credentials')
  }

  // Init state + subscribe
  useEffect(()=>{
    if (!isAuthed) return
    let unsub1 = () => {}, unsub2 = () => {}
    ;(async ()=>{
      const s = await getDoc(stateRef)
      if (!s.exists()) {
        await setDoc(stateRef, { round: 1, blurTitles: true, updatedAt: nowTs() })
      }
      unsub1 = onSnapshot(stateRef, snap => {
        const d = snap.data() || {}
        setRound(d.round || 1)
        setBlurTitles(!!d.blurTitles)
      })
      unsub2 = onSnapshot(titoliCol, snap => {
        const list = snap.docs.map(d => ({ id:d.id, ...(d.data()) }))
          .sort((a,b)=> (a.titolo||'').localeCompare(b.titolo||''))
        setTitoli(list)
      })
    })()
    return ()=>{ unsub1(); unsub2() }
  }, [isAuthed, stateRef, titoliCol])

  const addTitolo = async () => {
    const label = newTitolo.trim()
    if (!label) return
    await addDoc(titoliCol, {
      titolo: label,
      voto: 0,
      createdAt: nowTs(),
      updatedAt: nowTs()
    })
    setNewTitolo('')
  }

  const saveTitolo = async (id, titolo) => {
    await updateDoc(doc(titoliCol, id), { titolo: titolo.trim(), updatedAt: nowTs() })
  }

  const removeTitolo = async (id) => {
    await deleteDoc(doc(titoliCol, id))
  }

  const resetVotiAndAllowRevote = async () => {
    const snap = await getDocs(titoliCol)
    const b = writeBatch(db)
    snap.forEach(d => {
      b.update(d.ref, { voto: 0, updatedAt: nowTs() })
    })
    await b.commit()
    await updateDoc(stateRef, { round: increment(1), updatedAt: nowTs() })
    alert('Reset complete: votes cleared and everyone can vote again.')
  }

  const toggleBlur = async () => {
    await updateDoc(stateRef, { blurTitles: !blurTitles, updatedAt: nowTs() })
  }

  if (!isAuthed) {
    return (
      <div className={s.wrap}>
        <div className={`${s.panel} ${s.loginFull}`}>
          <h2 className={s.pageTitle}>Admin Login</h2>
          <form onSubmit={login} className={s.grid}>
            <input className={s.input} placeholder="username" value={user} onChange={e=>setUser(e.target.value)} />
            <input className={s.input} placeholder="password" type="password" value={pass} onChange={e=>setPass(e.target.value)} />
            <button className={`${s.btn} ${s.primary}`} type="submit">Sign in</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={s.wrap}>
      <div className={s.row}>
        <h2 className={s.pageTitle}>Admin Panel</h2>
        <div className={s.row} style={{justifyContent:'flex-end'}}>
          <span className={s.badge}>Round: {round}</span>
          <span className={s.badge}>Blur: {blurTitles ? 'On' : 'Off'}</span>
          <Link className={s.btn} to={routes.home}>Home</Link>
        </div>
      </div>

      <section className={s.panel}>
        <h3 style={{marginTop:0}}>Manage Titles (<code>TITOLI</code>)</h3>

        <div className={s.row} style={{marginBottom:12}}>
          <input className={s.input} placeholder="New title (e.g. Apollo)" value={newTitolo} onChange={e=>setNewTitolo(e.target.value)} />
          <button className={`${s.btn} ${s.accent}`} onClick={addTitolo}>Add</button>
          <button className={`${s.btn} ${s.danger}`} onClick={resetVotiAndAllowRevote}>Reset votes + Allow revote</button>
          <button className={s.btn} onClick={toggleBlur}>
            {blurTitles ? 'Show titles (remove blur)' : 'Hide titles (blur)'}
          </button>
        </div>

        <div className={s.projects}>
          {titoli.map(t => (
            <TitoloRow key={t.id} titoloItem={t} onSave={saveTitolo} onDelete={removeTitolo} />
          ))}
          {titoli.length === 0 && <div className={s.badge}>No titles yet.</div>}
        </div>

        <div className={s.hr} />
        <div className={s.row} style={{justifyContent:'center'}}>
          <Link className={s.btn} to={routes.vote('any')}>Vote Page</Link>
          <Link className={s.btn} to={routes.results('any')}>Results Page</Link>
          <Link className={s.btn} to={routes.qr('any')}>QR-only Page</Link>
        </div>
      </section>
    </div>
  )
}

function TitoloRow({ titoloItem, onSave, onDelete }) {
  const [label, setLabel] = useState(titoloItem.titolo || '')
  const dirty = label.trim() !== (titoloItem.titolo || '')
  return (
    <div className={s.projectRow}>
      <input className={s.input} value={label} onChange={e=>setLabel(e.target.value)} />
      <button className={s.btn} disabled={!dirty} onClick={()=>onSave(titoloItem.id, label)}>Save</button>
      <button className={`${s.btn} ${s.danger}`} onClick={()=>onDelete(titoloItem.id)}>Delete</button>
    </div>
  )
}
