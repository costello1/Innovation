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
