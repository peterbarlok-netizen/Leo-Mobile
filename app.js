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
function updateFocusHeading(){
 const asset=assetInfo[selectedSymbol];if(!asset)return;
 const badge=document.getElementById('focus-asset-badge');
 if(badge){badge.textContent=selectedSymbol==='BTCUSDT'?'₿':selectedSymbol==='LINKUSDT'?'⬡':selectedSymbol==='SUIUSDT'?'S':'≋';badge.className='asset-badge focus-'+selectedSymbol.toLowerCase();badge.setAttribute('aria-label',asset.name+' Symbol')}
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
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=23').catch(()=>{}));
