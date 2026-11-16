const toast=document.getElementById('toast');
document.querySelectorAll('.bottom-nav button').forEach(button=>{
  button.addEventListener('click',()=>{
    document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.remove('active'));
    button.classList.add('active');
    const tab=button.dataset.tab;
    toast.textContent=tab==='Übersicht'?'Du bist auf der LEO-Übersicht.':`${tab} wird im nächsten Entwicklungsschritt freigeschaltet.`;
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'),2100);
  });
});
if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}