'use strict';
const API='https://data-api.binance.vision/api/v3';
const $=id=>document.getElementById(id);
const fmt=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(n);
const FEE=.001, SLIP=.0005, CAPITAL=1500;
async function get(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Binance HTTP '+r.status);return r.json()}
async function candles(){let out=[],end=Date.now();while(out.length<18000){const n=Math.min(1000,18000-out.length),u=API+'/klines?symbol=SOLUSDT&interval=1h&limit='+n+'&endTime='+end,b=await get(u);if(!b.length)break;out=[...b,...out];end=+b[0][0]-1;if(b.length<n)break}return out.slice(-18000,-1)}
function indicators(c){
 const n=c.length,cl=c.map(x=>+x[4]),rsi=Array(n).fill(null),atr=Array(n).fill(null),lower=Array(n).fill(null),stoch=Array(n).fill(null);
 let g=0,l=0,ag=0,al=0;
 for(let i=1;i<n;i++){const d=cl[i]-cl[i-1];if(i<=14){g+=Math.max(d,0);l+=Math.max(-d,0);if(i===14){ag=g/14;al=l/14}}else{ag=(ag*13+Math.max(d,0))/14;al=(al*13+Math.max(-d,0))/14}if(i>=14)rsi[i]=al===0?100:100-100/(1+ag/al);
 if(i>=14){let tr=[];for(let j=i-13;j<=i;j++){const prev=cl[j-1];tr.push(Math.max(+c[j][2]-+c[j][3],Math.abs(+c[j][2]-prev),Math.abs(+c[j][3]-prev)))}atr[i]=tr.reduce((a,b)=>a+b,0)/14}
 if(i>=19){const a=cl.slice(i-19,i+1),m=a.reduce((x,y)=>x+y,0)/20,sd=Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/20);lower[i]=m-2*sd}
 if(i>=16){const hi=Math.max(...c.slice(i-13,i+1).map(x=>+x[2])),lo=Math.min(...c.slice(i-13,i+1).map(x=>+x[3]));stoch[i]=hi===lo?50:(+c[i][4]-lo)/(hi-lo)*100}
 }
 return {cl,rsi,atr,lower,stoch};
}
function run(c,d,start,end,mode){
 let cash=CAPITAL,pos=null,trades=[];
 for(let i=start;i<end;i++){
  const o=+c[i][1],h=+c[i][2],l=+c[i][3],close=+c[i][4],a=d.atr[i];
  if(pos){
   let exit=null,why='';
   if(l<=pos.stop){exit=Math.min(o,pos.stop);why='ATR-STOP'}
   else if(h>=pos.target){exit=Math.max(o,pos.target);why='KURSZIEL 3R'}
   else if(i-pos.i>=72){exit=close;why='ZEIT-EXIT 72h'}
   else if(pos.trail && close<pos.high-1.5*a){exit=close;why='TRAILING-EXIT'}
   if(exit!==null){const fill=exit*(1-SLIP),fee=pos.qty*fill*FEE,net=pos.qty*(fill-pos.fill)-pos.fee-fee;cash+=pos.stake+net;trades.push({net,reason:why,entry:pos.entry,exit,entryTime:pos.time,exitTime:+c[i][0]});pos=null}
   else {pos.high=Math.max(pos.high,h);if(pos.high>=pos.entry+pos.risk){pos.trail=true;pos.stop=Math.max(pos.stop,pos.high-2*d.atr[i])}}
  }
  if(!pos && i+1<end){
   const extreme=d.rsi[i]!==null&&d.rsi[i]<20;
   const confirm=extreme&&d.lower[i]!==null&&close<d.lower[i]&&d.stoch[i]!==null&&d.stoch[i]<10;
   if(mode==='RSI20'?extreme:confirm){
    const next=+c[i+1][1],fill=next*(1+SLIP),stop=fill-1.5*a,risk=fill-stop;
    if(risk>0){const budget=cash*.01,qty=Math.min(budget/risk,(cash*.5)/(fill*(1+FEE))),stake=qty*fill*(1+FEE),fee=qty*fill*FEE;
     if(qty>0&&stake<=cash){pos={i:i+1,time:+c[i+1][0],entry:next,fill,stop,target:fill+3*risk,risk,qty,stake,fee,high:next,trail:false};cash-=stake}
    }
   }
  }
 }
 if(pos){const exit=+c[end-1][4],fill=exit*(1-SLIP),fee=pos.qty*fill*FEE,net=pos.qty*(fill-pos.fill)-pos.fee-fee;cash+=pos.stake+net;trades.push({net,reason:'FENSTERENDE',entry:pos.entry,exit,entryTime:pos.time,exitTime:+c[end-1][0]})}
 const wins=trades.filter(t=>t.net>0),loss=trades.filter(t=>t.net<0),gw=wins.reduce((s,t)=>s+t.net,0),gl=Math.abs(loss.reduce((s,t)=>s+t.net,0));
 return {net:trades.reduce((s,t)=>s+t.net,0),gw,gl,ratio:gl?gw/gl:gw?Infinity:0,trades:trades.length,wins:wins.length,losses:loss.length,pf:gl?gw/gl:gw?Infinity:0,details:trades};
}
function euro(n){return fmt(n)}
function render(rows){$('results').innerHTML=rows.map(r=>'<tr><td>'+r.fold+'</td><td>'+r.variant+'</td><td>'+r.trades+'</td><td>'+r.wins+' / '+r.losses+'</td><td class="'+(r.gw>=0?'up':'')+'">'+euro(r.gw)+'</td><td class="down">'+euro(-r.gl)+'</td><td class="'+(r.net>=0?'up':'down')+'">'+euro(r.net)+'</td><td>'+r.ratio.toFixed(2)+'</td></tr>').join('');const total={};for(const r of rows){let x=total[r.variant]||(total[r.variant]={gw:0,gl:0,net:0,n:0});x.gw+=r.gw;x.gl+=r.gl;x.net+=r.net;x.n+=r.trades} $('totals').innerHTML=Object.entries(total).map(([k,v])=>'<tr><td>'+k+'</td><td>'+v.n+'</td><td>'+euro(v.gw)+'</td><td>'+euro(-v.gl)+'</td><td class="'+(v.net>=0?'up':'down')+'">'+euro(v.net)+'</td><td>'+(v.gl?v.gw/v.gl:0).toFixed(2)+'</td></tr>').join('')}
async function start(){const b=$('run');b.disabled=true;$('status').textContent='Lade SOL/USDT 1h von Binance …';try{const c=await candles();if(c.length<11000)throw Error('Zu wenig Kerzen für vier vollständige Walk-forward-Fenster.');const d=indicators(c),train=365*24,test=90*24,first=train+220,rows=[];for(let f=0;f<4;f++){const s=first+f*test,e=Math.min(s+test,c.length-1);for(const mode of ['RSI20','RSI20 + BB + Stoch']){const r=run(c,d,s,e,mode);rows.push({fold:'WF '+(f+1),variant:mode,...r})}}render(rows);$('status').textContent='Fertig: '+c.length.toLocaleString('de-DE')+' SOL/USDT-Stundenkerzen. Gebühren 0,10 % und Slippage 0,05 % je Seite. Alle Fenster mit eigenem 1.500-€-Konto.'}catch(e){$('status').textContent='Test fehlgeschlagen: '+e.message}finally{b.disabled=false}}
$('run').addEventListener('click',start);