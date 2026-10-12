import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

const root = 'http://127.0.0.1:8180'
const project = 'demo-innovation'
const documents = `${root}/v1/projects/${project}/databases/(default)/documents`
const seedTitles = [
  ['apollo', 'Apollo'], ['orion', 'Orion'], ['long', 'Blade Plasma Actuation for Enhanced Rotor Performance e innovazione sostenibile']
]
const fields = obj => Object.fromEntries(Object.entries(obj).map(([k,v]) => [k, typeof v === 'number' ? { integerValue: String(v) } : typeof v === 'boolean' ? { booleanValue: v } : { stringValue: v }]))
async function setDoc(path, data) {
  const res = await fetch(`${documents}/${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({fields:fields(data)}) })
  expect(res.ok).toBeTruthy()
}
async function readDoc(path) {
  const res = await fetch(`${documents}/${path}`)
  return (await res.json()).fields
}
async function seed(titles = seedTitles) {
  await fetch(`${root}/emulator/v1/projects/${project}/databases/(default)/documents`, {method:'DELETE'})
  await seedAdmin()
  await setDoc('meta/state', {round:17, blurTitles:false})
  for(const [id,titolo] of titles) await setDoc(`TITOLI/${id}`, {titolo,voto:0})
}
async function seedAdmin() {
  const res = await fetch('http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:'qa-admin@example.test',password:'emulator-password-only',returnSecureToken:true})
  })
  let account = await res.json()
  if (!account.localId) {
    account = await (await fetch('http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake', {
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email:'qa-admin@example.test',password:'emulator-password-only',returnSecureToken:true})
    })).json()
  }
  expect(account.localId).toBeTruthy()
  await setDoc(`admins/${account.localId}`, {enabled:true})
}
async function login(page) {
  await page.goto('#/admin')
  await expect(page.getByRole('button',{name:/^Sign (in|out)$/})).toBeVisible()
  if (await page.getByRole('button',{name:'Sign out',exact:true}).isVisible()) return
  await page.getByPlaceholder('email').fill('qa-admin@example.test')
  await page.getByPlaceholder('password',{exact:true}).fill('emulator-password-only')
  await page.getByRole('button',{name:'Sign in',exact:true}).click()
  await expect(page.getByText('Round: 17',{exact:true})).toBeVisible()
}
const row = (page, label) => label === 'Apollo' ? page.getByTestId('title-apollo') : page.locator('input').filter({visible:true}).locator('..').filter({has:page.getByRole('button',{name:'Save',exact:true})}).filter({has:page.locator(`input[value="${label}"]`)})
async function vote(page, label='Apollo') {
  await page.goto('#/vote/any')
  await page.getByRole('radio',{name:label,exact:true}).check()
  await page.getByRole('button',{name:'Confirm',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Thank you for your vote! 🎉'})).toBeVisible()
}
async function total(page,n) {
  await expect(page.getByText(`Total votes: ${n}`,{exact:true})).toBeVisible()
}

async function rules(allow) {
  const content = allow === 'production' ? readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') : `rules_version = '2'; service cloud.firestore { match /databases/{database}/documents { match /{document=**} { ${allow} } } }`
  const res = await fetch(`${root}/emulator/v1/projects/${project}:securityRules`, {method:'PUT', headers:{'Content-Type':'application/json'},body:JSON.stringify({rules:{files:[{name:'security.rules',content}]}})})
  expect(res.ok).toBeTruthy()
}
test.beforeEach(async () => { await rules('production'); await seed() })
test.afterEach(async ({ page }, info) => {
  if(info.status!==info.expectedStatus) console.log('Failure URL:',page.url())
})

test('home: every entry point, brand and navigation', async ({page}) => {
  await page.goto('')
  await expect(page.getByRole('heading',{name:'Realtime Project Naming Survey'})).toBeVisible()
  for(const [name,heading] of [['Show QR-only Page','Scan to Vote'],['Go to Vote','Vote your favorite project name'],['View Results','Live Results'],['Admin Panel','Admin Login']]) {
    await page.goto('')
    await page.getByRole('link',{name,exact:true}).last().click()
    await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible()
  }
  await page.getByRole('link',{name:'LiveVote',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Realtime Project Naming Survey'})).toBeVisible()
})

test('unknown URL returns a usable home page', async ({page}) => {
  await page.goto('#/does-not-exist')
  await expect(page.getByRole('heading',{name:'Realtime Project Naming Survey'})).toBeVisible()
})

test('wrong credentials remain outside admin', async ({page}) => {
  await page.goto('#/admin')
  await page.getByPlaceholder('email').fill('wrong@example.test')
  await page.getByPlaceholder('password',{exact:true}).fill('wrong')
  await page.getByRole('button',{name:'Sign in',exact:true}).click()
  await expect(page.getByRole('alert')).toContainText('Unable to sign in.')
  await expect(page.getByRole('heading',{name:'Admin Login'})).toBeVisible()
  await expect(page.getByRole('button',{name:'Add',exact:true})).toHaveCount(0)
})

test('admin CRUD, trimming and blank validation', async ({page}) => {
  await login(page)
  await page.getByPlaceholder('New title (e.g. Apollo)').fill('   ')
  await page.getByRole('button',{name:'Add',exact:true}).click()
  await expect(page.getByRole('button',{name:'Delete',exact:true})).toHaveCount(3)
  await page.getByPlaceholder('New title (e.g. Apollo)').fill('  Sondaggio di prova  ')
  await page.getByRole('button',{name:'Add',exact:true}).click()
  await expect(row(page,'Sondaggio di prova')).toBeVisible()
  const r=page.getByTestId(await row(page,'Sondaggio di prova').getAttribute('data-testid'))
  await expect(r.getByRole('button',{name:'Save',exact:true})).toBeDisabled()
  await r.locator('input').fill('   ')
  await expect(r.getByRole('button',{name:'Save',exact:true})).toBeDisabled()
  await r.locator('input').fill('  Progetto aggiornato  ')
  await r.getByRole('button',{name:'Save',exact:true}).click()
  await page.reload()
  await expect(row(page,'Progetto aggiornato')).toBeVisible()
  await row(page,'Progetto aggiornato').getByRole('button',{name:'Delete',exact:true}).click()
  await expect(page.getByRole('button',{name:'Delete',exact:true})).toHaveCount(3)
})

test('two admins receive title changes live in editable fields', async ({page,context}) => {
  await login(page)
  const second=await context.newPage(); await login(second)
  await row(page,'Apollo').locator('input').fill('Apollo aggiornato')
  await row(page,'Apollo').getByRole('button',{name:'Save',exact:true}).click()
  await expect(row(second,'Apollo aggiornato')).toBeVisible()
})

test('empty survey states and first option creation', async ({page}) => {
  await seed([])
  await page.goto('#/vote/any'); await expect(page.getByText('No titles available yet.')).toBeVisible()
  await page.goto('#/results/any'); await expect(page.getByText('No titles yet.')).toBeVisible(); await total(page,0)
  await login(page); await expect(page.getByText('No titles yet.')).toBeVisible()
  await page.getByPlaceholder('New title (e.g. Apollo)').fill('Prima opzione')
  await page.getByRole('button',{name:'Add',exact:true}).click()
  await expect(row(page,'Prima opzione')).toBeVisible()
  await vote(page,'Prima opzione')
})

test('radio selection, double click and persistent one-vote guard', async ({page}) => {
  await page.goto('#/vote/any')
  await expect(page.getByRole('button',{name:'Confirm',exact:true})).toBeDisabled()
  await page.getByRole('radio',{name:'Orion',exact:true}).check()
  await page.getByRole('radio',{name:'Apollo',exact:true}).check()
  await expect(page.getByRole('radio',{name:'Orion',exact:true})).not.toBeChecked()
  await page.getByRole('button',{name:'Confirm',exact:true}).evaluate(b=>{b.click();b.click();b.click()})
  await expect(page.getByRole('heading',{name:'Thank you for your vote! 🎉'})).toBeVisible()
  expect((await readDoc('TITOLI/apollo')).voto.integerValue).toBe('1')
  await page.goto('#/vote/any'); await expect(page.getByRole('heading',{name:'Thank you for your vote! 🎉'})).toBeVisible()
  await page.reload(); await page.getByRole('link',{name:'View Live Results'}).click(); await total(page,1)
  await page.getByRole('link',{name:'LiveVote',exact:true}).click()
  await page.goto('#/thanks'); await page.getByRole('link',{name:'Back to Home'}).click(); await expect(page.getByRole('heading',{name:'Realtime Project Naming Survey'})).toBeVisible()
})

test('two open tabs in one browser cannot vote twice in the same round', async ({page,context}) => {
  await page.goto('#/vote/any'); await page.getByRole('radio',{name:'Apollo',exact:true}).check()
  const second=await context.newPage(); await second.goto('#/vote/any'); await second.getByRole('radio',{name:'Orion',exact:true}).check()
  await page.getByRole('button',{name:'Confirm',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Thank you for your vote! 🎉'})).toBeVisible()
  await expect(second.getByRole('heading',{name:'Thank you for your vote! 🎉'})).toBeVisible()
  expect((await readDoc('TITOLI/orion')).voto.integerValue).toBe('0')
})

test('independent participants, realtime totals and ordered ranking', async ({page,browser}) => {
  await page.goto('#/results/any'); await total(page,0)
  const a=await browser.newContext({baseURL:'http://127.0.0.1:5175/Innovation/'}), b=await browser.newContext({baseURL:'http://127.0.0.1:5175/Innovation/'}), c=await browser.newContext({baseURL:'http://127.0.0.1:5175/Innovation/'})
  await Promise.all([vote(await a.newPage(),'Orion'),vote(await b.newPage(),'Orion'),vote(await c.newPage(),'Apollo')])
  await total(page,3)
  const labels=await page.locator('[class*="rankItem"] [class*="label"]').allTextContents()
  expect(labels[0]).toContain('Orion'); expect(labels[1]).toContain('Apollo')
  expect(await page.locator('[class*="rankItem"]').first().locator('[class*="rankBar"]').evaluate(e=>e.firstElementChild.getBoundingClientRect().width/e.getBoundingClientRect().width)).toBeCloseTo(1,2)
  await a.close(); await b.close(); await c.close()
})

test('hide and reveal results, preserving active vote selection', async ({page,context}) => {
  await login(page)
  const results=await context.newPage(); await results.goto('#/results/any'); await results.getByText('Apollo',{exact:true}).waitFor()
  const voter=await context.newPage(); await voter.goto('#/vote/any'); await voter.getByRole('radio',{name:'Apollo',exact:true}).check()
  await page.getByRole('button',{name:'Hide titles (blur)',exact:true}).click()
  await expect(results.getByText('Apollo',{exact:true})).toHaveCSS('filter','blur(6px)')
  await expect(voter.getByRole('radio',{name:'Apollo',exact:true})).toBeChecked()
  await page.getByRole('button',{name:'Show titles (remove blur)',exact:true}).click()
  await expect(results.getByText('Apollo',{exact:true})).toHaveCSS('filter','none')
})

test('cancel reset leaves round and votes untouched', async ({page}) => {
  await setDoc('TITOLI/apollo',{titolo:'Apollo',voto:5}); await login(page)
  page.once('dialog',d=>d.dismiss())
  await page.getByRole('button',{name:'Reset votes + Allow revote',exact:true}).click()
  expect((await readDoc('TITOLI/apollo')).voto.integerValue).toBe('5')
  expect((await readDoc('meta/state')).round.integerValue).toBe('17')
})

test('confirmed reset clears counts, advances round and allows revote', async ({page,browser}) => {
  const participant=await browser.newContext({baseURL:'http://127.0.0.1:5175/Innovation/'}); const voter=await participant.newPage(); await vote(voter)
  await login(page)
  page.on('dialog',d=>d.accept())
  await page.getByRole('button',{name:'Reset votes + Allow revote',exact:true}).click()
  await expect(page.getByText('Round: 18',{exact:true})).toBeVisible()
  await expect.poll(async () => (await readDoc('TITOLI/apollo')).voto.integerValue).toBe('0')
  await vote(voter,'Orion')
  await voter.getByRole('link',{name:'View Live Results'}).click(); await total(voter,1)
  expect((await readDoc('TITOLI/orion')).voto.integerValue).toBe('1')
  await participant.close()
})

test('reset invalidates an active selection and permits a fresh vote', async ({page,context}) => {
  await login(page)
  const voter=await context.newPage(); await voter.goto('#/vote/any'); await voter.getByRole('radio',{name:'Apollo',exact:true}).check()
  page.on('dialog',d=>d.accept()); await page.getByRole('button',{name:'Reset votes + Allow revote',exact:true}).click()
  await expect(voter.getByRole('button',{name:'Confirm',exact:true})).toBeDisabled()
  await voter.getByRole('radio',{name:'Orion',exact:true}).check(); await voter.getByRole('button',{name:'Confirm',exact:true}).click()
  await expect(voter.getByRole('heading',{name:'Thank you for your vote! 🎉'})).toBeVisible()
})

test('deleting a selected option clears stale selection', async ({page,context}) => {
  await login(page)
  const voter=await context.newPage(); await voter.goto('#/vote/any'); await voter.getByRole('radio',{name:'Apollo',exact:true}).check()
  await row(page,'Apollo').getByRole('button',{name:'Delete',exact:true}).click()
  await expect(voter.getByRole('radio',{name:'Apollo',exact:true})).toHaveCount(0)
  await expect(voter.getByRole('button',{name:'Confirm',exact:true})).toBeDisabled()
})

test('QR destination, header hidden and direct-route refresh', async ({page}) => {
  await page.goto('#/qr/any'); await expect(page.locator('svg')).toBeVisible()
  await expect(page.getByRole('link',{name:'LiveVote',exact:true})).toHaveCount(0)
  await expect(page.getByRole('link',{name:'Open voting page'})).toHaveAttribute('href','http://127.0.0.1:5175/Innovation/#/vote/any')
  await page.reload(); await page.getByRole('link',{name:'Open voting page'}).click()
  await expect(page.getByRole('radio',{name:'Apollo',exact:true})).toBeVisible()
  await page.reload(); await expect(page.getByRole('radio',{name:'Apollo',exact:true})).toBeVisible()
})

test('admin footer shortcuts and return home', async ({page}) => {
  for(const [link,heading] of [['Vote Page','Vote your favorite project name'],['Results Page','Live Results'],['QR-only Page','Scan to Vote']]) {
    await login(page); await page.getByRole('link',{name:link,exact:true}).click(); await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible()
  }
  await login(page); await page.getByRole('link',{name:'Home',exact:true}).click(); await expect(page.getByRole('heading',{name:'Realtime Project Naming Survey'})).toBeVisible()
})

test('mobile pages fit screen and long choices remain readable', async ({page}) => {
  await page.setViewportSize({width:390,height:844})
  for(const route of ['','vote/any','results/any','qr/any','admin','thanks']) {
    await page.goto(route?`#/${route}`:'')
    await page.locator('h1,h2').first().waitFor()
    if(route === 'vote/any') await page.getByRole('radio',{name:'Apollo',exact:true}).waitFor()
    if(route === 'results/any') await page.getByText('Apollo',{exact:true}).waitFor()
    if(route === 'qr/any') await page.locator('svg').waitFor()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),route).toBeTruthy()
    await page.screenshot({path:`output/qa/mobile-${route.replaceAll('/','-')||'home'}.png`,fullPage:true})
  }
  await page.goto('#/vote/any')
  const label=page.getByText(seedTitles[2][1],{exact:true}); await label.waitFor()
  expect(await label.evaluate(e=>e.scrollWidth<=e.clientWidth+1 && e.getBoundingClientRect().right<=innerWidth && e.getBoundingClientRect().left>=0)).toBeTruthy()
  await page.screenshot({path:'output/qa/mobile-vote-any.png',fullPage:true})
  await login(page)
  await expect(row(page,'Apollo')).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy()
  await page.screenshot({path:'output/qa/mobile-admin-authenticated.png',fullPage:true})
})

