(function(){
'use strict';
if(window.Port79DataCache)return;

const DB_NAME='port79-system-cache-v1';
const DB_VERSION=1;
const STORE='snapshots';
const MAX_FALLBACK_AGE_MS=10*60*1000;
const NETWORK_GRACE_MS=900;
const READ_ACTIONS=new Set([
 'getAttendanceCoreData','getAttendanceMonthData','getAttendanceMonths','getAttendanceEmployeeMaster',
 'getLeaveData','getScheduleDataSecure','getScheduleData','getData','gcGetData','getHistoricalDataCatalog',
 'historyGetMonthData','hrGetEmployees','getEmployeeSnapshot'
]);
const SYSTEM_LABELS={attendance:'考勤',workhours:'工時統計',leave:'請假',schedule:'排班',efficiency:'效率',hr:'人資',history:'歷史資料'};

function currentSystem(){
 const p=location.pathname.toLowerCase();
 if(p.includes('/work-hours/'))return 'workhours';if(p.includes('/attendance/'))return 'attendance';
 if(p.includes('/leave/'))return 'leave';if(p.includes('/schedule/'))return 'schedule';
 if(p.includes('/aqc-efficiency/'))return 'efficiency';if(p.includes('/hr/'))return 'hr';
 if(p.includes('/history-data/'))return 'history';return 'attendance';
}
function token(){try{return String(sessionStorage.getItem('port79_gc_superadmin_token')||sessionStorage.getItem('port79_admin_token')||sessionStorage.getItem('port79_user_token')||'').trim()}catch(e){return''}}
function viewerKey(){
 try{
  const s=JSON.parse(sessionStorage.getItem('port79_user_session')||sessionStorage.getItem('admin_session')||'null');
  const id=String(s?.empId||sessionStorage.getItem('aqc_admin_id')||sessionStorage.getItem('port79_leave_emp_id')||'guest').trim().toUpperCase()||'guest';
  const role=String(s?.adminRole||s?.role||sessionStorage.getItem('aqc_admin_role')||'employee').toLowerCase();
  return id+'@'+role;
 }catch(e){return 'guest@employee'}
}
function gasUrl(){
 try{if(typeof GAS_URL!=='undefined'&&GAS_URL)return String(GAS_URL)}catch(e){}
 try{if(window.GAS_URL)return String(window.GAS_URL)}catch(e){}
 try{for(const k of ['port79_gas_url','gasUrl','GAS_URL']){const v=sessionStorage.getItem(k)||localStorage.getItem(k);if(v&&/script\.google\.com/i.test(v))return v}}catch(e){}
 return '';
}
function ymNow(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`}
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'key'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function put(row){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(row);tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>{db.close();reject(tx.error)}})}
async function get(key){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get(key);r.onsuccess=()=>{db.close();resolve(r.result||null)};r.onerror=()=>{db.close();reject(r.error)}})}
async function all(){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).getAll();r.onsuccess=()=>{db.close();resolve(r.result||[])};r.onerror=()=>{db.close();reject(r.error)}})}
async function clear(){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).clear();tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>{db.close();reject(tx.error)}})}
function safeSize(obj){try{return new Blob([JSON.stringify(obj)]).size}catch(e){return 0}}
function fmtBytes(n){n=Number(n||0);if(n<1024)return n+' B';if(n<1024*1024)return (n/1024).toFixed(1)+' KB';return (n/1024/1024).toFixed(2)+' MB'}
function fmtTime(ts){if(!ts)return'尚未下載';try{return new Date(ts).toLocaleString('zh-TW',{hour12:false})}catch(e){return String(ts)}}
function actionKey(urlLike){
 try{
  const u=new URL(String(urlLike),location.href);const action=u.searchParams.get('action')||'';
  if(!READ_ACTIONS.has(action))return null;
  const parts=[action];['month','year','scope','type','includeEmployees'].forEach(k=>{const v=u.searchParams.get(k);if(v)parts.push(k+'='+v)});
  return viewerKey()+'|api|'+parts.join('|');
 }catch(e){return null}
}
function systemKey(sys){return viewerKey()+'|system|'+sys}
async function storeApi(url,data,sys=''){
 const key=actionKey(url);if(key)await put({key,kind:'api',system:sys||currentSystem(),savedAt:Date.now(),size:safeSize(data),data});
 if(sys)await put({key:systemKey(sys),kind:'system',system:sys,savedAt:Date.now(),size:safeSize(data),data});
}
function jsonResponse(data){return new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json;charset=UTF-8','X-PORT79-CACHE':'1'}})}

// Conservative cache fallback: normal network still goes first. Only if it has not returned within 900ms,
// and a <=10min cache exists, show the cached read result while the live request continues in background.
const nativeFetch=window.fetch.bind(window);
window.fetch=async function(input,init){
 const method=String(init?.method||'GET').toUpperCase();
 const url=typeof input==='string'?input:input?.url;
 const key=method==='GET'?actionKey(url):null;
 if(!key)return nativeFetch(input,init);
 let cached=null;try{cached=await get(key)}catch(e){}
 const network=nativeFetch(input,init).then(async r=>{
  try{if(r.ok){const c=r.clone();const d=await c.json();if(d&&d.ok!==false)await storeApi(url,d)}}catch(e){}
  return r;
 });
 if(!cached||Date.now()-Number(cached.savedAt||0)>MAX_FALLBACK_AGE_MS)return network;
 const winner=await Promise.race([
  network.then(r=>({type:'network',r})).catch(e=>({type:'error',e})),
  new Promise(resolve=>setTimeout(()=>resolve({type:'cache'}),NETWORK_GRACE_MS))
 ]);
 if(winner.type==='network')return winner.r;
 if(winner.type==='error')return jsonResponse(cached.data);
 network.catch(()=>{});
 return jsonResponse(cached.data);
};

function buildUrl(action,params={}){
 const base=gasUrl();if(!base)throw new Error('找不到 Google Apps Script 網址');
 const u=new URL(base);u.searchParams.set('action',action);Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,String(v))});u.searchParams.set('_',Date.now());return u.toString();
}
async function fetchJson(action,params={},sys=''){
 const url=buildUrl(action,params);const c=new AbortController();const to=setTimeout(()=>c.abort(),30000);
 try{const r=await nativeFetch(url,{cache:'no-store',signal:c.signal});const raw=await r.text();if(!r.ok)throw new Error('HTTP '+r.status);let d;try{d=JSON.parse(raw)}catch(e){throw new Error('GAS 回傳不是 JSON')};if(d?.ok===false)throw new Error(d.error||'雲端讀取失敗');await storeApi(url,d,sys);return d}finally{clearTimeout(to)}
}
async function downloadSystem(sys){
 const t=token(),m=ymNow();
 if(sys==='attendance')return fetchJson('getAttendanceCoreData',{month:m,includeEmployees:'1'},sys);
 if(sys==='workhours')return fetchJson('getAttendanceCoreData',{month:m,includeEmployees:'1'},sys);
 if(sys==='leave')return fetchJson('getLeaveData',{token:t},sys);
 if(sys==='schedule')return fetchJson('getScheduleDataSecure',{token:t},sys);
 if(sys==='efficiency')return fetchJson('gcGetData',{token:t,month:m,scope:'month'},sys);
 if(sys==='hr')return fetchJson('hrGetEmployees',{token:t},sys);
 if(sys==='history'){
  const catalog=await fetchJson('getHistoricalDataCatalog',{token:t},sys);
  // 同時預抓目前月份三種歷史頁，失敗不阻斷目錄快取。
  for(const type of ['attendance','schedule','vessel']){try{await fetchJson('historyGetMonthData',{token:t,type,month:m},sys)}catch(e){}}
  return catalog;
 }
 throw new Error('未知系統：'+sys);
}
async function downloadAll(onProgress){
 const systems=['attendance','workhours','leave','schedule','efficiency','hr','history'];const result=[];
 for(let i=0;i<systems.length;i++){
  const sys=systems[i];onProgress?.(sys,i,systems.length,'loading');
  try{await downloadSystem(sys);result.push({system:sys,ok:true});onProgress?.(sys,i,systems.length,'done')}
  catch(e){result.push({system:sys,ok:false,error:String(e?.message||e)});onProgress?.(sys,i,systems.length,'error',e)}
 }
 return result;
}

function ensureStyle(){if(document.getElementById('p79CacheStyle'))return;const s=document.createElement('style');s.id='p79CacheStyle';s.textContent=`
#p79CacheBackdrop{position:fixed;inset:0;z-index:16000;background:rgba(2,6,23,.5);display:none;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(5px)}
#p79CacheBackdrop.open{display:flex}#p79CacheModal{width:min(780px,100%);max-height:min(84vh,820px);overflow:auto;background:#fff;color:#0f172a;border-radius:22px;border:1px solid #e2e8f0;box-shadow:0 30px 80px rgba(2,6,23,.35);padding:18px}
.dark #p79CacheModal{background:#0f172a;color:#e2e8f0;border-color:#334155}.p79-cache-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.p79-cache-title{font-size:20px;font-weight:950}.p79-cache-sub{font-size:11px;color:#64748b;margin-top:3px}.dark .p79-cache-sub{color:#94a3b8}.p79-cache-close{border:1px solid #cbd5e1;background:#fff;border-radius:10px;width:36px;height:36px;font-weight:900}.dark .p79-cache-close{background:#111827;color:#e5e7eb;border-color:#475569}
.p79-cache-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.p79-cache-row{border:1px solid #e2e8f0;border-radius:14px;padding:11px 12px;background:#f8fafc}.dark .p79-cache-row{background:#111827;border-color:#334155}.p79-cache-row b{display:block;font-size:13px}.p79-cache-meta{font-size:11px;color:#64748b;margin-top:5px;line-height:1.45}.dark .p79-cache-meta{color:#94a3b8}.p79-cache-state{font-size:11px;font-weight:900;margin-top:5px;color:#047857}.p79-cache-state.error{color:#be123c}.p79-cache-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:15px;padding-top:14px;border-top:1px solid #e2e8f0}.dark .p79-cache-actions{border-color:#334155}.p79-cache-btn{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:12px;padding:10px 13px;font-size:12px;font-weight:900;cursor:pointer}.p79-cache-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff}.p79-cache-btn.all{background:#0f766e;border-color:#0f766e;color:#fff}.p79-cache-btn.danger{color:#be123c}.p79-cache-btn:disabled{opacity:.5;cursor:not-allowed}.dark .p79-cache-btn:not(.primary):not(.all){background:#111827;color:#e2e8f0;border-color:#475569}.p79-cache-note{margin-top:12px;padding:10px 12px;border-radius:12px;background:#eff6ff;color:#1e40af;font-size:11px;line-height:1.55}.dark .p79-cache-note{background:rgba(30,64,175,.18);color:#bfdbfe}
@media(max-width:680px){.p79-cache-grid{grid-template-columns:1fr}#p79CacheModal{padding:14px}}
`;document.head.appendChild(s)}
function ensureModal(){
 ensureStyle();let b=document.getElementById('p79CacheBackdrop');if(b)return b;
 b=document.createElement('div');b.id='p79CacheBackdrop';b.innerHTML=`<div id="p79CacheModal" role="dialog" aria-modal="true"><div class="p79-cache-head"><div><div class="p79-cache-title">☁️ 資料快取中心</div><div class="p79-cache-sub">資料存於此瀏覽器 IndexedDB；不是公開 GitHub 資料。</div></div><button class="p79-cache-close" type="button">✕</button></div><div id="p79CacheRows" class="p79-cache-grid"></div><div class="p79-cache-actions"><button class="p79-cache-btn primary" data-cache-action="current">下載目前系統資料</button><button class="p79-cache-btn all" data-cache-action="all">下載七大系統常用資料</button><button class="p79-cache-btn danger" data-cache-action="clear">清除本機快取</button></div><div id="p79CacheProgress" class="p79-cache-note">平常仍以即時雲端資料為主；網路回應較慢時，10 分鐘內的快取可先協助顯示，再由背景更新。</div></div>`;
 document.body.appendChild(b);b.querySelector('.p79-cache-close').onclick=()=>b.classList.remove('open');b.addEventListener('click',e=>{if(e.target===b)b.classList.remove('open')});
 b.addEventListener('click',async e=>{const btn=e.target.closest('[data-cache-action]');if(!btn)return;const act=btn.dataset.cacheAction;const buttons=[...b.querySelectorAll('[data-cache-action]')];buttons.forEach(x=>x.disabled=true);try{
   if(act==='clear'){if(confirm('確定清除此瀏覽器的七大系統本機快取？')){await clear();setProgress('已清除本機快取。');await refreshModal()}}
   if(act==='current'){const sys=currentSystem();setProgress(`正在下載 ${SYSTEM_LABELS[sys]}…`);await downloadSystem(sys);setProgress(`✅ ${SYSTEM_LABELS[sys]} 快取完成。`);await refreshModal()}
   if(act==='all'){const res=await downloadAll((sys,i,total,state)=>{setProgress(`${state==='error'?'⚠️':'⬇️'} ${i+1}/${total} ${SYSTEM_LABELS[sys]} ${state==='loading'?'下載中…':state==='done'?'完成':'失敗'}`)});const ok=res.filter(x=>x.ok).length;const bad=res.filter(x=>!x.ok);setProgress(`完成：${ok}/7 個系統${bad.length?'；未完成：'+bad.map(x=>SYSTEM_LABELS[x.system]).join('、'):''}`);await refreshModal()}
  }catch(err){setProgress('❌ '+String(err?.message||err))}finally{buttons.forEach(x=>x.disabled=false)}});
 return b;
}
function setProgress(t){const e=document.getElementById('p79CacheProgress');if(e)e.textContent=t}
async function refreshModal(){
 const rows=document.getElementById('p79CacheRows');if(!rows)return;const data=await all();const v=viewerKey();rows.innerHTML=Object.keys(SYSTEM_LABELS).map(sys=>{const r=data.filter(x=>x.key===v+'|system|'+sys).sort((a,b)=>b.savedAt-a.savedAt)[0];return `<div class="p79-cache-row" data-cache-system="${sys}"><b>${SYSTEM_LABELS[sys]}</b><div class="p79-cache-meta">最後快取：${fmtTime(r?.savedAt)}<br>大小：${r?fmtBytes(r.size):'--'}</div><div class="p79-cache-state">${r?'✓ 已有本機快取':'○ 尚未下載'}</div></div>`}).join('')
}
async function openCenter(){const b=ensureModal();b.classList.add('open');await refreshModal()}

window.Port79DataCache={openCenter,downloadSystem,downloadAll,clear,all,get,put,currentSystem,viewerKey};
})();
