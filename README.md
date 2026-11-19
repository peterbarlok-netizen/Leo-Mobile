# LEO Mobile v0.50 DEV

Mobile-first, read-only crypto market analysis for SOL/USDT.

## Active application
- Root-level GitHub Pages app: `index.html`, `styles.css`, `app.js`.
- Market data: public Binance Spot API; no API key and no trading permissions.
- SOL/USDT price, selected candle interval, daily EMA trend analysis, ATR and RSI.
- Rule-based signal overview and an on-device historical SOL backtest.
- The app does not submit orders or store exchange credentials.

## Version 0.50 cleanup
- Promoted the active v0.49 DEV interface from `v049/` to the repository root.
- Consolidated the active base and v0.49 interface styles into one stylesheet without changing their cascade order.
- Removed the obsolete LAB projects, LAB archives, LAB trade logger, Cloudflare LAB worker, and the old v0.48 root application files.
- Removed duplicate unused legacy hero-image files.
- Updated the service-worker cache namespace and asset versions to v0.50.

## Publish
GitHub Pages: branch `main`, folder `/(root)`.

## Important limitations
- Market data requires network access to Binance's public API.
- Historical simulation results are not a forecast. Fees and slippage are not included in the v0.49 SOL backtest.
- Signals are analysis hints only, not investment advice or automatic execution.
