# LEO LAB – Prüf- und Testprotokoll v0.8
Stand: 17.11.2026

## 1. Umfang und Schutz
- Änderungen ausschließlich in `lab/`; die Haupt-LEO-Oberfläche und ihre Funktionen bleiben unangetastet.
- Kein Echtgeld, keine Orders, keine automatische Ausführung.
- Historische Tages- und Wochenkerzen von Binance Vision; Fear & Greed von Alternative.me.
- Signale entstehen am Tagesabschluss, frühester Einstieg am nächsten Tages-Open.
- Gebührenmodell: 0,10 % je Seite; angenommene Slippage: 0,05 % je Seite.
- Positionsrisiko: 1 % des Teilkonto-Eigenkapitals; Positionswert höchstens 25 % des Teilkontos.

## 2. Prüfung der hochgeladenen Datei LEO-LAB-Trade-Log-3.csv
Eingelesen mit Semikolon-Trennzeichen: 79 Trades, 33 Spalten, Zeitraum 25.10.2024 bis 23.10.2026.

| Strategie | Trades | Netto | Trefferquote |
|---|---:|---:|---:|
| A · Precision | 15 | +7,17 € | 26,67 % |
| B · Coin First | 28 | +31,26 € | 32,14 % |
| C · Hybrid | 30 | +8,27 € | 23,33 % |
| D · Selective | 6 | +62,91 € | 66,67 % |

Prüfergebnisse:
- Netto-P&L stimmt bei allen 79 Trades mit Menge × (Ausstiegsfill − Einstiegsfill) minus Ein- und Ausstiegsgebühr überein; maximale Abweichung nur Rundungsrauschen (< 0,000000001 €).
- Kein Trade hat einen Stop beim Einstieg oberhalb/gleich dem Einstiegskurs.
- Ursprünglicher Stop und Stop beim Einstieg stimmen in allen Zeilen überein.
- Extremwerte beim CRV: bis 141,32:1 (LINK, B/C). Ursache ist ein extrem enger Stopabstand von 0,02 USDT; Gebühren und Slippage können den rechnerischen CRV-Vorteil praktisch aufzehren.
- Auch BTC weist einen CRV-Ausreißer von 39,27:1 auf. Der bisherige Stopansatz ist daher nicht robust genug.
- CSV-Daten allein enthalten nicht jede historische Tageskerze und jeden Intrabar-Pfad; die exakte Stop-Ausführung bei Kurslücken kann aus dem Log nicht vollständig unabhängig rekonstruiert werden.

Einordnung: D erzielte +62,91 € auf 1.500 € Startkapital (4,19 % kumuliert) in ungefähr zwei Jahren, aber nur mit sechs Trades. Das ist zu wenig Stichprobe und zu wenig Rendite, um D als optimale oder belastbare Strategie zu bezeichnen.

## 3. Erweiterte Tests im LAB v0.8
### Filter-Ablation (jeweils nur ein Kriterium entfernen)
- RSI
- Volumen
- Wochenfilter
- höhere Tiefs
- relative Stärke gegen BTC
- Pullback-only gegenüber Breakout-only
- BTC-Bullenphase gegenüber BTC-Bärenphase

### Stop-Robustheit
- alter enger Struktur-Stop als Vergleich
- Mindestabstand 0,5 / 0,75 / 1,0 / 1,5 ATR
- zusätzlich mindestens 0,5 % Abstand zum Einstieg
- CRV und Positionsgröße werden anhand des tatsächlich verwendeten Stop-Abstands neu berechnet.

### Coin-Anzahl und Diversifikation
D wird mit gleich gewichteten, vorab festgelegten Körben von 2, 4, 6 und 8 Altcoins getestet:
- 2: ETH, SOL
- 4: ETH, SOL, LINK, XRP
- 6: zusätzlich BNB, ADA
- 8: zusätzlich DOGE, AVAX

A–C bleiben als Referenz auf BTC, ETH, SOL und LINK mit 1.500 € Gesamtbudget je Strategie. D-Körbe teilen ebenfalls 1.500 € gleichmäßig auf. Die Coin-Auswahl ist fest und nicht rückwirkend nach Gewinnern sortiert.

### Zeitliche Trennung
- Erste 70 % der gemeinsamen Historie: Entwicklungs-/Trainingsfenster.
- Letzte 30 %: zeitlich späteres Out-of-Sample-Fenster.
- 220 vorherige Tageskerzen werden nur als Indikator-Aufwärmphase genutzt; sie erzeugen keine Trades im Testfenster.
- Train- und OOS-Kennzahlen werden getrennt ausgegeben.

