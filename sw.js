const CACHE='leo-mobile-v40';
const FILES=['./','./index.html','./styles.css?v=40','./app.js?v=40','./backtest.js?v=40','./manifest.webmanifest','./assets/leo-cyber-hero-1.jpg','./assets/LEO_SOL_Solana.png','./assets/LEO_BTC_Bitcoin.png','./assets/LEO_LINK_Chainlink.png','./assets/LEO_SUI_Sui.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('leo-mobile-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method==='GET')event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));});
