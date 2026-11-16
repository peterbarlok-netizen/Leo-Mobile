const symbols=['SOLUSDT','BTCUSDT','LINKUSDT','SUIUSDT'];
const API_HOSTS=['https://data-api.binance.vision/api/v3','https://api.binance.com/api/v3','https://api1.binance.com/api/v3'];
const fmtPrice=value=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:value<1?6:2}).format(value);
const fmtPct=value=>(value>=0?'+':'')+new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)+' %';
function setConnection(live,message){
 const head=document.getElementById('connection-status'),market=document.getElementById('market-status');
 if(head){head.innerHTML='<i></i> '+(live?'LIVE':'OFFLINE');head.classList.toggle('is-live',live)}
 if(market){market.textContent=live?'LIVE-DATEN':'KEINE LIVE-DATEN';market.classList.toggle('is-live',live)}
 const disclaimer=document.getElementById('data-disclaimer');
 if(disclaimer)disclaimer.textContent=live?'LEO · Öffentliche Binance-Marktdaten · Signale noch nicht live validiert · Keine Anlageberatung.':('LEO · '+(message||'Live-Daten nicht erreichbar')+' · Angezeigte Kurse sind keine aktuellen Marktdaten.');
}
async function getJson(path){
 let lastError;
 for(const host of API_HOSTS){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetch(host+path,{signal:controller.signal,cache:'no-store',mode:'cors'});
   if(!response.ok)throw new Error('HTTP '+response.status);
   return await response.json();
  }catch(error){lastError=error}
  finally{clearTimeout(timer)}
 }
 throw lastError||new Error('Keine Binance-Datenquelle erreichbar');
}

function coinIcon(symbol){
 const defs='<defs><linearGradient id="g-sol" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c04cff"/><stop offset=".52" stop-color="#775bff"/><stop offset="1" stop-color="#00f2df"/></linearGradient><linearGradient id="g-btc" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff1a4"/><stop offset=".55" stop-color="#ffbf36"/><stop offset="1" stop-color="#ff7b24"/></linearGradient><linearGradient id="g-link" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#9beaff"/><stop offset=".55" stop-color="#238dff"/><stop offset="1" stop-color="#304cff"/></linearGradient><linearGradient id="g-sui" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c6fff8"/><stop offset=".55" stop-color="#27d9df"/><stop offset="1" stop-color="#168dff"/></linearGradient></defs>';
 const shapes={
 SOLUSDT:'<path d="M25 27H77L65 39H13Z M25 44H77L65 56H13Z M25 61H77L65 73H13Z" fill="url(#g-sol)" stroke="#b4ffff" stroke-width="1.3" stroke-linejoin="round"/>',
 BTCUSDT:'<g fill="none" stroke="#ffcf63" stroke-opacity=".48" stroke-width="1.5"><path d="M17 28H31L37 22H44 M83 28H69L63 22H56 M17 72H31L37 78H44 M83 72H69L63 78H56"/><path d="M20 50H29 M71 50H80 M50 13V22 M50 78V87"/></g><circle cx="50" cy="50" r="34" fill="none" stroke="#ffcf63" stroke-opacity=".25" stroke-width="1.5" stroke-dasharray="2 4"/><text x="50" y="70" text-anchor="middle" font-size="67" font-family="Arial,sans-serif" font-weight="bold" fill="url(#g-btc)" stroke="#ffe58b" stroke-width=".7">₿</text>',
 LINKUSDT:'<path d="M50 17 79 34V66L50 83 21 66V34Z" fill="none" stroke="url(#g-link)" stroke-width="12" stroke-linejoin="miter"/><path d="M50 17 79 34V66L50 83 21 66V34Z" fill="none" stroke="#b5eaff" stroke-opacity=".75" stroke-width="2.2"/><path d="M50 27 70 39V61L50 73 30 61V39Z" fill="none" stroke="#56baff" stroke-opacity=".55" stroke-width="1.5"/>',
 SUIUSDT:'<path d="M50 13C41 29 22 45 22 62a28 28 0 0 0 56 0C78 45 59 29 50 13Z" fill="none" stroke="url(#g-sui)" stroke-width="9" stroke-linejoin="round"/><path d="M31 59C40 48 60 48 69 59C60 70 40 70 31 59Z" fill="none" stroke="#aafff5" stroke-width="3.5" stroke-linecap="round"/><path d="M38 59Q50 52 62 59" fill="none" stroke="#d1fffb" stroke-width="2.5" stroke-linecap="round"/>'
 };
 const color={SOLUSDT:"#9d5cff",BTCUSDT:"#ffc04b",LINKUSDT:"#369cff",SUIUSDT:"#25d9d5"}[symbol]||"#20e6cf";
 return '<svg class="coin-art '+symbol.toLowerCase()+'" viewBox="0 0 100 100" role="img" aria-label="'+({SOLUSDT:"Solana",BTCUSDT:"Bitcoin",LINKUSDT:"Chainlink",SUIUSDT:"Sui"}[symbol]||"Crypto")+'" xmlns="http://www.w3.org/2000/svg">'+defs+'<circle cx="50" cy="50" r="44" fill="#030d18" stroke="'+color+'" stroke-width="2.5"/><circle cx="50" cy="50" r="39" fill="none" stroke="'+color+'" stroke-opacity=".22" stroke-width="1"/>'+shapes[symbol]+'</svg>';
}