## 4. Bewertungskriterien
Nicht den höchsten absoluten Gewinn allein auswählen. Vorrang haben:
1. positives OOS-Netto nach Gebühren und Slippage,
2. ausreichende Zahl abgeschlossener Trades,
3. Profit Factor größer 1,
4. niedriger synchronisierter maximaler Drawdown,
5. ähnliche Ergebnisse in mehr als einer Marktphase,
6. keine Abhängigkeit von einem einzelnen Coin oder wenigen Ausreißer-Trades.

## 5. Grenzen und nächste Validierungsstufe
- Die LAB-Seite lädt die Live-Historie erst beim Start des Backtests im Browser. Die neuen Varianten sind implementiert und syntaktisch geprüft; ein neuer kompletter Binance-Lauf wurde in dieser Umgebung nicht ausgeführt. Daher enthält dieses Protokoll keine erfundenen Resultate für die neuen Varianten.
- Die API liefert aktuell maximal 1.000 Tageskerzen pro Markt; der gemeinsame Testzeitraum ist dadurch begrenzt.
- Die feste Coin-Liste ist ein Sensitivitätstest, kein survivorship-bias-freier historischer Top-Coin-Test. Delistete und frühere Marktführer werden nicht automatisch berücksichtigt.
- Vor einer echten Auswahl müssen die besten Kandidaten auf längerer Historie, mit Walk-forward-Fenstern und idealerweise weiteren Börsen-/Kostenszenarien erneut geprüft werden.


## 6. Nachprüfung: LEO-LAB-Trade-Log-4.csv
Eingelesen mit Semikolon-Trennzeichen: 79 Trades, 33 Spalten, Zeitraum 25.10.2024 bis 22.10.2026. Die Datei enthält dieselbe Anzahl Trades wie Log-3, aber aktualisierte Nettoergebnisse.

| Strategie | Trades | Netto | Trefferquote |
|---|---:|---:|---:|
| A · Precision | 15 | +3,17 € | 26,67 % |
| B · Coin First | 28 | +13,85 € | 32,14 % |
| C · Hybrid | 30 | +3,68 € | 23,33 % |
| D · Selective | 6 | +76,98 € | 83,33 % |

Coin-Aufteilung laut Log:
- A: BTC 12 Trades (−2,72 €), ETH 1 (+4,13 €), SOL 2 (+1,76 €).
- B: BTC 13 (+0,96 €), ETH 8 (+10,25 €), LINK 3 (−1,90 €), SOL 4 (+4,55 €).
- C: BTC 14 (+0,29 €), ETH 6 (+5,64 €), LINK 4 (−2,97 €), SOL 6 (+0,71 €).
- D: ETH 2 (+39,53 €), SOL 4 (+37,45 €).

Datenintegrität:
- 0 fehlende Zellen in den 33 Spalten.
- Netto-P&L stimmt bei allen 79 Trades mit Menge × (Ausstiegsfill − Einstiegsfill) minus Ein- und Ausstiegsgebühr überein; maximale Abweichung < 0,000000001 €.
- Kein Stop beim Einstieg liegt oberhalb/gleich dem Einstieg; ursprünglicher Stop und Stop beim Einstieg sind in allen Zeilen identisch.
- 12 Trades haben CRV beim Einstieg > 10; 8 davon > 20. Maximum: 141,32:1 (LINK bei B/C) bei nur 0,02 USDT Stopabstand. Diese Kennzahl darf nicht als realistischer Erwartungswert interpretiert werden; Kosten, Tickgröße, Spread und Stop-Ausführung sind für die Robustheit entscheidend.

Änderung gegenüber Log-3: A −4,00 €, B −17,40 €, C −4,59 €, D +14,06 €. Die Abweichung ist erheblich, obwohl die Trade-Anzahl gleich blieb. Vor einem Strategie-Ranking muss daher geklärt sein, warum sich Ausstiegsfills/Stop- und Zielmodell zwischen den Exporten geändert haben. Die CSV selbst belegt keine Ursache; keine der beiden Dateien wird stillschweigend als „richtiger“ Backtest behandelt.

Einordnung: D ist in diesem Export mit +76,98 € vorne, aber weiterhin nur sechs Trades (fünf Gewinner, ein Verlierer). Das Ergebnis ist ein interessanter Hinweis, kein belastbarer Beleg für optimale Einstellungen. Die geänderten Ergebnisse bei gleicher Trade-Anzahl machen die Reproduzierbarkeit des Backtests zum vorrangigen Prüfpunkt.


