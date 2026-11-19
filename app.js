const API='https://data-api.binance.vision/api/v3';const $=id=>document.getElementById(id);const fmt=n=>Number(n).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});const pct=n=>(n>=0?'+':'')+n.toFixed(2).replace('.',',')+' %';let interval='4h',daily=[],selected='defensiv',lastAnalysis=null,activeCoin='SOL',chartType='line',chartData=[],tvChart=null,tvSeries=null,chartNeedsFit=true,tvResizeObserver=null;
async function api(path){let r=await fetch(API+path,{cache:'no-store'});if(!r.ok)throw Error('Binance HTTP '+r.status);return r.json()}
function ema(a,p){if(a.length<p)return null;let v=a.slice(0,p).reduce((x,y)=>x+y,0)/p,k=2/(p+1);for(let i=p;i<a.length;i++)v=a[i]*k+v*(1-k);return v}
function atr(c,p=14){if(c.length<p+1)return null;let tr=[];for(let i=1;i<c.length;i++)tr.push(Math.max(c[i].h-c[i].l,Math.abs(c[i].h-c[i-1].c),Math.abs(c[i].l-c[i-1].c)));return tr.slice(-p).reduce((a,b)=>a+b,0)/p}
function rsi(a,p=14){if(a.length<=p)return null;let g=0,l=0;for(let i=a.length-p;i<a.length;i++){let d=a[i]-a[i-1];if(d>0)g+=d;else l-=d}return l===0?100:100-100/(1+g/l)}
function candles(raw){return raw.map(x=>({t:x[0],o:+x[1],h:+x[2],l:+x[3],c:+x[4],v:+x[5]}))}
function initTradingViewChart(){
 const host=$('price-chart');
 if(tvChart||!host||!window.LightweightCharts)return;
 const L=window.LightweightCharts;
 tvChart=L.createChart(host,{
  width:Math.max(1,host.clientWidth),height:Math.max(1,host.clientHeight),autoSize:false,
  layout:{background:{type:'solid',color:'#06151d'},textColor:'#9bb5bf',fontFamily:'DM Sans, sans-serif',fontSize:10,attributionLogo:false},
  grid:{vertLines:{color:'rgba(18,57,67,.62)',style:2},horzLines:{color:'rgba(23,67,76,.72)',style:2}},
  rightPriceScale:{visible:true,borderColor:'#24515a',autoScale:true,entireTextOnly:true,minimumWidth:64,scaleMargins:{top:.12,bottom:.12}},
  timeScale:{visible:true,borderColor:'#24515a',timeVisible:true,secondsVisible:false,rightOffset:1,barSpacing:7,minBarSpacing:2},
  crosshair:{mode:L.CrosshairMode.Normal,vertLine:{color:'#20e6cf',width:1,style:2,labelBackgroundColor:'#0c5557'},horzLine:{color:'#20e6cf',width:1,style:2,labelBackgroundColor:'#0c5557'}},
  handleScroll:{mouseWheel:true,pressedMouseMove:true,horzTouchDrag:true,vertTouchDrag:true},
  handleScale:{axisPressedMouseMove:{time:true,price:true},mouseWheel:true,pinch:true},
  kineticScroll:{mouse:true,touch:true},
  localization:{locale:'de-DE',priceFormatter:price=>Number(price).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:8})}
 });
 const stage=$('chart-stage');
 const resizeChart=()=>{if(tvChart&&stage&&stage.clientWidth>0&&stage.clientHeight>0)tvChart.resize(stage.clientWidth,stage.clientHeight)};
 if(typeof ResizeObserver!=='undefined'&&stage){const chartResizeObserver=new ResizeObserver(()=>resizeChart());chartResizeObserver.observe(stage);host._leoChartResizeObserver=chartResizeObserver;}
 window.addEventListener('orientationchange',()=>requestAnimationFrame(resizeChart),{passive:true});
 requestAnimationFrame(resizeChart);
 $('price-chart').classList.add('tradingview-active');
}
function movingAverageSeries(candles,period){
 let result=[],value=null,k=2/(period+1);
 for(let i=0;i<candles.length;i++){
  const close=candles[i].c;
  if(i===period-1)value=candles.slice(0,period).reduce((sum,c)=>sum+c.c,0)/period;
  else if(i>=period)value=close*k+value*(1-k);
  if(i>=period-1)result.push({time:Math.floor(candles[i].t/1000),value});
 }
 return result;
}
function draw(raw){
 if(!Array.isArray(raw)||raw.length<2)throw Error('Zu wenige Kursdaten für den Chart');
 chartData=candles(raw);
 initTradingViewChart();
 if(!tvChart)throw Error('TradingView Chartbibliothek konnte nicht geladen werden');
 const data=chartData.map(c=>({time:Math.floor(c.t/1000),open:c.o,high:c.h,low:c.l,close:c.c,value:c.c}));
 if(tvSeries)tvChart.removeSeries(tvSeries);
 if(chartType==='line'){
  tvSeries=tvChart.addSeries(window.LightweightCharts.AreaSeries,{
   lineColor:'#20e6cf',topColor:'rgba(32,230,207,.28)',bottomColor:'rgba(32,230,207,0)',
   lineWidth:2,priceLineVisible:true,lastValueVisible:true,crosshairMarkerVisible:true
  });
  tvSeries.setData(data.map(c=>({time:c.time,value:c.close})));
 }else{
  tvSeries=tvChart.addSeries(window.LightweightCharts.CandlestickSeries,{
   upColor:'#28e0b0',downColor:'#ff7185',borderUpColor:'#28e0b0',borderDownColor:'#ff7185',
   wickUpColor:'#28e0b0',wickDownColor:'#ff7185',priceLineVisible:true,lastValueVisible:true
  });
  tvSeries.setData(data.map(({time,open,high,low,close})=>({time,open,high,low,close})));
 }
 if(chartNeedsFit){tvChart.timeScale().fitContent();tvChart.priceScale('right').applyOptions({autoScale:true});chartNeedsFit=false;}
 $('chart-label').textContent=activeCoin+' / USDT · '+interval.toUpperCase().replace('1D','1T');
}
function renderAnalysis(){let c=daily.slice(0,-1),cl=c.map(x=>x.c),last=cl.at(-1),e20=ema(cl,20),e50=ema(cl,50),e200=ema(cl,200),old=ema(cl.slice(0,-20),200),a=atr(c),mom=rsi(cl);lastAnalysis={last,e20,e50,e200,old,a,mom,above:last>e200,rising:e200>old};[['ema20',e20],['ema50',e50],['ema200',e200],['atr',a],['rsi',mom]].forEach(([id,v])=>$(id).textContent=v==null?'—':id==='rsi'?v.toFixed(1):fmt(v));$('ema-slope').textContent=e200>old?'STEIGEND':'FALLEND';[['ema20-state',last>e20],['ema50-state',last>e50],['ema200-state',last>e200]].forEach(([id,ok])=>$(id).textContent=ok?'Kurs darüber':'Kurs darunter');let checks=[['Tagesschluss über EMA200',last>e200],['EMA200 steigt',e200>old],['EMA20 über EMA50',e20>e50],['RSI 42–65',mom>=42&&mom<=65]];$('criteria').innerHTML=checks.map(([s,ok])=>'<li class="'+(ok?'pass':'fail')+'">'+(ok?'✓ ':'• ')+s+'</li>').join('');$('trend-score').textContent=checks.filter(x=>x[1]).length+'/4';$('trend-list').innerHTML=checks.map(([s,ok])=>'<li class="'+(ok?'pass':'fail')+'">'+s+'</li>').join('');$('market-verdict').textContent=last>e200&&e200>old?'AUFWÄRTSTREND':'BEOBACHTEN';$('market-verdict-note').textContent=last>e200&&e200>old?'SOL notiert über einer steigenden EMA200.':'Trendbedingungen sind noch nicht vollständig erfüllt.';$('signal-word').textContent=last>e200&&e200>old?'SETUP AKTIV':'ABWARTEN';$('signal-reason').textContent=last>e200&&e200>old?'Tagestrend positiv. Einstieg erst nach bestätigtem Tagesabschluss und Folgetages-Open.':'Kein bestätigter EMA200-Aufwärtstrend. Kein Einstieg.';$('signal-checks').innerHTML=checks.map(([s,ok])=>'<li class="'+(ok?'pass':'fail')+'">'+(ok?'✓ ':'○ ')+s+'</li>').join('')+'<li>Initialer Stop: 3,5 ATR</li>'}

