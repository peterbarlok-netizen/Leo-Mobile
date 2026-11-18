(()=>{'use strict';
const API='https://data-api.binance.vision/api/v3',ASSETS=['BTCUSDT','SOLUSDT'],NAMES={A:'A · Trend-Pullback',B:'B · Breakout',C:'C · BTC-Trend',D:'D · SOL-Hybrid'};
let latestResults=[],latestExperimentSummaries=[],latestTimeframeRuns=[],latestReportTrades=[];const CHECKS=['Kurs über EMA200','EMA20 über EMA50','EMA200 steigt','Wochenkurs über Wochen-EMA50','Höhere Tiefs','RSI 42–65','Relative Stärke vs. BTC','Volumen über Durchschnitt','Pullback-Nähe','Ausbruch','CRV mindestens 2','Fear & Greed 25–75','ATR 1,5–8 %'];
const $=id=>document.getElementById(id),fmt=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n),pct=n=>(n>=0?'+':'')+n.toFixed(2).replace('.',',')+' %',mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const FEE_RATE=0.001,SLIPPAGE_RATE=0.0005;
async function get(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Datenquelle antwortet mit HTTP '+r.status);return r.json()}
async function getKlines(symbol,interval,limit=3000){let out=[],endTime=Date.now();while(out.length<limit){const n=Math.min(1000,limit-out.length),q=API+'/klines?symbol='+symbol+'&interval='+interval+'&limit='+n+'&endTime='+endTime,batch=await get(q);if(!batch.length)break;out=[...batch,...out];endTime=Number(batch[0][0])-1;if(batch.length<n)break}return out.slice(-limit)}
function ema(a,p){if(a.length<p)return null;let v=mean(a.slice(0,p)),k=2/(p+1);for(let i=p;i<a.length;i++)v=a[i]*k+v*(1-k);return v}
function emaAt(a,p,end){return ema(a.slice(0,end+1),p)}
function rsi(a,p=14){if(a.length<=p)return null;let g=0,l=0;for(let i=1;i<=p;i++){let d=a[i]-a[i-1];g+=Math.max(d,0);l+=Math.max(-d,0)}g/=p;l/=p;for(let i=p+1;i<a.length;i++){let d=a[i]-a[i-1];g=(g*(p-1)+Math.max(d,0))/p;l=(l*(p-1)+Math.max(-d,0))/p}return l===0?(g===0?50:100):100-100/(1+g/l)}
function atr(c,i,p=14){if(i<p)return null;let a=[];for(let j=i-p+1;j<=i;j++){let h=+c[j][2],l=+c[j][3],pc=+c[j-1][4];a.push(Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)))}return mean(a)}
function pivots(c,end){let a=[];for(let i=2;i<end-2;i++){let v=+c[i][3];if(v<+c[i-1][3]&&v<+c[i-2][3]&&v<+c[i+1][3]&&v<+c[i+2][3])a.push({i,v})}return a}
function fngMap(rows){const m=new Map();for(const x of rows||[])m.set(Math.floor(Number(x.timestamp)/86400),Number(x.value));return m}
function evaluate(symbol,c,i,btc,weekly,fng){
 const closes=c.slice(0,i+1).map(x=>+x[4]),price=closes.at(-1);if(i<220)return null;
 const e20=ema(closes,20),e50=ema(closes,50),e200=ema(closes,200),old200=emaAt(closes,200,closes.length-21);
 const w=weekly.filter(x=>Number(x[6])<=Number(c[i][6])),wc=w.map(x=>+x[4]),we50=ema(wc,50);
 const bi=(i<btc.length&&Number(btc[i][0])===Number(c[i][0]))?i:btc.findIndex(x=>Number(x[0])===Number(c[i][0])),bc=bi>=0?btc.slice(0,bi+1).map(x=>+x[4]):[];
 const coinRet=closes.length>=21?price/closes.at(-21)-1:null,btcRet=bc.length>=21?bc.at(-1)/bc.at(-21)-1:null;
 const relativeStrength=coinRet!==null&&btcRet!==null?coinRet-btcRet:null;
 const rsiValue=rsi(closes),ap=atr(c,i),avgVol=mean(c.slice(i-20,i).map(x=>+x[5])),volumeRatio=avgVol>0?+c[i][5]/avgVol:null;
 const priorHigh=Math.max(...c.slice(i-20,i).map(x=>+x[2])),recentLow=Math.min(...c.slice(i-10,i).map(x=>+x[3]));
 const pullback=price>=e50&&price>=e20*.97&&price<=e20*1.025;
 const breakout=price>priorHigh,trend=price>e200&&e20>e50&&e200>old200;
 const btcEma=ema(bc,200),btcOldEma=bc.length>=220?ema(bc.slice(0,-20),200):null;
 const btcRegime=btcEma===null||btcOldEma===null?'unknown':(bc.at(-1)>btcEma&&btcEma>btcOldEma?'bull':(bc.at(-1)<btcEma&&btcEma<btcOldEma?'bear':'sideways'));
 const stop=Math.min(recentLow,price-(ap||price*.02)*1.2);
 return {symbol,price,ema20:e20,ema50:e50,ema200:e200,rsi:rsiValue,atr:ap,volumeRatio,relativeStrength,btcRegime,trend,pullback,breakout,stop,weeklyBull:wc.length>=50&&wc.at(-1)>we50};
}
function signal(id,s,variant={}){
 if(!s)return false;
 const minRS=variant.minRS===undefined?0:variant.minRS,rsOK=s.relativeStrength!==null&&s.relativeStrength>=minRS;
 const rsiMin=variant.rsiMin===undefined?45:variant.rsiMin,rsiMax=variant.rsiMax===undefined?66:variant.rsiMax;
 const pull=s.trend&&s.pullback&&s.rsi>=rsiMin&&s.rsi<=rsiMax&&rsOK;
 const volumeOK=s.volumeRatio>=(variant.volumeMin===undefined?1.15:variant.volumeMin);
 const breakout=s.breakout&&s.price>s.ema200&&s.rsi>=50&&s.rsi<=74&&volumeOK;
 if(id==='A')return variant.entry==='breakout'?breakout:pull;
 if(id==='B')return variant.entry==='pullback'?pull:breakout;
 if(id==='C')return pull&&s.btcRegime==='bull';
 const marketOK=variant.noBtcRegime||s.btcRegime==='bull'||(s.btcRegime==='sideways'&&rsOK)||(s.btcRegime==='bear'&&rsOK&&breakout);
 if(variant.entry==='pullback')return pull&&marketOK;
 if(variant.entry==='breakout')return breakout&&rsOK&&marketOK;
 return s.trend&&rsOK&&((s.pullback&&s.rsi>=rsiMin&&s.rsi<=rsiMax)||(breakout&&s.btcRegime!=='unknown'))&&marketOK;
}
function simulate(id,symbol,c,btc,weekly,fng,capital,variant={}){
 let cash=capital,pos=null,trades=[],equity=[{t:+c[220][0],v:capital}],peak=capital,maxDD=0,signals=0;
 const rr=variant.rr||({A:2,B:2,C:2.2,D:2}[id]||2);
 for(let i=220;i<c.length-1;i++){
  const bar=c[i],o=+bar[1],h=+bar[2],l=+bar[3],cl=+bar[4],sig=evaluate(symbol,c,i,btc,weekly,null);
  if(sig&&signal(id,sig,variant))signals++;
  if(pos){
   let exit=null,reason='';
   if(l<=pos.stop){exit=Math.min(o,pos.stop);reason=pos.trailing?'TRAILING-STOP':'INITIAL-STOP'}
   else if(h>=pos.target){exit=Math.max(o,pos.target);reason='KURSZIEL'}
   else if(cl<pos.ema20&&cl<pos.entry){exit=cl;reason='MOMENTUM-VERLUST'}
   if(exit!==null){
    const fill=exit*(1-SLIPPAGE_RATE),fee=pos.qty*fill*FEE_RATE,net=pos.qty*(fill-pos.entryFill)-pos.entryFee-fee;
    cash+=pos.stake+net;trades.push({...pos,symbol,buy:pos.date,sell:new Date(+bar[6]).toISOString().slice(0,10),exitPrice:exit,exitFill:fill,exitFee:fee,net,ret:net/pos.stake*100,reason});pos=null;
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
     pos={qty,stake,entry:raw,entryFill:fill,entryFee,stop,initialStop:stop,currentStop:stop,target,ema20:sig.ema20,ema50:sig.ema50,ema200:sig.ema200,date:new Date(+next[0]).toISOString().slice(0,10),signalDate:new Date(+bar[0]).toISOString().slice(0,10),initialRisk:risk,highWater:raw,trailing:false,signalPrice:sig.price,atr:sig.atr,rsi:sig.rsi,volumeRatio:sig.volumeRatio,relativeStrength:sig.relativeStrength,btcRegime:sig.btcRegime,signalRR:rr,entryRR:rr};
     cash-=stake;
    }
   }
  }
  const mark=pos?cash+pos.qty*cl*(1-SLIPPAGE_RATE-FEE_RATE):cash;
  equity.push({t:+bar[0],v:mark});peak=Math.max(peak,mark);maxDD=Math.max(maxDD,(peak-mark)/peak*100);
 }
 if(pos){
  const last=c.at(-1),exit=+last[4],fill=exit*(1-SLIPPAGE_RATE),exitFee=pos.qty*fill*FEE_RATE,net=pos.qty*(fill-pos.entryFill)-pos.entryFee-exitFee;
  cash+=pos.stake+net;trades.push({...pos,symbol,buy:pos.date,sell:new Date(+last[0]).toISOString().slice(0,10),exitPrice:exit,exitFill:fill,exitFee,net,ret:net/pos.stake*100,reason:'DATENENDE'});
 }
 equity.push({t:+c.at(-1)[0],v:cash});
 const wins=trades.filter(t=>t.net>0),loss=trades.filter(t=>t.net<0),gw=wins.reduce((s,t)=>s+t.net,0),gl=Math.abs(loss.reduce((s,t)=>s+t.net,0));
 return {id,symbol,capital,end:cash,profit:cash-capital,ret:(cash/capital-1)*100,trades,wins:wins.length,winRate:trades.length?wins.length/trades.length*100:0,pf:gl?gw/gl:gw?Infinity:0,maxDD,signals,equity};
}
function buyHold(c,capital){
 const first=+c[0][4],entry=first*(1+SLIPPAGE_RATE+FEE_RATE),qty=capital/entry;
 const equity=c.map(x=>({t:+x[0],v:qty*(+x[4])*(1-SLIPPAGE_RATE-FEE_RATE)})),end=equity.at(-1).v;
 let peak=capital,dd=0;for(const p of equity){peak=Math.max(peak,p.v);dd=Math.max(dd,(peak-p.v)/peak*100)}
 return {capital,end,profit:end-capital,ret:(end/capital-1)*100,trades:[],win:0,winRate:0,pf:0,dd,equity};
}
function render(results,period,experiments=[]){
 latestResults=results;const ids=['A','B','C','D'],agg=ids.map(id=>{const a=results.filter(r=>r.id===id),tr=a.flatMap(r=>r.trades),start=a.reduce((s,r)=>s+r.capital,0),end=a.reduce((s,r)=>s+r.end,0),win=tr.filter(t=>t.net>0).length,gw=tr.filter(t=>t.net>0).reduce((s,t)=>s+t.net,0),gl=Math.abs(tr.filter(t=>t.net<0).reduce((s,t)=>s+t.net,0)),daily=new Map();for(const r of a)for(const p of r.equity)daily.set(p.t,(daily.get(p.t)||0)+p.v);let peak=start,dd=0;for(const v of [...daily.entries()].sort((x,y)=>x[0]-y[0]).map(x=>x[1])){peak=Math.max(peak,v);dd=Math.max(dd,(peak-v)/peak*100)}return {id,start,end,profit:end-start,ret:(end/start-1)*100,trades:tr.length,win:tr.length?win/tr.length*100:0,pf:gl?gw/gl:gw?Infinity:0,dd}});
 $('summary').innerHTML=agg.map(a=>'<div class="metric"><small>'+NAMES[a.id]+'</small><b class="'+(a.profit>=0?'up':'down')+'">'+fmt(a.profit)+'</b><small>'+pct(a.ret)+' · '+a.trades+' Trades</small></div>').join('');
 $('totals').innerHTML=agg.map(a=>'<tr><td>'+a.id+' · '+NAMES[a.id].split('· ')[1]+'</td><td class="'+(a.profit>=0?'up':'down')+'">'+fmt(a.profit)+'</td><td>'+pct(a.ret)+'</td><td>'+pct(a.win)+'</td><td>'+(Number.isFinite(a.pf)?a.pf.toFixed(2):'∞')+'</td><td>'+a.trades+'</td><td>'+pct(-a.dd)+'</td></tr>').join('');
 $('coins').innerHTML=ids.map(id=>'<div><h3>'+NAMES[id]+'</h3>'+results.filter(r=>r.id===id).map(r=>'<div class="coin-card"><div class="coin-title"><b>'+r.symbol.replace('USDT','')+'</b><strong class="'+(r.profit>=0?'up':'down')+'">'+fmt(r.profit)+'</strong></div><div class="coin-meta">'+r.trades.length+' Trades · Treffer '+pct(r.winRate)+' · PF '+(Number.isFinite(r.pf)?r.pf.toFixed(2):'∞')+' · DD '+pct(-r.maxDD)+' · '+r.signals+' Signale</div></div>').join('')+'</div>').join('');
 const all=results.flatMap(r=>r.trades.map(t=>({...t,id:r.id}))).sort((a,b)=>b.buy.localeCompare(a.buy)).slice(0,50);
 $('trades').innerHTML='<div class="trade-list">'+(all.map(t=>'<div class="trade"><div class="trade-top"><b>'+t.id+' · '+t.symbol.replace('USDT','')+'</b><strong class="'+(t.net>=0?'up':'down')+'">'+fmt(t.net)+'</strong></div><span>'+t.buy+' → '+t.sell+' · '+t.reason+' · '+pct(t.ret)+'</span></div>').join('')||'<div class="empty">Keine Trades nach diesen Regeln.</div>')+'</div>';
 $('period').textContent=period;if($('experiments'))$('experiments').innerHTML=experiments.map(e=>'<tr><td>'+e.name+'</td><td>'+fmt(e.train.profit)+'</td><td>'+pct(e.train.ret)+'</td><td>'+e.train.trades+'</td><td>'+(Number.isFinite(e.train.pf)?e.train.pf.toFixed(2):'∞')+'</td><td>'+pct(-e.train.dd)+'</td><td class="'+(e.oos.profit>=0?'up':'down')+'">'+fmt(e.oos.profit)+'</td><td>'+pct(e.oos.ret)+'</td><td>'+e.oos.trades+'</td><td>'+(Number.isFinite(e.oos.pf)?e.oos.pf.toFixed(2):'∞')+'</td><td>'+pct(-e.oos.dd)+'</td></tr>').join('');
}
function exportLog(){
 const cols=['datensatzTyp','test','segment','zeitintervall','coin','strategie','startkapitalEUR','nettoEUR','renditeProzent','trades','trefferquoteProzent','profitFactor','drawdownProzent','signalDatum','einstiegDatum','ausstiegDatum','signalKurs','einstiegKurs','einstiegFill','ausstiegKurs','ausstiegFill','menge','positionswert','urspruenglicherStop','aktuellerStopBeimAusstieg','kursziel','CRVBeimSignal','CRVBeimEinstieg','EMA20','EMA50','EMA200','RSI','ATR','VolumenFaktor','relativeStaerkeVsBTC','BTCRegime','entryGebuehr','exitGebuehr','ausstiegsgrund'];
 const rows=[],esc=v=>{const s=v===null||v===undefined?'':String(v);return '"'+s.replace(/"/g,'""')+'"';};
 const addTrade=(entry,t)=>{const segment=entry.splitTime&&Date.parse(t.buy+'T00:00:00Z')>=entry.splitTime?'OOS':'TRAIN';rows.push({datensatzTyp:'TRADE',test:entry.name,segment,zeitintervall:entry.timeframe,coin:'SOL',strategie:entry.name,signalDatum:t.signalDate,einstiegDatum:t.buy,ausstiegDatum:t.sell,signalKurs:t.signalPrice,einstiegKurs:t.entry,einstiegFill:t.entryFill,ausstiegKurs:t.exitPrice,ausstiegFill:t.exitFill,menge:t.qty,positionswert:t.stake,urspruenglicherStop:t.initialStop,aktuellerStopBeimAusstieg:t.currentStop,kursziel:t.target,CRVBeimSignal:t.signalRR,CRVBeimEinstieg:t.entryRR,EMA20:t.ema20,EMA50:t.ema50,EMA200:t.ema200,RSI:t.rsi,ATR:t.atr,VolumenFaktor:t.volumeRatio,relativeStaerkeVsBTC:t.relativeStrength,BTCRegime:t.btcRegime,entryGebuehr:t.entryFee,exitGebuehr:t.exitFee,nettoEUR:t.net,renditeProzent:t.ret,ausstiegsgrund:t.reason});};
 latestReportTrades.forEach(entry=>entry.result.trades.forEach(t=>addTrade(entry,t)));
 const addSummary=(e,segment,m,tf)=>rows.push({datensatzTyp:'ERGEBNIS',test:e.name,segment,zeitintervall:tf,coin:'SOL',strategie:e.name,startkapitalEUR:1500,nettoEUR:m.profit,renditeProzent:m.ret,trades:m.trades,trefferquoteProzent:m.win,profitFactor:m.pf,drawdownProzent:-m.dd});
 latestExperimentSummaries.forEach(e=>{if(e.train)addSummary(e,'TRAIN',e.train,e.timeframe||'1d');if(e.oos)addSummary(e,'OOS',e.oos,e.timeframe||'1d');if(e.full)addSummary(e,'GESAMT',e.full,e.timeframe||'1d')});
 const csv='\uFEFF'+[cols.join(';'),...rows.map(r=>cols.map(k=>esc(r[k])).join(';'))].join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='LEO-LAB-SOL-Komplettreport.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
async function run(){
 const b=$('run'),s=$('status');b.disabled=true;b.textContent='SOLANA-DATEN WERDEN GELADEN …';s.textContent='Lade SOL/USDT und BTC/USDT. Vier vereinfachte SOL-Setups werden mit Gebühren und Slippage getestet.';
 try{
  const [solDailyRaw,btcDailyRaw,solWeeklyRaw,sol1hRaw,btc1hRaw,sol4hRaw,btc4hRaw]=await Promise.all([
   get(API+'/klines?symbol=SOLUSDT&interval=1d&limit=1000'),get(API+'/klines?symbol=BTCUSDT&interval=1d&limit=1000'),
   get(API+'/klines?symbol=SOLUSDT&interval=1w&limit=500'),
   getKlines('SOLUSDT','1h',3000),getKlines('BTCUSDT','1h',3000),getKlines('SOLUSDT','4h',3000),getKlines('BTCUSDT','4h',3000)
  ]);
  const closed=a=>a.slice(0,-1),align=(a,b)=>{const bm=new Map(b.map(x=>[+x[0],x])),pairs=a.filter(x=>bm.has(+x[0]));return [pairs,pairs.map(x=>bm.get(+x[0]))]};
  const [sol,btc]=align(closed(solDailyRaw),closed(btcDailyRaw)),weekly=closed(solWeeklyRaw);
  if(sol.length<300)throw Error('Zu wenig gemeinsame SOL-/BTC-Tageshistorie.');
  const split=Math.floor(sol.length*.7),warm=Math.max(0,split-220),splitTime=+sol[split][0];
  const summarize=r=>({profit:r.profit,ret:r.ret,trades:r.trades.length,win:r.winRate,pf:r.pf,dd:r.maxDD});
  const summary=(name,full,train,oos,timeframe='1d')=>({name,full:summarize(full),train:summarize(train),oos:summarize(oos),timeframe});
  const specs=[
   {id:'A',name:'A · Trend-Pullback',variant:{rr:2,stopAtr:1.5}},
   {id:'B',name:'B · Breakout',variant:{rr:2,stopAtr:1.5,volumeMin:1.2}},
   {id:'C',name:'C · BTC-Trend',variant:{rr:2.2,stopAtr:1.5,minRS:0}},
   {id:'D',name:'D · SOL-Hybrid',variant:{rr:2,stopAtr:1.5,minRS:0}}
  ];
  const results=[],baseSummaries=[];latestReportTrades=[];
  for(const spec of specs){
   const full=simulate(spec.id,'SOLUSDT',sol,btc,weekly,null,1500,spec.variant);
   const train=simulate(spec.id,'SOLUSDT',sol.slice(0,split),btc.slice(0,split),weekly.filter(x=>+x[6]<=+sol[split-1][6]),null,1500,spec.variant);
   const oos=simulate(spec.id,'SOLUSDT',sol.slice(warm),btc.slice(warm),weekly,null,1500,spec.variant);
   results.push(full);baseSummaries.push(summary(spec.name,full,train,oos));
   latestReportTrades.push({name:spec.name,timeframe:'1d',splitTime,result:full});
  }
  const variants=[
   {name:'D · SOL-Hybrid Basis',variant:{rr:2,stopAtr:1.5,minRS:0}},
   {name:'D · Ohne BTC-Regime',variant:{rr:2,stopAtr:1.5,minRS:0,noBtcRegime:true}},
   {name:'D · Pullback only',variant:{rr:2,stopAtr:1.5,minRS:0,entry:'pullback'}},
   {name:'D · Breakout only',variant:{rr:2,stopAtr:1.5,minRS:0,entry:'breakout',volumeMin:1.2}},
   {name:'D · RSI lockerer',variant:{rr:2,stopAtr:1.5,minRS:0,rsiMin:42,rsiMax:70}},
   {name:'D · Stop 1,0 ATR',variant:{rr:2,stopAtr:1.0,minRS:0}},
   {name:'D · Stop 2,0 ATR',variant:{rr:2,stopAtr:2.0,minRS:0}},
   {name:'D · CRV 1,5',variant:{rr:1.5,stopAtr:1.5,minRS:0}},
   {name:'D · CRV 2,5',variant:{rr:2.5,stopAtr:1.5,minRS:0}}
  ];
  const experiments=variants.map(v=>{
   const full=simulate('D','SOLUSDT',sol,btc,weekly,null,1500,v.variant);
   const train=simulate('D','SOLUSDT',sol.slice(0,split),btc.slice(0,split),weekly.filter(x=>+x[6]<=+sol[split-1][6]),null,1500,v.variant);
   const oos=simulate('D','SOLUSDT',sol.slice(warm),btc.slice(warm),weekly,null,1500,v.variant);
   latestReportTrades.push({name:v.name,timeframe:'1d',splitTime,result:full});
   return summary(v.name,full,train,oos);
  });
  const timeframeTests=[];
  for(const tf of ['1h','4h']){
   const raw=tf==='1h'?[closed(sol1hRaw),closed(btc1hRaw)]:[closed(sol4hRaw),closed(btc4hRaw)];
   const [sc,bc]=align(raw[0],raw[1]);if(sc.length<500)continue;
   const sp=Math.floor(sc.length*.7),wm=Math.max(0,sp-220),st=+sc[sp][0],variant={rr:2,stopAtr:1.5,minRS:0};
   const full=simulate('D','SOLUSDT',sc,bc,weekly,null,1500,variant);
   const train=simulate('D','SOLUSDT',sc.slice(0,sp),bc.slice(0,sp),weekly.filter(x=>+x[6]<=+sc[sp-1][6]),null,1500,variant);
   const oos=simulate('D','SOLUSDT',sc.slice(wm),bc.slice(wm),weekly,null,1500,variant);
   timeframeTests.push(summary('D · SOL '+tf,full,train,oos,tf));
   latestReportTrades.push({name:'D · SOL '+tf,timeframe:tf,splitTime:st,result:full});
  }
  const bhFull=buyHold(sol,1500),bhTrain=buyHold(sol.slice(0,split),1500),bhOos=buyHold(sol.slice(split),1500);
  const benchmarks=[summary('BENCHMARK · SOL Buy & Hold',bhFull,bhTrain,bhOos)];
  latestExperimentSummaries=baseSummaries.concat(experiments,timeframeTests,benchmarks);latestTimeframeRuns=[];
  render(results,new Date(+sol[0][0]).toLocaleDateString('de-DE')+' – '+new Date(+sol.at(-1)[0]).toLocaleDateString('de-DE')+' · SOL/USDT · BTC Marktkompass',experiments.concat(timeframeTests,benchmarks));
  $('export').disabled=false;s.textContent='Fertig: vier SOL-Strategien, reduzierte Regeln, BTC-Regime/relative Stärke, 1h/4h und SOL Buy & Hold. Gebühren 0,10 % und Slippage 0,05 % je Seite; 70 % Training / 30 % OOS.';
 }catch(e){s.textContent='Test fehlgeschlagen: '+e.message}
 finally{b.disabled=false;b.textContent='SOLANA-STRATEGIEN VERGLEICHEN'}
}
$('run').addEventListener('click',run);$('export').addEventListener('click',exportLog);
})();