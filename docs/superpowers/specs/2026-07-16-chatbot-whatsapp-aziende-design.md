# Chatbot WhatsApp Aziende Design Specification

## Obiettivo

Creare una landing page italiana indicizzabile per la query commerciale `chatbot whatsapp aziende`, capace di trasformare traffico organico già consapevole della soluzione in conversazioni qualificate su WhatsApp con Andrea Piani.

## Vincoli commerciali e di copy

- Non mostrare prezzi, fasce di prezzo o promesse numeriche non verificabili.
- Ogni CTA commerciale deve aprire WhatsApp al numero `+39 351 624 8936` con un messaggio contestuale precompilato.
- Posizionare il servizio come soluzione personalizzata per processi aziendali, non come chatbot generico pronto all'uso.
- Usare italiano semplice, concreto e orientato al risultato.
- Non usare testimonianze, rating, clienti o statistiche inventate.

## Strategia SEO

- URL: `/chatbot-whatsapp-aziende.html`
- Keyword primaria: `chatbot whatsapp aziende`
- Keyword correlate: `chatbot WhatsApp Business`, `chatbot AI WhatsApp`, `bot WhatsApp per aziende`, `automazione WhatsApp Business`, `assistente virtuale WhatsApp`, `integrazione chatbot CRM`.
- Intento: commerciale e solution-aware.
- Title: `Chatbot WhatsApp per Aziende: AI, Lead e Assistenza | Andrea Piani`
- H1: `Un chatbot WhatsApp che risponde ai clienti e porta avanti il lavoro`
- Dati strutturati: `Service`, `BreadcrumbList` e `FAQPage`, senza prezzo né recensioni.
- Collegamenti interni da pagine affini e presenza in sitemap e menu servizi.

## Architettura della pagina

1. Hero con promessa, tre benefici verificabili e CTA WhatsApp.
2. Simulazione visiva di una conversazione che passa da richiesta a qualificazione, CRM e operatore.
3. Sezione problema con messaggi ripetitivi, tempi di risposta e informazioni disperse.
4. Flusso operativo: riceve, comprende, agisce, passa la conversazione a una persona.
5. Capacità: FAQ, lead, appuntamenti, preventivi, assistenza e integrazioni.
6. Casi d'uso per servizi, studi, agenzie, ecommerce e attività locali.
7. Differenziazione tra automazione progettata sui processi e risponditore generico.
8. Metodo di lavoro in quattro fasi.
9. FAQ SEO con costi descritti come variabili, senza cifre, e invito al contatto.
10. CTA finale WhatsApp e footer coerente con il sito.

## Sistema visuale

### Colori

- Ink `#101820`: base scura e autorevole.
- Paper `#F5F1E8`: fondo editoriale caldo.
- Signal green `#25D366`: CTA e stati completati.
- Amber `#F4B942`: passaggio a operatore e attenzione.
- Coral `#FF6B5E`: priorità e accenti.
- Slate `#52606D`: testo secondario.

### Tipografia

- Titoli: `Jost`, peso 700/800, composizione compatta.
- Testo e UI: `Source Code Pro` per etichette operative e `Jost` per paragrafi.

### Elemento distintivo

Una centrale conversazioni nel hero: il messaggio del cliente attraversa nodi visivi `AI`, `CRM` e `persona`, rendendo immediatamente comprensibile il valore del servizio. L'animazione deve rispettare `prefers-reduced-motion`.

### Wireframe

```text
[nav]                                      [scrivimi su WhatsApp]

[eyebrow + H1 + copy + CTA]       [centrale conversazioni]
[benefit] [benefit] [benefit]      cliente > AI > CRM > persona

[problema: inbox piena]            [risultato: processo ordinato]

[riceve] -> [comprende] -> [agisce] -> [passa a una persona]

[FAQ] [lead] [appuntamenti] [preventivi] [supporto] [integrazioni]

[casi d'uso per settore]
[perché su misura]
[metodo in 4 fasi]
[FAQ SEO]
[CTA WhatsApp finale]
[footer]
```

## Accessibilità e responsive

- Contrasto WCAG AA per testo e controlli.
- Focus visibile su link, bottoni e FAQ.
- Layout a colonna singola sotto 760px.
- Target tattili minimi di 44px.
- Nessuna informazione affidata soltanto al colore o al movimento.
- Animazioni disabilitate o ridotte con `prefers-reduced-motion`.

## Criteri di accettazione

- HTML valido, un solo H1 e gerarchia H2/H3 coerente.
- Meta SEO, canonical, Open Graph, Twitter e JSON-LD presenti e coerenti.
- Nessun prezzo nel testo, nei meta o nei dati strutturati.
- Tutte le CTA commerciali portano a WhatsApp.
- Pagina presente in sitemap e menu servizi.
- Almeno tre link interni da pagine affini e link contestuali in uscita verso cluster pertinenti.
- Nessun errore console, overflow mobile o link locale rotto.
