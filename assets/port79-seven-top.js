
(function(){
'use strict';

const NAV=[
 ['attendance','🕒','考勤','../attendance/'],
 ['workhours','📊','工時統計','../work-hours/'],
 ['leave','📝','請假','../leave/'],
 ['schedule','📅','排班','../schedule/'],
 ['efficiency','🚢','效率','../aqc-efficiency/'],
 ['hr','👥','人資','../hr/'],
 ['history','🗄️','歷史資料','../history-data/']
];
const SYSTEMS=[
 ['attendance','考勤'],['workhours','工時統計'],['leave','請假'],
 ['schedule','排班'],['efficiency','效率'],['hr','人資'],['history','歷史資料']
];
let timer=null,busy=false,lastSig='';

function currentSystem(){
 const body=String(document.body?.dataset?.p79System||'').toLowerCase();
 if(body==='workhours'||body==='work-hours')return 'workhours';
 if(['attendance','leave','schedule','efficiency','hr','history'].includes(body))return body;
 const p=location.pathname.toLowerCase();
 if(p.includes('/work-hours/'))return 'workhours';
 if(p.includes('/attendance/'))return 'attendance';
 if(p.includes('/leave/'))return 'leave';
 if(p.includes('/schedule/'))return 'schedule';
 if(p.includes('/aqc-efficiency/'))return 'efficiency';
 if(p.includes('/hr/'))return 'hr';
 if(p.includes('/history-data/'))return 'history';
 return '';
}
function gasUrl(){
 try{if(typeof GAS_URL!=='undefined'&&GAS_URL)return String(GAS_URL)}catch(e){}
 try{if(window.GAS_URL)return String(window.GAS_URL)}catch(e){}
 try{
   for(const k of ['port79_gas_url','gasUrl','GAS_URL']){
     const v=sessionStorage.getItem(k)||localStorage.getItem(k);
     if(v&&/script\.google\.com/i.test(v))return v;
   }
 }catch(e){}
 return '';
}
function mount(){
 if(document.getElementById('p79SevenTop'))return;
 const current=currentSystem();
 const root=document.createElement('div');
 root.id='p79SevenTop';
 root.innerHTML=`<nav id="p79SevenNav">${NAV.map(n=>`<a class="${n[0]===current?'active':''}" href="${n[3]}">${n[1]} ${n[2]}</a>`).join('')}</nav>
 <div id="p79SevenStatus"><span class="cloud-title">☁️ 雲端</span>${SYSTEMS.map(([k,l])=>`<span class="sys" data-sys="${k}" data-state="idle"><b>${l}</b><span>● 待命</span></span>`).join('')}</div>`;
 document.body.insertBefore(root,document.body.firstChild);
}
function render(data){
 const systems={...(data?.systems||{})};
 if(!systems.workhours&&systems.attendance)systems.workhours=systems.attendance;

 const sig=SYSTEMS.map(([k])=>{
   const s=systems[k]||{},a=Array.isArray(s.active)?s.active:[],j=a[0]||{},last=s.lastCompleted||{};
   return [k,a.length,j.operation,j.action,j.label,last.ok,last.action,Math.floor(Number(last.ageMs||0)/10000)].join(':');
 }).join('|');
 if(sig===lastSig)return;
 lastSig=sig;

 SYSTEMS.forEach(([k,label])=>{
   const el=document.querySelector(`#p79SevenStatus [data-sys="${k}"]`);
   if(!el)return;
   const s=systems[k]||{}, active=Array.isArray(s.active)?s.active:[];
   const span=el.querySelector('span');
   let state='idle',txt='● 待命';
   if(active.length){
     const j=active.find(x=>x.operation==='write')||active.find(x=>x.operation==='read')||active[0]||{};
     state='busy';
     txt=(j.operation==='write'?'✍️ ':'↙ ')+(j.operationLabel||'讀取')+'中｜'+(j.label||j.action||'雲端資料');
   }else if(s.lastCompleted&&Number(s.lastCompleted.ageMs||0)<15000){
     state=s.lastCompleted.ok===false?'error':'done';
     txt=(state==='done'?'✓ ':'! ')+(s.lastCompleted.operationLabel||'讀取')+'完成';
   }
   if(el.dataset.state!==state)el.dataset.state=state;
   if(span.textContent!==txt)span.textContent=txt;
 });
}
async function poll(){
 if(busy||document.visibilityState==='hidden')return;
 const url=gasUrl(); if(!url)return;
 busy=true;
 let ctrl=null,to=null;
 try{
   ctrl=new AbortController();
   to=setTimeout(()=>ctrl.abort(),4500);
   const res=await fetch(url+(url.includes('?')?'&':'?')+'action=getCloudActivity&_='+Date.now(),{cache:'no-store',signal:ctrl.signal});
   const data=await res.json();
   if(data?.ok)render(data);
 }catch(e){}finally{
   if(to)clearTimeout(to);
   busy=false;
 }
}
function start(){
 mount();
 poll();
 timer=setInterval(()=>{if(document.visibilityState==='visible')poll()},15000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