## 7. Reproduzierbarkeitsfehler gefunden und behoben
Vergleich der beiden vom Nutzer gelieferten Exporte zeigt die Ursache für den größten Teil der Abweichung:
- In Trade-Log 4 sind Positionsmengen und Positionswerte bei 53 von 78 direkt zuordenbaren Trades exakt auf rund 44,44 % des Werts aus Trade-Log 3 reduziert.
- 44,44 % entspricht dem Verhältnis 4/9. Nach Erweiterung der Datenbasis auf neun Assets teilte der Code versehentlich das A–C-Kapital von 1.500 € durch neun, obwohl A–C weiterhin nur vier Märkte handeln. Die UI zeigte weiterhin korrekt 375 € je Markt, die Berechnung verwendete jedoch nur 166,67 €.
- Das erklärt die systematisch niedrigeren Gewinne/Verluste in Log 4; es war kein Markt- oder Strategieeffekt, sondern ein Kapitalzuordnungsfehler.
- Behoben: A–C erhalten wieder 1.500 €/4 = 375 € je Markt. D bleibt im Basisvergleich bei 750 € ETH und 750 € SOL. Die 2/4/6/8-Coin-Experimente teilen jeweils 1.500 € durch die jeweilige Korbgröße.
- lab.js wurde syntaktisch geprüft; der Cache-Buster wurde auf v12 erhöht. Der Haupt-LEO-Code wurde nicht verändert.

Konsequenz für die Auswertung:
- Trade-Log 4 ist wegen des falschen A–C-Kapitalbudgets nicht mit Log 3 vergleichbar und darf nicht als neue Renditebasis verwendet werden.
- Die bisherige Auswertung aus Log 3 bleibt bis zum erneuten Lauf mit korrigierter Version die Referenz; die D-Ergebnisse sind weiterhin wegen nur sechs Trades nicht statistisch belastbar.
- Nächster sauberer Prüfpunkt ist ein erneuter identischer Lauf mit v12. Erst wenn Trades, Fills, Gebühren und Kapitalzuordnung reproduzierbar sind, werden Filter-/Coin-/Stop-Varianten bewertet.


## 8. Nachprüfung: LEO-LAB-Trade-Log-5.csv (nach Kapitalfix)
Eingelesen: 79 Trades, 33 Spalten, keine fehlenden Zellen.

| Strategie | Trades | Netto | Trefferquote |
|---|---:|---:|---:|
| A · Precision | 15 | +7,13 € | 26,67 % |
| B · Coin First | 28 | +31,17 € | 32,14 % |
| C · Hybrid | 30 | +8,28 € | 23,33 % |
| D · Selective | 6 | +76,98 € | 83,33 % |

Validierung:
- Alle 79 Nettowerte stimmen mit Menge × (Ausstiegsfill − Einstiegsfill) minus Ein- und Ausstiegsgebühr überein; maximale Abweichung < 0,000000001 €.
- Keine fehlenden Zellen; kein ungültiger Stop beim Einstieg; ursprünglicher Stop = Stop beim Einstieg.
- Gegenüber Log 4 sind alle sechs D-Trades mit Fills, Mengen und Nettowerten identisch. Bei 73 A–C-Trades beträgt die Positionsgröße und Netto-P&L exakt das 2,25-Fache; dies entspricht der Korrektur von 166,67 € auf 375 € Kapital je A–C-Markt. Die übrigen sechs A–C-Zeilen haben abweichende Größen bzw. P&L, vermutlich wegen aktualisierter Kontostände/Positionsgrößen innerhalb der Strategie; deshalb nicht jeden einzelnen Trade als reine Skalierung behandeln.
- Gegenüber Log 3 sind die Resultate nahe, aber nicht vollständig identisch: 48 von 78 zuordenbaren Trades haben exakt gleiche Positionswerte und Nettowerte. Die übrigen Differenzen betreffen Größen und einzelne Ausstiegsfills. Die Logs sind daher nicht vollkommen reproduzierbar; D gegenüber Log 4 hingegen vollständig.
- CRV-Ausreißer bleiben: 12 Trades >10 und 8 Trades >20; Maximum 141,32:1 durch 0,02 USDT Stopabstand bei LINK in B/C. In D liegt der Median des Einstiegs-CRV bei 2,97 und das Maximum bei 23,18.

