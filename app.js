
function updateGreetingAndDate(){
 const now=new Date();
 const hour=now.getHours();
 const greeting=hour<11?'Guten Morgen':hour<18?'Guten Tag':'Guten Abend';
 const title=document.getElementById('greeting-title');
 if(title)title.innerHTML=greeting+'<span>.</span>';
 const label=document.getElementById('market-date-label');
 if(label){
  const day=new Intl.DateTimeFormat('de-DE',{weekday:'long'}).format(now);
  label.textContent=day.toLocaleUpperCase('de-DE')+' · MARKTÜBERSICHT';
 }
}
updateGreetingAndDate();
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
 const files={SOLUSDT:'LEO_SOL_Solana.png',BTCUSDT:'LEO_BTC_Bitcoin.png',LINKUSDT:'LEO_LINK_Chainlink.png',SUIUSDT:'LEO_SUI_Sui.png'};
 const names={SOLUSDT:'Solana',BTCUSDT:'Bitcoin',LINKUSDT:'Chainlink',SUIUSDT:'Sui'};
 const file=files[symbol];
 if(!file)return '';
 return '<img class="coin-art '+symbol.toLowerCase()+'" src="./assets/'+file+'" alt="'+names[symbol]+'" loading="eager" decoding="async">';
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

/* LEO 11-point analysis engine. Results are stored as data; dashboard layout remains unchanged. */
function emaSeries(values,period){
 if(values.length<period)return [];
 const output=Array(values.length).fill(null),k=2/(period+1);
 let value=values.slice(0,period).reduce((a,b)=>a+b,0)/period;
 output[period-1]=value;
 for(let i=period;i<values.length;i++){value=values[i]*k+value*(1-k);output[i]=value}
 return output;
}
function ema(values,period){
 const series=emaSeries(values,period);
 return series.length?series.at(-1):null;
}
function rsi(values,period=14){
 if(values.length<=period)return null;
 let gains=0,losses=0;
 for(let i=1;i<=period;i++){const change=values[i]-values[i-1];if(change>0)gains+=change;else losses-=change}
 let averageGain=gains/period,averageLoss=losses/period;
 for(let i=period+1;i<values.length;i++){
  const change=values[i]-values[i-1],gain=Math.max(change,0),loss=Math.max(-change,0);
  averageGain=((averageGain*(period-1))+gain)/period;
  averageLoss=((averageLoss*(period-1))+loss)/period;
 }
 if(averageGain===0&&averageLoss===0)return 50;
 if(averageLoss===0)return 100;
 const rs=averageGain/averageLoss;
 return 100-(100/(1+rs));
}
function findPivotLows(candles){
 const lows=[];
 for(let i=2;i<candles.length-2;i++){
  const v=Number(candles[i][3]);
  if(v<Number(candles[i-1][3])&&v<Number(candles[i-2][3])&&v<Number(candles[i+1][3])&&v<Number(candles[i+2][3]))lows.push({index:i,value:v});
 }
 return lows;
}
function resultItem(id,label,passed,detail){
 return {id,label,status:passed===null?'unavailable':passed?'pass':'fail',passed,applicable:true,detail};
}
function notApplicableItem(id,label,detail){
 return {id,label,status:'not-applicable',passed:null,applicable:false,detail};
}
function evaluateLeoCriteria(symbol,daily,weekly,btcDaily){
 const closedDaily=daily.slice(0,-1),closedWeekly=weekly.slice(0,-1),closedBtc=btcDaily.slice(0,-1);
 const closes=closedDaily.map(c=>Number(c[4])),volumes=closedDaily.map(c=>Number(c[5]));
 const weeklyCloses=closedWeekly.map(c=>Number(c[4]));
 const price=closes.at(-1),e20=ema(closes,20),e50=ema(closes,50);
 const ema200Series=emaSeries(closes,200),e200=ema200Series.at(-1)??null;
 const old200=ema200Series.length>=21?ema200Series.at(-21):null;
 const weekEma50=ema(weeklyCloses,50);
 const momentum=rsi(closes,14);
 const pivots=findPivotLows(closedDaily),lastPivot=pivots.at(-1),previousPivot=pivots.at(-2);
 const btcCloses=closedBtc.map(c=>Number(c[4]));
 const assetReturn=closes.length>=21?price/closes.at(-21)-1:null;
 const btcReturn=btcCloses.length>=21?btcCloses.at(-1)/btcCloses.at(-21)-1:null;
 const avgVolume=volumes.length>=21?volumes.slice(-21,-1).reduce((a,b)=>a+b,0)/20:null;
 const resistance=closedDaily.slice(-21,-1).reduce((m,c)=>Math.max(m,Number(c[2])),0);
 const stop=lastPivot?.value??Math.min(...closedDaily.slice(-20).map(c=>Number(c[3])));
 const risk=price-stop,reward=resistance-price;
 const pullback=e20&&e50?Math.min(Math.abs(price-e20)/e20,Math.abs(price-e50)/e50)<=.025&&price>=e50:null;
 const breakout=closedDaily.length>=4?closes.at(-1)>Math.max(...closedDaily.slice(-4,-1).map(c=>Number(c[2]))):null;
 const criteria=[
  resultItem('daily-trend','Tagestrend',e200?price>e200:null,'Schlusskurs '+(e200?'':'/ EMA 200 nicht verfügbar')),
  resultItem('ema-alignment','EMA-Ausrichtung',e20&&e50?e20>e50:null,'EMA 20 über EMA 50'),
  resultItem('ema200-rising','Steigende EMA 200',e200&&old200?e200>old200:null,'EMA 200 steigt gegenüber vor 20 Handelstagen'),
  resultItem('weekly-filter','Wochenfilter',weekEma50?weeklyCloses.at(-1)>weekEma50:null,'Wochenschluss über Wochen-EMA 50'),
  resultItem('higher-lows','Höhere Tiefs',lastPivot&&previousPivot?lastPivot.value>previousPivot.value:null,'Letztes bestätigtes Pivot-Tief höher als das vorherige'),
  resultItem('rsi-range','RSI 42–65',momentum!==null?momentum>=42&&momentum<=65:null,momentum===null?'RSI nicht verfügbar':'RSI '+momentum.toFixed(1)),
  symbol==='BTCUSDT'?notApplicableItem('relative-strength','Relative Stärke vs. BTC','Nicht anwendbar: BTC ist selbst die Vergleichsbenchmark'):resultItem('relative-strength','Relative Stärke vs. BTC',assetReturn!==null&&btcReturn!==null?assetReturn>btcReturn:null,assetReturn!==null&&btcReturn!==null?'20-Tage-Performance '+(assetReturn*100).toFixed(2)+'% vs. BTC '+(btcReturn*100).toFixed(2)+'%':'Vergleichsdaten fehlen'),
  resultItem('volume','Volumen über Durchschnitt',avgVolume!==null?volumes.at(-1)>avgVolume:null,'Letzte Tageskerze über 20-Tage-Volumendurchschnitt'),
  resultItem('pullback','Pullback EMA 20/50',pullback,pullback===null?'EMA-Daten fehlen':'Nähe zu EMA 20/50 innerhalb 2,5%'),
  resultItem('breakout','Ausbruch bestätigt',breakout,'Schlusskurs über Hoch der vorherigen drei Tageskerzen'),
  resultItem('risk-reward','Chance-Risiko mindestens 2:1',Number.isFinite(risk)&&Number.isFinite(reward)&&risk>0&&reward>0?reward/risk>=2:null,risk>0&&reward>0?'Berechnetes CRV '+(reward/risk).toFixed(2)+':1':'Kein belastbares Ziel-/Stop-Niveau')
 ];
 const applicableCriteria=criteria.filter(x=>x.applicable!==false&&x.status!=='not-applicable');
 const ready=applicableCriteria.every(x=>x.passed!==null&&x.passed!==undefined);
 const passed=criteria.filter(x=>x.passed===true).length;
 const allCriteriaPassed=ready&&applicableCriteria.length>0&&applicableCriteria.every(x=>x.passed===true);
 const signalBlockers=['Sentiment-Filter noch nicht implementiert','Volatilitäts-Filter noch nicht implementiert'];
 return {symbol,interval:'1d + 1w',criteria,passed,total:11,ready,evaluatedAt:new Date().toISOString(),signalEligible:false,allCriteriaPassed,signalBlockers};
}
let analysisRequest=0;
async function refreshAnalysis(){
 const request=++analysisRequest,symbol=selectedSymbol;
 try{
  const [daily,weekly,btcDaily]=await Promise.all([
   getJson('/klines?symbol='+encodeURIComponent(symbol)+'&interval=1d&limit=240'),
   getJson('/klines?symbol='+encodeURIComponent(symbol)+'&interval=1w&limit=80'),
   getJson('/klines?symbol=BTCUSDT&interval=1d&limit=30')
  ]);
  if(request!==analysisRequest||symbol!==selectedSymbol)return;
  window.leoAnalysis=evaluateLeoCriteria(symbol,daily,weekly,btcDaily);
  renderFilterSummary(window.leoAnalysis);
  window.dispatchEvent(new CustomEvent('leo-analysis-updated',{detail:window.leoAnalysis}));
 }catch(error){
  if(request===analysisRequest){
   window.leoAnalysis={symbol,total:11,ready:false,signalEligible:false,criteria:[],error:String(error),evaluatedAt:new Date().toISOString()};
   renderFilterSummary(window.leoAnalysis);
   console.warn('LEO 11-point analysis unavailable:',error);
  }
 }
}


