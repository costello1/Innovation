# Innovation — LiveVote

Sondaggio in tempo reale: https://costello1.github.io/Innovation/

- Amministrazione: `#/admin`
- Votazione: `#/vote/any`
- Risultati in diretta: `#/results/any`
- QR da proiettare: `#/qr/any` (generato automaticamente per il sito corrente)

## Nuova sessione

Accedi al pannello con le credenziali già configurate, aggiungi/modifica i titoli e usa
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

## Limiti del sistema esistente

Il login admin è un controllo nel browser con credenziali presenti nel sorgente pubblico;
non è autenticazione Firebase. Il blocco dei voti ripetuti usa la memoria del browser
ed è aggirabile cambiando browser o cancellandone i dati. La sfocatura non protegge
la riservatezza dei titoli. Per usare il sito con dati riservati o con garanzie contro
manomissioni servono Firebase Authentication e regole Firestore gestite sul progetto.

## Test completi delle interazioni

La suite Playwright usa il progetto **demo-innovation** nell'emulatore ufficiale
Firestore, senza leggere o modificare il database online. Il collegamento
all'emulatore è disponibile solo in sviluppo con `VITE_FIRESTORE_EMULATOR_HOST`.
Le regole in `tests/firestore.rules` sono esclusivamente per i test locali.

Con Java 21 e Node.js 22:

```sh
npm ci
npx playwright install chromium
npx --yes firebase-tools@15.33.0 emulators:exec --only firestore --project demo-innovation --config tests/firebase.json "npm run test:e2e"
```

La suite viene eseguita anche da `.github/workflows/test.yml` a ogni push/PR.
Controlla navigazione, login, gestione titoli, più partecipanti, doppio clic,
schede contemporanee, risultati live, sfocatura, QR, reset e nuovo voto,
conflitti durante il reset, errori Firebase, rete e visualizzazione mobile.
Screenshot e risultati JSON sono in `output/qa/` e negli artifact GitHub Actions.
