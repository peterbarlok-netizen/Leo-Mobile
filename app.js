const toast=document.getElementById('toast');
document.querySelectorAll('.bottom-nav button').forEach(button=>{
  button.addEventListener('click',()=>{
    document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.remove('active'));
    button.classList.add('active');
    const tab=button.dataset.tab;
    toast.textContent=tab==='Übersicht'?'Du bist auf der LEO-Übersicht.':`${tab}: Dieser Bereich folgt in einem späteren Update.`;
    toast.classList.add('show');
    clearTimeout(window.leoToastTimer);
    window.leoToastTimer=setTimeout(()=>toast.classList.remove('show'),2200);
  });
});
if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}