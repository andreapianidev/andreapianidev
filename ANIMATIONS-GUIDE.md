# 🎨 Guida alle Animazioni - Andrea Piani Website

## 📁 File Creati

- **animations.css** - Tutte le animazioni CSS
- **animations.js** - Gestione automatica animazioni scroll e elementi
- **ANIMATIONS-GUIDE.md** - Questa guida

## ✅ Pagine Aggiornate

Le seguenti pagine includono già le animazioni:

1. ✅ index.html
2. ✅ sviluppo-app-ios.html
3. ✅ sviluppo-app-android.html
4. ✅ sviluppo-app-react-web.html
5. ✅ servizi-prestashop.html
6. ✅ preventivo-app.html
7. ✅ progetti-open-source.html

## 🎬 Animazioni Disponibili

### Animazioni di Entrata

```html
<!-- Fade In dal basso -->
<div class="animate-fadeInUp">Contenuto</div>

<!-- Fade In semplice -->
<div class="animate-fadeIn">Contenuto</div>

<!-- Scale In (zoom in) -->
<div class="animate-scaleIn">Contenuto</div>

<!-- Slide da sinistra -->
<div class="animate-slideInLeft">Contenuto</div>

<!-- Slide da destra -->
<div class="animate-slideInRight">Contenuto</div>

<!-- Bounce In -->
<div class="animate-bounceIn">Contenuto</div>
```

### Animazioni Continue

```html
<!-- Pulsazione -->
<div class="icon-pulse">🚀</div>

<!-- Glow luminoso -->
<button class="glow-animate">Pulsante con glow</button>

<!-- Fluttuante -->
<div class="float-animate">Elemento fluttuante</div>

<!-- Gradient animato -->
<section class="gradient-animate" style="background: linear-gradient(...); background-size: 200% 200%;">
  Sfondo gradient animato
</section>
```

### Animazioni Hover

```html
<!-- Bottone animato -->
<button class="btn-animate">Bottone con effetto hover</button>

<!-- Card animata -->
<div class="card-animate">
  Card con hover effect
</div>

<!-- Link con underline animato -->
<a href="#" class="link-animate">Link animato</a>
```

### Animazioni Scroll

```html
<!-- Si anima quando entra nel viewport -->
<div class="scroll-animate">
  Questo contenuto appare quando scrolla in vista
</div>
```

### Animazioni con Delay

```html
<!-- Aggiungi delay per animazioni sequenziali -->
<div class="animate-fadeInUp animate-delay-1">Primo</div>
<div class="animate-fadeInUp animate-delay-2">Secondo</div>
<div class="animate-fadeInUp animate-delay-3">Terzo</div>
```

### Animazioni Stagger (Sequenziali)

```html
<!-- Container con animazioni sequenziali automatiche -->
<div class="stagger-animate">
  <div>Elemento 1 - appare per primo</div>
  <div>Elemento 2 - appare dopo</div>
  <div>Elemento 3 - appare dopo</div>
  <div>Elemento 4 - appare dopo</div>
</div>
```

## 🎯 Esempi di Utilizzo

### Hero Section Animata

```html
<section class="hero-section gradient-animate">
  <div class="container hero-animate">
    <h1 class="animate-fadeInUp">Titolo Principale</h1>
    <p class="animate-fadeInUp animate-delay-1">Sottotitolo</p>
    <button class="btn btn-primary glow-animate animate-fadeInUp animate-delay-2">
      Call to Action
    </button>
  </div>
</section>
```

### Cards con Animazione

```html
<div class="row stagger-animate">
  <div class="col-md-4">
    <div class="card card-animate">
      <h3 class="float-animate">🚀</h3>
      <h4>Feature 1</h4>
      <p>Descrizione</p>
    </div>
  </div>
  <div class="col-md-4">
    <div class="card card-animate">
      <h3 class="float-animate">⚡</h3>
      <h4>Feature 2</h4>
      <p>Descrizione</p>
    </div>
  </div>
  <div class="col-md-4">
    <div class="card card-animate">
      <h3 class="float-animate">🎯</h3>
      <h4>Feature 3</h4>
      <p>Descrizione</p>
    </div>
  </div>
</div>
```

### Sezione con Scroll Reveal

```html
<section class="scroll-animate">
  <h2>Questo appare quando scrolli</h2>
  <p>Il contenuto viene rivelato con animazione</p>
</section>
```

## ⚙️ Funzionalità Automatiche

Il file **animations.js** applica automaticamente:

✅ **Animazioni Hover ai Bottoni** - Tutti i bottoni ricevono automaticamente la classe `btn-animate`
✅ **Animazioni Hover alle Card** - Tutte le card ricevono automaticamente la classe `card-animate`
✅ **Scroll Reveal** - Gli elementi con classe `scroll-animate` si animano quando entrano nel viewport
✅ **Supporto Elementi Dinamici** - Le animazioni funzionano anche per contenuti caricati dinamicamente

## 🎨 Personalizzazione

### Modificare Velocità Animazioni

Nel file `animations.css` puoi modificare la durata:

```css
.animate-fadeInUp {
  animation: fadeInUp 0.8s ease-out; /* Cambia 0.8s */
}
```

### Aggiungere Nuove Animazioni

1. Definisci il keyframe in `animations.css`:

```css
@keyframes myCustomAnim {
  from {
    opacity: 0;
    transform: rotate(0deg);
  }
  to {
    opacity: 1;
    transform: rotate(360deg);
  }
}
```

2. Crea la classe utility:

```css
.animate-myCustom {
  animation: myCustomAnim 1s ease-out;
}
```

3. Usa nel HTML:

```html
<div class="animate-myCustom">Contenuto</div>
```

## 📱 Responsive & Performance

✅ **Animazioni ridotte su mobile** - Su dispositivi mobili le animazioni sono più leggere per migliori performance
✅ **Rispetta preferenze utente** - Se l'utente ha attivato "Riduci animazioni" nelle impostazioni OS, le animazioni sono minimizzate
✅ **Hardware Acceleration** - Usa transform e opacity per performance ottimali

## 🚀 Best Practices

1. **Non esagerare** - Usa animazioni con moderazione
2. **Animazioni significative** - Ogni animazione deve avere uno scopo
3. **Performance** - Usa transform e opacity, evita animazioni di width/height/margin
4. **Accessibilità** - Rispetta `prefers-reduced-motion`
5. **Mobile first** - Testa sempre le animazioni su dispositivi mobili

## 💡 Tips

- Usa `glow-animate` sui CTA importanti
- Usa `float-animate` sulle icone per dare vita
- Usa `scroll-animate` per rivelare contenuti progressivamente
- Usa `stagger-animate` per liste di elementi
- Usa `card-animate` per hover effects accattivanti

---

Creato per **Andrea Piani Website** 🚀