test('vote succeeds even when browser storage is unavailable', async ({page}) => {
  await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('Storage unavailable')}; Storage.prototype.setItem=()=>{throw Error('Storage unavailable')}})
  await vote(page)
  expect((await readDoc('TITOLI/apollo')).voto.integerValue).toBe('1')
})


test('double click Add creates one option', async ({page}) => {
  await login(page)
  await page.getByPlaceholder('New title (e.g. Apollo)').fill('Un solo progetto')
  await page.getByRole('button',{name:'Add',exact:true}).evaluate(b=>{b.click();b.click()})
  await expect(page.getByRole('button',{name:'Delete',exact:true})).toHaveCount(4)
  await expect.poll(async () => {
    const list = await (await fetch(`${documents}/TITOLI`)).json()
    return list.documents.filter(d => d.fields.titolo.stringValue === 'Un solo progetto').length
  }).toBe(1)
  await expect(page.getByRole('button',{name:'Add',exact:true})).toBeEnabled()
  await expect(page.getByRole('button',{name:'Delete',exact:true})).toHaveCount(4)
})

test('read denial gives a visible error on vote and results', async ({page}) => {
  await rules('allow read, write: if false;')
  await page.goto('#/vote/any')
  await expect(page.getByRole('alert')).toHaveText('Unable to load the survey. Please reload and try again.')
  await page.goto('#/results/any')
  await expect(page.getByRole('alert')).toHaveText('Unable to load live results. Please reload and try again.')
})

