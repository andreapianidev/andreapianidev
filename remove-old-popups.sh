#!/bin/bash

# Script per rimuovere i vecchi popup inline da tutte le pagine
# e lasciar funzionare solo il popup centralizzato

echo "🗑️  RIMOZIONE VECCHI POPUP INLINE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

removed=0

# Lista file da processare
files="analisi-sicurezza-prestashop.html app-native-vs-cross-platform.html app-pubblicate-store.html bot-trading.html come-creare-app-guadagnare.html crm.html gestionali-personalizzati-aziende.html gestionali-personalizzati.html inserimento-prodotti-ecommerce.html migrazione-prestashop-8-9.html mouse-auto-clicker.html mvp-app-startup.html prestashop-sqleditor.html preventivo-app.html progetti-open-source.html pubblicazione-app-store-play.html quanto-costa-sviluppare-app.html servizi-perfex-crm.html servizi-prestashop.html sviluppo-app-android.html sviluppo-app-mobile.html sviluppo-app-react-web.html sviluppo-python.html"

for file in $files; do
    if [ ! -f "$file" ]; then
        echo "⏭️  Saltato: $file (non trovato)"
        continue
    fi

    echo "📄 Elaboro: $file"

    # Usa perl per rimuovere tutto il blocco popup (multi-line)
    # Dal commento <!-- POPUP MEGA MENU SERVIZI --> fino alla chiusura </div> prima di <!-- Breadcrumb -->
    perl -i -0pe 's/\s*<!-- POPUP MEGA MENU SERVIZI -->.*?<\/div>\s*<\/div>\s*\n\s*\n\s*(?=\s*<!-- Breadcrumb Navigation -->)/\n\n/gs' "$file"

    echo "   ✅ Rimosso vecchio popup"
    ((removed++))
    echo ""
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RIEPILOGO:"
echo "   ✅ Popup rimossi: $removed"
echo ""
echo "🎉 COMPLETATO!"
echo ""
echo "Ora tutte le pagine useranno il popup centralizzato da popup-menu.html"
echo ""
