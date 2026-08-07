# Software Autoscuola SEO Refresh Design

## Obiettivo

Portare `software-autoscuola.html`, che in Search Console riceve impression ma si trova mediamente all'inizio della seconda pagina, a coprire meglio l'intento "software gestionale per autoscuole" senza creare nuove URL e senza pubblicare prove sociali, integrazioni o adempimenti non verificati.

## Perimetro del primo rilascio

Il rilascio modifica soltanto:

- `sito-web/software-autoscuola.html`, per metadata, contenuto visibile e dati strutturati;
- `tests/check-software-autoscuola-page.sh`, per trasformare i requisiti SEO e di attendibilita in controlli ripetibili;
- `sito-web/sitemap.xml`, esclusivamente per aggiornare il `lastmod` della pagina se il contenuto cambia.

Non crea le landing "app per autoscuole" o "confronto software autoscuole". Non aggiunge screenshot fittizi, loghi cliente, recensioni, certificazioni o numeri di mercato. Il mockup HTML gia presente resta identificato come esempio di interfaccia, non come screenshot del prodotto.

## Strategia scelta

Sono state considerate tre possibilita:

1. Ritocco minimo del title. E rapido, ma lascia invariato il gap semantico evidenziato dalla ricerca.
2. Aggiornamento mirato della pagina esistente. Migliora snippet, copertura dell'intento e chiarezza operativa senza disperdere autorevolezza su nuove URL. E l'approccio scelto.
3. Cluster completo con due nuove landing e articoli satellite. Ha potenziale maggiore, ma richiede un rilascio separato per evitare cannibalizzazione e contenuti frettolosi.

## Contenuto e struttura

### Snippet e condivisione

- Il title deve iniziare con "Software Gestionale per Autoscuole" e restare tra 40 e 60 caratteri.
- La meta description deve restare tra 140 e 160 caratteri e descrivere funzioni concrete, prezzo una tantum e richiesta demo.
- Open Graph e Twitter devono usare un titolo coerente con il nuovo posizionamento.
- La canonical resta invariata.

### Copertura operativa

Il testo deve includere in frasi utili, e non in un elenco di keyword, i concetti mancanti emersi dalla ricerca:

- Motorizzazione Civile e MCTC;
- Portale dell'Automobilista;
- PagoPA e fatturazione elettronica/SDI;
- CQC, CAP e corsi di recupero punti;
- pratiche auto e certificato medico telematico.

Il copy distingue sempre tra funzioni presenti e integrazioni configurabili. Per servizi esterni e flussi ministeriali si usa una formulazione prudente: compatibilita, formati e procedure vengono verificati durante l'analisi. Non si afferma che il prodotto trasmetta gia dati a MCTC, Portale dell'Automobilista, PagoPA o SDI.

Non vengono pubblicati i dati normativi su durata del foglio rosa, tentativi d'esame o ore obbligatorie finche non sono verificati su una fonte primaria aggiornata.

### Prezzo e conversione

La trasparenza di prezzo resta un vantaggio competitivo. La pagina continua a mostrare la fascia `EUR 1.600-2.500`, la formula una tantum e la CTA alla demo. Il test deve impedire che la fascia sparisca o che si trasformi in un prezzo unico rigido.

### Dati strutturati

- `Service`, `SoftwareApplication`, `FAQPage` e `BreadcrumbList` restano presenti e validi JSON.
- Description e feature list del software vengono allineate al contenuto visibile.
- Le FAQ JSON-LD continuano a corrispondere esattamente alle FAQ visibili.
- `dateModified` viene aggiornato al giorno del rilascio.

## Verifica

Prima del deploy devono passare:

- il test specifico `tests/check-software-autoscuola-page.sh`;
- tutti gli script in `tests/check-*.sh`;
- parsing di tutti i blocchi JSON-LD della pagina;
- scansione per claim vietati e termini richiesti;
- controllo HTTP locale della pagina e degli asset essenziali;
- controllo visuale desktop e mobile tramite browser;
- deploy Vercel produzione dalla directory `sito-web`;
- verifica live di status HTTP, canonical, title e contenuti principali su `https://www.andreapiani.com/software-autoscuola.html`.

## Criteri di accettazione

Il rilascio e accettato quando la pagina mantiene un solo H1, metadata nei limiti stabiliti, JSON-LD valido e sincronizzato, prezzo e CTA presenti, lessico operativo integrato senza claim di integrazione non dimostrati, nessuna regressione nei test del sito e risposta live HTTP 200 sul dominio canonico.
