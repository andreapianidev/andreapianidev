#!/bin/bash

# Script per aggiungere il link "Servizi" nelle navbar
# Andrea Piani - 2025

echo "🔗 AGGIUNTA LINK SERVIZI NELLE NAVBAR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Contatori
updated=0
skipped=0

# Link da inserire
SERVIZI_LINK='                    <li class="nav-item"><a href="#" onclick="openServiziPopup()" class="nav-link">Servizi ▾</a></li>'

# File da escludere
exclude_files=("popup-menu.html" "footer-gdpr.html" "google98e9eefca6d4b4b3.html" "wtprivacy.html" "cookie-policy.html" "cookie-policy-en.html" "privacy-policy.html" "privacy-policy-en.html" "grazie-guida.html" "guida-sviluppo-app-mvp-2025.html" "indexen.html")

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
        echo "⏭️  Saltato: $file"
        ((skipped++))
        continue
    fi

    echo "📄 Elaboro: $file"

    # Verifica se ha navbar
    if ! grep -q 'navbar-nav' "$file"; then
        echo "   ⏭️  Nessuna navbar trovata"
        ((skipped++))
        continue
    fi

    # Verifica se ha già il link Servizi
    if grep -q 'onclick="openServiziPopup()"' "$file"; then
        echo "   ✅ Link Servizi già presente"
        ((skipped++))
        continue
    fi

    # Cerca dove inserire il link (dopo il primo <li> della navbar)
    if grep -q '<ul class="navbar-nav' "$file"; then
        echo "   ➕ Aggiunto link Servizi"

        # Inserisci il link Servizi dopo <ul class="navbar-nav...">
        perl -i -pe 's/(<ul class="navbar-nav[^>]*>\s*<li[^>]*>.*?<\/li>)/$1\n'"$SERVIZI_LINK"'/' "$file"

        ((updated++))
    else
        echo "   ⚠️  Struttura navbar non riconosciuta"
        ((skipped++))
    fi

    echo ""
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RIEPILOGO:"
echo "   ✅ Pagine aggiornate: $updated"
echo "   ⏭️  Pagine saltate:   $skipped"
echo ""
echo "🎉 COMPLETATO!"
echo ""
