# LEO Mobile v0.14

Mobile-first, analysis-only crypto dashboard.

## Market data
- Read-only public Binance Spot REST endpoints; no API key and no trading permissions.
- SOLUSDT, BTCUSDT, LINKUSDT and SUIUSDT 24-hour tickers refresh every 60 seconds.
- SOLUSDT 4-hour candles (42 bars) render the dashboard chart.
- If Binance is unavailable or blocked, LEO keeps the last visible values and marks the connection as DEMO / unavailable. Never treat fallback values as live.
- The app does not submit orders or hold exchange credentials.

## Important status
Live prices are connected in the browser when the public exchange API is reachable. The 5/6 filter / market verdict remains a visual placeholder and is not a validated signal engine. Historical backtests and push notifications are not yet connected.

## Publish
GitHub Pages: branch `main`, folder `/(root)`.
