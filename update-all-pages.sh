#!/bin/bash

# Script per aggiornare TUTTE le pagine HTML con il sistema popup centralizzato
# Andrea Piani - 2025

echo "🚀 AGGIORNAMENTO SISTEMA POPUP CENTRALIZZATO"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Contatori
updated=0
skipped=0
errors=0

# File da escludere
exclude_files=("popup-menu.html" "footer-gdpr.html" "google98e9eefca6d4b4b3.html" "wtprivacy.html")

# Funzione per verificare se file è da escludere
should_exclude() {
    local file=$1
    for exclude in "${exclude_files[@]}"; do
        if [[ "$file" == *"$exclude"* ]]; then
            return 0
        fi
    done
    return 1
}

# Trova tutte le pagine HTML
for file in *.html; do
    # Salta se non esiste
    if [ ! -f "$file" ]; then
        continue
    fi

    # Salta file da escludere
    if should_exclude "$file"; then
        echo "⏭️  Saltato: $file (file di sistema)"
        ((skipped++))
        continue
    fi

    echo "📄 Elaboro: $file"

    # Backup
    cp "$file" "$file.backup"

    # STEP 1: Rimuovi vecchio popup inline se esiste
    if grep -q '<div class="popup-menu" id="serviziPopup">' "$file"; then
        echo "   🗑️  Rimuovo vecchio popup inline..."
        # Rimuovi l'intero blocco popup (dalla apertura alla chiusura)
        perl -i -0pe 's/<div class="popup-menu"[^>]*id="serviziPopup"[^>]*>.*?<\/div>\s*<\/div>\s*<\/div>//gs' "$file"
    fi

    # STEP 2: Rimuovi vecchi script popup inline
    if grep -q 'function openServiziPopup()' "$file"; then
        echo "   🗑️  Rimuovo vecchi script popup inline..."
        perl -i -0pe 's/<script>.*?function openServiziPopup\(\).*?<\/script>//gs' "$file"
    fi

    # STEP 3: Aggiungi CSS popup se non presente
    if ! grep -q 'popup-menu.css' "$file"; then
        echo "   ➕ Aggiungo CSS popup..."
        perl -i -pe 's|</head>|  <link rel="stylesheet" href="assets/css/popup-menu.css">\n</head>|' "$file"
    fi

    # STEP 4: Aggiungi JS popup loader se non presente
    if ! grep -q 'popup-loader.js' "$file"; then
        echo "   ➕ Aggiungo JS popup loader..."
        perl -i -pe 's|</body>|  <script src="assets/js/popup-loader.js"></script>\n</body>|' "$file"
    fi

    # STEP 5: Verifica che ci sia il link "Servizi" nella navbar
    if ! grep -q 'onclick="openServiziPopup()"' "$file"; then
        if grep -q 'navbar-nav' "$file"; then
            echo "   ⚠️  ATTENZIONE: Navbar trovata ma link 'Servizi' mancante!"
            echo "      Aggiungi manualmente: <a href=\"#\" onclick=\"openServiziPopup()\" class=\"nav-link\">Servizi ▾</a>"
        fi
    fi

    echo "   ✅ Completato!"
    ((updated++))
    echo ""
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RIEPILOGO:"
echo "   ✅ Pagine aggiornate: $updated"
echo "   ⏭️  Pagine saltate:   $skipped"
echo "   ❌ Errori:           $errors"
echo ""
echo "🎉 AGGIORNAMENTO COMPLETATO!"
echo ""
echo "📝 PROSSIMI PASSI:"
echo "   1. Verifica che i file siano corretti"
echo "   2. Testa il popup su alcune pagine"
echo "   3. Se tutto OK, elimina i backup: rm *.backup"
echo ""
echo "💾 BACKUP CREATI:"
echo "   Ogni file ha un backup .backup"
echo "   Per ripristinare: for f in *.backup; do mv \"\$f\" \"\${f%.backup}\"; done"
echo ""
