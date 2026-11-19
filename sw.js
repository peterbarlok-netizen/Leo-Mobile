const CACHE='leo-mobile-v93';
const FILES=['./','./index.html','./styles.css?v=93','./app.js?v=93','./manifest.webmanifest','./assets/LEO_SOL_Solana.png','./assets/LEO_BTC_Bitcoin.png','./assets/LEO_LINK_Chainlink.png','./assets/LEO_SUI_Sui.png','./assets/a_vivid_high_contrast_digital_illustration_identi.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('leo-mobile-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 const isPage=event.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/Leo-Mobile/');
 if(isPage){
  event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
   if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
   return response;
  }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
 }else{
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
 }
});