test('admin write denial shows error and controls recover', async ({page}) => {
  await login(page)
  await rules('allow read: if true; allow write: if false;')
  await page.getByPlaceholder('New title (e.g. Apollo)').fill('Rejected write')
  await page.getByRole('button',{name:'Add',exact:true}).click()
  await expect(page.getByRole('alert')).toHaveText('Database operation failed. Please try again.')
  await expect(page.getByRole('button',{name:'Add',exact:true})).toBeEnabled()
  await expect(page.getByRole('button',{name:'Delete',exact:true})).toHaveCount(3)
  await rules('production')
  await page.getByRole('button',{name:'Add',exact:true}).click()
  await expect(row(page,'Rejected write')).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('rejected vote stays on survey and can be retried', async ({page}) => {
  await page.goto('#/vote/any'); await page.getByRole('radio',{name:'Apollo',exact:true}).check()
  await rules('allow read: if true; allow write: if false;')
  const dialog=page.waitForEvent('dialog'); const clicking=page.getByRole('button',{name:'Confirm',exact:true}).click()
  const d=await dialog; expect(d.message()).toContain('Unable to cast vote'); await d.accept(); await clicking
  await expect(page.getByRole('button',{name:'Confirm',exact:true})).toBeEnabled()
  expect(await page.evaluate(()=>localStorage.getItem('votedRound'))).toBeNull()
  await rules('production')
  await page.getByRole('button',{name:'Confirm',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Thank you for your vote! 🎉'})).toBeVisible()
})

test('round changes during vote commit: no stale vote leaks into new round', async ({page,browser}) => {
  await login(page)
  const participant=await browser.newContext({baseURL:'http://127.0.0.1:5175/Innovation/'}); const voter=await participant.newPage()
  await voter.goto('#/vote/any'); await voter.getByRole('radio',{name:'Apollo',exact:true}).check()
  let release; const gate=new Promise(resolve=>{release=resolve})
  let intercepted; const started=new Promise(resolve=>{intercepted=resolve})
  let first=true
  await voter.route('**/documents:commit', async route=>{
    if(first){first=false;intercepted();await gate}
    await route.continue()
  })
  await voter.getByRole('button',{name:'Confirm',exact:true}).click()
  await started
  await expect(voter.getByRole('button',{name:'Sending…',exact:true})).toBeDisabled()
  page.on('dialog',d=>d.accept()); await page.getByRole('button',{name:'Reset votes + Allow revote',exact:true}).click()
  await expect(page.getByText('Round: 18',{exact:true})).toBeVisible()
  await expect.poll(async () => (await readDoc('meta/state')).round.integerValue).toBe('18')
  const dialog=voter.waitForEvent('dialog'); release()
  const d=await dialog; expect(d.message()).toContain('round has changed'); await d.accept()
  expect((await readDoc('TITOLI/apollo')).voto.integerValue).toBe('0')
  await participant.close()
})

test('temporary connection loss keeps submit disabled and recovers once', async ({page,context}) => {
  await page.goto('#/vote/any'); await page.getByRole('radio',{name:'Apollo',exact:true}).check()
  await context.setOffline(true)
  await page.getByRole('button',{name:'Confirm',exact:true}).click()
  await expect(page.getByRole('button',{name:'Sending…',exact:true})).toBeDisabled()
  await context.setOffline(false)
  await expect(page.getByRole('heading',{name:'Thank you for your vote! 🎉'})).toBeVisible()
  expect((await readDoc('TITOLI/apollo')).voto.integerValue).toBe('1')
})


test('simultaneous submissions from two tabs count once', async ({page,context}) => {
  await page.goto('#/vote/any'); await page.getByRole('radio',{name:'Apollo',exact:true}).check()
  const second=await context.newPage(); await second.goto('#/vote/any'); await second.getByRole('radio',{name:'Orion',exact:true}).check()
  await Promise.all([
    page.getByRole('button',{name:'Confirm',exact:true}).evaluate(b=>b.click()),
    second.getByRole('button',{name:'Confirm',exact:true}).evaluate(b=>b.click())
  ])
  await expect(page.getByRole('heading',{name:'Thank you for your vote! 🎉'})).toBeVisible()
  await expect(second.getByRole('heading',{name:'Thank you for your vote! 🎉'})).toBeVisible()
  const sum=Number((await readDoc('TITOLI/apollo')).voto.integerValue)+Number((await readDoc('TITOLI/orion')).voto.integerValue)
  expect(sum).toBe(1)
})

test('remote admin update preserves another admins unsaved edit', async ({page,context}) => {
  await login(page); const second=await context.newPage(); await login(second)
  await row(second,'Apollo').locator('input').fill('Bozza locale')
  await row(page,'Apollo').locator('input').fill('Aggiornamento remoto')
  await row(page,'Apollo').getByRole('button',{name:'Save',exact:true}).click()
  await expect.poll(async()=>(await readDoc('TITOLI/apollo')).titolo.stringValue).toBe('Aggiornamento remoto')
  await expect(row(second,'Apollo').locator('input')).toHaveValue('Bozza locale')
  await row(second,'Apollo').getByRole('button',{name:'Save',exact:true}).click()
  await expect.poll(async()=>(await readDoc('TITOLI/apollo')).titolo.stringValue).toBe('Bozza locale')
})

test('failed reset is atomic and can be retried', async ({page}) => {
  await setDoc('TITOLI/apollo',{titolo:'Apollo',voto:5}); await login(page)
  await rules('allow read: if true; allow write: if false;')
  page.on('dialog',d=>d.accept()); await page.getByRole('button',{name:'Reset votes + Allow revote',exact:true}).click()
  await expect(page.getByRole('alert')).toHaveText('Database operation failed. Please try again.')
  expect((await readDoc('TITOLI/apollo')).voto.integerValue).toBe('5')
  expect((await readDoc('meta/state')).round.integerValue).toBe('17')
  await rules('production')
  await page.getByRole('button',{name:'Reset votes + Allow revote',exact:true}).click()
  await expect.poll(async()=>(await readDoc('meta/state')).round.integerValue).toBe('18')
  expect((await readDoc('TITOLI/apollo')).voto.integerValue).toBe('0')
})


test('first admin initializes missing round state and resets an empty survey', async ({page}) => {
  await fetch(`${root}/emulator/v1/projects/${project}/databases/(default)/documents`,{method:'DELETE'})
  await seedAdmin()
  await page.goto('#/admin')
  await page.getByPlaceholder('email').fill('qa-admin@example.test'); await page.getByPlaceholder('password',{exact:true}).fill('emulator-password-only')
  await page.getByRole('button',{name:'Sign in',exact:true}).click()
  await expect.poll(async()=>(await readDoc('meta/state'))?.round?.integerValue).toBe('1')
  await expect(page.getByText('No titles yet.')).toBeVisible()
  page.on('dialog',d=>d.accept()); await page.getByRole('button',{name:'Reset votes + Allow revote',exact:true}).click()
  await expect.poll(async()=>(await readDoc('meta/state')).round.integerValue).toBe('2')
})


test('server receipt prevents another vote after clearing the local vote flag', async ({page}) => {
  await vote(page)
  await page.evaluate(() => { localStorage.removeItem('votedRound'); localStorage.removeItem('votedAt') })
  await page.goto('#/vote/any')
  await expect(page.getByRole('heading',{name:'Thank you for your vote! 🎉'})).toBeVisible()
  expect((await readDoc('TITOLI/apollo')).voto.integerValue).toBe('1')
})

test('admin session survives reload and sign out closes the panel', async ({page}) => {
  await login(page)
  await page.reload()
  await expect(page.getByRole('heading',{name:'Admin Panel',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Sign out',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Admin Login',exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Add',exact:true})).toHaveCount(0)
})

test('valid Firebase credentials without admin role cannot access management', async ({page}) => {
  await fetch('http://127.0.0.1:9199/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake', {
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:'participant@example.test',password:'emulator-password-only',returnSecureToken:true})
  })
  await page.goto('#/admin')
  await page.getByPlaceholder('email').fill('participant@example.test')
  await page.getByPlaceholder('password',{exact:true}).fill('emulator-password-only')
  await page.getByRole('button',{name:'Sign in',exact:true}).click()
  await expect(page.getByRole('alert')).toHaveText('This account is not an administrator.')
  await expect(page.getByRole('button',{name:'Add',exact:true})).toHaveCount(0)
})
