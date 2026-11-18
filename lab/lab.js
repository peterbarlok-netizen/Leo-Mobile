(()=>{'use strict';
const API='https://data-api.binance.vision/api/v3',ASSETS=['BTCUSDT','SOLUSDT'],NAMES={A:'A · Precision',B:'B · Coin First',C:'C · Hybrid',D:'D · Coin Adaptive'};
let latestResults=[],latestExperimentSummaries=[],latestTimeframeRuns=[];const CHECKS=['Kurs über EMA200','EMA20 über EMA50','EMA200 steigt','Wochenkurs über Wochen-EMA50','Höhere Tiefs','RSI 42–65','Relative Stärke vs. BTC','Volumen über Durchschnitt','Pullback-Nähe','Ausbruch','CRV mindestens 2','Fear & Greed 25–75','ATR 1,5–8 %'];
const $=id=>document.getElementById(id),fmt=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n),pct=n=>(n>=0?'+':'')+n.toFixed(2).replace('.',',')+' %',mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const FEE_RATE=0,SLIPPAGE_RATE=0;
async function get(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Datenquelle antwortet mit HTTP '+r.status);return r.json()}
async function getKlines(symbol,interval,limit=3000){let out=[],endTime=Date.now();while(out.length<limit){const n=Math.min(1000,limit-out.length),q=API+'/klines?symbol='+symbol+'&interval='+interval+'&limit='+n+'&endTime='+endTime,batch=await get(q);if(!batch.length)break;out=[...batch,...out];endTime=Number(batch[0][0])-1;if(batch.length<n)break}return out.slice(-limit)}
function ema(a,p){if(a.length<p)return null;let v=mean(a.slice(0,p)),k=2/(p+1);for(let i=p;i<a.length;i++)v=a[i]*k+v*(1-k);return v}
function emaAt(a,p,end){return ema(a.slice(0,end+1),p)}
function rsi(a,p=14){if(a.length<=p)return null;let g=0,l=0;for(let i=1;i<=p;i++){let d=a[i]-a[i-1];g+=Math.max(d,0);l+=Math.max(-d,0)}g/=p;l/=p;for(let i=p+1;i<a.length;i++){let d=a[i]-a[i-1];g=(g*(p-1)+Math.max(d,0))/p;l=(l*(p-1)+Math.max(-d,0))/p}return l===0?(g===0?50:100):100-100/(1+g/l)}
function atr(c,i,p=14){if(i<p)return null;let a=[];for(let j=i-p+1;j<=i;j++){let h=+c[j][2],l=+c[j][3],pc=+c[j-1][4];a.push(Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)))}return mean(a)}
function pivots(c,end){let a=[];for(let i=2;i<end-2;i++){let v=+c[i][3];if(v<+c[i-1][3]&&v<+c[i-2][3]&&v<+c[i+1][3]&&v<+c[i+2][3])a.push({i,v})}return a}
function fngMap(rows){const m=new Map();for(const x of rows||[])m.set(Math.floor(Number(x.timestamp)/86400),Number(x.value));return m}
function evaluate(symbol,c,i,btc,weekly,fng){
 const closes=c.slice(0,i+1).map(x=>+x[4]),vol=c.slice(0,i+1).map(x=>+x[5]),price=closes.at(-1);if(i<220)return null;
 const e20=ema(closes,20),e50=ema(closes,50),e200=ema(closes,200),old200=emaAt(closes,200,closes.length-21);
 const w=weekly.filter(x=>Number(x[6])<=Number(c[i][6])),wc=w.map(x=>+x[4]),we50=ema(wc,50);
 const ps=pivots(c,i+1),last=ps.at(-1),prev=ps.at(-2),bi=btc.findIndex(x=>Number(x[0])===Number(c[i][0])),bc=bi>=0?btc.slice(0,bi+1).map(x=>+x[4]):[];
 const ar=closes.length>=21?price/closes.at(-21)-1:null,br=bc.length>=21?bc.at(-1)/bc.at(-21)-1:null;
 const avgVol=mean(vol.slice(-21,-1)),res=Math.max(...c.slice(Math.max(0,i-60),i).map(x=>+x[2]));
 const higher=!!(last&&prev&&i-last.i<=20&&i-prev.i<=45&&last.v>prev.v);
 const stop=last&&i-last.i<=20?last.v:Math.min(...c.slice(i-20,i).map(x=>+x[3]));
 const risk=price-stop,reward=res-price,rr=risk>0&&reward>0?reward/risk:null;
 const near=!!(e20&&e50&&Math.min(Math.abs(price-e20)/e20,Math.abs(price-e50)/e50)<=.025&&price>=e50);
 const breakout=price>Math.max(...c.slice(i-3,i).map(x=>+x[2]));
 const fg=fng.get(Math.floor(Number(c[i][0])/86400000)),ap=atr(c,i),apct=ap/price*100;
 const rsiValue=rsi(closes),volRatio=avgVol>0?+c[i][5]/avgVol:null;const checks=[price>e200,e20>e50,e200>old200,wc.length>=50&&wc.at(-1)>we50,higher,(rsiValue>=42&&rsiValue<=65),symbol==='BTCUSDT'||(ar!==null&&br!==null&&ar>br),+c[i][5]>avgVol,near,breakout,rr!==null&&rr>=2,fg!==undefined&&fg>=25&&fg<=75,apct>=1.5&&apct<=8];
 const btcEma=ema(bc,200),btcOldEma=bc.length>=220?ema(bc.slice(0,-20),200):null;
 const btcRegime=btcEma===null||btcOldEma===null?'unknown':(bc.at(-1)>btcEma&&btcEma>btcOldEma?'bull':(bc.at(-1)<btcEma&&btcEma<btcOldEma?'bear':'sideways'));
 return {symbol,checks,stop,target:res,rr,ema20:e20,ema50:e50,ema200:e200,atr:ap,atrPct:apct,rsi:rsiValue,volumeRatio:volRatio,fearGreed:fg,relativeStrength:ar!==null&&br!==null?ar-br:null,btcRegime,signalPrice:price};
}
function signal(id,s,variant={}){const x=s.checks;if(id==='A')return !!(x.slice(0,8).every(Boolean)&&(x[8]||x[9])&&x[10]&&x[11]&&x[12]);if(id==='B')return !!(x[0]&&x[1]&&x[4]&&x[5]&&x[7]&&(x[8]||x[9])&&s.rr>=1.5);if(id==='C')return !!(x[0]&&x[1]&&x[2]&&x[3]&&x[4]&&x[5]&&x[7]&&(s.btcRegime==='bull')&&s.rr>=1.8);const y=x.slice();for(const k of (variant.remove||[]))y[k]=true;const entry=variant.entry==='pullback'?y[8]:variant.entry==='breakout'?y[9]:(y[8]||y[9]);const profile={SOLUSDT:{rsiMin:47,rsiMax:70,rsMin:.005,rr:1.8,stopAtr:1.25}};
 const p=profile[s.symbol]||profile.SOLUSDT,rs=s.relativeStrength,coinRsi=(variant.remove||[]).includes(5)||(s.rsi>=p.rsiMin&&s.rsi<=p.rsiMax),coinStrength=(variant.remove||[]).includes(6)||(rs!==null&&rs>=p.rsMin);
 const regime=variant.regime==='bull'?s.btcRegime==='bull':variant.regime==='bear'?s.btcRegime==='bear'&&coinStrength&&y[9]:true;
 const marketOk=variant.noBtcRegime?true:(regime&&(s.btcRegime==='bull'||(s.btcRegime==='sideways'&&coinStrength)||(s.btcRegime==='bear'&&coinStrength&&y[9])));
 return !!(y[0]&&y[1]&&y[3]&&y[4]&&y[7]&&entry&&coinRsi&&coinStrength&&marketOk&&s.rr>=p.rr)}
