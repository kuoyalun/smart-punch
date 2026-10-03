/* PORT79 UI trim: preserve functions, only simplify Excel labels and hide manual refresh buttons. */
(function(){
'use strict';
function apply(root=document){
  const nodes=root.querySelectorAll?root.querySelectorAll('button,a,[role="button"],summary'):[];
  nodes.forEach(el=>{
    const raw=String(el.textContent||'').replace(/\s+/g,' ').trim();
    if(!raw)return;
    if(/^(?:↻|⟳|🔄)?\s*(重新整理|重新更新|更新資料)\s*$/.test(raw) || /^(重新整理|重新更新)$/.test(raw)){
      el.style.setProperty('display','none','important');el.setAttribute('data-port79-hidden-refresh','1');return;
    }
    if(/匯入/i.test(raw)&&/excel/i.test(raw)){
      [...el.childNodes].forEach(n=>{if(n.nodeType===3)n.nodeValue=n.nodeValue.replace(/匯入[^\n]*excel/ig,'匯入')});
      if(String(el.textContent||'').toLowerCase().includes('excel')) el.textContent='匯入';
    }else if(/匯出/i.test(raw)&&/excel/i.test(raw)){
      [...el.childNodes].forEach(n=>{if(n.nodeType===3)n.nodeValue=n.nodeValue.replace(/匯出[^\n]*excel/ig,'匯出')});
      if(String(el.textContent||'').toLowerCase().includes('excel')) el.textContent='匯出';
    }
  });
}
function boot(){apply();new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)apply(n)}))).observe(document.documentElement,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