function updateFocusHeading(){
 const asset=assetInfo[selectedSymbol];if(!asset)return;
 const badge=document.getElementById('focus-asset-badge');
 if(badge){badge.innerHTML=coinIcon(selectedSymbol);badge.className='asset-badge focus-'+selectedSymbol.toLowerCase();badge.setAttribute('aria-label',asset.name+' Symbol')}
 document.querySelectorAll('.watch-card[data-symbol]').forEach(card=>{const icon=card.querySelector('.coin-symbol');if(icon)icon.innerHTML=coinIcon(card.dataset.symbol)});
 const name=document.querySelector('.asset-name');
 if(name)name.innerHTML=asset.name+' <span class="ticker">'+asset.ticker+'</span>';
 const heading=document.querySelector('.market .panel-heading h2');
 if(heading)heading.innerHTML=asset.name+' <span class="ticker">'+asset.ticker+'</span>';
 const svg=document.querySelector('.price-chart');
 if(svg)svg.setAttribute('aria-label',asset.ticker+' Kurschart – Live-Daten');
 document.querySelectorAll('.watch-card').forEach(card=>{
  const active=card.dataset.symbol===selectedSymbol;
  card.classList.toggle('is-selected',active);
  card.setAttribute('aria-pressed',active?'true':'false');
 });
}
function updatePriceCard(ticker){
 const price=Number(ticker.lastPrice),change=Number(ticker.priceChangePercent);
 if(!Number.isFinite(price)||!Number.isFinite(change))return;
 const p=document.querySelector('.asset-quote .big-price'),c=document.querySelector('.asset-quote .change');
 if(p)p.innerHTML=fmtPrice(price)+' <small>USDT</small>';
 if(c){c.textContent=fmtPct(change);c.classList.toggle('positive',change>=0);c.classList.toggle('negative',change<0)}
}
function updateWatch(ticker){
 const card=document.querySelector('[data-symbol="'+ticker.symbol+'"]');if(!card)return;
 const price=Number(ticker.lastPrice),change=Number(ticker.priceChangePercent);
 if(!Number.isFinite(price)||!Number.isFinite(change))return;
 const p=card.querySelector('[data-price]'),c=card.querySelector('[data-change]');
 if(p)p.textContent=fmtPrice(price)+' USDT';
 if(c){c.textContent=fmtPct(change);c.classList.toggle('positive',change>=0);c.classList.toggle('negative',change<0)}
}
const assetInfo={
 SOLUSDT:{name:'Solana',ticker:'SOL / USDT'},
 BTCUSDT:{name:'Bitcoin',ticker:'BTC / USDT'},
 LINKUSDT:{name:'Chainlink',ticker:'LINK / USDT'},
 SUIUSDT:{name:'Sui',ticker:'SUI / USDT'}
};
let selectedSymbol='BTCUSDT';
let chartRequest=0;
let selectedInterval='4h';
const intervalLabels={'5m':'5-Minuten','30m':'30-Minuten','1h':'Stunden','4h':'4-Stunden','1d':'Tage','1w':'Wochen','1M':'Monate'};
function dateLabel(value,interval){
 const d=new Date(Number(value));
 const opts=interval==='5m'||interval==='30m'||interval==='1h'||interval==='4h'?{day:'2-digit',hour:'2-digit',minute:interval==='5m'||interval==='30m'?'2-digit':undefined}:interval==='1w'||interval==='1M'?{year:'numeric'}:{day:'2-digit',month:'2-digit'};
 return d.toLocaleDateString('de-DE',opts);
}
function drawChart(candles,interval){
 const svg=document.querySelector('.price-chart');if(!svg||!Array.isArray(candles)||!candles.length)return;
 const closes=candles.map(c=>Number(c[4])),volumes=candles.map(c=>Number(c[5]));
 const min=Math.min(...closes),max=Math.max(...closes),pad=(max-min)*.12||max*.005,lo=min-pad,hi=max+pad,span=hi-lo||1;
 const pts=closes.map((v,i)=>[i*600/(closes.length-1||1),155-(v-lo)/span*130]);
 const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
 const area=line+' L600 180 L0 180 Z',maxVol=Math.max(...volumes)||1,barW=Math.max(2,600/volumes.length*.55);
 const bars=volumes.map((v,i)=>{const height=Math.max(2,v/maxVol*30),x=i*600/volumes.length;return '<rect x="'+x.toFixed(1)+'" y="'+(180-height).toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+height.toFixed(1)+'"/>'}).join('');
 svg.innerHTML='<defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16e6ce" stop-opacity=".3"/><stop offset="1" stop-color="#16e6ce" stop-opacity="0"/></linearGradient></defs><path d="'+area+'" fill="url(#fill)"/><path d="'+line+'" fill="none" stroke="#20e6cf" stroke-width="3" vector-effect="non-scaling-stroke"/><g class="volume-bars" fill="#12bcb4" opacity=".48">'+bars+'</g>';
 const axis=document.querySelector('.chart-axis-right');
 if(axis)axis.innerHTML=[hi,(hi+lo)/2,lo].map(v=>'<span>'+fmtPrice(v)+'</span>').join('');
 const xaxis=document.querySelector('.chart-x-axis');
 if(xaxis){const indices=[0,Math.floor((candles.length-1)/2),candles.length-1];xaxis.innerHTML=indices.map(i=>'<span>'+dateLabel(candles[i][0],interval)+'</span>').join('')}
 svg.setAttribute('aria-label',assetInfo[selectedSymbol].ticker+' – '+candles.length+' Binance-Kerzen, Intervall '+intervalLabels[interval]);
}
async function refreshChart(){
 const request=++chartRequest,symbol=selectedSymbol,interval=selectedInterval;
 const label=document.getElementById('chart-current-label');
 if(label)label.textContent=assetInfo[symbol].ticker+' · '+interval.toUpperCase()+' · lädt…';
 const svg=document.querySelector('.price-chart');
 if(svg)svg.innerHTML='<text x="300" y="92" text-anchor="middle" fill="#8caeb7" font-size="18">Lade '+assetInfo[symbol].ticker+'…</text>';
 const axis=document.querySelector('.chart-axis-right');if(axis)axis.innerHTML='';
 const xaxis=document.querySelector('.chart-x-axis');if(xaxis)xaxis.innerHTML='';
 try{
  const candles=await getJson('/klines?symbol='+encodeURIComponent(symbol)+'&interval='+encodeURIComponent(interval)+'&limit=48');
  if(request!==chartRequest||symbol!==selectedSymbol||interval!==selectedInterval)return;
  if(!Array.isArray(candles)||!candles.length)throw new Error('Keine Kerzendaten erhalten');
  drawChart(candles,interval);
  const svg=document.querySelector('.price-chart');
  if(svg)svg.setAttribute('aria-label',assetInfo[symbol].ticker+' – '+candles.length+' Binance-Kerzen, '+intervalLabels[interval]);
  if(label)label.textContent=assetInfo[symbol].ticker+' · '+interval.toUpperCase();
 }catch(error){
  if(request===chartRequest){
   if(label)label.textContent=assetInfo[symbol].ticker+' · Chartdaten nicht verfügbar';
   console.warn('LEO chart unavailable:',symbol,interval,error);
  }
 }
}
function selectAsset(symbol){
 if(!assetInfo[symbol])return;
 selectedSymbol=symbol;
 updateFocusHeading();
 const cachedTicker=window.leoTickers?.[symbol];
 if(cachedTicker)updatePriceCard(cachedTicker);
 refreshChart();
}
document.querySelectorAll('.watch-card[data-symbol]').forEach(card=>{
 card.addEventListener('click',()=>selectAsset(card.dataset.symbol));
 card.addEventListener('keydown',event=>{
  if(event.key==='Enter'||event.key===' '){event.preventDefault();selectAsset(card.dataset.symbol)}
 });
});
document.querySelectorAll('[data-interval]').forEach(button=>button.addEventListener('click',()=>{
 selectedInterval=button.dataset.interval;
 document.querySelectorAll('[data-interval]').forEach(b=>b.classList.toggle('selected',b===button));
 refreshChart();
}));
async function refreshMarket(){
 const results=await Promise.allSettled(symbols.map(symbol=>getJson('/ticker/24hr?symbol='+symbol)));
 let successes=0,solOk=false;
 results.forEach((result,index)=>{
  if(result.status!=='fulfilled')return;
  successes++;updateWatch(result.value);
  window.leoTickers=window.leoTickers||{};
  window.leoTickers[result.value.symbol]=result.value;
  if(result.value.symbol===selectedSymbol)updatePriceCard(result.value);
  if(symbols[index]==='SOLUSDT')solOk=true
 });
 const live=solOk&&successes===symbols.length;
 setConnection(live,successes?'Einige Marktdaten fehlen':'Binance-Verbindung fehlgeschlagen');
 if(live){
  const stamp=new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
  const disclaimer=document.getElementById('data-disclaimer');
  if(disclaimer)disclaimer.textContent='LEO · Live von Binance · Aktualisiert '+stamp+' · Signale noch nicht live validiert · Keine Anlageberatung.';
 }
}
updateFocusHeading();
setConnection(false,'Verbinde mit Binance');
refreshMarket();
refreshChart();
setInterval(refreshMarket,30000);
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=27').catch(()=>{}));
