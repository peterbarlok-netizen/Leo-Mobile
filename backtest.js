/* LEO Backtest v1 — daily, close-confirmed signals; next-open entries; no look-ahead. */
(()=> {
'use strict';
const API='https://data-api.binance.vision/api/v3';
const ASSETS=['BTCUSDT','SOLUSDT','LINKUSDT','SUIUSDT'];
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n);
const pct=n=>(n>=0?'+':'')+n.toFixed(2).replace('.',',')+' %';
const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
async function get(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return r.json()}
function ema(a,p){if(a.length<p)return null;let v=mean(a.slice(0,p)),k=2/(p+1);for(let i=p;i<a.length;i++)v=a[i]*k+v*(1-k);return v}
function emaAt(a,p,end){return ema(a.slice(0,end+1),p)}
function rsi(a,p=14){if(a.length<=p)return null;let g=0,l=0;for(let i=1;i<=p;i++){let d=a[i]-a[i-1];g+=Math.max(d,0);l+=Math.max(-d,0)}g/=p;l/=p;for(let i=p+1;i<a.length;i++){let d=a[i]-a[i-1];g=(g*(p-1)+Math.max(d,0))/p;l=(l*(p-1)+Math.max(-d,0))/p}return l===0?(g===0?50:100):100-100/(1+g/l)}
function atrPct(c,i,p=14){if(i<p)return null;let tr=[];for(let j=i-p+1;j<=i;j++){let h=+c[j][2],l=+c[j][3],pc=+c[j-1][4];tr.push(Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)))}return mean(tr)/Number(c[i][4])*100}
function pivots(c,end){let a=[];for(let i=2;i<end-1;i++){let v=+c[i][3];if(v<+c[i-1][3]&&v<+c[i-2][3]&&v<+c[i+1][3]&&v<+c[i+2][3])a.push({i,v})}return a}
function fngAt(map,ts){let day=Math.floor(ts/86400000);return map.get(day)??null}
function buildFng(rows){let m=new Map();for(const x of rows||[]){let day=Math.floor(Number(x.timestamp)/86400);m.set(day,Number(x.value))}return m}
function evaluate(symbol,c,i,btc,weekly,fngMap){
 const closes=c.slice(0,i+1).map(x=>+x[4]),vol=c.slice(0,i+1).map(x=>+x[5]),price=closes.at(-1);
 if(i<220)return null;
 const e20=ema(closes,20),e50=ema(closes,50),e200=ema(closes,200),old200=emaAt(closes,200,closes.length-21);
 const week=weekly.filter(w=>Number(w[6])<=Number(c[i][6]));
 const wc=week.map(w=>+w[4]),we50=ema(wc,50),weekClose=wc.at(-1);
 const ps=pivots(c,i+1),last=ps.at(-1),prev=ps.at(-2);
 const bIndex=btc.findIndex(x=>Number(x[0])===Number(c[i][0]));
 const btcEnd=bIndex>=0?btc.slice(0,bIndex+1).map(x=>+x[4]):[];
 const assetRet=closes.length>=21?price/closes.at(-21)-1:null,btcRet=btcEnd.length>=21?btcEnd.at(-1)/btcEnd.at(-21)-1:null;
 const avgVol=mean(vol.slice(-21,-1));
 const resistance=Math.max(...c.slice(Math.max(0,i-60),i).map(x=>+x[2]));
 const pivotFresh=last&&prev&&i-last.i<=20&&i-prev.i<=45&&last.v>prev.v;
 const stop=last&&i-last.i<=20?last.v:Math.min(...c.slice(i-20,i).map(x=>+x[3]));
 const risk=price-stop,reward=resistance-price,rr=risk>0&&reward>0?reward/risk:null;
 const near=e20&&e50&&Math.min(Math.abs(price-e20)/e20,Math.abs(price-e50)/e50)<=.025&&price>=e50;
 const breakout=price>Math.max(...c.slice(i-3,i).map(x=>+x[2]));
 const fng=fngAt(fngMap,Number(c[i][0]));
 const atr=atrPct(c,i);
 const checks=[
  price>e200,e20>e50,e200>old200,weekClose>we50,
  !!pivotFresh,(rsi(closes)>=42&&rsi(closes)<=65),
  symbol==='BTCUSDT'||(assetRet!==null&&btcRet!==null&&assetRet>btcRet),
  +c[i][5]>avgVol,!!near,breakout,rr!==null&&rr>=2,
  fng!==null&&fng>=25&&fng<=75,
  atr!==null&&atr>=1.5&&atr<=8
 ];
 return {checks,stop,target:resistance,rr,fng,atr,ema20:e20};
}
function simulate(symbol,c,btc,weekly,fngMap,capital){
 const trades=[];let cash=capital,position=null,equity=[capital],diagnostics=Array(13).fill(0),samples=0;
 for(let i=220;i<c.length-1;i++){
  const bar=c[i],open=+bar[1],high=+bar[2],low=+bar[3],close=+bar[4];
  const sig=evaluate(symbol,c,i,btc,weekly,fngMap);
  if(sig){samples++;sig.checks.forEach((v,j)=>{if(v)diagnostics[j]++})}
  if(position){
   let exit=null,reason='';
   // Conservative same-candle rule: if both touched, assume stop first.
   if(low<=position.stop){exit=Math.min(open,position.stop);reason='STOP'}
   else if(high>=position.target){exit=Math.max(open,position.target);reason='KURSZIEL'}
   else if(close<position.ema20){exit=close;reason='EMA20-Ausstieg'}
   if(exit!==null){
    const exitFill=exit*(1-0.0005),gross=position.qty*(exitFill-position.entryFill),fee=position.qty*exitFill*.001;
    const net=gross-position.entryFee-fee;cash+=position.stake+net;
    trades.push({symbol,buyTime:position.time,sellTime:new Date(Number(bar[6])).toISOString().slice(0,10),entry:position.entry,exit,net,returnPct:net/position.stake*100,reason,rr:position.rr});
    position=null;
   }
  }
  if(!position){
   if(sig&&sig.checks.every(Boolean)){
    const next= c[i+1],rawEntry=+next[1],entryFill=rawEntry*(1+0.0005);
    const entryRisk=rawEntry-sig.stop,entryReward=sig.target-rawEntry;
    if(entryRisk>0&&entryReward>=2*entryRisk){
     const stake=cash,qty=stake/(entryFill*(1+.001));
     position={stake,qty,entry:rawEntry,entryFill,entryFee:stake-qty*entryFill,stop:sig.stop,target:sig.target,ema20:sig.ema20,rr:sig.rr,time:new Date(Number(next[0])).toISOString().slice(0,10)};
     cash-=stake;
    }
   }
  }
  const mark=position?cash+position.qty*(close*(1-.0015)):cash;
  equity.push(mark);
 }
 if(position){
  const last=c.at(-1),exit=+last[4],exitFill=exit*(1-.0005),gross=position.qty*(exitFill-position.entryFill),fee=position.qty*exitFill*.001,net=gross-position.entryFee-fee;
  cash+=position.stake+net;trades.push({symbol,buyTime:position.time,sellTime:new Date(Number(last[6])).toISOString().slice(0,10),entry:position.entry,exit,net,returnPct:net/position.stake*100,reason:'DATENENDE',rr:position.rr});
 }
 const wins=trades.filter(t=>t.net>0).length,profit=cash-capital;
 let peak=capital,maxDD=0;for(const e of equity){peak=Math.max(peak,e);maxDD=Math.max(maxDD,(peak-e)/peak*100)}
 return {symbol,capital,end:cash,profit,returnPct:profit/capital*100,trades,wins,winRate:trades.length?wins/trades.length*100:0,maxDD,diagnostics,samples};
}

