const API='https://data-api.binance.vision/api/v3';const $=id=>document.getElementById(id);const fmt=n=>Number(n).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});const pct=n=>(n>=0?'+':'')+n.toFixed(2).replace('.',',')+' %';let interval='4h',daily=[],selected='defensiv',lastAnalysis=null,activeCoin='SOL',chartType='line',chartZoom=1,chartOffset=0,chartData=[];
async function api(path){let r=await fetch(API+path,{cache:'no-store'});if(!r.ok)throw Error('Binance HTTP '+r.status);return r.json()}
function ema(a,p){if(a.length<p)return null;let v=a.slice(0,p).reduce((x,y)=>x+y,0)/p,k=2/(p+1);for(let i=p;i<a.length;i++)v=a[i]*k+v*(1-k);return v}
function atr(c,p=14){if(c.length<p+1)return null;let tr=[];for(let i=1;i<c.length;i++)tr.push(Math.max(c[i].h-c[i].l,Math.abs(c[i].h-c[i-1].c),Math.abs(c[i].l-c[i-1].c)));return tr.slice(-p).reduce((a,b)=>a+b,0)/p}
function rsi(a,p=14){if(a.length<=p)return null;let g=0,l=0;for(let i=a.length-p;i<a.length;i++){let d=a[i]-a[i-1];if(d>0)g+=d;else l-=d}return l===0?100:100-100/(1+g/l)}
function candles(raw){return raw.map(x=>({t:x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5]}))}
function draw(raw){
 if(!Array.isArray(raw)||raw.length<2)throw Error('Zu wenige Kursdaten für den Chart');
 chartData=candles(raw);
 const total=chartData.length,visible=Math.max(8,Math.min(total,Math.round(total/chartZoom)));
 chartOffset=Math.max(0,Math.min(total-visible,chartOffset));
 const from=Math.max(0,total-visible-chartOffset),to=from+visible,cs=chartData.slice(from,to);
 const lows=cs.map(x=>x.l),highs=cs.map(x=>x.h),min=Math.min(...lows),max=Math.max(...highs),pad=(max-min)*.12||Math.max(max*.005,.01),lo=min-pad,hi=max+pad,span=hi-lo||1;
 const X=i=>40+i/(Math.max(1,cs.length-1))*910, Y=v=>420-(v-lo)/span*370;
 let grid='',priceLabels=[];
 for(let i=0;i<6;i++){let val=hi-(hi-lo)*i/5,y=Y(val);grid+='<line x1="38" y1="'+y+'" x2="955" y2="'+y+'" stroke="#17434c" stroke-dasharray="5 6"/>';priceLabels.push('<span>'+fmt(val)+'</span>')}
 for(let i=0;i<7;i++){let x=40+i*152.5;grid+='<line x1="'+x+'" y1="30" x2="'+x+'" y2="420" stroke="#123943" stroke-dasharray="4 7"/>'}
 const defs='<defs><linearGradient id="leoChartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00f4e1" stop-opacity=".32"/><stop offset="1" stop-color="#00f4e1" stop-opacity="0"/></linearGradient></defs>';
 let marks='';
 if(chartType==='line'){
  const pts=cs.map((c,i)=>[X(i),Y(c.c)]);
  const path=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
  marks='<path d="'+path+' L'+X(cs.length-1)+' 420 L'+X(0)+' 420Z" fill="url(#leoChartFill)"/><path d="'+path+'" fill="none" stroke="#20eee0" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round" filter="url(#leoGlow)"/>';
 }else{
  const step=910/Math.max(1,cs.length-1),w=Math.max(2,Math.min(10,step*.58));
  marks=cs.map((c,i)=>{let x=X(i),up=c.c>=c.o,col=up?'#28e0b0':'#ff7185',top=Y(Math.max(c.o,c.c)),bottom=Y(Math.min(c.o,c.c)),body=Math.max(2,bottom-top);return '<line x1="'+x+'" y1="'+Y(c.h)+'" x2="'+x+'" y2="'+Y(c.l)+'" stroke="'+col+'" stroke-width="1.5"/><rect x="'+(x-w/2)+'" y="'+top+'" width="'+w+'" height="'+body+'" rx="1" fill="'+col+'"/>'}).join('');
 }
 const last=cs[cs.length-1],lastY=Y(last.c);
 const svg=$('price-chart');
 svg.innerHTML=defs+'<defs><filter id="leoGlow"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'+grid+marks+'<line x1="38" y1="'+lastY+'" x2="955" y2="'+lastY+'" stroke="#20e6cf" stroke-dasharray="7 5" opacity=".85"/><circle cx="955" cy="'+lastY+'" r="4" fill="#20e6cf"/>';
 $('chart-axis').innerHTML=priceLabels.join('');
 const labels=[0,Math.floor((cs.length-1)/3),Math.floor(2*(cs.length-1)/3),cs.length-1];
 const intraday=['5m','30m','1h','4h'].includes(interval);
 $('chart-x-axis').innerHTML=labels.map(i=>'<span>'+new Date(cs[i].t).toLocaleString('de-DE',intraday?{hour:'2-digit',minute:'2-digit'}:{day:'2-digit',month:'2-digit'})+'</span>').join('');
 $('chart-label').textContent=activeCoin+' / USDT · '+interval.toUpperCase().replace('1D','1T');
}
function renderAnalysis(){let c=daily.slice(0,-1),cl=c.map(x=>x.c),last=cl.at(-1),e20=ema(cl,20),e50=ema(cl,50),e200=ema(cl,200),old=ema(cl.slice(0,-20),200),a=atr(c),mom=rsi(cl);lastAnalysis={last,e20,e50,e200,old,a,mom,above:last>e200,rising:e200>old};[['ema20',e20],['ema50',e50],['ema200',e200],['atr',a],['rsi',mom]].forEach(([id,v])=>$(id).textContent=v==null?'—':id==='rsi'?v.toFixed(1):fmt(v));$('ema-slope').textContent=e200>old?'STEIGEND':'FALLEND';[['ema20-state',last>e20],['ema50-state',last>e50],['ema200-state',last>e200]].forEach(([id,ok])=>$(id).textContent=ok?'Kurs darüber':'Kurs darunter');let checks=[['Tagesschluss über EMA200',last>e200],['EMA200 steigt',e200>old],['EMA20 über EMA50',e20>e50],['RSI 42–65',mom>=42&&mom<=65]];$('criteria').innerHTML=checks.map(([s,ok])=>'<li class="'+(ok?'pass':'fail')+'">'+(ok?'✓ ':'• ')+s+'</li>').join('');$('trend-score').textContent=checks.filter(x=>x[1]).length+'/4';$('trend-list').innerHTML=checks.map(([s,ok])=>'<li class="'+(ok?'pass':'fail')+'">'+s+'</li>').join('');$('market-verdict').textContent=last>e200&&e200>old?'AUFWÄRTSTREND':'BEOBACHTEN';$('market-verdict-note').textContent=last>e200&&e200>old?'SOL notiert über einer steigenden EMA200.':'Trendbedingungen sind noch nicht vollständig erfüllt.';$('signal-word').textContent=last>e200&&e200>old?'SETUP AKTIV':'ABWARTEN';$('signal-reason').textContent=last>e200&&e200>old?'Tagestrend positiv. Einstieg erst nach bestätigtem Tagesabschluss und Folgetages-Open.':'Kein bestätigter EMA200-Aufwärtstrend. Kein Einstieg.';$('signal-checks').innerHTML=checks.map(([s,ok])=>'<li class="'+(ok?'pass':'fail')+'">'+(ok?'✓ ':'○ ')+s+'</li>').join('')+'<li>Initialer Stop: 3,5 ATR</li>'}

