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
 const names={SOLUSDT:'Solana',BTCUSDT:'Bitcoin',LINKUSDT:'Chainlink',SUIUSDT:'Sui'};
 const colors={SOLUSDT:'#b54cff',BTCUSDT:'#ffc247',LINKUSDT:'#268dff',SUIUSDT:'#27ded8'};
 const defs='<defs>'+
 '<radialGradient id="coin-bg"><stop stop-color="#102536"/><stop offset=".78" stop-color="#030b15"/><stop offset="1" stop-color="#01060c"/></radialGradient>'+
 '<linearGradient id="sol-grad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ec55ff"/><stop offset=".48" stop-color="#8d45ff"/><stop offset="1" stop-color="#00e9e2"/></linearGradient>'+
 '<linearGradient id="btc-grad" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff2a8"/><stop offset=".48" stop-color="#ffc94d"/><stop offset="1" stop-color="#e98a19"/></linearGradient>'+
 '<linearGradient id="link-grad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a9f5ff"/><stop offset=".45" stop-color="#25baff"/><stop offset="1" stop-color="#275dff"/></linearGradient>'+
 '<linearGradient id="sui-grad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#c6fff9"/><stop offset=".48" stop-color="#28e5dc"/><stop offset="1" stop-color="#1688ff"/></linearGradient>'+
 '<filter id="coin-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
 const shapes={
 SOLUSDT:'<g filter="url(#coin-glow)" fill="url(#sol-grad)" stroke="#b8ffff" stroke-width=".7" stroke-linejoin="round"><path d="M29 29H77L66 40H18Z"/><path d="M29 45H77L66 56H18Z"/><path d="M29 61H77L66 72H18Z"/></g>',
 BTCUSDT:'<g filter="url(#coin-glow)"><path d="M43 21V79M56 21V79" stroke="#ffe18a" stroke-width="5" stroke-linecap="square"/><path d="M34 29H56C73 29 76 49 57 50H34M34 50H59C78 50 76 72 56 72H34" fill="none" stroke="url(#btc-grad)" stroke-width="10" stroke-linecap="square" stroke-linejoin="round"/><path d="M43 18V25M56 18V25M43 75V82M56 75V82" stroke="#fff0a5" stroke-width="3"/></g>',
 LINKUSDT:'<g filter="url(#coin-glow)"><path d="M50 18 78 34V66L50 82 22 66V34Z" fill="none" stroke="url(#link-grad)" stroke-width="9" stroke-linejoin="miter"/><path d="M50 18 78 34V66L50 82 22 66V34Z" fill="none" stroke="#d1f8ff" stroke-width="1.5"/><path d="M50 29 68 39V61L50 71 32 61V39Z" fill="none" stroke="#43aaff" stroke-opacity=".75" stroke-width="1.4"/></g>',
 SUIUSDT:'<g filter="url(#coin-glow)"><path d="M50 15C42 29 24 46 24 62A26 26 0 0 0 76 62C76 46 58 29 50 15Z" fill="none" stroke="url(#sui-grad)" stroke-width="8"/><path d="M32 59C40 49 60 49 68 59C60 69 40 69 32 59Z" fill="none" stroke="#c7fffb" stroke-width="3.3" stroke-linecap="round"/><path d="M38 59Q50 52 62 59" fill="none" stroke="#e2fffd" stroke-width="2.2" stroke-linecap="round"/></g>'
 };
 const color=colors[symbol]||'#20e6cf';
 const outer='<circle cx="50" cy="50" r="47" fill="none" stroke="'+color+'" stroke-opacity=".18" stroke-width="1.5"/><circle cx="50" cy="50" r="44" fill="url(#coin-bg)" stroke="'+color+'" stroke-width="2.1"/><circle cx="50" cy="50" r="39.5" fill="none" stroke="'+color+'" stroke-opacity=".65" stroke-width=".8"/><circle cx="50" cy="50" r="35" fill="none" stroke="'+color+'" stroke-opacity=".22" stroke-width=".8" stroke-dasharray="1.4 3.2"/>';
 const tech=symbol==='BTCUSDT'?'<g fill="none" stroke="'+color+'" stroke-opacity=".42" stroke-width=".9"><path d="M15 31H29L34 26H39M85 31H71L66 26H61M15 69H29L34 74H39M85 69H71L66 74H61M15 50H24M76 50H85"/><circle cx="15" cy="31" r="1.5" fill="'+color+'"/><circle cx="85" cy="31" r="1.5" fill="'+color+'"/></g>':'';
 return '<svg class="coin-art '+symbol.toLowerCase()+'" viewBox="0 0 100 100" role="img" aria-label="'+(names[symbol]||'Crypto')+'" xmlns="http://www.w3.org/2000/svg">'+defs+outer+tech+(shapes[symbol]||'')+'</svg>';
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
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=28').catch(()=>{}));
