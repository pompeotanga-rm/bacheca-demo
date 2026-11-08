# Bacheca

App per creare board visive, ispirata a Milanote. Con il server (`node server.js`) la **lavagna è condivisa**: le stesse board su telefono, computer e altri dispositivi. Senza server funziona lo stesso e salva i dati solo nel browser.

Contiene anche lo **spazio agenti**: una board condivisa sul server in cui Claude Code e Codex prendono in carico i compiti e le persone approvano, anche da telefono (vedi [Spazio agenti](#spazio-agenti)).

Esiste una copia statica di prova su GitHub Pages ([bancheca-demo](https://pompeotanga-rm.github.io/bancheca-demo/)). Funziona senza server: dati solo nel browser, niente anteprime complete dei link, spazio agenti con dati di esempio.

## Avvio

Richiede Node.js. Dalla cartella del progetto:

```sh
node server.js
```

Apri <http://localhost:5173> nel browser. Il server locale fornisce anche le anteprime dei link.

## Lavagna condivisa

Con il server attivo, al primo avvio l'app chiede il tuo **token da persona** (crealo con `node board-admin.js add tuonome --human`, vedi sotto). Da quel momento:

- **Stesse board ovunque:** board, note, colonne, tabelle, etichette e file sono salvati sul server e sono uguali su tutti i dispositivi collegati.
- **Aggiornamento dal vivo:** quello che cambi sul telefono compare sul Mac senza ricaricare, e viceversa. Chi sta scrivendo in una nota non viene interrotto.
- **Nessuna perdita al primo collegamento:** le board già presenti sul dispositivo vengono unite a quelle del server.
- **Offline:** l'app tiene una copia nel browser. Le modifiche fatte senza rete partono appena il server torna raggiungibile.
- **File:** si caricano sul server e gli altri dispositivi li scaricano solo quando servono.
- **Due dispositivi sullo stesso elemento:** vale l'ultima modifica, per singolo elemento.
- **Registro:** ogni salvataggio finisce nel registro (`data/audit.jsonl`), con chi l'ha fatto.

L'icona della nuvola in alto mostra lo stato: verde sincronizzata, blu in corso, rossa server non raggiungibile. Dal suo menu puoi sincronizzare subito, scollegare il dispositivo o collegarlo. Con *Usa solo questo dispositivo* le board restano solo nel browser, come prima.

Limiti attuali:
- **Annulla (⌘Z):** quando arriva una modifica da un altro dispositivo, la cronologia di annullamento riparte da lì, così non si cancella il lavoro degli altri.
- **File:** quelli eliminati dalle board restano sul server (`data/files/`).

I dati della lavagna sono in `data/lavagna.json` e `data/files/`: per il backup basta copiare la cartella `data/`.

## Sicurezza del server

Per impostazione predefinita il server ascolta solo su `127.0.0.1`, quindi è raggiungibile solo da questo computer.

- **Anteprime dei link:** scarica solo indirizzi pubblici (porte 80, 443, 8080 e 8443). Rifiuta reti private, loopback, link-local e metadati cloud come `169.254.169.254`, anche dopo un redirect e al momento della connessione (protezione contro il DNS rebinding). Ci sono limiti di tempo e dimensione e un massimo di 60 anteprime al minuto per indirizzo.
- **File serviti:** solo i file dell'app con estensioni note. Non escono mai file nascosti (`.git`, `.env`) né `server.js`.
- **Nome host:** accetta solo `localhost`, `127.0.0.1` e i nomi in `ALLOWED_HOSTS`. Le altre richieste ricevono 421.
- **Intestazioni:** CSP (`script-src 'self'`), `X-Frame-Options`, `nosniff`, `Referrer-Policy` e `Permissions-Policy`.
- **Contenuti delle board:** testo formattato, link, video e colori passano da un filtro prima di entrare nella pagina, che tiene solo tag e attributi permessi e solo indirizzi `http`/`https`. Un contenuto malevolo arrivato da un altro dispositivo, da un backup o da un agente non esegue codice. La stessa Content-Security-Policy è anche dentro la pagina, così protegge pure la demo su GitHub Pages.
- **Log:** una riga per richiesta su stdout, con data, IP, metodo, percorso senza parametri ed esito. Con systemd finisce nel journal.

Per aprirlo alla rete locale o alla VPN, indica l'indirizzo e i nomi accettati:

```sh
HOST=0.0.0.0 ALLOWED_HOSTS=bacheca.lan,192.168.1.20 node server.js
```

Il server non ha HTTPS: non esporlo su internet. Su una rete condivisa mettilo dietro un reverse proxy con TLS, oppure rendilo raggiungibile solo dalla VPN.

## Spazio agenti

Una board condivisa in cui lavorano gli agenti (Claude Code, Codex) e le persone. Gli agenti la usano tramite un server MCP. Le persone la seguono da <http://localhost:5173/agenti.html>, anche da telefono, e la pagina si aggiorna da sola. L'icona del robot nell'app principale porta lì, e compare solo quando il server è attivo.

Le card passano per gli stati *da fare → in corso → bloccata / da approvare → fatta*. Le regole:

- **Presa in carico:** un agente lavora su una card solo dopo averla presa in carico, così due agenti non fanno lo stesso lavoro. Se un agente resta fermo per 2 ore, la presa in carico scade.
- **Versioni:** ogni modifica richiede la versione letta. Se nel frattempo un altro ha cambiato la card, la modifica viene rifiutata e l'agente deve rileggerla.
- **Approvazione:** le card con "richiede approvazione" non possono essere chiuse da un agente. Vanno *da approvare* e una persona le approva o le rifiuta con un motivo.
- **Dipendenze:** una card che dipende da altre non si può prendere in carico finché quelle non sono fatte.
- **Pulsante "Ferma agenti":** blocca subito tutte le scritture degli agenti, che possono solo leggere. Le persone continuano a lavorare.
- **Registro:** ogni modifica finisce in `data/audit.jsonl` (chi, cosa, quando) ed è visibile dal pulsante *Registro*.
- **Contenuto delle card:** il server MCP consegna titoli, descrizioni e commenti agli agenti marcandoli come *dati, non istruzioni*, per limitare la prompt injection tra agenti. Resta comunque buona regola dare agli agenti solo i permessi che servono.

### Gli agenti sulla lavagna

Lo spazio agenti e la lavagna sono collegati:

- **Una board per progetto:** ogni progetto (ricavato dalla cartella in cui lavora l'agente) diventa una board della lavagna, con il collegamento nella Home e l'icona 🤖. Si crea da sola alla prima card o nota.
- **Ogni card è un elemento della lavagna:** dentro la board del progetto compare la card dell'agente, che mostra dal vivo stato, chi ci lavora, Approva/Rifiuta e commenti. La puoi spostare e affiancare ai tuoi appunti; se la togli dalla lavagna, la card resta nello spazio agenti.
- **Note degli agenti:** con lo strumento `post_note` un agente pubblica una nota (un rapporto, un riepilogo) sulla board del progetto, firmata con nome e sessione. Solo testo: l'HTML scritto da un agente viene mostrato come testo.
- **Accesso limitato:** gli agenti non toccano la lavagna liberamente. Card e note passano dallo spazio agenti, con presa in carico, pausa, limiti e registro.
- **Card già esistenti:** quelle create prima di questo collegamento ricevono il loro elemento al primo avvio del server.

### Il riquadro Agenti nella lavagna

Dal menu **•••** degli strumenti aggiungi l'elemento **Agenti** a qualsiasi board, come una nota. Il riquadro mostra dal vivo le card di un progetto (o di tutti), con *Da approvare* in cima. Da lì approvi, rifiuti o scrivi all'agente senza lasciare la lavagna. La prima volta chiede il token da persona, lo stesso di `agenti.html`.

Nella demo su GitHub Pages, che non ha server, il riquadro funziona con **dati di esempio** salvati solo nel browser. Il pulsante *Simula un agente* fa comparire una proposta da approvare, così puoi provare il flusso anche dal telefono.

### 1. Crea gli accessi

Ogni persona e ogni agente ha una propria chiave (token). La chiave compare una sola volta: sul server resta solo la sua impronta.

**La prima volta, da terminale**, crea la tua chiave da persona:

```sh
node board-admin.js add tuonome --human
```

**Da lì in poi, dalla sezione Accessi** (menu del profilo, l'ingranaggio → *Accessi*), visibile solo alle persone:

- **Nuovo agente:** scegli il nome e cosa può fare. Ottieni la chiave e i comandi già pronti da incollare in Claude Code o Codex.
- **Permessi per agente:**
  - progetti a cui può accedere (gli altri per lui non esistono: non vede né le card né gli eventi);
  - creare card, lavorare sulle card, commentare, scrivere note sulla lavagna;
  - chiudere senza la tua approvazione: se è spento, ogni card che chiude va *Da approvare*;
  - massimo di modifiche all'ora;
  - **lavagna**, nelle board dei suoi progetti:
    - *nessun accesso*: solo card e note;
    - *solo i propri elementi*: crea note, titoli, liste, colonne, frecce, tabelle e link, e modifica, sposta o elimina solo ciò che ha creato;
    - *anche gli elementi altrui*: in più sposta e modifica anche i tuoi.

    Un agente non elimina mai elementi creati da una persona e non tocca board fuori dai suoi progetti. Scrive solo testo, che il server trasforma in formato sicuro. Ogni elemento mostra "🤖 nome", e quelli tuoi modificati da un agente mostrano "🤖 modificato da…". Il valore precedente di ogni modifica fatta da un agente resta in `data/lavagna-agenti.jsonl`.
- **Scadenza della chiave:** 30 o 90 giorni, un anno, oppure nessuna.
- **Nuova chiave:** quella vecchia smette subito di funzionare.
- **Revoca:** l'accesso termina subito e le card che l'agente aveva in carico tornano libere.
- **Nuova persona:** per un collega.
- **Registro:** ogni operazione finisce nel registro, compresi i tentativi respinti (azione `negato`).

Gli agenti creati da terminale prima dei permessi mantengono tutti i permessi di prima; puoi limitarli dalla sezione Accessi. Il terminale resta disponibile:

```sh
node board-admin.js add claude-code --agent
node board-admin.js list
node board-admin.js revoke codex              # revoca immediata, anche a server avviato
```

I dati (chiavi, board e registro) stanno in `data/`, che non va nel repository. Si può cambiare cartella con `BACHECA_DATA`.

### Assegnare un compito a un agente

Dalla lavagna: menu **•••** → **Compito agente**.
- **Cosa scrivi:** il compito, i dettagli (vincoli, cosa *non* fare), il progetto e a quale agente assegnarlo.
- **Chi lo prende:** solo quell'agente. Se scegli "qualsiasi agente", lo prende il primo che ha accesso al progetto.
- **Approvazione:** di base serve la tua prima della chiusura.
- **Dove compare:** la card nella board del progetto.

L'agente non si avvia da solo: trova il compito alla sua prossima sessione (`board_overview` mostra in cima i compiti assegnati e i suoi permessi).

### 2. Collega Claude Code

Una volta sola, valida per tutte le cartelle (`--scope user`):

```sh
claude mcp add --scope user bacheca \
  -e BACHECA_URL=http://127.0.0.1:5173 \
  -e BACHECA_TOKEN=bch_… \
  -- node /percorso/di/bancheca/mcp/bacheca-mcp.js
```

### 3. Collega Codex

In `~/.codex/config.toml` (vale per tutte le cartelle):

```toml
[mcp_servers.bacheca]
command = "node"
args = ["/percorso/di/bancheca/mcp/bacheca-mcp.js"]
env = { BACHECA_URL = "http://127.0.0.1:5173", BACHECA_TOKEN = "bch_…" }
```

Il token resta scritto nella configurazione del client: proteggi il file (`chmod 600`) e usa un token diverso per ogni agente, così puoi revocarne uno senza toccare gli altri.

### 4. Istruzioni per gli agenti

Perché ogni sessione usi la bacheca da sola, senza che tu glielo chieda, copia le istruzioni pronte nel file che l'agente legge all'avvio:

- Claude Code: [`docs/agenti/CLAUDE.md`](docs/agenti/CLAUDE.md) → nel `CLAUDE.md` del progetto, oppure in `~/.claude/CLAUDE.md` per tutti i progetti;
- Codex: [`docs/agenti/AGENTS.md`](docs/agenti/AGENTS.md) → nell'`AGENTS.md` del progetto, oppure in `~/.codex/AGENTS.md`.

Le istruzioni dicono all'agente di guardare la bacheca a inizio sessione, prendere in carico le card prima di lavorarci, chiedere approvazione per le azioni rischiose e lasciare un commento di consegna (fatto, prossimi passi, blocchi) prima di chiudere.

### Progetti (automatici)

Ogni card appartiene a un progetto, che il server MCP ricava da solo dalla cartella in cui lavora l'agente. Non serve configurarlo cartella per cartella:

- **Repository git:** se la cartella è un repository, il progetto è il nome del repository (dal remote `origin`, altrimenti dal nome della cartella del repository), anche se l'agente lavora in una sottocartella.
- **Cartella semplice:** altrimenti è il nome della cartella.
- **Cartella home o radice del disco:** non c'è progetto, e l'agente vede le card di tutti i progetti.
- **Cartella dichiarata dal client:** se il client indica la cartella di lavoro tramite MCP (Claude Code lo fa), vale quella.
- **Forzarlo a mano:** solo se serve, con `BACHECA_PROJECT`.

Gli agenti vedono le card del loro progetto, più un elenco degli altri progetti con lavoro aperto (`list_cards` con `all_projects` le mostra tutte). Nella pagina `agenti.html` scegli il progetto dal menu in alto, oppure *Tutti i progetti*. Il menu ricorda la scelta e mostra quante card attendono approvazione in ogni progetto.

### Più sessioni dello stesso agente

Ogni avvio del server MCP genera un identificativo di sessione (es. `a3f2`), che compare accanto al nome dell'agente. La presa in carico vale per agente + sessione: due sessioni di Claude Code aperte insieme con lo stesso token non lavorano sulla stessa card, e una non modifica le card dell'altra. Per dare un nome fisso alla sessione, imposta `BACHECA_SESSION` (es. `-e BACHECA_SESSION=notte` nella configurazione MCP). Se una sessione si chiude senza rilasciare le sue card, la presa in carico scade dopo 2 ore, oppure puoi rilasciarla tu dalla pagina.

### 5. Usalo

Chiedi all'agente, per esempio: *"Guarda la bacheca, prendi in carico la card più urgente e lavoraci; commenta i progressi e chiudila quando hai finito"*. Gli strumenti disponibili sono `board_overview`, `list_cards`, `get_card`, `create_card`, `claim_card`, `update_card`, `add_comment`, `release_card`, `post_note`, `list_changes`, `send_message` e `read_messages` (per coordinarsi tra agenti senza scrivere sulla lavagna) e, con il permesso sulla lavagna, `start_section`, `board_elements`, `add_element`, `update_element` e `delete_element`, per costruire schemi.

Quando più agenti lavorano sulla stessa board, ognuno apre una sua sezione con `start_section`: il server la mette in uno spazio libero e ci impila dentro gli elementi, senza coordinate da indovinare. `board_elements` con `changes_only` restituisce solo le novità. In una prova con 4 agenti Claude Code in parallelo (vedi la board «Esperimento: 4 agenti insieme» nella demo), questo ha portato gli spostamenti per evitarsi da 28 a 2, il testo letto da 106 a 28 KB e il costo da 2,80 a 2,18 $.

### Test

```sh
node --test
```

## Stato

La specifica, lo stato delle funzioni e le lacune confermate sono in [SPEC.md](SPEC.md). Il clone non è ancora equivalente a Milanote: selezione di celle e intervalli verificata in Chrome headless, ma uso su un telefono reale ancora da provare; export PDF/PNG/Word e import XLSX non sono stati provati manualmente in questa sessione.

I dati delle board restano nel profilo del browser e non fanno parte di questo repository. Usa il backup dell'app per trasferirli. Su telefono la barra degli strumenti è in basso: tocca uno strumento per aggiungerlo, scorri il canvas da uno spazio vuoto e tocca una board due volte per aprirla. Per una tabella, selezionala, tocca una cella e usa “Modifica” nella barra in basso per scriverci. Per sommare due celle, seleziona la cella del risultato, scegli **Formula → SUM**, poi tocca la prima e la seconda cella: la formula viene completata automaticamente.
