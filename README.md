# LEO Mobile v0.1

Erster visueller PWA-Prototyp für Android. Aktuell sind alle Kurse und Signale ausdrücklich Beispieldaten.

## Lokal testen
Die Dateien müssen über einen Webserver ausgeliefert werden (Service Worker funktionieren nicht über `file://`).

## Auf Android installieren
1. Projekt auf einen HTTPS-Webhost hochladen.
2. Seite in Chrome auf Android öffnen.
3. Menü ⋮ → „App installieren“ oder „Zum Startbildschirm hinzufügen“.

## Nächste Schritte
- Echtdaten über öffentliche Börsen-API integrieren
- Persistente lokale Datenbank und Datenvalidierung
- Pine-Script-V6-Logik exakt nachbilden und mit Bar-by-bar-Tests vergleichen
- Walk-forward-Backtests inklusive Gebühren, Slippage und Drawdown
- Push-Benachrichtigungen

Keine automatische Orderausführung. Keine Anlageberatung.