Interpretation:
- Der Kapitalzuordnungsfehler in Log 4 ist im Log 5 für die A–C-Basiszuweisung behoben. A–C sind wieder auf dem 1.500-€-Budget vergleichbar.
- D liegt mit +76,98 € vorn, aber nur sechs Trades. ETH: +39,53 € (2 Trades), SOL: +37,45 € (4 Trades). Kein belastbarer Beweis für optimale Einstellungen.
- Log 5 ist die aktuelle Referenz für die korrigierte Kapitalzuordnung. Vor einer endgültigen Optimierung bleiben die kleineren Abweichungen zu Log 3 und die Stop-/CRV-Ausreißer zu untersuchen.


## 9. Nachprüfung: LEO-LAB-Trade-Log-6.csv (v0.9, Nullkosten)
Eingelesen mit Semikolon-Trennzeichen: 79 Trades, 33 Spalten, Zeitraum 26.10.2024 bis 23.10.2026.

| Strategie | Trades | Netto | Trefferquote | Profit Factor |
|---|---:|---:|---:|---:|
| A · Precision | 15 | +11,34 € | 26,67 % | 1,56 |
| B · Coin First | 28 | +38,90 € | 32,14 % | 2,40 |
| C · Hybrid | 30 | +16,35 € | 23,33 % | 1,42 |
| D · Selective | 6 | +80,55 € | 83,33 % | 11,74 |
| Gesamt | 79 | +147,14 € | 30,38 % | — |

Datenintegrität:
- Summe Ein- und Ausstiegsgebühren jeweils 0 €; alle 79 Zeilen enthalten Nullgebühren.
- Rekonstruktion Netto = Menge × (Ausstiegsfill − Einstiegsfill) − Ein-/Ausstiegsgebühren stimmt bis auf Gleitkomma-Rundung (maximale Abweichung < 0,000000000001 €).
- Kein Slippage-Abzug ist in den Fills erkennbar; Einstiegs- und Ausstiegsfills entsprechen den angegebenen Kursen.
- Die Datei enthält ausschließlich abgeschlossene Trades der Strategien A–D. Sie enthält keine Zeitintervall-Kennung und keine Train/OOS-Kennzeichnung. Daher können 1h-/4h-Resultate und OOS-Renditen nicht aus diesem Export rekonstruiert werden.

Einordnung:
- B ist mit 28 Trades, +38,90 € und PF 2,40 der breiteste positive Kandidat dieses Exports. Die Trefferquote liegt dennoch nur bei 32,14 %.
- D hat das höchste Ergebnis, aber nur sechs Trades; PF 11,74 und 83,33 % Trefferquote sind bei dieser Stichprobe stark ausreißeranfällig und kein belastbarer Strategienachweis.
- A und C sind positiv, aber mit PF 1,56 bzw. 1,42 und niedriger Trefferquote noch nicht überzeugend.
- Die Log-6-Werte sind unter Nullkosten zu lesen und nicht direkt mit älteren Logs mit Gebühren/Slippage vergleichbar.

## 10. LAB v0.9 – Intraday-Erweiterung und Berichtsklarheit
- Gebühren und Slippage sind im Backtest auf 0 gesetzt.
- Zusätzliche D-Zeitintervalltests auf 1h und 4h laufen separat für ETH/SOL; Tagesstrategien A–D bleiben als Vergleich erhalten.
- Intraday-Datenabruf lädt bis zu 3.000 Kerzen je Coin/Intervall. Das entspricht ungefähr 125 Tagen bei 1h und 500 Tagen bei 4h; die verfügbare Historie ist damit deutlich kürzer als die tägliche Basis.
- Die Ergebnisanzeige wurde erweitert, damit Training und OOS jeweils Netto, Rendite, Trade-Anzahl, Profit Factor und Drawdown zeigen.
- 15m wird vorerst nicht gerankt: 3.000 Kerzen decken nur rund 31 Tage ab und wären für einen belastbaren zeitlichen Split zu kurz.
- Wichtige Einschränkung: Die bisherigen 1h-/4h-Tests prüfen D direkt auf dem jeweiligen Intervall. Sie sind noch keine kombinierte Multi-Timeframe-Regel wie 4h-Trendfilter plus 1h-Einstieg. Dafür ist ein eigener Folgetest erforderlich.
- Ein kompletter neuer Binance-Backtest wurde nicht serverseitig ausgeführt; die tatsächlichen Intraday-Kennzahlen entstehen beim Start im Browser und müssen anschließend separat exportiert/übermittelt werden.