/* Connect the existing six dashboard filters to the eleven calculated checks. */
const filterGroups=[
 {name:'Trend',ids:['daily-trend','ema-alignment','ema200-rising','weekly-filter']},
 {name:'Momentum',ids:['rsi-range','relative-strength','breakout']},
 {name:'Volumen',ids:['volume']},
 {name:'Struktur',ids:['higher-lows','pullback','risk-reward']},
 {name:'Sentiment',ids:[]},
 {name:'Volatilität',ids:[]}
];
function renderFilterSummary(analysis){
 const list=document.querySelector('.filter-list');
 const ring=document.querySelector('.score-ring strong');
 const tiles=[...document.querySelectorAll('.filter-status-grid .status-tile')];
 if(!analysis||!Array.isArray(analysis.criteria)||!analysis.criteria.length){
  if(ring)ring.textContent='–/6';
  if(list)list.querySelectorAll('li').forEach(li=>{li.classList.remove('active','failed');li.classList.add('pending')});
  tiles.forEach(tile=>{tile.classList.add('inactive');const b=tile.querySelector('b');if(b)b.textContent='OFFEN'});
  return;
 }
 const byId=Object.fromEntries(analysis.criteria.map(item=>[item.id,item]));
 const states=filterGroups.map(group=>{
  if(!group.ids.length)return {state:'unavailable'};
  const checks=group.ids.map(id=>byId[id]).filter(Boolean);
  const applicable=checks.filter(item=>item.applicable!==false&&item.status!=='not-applicable');
  if(!applicable.length)return {state:'unavailable'};
  if(applicable.some(item=>item.passed===false))return {state:'fail'};
  if(applicable.some(item=>item.passed===null||item.passed===undefined))return {state:'pending'};
  return {state:'pass'};
 });
 const passed=states.filter(x=>x.state==='pass').length;
 if(ring)ring.textContent=passed+'/6';
 if(list){
  const items=[...list.querySelectorAll('li')];
  items.forEach((li,index)=>{
   const state=states[index]?.state||'pending';
   li.classList.remove('active','failed','pending','unavailable');
   li.classList.add(state==='pass'?'active':state==='fail'?'failed':state);
   li.title=state==='unavailable'?'Für diesen Filter gibt es noch keine aktive Prüfung':state==='pending'?'Daten oder bestätigte Kerzen fehlen noch':state==='pass'?'Alle anwendbaren Prüfungen bestanden':'Mindestens eine anwendbare Prüfung nicht bestanden';
  });
 }
 tiles.forEach((tile,index)=>{
  const state=states[index]?.state||'pending';
  tile.classList.toggle('inactive',state!=='pass');
  tile.classList.toggle('failed',state==='fail');
  const b=tile.querySelector('b');
  if(b)b.textContent=state==='pass'?'ERFÜLLT':state==='fail'?'NICHT ERFÜLLT':state==='unavailable'?'NICHT GEPRÜFT':'OFFEN';
  tile.setAttribute('aria-label',filterGroups[index].name+': '+(b?.textContent||state));
 });
}
window.addEventListener('leo-analysis-updated',event=>renderFilterSummary(event.detail));

function selectAsset(symbol){
 if(!assetInfo[symbol])return;
 selectedSymbol=symbol;
 updateFocusHeading();
 refreshAnalysis();
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
refreshAnalysis();
setInterval(refreshMarket,30000);
setInterval(refreshAnalysis,300000);
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js?v=46').catch(()=>{}));
