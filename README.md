# Innovation — LiveVote

Sondaggio in tempo reale: https://costello1.github.io/Innovation/

- Amministrazione: `#/admin`
- Votazione: `#/vote/any`
- Risultati in diretta: `#/results/any`
- QR da proiettare: `#/qr/any` (generato automaticamente per il sito corrente)

## Nuova sessione

Accedi al pannello con il tuo account amministratore Firebase, aggiungi/modifica i titoli e usa
**Reset votes + Allow revote** per azzerare i voti e aprire un nuovo round.
Il reset richiede conferma e aggiorna voti e round nella stessa operazione.
Mostra il QR ai partecipanti e apri i risultati su un altro schermo.
Il pulsante per nascondere i titoli applica una sfocatura ai risultati.

Tutti i link `any`/`default` usano lo stesso sondaggio e le collezioni Firebase
`TITOLI` e `meta/state`: non sono sondaggi indipendenti.
I risultati precedenti non vengono cancellati dal deploy.

## Sviluppo e pubblicazione

Node.js 22. Esegui `npm ci`, poi `npm run dev`.
Verifica con `npm run lint` e `npm run build`.
Ogni push su `main` pubblica il sito tramite `.github/workflows/deploy.yml`.
GitHub Pages deve usare GitHub Actions come sorgente.
Il router usa URL con `#`, compatibili con GitHub Pages e con il refresh.

## Protezioni e attivazione Firebase

Questa versione richiede Firebase Authentication e le regole in `firestore.rules`.
Prima di pubblicarla su Pages:

1. Accedi al progetto Firebase **innovation-f1ffa** con un account autorizzato.
2. Abilita i provider Authentication **Email/Password** e **Anonymous** con
   `npx firebase-tools@15.33.0 deploy --only auth --project innovation-f1ffa`.
   I provider sono dichiarati in `firebase.json`; si usa Firebase Authentication
   standard, senza richiedere l’attivazione della fatturazione.
3. Crea l'utente amministratore in Authentication, con una password personale.
   Copia il suo UID e crea tramite console il documento `admins/UID` con
   il campo `enabled: true`. La presenza del documento attribuisce il ruolo;
   per revocarlo elimina il documento. Il sito non può creare questi permessi.
4. Verifica login e ruolo, quindi pubblica il frontend e le regole insieme:
   `npx firebase-tools@15.33.0 deploy --only firestore:rules --project innovation-f1ffa`.
   Il frontend viene pubblicato dal push su `main`. Evita reset del sondaggio
   durante il passaggio e fai ricaricare la pagina ai partecipanti.

L'admin accede con email e password Firebase; la vecchia password incorporata
nel sorgente non viene più usata. Non salvare password o token nel repository.
I partecipanti ottengono un'identità anonima Firebase automaticamente.
Ogni voto scrive nella stessa transazione il contatore e una ricevuta immutabile
`votes/UID/rounds/ROUND`. Le regole verificano identità, round corrente,
incremento esattamente di uno, titolo corrispondente e assenza di un voto precedente.
Cancellare solo il flag locale non consente di ripetere il voto con lo stesso UID.
Le ricevute rimangono dopo il reset e consentono un nuovo voto solo nel nuovo round.
La pubblicazione delle regole non modifica i titoli o i conteggi storici.

L'identità anonima non identifica una persona: un altro browser o la cancellazione
completa dei dati Firebase possono creare un nuovo UID. Per un voto per persona
servono account dei partecipanti o inviti individuali. Titoli e risultati sono
pubblici; la sfocatura è un effetto visivo, non una protezione della riservatezza.

## Test completi delle interazioni

La suite Playwright usa il progetto **demo-innovation** nell'emulatore ufficiale
Firestore e Authentication, senza leggere o modificare il database online. Il collegamento
all'emulatore è disponibile solo in sviluppo con `VITE_FIRESTORE_EMULATOR_HOST`.
I test usano le stesse regole di produzione in `firestore.rules`; solo i test
di guasto applicano temporaneamente regole di rifiuto nell’emulatore.

Con Java 21 e Node.js 22:

```sh
npm ci
npx playwright install chromium
npx --yes firebase-tools@15.33.0 emulators:exec --only firestore,auth --project demo-innovation --config firebase.json "npm run test:e2e"
```

La suite viene eseguita anche da `.github/workflows/test.yml` a ogni push/PR.
Controlla navigazione, login, gestione titoli, più partecipanti, doppio clic,
schede contemporanee, risultati live, sfocatura, QR, reset e nuovo voto,
conflitti durante il reset, errori Firebase, rete e visualizzazione mobile.
Screenshot e risultati JSON sono in `output/qa/` e negli artifact GitHub Actions.

La suite include attacchi alle regole: scritture senza autenticazione, escalation
dei privilegi, contatori falsificati, ricevute manipolate, voti ripetuti e simultanei.
Le credenziali `example.test` dei test funzionano soltanto negli emulatori.
