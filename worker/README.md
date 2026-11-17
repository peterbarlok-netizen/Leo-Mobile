# LEO LAB – geschützter GitHub-Logger

## Einrichtung
1. Cloudflare öffnen → **Workers & Pages** → **Create Worker**. Name: `leo-lab-trade-log`.
2. Code aus `worker/src/index.js` als Worker-Code einsetzen und deployen.
3. Unter **Settings → Variables and Secrets** zwei Secrets anlegen:
   - `GITHUB_TOKEN`: GitHub Fine-grained Personal Access Token, nur Repository `Leo-Mobile`, Berechtigung **Contents: Read and write**.
   - `LAB_WRITE_KEY`: eigenes langes zufälliges Passwort (mindestens 32 Zeichen).
4. Worker-Adresse notieren (z. B. `https://leo-lab-trade-log.<dein-account>.workers.dev`).
5. In LEO LAB bei „Automatischer Trade-Logger“ Adresse und denselben `LAB_WRITE_KEY` eintragen und speichern.

## Sicherheit
- Nur Origin `https://peterbarlok-netizen.github.io` wird akzeptiert.
- GitHub-Token bleibt ausschließlich als Cloudflare Secret auf dem Server.
- Worker prüft Logger-Schlüssel, Methode, Pfad und Payload-Größe.
- Neue Backtests werden an die JSON-Datei angehängt.
- Der Browser speichert den Logger-Schlüssel lokal auf dem Gerät, nicht im öffentlichen Quellcode.

Der Worker muss zuerst im Cloudflare-Konto deployed und beide Secrets müssen gesetzt sein. Bis dahin bleibt CSV-Export verfügbar und automatischer Upload deaktiviert.
