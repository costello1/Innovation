import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, setDoc, getDoc, updateDoc, deleteDoc, writeBatch, runTransaction, increment, serverTimestamp } from 'firebase/firestore'

let env
const projectId = 'demo-innovation'
const title = voto => ({titolo:'Apollo',voto,createdAt:new Date(),updatedAt:new Date()})
const state = round => ({round,blurTitles:false,updatedAt:serverTimestamp()})
const receipt = (titleId='apollo',round=17) => ({titleId,round,createdAt:serverTimestamp()})
const voter = uid => env.authenticatedContext(uid).firestore()
async function cast(db, uid, titleId='apollo', round=17) {
  return runTransaction(db, async tx => {
    await tx.get(doc(db,'meta/state'))
    const ref=doc(db,`votes/${uid}/rounds/${round}`)
    const existing=await tx.get(ref)
    if(existing.exists()) throw Error('Already voted')
    tx.set(ref,receipt(titleId,round))
    tx.update(doc(db,`TITOLI/${titleId}`),{voto:increment(1),updatedAt:serverTimestamp()})
  })
}
test.beforeAll(async () => {
  env=await initializeTestEnvironment({projectId,firestore:{host:'127.0.0.1',port:8180,rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}})
})
test.afterAll(async () => {await env.cleanup()})
test.beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async context => {
    const db=context.firestore()
    await setDoc(doc(db,'meta/state'),state(17))
    await setDoc(doc(db,'TITOLI/apollo'),title(0))
    await setDoc(doc(db,'TITOLI/orion'),{...title(0),titolo:'Orion'})
    await setDoc(doc(db,'admins/admin-uid'),{enabled:true})
  })
})

test('security: public results are readable, anonymous direct mutations are denied', async () => {
  const db=env.unauthenticatedContext().firestore()
  await assertSucceeds(getDoc(doc(db,'TITOLI/apollo')))
  await assertSucceeds(getDoc(doc(db,'meta/state')))
  await assertFails(updateDoc(doc(db,'TITOLI/apollo'),{voto:999}))
  await assertFails(deleteDoc(doc(db,'TITOLI/apollo')))
  await assertFails(setDoc(doc(db,'meta/state'),state(18)))
  await assertFails(setDoc(doc(db,'TITOLI/new'),title(0)))
})
test('security: participants cannot grant themselves admin or modify survey content', async () => {
  const db=voter('attacker')
  await assertFails(setDoc(doc(db,'admins/attacker'),{enabled:true}))
  await assertFails(getDoc(doc(db,'admins/admin-uid')))
  await assertFails(updateDoc(doc(db,'TITOLI/apollo'),{titolo:'Hacked',updatedAt:serverTimestamp()}))
  await assertFails(deleteDoc(doc(db,'TITOLI/apollo')))
  await assertFails(setDoc(doc(db,'meta/state'),state(18)))
})
test('security: increment and receipt must be committed together', async () => {
  const db=voter('alice')
  await assertFails(updateDoc(doc(db,'TITOLI/apollo'),{voto:increment(1),updatedAt:serverTimestamp()}))
  await assertFails(setDoc(doc(db,'votes/alice/rounds/17'),receipt()))
  await assertSucceeds(cast(db,'alice'))
  expect((await getDoc(doc(db,'TITOLI/apollo'))).data().voto).toBe(1)
})
test('security: second vote, overwriting or deleting receipts are rejected', async () => {
  const db=voter('alice')
  await assertSucceeds(cast(db,'alice'))
  const batch=writeBatch(db)
  batch.set(doc(db,'votes/alice/rounds/17'),receipt('orion'))
  batch.update(doc(db,'TITOLI/orion'),{voto:increment(1),updatedAt:serverTimestamp()})
  await assertFails(batch.commit())
  await assertFails(deleteDoc(doc(db,'votes/alice/rounds/17')))
  await assertFails(updateDoc(doc(db,'TITOLI/apollo'),{voto:increment(1),updatedAt:serverTimestamp()}))
})
test('security: forged identity and reading another participants receipt are rejected', async () => {
  const db=voter('alice')
  await assertSucceeds(cast(db,'alice'))
  const other=voter('bob')
  await assertFails(getDoc(doc(other,'votes/alice/rounds/17')))
  const batch=writeBatch(other)
  batch.set(doc(other,'votes/alice/rounds/17'),receipt('orion'))
  batch.update(doc(other,'TITOLI/orion'),{voto:increment(1),updatedAt:serverTimestamp()})
  await assertFails(batch.commit())
})
test('security: inflated counters, extra fields and wrong title receipts are rejected', async () => {
  const db=voter('alice')
  for(const [amount,titleId,extra] of [[10,'apollo',{}],[1,'orion',{}],[1,'apollo',{titolo:'Hacked'}]]) {
    const batch=writeBatch(db)
    batch.set(doc(db,'votes/alice/rounds/17'),receipt(titleId))
    batch.update(doc(db,'TITOLI/apollo'),{voto:increment(amount),updatedAt:serverTimestamp(),...extra})
    await assertFails(batch.commit())
  }
})
test('security: one receipt cannot increment multiple titles', async () => {
  const db=voter('alice'), batch=writeBatch(db)
  batch.set(doc(db,'votes/alice/rounds/17'),receipt())
  for(const id of ['apollo','orion']) batch.update(doc(db,`TITOLI/${id}`),{voto:increment(1),updatedAt:serverTimestamp()})
  await assertFails(batch.commit())
})
test('security: stale rounds and fabricated receipt timestamps are rejected', async () => {
  const db=voter('alice')
  await assertFails(cast(db,'alice','apollo',16))
  const batch=writeBatch(db)
  batch.set(doc(db,'votes/alice/rounds/17'),{...receipt(),createdAt:new Date(0)})
  batch.update(doc(db,'TITOLI/apollo'),{voto:increment(1),updatedAt:serverTimestamp()})
  await assertFails(batch.commit())
})
test('security: admin CRUD and atomic reset work; participants can vote in the new round', async () => {
  const admin=voter('admin-uid'), db=voter('alice')
  await assertSucceeds(setDoc(doc(admin,'TITOLI/new'),{titolo:'New',voto:0,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}))
  await assertSucceeds(updateDoc(doc(admin,'TITOLI/new'),{titolo:'Renamed',updatedAt:serverTimestamp()}))
  await assertSucceeds(deleteDoc(doc(admin,'TITOLI/new')))
  await assertSucceeds(cast(db,'alice'))
  const batch=writeBatch(admin)
  for(const id of ['apollo','orion']) batch.update(doc(admin,`TITOLI/${id}`),{voto:0,updatedAt:serverTimestamp()})
  batch.update(doc(admin,'meta/state'),state(18))
  await assertSucceeds(batch.commit())
  await assertSucceeds(cast(db,'alice','orion',18))
})
test('security: simultaneous transactions for the same identity count once', async () => {
  const db=voter('alice')
  const results=await Promise.allSettled([cast(db,'alice'),cast(db,'alice','orion')])
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1)
  const sum=(await getDoc(doc(db,'TITOLI/apollo'))).data().voto+(await getDoc(doc(db,'TITOLI/orion'))).data().voto
  expect(sum).toBe(1)
})
