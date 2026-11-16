const toast=document.getElementById('toast');
function notify(message){const node=document.getElementById('toast');node.textContent=message;node.classList.add('show');clearTimeout(window.leoToastTimer);window.leoToastTimer=setTimeout(()=>node.classList.remove('show'),2300)}
document.querySelectorAll('.dock button').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('.dock button').forEach(item=>item.classList.remove('active'));button.classList.add('active');const tab=button.dataset.tab;notify(tab==='Dashboard'?'LEO Dashboard':tab+' – Bereich wird im nächsten Ausbau aktiviert.')}));document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>notify('Watchlist: SOL · BTC · LINK · SUI')));

const symbols=['SOLUSDT','BTCUSDT','LINKUSDT','SUIUSDT'];
const api='https://api.binance.com/api/v3';
const fmtPrice=value=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:value<1?5:2}).format(value);
const fmtPct=value=>(value>=0?'+':'')+new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)+' %';
function setConnection(live,message){
 const head=document.getElementById('connection-status');
 const market=document.getElementById('market-status');
 if(head){head.innerHTML='<i></i> '+(live?'LIVE':'DEMO');head.classList.toggle('is-live',live)}
 if(market)market.textContent=live?'LIVE-DATEN':'DEMO-DATEN';
 const disclaimer=document.getElementById('data-disclaimer');
 if(disclaimer)disclaimer.textContent=live?'LEO · Öffentliche Binance-Marktdaten · Signale noch nicht live validiert · Keine Anlageberatung.':('LEO · '+(message||'Live-Daten nicht erreichbar')+' · Beispieldaten nicht als Handelssignal verwenden.');
}
function updatePriceCard(ticker){
 const price=Number(ticker.lastPrice),change=Number(ticker.priceChangePercent);
 const priceNode=document.querySelector('.asset-quote .big-price');
 const changeNode=document.querySelector('.asset-quote .change');
 if(priceNode)priceNode.innerHTML=fmtPrice(price)+' <small>USDT</small>';
 if(changeNode){changeNode.textContent=fmtPct(change);changeNode.classList.toggle('positive',change>=0);changeNode.classList.toggle('negative',change<0)}
}
function updateWatch(ticker){
 const card=document.querySelector('[data-symbol="'+ticker.symbol+'"]');if(!card)return;
 const price=Number(ticker.lastPrice),change=Number(ticker.priceChangePercent);
 const p=card.querySelector('[data-price]'),c=card.querySelector('[data-change]');
 if(p)p.textContent=fmtPrice(price)+' USDT';
 if(c){c.textContent=fmtPct(change);c.classList.toggle('positive',change>=0);c.classList.toggle('negative',change<0)}
}
function drawChart(candles){
 const svg=document.querySelector('.price-chart');if(!svg||!candles.length)return;
 const closes=candles.map(c=>Number(c[4])),volumes=candles.map(c=>Number(c[5]));
 const min=Math.min(...closes),max=Math.max(...closes),span=max-min||1;
 const pts=closes.map((v,i)=>[i*600/(closes.length-1||1),155-(v-min)/span*130]);
 const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
 const area=line+' L600 180 L0 180 Z';
 const maxVol=Math.max(...volumes)||1,barW=Math.max(2,600/volumes.length*.55);
 const bars=volumes.map((v,i)=>{const height=Math.max(2,v/maxVol*34),x=i*600/volumes.length;return '<rect x="'+x.toFixed(1)+'" y="'+(180-height).toFixed(1)+'" width="'+barW.toFixed(1)+'" height="'+height.toFixed(1)+'"/>'}).join('');
 svg.innerHTML='<defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16e6ce" stop-opacity=".3"/><stop offset="1" stop-color="#16e6ce" stop-opacity="0"/></linearGradient></defs><path d="'+area+'" fill="url(#fill)"/><path d="'+line+'" fill="none" stroke="#20e6cf" stroke-width="3" vector-effect="non-scaling-stroke"/><g class="volume-bars" fill="#12bcb4" opacity=".48">'+bars+'</g>';
 svg.setAttribute('aria-label','SOL/USDT – letzte '+candles.length+' Vier-Stunden-Kerzen von Binance');
}
async function getJson(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
 try{const response=await fetch(url,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw new Error('HTTP '+response.status);return await response.json()}
 finally{clearTimeout(timer)}
}
async function refreshMarket(){
 try{
  const tickers=await Promise.all(symbols.map(symbol=>getJson(api+'/ticker/24hr?symbol='+symbol)));
  tickers.forEach(updateWatch);
  const sol=tickers.find(t=>t.symbol==='SOLUSDT');if(sol)updatePriceCard(sol);
  const candles=await getJson(api+'/klines?symbol=SOLUSDT&interval=4h&limit=42');
  drawChart(candles);
  setConnection(true);
  const stamp=new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
  const disclaimer=document.getElementById('data-disclaimer');
  if(disclaimer)disclaimer.textContent='LEO · Live von Binance · Aktualisiert '+stamp+' · Signale noch nicht live validiert · Keine Anlageberatung.';
 }catch(error){
  setConnection(false,'Live-Daten nicht erreichbar ('+(error.name==='AbortError'?'Zeitüberschreitung':'Verbindung fehlgeschlagen')+')');
  console.warn('LEO market data unavailable:',error);
 }
}
refreshMarket();
setInterval(refreshMarket,60000);
if('serviceWorker' in navigator && location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=14').catch(()=>{}));
