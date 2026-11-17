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