function simulate(id,symbol,c,btc,weekly,fng,capital,variant={}){
 let cash=capital,pos=null,trades=[],equity=[{t:+c[220][0],v:capital}],peak=capital,maxDD=0,signals=0;
 for(let i=220;i<c.length-1;i++){
  const bar=c[i],o=+bar[1],h=+bar[2],l=+bar[3],cl=+bar[4],sig=evaluate(symbol,c,i,btc,weekly,fng);
  if(sig&&(id!=='D'||variant.universe||(symbol==='ETHUSDT'||symbol==='SOLUSDT'))&&signal(id,sig,variant))signals++;
  if(pos){
   let exit=null,reason='';
   if(l<=pos.stop){exit=Math.min(o,pos.stop);reason=pos.trailing?'TRAILING-STOP':'INITIAL-STOP'}
   else if(h>=pos.target){exit=Math.max(o,pos.target);reason='KURSZIEL'}
   else if(id!=='A'&&cl<pos.ema20&&cl<pos.entry){exit=cl;reason='MOMENTUM-VERLUST'}
   if(exit!==null){const fill=exit*(1-SLIPPAGE_RATE),fee=pos.qty*fill*FEE_RATE,net=pos.qty*(fill-pos.entryFill)-pos.entryFee-fee;cash+=pos.stake+net;trades.push({...pos,symbol,buy:pos.date,sell:new Date(+bar[6]).toISOString().slice(0,10),exitPrice:exit,exitFill:fill,exitFee:fee,net,ret:net/pos.stake*100,reason});pos=null}
   else{const av=atr(c,i);if(av){pos.highWater=Math.max(pos.highWater,h);if(pos.highWater>=pos.entry+pos.initialRisk){pos.trailing=true;pos.stop=Math.max(pos.stop,pos.highWater-2*av);pos.currentStop=pos.stop}}}
  }
  if(!pos&&sig&&(id!=='D'||variant.universe||(symbol==='ETHUSDT'||symbol==='SOLUSDT'))&&signal(id,sig,variant)){
   const next=c[i+1],raw=+next[1],fill=raw*(1+SLIPPAGE_RATE),stop=id==='D'?Math.min(sig.stop,raw-Math.max((sig.atr||0)*(variant.stopFloorAtr===undefined?({SOLUSDT:1.25}[symbol]||1.25):variant.stopFloorAtr),raw*(variant.stopFloorPct===undefined?.005:variant.stopFloorPct))):sig.stop,risk=fill-stop,reward=sig.target-fill;
   if(risk>0&&reward>=(id==='B'||id==='D'?1.5:1.8)*risk){
    const riskBudget=cash*.01,qty=Math.min(riskBudget/risk,(cash*.25)/(fill*(1+FEE_RATE))),stake=qty*fill*(1+FEE_RATE);
    if(qty>0&&stake<=cash){pos={qty,stake,entry:raw,entryFill:fill,entryFee:qty*fill*FEE_RATE,stop,initialStop:stop,currentStop:stop,target:sig.target,ema20:sig.ema20,rr:sig.rr,date:new Date(+next[0]).toISOString().slice(0,10),signalDate:new Date(+bar[0]).toISOString().slice(0,10),initialRisk:risk,highWater:raw,trailing:false,signalChecks:sig.checks.map((v,i)=>(v?'+ ':'- ')+CHECKS[i]).join(' | '),signalPrice:sig.signalPrice,ema50:sig.ema50,ema200:sig.ema200,atr:sig.atr,atrPct:sig.atrPct,rsi:sig.rsi,volumeRatio:sig.volumeRatio,fearGreed:sig.fearGreed,relativeStrength:sig.relativeStrength,signalRR:sig.rr,entryRR:(sig.target-fill)/(fill-sig.stop),signalTarget:sig.target};cash-=stake}
   }
  }
  const mark=pos?cash+pos.qty*cl*(1-SLIPPAGE_RATE-FEE_RATE):cash;equity.push({t:+bar[0],v:mark});peak=Math.max(peak,mark);maxDD=Math.max(maxDD,(peak-mark)/peak*100);
 }
 if(pos){const last=c.at(-1),exit=+last[4],fill=exit*(1-SLIPPAGE_RATE),net=pos.qty*(fill-pos.entryFill)-pos.entryFee-pos.qty*fill*FEE_RATE;cash+=pos.stake+net;trades.push({...pos,symbol,buy:pos.date,sell:new Date(+last[0]).toISOString().slice(0,10),exitPrice:exit,exitFill:fill,exitFee:pos.qty*fill*FEE_RATE,net,ret:net/pos.stake*100,reason:'DATENENDE'})}equity.push({t:+c.at(-1)[0],v:cash});
 const wins=trades.filter(t=>t.net>0),loss=trades.filter(t=>t.net<0),gw=wins.reduce((s,t)=>s+t.net,0),gl=Math.abs(loss.reduce((s,t)=>s+t.net,0));
 return {id,symbol,capital,end:cash,profit:cash-capital,ret:(cash/capital-1)*100,trades,wins:wins.length,winRate:trades.length?wins.length/trades.length*100:0,pf:gl?gw/gl:gw?Infinity:0,maxDD,signals,equity};
}
function buyHold(c,capital){const first=+c[0][4],qty=capital/first,equity=c.map(x=>({t:+x[0],v:qty*(+x[4])}));const end=equity.at(-1).v;let peak=capital,dd=0;for(const p of equity){peak=Math.max(peak,p.v);dd=Math.max(dd,(peak-p.v)/peak*100)}return {capital,end,profit:end-capital,ret:(end/capital-1)*100,trades:[],win:0,pf:0,dd,equity}}

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
 const cols=['datensatzTyp','test','segment','zeitintervall','coin','strategie','startkapitalEUR','nettoEUR','renditeProzent','trades','trefferquoteProzent','profitFactor','drawdownProzent','signalDatum','einstiegDatum','ausstiegDatum','signalKurs','einstiegKurs','einstiegFill','ausstiegKurs','ausstiegFill','menge','positionswert','urspruenglicherStop','aktuellerStopBeimAusstieg','kursziel','CRVBeimSignal','CRVBeimEinstieg','EMA20','EMA50','EMA200','RSI','ATR','ATRProzent','VolumenFaktor','FearGreed','relativeStaerkeVsBTC','entryGebuehr','exitGebuehr','ausstiegsgrund','signalChecks'];
 const rows=[];
 const addTrade=(r,t,segment='FULL',tf='1d',test='Basis A-D')=>rows.push({datensatzTyp:'TRADE',test,segment,zeitintervall:tf,coin:t.symbol.replace('USDT',''),strategie:NAMES[r.id],signalDatum:t.signalDate,einstiegDatum:t.buy,ausstiegDatum:t.sell,signalKurs:t.signalPrice,einstiegKurs:t.entry,einstiegFill:t.entryFill,ausstiegKurs:t.exitPrice,ausstiegFill:t.exitFill,menge:t.qty,positionswert:t.stake,urspruenglicherStop:t.initialStop,aktuellerStopBeimAusstieg:t.currentStop,kursziel:t.target,CRVBeimSignal:t.signalRR,CRVBeimEinstieg:t.entryRR,EMA20:t.ema20,EMA50:t.ema50,EMA200:t.ema200,RSI:t.rsi,ATR:t.atr,ATRProzent:t.atrPct,VolumenFaktor:t.volumeRatio,FearGreed:t.fearGreed,relativeStaerkeVsBTC:t.relativeStrength,entryGebuehr:t.entryFee,exitGebuehr:t.exitFee,nettoEUR:t.net,renditeProzent:t.ret,ausstiegsgrund:t.reason,signalChecks:t.signalChecks});
 latestResults.forEach(r=>r.trades.forEach(t=>addTrade(r,t)));
 const addSummary=(e,segment,m,tf='')=>rows.push({datensatzTyp:'ERGEBNIS',test:e.name,segment,zeitintervall:tf||(/1h|4h/.exec(e.name)||[])[0]||'1d',startkapitalEUR:1500,nettoEUR:m.profit,renditeProzent:m.ret,trades:m.trades,trefferquoteProzent:m.win,profitFactor:m.pf,drawdownProzent:m.dd});
 latestExperimentSummaries.forEach(e=>{if(e.train)addSummary(e,'TRAIN',e.train);if(e.oos)addSummary(e,'OOS',e.oos);if(e.full)addSummary(e,'GESAMT',e.full)});
 latestTimeframeRuns.forEach(e=>{for(const segment of ['train','oos','full']){const label=segment==='train'?'TRAIN':segment==='oos'?'OOS':'GESAMT';(e[segment]||[]).forEach(r=>r.trades.forEach(t=>addTrade(r,t,label,e.timeframe,e.name))) }});
 if(!rows.length)return;
 const esc=v=>{const s=v===null||v===undefined?'':String(v);return '"'+s.replace(/"/g,'""')+'"';};
 const csv='\uFEFF'+[cols.join(';'),...rows.map(r=>cols.map(k=>esc(r[k])).join(';'))].join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='LEO-LAB-Komplettreport.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
async function run(){const b=$('run'),s=$('status');b.disabled=true;b.textContent='SOLANA-DATEN WERDEN GELADEN …';s.textContent='Lade SOL/USDT und BTC/USDT als Marktvergleich. A–D werden ausschließlich auf SOL getestet.';
 try{
  const [fngData,...market]=await Promise.all([
   get('https://api.alternative.me/fng/?limit=0&format=json'),
   ...ASSETS.map((x,j)=>Promise.all([
    get(API+'/klines?symbol='+x+'&interval=1d&limit=1000'),
    get(API+'/klines?symbol='+x+'&interval=1w&limit=500'),
    getKlines(x,'1h',3000),
    getKlines(x,'4h',3000)
   ]))
  ]);
  const fng=fngMap(fngData.data);if(!fng.size)throw Error('Fear-&-Greed-Historie nicht verfügbar.');
  const daily=market.map(p=>p[0].slice(0,-1)),start=Math.max(...daily.map(a=>+a[0][0])),end=Math.min(...daily.map(a=>+a.at(-1)[0]));
  const aligned=daily.map(a=>a.filter(x=>+x[0]>=start&&+x[0]<=end)),weekly=market.map(p=>p[1].slice(0,-1)),btc=aligned[0],sol=aligned[1];
  if(aligned.some(a=>a.length<300))throw Error('Zu wenig gemeinsamer Datenzeitraum für SOL und BTC.');
  const results=['A','B','C','D'].map(id=>simulate(id,'SOLUSDT',sol,btc,weekly[1].filter(x=>+x[0]<=end),fng,1500));
  const split=Math.floor(sol.length*.7),warm=Math.max(0,split-220),variants=[
   {name:'D · SOL Basisprofil + BTC-Regime',remove:[],stopFloorAtr:1.25,stopFloorPct:.005},
   {name:'D · SOL ohne BTC-Regime',remove:[],noBtcRegime:true,stopFloorAtr:1.25,stopFloorPct:.005},
   {name:'D · SOL ohne RSI-Filter',remove:[5],stopFloorAtr:1.25,stopFloorPct:.005},
   {name:'D · SOL ohne Volumenfilter',remove:[7],stopFloorAtr:1.25,stopFloorPct:.005},
   {name:'D · SOL ohne Wochenfilter',remove:[3],stopFloorAtr:1.25,stopFloorPct:.005},
   {name:'D · SOL ohne höhere Tiefs',remove:[4],stopFloorAtr:1.25,stopFloorPct:.005},
   {name:'D · SOL ohne relative Stärke',remove:[6],stopFloorAtr:1.25,stopFloorPct:.005},
   {name:'D · SOL nur Pullback',remove:[],entry:'pullback',stopFloorAtr:1.25,stopFloorPct:.005},
   {name:'D · SOL nur Ausbruch',remove:[],entry:'breakout',stopFloorAtr:1.25,stopFloorPct:.005},
   {name:'D · SOL nur BTC-Bullenphase',remove:[],regime:'bull',stopFloorAtr:1.25,stopFloorPct:.005},
   {name:'D · SOL nur BTC-Bärenphase',remove:[],regime:'bear',stopFloorAtr:1.25,stopFloorPct:.005},
   {name:'D · SOL enger Struktur-Stop',remove:[],stopFloorAtr:0,stopFloorPct:0},
   {name:'D · SOL Stop 0,5 ATR',remove:[],stopFloorAtr:.5,stopFloorPct:.005},
   {name:'D · SOL Stop 1,0 ATR',remove:[],stopFloorAtr:1,stopFloorPct:.005},
   {name:'D · SOL Stop 1,5 ATR',remove:[],stopFloorAtr:1.5,stopFloorPct:.005}
  ];
  const summarize=r=>{const tr=r.trades,w=tr.filter(t=>t.net>0),loss=tr.filter(t=>t.net<0),gw=w.reduce((z,t)=>z+t.net,0),gl=Math.abs(loss.reduce((z,t)=>z+t.net,0));let peak=1500,dd=0;for(const q of r.equity){peak=Math.max(peak,q.v);dd=Math.max(dd,(peak-q.v)/peak*100)}return {profit:r.profit,ret:r.ret,trades:tr.length,win:r.winRate,pf:gl?gw/gl:gw?Infinity:0,dd};};
  const experiments=variants.map(v=>{
   const full=simulate('D','SOLUSDT',sol,btc,weekly[1].filter(x=>+x[0]<=end),fng,1500,v);
   const train=simulate('D','SOLUSDT',sol.slice(0,split),btc.slice(0,split),weekly[1].filter(x=>+x[0]<=+sol[split-1][0]),fng,1500,v);
   const oos=simulate('D','SOLUSDT',sol.slice(warm),btc.slice(warm),weekly[1].filter(x=>+x[0]<=end),fng,1500,v);
   return {name:v.name,full:summarize(full),train:summarize(train),oos:summarize(oos)};
  });
  const timeframeTests=[];latestTimeframeRuns=[];
  for(const tf of ['1h','4h']){
   const raw=market.map(p=>p[tf==='1h'?2:3].slice(0,-1));
   const t0=Math.max(...raw.map(a=>+a[0][0])),t1=Math.min(...raw.map(a=>+a.at(-1)[0]));
   const aa=raw.map(a=>a.filter(x=>+x[0]>=t0&&+x[0]<=t1)),bb=aa[0],cc=aa[1];
   if(cc.length<500)continue;
   const sp=Math.floor(cc.length*.7),wm=Math.max(0,sp-220);
   const simPart=part=>{const c=part==='train'?cc.slice(0,sp):part==='oos'?cc.slice(wm):cc,b=part==='train'?bb.slice(0,sp):part==='oos'?bb.slice(wm):bb,w=weekly[1].filter(x=>+x[0]<=(part==='train'?+cc[sp-1][6]:t1));return simulate('D','SOLUSDT',c,b,w,fng,1500,{stopFloorAtr:1.25,stopFloorPct:.005})};
   const tr=simPart('train'),oo=simPart('oos'),fu=simPart('full');
   timeframeTests.push({name:'D · SOL '+tf,train:summarize(tr),oos:summarize(oo),full:summarize(fu)});
   latestTimeframeRuns.push({name:'D · SOL '+tf,timeframe:tf,train:[tr],oos:[oo],full:[fu]});
  }
  const benchmarkTests=[{name:'BENCHMARK · SOL Buy & Hold',train:summarize(buyHold(sol.slice(0,split),1500)),oos:summarize(buyHold(sol.slice(split),1500)),full:summarize(buyHold(sol,1500))}];
  latestExperimentSummaries=experiments.concat(timeframeTests,benchmarkTests);
  render(results,new Date(start).toLocaleDateString('de-DE')+' – '+new Date(end).toLocaleDateString('de-DE')+' · SOL/USDT, BTC als Marktkompass',experiments.concat(timeframeTests,benchmarkTests));
  $('export').disabled=false;s.textContent='Fertig: A–D ausschließlich auf SOL, BTC nur als Marktkompass. D-Filter-/Stop-Tests, SOL 1h/4h und SOL Buy & Hold sind enthalten. 70 % Training / 30 % OOS.';
 }catch(e){s.textContent='Test fehlgeschlagen: '+e.message}
 finally{b.disabled=false;b.textContent='SOLANA-STRATEGIEN VERGLEICHEN'}}
$('run').addEventListener('click',run);$('export').addEventListener('click',exportLog);
})();