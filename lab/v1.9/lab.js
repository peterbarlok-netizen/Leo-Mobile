(()=>{'use strict';
const API='https://data-api.binance.vision/api/v3',NAMES={A:'A · Trend-Pullback',B:'B · Breakout',C:'C · SOL-Trend+',D:'D · SOL-Hybrid'};
let latestResults=[],latestExperimentSummaries=[],latestTimeframeRuns=[],latestReportTrades=[];const $=id=>document.getElementById(id),fmt=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n),pct=n=>(n>=0?'+':'')+n.toFixed(2).replace('.',',')+' %',mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const FEE_RATE=0.001,SLIPPAGE_RATE=0.0005;
async function get(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Datenquelle antwortet mit HTTP '+r.status);return r.json()}
async function getKlines(symbol,interval,limit=3000){let out=[],endTime=Date.now();while(out.length<limit){const n=Math.min(1000,limit-out.length),q=API+'/klines?symbol='+symbol+'&interval='+interval+'&limit='+n+'&endTime='+endTime,batch=await get(q);if(!batch.length)break;out=[...batch,...out];endTime=Number(batch[0][0])-1;if(batch.length<n)break}return out.slice(-limit)}
function ema(a,p){if(a.length<p)return null;let v=mean(a.slice(0,p)),k=2/(p+1);for(let i=p;i<a.length;i++)v=a[i]*k+v*(1-k);return v}
function emaAt(a,p,end){return ema(a.slice(0,end+1),p)}
function rsi(a,p=14){if(a.length<=p)return null;let g=0,l=0;for(let i=1;i<=p;i++){let d=a[i]-a[i-1];g+=Math.max(d,0);l+=Math.max(-d,0)}g/=p;l/=p;for(let i=p+1;i<a.length;i++){let d=a[i]-a[i-1];g=(g*(p-1)+Math.max(d,0))/p;l=(l*(p-1)+Math.max(-d,0))/p}return l===0?(g===0?50:100):100-100/(1+g/l)}
function atr(c,i,p=14){if(i<p)return null;let a=[];for(let j=i-p+1;j<=i;j++){let h=+c[j][2],l=+c[j][3],pc=+c[j-1][4];a.push(Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)))}return mean(a)}
function pivots(c,end){let a=[];for(let i=2;i<end-2;i++){let v=+c[i][3];if(v<+c[i-1][3]&&v<+c[i-2][3]&&v<+c[i+1][3]&&v<+c[i+2][3])a.push({i,v})}return a}
const indicatorCache=new WeakMap();
function buildIndicators(c){
 const n=c.length,close=c.map(x=>+x[4]),e20=Array(n).fill(null),e50=Array(n).fill(null),e200=Array(n).fill(null),rsiV=Array(n).fill(null),atrV=Array(n).fill(null),volR=Array(n).fill(null),old200=Array(n).fill(null),priorHigh=Array(n).fill(null),priorHigh10=Array(n).fill(null),recentLow=Array(n).fill(null);
 const makeEma=(p,out)=>{if(n<p)return;let v=mean(close.slice(0,p));out[p-1]=v;const k=2/(p+1);for(let i=p;i<n;i++){v=close[i]*k+v*(1-k);out[i]=v;}};
 makeEma(20,e20);makeEma(50,e50);makeEma(200,e200);
 let gain=0,loss=0,ag=0,al=0;
 for(let i=1;i<n;i++){const d=close[i]-close[i-1];if(i<=14){gain+=Math.max(d,0);loss+=Math.max(-d,0);if(i===14){ag=gain/14;al=loss/14;}}else{ag=(ag*13+Math.max(d,0))/14;al=(al*13+Math.max(-d,0))/14;}if(i>=14)rsiV[i]=al===0?(ag===0?50:100):100-100/(1+ag/al);}
 const tr=[];for(let i=0;i<n;i++){const prev=i?close[i-1]:close[i];tr.push(Math.max(+c[i][2]-+c[i][3],Math.abs(+c[i][2]-prev),Math.abs(+c[i][3]-prev)));if(i>=14)atrV[i]=mean(tr.slice(i-13,i+1));if(i>=20){const avg=mean(c.slice(i-20,i).map(x=>+x[5]));volR[i]=avg>0?+c[i][5]/avg:null;priorHigh[i]=Math.max(...c.slice(i-20,i).map(x=>+x[2]));priorHigh10[i]=Math.max(...c.slice(i-10,i).map(x=>+x[2]));recentLow[i]=Math.min(...c.slice(i-10,i).map(x=>+x[3]));}if(i>=220)old200[i]=e200[i-20];}
 const data={close,e20,e50,e200,rsiV,atrV,volR,old200,priorHigh,priorHigh10,recentLow};indicatorCache.set(c,data);return data;
}
function evaluate(symbol,c,i){
 if(i<220)return null;const d=indicatorCache.get(c)||buildIndicators(c),price=d.close[i],e20=d.e20[i],e50=d.e50[i],e200=d.e200[i],ap=d.atrV[i];
 const momentum3=price/d.close[i-3]-1,momentum5=price/d.close[i-5]-1,volumeRatio=d.volR[i],recentLow=d.recentLow[i];
 const pullback=price>=e50&&price>=e20*.97&&price<=e20*1.025,breakout=price>d.priorHigh[i],trend=price>e200&&e20>e50&&e200>d.old200[i];
 const stop=Math.min(recentLow,price-(ap||price*.02)*1.2);
 return {symbol,price,ema20:e20,ema50:e50,ema200:e200,rsi:d.rsiV[i],atr:ap,volumeRatio,momentum3,momentum5,priorHigh10:d.priorHigh10[i],trend,pullback,breakout,stop};
}
function signal(id,s,variant={}){
 if(!s)return false;
 const rsiMin=variant.rsiMin===undefined?45:variant.rsiMin,rsiMax=variant.rsiMax===undefined?66:variant.rsiMax;
 const pull=s.trend&&s.pullback&&s.rsi>=rsiMin&&s.rsi<=rsiMax;
 const volumeOK=s.volumeRatio>=(variant.volumeMin===undefined?1.15:variant.volumeMin);
 const breakout=s.breakout&&s.price>s.ema200&&s.rsi>=50&&s.rsi<=74&&volumeOK;
 if(id==='A')return variant.entry==='breakout'?breakout:pull;
 if(id==='B')return variant.entry==='pullback'?pull:breakout;
 if(id==='C')return pull&&s.ema50>s.ema200;
 if(id==='D'){
  if(variant.entry==='pullback')return pull;
  if(variant.entry==='breakout')return breakout;
  return s.trend&&((s.pullback&&s.rsi>=rsiMin&&s.rsi<=rsiMax)||breakout);
 }
 if(id==='E'){
  const eMin=variant.rsiMin===undefined?52:variant.rsiMin,eMax=variant.rsiMax===undefined?70:variant.rsiMax;
  const vol=s.volumeRatio>=(variant.volumeMin===undefined?1.05:variant.volumeMin);
  if(variant.entry==='pullback')return s.trend&&s.pullback&&s.momentum3>0&&s.rsi>=eMin&&s.rsi<=eMax&&vol;
  return s.trend&&s.price>s.ema20&&s.price>s.priorHigh10&&s.momentum5>0&&s.rsi>=eMin&&s.rsi<=eMax&&vol;
 }
 return false;
}
function simulate(id,symbol,c,capital,variant={}){
 const startIndex=Math.max(220,variant.startIndex===undefined?220:variant.startIndex),endIndex=Math.min(c.length-1,variant.endIndex===undefined?c.length-1:variant.endIndex);
 let cash=capital,pos=null,trades=[],equity=[{t:+c[startIndex][0],v:capital}],peak=capital,maxDD=0,signals=0;
 const rr=variant.rr||({A:2,B:2,C:2.2,D:2}[id]||2);
 for(let i=startIndex;i<endIndex;i++){
  const bar=c[i],o=+bar[1],h=+bar[2],l=+bar[3],cl=+bar[4],sig=evaluate(symbol,c,i);
  if(sig&&signal(id,sig,variant))signals++;
  if(pos){
   let exit=null,reason='';
   if(l<=pos.stop){exit=Math.min(o,pos.stop);reason=pos.trailing?'TRAILING-STOP':'INITIAL-STOP'}
   else if(h>=pos.target){exit=Math.max(o,pos.target);reason='KURSZIEL'}
   else if((variant.exitMode==='ema20'&&cl<sig.ema20)||(variant.exitMode==='ema50'&&cl<sig.ema50)||(variant.exitMode!=='ema20'&&variant.exitMode!=='ema50'&&cl<pos.ema20&&cl<pos.entry)){exit=cl;reason=variant.exitMode==='ema50'?'EMA50-VERLUST':variant.exitMode==='ema20'?'EMA20-VERLUST':'MOMENTUM-VERLUST'}
   if(exit!==null){
    const fill=exit*(1-SLIPPAGE_RATE),fee=pos.qty*fill*FEE_RATE,net=pos.qty*(fill-pos.entryFill)-pos.entryFee-fee;
    cash+=pos.stake+net;trades.push({...pos,symbol,buy:pos.date,sell:new Date(+bar[6]).toISOString().slice(0,10),exitTime:+bar[0],exitPrice:exit,exitFill:fill,exitFee:fee,net,ret:net/pos.stake*100,reason});pos=null;
   }else{
    const av=atr(c,i);if(av){pos.highWater=Math.max(pos.highWater,h);if(pos.highWater>=pos.entry+pos.initialRisk){pos.trailing=true;pos.stop=Math.max(pos.stop,pos.highWater-2.5*av);pos.currentStop=pos.stop}}
   }
  }
  if(!pos&&sig&&signal(id,sig,variant)){
   const next=c[i+1],raw=+next[1],fill=raw*(1+SLIPPAGE_RATE);
   const atrStop=raw-(sig.atr||raw*.02)*(variant.stopAtr||1.5),stop=Math.min(sig.stop,atrStop),risk=fill-stop;
   if(risk>0){
    const riskBudget=cash*.01,qty=Math.min(riskBudget/risk,(cash*.5)/(fill*(1+FEE_RATE))),stake=qty*fill*(1+FEE_RATE),entryFee=qty*fill*FEE_RATE;
    if(qty>0&&stake<=cash){
     const target=fill+risk*rr;
     pos={qty,stake,entry:raw,entryFill:fill,entryFee,stop,initialStop:stop,currentStop:stop,target,ema20:sig.ema20,ema50:sig.ema50,ema200:sig.ema200,date:new Date(+next[0]).toISOString().slice(0,10),signalDate:new Date(+bar[0]).toISOString().slice(0,10),entryTime:+next[0],signalTime:+bar[0],initialRisk:risk,highWater:raw,trailing:false,signalPrice:sig.price,atr:sig.atr,rsi:sig.rsi,volumeRatio:sig.volumeRatio,momentum3:sig.momentum3,momentum5:sig.momentum5,signalRR:rr,entryRR:rr};
     cash-=stake;
    }
   }
  }
  const mark=pos?(pos.entryTime<=+bar[6]?cash+pos.qty*cl*(1-SLIPPAGE_RATE-FEE_RATE):cash+pos.stake):cash;
  equity.push({t:+bar[6],v:mark});peak=Math.max(peak,mark);maxDD=Math.max(maxDD,(peak-mark)/peak*100);
 }
 if(pos){
  const last=c[endIndex],exit=+last[4],fill=exit*(1-SLIPPAGE_RATE),exitFee=pos.qty*fill*FEE_RATE,net=pos.qty*(fill-pos.entryFill)-pos.entryFee-exitFee;
  cash+=pos.stake+net;trades.push({...pos,symbol,buy:pos.date,sell:new Date(+last[6]).toISOString().slice(0,10),exitTime:+last[6],exitPrice:exit,exitFill:fill,exitFee,net,ret:net/pos.stake*100,reason:'DATENENDE'});
 }
 equity.push({t:+c[endIndex][6],v:cash});
 const wins=trades.filter(t=>t.net>0),loss=trades.filter(t=>t.net<0),gw=wins.reduce((s,t)=>s+t.net,0),gl=Math.abs(loss.reduce((s,t)=>s+t.net,0));
 return {id,symbol,capital,end:cash,profit:cash-capital,ret:(cash/capital-1)*100,trades,wins:wins.length,winRate:trades.length?wins.length/trades.length*100:0,pf:gl?gw/gl:gw?Infinity:0,maxDD,signals,equity};
}
function buyHold(c,capital){
 const first=+c[0][4],entry=first*(1+SLIPPAGE_RATE+FEE_RATE),qty=capital/entry;
 const equity=c.map(x=>({t:+x[0],v:qty*(+x[4])*(1-SLIPPAGE_RATE-FEE_RATE)})),end=equity.at(-1).v;
 let peak=capital,dd=0;for(const p of equity){peak=Math.max(peak,p.v);dd=Math.max(dd,(peak-p.v)/peak*100)}
 return {capital,end,profit:end-capital,ret:(end/capital-1)*100,trades:[],win:0,winRate:0,pf:0,dd,equity};
}
function render(results,period,experiments=[],walkForward=[]){
 latestResults=results;const ids=['A','B','C','D'],agg=ids.map(id=>{const a=results.filter(r=>r.id===id),tr=a.flatMap(r=>r.trades),start=a.reduce((s,r)=>s+r.capital,0),end=a.reduce((s,r)=>s+r.end,0),win=tr.filter(t=>t.net>0).length,gw=tr.filter(t=>t.net>0).reduce((s,t)=>s+t.net,0),gl=Math.abs(tr.filter(t=>t.net<0).reduce((s,t)=>s+t.net,0)),daily=new Map();for(const r of a)for(const p of r.equity)daily.set(p.t,(daily.get(p.t)||0)+p.v);let peak=start,dd=0;for(const v of [...daily.entries()].sort((x,y)=>x[0]-y[0]).map(x=>x[1])){peak=Math.max(peak,v);dd=Math.max(dd,(peak-v)/peak*100)}return {id,start,end,profit:end-start,ret:(end/start-1)*100,trades:tr.length,win:tr.length?win/tr.length*100:0,pf:gl?gw/gl:gw?Infinity:0,dd}});
 $('summary').innerHTML=agg.map(a=>'<div class="metric"><small>'+NAMES[a.id]+'</small><b class="'+(a.profit>=0?'up':'down')+'">'+fmt(a.profit)+'</b><small>'+pct(a.ret)+' · '+a.trades+' Trades</small></div>').join('');
 $('totals').innerHTML=agg.map(a=>'<tr><td>'+a.id+' · '+NAMES[a.id].split('· ')[1]+'</td><td class="'+(a.profit>=0?'up':'down')+'">'+fmt(a.profit)+'</td><td>'+pct(a.ret)+'</td><td>'+pct(a.win)+'</td><td>'+(Number.isFinite(a.pf)?a.pf.toFixed(2):'∞')+'</td><td>'+a.trades+'</td><td>'+pct(-a.dd)+'</td></tr>').join('');
 $('coins').innerHTML=ids.map(id=>'<div><h3>'+NAMES[id]+'</h3>'+results.filter(r=>r.id===id).map(r=>'<div class="coin-card"><div class="coin-title"><b>'+r.symbol.replace('USDT','')+'</b><strong class="'+(r.profit>=0?'up':'down')+'">'+fmt(r.profit)+'</strong></div><div class="coin-meta">'+r.trades.length+' Trades · Treffer '+pct(r.winRate)+' · PF '+(Number.isFinite(r.pf)?r.pf.toFixed(2):'∞')+' · DD '+pct(-r.maxDD)+' · '+r.signals+' Signale</div></div>').join('')+'</div>').join('');
 const all=results.flatMap(r=>r.trades.map(t=>({...t,id:r.id}))).sort((a,b)=>b.buy.localeCompare(a.buy)).slice(0,50);
 $('trades').innerHTML='<div class="trade-list">'+(all.map(t=>'<div class="trade"><div class="trade-top"><b>'+t.id+' · '+t.symbol.replace('USDT','')+'</b><strong class="'+(t.net>=0?'up':'down')+'">'+fmt(t.net)+'</strong></div><span>'+t.buy+' → '+t.sell+' · '+t.reason+' · '+pct(t.ret)+'</span></div>').join('')||'<div class="empty">Keine Trades nach diesen Regeln.</div>')+'</div>';
 $('period').textContent=period;if($('experiments'))$('experiments').innerHTML=experiments.map(e=>'<tr><td>'+e.name+'</td><td>'+fmt(e.train.profit)+'</td><td>'+pct(e.train.ret)+'</td><td>'+e.train.trades+'</td><td>'+(Number.isFinite(e.train.pf)?e.train.pf.toFixed(2):'∞')+'</td><td>'+pct(-e.train.dd)+'</td><td class="'+(e.oos.profit>=0?'up':'down')+'">'+fmt(e.oos.profit)+'</td><td>'+pct(e.oos.ret)+'</td><td>'+e.oos.trades+'</td><td>'+(Number.isFinite(e.oos.pf)?e.oos.pf.toFixed(2):'∞')+'</td><td>'+pct(-e.oos.dd)+'</td></tr>').join('');
 if($('walkforward'))$('walkforward').innerHTML=walkForward.map(w=>'<tr><td>'+w.name+'</td><td>'+w.period+'</td><td>'+w.trades+'</td><td class="'+(w.profit>=0?'up':'down')+'">'+fmt(w.profit)+'</td><td>'+pct(w.ret)+'</td><td>'+(Number.isFinite(w.pf)?w.pf.toFixed(2):'∞')+'</td><td>'+pct(-w.dd)+'</td></tr>').join('')||'<tr><td colspan="7">Nicht genügend Historie für vollständige Walk-Forward-Fenster.</td></tr>';
}
function exportLog(){
 const cols=['datensatzTyp','test','segment','zeitintervall','coin','strategie','startkapitalEUR','nettoEUR','renditeProzent','trades','trefferquoteProzent','profitFactor','drawdownProzent','signalDatum','einstiegDatum','ausstiegDatum','signalZeitUTC','einstiegZeitUTC','ausstiegZeitUTC','signalKurs','einstiegKurs','einstiegFill','ausstiegKurs','ausstiegFill','menge','positionswert','urspruenglicherStop','aktuellerStopBeimAusstieg','kursziel','CRVBeimSignal','CRVBeimEinstieg','EMA20','EMA50','EMA200','RSI','ATR','VolumenFaktor','Momentum3','Momentum5','entryGebuehr','exitGebuehr','ausstiegsgrund'];
 const rows=[],esc=v=>{const s=v===null||v===undefined?'':String(v);return '"'+s.replace(/"/g,'""')+'"';};
 const addTrade=(entry,t)=>{const segment=entry.summarySegment|| (entry.splitTime&&t.entryTime>=entry.splitTime?'OOS':'TRAIN');rows.push({datensatzTyp:'TRADE',test:entry.name,segment,zeitintervall:entry.timeframe,coin:'SOL',strategie:entry.name,signalDatum:t.signalDate,einstiegDatum:t.buy,ausstiegDatum:t.sell,signalZeitUTC:t.signalTime?new Date(t.signalTime).toISOString():'',einstiegZeitUTC:t.entryTime?new Date(t.entryTime).toISOString():'',ausstiegZeitUTC:t.exitTime?new Date(t.exitTime).toISOString():'',signalKurs:t.signalPrice,einstiegKurs:t.entry,einstiegFill:t.entryFill,ausstiegKurs:t.exitPrice,ausstiegFill:t.exitFill,menge:t.qty,positionswert:t.stake,urspruenglicherStop:t.initialStop,aktuellerStopBeimAusstieg:t.currentStop,kursziel:t.target,CRVBeimSignal:t.signalRR,CRVBeimEinstieg:t.entryRR,EMA20:t.ema20,EMA50:t.ema50,EMA200:t.ema200,RSI:t.rsi,ATR:t.atr,VolumenFaktor:t.volumeRatio,Momentum3:t.momentum3,Momentum5:t.momentum5,entryGebuehr:t.entryFee,exitGebuehr:t.exitFee,nettoEUR:t.net,renditeProzent:t.ret,ausstiegsgrund:t.reason});};
 latestReportTrades.forEach(entry=>entry.result.trades.forEach(t=>addTrade(entry,t)));
 const addSummary=(e,segment,m,tf)=>rows.push({datensatzTyp:'ERGEBNIS',test:e.name,segment,zeitintervall:tf,coin:'SOL',strategie:e.name,startkapitalEUR:1500,nettoEUR:m.profit,renditeProzent:m.ret,trades:m.trades,trefferquoteProzent:m.win,profitFactor:m.pf,drawdownProzent:-m.dd});
 latestExperimentSummaries.forEach(e=>{if(e.train)addSummary(e,'TRAIN',e.train,e.timeframe||'1d');if(e.oos)addSummary(e,'OOS',e.oos,e.timeframe||'1d');if(e.full)addSummary(e,'GESAMT',e.full,e.timeframe||'1d')});
 const csv='\uFEFF'+[cols.join(';'),...rows.map(r=>cols.map(k=>esc(r[k])).join(';'))].join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='LEO-LAB-SOL-Komplettreport.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
async function run(){
 latestExperimentSummaries=[];latestReportTrades=[];
 const b=$('run'),s=$('status');b.disabled=true;b.textContent='SOLANA-DATEN WERDEN GELADEN …';s.textContent='Lade bis zu zwei Jahre SOL/USDT. Berechne Walk-Forward-Fenster ohne BTC-Filter.';
 try{
  const [solDailyRaw,sol1hRaw,sol4hRaw]=await Promise.all([
   get(API+'/klines?symbol=SOLUSDT&interval=1d&limit=1000'),getKlines('SOLUSDT','1h',18000),getKlines('SOLUSDT','4h',5000)
  ]);
  const closed=a=>a.slice(0,-1),sol=closed(solDailyRaw);
  if(sol.length<300)throw Error('Zu wenig SOL-Tageshistorie.');
  const split=Math.floor(sol.length*.7),splitTime=+sol[split][0];
  const summarize=r=>({profit:r.profit,ret:r.ret,trades:r.trades.length,win:r.winRate,pf:r.pf,dd:r.maxDD===undefined?r.dd:r.maxDD});
  const tradeStats=(trades,capital=1500,equityCurve=[],fromTime=null,toTime=null)=>{const ordered=trades.slice().sort((a,b)=>(a.entryTime||0)-(b.entryTime||0));const profit=ordered.reduce((s,t)=>s+t.net,0),wins=ordered.filter(t=>t.net>0),losses=ordered.filter(t=>t.net<0),gw=wins.reduce((s,t)=>s+t.net,0),gl=Math.abs(losses.reduce((s,t)=>s+t.net,0));let curve=equityCurve;if(fromTime!==null){const before=curve.filter(p=>p.t<fromTime).slice(-1);curve=curve.filter(p=>p.t>=fromTime&& (toTime===null||p.t<toTime));if(before.length)curve=[...before,...curve]}else if(toTime!==null)curve=curve.filter(p=>p.t<toTime);let peak=curve.length?curve[0].v:capital,dd=0;for(const p of curve){peak=Math.max(peak,p.v);dd=Math.max(dd,(peak-p.v)/peak*100)}return {profit,ret:profit/capital*100,trades:ordered.length,win:ordered.length?wins.length/ordered.length*100:0,pf:gl?gw/gl:gw?Infinity:0,dd};};
  const summary=(name,full,splitTime,timeframe='1d')=>{const trades=full.trades,curve=full.equity;return {name,full:tradeStats(trades,1500,curve),train:tradeStats(trades.filter(t=>t.entryTime<splitTime),1500,curve,null,splitTime),oos:tradeStats(trades.filter(t=>t.entryTime>=splitTime),1500,curve,splitTime),timeframe};};
  const benchmarkSummary=(name,full,train,oos)=>({name,full:summarize(full),train:summarize(train),oos:summarize(oos),timeframe:'1d'});
  const specs=[
   {id:'A',name:'A · Trend-Pullback',variant:{rr:2,stopAtr:1.5}},
   {id:'B',name:'B · Breakout',variant:{rr:2,stopAtr:1.5,volumeMin:1.2}},
   {id:'C',name:'C · SOL-Trend+',variant:{rr:2.2,stopAtr:1.5}},
   {id:'D',name:'D · SOL-Hybrid',variant:{rr:2,stopAtr:1.5}}
  ];
  const results=[],baseSummaries=[];latestReportTrades=[];
  for(const spec of specs){
   const full=simulate(spec.id,'SOLUSDT',sol,1500,spec.variant);
   results.push(full);baseSummaries.push(summary(spec.name,full,splitTime));
   latestReportTrades.push({name:spec.name,timeframe:'1d',splitTime,result:full});
  }
  const variants=[
   {name:'D · SOL-Hybrid Basis',variant:{rr:2,stopAtr:1.5}},
   {name:'D · Pullback only',variant:{rr:2,stopAtr:1.5,entry:'pullback'}},
   {name:'D · Breakout only',variant:{rr:2,stopAtr:1.5,entry:'breakout',volumeMin:1.2}},
   {name:'D · RSI lockerer',variant:{rr:2,stopAtr:1.5,rsiMin:42,rsiMax:70}},
   {name:'D · Stop 1,0 ATR',variant:{rr:2,stopAtr:1.0}},
   {name:'D · Stop 2,0 ATR',variant:{rr:2,stopAtr:2.0}},
   {name:'D · CRV 1,5',variant:{rr:1.5,stopAtr:1.5}},
   {name:'D · CRV 2,5',variant:{rr:2.5,stopAtr:1.5}}
  ];
  const experiments=variants.map(v=>{
   const full=simulate('D','SOLUSDT',sol,1500,v.variant);
   latestReportTrades.push({name:v.name,timeframe:'1d',splitTime,result:full});
   return summary(v.name,full,splitTime);
  });
  const timeframeTests=[],walkForward=[];
  const tf1Sol=closed(sol1hRaw),tf4Sol=closed(sol4hRaw);
  const commonStart=Math.max(+tf1Sol[0][0],+tf4Sol[0][0]),commonEnd=Math.min(+tf1Sol.at(-1)[0],+tf4Sol.at(-1)[0]);
  for(const tf of ['1h','4h']){
   const source=tf==='1h'?tf1Sol:tf4Sol,sc=source.filter(x=>+x[0]>=commonStart&&+x[0]<=commonEnd);if(sc.length<500)continue;
   const sp=Math.floor(sc.length*.7),st=+sc[sp][0];
   const eVariants=tf==='4h'?[{name:'E · Momentum 4h',variant:{rr:2,stopAtr:1.5,volumeMin:1.05}},{name:'E · Momentum + Volumen 4h',variant:{rr:2,stopAtr:1.5,volumeMin:1.3}},{name:'E · Momentum-Pullback 4h',variant:{rr:2,stopAtr:1.5,entry:'pullback',rsiMin:48,rsiMax:64,volumeMin:0.9}},{name:'E · Exit EMA20 4h',variant:{rr:2,stopAtr:1.5,volumeMin:1.05,exitMode:'ema20'}},{name:'E · Exit EMA50 4h',variant:{rr:2,stopAtr:1.5,volumeMin:1.05,exitMode:'ema50'}}]:[{name:'E · Momentum 1h',variant:{rr:2,stopAtr:1.5,volumeMin:1.05}},{name:'E · Momentum + Volumen 1h',variant:{rr:2,stopAtr:1.5,volumeMin:1.3}},{name:'E · Exit EMA20 1h',variant:{rr:2,stopAtr:1.5,volumeMin:1.05,exitMode:'ema20'}},{name:'E · Exit EMA50 1h',variant:{rr:2,stopAtr:1.5,volumeMin:1.05,exitMode:'ema50'}}];
   for(const ev of eVariants){const full=simulate('E','SOLUSDT',sc,1500,ev.variant);timeframeTests.push(summary(ev.name,full,st,tf));latestReportTrades.push({name:ev.name,timeframe:tf,splitTime:st,result:full});}
  }
  const wfVariants=[{name:'E Momentum Basis',variant:{rr:2,stopAtr:1.5,volumeMin:1.05}},{name:'E Momentum EMA20',variant:{rr:2,stopAtr:1.5,volumeMin:1.05,exitMode:'ema20'}},{name:'E Momentum EMA50',variant:{rr:2,stopAtr:1.5,volumeMin:1.05,exitMode:'ema50'}}];
  const barsPerDay=24,trainBars=365*barsPerDay,testBars=90*barsPerDay;
  const foldCount=Math.min(4,Math.floor((tf1Sol.length-trainBars-1)/testBars));
  for(let fold=0;fold<foldCount;fold++){
   const startIndex=trainBars+fold*testBars,endIndex=Math.min(startIndex+testBars,tf1Sol.length-1);
   for(const w of wfVariants){
    const variant={...w.variant,startIndex,endIndex};
    const full=simulate('E','SOLUSDT',tf1Sol,1500,variant);
    const stat=tradeStats(full.trades,1500,full.equity);
    const name='WF '+(fold+1)+' · '+w.name;
    const item={name,full:stat,timeframe:'1h',summarySegment:'WALK-FORWARD'};
    walkForward.push({name,period:new Date(+tf1Sol[startIndex][0]).toLocaleDateString('de-DE')+' – '+new Date(+tf1Sol[endIndex][6]).toLocaleDateString('de-DE'),...stat});
    latestExperimentSummaries.push(item);
    latestReportTrades.push({name,timeframe:'1h',summarySegment:'WALK-FORWARD',result:full});
   }
  }
  const bhFull=buyHold(sol,1500),bhTrain=buyHold(sol.slice(0,split),1500),bhOos=buyHold(sol.slice(split),1500);
  const benchmarks=[benchmarkSummary('BENCHMARK · SOL Buy & Hold',bhFull,bhTrain,bhOos)];
  latestExperimentSummaries=baseSummaries.concat(experiments,timeframeTests,benchmarks,latestExperimentSummaries);latestTimeframeRuns=[];
  render(results,new Date(+sol[0][0]).toLocaleDateString('de-DE')+' – '+new Date(+sol.at(-1)[0]).toLocaleDateString('de-DE')+' · SOL/USDT · nur SOL-Daten',experiments.concat(timeframeTests,benchmarks),walkForward);
  $('export').disabled=false;s.textContent='Fertig: SOL-only, bis zu zwei Jahre Historie. E Momentum Basis/EMA20/EMA50 im 70/30-Vergleich und in rollierenden 365-Tage-Training-/90-Tage-Testfenstern. Mark-to-Market wird am tatsächlichen Kerzenschluss nach Einstieg berechnet. Gebühren 0,10 % und Slippage 0,05 % je Seite.';
 }catch(e){s.textContent='Test fehlgeschlagen: '+e.message}
 finally{b.disabled=false;b.textContent='SOLANA-STRATEGIEN VERGLEICHEN'}
}
$('run').addEventListener('click',run);$('export').addEventListener('click',exportLog);
})();