const coins={SOL:{name:'Solana',symbol:'SOLUSDT',logo:'./assets/LEO_SOL_Solana.png'},BTC:{name:'Bitcoin',symbol:'BTCUSDT',logo:'./assets/LEO_BTC_Bitcoin.png'},LINK:{name:'Chainlink',symbol:'LINKUSDT',logo:'./assets/LEO_LINK_Chainlink.png'},SUI:{name:'Sui',symbol:'SUIUSDT',logo:'./assets/LEO_SUI_Sui.png'}};
function updateGreeting(){const now=new Date();const days=['SONNTAG','MONTAG','DIENSTAG','MITTWOCH','DONNERSTAG','FREITAG','SAMSTAG'];const hour=now.getHours();const greeting=hour<11?'Guten Morgen':hour<18?'Guten Tag':'Guten Abend';const day=$('market-date-label');const title=$('greeting-title');if(day)day.textContent=days[now.getDay()]+' · MARKTÜBERSICHT';if(title)title.innerHTML=greeting+'<span>.</span>'}
updateGreeting();
async function refresh(){
 const meta=coins[activeCoin];
 try{
  let [ticker,raw]=await Promise.all([api('/ticker/24hr?symbol='+meta.symbol),api('/klines?symbol='+meta.symbol+'&interval='+interval+'&limit=300')]);
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
document.querySelectorAll('[data-coin]').forEach(b=>b.addEventListener('click',()=>{activeCoin=b.dataset.coin;chartNeedsFit=true;document.querySelectorAll('[data-coin]').forEach(x=>x.classList.toggle('active',x===b));closeCoinMenu();refresh()}));
document.addEventListener('click',e=>{if(!e.target.closest('.coin-select-wrap'))closeCoinMenu()});
document.querySelectorAll('[data-indicator]').forEach(b=>b.addEventListener('click',()=>{
 const key=b.dataset.indicator;indicatorState[key]=!indicatorState[key];
 b.classList.toggle('selected',indicatorState[key]);b.setAttribute('aria-pressed',String(indicatorState[key]));
 if(key==='volume'){
  if(volumeSeries){tvChart.removeSeries(volumeSeries);volumeSeries=null;}
  else if(chartData.length){
   volumeSeries=tvChart.addSeries(window.LightweightCharts.HistogramSeries,{priceScaleId:'',priceFormat:{type:'volume'},base:0,lastValueVisible:false,priceLineVisible:false});
   volumeSeries.setData(chartData.map(c=>({time:Math.floor(c.t/1000),value:c.v,color:c.c>=c.o?'rgba(40,224,176,.72)':'rgba(255,113,133,.72)'})));
  }
 }else if(emaSeries[key])emaSeries[key].applyOptions({visible:indicatorState[key]});
}));
document.querySelectorAll('[data-chart-type]').forEach(b=>b.addEventListener('click',()=>{chartType=b.dataset.chartType;document.querySelectorAll('[data-chart-type]').forEach(x=>{let on=x===b;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on))});if(chartData.length)draw(chartData.map(c=>[c.t,c.o,c.h,c.l,c.c,c.v]))}));
document.querySelectorAll('[data-interval]').forEach(b=>b.addEventListener('click',()=>{
 interval=b.dataset.interval;chartNeedsFit=true;
 document.querySelectorAll('[data-interval]').forEach(x=>x.classList.toggle('selected',x===b));
 refresh();
}));
const configs={defensiv:{name:'DEFENSIV',partial:.5,target:2,atr:3.5,desc:'50 % Teilverkauf bei +2R · Rest mit ATR-Trailing-Stop.'},balance:{name:'BALANCE',partial:.75,target:2,atr:3.5,desc:'75 % Teilverkauf bei +2R · 25 % bleiben für große SOL-Bewegungen offen.'},trend:{name:'100 % TREND',partial:0,target:0,atr:4,desc:'Kein Teilverkauf · gesamte Position mit 4,0 ATR absichern.'}};
document.querySelectorAll('[data-strategy]').forEach(b=>b.addEventListener('click',()=>{selected=b.dataset.strategy;document.querySelectorAll('[data-strategy]').forEach(x=>x.classList.toggle('selected',x===b));$('strategy-description').textContent=configs[selected].desc;if(window.btResults)showResult(window.btResults[selected])}));
function runOne(cs,cfg){let equity=1,peak=1,maxdd=0,trades=[],cl=cs.map(x=>x.c),entries=[];let e200=cs.map((_,i)=>ema(cl.slice(0,i+1),200));for(let i=205;i<cs.length-1;i++){if(!(cs[i].c>e200[i]&&e200[i]>e200[i-20]))continue;let entry=cs[i+1].o,a=atr(cs.slice(0,i+1)),risk=a*cfg.atr;if(!a||risk<=0)continue;let stop=entry-risk,trail=stop,target=entry+2*risk,partialDone=false,remaining=1,profit=0,exit=entry,exitIndex=i+1;for(let j=i+1;j<cs.length;j++){let bar=cs[j];if(bar.l<=trail){exit=trail;exitIndex=j;profit+=remaining*(exit-entry)/entry;remaining=0;break}if(cfg.partial>0&&!partialDone&&bar.h>=target){profit+=cfg.partial*(target-entry)/entry;remaining-=cfg.partial;partialDone=true}if(bar.c>entry+risk){let next=bar.c-cfg.atr*a;trail=Math.max(trail,next)}if(bar.c<ema(cl.slice(0,j+1),50)){exit=bar.c;exitIndex=j;profit+=remaining*(exit-entry)/entry;remaining=0;break}if(j===cs.length-1){exit=bar.c;exitIndex=j;profit+=remaining*(exit-entry)/entry;remaining=0}}/* Gebühren und Slippage werden für die Strategiebewertung bewusst nicht abgezogen. */equity*=1+profit;peak=Math.max(peak,equity);maxdd=Math.max(maxdd,(peak-equity)/peak);trades.push({entryDate:new Date(cs[i+1].t).toLocaleDateString('de-DE'),exitDate:new Date(cs[exitIndex].t).toLocaleDateString('de-DE'),ret:profit*100});i=exitIndex-1}return {ret:(equity-1)*100,dd:maxdd*100,trades}}
function showResult(r){$('bt-return').textContent=pct(r.ret);$('bt-dd').textContent='-'+r.dd.toFixed(2).replace('.',',')+' %';$('bt-count').textContent=r.trades.length;$('bt-winrate').textContent=r.trades.length?(100*r.trades.filter(t=>t.ret>0).length/r.trades.length).toFixed(1).replace('.',',')+' %':'—';$('bt-best').textContent=r.trades.length?pct(Math.max(...r.trades.map(t=>t.ret))):'—';$('bt-worst').textContent=r.trades.length?pct(Math.min(...r.trades.map(t=>t.ret))):'—';$('bt-trades').innerHTML=r.trades.slice(-12).reverse().map(t=>'<div class="bt-trade"><span>'+t.entryDate+' → '+t.exitDate+'</span><b class="'+(t.ret>=0?'positive':'negative')+'">'+pct(t.ret)+'</b><small>Geschlossener Trade</small></div>').join('')||'Keine Trades unter diesen Bedingungen.'}
$('run-backtest').addEventListener('click',async()=>{let btn=$('run-backtest');btn.disabled=true;$('bt-status').textContent='Lade historische SOL-Tagesdaten und simuliere…';try{let raw=await api('/klines?symbol=SOLUSDT&interval=1d&limit=1000'),cs=candles(raw);let results={};Object.keys(configs).forEach(k=>results[k]=runOne(cs,configs[k]));window.btResults=results;window.btRun=true;showResult(results[selected]);$('bt-comparison').innerHTML=Object.entries(results).map(([k,r])=>'<tr><td>'+configs[k].name+'</td><td>'+pct(r.ret)+'</td><td>-'+r.dd.toFixed(2)+' %</td><td>'+r.trades.length+'</td></tr>').join('');$('bt-status').textContent='Test abgeschlossen · '+new Date(cs[0].t).toLocaleDateString('de-DE')+' bis '+new Date(cs.at(-1).t).toLocaleDateString('de-DE')+'. Modellannahmen siehe Hinweis.'}catch(e){$('bt-status').textContent='Backtest fehlgeschlagen: '+e.message}finally{btn.disabled=false}});
refresh();setInterval(refresh,60000);