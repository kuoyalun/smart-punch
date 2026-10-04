
(function(){
'use strict';

const META={
 attendance:['🕒','考勤系統','員工打卡・考勤紀錄・即時動態'],
 workhours:['📊','工時統計','出勤統計・加班統計・月結工時'],
 leave:['📝','請假系統','請假申請・審核・特休資訊'],
 schedule:['📅','排班系統','人員班表・組別・今日出勤'],
 efficiency:['🚢','效率系統','船舶作業・效率統計・月報比對'],
 hr:['👥','人資系統','員工主檔・部門職稱・權限設定'],
 history:['🗄️','歷史資料','考勤・排班・船舶歷史查詢']
};
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

let statusBusy=false,statusTimer=null,lastSignature='';

function currentSystem(){
 const p=location.pathname.toLowerCase();
 if(p.includes('/work-hours/'))return 'workhours';
 if(p.includes('/attendance/'))return 'attendance';
 if(p.includes('/leave/'))return 'leave';
 if(p.includes('/schedule/'))return 'schedule';
 if(p.includes('/aqc-efficiency/'))return 'efficiency';
 if(p.includes('/hr/'))return 'hr';
 if(p.includes('/history-data/'))return 'history';

 const b=String(document.body?.dataset?.p79System||'').toLowerCase();
 if(b==='work-hours')return 'workhours';
 return META[b]?b:'attendance';
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
function roleText(){
 try{
  const s=JSON.parse(sessionStorage.getItem('port79_user_session')||sessionStorage.getItem('admin_session')||'null');
  const r=String(s?.adminRole||s?.role||sessionStorage.getItem('aqc_admin_role')||'').toLowerCase();
  return r==='superadmin'?'超級管理員':r==='admin'?'管理員':'一般員工';
 }catch(e){return '登入使用者'}
}
function logoutHome(){
 try{
  ['admin_session','aqc_admin_logged_in','aqc_admin_id','aqc_admin_role','aqc_admin_name',
   'aqc_admin_active_tab','port79_admin_token','port79_user_token','port79_gc_token',
   'port79_gc_superadmin_token','port79_sso_verified','p79_workhours_permission']
  .forEach(k=>{try{sessionStorage.removeItem(k)}catch(e){}});
 }catch(e){}
 location.replace('../?logout=1&t='+Date.now());
}
window.p79LogoutToSevenSystemHome=logoutHome;

function makeDefaultMenu(current){
 const menu=document.createElement('div');
 menu.className='p79-seven-default-menu';
 menu.id='p79SevenDefaultMenu';
 const add=(label,fn,cls='')=>{
  const b=document.createElement('button');
  b.type='button';b.className='menu-item '+cls;b.textContent=label;b.addEventListener('click',()=>{closeMenu();fn()});
  menu.appendChild(b);
 };
 if(current==='leave'){
  add('⟳ 重新整理',()=>{try{if(typeof window.p79UnifiedRefresh==='function')return window.p79UnifiedRefresh()}catch(e){}location.reload()});
  add('✎ 編輯模式',()=>{try{window.p79ToggleUnifiedEditMode?.()}catch(e){}});
  add('◐ 深淺色',()=>{try{if(typeof window.p79UnifiedTheme==='function')return window.p79UnifiedTheme();document.getElementById('themeBtn')?.click()}catch(e){}});
 }else if(current==='history'){
  add('🗄️ 讀取目前月份',()=>document.getElementById('loadBtn')?.click());
 }else{
  add('⟳ 重新整理',()=>location.reload());
 }
 const sep=document.createElement('div');sep.className='sep';menu.appendChild(sep);
 add('⌂ 返回首頁',()=>location.href='../');
 add('↪ 登出',logoutHome,'danger');
 return menu;
}
function openMenu(e){
 e?.stopPropagation();
 const menu=document.querySelector('#p79SevenMenuWrap>.p79v103-menu,#p79SevenMenuWrap>#p79SystemMenu,#p79SevenMenuWrap>#p79HrSystemMenu,#p79SevenDefaultMenu');
 if(!menu)return;
 menu.classList.toggle('open');
}
function closeMenu(){
 document.querySelector('#p79SevenMenuWrap>.open')?.classList.remove('open');
}

function extractNativeMenu(current,wrap){
 const get=()=>document.getElementById(current==='hr'?'p79HrSystemMenu':'p79SystemMenu');
 const tryAttach=()=>{
  const native=get();
  if(native && native.parentElement!==wrap){
   native.classList.remove('open');
   wrap.appendChild(native);

   if(current==='schedule' && !native.querySelector('[data-p79-lock-menu]')){
    const lock=document.createElement('button');
    lock.type='button';lock.dataset.p79LockMenu='1';lock.textContent='🔒 鎖定／解除編輯';
    lock.addEventListener('click',()=>{closeMenu();try{window.p79ToggleScheduleLock?.()}catch(e){}});
    native.insertBefore(lock,native.firstChild);
   }
   if(!Array.from(native.querySelectorAll('button')).some(b=>/登出/.test(b.textContent||''))){
    const sep=document.createElement('div');sep.className='p79v103-menu-sep';native.appendChild(sep);
    const logout=document.createElement('button');logout.type='button';logout.className='danger';logout.textContent='↪ 登出';
    logout.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();logoutHome()});
    native.appendChild(logout);
   }
   return true;
  }
  return false;
 };
 if(tryAttach())return;
 setTimeout(()=>{ if(!tryAttach() && !wrap.querySelector('.p79-seven-default-menu')) wrap.appendChild(makeDefaultMenu(current)); },120);
 setTimeout(()=>{ if(!wrap.querySelector('#p79SystemMenu,#p79HrSystemMenu,.p79-seven-default-menu')) wrap.appendChild(makeDefaultMenu(current)); },450);
}

function mount(){
 if(document.getElementById('p79SevenTop'))return;
 const current=currentSystem(),m=META[current]||META.attendance;

 const root=document.createElement('div');
 root.id='p79SevenTop';
 root.innerHTML=`
 <div class="top-row">
  <div class="brand">
   <div class="logo">${m[0]}</div>
   <div><div class="brand-name">${m[1]}</div><div class="brand-sub">79號碼頭雲端智慧系統｜${roleText()}｜${m[2]}</div></div>
  </div>
  <nav id="p79SevenNav">${NAV.map(n=>`<a class="${n[0]===current?'active':''}" href="${n[3]}">${n[1]} ${n[2]}</a>`).join('')}</nav>
  <div class="action"><div id="p79SevenMenuWrap"><button id="p79SevenMenuButton" type="button">☰ 功能選單</button></div></div>
 </div>
 <div id="p79SevenStatus"><span class="cloud-title">☁️ 雲端</span>${SYSTEMS.map(([k,l])=>`<span class="sys" data-sys="${k}" data-state="idle"><b>${l}</b><span>● 待命</span></span>`).join('')}</div>`;
 document.body.insertBefore(root,document.body.firstChild);

 document.getElementById('p79SevenMenuButton')?.addEventListener('click',openMenu);
 extractNativeMenu(current,document.getElementById('p79SevenMenuWrap'));
 document.addEventListener('click',e=>{if(!e.target?.closest?.('#p79SevenMenuWrap'))closeMenu()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
}
function render(data){
 const systems={...(data?.systems||{})};
 if(!systems.workhours&&systems.attendance)systems.workhours=systems.attendance;

 const signature=SYSTEMS.map(([k])=>{
  const s=systems[k]||{},a=Array.isArray(s.active)?s.active:[],j=a[0]||{},last=s.lastCompleted||{};
  return [k,a.length,j.operation,j.action,j.label,last.ok,last.action,Math.floor(Number(last.ageMs||0)/10000)].join(':');
 }).join('|');
 if(signature===lastSignature)return;
 lastSignature=signature;

 SYSTEMS.forEach(([k])=>{
  const el=document.querySelector(`#p79SevenStatus [data-sys="${k}"]`);
  if(!el)return;
  const span=el.querySelector('span'),s=systems[k]||{},a=Array.isArray(s.active)?s.active:[];
  let state='idle',txt='● 待命';
  if(a.length){
   const j=a.find(x=>x.operation==='write')||a.find(x=>x.operation==='read')||a[0]||{};
   state='busy';txt=(j.operation==='write'?'✍️ ':'↙ ')+(j.operationLabel||'讀取')+'中｜'+(j.label||j.action||'雲端資料');
  }else if(s.lastCompleted&&Number(s.lastCompleted.ageMs||0)<15000){
   state=s.lastCompleted.ok===false?'error':'done';
   txt=(state==='done'?'✓ ':'! ')+(s.lastCompleted.operationLabel||'讀取')+'完成';
  }
  el.dataset.state=state;
  if(span.textContent!==txt)span.textContent=txt;
 });
}
async function poll(){
 if(statusBusy||document.visibilityState==='hidden')return;
 const url=gasUrl();if(!url)return;
 statusBusy=true;
 let ctrl,to;
 try{
  ctrl=new AbortController();to=setTimeout(()=>ctrl.abort(),4500);
  const r=await fetch(url+(url.includes('?')?'&':'?')+'action=getCloudActivity&_='+Date.now(),{cache:'no-store',signal:ctrl.signal});
  const d=await r.json();if(d?.ok)render(d);
 }catch(e){}finally{if(to)clearTimeout(to);statusBusy=false}
}
function start(){
 mount();poll();
 statusTimer=setInterval(()=>{if(document.visibilityState==='visible')poll()},15000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,20),{once:true});
else setTimeout(start,20);
})();