const coins={SOL:{name:'Solana',symbol:'SOLUSDT',logo:'./assets/LEO_SOL_Solana.png'},BTC:{name:'Bitcoin',symbol:'BTCUSDT',logo:'./assets/LEO_BTC_Bitcoin.png'},LINK:{name:'Chainlink',symbol:'LINKUSDT',logo:'./assets/LEO_LINK_Chainlink.png'},SUI:{name:'Sui',symbol:'SUIUSDT',logo:'./assets/LEO_SUI_Sui.png'}};
function updateGreeting(){const now=new Date();const days=['SONNTAG','MONTAG','DIENSTAG','MITTWOCH','DONNERSTAG','FREITAG','SAMSTAG'];const hour=now.getHours();const greeting=hour<11?'Guten Morgen':hour<18?'Guten Tag':'Guten Abend';const day=$('market-date-label');const title=$('greeting-title');if(day)day.textContent=days[now.getDay()]+' · MARKTÜBERSICHT';if(title)title.innerHTML=greeting+'<span>.</span>'}
updateGreeting();
async function refresh(){
 const meta=coins[activeCoin];
 try{
  let [ticker,raw]=await Promise.all([api('/ticker/24hr?symbol='+meta.symbol),api('/klines?symbol='+meta.symbol+'&interval='+interval+'&limit=120')]);
  $('sol-price').textContent=fmt(+ticker.lastPrice);
  const dailyChange=+ticker.priceChangePercent;
  $('sol-change').textContent=pct(dailyChange);
  $('sol-change').className='change chart-change '+(dailyChange>=0?'positive':'negative');
  $('coin-name').textContent=meta.name.toUpperCase();$('coin-pair').textContent=activeCoin+'-USDT';$('coin-logo').src=meta.logo;$('coin-logo').alt=meta.name;
  if($('connection-status'))$('connection-status').textContent='LIVE';
  $('market-status').textContent='LIVE-DATEN';
  draw(raw);
  if(activeCoin==='SOL'){let day=await api('/klines?symbol=SOLUSDT&interval=1d&limit=260');daily=candles(day);renderAnalysis()}
 }catch(e){if($('connection-status'))$('connection-status').textContent='OFFLINE';$('market-status').textContent='DATEN NICHT VERFÜGBAR';console.error(e)}
}
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelector('.v50').classList.toggle('overview-active',b.dataset.tab==='Übersicht');document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('[data-view]').forEach(v=>{let show=v.dataset.view===b.dataset.tab;v.hidden=!show;v.classList.toggle('active',show)});window.scrollTo({top:0,behavior:'instant'});if(b.dataset.tab==='Backtest'&&!window.btRun)$('bt-status').textContent='Bereit. Starte den historischen SOL-Test.'}));

