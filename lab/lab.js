(()=>{'use strict';
const API='https://data-api.binance.vision/api/v3',ASSETS=['BTCUSDT','ETHUSDT','SOLUSDT','LINKUSDT'],NAMES={A:'A · Precision',B:'B · Coin First',C:'C · Hybrid'};
const $=id=>document.getElementById(id),fmt=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n),pct=n=>(n>=0?'+':'')+n.toFixed(2).replace('.',',')+' %',mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
async function get(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Datenquelle antwortet mit HTTP '+r.status);return r.json()}
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
 const checks=[price>e200,e20>e50,e200>old200,wc.length>=50&&wc.at(-1)>we50,higher,(rsi(closes)>=42&&rsi(closes)<=65),symbol==='BTCUSDT'||(ar!==null&&br!==null&&ar>br),+c[i][5]>avgVol,near,breakout,rr!==null&&rr>=2,fg!==undefined&&fg>=25&&fg<=75,apct>=1.5&&apct<=8];
 const btcEma=ema(bc,200),btcRegime=btcEma!==null&&bc.at(-1)>btcEma;
 return {checks,stop,target:res,rr,ema20:e20,atr:ap,btcRegime};
}
function signal(id,s){const x=s.checks;if(id==='A')return !!(x.slice(0,8).every(Boolean)&&(x[8]||x[9])&&x[10]&&x[11]&&x[12]);if(id==='B')return !!(x[0]&&x[1]&&x[4]&&x[5]&&x[7]&&(x[8]||x[9])&&s.rr>=1.5);return !!(x[0]&&x[1]&&x[2]&&x[3]&&x[4]&&x[5]&&x[7]&&(s.btcRegime)&&s.rr>=1.8)}
function simulate(id,symbol,c,btc,weekly,fng,capital){
 let cash=capital,pos=null,trades=[],equity=[capital],peak=capital,maxDD=0,signals=0;
 for(let i=220;i<c.length-1;i++){
  const bar=c[i],o=+bar[1],h=+bar[2],l=+bar[3],cl=+bar[4],sig=evaluate(symbol,c,i,btc,weekly,fng);
  if(sig&&signal(id,sig))signals++;
  if(pos){
   let exit=null,reason='';
   if(l<=pos.stop){exit=Math.min(o,pos.stop);reason=pos.trailing?'TRAILING-STOP':'INITIAL-STOP'}
   else if(h>=pos.target){exit=Math.max(o,pos.target);reason='KURSZIEL'}
   else if(id!=='A'&&cl<pos.ema20&&cl<pos.entry){exit=cl;reason='MOMENTUM-VERLUST'}
   if(exit!==null){const fill=exit*.9995,fee=pos.qty*fill*.001,net=pos.qty*(fill-pos.entryFill)-pos.entryFee-fee;cash+=pos.stake+net;trades.push({symbol,buy:pos.date,sell:new Date(+bar[6]).toISOString().slice(0,10),net,ret:net/pos.stake*100,reason});pos=null}
   else{const av=atr(c,i);if(av){pos.highWater=Math.max(pos.highWater,h);if(pos.highWater>=pos.entry+pos.initialRisk){pos.trailing=true;pos.stop=Math.max(pos.stop,pos.highWater-2*av)}}}
  }
  if(!pos&&sig&&signal(id,sig)){
   const next=c[i+1],raw=+next[1],fill=raw*1.0005,risk=raw-sig.stop,reward=sig.target-raw;
   if(risk>0&&reward>=(id==='B'?1.5:1.8)*risk){
    const riskBudget=cash*.01,qty=Math.min(riskBudget/risk,(cash*.25)/(fill*1.001)),stake=qty*fill*1.001;
    if(qty>0&&stake<=cash){pos={qty,stake,entry:raw,entryFill:fill,entryFee:qty*fill*.001,stop:sig.stop,target:sig.target,ema20:sig.ema20,rr:sig.rr,date:new Date(+next[0]).toISOString().slice(0,10),initialRisk:risk,highWater:raw,trailing:false};cash-=stake}
   }
  }
  const mark=pos?cash+pos.qty*cl*.9985:cash;equity.push(mark);peak=Math.max(peak,mark);maxDD=Math.max(maxDD,(peak-mark)/peak*100);
 }
 if(pos){const last=c.at(-1),exit=+last[4],fill=exit*.9995,net=pos.qty*(fill-pos.entryFill)-pos.entryFee-pos.qty*fill*.001;cash+=pos.stake+net;trades.push({symbol,buy:pos.date,sell:new Date(+last[0]).toISOString().slice(0,10),net,ret:net/pos.stake*100,reason:'DATENENDE'})}
 const wins=trades.filter(t=>t.net>0),loss=trades.filter(t=>t.net<0),gw=wins.reduce((s,t)=>s+t.net,0),gl=Math.abs(loss.reduce((s,t)=>s+t.net,0));
 return {id,symbol,capital,end:cash,profit:cash-capital,ret:(cash/capital-1)*100,trades,wins:wins.length,winRate:trades.length?wins.length/trades.length*100:0,pf:gl?gw/gl:gw?Infinity:0,maxDD,signals};
}
function render(results,period){
 const ids=['A','B','C'],agg=ids.map(id=>{const a=results.filter(r=>r.id===id),tr=a.flatMap(r=>r.trades),start=a.reduce((s,r)=>s+r.capital,0),end=a.reduce((s,r)=>s+r.end,0),win=tr.filter(t=>t.net>0).length,gw=tr.filter(t=>t.net>0).reduce((s,t)=>s+t.net,0),gl=Math.abs(tr.filter(t=>t.net<0).reduce((s,t)=>s+t.net,0));return {id,start,end,profit:end-start,ret:(end/start-1)*100,trades:tr.length,win:tr.length?win/tr.length*100:0,pf:gl?gw/gl:gw?Infinity:0,dd:Math.max(...a.map(r=>r.maxDD))}});
 $('summary').innerHTML=agg.map(a=>'<div class="metric"><small>'+NAMES[a.id]+'</small><b class="'+(a.profit>=0?'up':'down')+'">'+fmt(a.profit)+'</b><small>'+pct(a.ret)+' · '+a.trades+' Trades</small></div>').join('');
 $('totals').innerHTML=agg.map(a=>'<tr><td>'+a.id+' · '+NAMES[a.id].split('· ')[1]+'</td><td class="'+(a.profit>=0?'up':'down')+'">'+fmt(a.profit)+'</td><td>'+pct(a.ret)+'</td><td>'+pct(a.win)+'</td><td>'+(Number.isFinite(a.pf)?a.pf.toFixed(2):'∞')+'</td><td>'+a.trades+'</td><td>'+pct(-a.dd)+'</td></tr>').join('');
 $('coins').innerHTML=ids.map(id=>'<div><h3>'+NAMES[id]+'</h3>'+results.filter(r=>r.id===id).map(r=>'<div class="coin-card"><div class="coin-title"><b>'+r.symbol.replace('USDT','')+'</b><strong class="'+(r.profit>=0?'up':'down')+'">'+fmt(r.profit)+'</strong></div><div class="coin-meta">'+r.trades.length+' Trades · Treffer '+pct(r.winRate)+' · PF '+(Number.isFinite(r.pf)?r.pf.toFixed(2):'∞')+' · DD '+pct(-r.maxDD)+' · '+r.signals+' Signale</div></div>').join('')+'</div>').join('');
 const all=results.flatMap(r=>r.trades.map(t=>({...t,id:r.id}))).sort((a,b)=>b.buy.localeCompare(a.buy)).slice(0,50);
 $('trades').innerHTML='<div class="trade-list">'+(all.map(t=>'<div class="trade"><div class="trade-top"><b>'+t.id+' · '+t.symbol.replace('USDT','')+'</b><strong class="'+(t.net>=0?'up':'down')+'">'+fmt(t.net)+'</strong></div><span>'+t.buy+' → '+t.sell+' · '+t.reason+' · '+pct(t.ret)+'</span></div>').join('')||'<div class="empty">Keine Trades nach diesen Regeln.</div>')+'</div>';
 $('period').textContent=period+' · Tageskerzen';
}
async function run(){const b=$('run'),s=$('status');b.disabled=true;b.textContent='DATEN WERDEN GELADEN …';s.textContent='Lade identische Tages-/Wochenkerzen und Fear & Greed. Das kann kurz dauern.';
 try{const [fngData,...market]=await Promise.all([get('https://api.alternative.me/fng/?limit=0&format=json'),...ASSETS.map(x=>Promise.all([get(API+'/klines?symbol='+x+'&interval=1d&limit=1000'),get(API+'/klines?symbol='+x+'&interval=1w&limit=500')]))]);const fng=fngMap(fngData.data);if(!fng.size)throw Error('Fear-&-Greed-Historie nicht verfügbar.');const btc=market[0][0].slice(0,-1),results=[];for(const id of ['A','B','C'])for(let j=0;j<ASSETS.length;j++)results.push(simulate(id,ASSETS[j],market[j][0].slice(0,-1),btc,market[j][1].slice(0,-1),fng,1500/ASSETS.length));const dates=market.flatMap(p=>p[0].slice(0,-1).map(x=>+x[0]));render(results,new Date(Math.min(...dates)).toLocaleDateString('de-DE')+' – '+new Date(Math.max(...dates)).toLocaleDateString('de-DE'));s.textContent='Fertig: 3 Strategien × BTC, ETH, SOL und LINK. Gemeinsame historische Tagesdaten; kein Ergebnis ist eine Renditeprognose.'}
 catch(e){s.textContent='Test fehlgeschlagen: '+e.message}
 finally{b.disabled=false;b.textContent='ERNEUT VERGLEICHEN'}}
$('run').addEventListener('click',run);
})();