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
function evaluate(c,i,btc,weekly,fngMap){
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
  assetRet!==null&&btcRet!==null&&assetRet>btcRet,
  +c[i][5]>avgVol,!!near,breakout,rr!==null&&rr>=2,
  fng!==null&&fng>=25&&fng<=75,
  atr!==null&&atr>=1.5&&atr<=8
 ];
 return {checks,stop,target:resistance,rr,fng,atr,ema20:e20};
}
function simulate(symbol,c,btc,weekly,fngMap,capital){
 const trades=[];let cash=capital,position=null,equity=[capital];
 for(let i=220;i<c.length-1;i++){
  const bar=c[i],open=+bar[1],high=+bar[2],low=+bar[3],close=+bar[4];
  if(position){
   let exit=null,reason='';
   // Conservative same-candle rule: if both touched, assume stop first.
   if(low<=position.stop){exit=Math.min(open,position.stop);reason='STOP'}
   else if(high>=position.target){exit=Math.max(open,position.target);reason='KURSZIEL'}
   else if(close<position.ema20){exit=close;reason='EMA20-Ausstieg'}
   if(exit!==null){
    const exitFill=exit*(1-0.0005),gross=position.qty*(exitFill-position.entryFill),fee=position.qty*exitFill*.001;
    const net=gross-fee;cash+=position.stake+net;
    trades.push({symbol,buyTime:position.time,sellTime:new Date(Number(bar[6])).toISOString().slice(0,10),entry:position.entry,exit,net,returnPct:net/position.stake*100,reason,rr:position.rr});
    position=null;
   }
  }
  if(!position){
   const sig=evaluate(c,i,btc,weekly,fngMap);
   if(sig&&sig.checks.every(Boolean)){
    const next= c[i+1],rawEntry=+next[1],entryFill=rawEntry*(1+0.0005);
    const entryRisk=rawEntry-sig.stop,entryReward=sig.target-rawEntry;
    if(entryRisk>0&&entryReward>=2*entryRisk){
     const stake=cash,qty=stake/(entryFill*(1+.001));
     position={stake,qty,entry:rawEntry,entryFill,stop:sig.stop,target:sig.target,ema20:sig.ema20,rr:sig.rr,time:new Date(Number(next[0])).toISOString().slice(0,10)};
     cash-=stake;
    }
   }
  }
  const mark=position?cash+position.qty*(close*(1-.0005)):cash;
  equity.push(mark);
 }
 if(position){
  const last=c.at(-1),exit=+last[4],exitFill=exit*(1-.0005),gross=position.qty*(exitFill-position.entryFill),fee=position.qty*exitFill*.001,net=gross-fee;
  cash+=position.stake+net;trades.push({symbol,buyTime:position.time,sellTime:new Date(Number(last[6])).toISOString().slice(0,10),entry:position.entry,exit,net,returnPct:net/position.stake*100,reason:'DATENENDE',rr:position.rr});
 }
 const wins=trades.filter(t=>t.net>0).length,profit=cash-capital;
 let peak=capital,maxDD=0;for(const e of equity){peak=Math.max(peak,e);maxDD=Math.max(maxDD,(peak-e)/peak*100)}
 return {symbol,capital,end:cash,profit,returnPct:profit/capital*100,trades,wins,winRate:trades.length?wins/trades.length*100:0,maxDD};
}
function render(results,period){
 const totalStart=results.reduce((s,r)=>s+r.capital,0),totalEnd=results.reduce((s,r)=>s+r.end,0),trades=results.flatMap(r=>r.trades).sort((a,b)=>a.buyTime.localeCompare(b.buyTime));
 const wins=trades.filter(t=>t.net>0).length;
 $('bt-summary').innerHTML='<div class="bt-metric"><small>ENDKAPITAL</small><b>'+money(totalEnd)+'</b></div><div class="bt-metric"><small>NETTO-ERGEBNIS</small><b class="'+(totalEnd>=totalStart?'up':'down')+'">'+money(totalEnd-totalStart)+' ('+pct((totalEnd/totalStart-1)*100)+')</b></div><div class="bt-metric"><small>TRADES / TREFFERQUOTE</small><b>'+trades.length+' / '+(trades.length?Math.round(wins/trades.length*100):0)+' %</b></div>';
 $('bt-assets').innerHTML=results.map(r=>'<div class="bt-row"><b>'+r.symbol.replace('USDT','')+'</b><span>'+r.trades.length+' Trades</span><strong class="'+(r.profit>=0?'up':'down')+'">'+money(r.profit)+'</strong><small>Treffer '+pct(r.winRate)+' · Max. DD '+pct(-r.maxDD)+'</small></div>').join('');
 $('bt-trades').innerHTML=trades.slice(-30).reverse().map(t=>'<div class="bt-trade"><b>'+t.symbol.replace('USDT','')+'</b><span>'+t.buyTime+' → '+t.sellTime+'</span><strong class="'+(t.net>=0?'up':'down')+'">'+money(t.net)+'</strong><small>'+t.reason+' · '+pct(t.returnPct)+' · CRV '+t.rr.toFixed(2)+':1</small></div>').join('')||'<p>Noch keine Trades nach diesen Regeln.</p>';
 $('bt-period').textContent=period+' · Tageskerzen · 0,10 % Gebühren + 0,05 % Slippage je Seite';
}
async function run(){
 const button=$('bt-run'),status=$('bt-status');button.disabled=true;button.textContent='LÄDT…';status.textContent='Historische Daten werden geladen und chronologisch geprüft.';
 try{
  const [fngData,...market]=await Promise.all([
   get('https://api.alternative.me/fng/?limit=0&format=json'),
   ...ASSETS.map(async s=>Promise.all([get(API+'/klines?symbol='+s+'&interval=1d&limit=1000'),get(API+'/klines?symbol='+s+'&interval=1w&limit=500')])),
  ]);
  const fngMap=buildFng(fngData.data);
  if(!fngMap.size)throw Error('Historische Fear-&-Greed-Daten fehlen; Sentimentfilter nicht testbar.');
  const btc=market[0][0],results=market.map((pair,i)=>simulate(ASSETS[i],pair[0].slice(0,-1),btc, pair[1].slice(0,-1),fngMap,1500/ASSETS.length));
  const dates=market.flatMap(p=>p[0].slice(0,-1).map(x=>Number(x[0]))),period=new Date(Math.max(...dates)).toLocaleDateString('de-DE')+' · ab '+new Date(Math.min(...dates)).toLocaleDateString('de-DE');
  render(results,period);status.textContent='Backtest abgeschlossen. Nur abgeschlossene Tageskerzen; Einstieg am Folgetag zum Open.';
 }catch(e){status.textContent='Backtest nicht möglich: '+e.message;console.error('LEO backtest',e)}
 finally{button.disabled=false;button.textContent='BACKTEST STARTEN'}
}
const panel=$('backtest-panel');
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{
 document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));
 if(b.dataset.tab==='Backtest'){panel.hidden=false;panel.scrollIntoView({behavior:'smooth',block:'start'})}
 else if(b.dataset.tab==='Übersicht'){panel.hidden=true;window.scrollTo({top:0,behavior:'smooth'})}
}));
$('bt-run').addEventListener('click',run);
})();