function evaluateVariant(id,symbol,c,i,btc,weekly,fngMap){
 const base=evaluate(symbol,c,i,btc,weekly,fngMap);
 if(!base)return null;
 const x=base.checks;
 const btcIndex=btc.findIndex(v=>Number(v[0])===Number(c[i][0]));
 const btcCloses=btcIndex>=0?btc.slice(0,btcIndex+1).map(v=>+v[4]):[];
 const btcEma=ema(btcCloses,200);
 const btcRegime=btcEma!==null&&btcCloses.at(-1)>btcEma;
 let pass=false;
 if(id==='A') pass=x.every(Boolean);
 if(id==='B'){
  const core=x[0]&&x[1]&&x[4]&&x[5]&&x[7];
  const entry=x[8]||x[9];
  pass=!!(core&&entry&&base.rr!==null&&base.rr>=1.5);
 }
 if(id==='C'){
  const core=x[0]&&x[1]&&x[2]&&x[3]&&x[4]&&x[5]&&x[7];
  pass=!!(core&&(btcRegime||symbol==='BTCUSDT')&&base.rr!==null&&base.rr>=1.8);
 }
 return {...base,pass,btcRegime};
}
function simulateVariant(id,symbol,c,btc,weekly,fngMap,capital,trailMult){
 let cash=capital,position=null,trades=[],equity=[capital],samples=0,signals=0,peak=capital,maxDD=0;
 for(let i=220;i<c.length-1;i++){
  const bar=c[i],open=+bar[1],high=+bar[2],low=+bar[3],close=+bar[4];
  const sig=evaluateVariant(id,symbol,c,i,btc,weekly,fngMap);
  if(sig){samples++;if(sig.pass)signals++}
  if(position){
   const atr=atrPct(c,i,14);const atrAbs=atr?close*atr/100:null;
   if(atrAbs){
    position.highWater=Math.max(position.highWater,high);
    if(position.highWater>=position.entry+position.initialRisk){
     position.trailing=true;
     const candidate=position.highWater-trailMult*atrAbs;
     position.stop=Math.max(position.stop,candidate);
    }
   }
   let exit=null,reason='';
   if(low<=position.stop){exit=Math.min(open,position.stop);reason=position.trailing?'TRAILING-STOP':'INITIAL-STOP'}
   else if(high>=position.target){exit=Math.max(open,position.target);reason='KURSZIEL'}
   else if(id!=='A'&&close<position.ema20&&close<position.entry){exit=close;reason='MOMENTUM-VERLUST'}
   if(exit!==null){
    const fill=exit*(1-.0005),gross=position.qty*(fill-position.entryFill),fee=position.qty*fill*.001;
    const net=gross-position.entryFee-fee;cash+=position.stake+net;
    trades.push({symbol,buyTime:position.time,sellTime:new Date(Number(bar[6])).toISOString().slice(0,10),entry:position.entry,exit,net,returnPct:net/position.stake*100,reason,rr:position.rr});
    position=null;
   }
  }
  if(!position&&sig&&sig.pass){
   const next=c[i+1],raw=+next[1],entryFill=raw*(1+.0005);
   const stop=sig.stop, risk=raw-stop, reward=sig.target-raw;
   if(risk>0&&reward>= (id==='B'?1.5:1.8)*risk){
    const stake=cash,qty=stake/(entryFill*1.001);
    position={stake,qty,entry:raw,entryFill,entryFee:stake-qty*entryFill,stop,target:sig.target,ema20:sig.ema20,rr:sig.rr,time:new Date(Number(next[0])).toISOString().slice(0,10),trailing:false,initialRisk:risk,highWater:raw};
    cash-=stake;
   }
  }
  const mark=position?cash+position.qty*close*(1-.0015):cash;
  equity.push(mark);peak=Math.max(peak,mark);maxDD=Math.max(maxDD,(peak-mark)/peak*100);
 }
 if(position){
  const last=c.at(-1),exit=+last[4],fill=exit*(1-.0005),gross=position.qty*(fill-position.entryFill),fee=position.qty*fill*.001,net=gross-position.entryFee-fee;
  cash+=position.stake+net;trades.push({symbol,buyTime:position.time,sellTime:new Date(Number(last[0])).toISOString().slice(0,10),entry:position.entry,exit,net,returnPct:net/position.stake*100,reason:'DATENENDE',rr:position.rr});
 }
 const wins=trades.filter(t=>t.net>0).length,losses=trades.filter(t=>t.net<0),grossWin=trades.filter(t=>t.net>0).reduce((s,t)=>s+t.net,0),grossLoss=Math.abs(losses.reduce((s,t)=>s+t.net,0));
 return {id,symbol,capital,end:cash,profit:cash-capital,returnPct:(cash/capital-1)*100,trades,wins,winRate:trades.length?wins/trades.length*100:0,maxDD,signals,samples,profitFactor:grossLoss?grossWin/grossLoss:(grossWin?Infinity:0)};
}
function renderComparison(results,period){
 const ids=['A','B','C'],names={A:'A · Precision bisher',B:'B · Coin First',C:'C · Hybrid'};
 const rows=ids.map(id=>{const a=results.filter(r=>r.id===id),start=a.reduce((s,r)=>s+r.capital,0),end=a.reduce((s,r)=>s+r.end,0),tr=a.flatMap(r=>r.trades),wins=tr.filter(t=>t.net>0).length,pfGross=tr.filter(t=>t.net>0).reduce((s,t)=>s+t.net,0),pfLoss=Math.abs(tr.filter(t=>t.net<0).reduce((s,t)=>s+t.net,0)),dd=Math.max(0,...a.map(r=>r.maxDD));return {id,name:names[id],start,end,profit:end-start,pct:(end/start-1)*100,trades:tr.length,win:tr.length?wins/tr.length*100:0,pf:pfLoss?pfGross/pfLoss:(pfGross?Infinity:0),dd,signals:a.reduce((s,r)=>s+r.signals,0)}});
 $('bt-summary').innerHTML=rows.map(r=>'<div class="bt-metric"><small>'+r.name+'</small><b class="'+(r.profit>=0?'up':'down')+'">'+money(r.profit)+' · '+pct(r.pct)+'</b><small>'+r.trades+' Trades · Treffer '+r.win.toFixed(1)+' % · PF '+(Number.isFinite(r.pf)?r.pf.toFixed(2):'∞')+' · DD '+pct(-r.dd)+'</small></div>').join('');
 $('bt-assets').innerHTML=ids.map(id=>'<h3>'+names[id]+'</h3>'+results.filter(r=>r.id===id).map(r=>'<div class="bt-row"><b>'+r.symbol.replace('USDT','')+'</b><span>'+r.trades.length+' Trades</span><strong class="'+(r.profit>=0?'up':'down')+'">'+money(r.profit)+'</strong><small>Treffer '+pct(r.winRate)+' · PF '+(Number.isFinite(r.profitFactor)?r.profitFactor.toFixed(2):'∞')+' · Max. DD '+pct(-r.maxDD)+' · Signale '+r.signals+'</small></div>').join('')).join('');
 const all=results.flatMap(r=>r.trades.map(t=>({...t,strategy:names[r.id]}))).sort((a,b)=>b.buyTime.localeCompare(a.buyTime));
 $('bt-trades').innerHTML=all.slice(0,40).map(t=>'<div class="bt-trade"><b>'+t.strategy+' · '+t.symbol.replace('USDT','')+'</b><span>'+t.buyTime+' → '+t.sellTime+'</span><strong class="'+(t.net>=0?'up':'down')+'">'+money(t.net)+'</strong><small>'+t.reason+' · '+pct(t.returnPct)+'</small></div>').join('')||'<p>Keine Trades nach diesen Regeln.</p>';
 const periodNode=$('bt-period');if(periodNode)periodNode.textContent=period+' · Tageskerzen · 0,10 % Gebühren + 0,05 % Slippage je Seite · Vergleichskonten je Variante separat';
}
function render(results,period){
 const totalStart=results.reduce((s,r)=>s+r.capital,0),totalEnd=results.reduce((s,r)=>s+r.end,0),trades=results.flatMap(r=>r.trades).sort((a,b)=>a.buyTime.localeCompare(b.buyTime));
 const wins=trades.filter(t=>t.net>0).length;
 $('bt-summary').innerHTML='<div class="bt-metric"><small>ENDKAPITAL</small><b>'+money(totalEnd)+'</b></div><div class="bt-metric"><small>NETTO-ERGEBNIS</small><b class="'+(totalEnd>=totalStart?'up':'down')+'">'+money(totalEnd-totalStart)+' ('+pct((totalEnd/totalStart-1)*100)+')</b></div><div class="bt-metric"><small>TRADES / TREFFERQUOTE</small><b>'+trades.length+' / '+(trades.length?Math.round(wins/trades.length*100):0)+' %</b></div>';
 $('bt-assets').innerHTML=results.map(r=>'<div class="bt-row"><b>'+r.symbol.replace('USDT','')+'</b><span>'+r.trades.length+' Trades</span><strong class="'+(r.profit>=0?'up':'down')+'">'+money(r.profit)+'</strong><small>Treffer '+pct(r.winRate)+' · Max. DD '+pct(-r.maxDD)+'</small></div>').join('');

 const diag=results.reduce((acc,r)=>{r.diagnostics.forEach((n,i)=>acc[i]=(acc[i]||0)+n);return acc},[]),sampleCount=results.reduce((n,r)=>n+r.samples,0);
 $('bt-diagnostics').innerHTML=["Kurs über EMA 200","EMA 20 über EMA 50","EMA 200 steigend","Wochenfilter","Höhere Pivot-Tiefs","RSI 42–65","Relative Stärke vs. BTC","Volumen über Schnitt","Pullback zur EMA","3-Tage-Ausbruch","CRV mindestens 2:1","Fear & Greed 25–75","ATR 1,5–8 %"].map((label,i)=>'<div class="bt-diag"><span>'+label+'</span><b>'+diag[i]+' / '+sampleCount+'</b><small>'+(sampleCount?(diag[i]/sampleCount*100).toFixed(1).replace('.',','):'0')+' % der Prüftage</small></div>').join('');
 $('bt-trades').innerHTML=trades.slice(-30).reverse().map(t=>'<div class="bt-trade"><b>'+t.symbol.replace('USDT','')+'</b><span>'+t.buyTime+' → '+t.sellTime+'</span><strong class="'+(t.net>=0?'up':'down')+'">'+money(t.net)+'</strong><small>'+t.reason+' · '+pct(t.returnPct)+' · CRV '+t.rr.toFixed(2)+':1</small></div>').join('')||'<p>Noch keine Trades nach diesen Regeln.</p>';
 const periodNode=$('bt-period');if(periodNode)periodNode.textContent=period+' · Tageskerzen · 0,10 % Gebühren + 0,05 % Slippage je Seite';
}
async function run(){
 const button=$('bt-run'),status=$('bt-status');button.disabled=true;button.textContent='LÄDT…';status.textContent='Gemeinsame historische Daten werden geladen; danach laufen A, B und C parallel.';
 try{
  const [fngData,...market]=await Promise.all([
   get('https://api.alternative.me/fng/?limit=0&format=json'),
   ...ASSETS.map(async s=>Promise.all([get(API+'/klines?symbol='+s+'&interval=1d&limit=1000'),get(API+'/klines?symbol='+s+'&interval=1w&limit=500')])),
  ]);
  const fngMap=buildFng(fngData.data);if(!fngMap.size)throw Error('Historische Fear-&-Greed-Daten fehlen.');
  const btc=market[0][0].slice(0,-1),capital=1500/ASSETS.length;
  const results=[];
  for(const id of ['A','B','C']){
   const batch=market.map((pair,i)=>simulateVariant(id,ASSETS[i],pair[0].slice(0,-1),btc,pair[1].slice(0,-1),fngMap,capital,2));
   results.push(...batch);
  }
  const dates=market.flatMap(p=>p[0].slice(0,-1).map(x=>Number(x[0]))),period=new Date(Math.min(...dates)).toLocaleDateString('de-DE')+' – '+new Date(Math.max(...dates)).toLocaleDateString('de-DE');
  renderComparison(results,period);
  status.textContent='Vergleich abgeschlossen: drei Varianten auf identischen Daten. A = bisherige Filter, B = Coin First, C = Hybrid. Alle Ergebnisse sind Simulationen, keine Prognosen.';
 }catch(e){status.textContent='Backtest nicht möglich: '+e.message;console.error('LEO backtest',e)}
 finally{button.disabled=false;button.textContent='STRATEGIEN VERGLEICHEN'}
}
const panel=$('backtest-panel');
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));
 if(b.dataset.tab==='Backtest'){panel.hidden=false;panel.scrollIntoView({behavior:'smooth',block:'start'})}
 else if(b.dataset.tab==='Übersicht'){panel.hidden=true;window.scrollTo({top:0,behavior:'smooth'})}
}));
$('bt-run').addEventListener('click',run);
})();