function closeCoinMenu(){const m=$('coin-menu'),b=$('coin-select');m.hidden=true;b.setAttribute('aria-expanded','false')}
$('coin-select').addEventListener('click',()=>{const m=$('coin-menu'),open=m.hidden;m.hidden=!open;$('coin-select').setAttribute('aria-expanded',String(open))});
document.querySelectorAll('[data-coin]').forEach(b=>b.addEventListener('click',()=>{activeCoin=b.dataset.coin;chartZoom=1;chartOffset=0;document.querySelectorAll('[data-coin]').forEach(x=>x.classList.toggle('active',x===b));closeCoinMenu();refresh()}));
document.addEventListener('click',e=>{if(!e.target.closest('.coin-select-wrap'))closeCoinMenu()});
document.querySelectorAll('[data-chart-type]').forEach(b=>b.addEventListener('click',()=>{chartType=b.dataset.chartType;document.querySelectorAll('[data-chart-type]').forEach(x=>{let on=x===b;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on))});if(chartData.length)draw(chartData.map(c=>[c.t,c.o,c.h,c.l,c.c,c.v]))}));
function zoomChart(factor){chartZoom=Math.max(1,Math.min(8,chartZoom*factor));if(chartData.length)draw(chartData.map(c=>[c.t,c.o,c.h,c.l,c.c,c.v]))}
$('chart-reset').addEventListener('click',()=>{chartZoom=1;chartOffset=0;if(chartData.length)draw(chartData.map(c=>[c.t,c.o,c.h,c.l,c.c,c.v]))});
const stage=$('chart-stage'),svg=$('price-chart');let dragX=null,pointers=new Map(),pinchDistance=0;
svg.addEventListener('wheel',e=>{e.preventDefault();zoomChart(e.deltaY<0?1.15:1/1.15)},{passive:false});
function pointerDistance(){const p=[...pointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}
svg.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});svg.setPointerCapture(e.pointerId);if(pointers.size===1){dragX=e.clientX;stage.classList.add('is-panning')}else{dragX=null;pinchDistance=pointerDistance()}});
svg.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const previous=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>=2){const next=pointerDistance();if(pinchDistance>0&&next>0)zoomChart(Math.max(.88,Math.min(1.14,next/pinchDistance)));pinchDistance=next;dragX=null;return}if(dragX===null)return;let dx=e.clientX-dragX;dragX=e.clientX;let visible=Math.max(8,Math.round(chartData.length/chartZoom));chartOffset=Math.max(0,Math.min(chartData.length-visible,chartOffset-Math.round(dx/Math.max(1,svg.clientWidth)*visible)));if(chartData.length)draw(chartData.map(c=>[c.t,c.o,c.h,c.l,c.c,c.v]))});
function stopPointer(e){pointers.delete(e.pointerId);if(pointers.size===1){const p=[...pointers.values()][0];dragX=p.x}else if(!pointers.size){dragX=null;pinchDistance=0;stage.classList.remove('is-panning')}}
svg.addEventListener('pointerup',stopPointer);svg.addEventListener('pointercancel',stopPointer);
document.querySelectorAll('[data-interval]').forEach(b=>b.addEventListener('click',()=>{interval=b.dataset.interval;chartZoom=1;chartOffset=0;document.querySelectorAll('[data-interval]').forEach(x=>x.classList.toggle('selected',x===b));refresh()}));
const configs={defensiv:{name:'DEFENSIV',partial:.5,target:2,atr:3.5,desc:'50 % Teilverkauf bei +2R · Rest mit ATR-Trailing-Stop.'},balance:{name:'BALANCE',partial:.75,target:2,atr:3.5,desc:'75 % Teilverkauf bei +2R · 25 % bleiben für große SOL-Bewegungen offen.'},trend:{name:'100 % TREND',partial:0,target:0,atr:4,desc:'Kein Teilverkauf · gesamte Position mit 4,0 ATR absichern.'}};
document.querySelectorAll('[data-strategy]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.strategy;document.querySelectorAll('[data-strategy]').forEach(x=>x.classList.toggle('selected',x===b));$('strategy-description').textContent=configs[selected].desc;if(window.btResults)showResult(window.btResults[selected])}));
function runOne(cs,cfg){let equity=1,peak=1,maxdd=0,trades=[],cl=cs.map(x=>x.c),entries=[];let e200=cs.map((_,i)=>ema(cl.slice(0,i+1),200));for(let i=205;i<cs.length-1;i++){if(!(cs[i].c>e200[i]&&e200[i]>e200[i-20]))continue;let entry=cs[i+1].o,a=atr(cs.slice(0,i+1)),risk=a*cfg.atr;if(!a||risk<=0)continue;let stop=entry-risk,trail=stop,target=entry+2*risk,partialDone=false,remaining=1,profit=0,exit=entry,exitIndex=i+1;for(let j=i+1;j<cs.length;j++){let bar=cs[j];if(bar.l<=trail){exit=trail;exitIndex=j;profit+=remaining*(exit-entry)/entry;remaining=0;break}if(cfg.partial>0&&!partialDone&&bar.h>=target){profit+=cfg.partial*(target-entry)/entry;remaining-=cfg.partial;partialDone=true}if(bar.c>entry+risk){let next=bar.c-cfg.atr*a;trail=Math.max(trail,next)}if(bar.c<ema(cl.slice(0,j+1),50)){exit=bar.c;exitIndex=j;profit+=remaining*(exit-entry)/entry;remaining=0;break}if(j===cs.length-1){exit=bar.c;exitIndex=j;profit+=remaining*(exit-entry)/entry;remaining=0}}/* Gebühren und Slippage werden für die Strategiebewertung bewusst nicht abgezogen. */equity*=1+profit;peak=Math.max(peak,equity);maxdd=Math.max(maxdd,(peak-equity)/peak);trades.push({entryDate:new Date(cs[i+1].t).toLocaleDateString('de-DE'),exitDate:new Date(cs[exitIndex].t).toLocaleDateString('de-DE'),ret:profit*100});i=exitIndex-1}return {ret:(equity-1)*100,dd:maxdd*100,trades}}
function showResult(r){$('bt-return').textContent=pct(r.ret);$('bt-dd').textContent='-'+r.dd.toFixed(2).replace('.',',')+' %';$('bt-count').textContent=r.trades.length;$('bt-winrate').textContent=r.trades.length?(100*r.trades.filter(t=>t.ret>0).length/r.trades.length).toFixed(1).replace('.',',')+' %':'—';$('bt-best').textContent=r.trades.length?pct(Math.max(...r.trades.map(t=>t.ret))):'—';$('bt-worst').textContent=r.trades.length?pct(Math.min(...r.trades.map(t=>t.ret))):'—';$('bt-trades').innerHTML=r.trades.slice(-12).reverse().map(t=>'<div class="bt-trade"><span>'+t.entryDate+' → '+t.exitDate+'</span><b class="'+(t.ret>=0?'positive':'negative')+'">'+pct(t.ret)+'</b><small>Geschlossener Trade</small></div>').join('')||'Keine Trades unter diesen Bedingungen.'}
$('run-backtest').addEventListener('click',async()=>{let btn=$('run-backtest');btn.disabled=true;$('bt-status').textContent='Lade historische SOL-Tagesdaten und simuliere…';try{let raw=await api('/klines?symbol=SOLUSDT&interval=1d&limit=1000'),cs=candles(raw);let results={};Object.keys(configs).forEach(k=>results[k]=runOne(cs,configs[k]));window.btResults=results;window.btRun=true;showResult(results[selected]);$('bt-comparison').innerHTML=Object.entries(results).map(([k,r])=>'<tr><td>'+configs[k].name+'</td><td>'+pct(r.ret)+'</td><td>-'+r.dd.toFixed(2)+' %</td><td>'+r.trades.length+'</td></tr>').join('');$('bt-status').textContent='Test abgeschlossen · '+new Date(cs[0].t).toLocaleDateString('de-DE')+' bis '+new Date(cs.at(-1).t).toLocaleDateString('de-DE')+'. Modellannahmen siehe Hinweis.'}catch(e){$('bt-status').textContent='Backtest fehlgeschlagen: '+e.message}finally{btn.disabled=false}});
refresh();setInterval(refresh,60000);