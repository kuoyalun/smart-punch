/* PORT79 Shared Cloud Cache v2026.10.03
 * Login preload + IndexedDB shared cache + stale-while-revalidate.
 * Read-only GAS actions are cached. Writes invalidate affected caches.
 */
(function(){
'use strict';
if(window.Port79DataCache) return;
const DB_NAME='port79_shared_cloud_cache_v1';
const DB_VERSION=1;
const STORE='responses';
const META='meta';
const FRESH_MS=90*1000;
const MAX_STALE_MS=30*24*60*60*1000;
const READ_ACTIONS=new Set([
  'getAttendanceCoreData','getAttendanceMonthData','getAttendanceEmployeeMaster','getAttendanceMainDirect','getData',
  'getLeaveData','getScheduleDataSecure','getScheduleAttendanceState',
  'gcGetData','gcGetEmployees','gcGetShipMastersDirect','gcGetVesselMonthSnapshot','getHistoricalDataCatalog',
  'hrGetEmployees'
]);
const nativeFetch=window.fetch.bind(window);
let dbPromise=null;
function openDb(){
  if(dbPromise) return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'key'});
      if(!db.objectStoreNames.contains(META)) db.createObjectStore(META,{keyPath:'key'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('IndexedDB open failed'));
  });
  return dbPromise;
}
async function tx(store,mode,fn){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    const t=db.transaction(store,mode), s=t.objectStore(store);
    let out;
    try{ out=fn(s); }catch(e){ reject(e); return; }
    t.oncomplete=()=>resolve(out);
    t.onerror=()=>reject(t.error||new Error('IndexedDB transaction failed'));
    t.onabort=()=>reject(t.error||new Error('IndexedDB transaction aborted'));
  });
}
async function getEntry(key){
  try{
    const db=await openDb();
    return await new Promise((resolve,reject)=>{
      const t=db.transaction(STORE,'readonly'),r=t.objectStore(STORE).get(key);
      r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);
    });
  }catch(e){ return null; }
}
async function putEntry(entry){
  try{ await tx(STORE,'readwrite',s=>s.put(entry)); return true; }catch(e){ return false; }
}
async function deleteMatching(predicate){
  try{
    const db=await openDb();
    await new Promise((resolve,reject)=>{
      const t=db.transaction(STORE,'readwrite'),s=t.objectStore(STORE),r=s.openCursor();
      r.onsuccess=()=>{const c=r.result;if(!c)return;try{if(predicate(c.value))c.delete();}catch(e){}c.continue();};
      t.oncomplete=resolve;t.onerror=()=>reject(t.error);
    });
  }catch(e){}
}
function getSessionUser(){
  try{const s=JSON.parse(sessionStorage.getItem('port79_user_session')||sessionStorage.getItem('admin_session')||'null');return String(s?.empId||s?.id||'').trim().toUpperCase()||'shared';}catch(e){return 'shared';}
}
function gasUrl(){
  try{const s=String(sessionStorage.getItem('port79_gas_url')||'').trim();if(/^https:\/\/script\.google\.com\/macros\/s\//i.test(s))return s;}catch(e){}
  return '';
}
function token(){
  try{return String(sessionStorage.getItem('port79_gc_superadmin_token')||sessionStorage.getItem('port79_admin_token')||sessionStorage.getItem('port79_gc_token')||sessionStorage.getItem('port79_user_token')||'').trim();}catch(e){return '';}
}
function monthKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function parseUrl(input){try{return new URL(typeof input==='string'?input:input?.url,location.href)}catch(e){return null}}
function gasAction(u){return String(u?.searchParams?.get('action')||'').trim();}
function isGas(u){return !!u && /script\.google\.com$/i.test(u.hostname) && /\/macros\/s\//.test(u.pathname);}
function normalizeKey(u){
  const action=gasAction(u);if(!action)return '';
  const p=[];
  u.searchParams.forEach((v,k)=>{
    if(['t','_','ts','timestamp','cacheBust','_version_probe','token','gcToken','port79sso'].includes(k))return;
    p.push([k,v]);
  });
  p.sort((a,b)=>a[0].localeCompare(b[0])||a[1].localeCompare(b[1]));
  return `${getSessionUser()}|${action}|${p.map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')}`;
}
function responseFromEntry(e){
  return new Response(e.body,{status:e.status||200,statusText:e.statusText||'OK',headers:{'Content-Type':e.contentType||'application/json;charset=utf-8','X-PORT79-CACHE':'HIT'}});
}
async function saveNetworkResponse(key,res){
  if(!res || !res.ok)return;
  try{
    const clone=res.clone(),body=await clone.text();
    if(!body)return;
    await putEntry({key,body,status:res.status,statusText:res.statusText,contentType:res.headers.get('content-type')||'application/json;charset=utf-8',savedAt:Date.now()});
  }catch(e){}
}
async function backgroundRefresh(input,init,key){
  try{const res=await nativeFetch(input,init);await saveNetworkResponse(key,res);}catch(e){}
}
function writeActionFrom(init){
  try{
    const method=String(init?.method||'GET').toUpperCase();if(method==='GET')return '';
    const b=init?.body;if(typeof b!=='string')return '';
    let x;try{x=JSON.parse(b)}catch(e){const q=new URLSearchParams(b);return String(q.get('action')||'')}
    return String(x?.action||'');
  }catch(e){return ''}
}
async function invalidateForWrite(action){
  if(!action)return;
  const a=String(action).toLowerCase();
  const groups=[];
  if(/record|attendance|punch/.test(a))groups.push('getAttendance');
  if(/leave/.test(a))groups.push('getLeave');
  if(/schedule/.test(a))groups.push('getSchedule');
  if(/^gc|ship|vessel|efficiency/.test(a))groups.push('gcGet');
  if(/^hr|employee/.test(a))groups.push('hrGet','getAttendanceEmployeeMaster','gcGetEmployees');
  if(!groups.length)return;
  await deleteMatching(e=>groups.some(g=>String(e.key||'').includes(`|${g}`)));
}
window.fetch=async function(input,init){
  const method=String(init?.method||((typeof input!=='string'&&input?.method)||'GET')).toUpperCase();
  if(method!=='GET'){
    const action=writeActionFrom(init);
    const res=await nativeFetch(input,init);
    if(res?.ok) invalidateForWrite(action);
    return res;
  }
  const u=parseUrl(input),action=gasAction(u);
  if(!isGas(u)||!READ_ACTIONS.has(action)) return nativeFetch(input,init);
  const key=normalizeKey(u); if(!key)return nativeFetch(input,init);
  const cached=await getEntry(key),age=cached?Date.now()-Number(cached.savedAt||0):Infinity;
  if(cached && age<MAX_STALE_MS){
    if(age>FRESH_MS && navigator.onLine!==false) backgroundRefresh(input,init,key);
    return responseFromEntry(cached);
  }
  try{
    const res=await nativeFetch(input,init);
    saveNetworkResponse(key,res);
    return res;
  }catch(e){
    if(cached)return responseFromEntry(cached);
    throw e;
  }
};
async function fetchAndCache(action,params={}){
  const base=gasUrl();if(!base)return {ok:false,error:'no-gas'};
  const u=new URL(base),tk=token();
  u.searchParams.set('action',action);
  Object.entries(params||{}).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,String(v));});
  if(tk){u.searchParams.set('token',tk);u.searchParams.set('gcToken',tk);}
  u.searchParams.set('_',String(Date.now()));
  const key=normalizeKey(u);
  try{const r=await nativeFetch(u.toString(),{cache:'no-store',redirect:'follow'});await saveNetworkResponse(key,r);return {ok:r.ok,action};}catch(e){return {ok:false,action,error:String(e?.message||e)}}
}
async function preloadCurrent(){
  if(navigator.onLine===false)return [];
  const m=monthKey();
  let sess=null;try{sess=JSON.parse(sessionStorage.getItem('port79_user_session')||sessionStorage.getItem('admin_session')||'null')}catch(e){}
  const role=String(sess?.adminRole||sess?.role||'employee').toLowerCase();
  const perms=sess?.systemPermissions||{};
  const allowed=k=>role==='superadmin'||String(perms?.[k]||(k==='attendance'?'view':k==='leave'&&role==='employee'?'view':'none')).toLowerCase()!=='none';
  const groups=[];
  if(allowed('attendance'))groups.push([fetchAndCache('getAttendanceCoreData',{month:m}),fetchAndCache('getAttendanceEmployeeMaster',{})]);
  if(allowed('leave'))groups.push([fetchAndCache('getLeaveData',{})]);
  if(allowed('schedule'))groups.push([fetchAndCache('getScheduleDataSecure',{})]);
  if(allowed('efficiency'))groups.push([fetchAndCache('gcGetData',{month:m}),fetchAndCache('gcGetEmployees',{}),fetchAndCache('gcGetVesselMonthSnapshot',{month:m})]);
  if(allowed('hr'))groups.push([fetchAndCache('hrGetEmployees',{})]);
  try{sessionStorage.setItem('port79_preload_state','running');}catch(e){}
  const out=await Promise.allSettled(groups.map(g=>Promise.allSettled(g)));
  try{sessionStorage.setItem('port79_preload_state','done');sessionStorage.setItem('port79_preload_at',String(Date.now()));}catch(e){}
  window.dispatchEvent(new CustomEvent('port79-preload-complete'));
  return out;
}
async function clearAll(){await deleteMatching(()=>true);}
async function cacheInfo(){
  try{
    const db=await openDb();return await new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readonly'),r=t.objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});
  }catch(e){return []}
}
window.Port79DataCache={preloadCurrent,fetchAndCache,clearAll,cacheInfo,monthKey,version:'2026.10.03.1'};
})();
