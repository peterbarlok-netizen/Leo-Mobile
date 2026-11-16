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
function drawChart(candles){
 const svg=document.querySelector('.price-chart');if(!svg||!Array.isArray(candles)||!candles.length)return;
 const closes=candles.map(c=>Number(c[4])),volumes=candles.map(c=>Number(c[5]));
 const min=Math.min(...closes),max=Math.max(...closes),span=max-min||1;
 const pts=closes.map((v,i)=>[i*600/(closes.length-1||1),155-(v-min)/span*130]);
 const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
 const area=line+' L600 180 L0 180 Z',maxVol=Math.max(...volumes)||1,barW=Math.max(2,600/volumes.length*.55);
 const bars=volumes.map((v,i)=>{const height=Math.max(2,v/maxVol*34),x=i*600/volumes.length;return '<rect x="'+x.toFixed(1)+'" y="'+(180-height).toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+height.toFixed(1)+'"/>'}).join('');
 svg.innerHTML='<defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16e6ce" stop-opacity=".3"/><stop offset="1" stop-color="#16e6ce" stop-opacity="0"/></linearGradient></defs><path d="'+area+'" fill="url(#fill)"/><path d="'+line+'" fill="none" stroke="#20e6cf" stroke-width="3" vector-effect="non-scaling-stroke"/><g class="volume-bars" fill="#12bcb4" opacity=".48">'+bars+'</g>';
 svg.setAttribute('aria-label','SOL/USDT – letzte '+candles.length+' Vier-Stunden-Kerzen von Binance');
}
async function refreshMarket(){
 const results=await Promise.allSettled(symbols.map(symbol=>getJson('/ticker/24hr?symbol='+symbol)));
 let successes=0,solOk=false;
 results.forEach((result,index)=>{
  if(result.status!=='fulfilled')return;
  successes++;updateWatch(result.value);
  if(symbols[index]==='SOLUSDT'){updatePriceCard(result.value);solOk=true}
 });
 let chartOk=false;
 try{const candles=await getJson('/klines?symbol=SOLUSDT&interval=4h&limit=42');drawChart(candles);chartOk=true}catch(error){console.warn('LEO chart unavailable:',error)}
 const live=solOk&&successes===symbols.length&&chartOk;
 setConnection(live,successes?'Einige Marktdaten fehlen':'Binance-Verbindung fehlgeschlagen');
 if(live){
  const stamp=new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
  const disclaimer=document.getElementById('data-disclaimer');
  if(disclaimer)disclaimer.textContent='LEO · Live von Binance · Aktualisiert '+stamp+' · Signale noch nicht live validiert · Keine Anlageberatung.';
 }
}
setConnection(false,'Verbinde mit Binance');
refreshMarket();
setInterval(refreshMarket,30000);
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=15').catch(()=>{}));
