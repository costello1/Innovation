import React, { useEffect, useMemo, useRef, useState } from 'react'
import { auth, db, nowTs } from '../firebase'
import {
  collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc,
  setDoc, getDoc, getDocs, writeBatch, increment
} from 'firebase/firestore'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { Link } from 'react-router-dom'
import { routes } from '../utils/routes'
import s from '../styles/AdminPage.module.css'


export default function AdminPage() {
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')

  const titoliCol = useMemo(()=> collection(db, 'TITOLI'), [])
  const stateRef = useMemo(()=> doc(db, 'meta', 'state'), [])

  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const working = useRef(false)
  const [round, setRound] = useState(1)
  const [blurTitles, setBlurTitles] = useState(false)
  const [titoli, setTitoli] = useState([]) // [{id,titolo,voto}]
  const [newTitolo, setNewTitolo] = useState('')

  useEffect(() => {
    let generation = 0
    const unsubscribe = onAuthStateChanged(auth, async account => {
      const current = ++generation
      setIsAuthed(false)
      setCheckingAuth(true)
      if (!account || account.isAnonymous) { setCheckingAuth(false); return }
      try {
        const role = await getDoc(doc(db, 'admins', account.uid))
        if (current !== generation) return
        setIsAuthed(role.exists())
        if (!role.exists()) setError('This account is not an administrator.')
      } catch {
        if (current === generation) setError('Unable to verify administrator access. Please try again.')
      } finally { if (current === generation) setCheckingAuth(false) }
    })
    return () => { generation++; unsubscribe() }
  }, [])

  const login = async (e) => {
    e.preventDefault()
    if (working.current) return
    working.current = true
    setBusy(true)
    setError('')
    try {
      const result = await signInWithEmailAndPassword(auth, user.trim(), pass)
      const role = await getDoc(doc(db, 'admins', result.user.uid))
      if (!role.exists()) {
        await signOut(auth)
        setError('This account is not an administrator.')
      }
      setPass('')
    } catch {
      setError('Unable to sign in. Check your email and password, then try again.')
    } finally { working.current = false; setBusy(false) }
  }

  // Init state + subscribe
  useEffect(()=>{
    if (!isAuthed) return
    const fail = (err) => {
      console.error(err)
      setError('Database operation failed. Please reload and try again.')
    }
    const unsub1 = onSnapshot(stateRef, { includeMetadataChanges: true }, snap => {
      if (!snap.exists()) {
        if (snap.metadata.fromCache || snap.metadata.hasPendingWrites) return
        setDoc(stateRef, { round: 1, blurTitles: true, updatedAt: nowTs() }).catch(fail)
        return
      }
      setRound(snap.data().round || 1)
      setBlurTitles(!!snap.data().blurTitles)
    }, fail)
    const unsub2 = onSnapshot(titoliCol, snap => {
      setTitoli(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => (a.titolo || '').localeCompare(b.titolo || '')))
    }, fail)
    return () => { unsub1(); unsub2() }
  }, [isAuthed, stateRef, titoliCol])

  const perform = async (action) => {
    if (working.current) return false
    working.current = true
    setBusy(true)
    setError('')
    try { await action(); return true }
    catch (err) {
      console.error(err)
      setError('Database operation failed. Please try again.')
      return false
    } finally { working.current = false; setBusy(false) }
  }

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
    b.update(stateRef, { round: increment(1), updatedAt: nowTs() })
    await b.commit()
    alert('Reset complete: votes cleared and everyone can vote again.')
  }

  const toggleBlur = async () => {
    await updateDoc(stateRef, { blurTitles: !blurTitles, updatedAt: nowTs() })
  }

  if (checkingAuth) return <div className={s.wrap}><p role="status">Checking administrator access…</p></div>

  if (!isAuthed) {
    return (
      <div className={s.wrap}>
        <div className={`${s.panel} ${s.loginFull}`}>
          <h2 className={s.pageTitle}>Admin Login</h2>
          {error && <p role="alert">{error}</p>}
          <form onSubmit={login} className={s.grid}>
            <input className={s.input} placeholder="email" type="email" autoComplete="username" required value={user} onChange={e=>setUser(e.target.value)} />
            <input className={s.input} placeholder="password" type="password" autoComplete="current-password" required value={pass} onChange={e=>setPass(e.target.value)} />
            <button className={`${s.btn} ${s.primary}`} type="submit" disabled={busy}>Sign in</button>
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
          <button className={s.btn} onClick={() => signOut(auth)}>Sign out</button>
          <Link className={s.btn} to={routes.home}>Home</Link>
        </div>
      </div>

      {error && <p role="alert">{error}</p>}
      <fieldset className={s.panel} disabled={busy} style={{minWidth:0}}>
        <h3 style={{marginTop:0}}>Manage Titles (<code>TITOLI</code>)</h3>

        <div className={s.row} style={{marginBottom:12}}>
          <input className={s.input} placeholder="New title (e.g. Apollo)" value={newTitolo} onChange={e=>setNewTitolo(e.target.value)} />
          <button className={`${s.btn} ${s.accent}`} onClick={() => perform(addTitolo)}>Add</button>
          <button className={`${s.btn} ${s.danger}`} onClick={() => { if (confirm('Clear all votes and start a new round?')) perform(resetVotiAndAllowRevote) }}>Reset votes + Allow revote</button>
          <button className={s.btn} onClick={() => perform(toggleBlur)}>
            {blurTitles ? 'Show titles (remove blur)' : 'Hide titles (blur)'}
          </button>
        </div>

        <div className={s.projects}>
          {titoli.map(t => (
            <TitoloRow key={t.id} titoloItem={t} onSave={(id, label) => perform(() => saveTitolo(id, label))} onDelete={id => perform(() => removeTitolo(id))} />
          ))}
          {titoli.length === 0 && <div className={s.badge}>No titles yet.</div>}
        </div>

        <div className={s.hr} />
        <div className={s.row} style={{justifyContent:'center'}}>
          <Link className={s.btn} to={routes.vote('any')}>Vote Page</Link>
          <Link className={s.btn} to={routes.results('any')}>Results Page</Link>
          <Link className={s.btn} to={routes.qr('any')}>QR-only Page</Link>
        </div>
      </fieldset>
    </div>
  )
}

function TitoloRow({ titoloItem, onSave, onDelete }) {
  const [draft, setDraft] = useState(null)
  const label = draft ?? titoloItem.titolo ?? ''
  const dirty = label.trim() !== (titoloItem.titolo || '')
  return (
    <div className={s.projectRow} data-testid={`title-${titoloItem.id}`}>
      <input className={s.input} value={label} onChange={e=>setDraft(e.target.value)} />
      <button className={s.btn} disabled={!dirty || !label.trim()} onClick={async () => { if (await onSave(titoloItem.id, label)) setDraft(null) }}>Save</button>
      <button className={`${s.btn} ${s.danger}`} onClick={()=>onDelete(titoloItem.id)}>Delete</button>
    </div>
  )
}
