/* 79號碼頭五大系統｜全域統一互動 v2026.09.28.9.0 */
(()=>{
'use strict';
const VERSION='2026.09.28.9.0';
const THEME_KEY='port79_global_theme_v9';
const EDIT_KEY='port79_unified_edit_mode_v1';
const SYSTEM_META={
 attendance:{name:'考勤系統',icon:'🕒',desc:'員工打卡・考勤紀錄・即時動態'},
 leave:{name:'請假系統',icon:'📝',desc:'請假申請・審核・特休資訊'},
 schedule:{name:'排班系統',icon:'📅',desc:'人員班表・組別・今日出勤'},
 efficiency:{name:'效率系統',icon:'🚢',desc:'船舶作業・個人效率・月報比對'},
 hr:{name:'人資系統',icon:'👥',desc:'員工主檔・部門職稱・權限設定'}
};
const RANGE_CONFIG={
 attendance:[
  {from:'recordDateFilter',to:'recordDateEndFilter',label:'考勤日期',container:'#recordDateRangePicker'},
  {from:'leaveStartFilter',to:'leaveEndFilter',label:'請假篩選',container:'#leaveFilterDateRangePicker'},
  {from:'manualLeaveStart',to:'manualLeaveEnd',label:'請假日期'}
 ],
 leave:[
  {from:'leaveStart',to:'leaveEnd',label:'請假日期'},
  {from:'leaveAdminDateFrom',to:'leaveAdminDateTo',label:'審核日期',container:'#leaveAdminDateRangePicker'}
 ],
 schedule:[],
 efficiency:[
  {from:'recordDateFrom',to:'recordDateTo',label:'作業日期',container:'#recordDateRangePicker'},
  {from:'weeklyStart',to:'weeklyEnd',label:'每周效率日期',container:'#weeklyDateRangePicker'},
  {from:'shipEditFirstDate',to:'shipEditLastDate',label:'船舶作業日期'}
 ],
 hr:[{from:'hrDateFrom',to:'hrDateTo',label:'到職日期',container:'#hrDateRangePicker'}]
};
const $=s=>document.querySelector(s);
const SYS=()=>String(document.body?.dataset?.p79System||'').trim();
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function ymd(d){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`}
function parseYmd(s){const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));return m?new Date(+m[1],+m[2]-1,+m[3]):null}
function formatYmd(s){return String(s||'').replace(/-/g,'/');}

function currentTheme(){const t=localStorage.getItem(THEME_KEY);if(t==='dark'||t==='light')return t;const legacy=localStorage.getItem('aqc_theme')||localStorage.getItem('leave_theme')||localStorage.getItem('port79_schedule_theme')||localStorage.getItem('port79_efficiency_theme')||localStorage.getItem('port79_theme');if(legacy==='dark'||legacy==='light')return legacy;return matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}
function applyTheme(theme,persist=true){theme=theme==='dark'?'dark':'light';const html=document.documentElement;html.classList.toggle('dark',theme==='dark');html.setAttribute('data-theme',theme);html.setAttribute('data-p79-theme',theme);document.body?.setAttribute('data-p79-theme',theme);if(persist){try{localStorage.setItem(THEME_KEY,theme);['aqc_theme','leave_theme','port79_schedule_theme','port79_efficiency_theme','port79_theme'].forEach(k=>localStorage.setItem(k,theme));}catch(e){}}const btn=$('#p79GlobalThemeBtn');if(btn)btn.innerHTML=theme==='dark'?'☀️ 亮色':'🌙 暗色';}
window.p79ApplyGlobalTheme=applyTheme;
window.p79UnifiedTheme=()=>applyTheme(currentTheme()==='dark'?'light':'dark',true);
window.addEventListener('storage',e=>{if(e.key===THEME_KEY)applyTheme(e.newValue,false);if(e.key===EDIT_KEY)applyEditMode(readEditMode())});
window.addEventListener('pageshow',()=>applyTheme(currentTheme(),false));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)applyTheme(currentTheme(),false)});

function readEditMode(){try{return localStorage.getItem(EDIT_KEY)==='view'?'view':'edit'}catch(e){return'edit'}}
function applyEditMode(mode){const view=mode==='view';document.body?.classList.toggle('p79-view-mode',view);const btn=$('#p79UnifiedEditModeBtn'),txt=$('#p79UnifiedEditModeText'),st=$('#p79UnifiedModeStatus');if(btn){btn.classList.toggle('edit',!view);btn.classList.toggle('view',view)}if(txt)txt.textContent=view?'查看模式':'編輯模式';if(st)st.textContent=view?'｜目前為查看模式':'｜編輯模式已同步'}
window.p79ToggleUnifiedEditMode=()=>{const next=readEditMode()==='edit'?'view':'edit';try{localStorage.setItem(EDIT_KEY,next)}catch(e){}applyEditMode(next)};
function mutationSelector(sys){return ({schedule:'[data-schedule-edit="1"]',hr:'#addBtn,button[onclick*="openEditor"],button[onclick*="deleteEmployee"],button[onclick*="saveEmployee"],button[onclick*="clearSessionLogs"],button[onclick*="clearEmploymentHistory"]',leave:'#adminMode button[onclick*="approve"],#adminMode button[onclick*="reject"],#adminMode button[onclick*="delete"],#adminMode button[onclick*="updateLeave"]',efficiency:'#efficiencySaveBtn,button[onclick*="saveGroup"],button[onclick*="deleteGroup"],button[onclick*="saveRecord"],button[onclick*="deleteRecord"],button[onclick*="addMonthlyEditorRow"],button[onclick*="applyMonthlyEditorRows"]',attendance:'#viewAdmin button[onclick*="save"],#viewAdmin button[onclick*="delete"],#viewAdmin button[onclick*="edit"],#viewAdmin button[onclick*="add"],#viewAdmin button[onclick*="update"]'})[sys]||''}
function installViewGuard(){if(window.__p79V9ViewGuard)return;window.__p79V9ViewGuard=true;document.addEventListener('click',e=>{if(readEditMode()!=='view')return;const sel=mutationSelector(SYS());if(!sel||!e.target?.closest)return;let hit=false;try{hit=!!e.target.closest(sel)}catch(_){return}if(hit){e.preventDefault();e.stopImmediatePropagation();alert('目前為查看模式；請先切換成「編輯模式」再修改資料。')}},true)}

function mountShell(){const sys=SYS(),info=SYSTEM_META[sys]||{name:'79號碼頭系統',icon:'⚓',desc:'雲端智慧管理平台'};let shell=$('#p79UnifiedShell');if(!shell){shell=document.createElement('div');shell.id='p79UnifiedShell';document.body.insertBefore(shell,document.body.firstChild)}const nav=[['attendance','🕒','考勤','../attendance/'],['leave','📝','請假','../leave/'],['schedule','📅','排班','../schedule/'],['efficiency','🚢','效率','../aqc-efficiency/'],['hr','👥','人資','../hr/']];shell.innerHTML=`<div class="p79u-top"><div class="p79u-brand"><div class="p79u-logo">${info.icon}</div><div><div class="p79u-title">${esc(info.name)}</div><div class="p79u-sub">79號碼頭雲端智慧系統｜全域統一介面 v${VERSION}</div></div></div><nav class="p79u-nav">${nav.map(([k,i,n,u])=>`<a class="${k===sys?'active':''}" href="${u}"><span>${i}</span>${n}</a>`).join('')}</nav><div class="p79u-actions"><button class="p79u-btn primary" type="button" onclick="window.p79UnifiedRefresh()">⟳ 重新整理</button><button id="p79UnifiedEditModeBtn" class="p79u-btn edit" type="button" onclick="window.p79ToggleUnifiedEditMode()"><span id="p79UnifiedEditModeText">編輯模式</span></button><button id="p79GlobalThemeBtn" class="p79u-btn theme" type="button" onclick="window.p79UnifiedTheme()">🌙 暗色</button><button class="p79u-btn home" type="button" onclick="location.href='../'">⌂ 返回首頁</button></div></div><div id="p79UnifiedContext"><div class="p79u-context-inner"><div class="p79u-context-status"><b>${esc(info.desc)}</b><span id="p79UnifiedModeStatus">｜編輯模式已同步</span></div><div class="p79u-context-hint">五大系統主題同步・日期區間單一日曆・版面與操作規格一致</div></div></div>`;applyEditMode(readEditMode());applyTheme(currentTheme(),false)}
window.p79UnifiedRefresh=async function(){const sys=SYS(),b=$('#p79UnifiedShell .p79u-btn.primary'),old=b?.textContent;if(b){b.disabled=true;b.textContent='⟳ 整理中…'}try{if(sys==='attendance'){if(typeof refreshAdminDashboard==='function'&&typeof isAdminLoggedIn!=='undefined'&&isAdminLoggedIn)await refreshAdminDashboard();else if(typeof manualCloudRefresh==='function')await manualCloudRefresh();else location.reload()}else if(sys==='leave'&&typeof loadCloud==='function')await loadCloud(true);else if(sys==='schedule'&&typeof manualRefreshSchedule==='function')await manualRefreshSchedule();else if(sys==='efficiency'){if(typeof manualCloudSync==='function')await manualCloudSync();else if(typeof syncFromCloud==='function')await syncFromCloud(true);else location.reload()}else if(sys==='hr'&&typeof loadEmployees==='function')await loadEmployees(true);else location.reload()}catch(e){console.error('全域重新整理失敗',e);alert('重新整理失敗：'+(e?.message||e))}finally{if(b){b.disabled=false;b.textContent=old||'⟳ 重新整理'}}};

class RangePicker{
 constructor(cfg){this.cfg=cfg;this.from=document.getElementById(cfg.from);this.to=document.getElementById(cfg.to);this.host=null;this.pop=null;this.month=null;this.stage='start';}
 mount(){if(!this.from||!this.to||document.querySelector(`[data-p79-range="${this.cfg.from}:${this.cfg.to}"]`))return false;[this.from,this.to].forEach(i=>{if(i.required){i.dataset.p79Required='1';i.required=false}i.classList.add('p79-range-original');i.setAttribute('aria-hidden','true');i.tabIndex=-1});let anchor=null;if(this.cfg.container){anchor=document.querySelector(this.cfg.container);if(anchor)anchor.style.display='none'}if(!anchor){const fp=this.from.closest('.field')||this.from.parentElement,tp=this.to.closest('.field')||this.to.parentElement;anchor=fp;if(fp)fp.style.display='none';if(tp&&tp!==fp)tp.style.display='none'}if(!anchor||!anchor.parentNode)return false;const host=document.createElement('div');host.className='p79-range-host';host.dataset.p79Range=`${this.cfg.from}:${this.cfg.to}`;host.innerHTML=`<button type="button" class="p79-range-trigger"><span class="p79-range-label">📅 ${esc(this.cfg.label||'日期範圍')}</span><span class="p79-range-summary">全部日期</span><span class="p79-range-arrow">▼</span></button><div class="p79-range-popover" hidden><div class="p79-range-head"><button type="button" class="p79-range-nav p79-prev">‹</button><div><div class="p79-range-month">—</div><div class="p79-range-hint">先點開始日期，再點結束日期</div></div><button type="button" class="p79-range-nav p79-next">›</button></div><div class="p79-range-weekdays"><span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span></div><div class="p79-range-days"></div><div class="p79-range-footer"><button type="button" class="p79-today">今天</button><button type="button" class="p79-monthfull">整月</button><button type="button" class="p79-clear">清除</button><button type="button" class="p79-close primary">完成</button></div></div>`;anchor.parentNode.insertBefore(host,anchor);this.host=host;this.pop=host.querySelector('.p79-range-popover');this.summary=host.querySelector('.p79-range-summary');host.querySelector('.p79-range-trigger').addEventListener('click',e=>{e.stopPropagation();this.toggle()});host.querySelector('.p79-prev').onclick=()=>{this.month.setMonth(this.month.getMonth()-1);this.render()};host.querySelector('.p79-next').onclick=()=>{this.month.setMonth(this.month.getMonth()+1);this.render()};host.querySelector('.p79-clear').onclick=()=>this.clear();host.querySelector('.p79-close').onclick=()=>this.close();host.querySelector('.p79-today').onclick=()=>{const t=ymd(new Date());this.setRange(t,t,true);this.month=parseYmd(t);this.render()};host.querySelector('.p79-monthfull').onclick=()=>{const d=this.month||new Date(),a=new Date(d.getFullYear(),d.getMonth(),1),b=new Date(d.getFullYear(),d.getMonth()+1,0);this.setRange(ymd(a),ymd(b),true);this.render()};this.from.addEventListener('change',()=>this.sync());this.to.addEventListener('change',()=>this.sync());this.sync(true);return true}
 toggle(){if(this.pop.hidden){document.querySelectorAll('.p79-range-popover:not([hidden])').forEach(p=>p.hidden=true);this.sync(true);this.pop.hidden=false}else this.close()}
 close(){if(this.pop)this.pop.hidden=true;this.stage='start';this.updateHint()}
 sync(setMonth=false){const a=this.from?.value||'',b=this.to?.value||'';this.summary.textContent=!a&&!b?'全部日期':a&&b?`${formatYmd(a)} ～ ${formatYmd(b)}`:a?`${formatYmd(a)} 起`:`至 ${formatYmd(b)}`;if(setMonth||!this.month){const base=parseYmd(a)||parseYmd(b)||new Date();this.month=new Date(base.getFullYear(),base.getMonth(),1)}this.render()}
 updateHint(){const h=this.host?.querySelector('.p79-range-hint');if(h)h.textContent=this.stage==='end'?'再點一次選結束日期':'先點開始日期，再點結束日期'}
 dispatch(el){if(!el)return;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
 setRange(a,b,fire){if(a&&b&&a>b)[a,b]=[b,a];if(fire){this.from.value=a||'';this.to.value='';this.dispatch(this.from);this.to.value=b||'';this.dispatch(this.to)}else{this.from.value=a||'';this.to.value=b||''}this.stage='start';this.sync();}
 clear(){this.setRange('','',true);this.render()}
 choose(v){const a=this.from.value,b=this.to.value;if(this.stage==='start'||(a&&b)||!a){this.from.value=v;this.to.value='';this.stage='end';this.dispatch(this.from);this.sync();this.updateHint();this.render()}else{let x=a,y=v;if(y<x)[x,y]=[y,x];this.setRange(x,y,true);this.updateHint();this.render()}}
 render(){if(!this.month||!this.host)return;const y=this.month.getFullYear(),m=this.month.getMonth(),first=new Date(y,m,1),last=new Date(y,m+1,0),days=this.host.querySelector('.p79-range-days'),lab=this.host.querySelector('.p79-range-month');lab.textContent=`${y} 年 ${m+1} 月`;const a=this.from.value,b=this.to.value,today=ymd(new Date());let html='';for(let i=0;i<first.getDay();i++)html+='<span class="p79-range-blank"></span>';for(let d=1;d<=last.getDate();d++){const date=ymd(new Date(y,m,d)),dow=new Date(y,m,d).getDay(),cls=['p79-range-day'];if(dow===0||dow===6)cls.push('is-weekend');if(a&&b&&date>a&&date<b)cls.push('is-in-range');if(date===a)cls.push('is-start');if(date===b)cls.push('is-end');if(date===today)cls.push('is-today');html+=`<button type="button" class="${cls.join(' ')}" data-date="${date}">${d}</button>`}days.innerHTML=html;days.querySelectorAll('[data-date]').forEach(btn=>btn.onclick=()=>this.choose(btn.dataset.date));this.updateHint()}
}
let rangePickers=[];
function mountRangePickers(){const sys=SYS(),cfgs=RANGE_CONFIG[sys]||[];cfgs.forEach(cfg=>{if(rangePickers.some(p=>p.cfg.from===cfg.from))return;const p=new RangePicker(cfg);if(p.mount())rangePickers.push(p)});}
function syncRangePickers(){rangePickers.forEach(p=>p.sync(false))}
document.addEventListener('click',e=>{if(!e.target.closest('.p79-range-host'))document.querySelectorAll('.p79-range-popover:not([hidden])').forEach(p=>p.hidden=true);setTimeout(syncRangePickers,0)});

function init(){mountShell();installViewGuard();mountRangePickers();applyTheme(currentTheme(),false);setTimeout(()=>{mountRangePickers();syncRangePickers()},350);setTimeout(()=>{mountRangePickers();syncRangePickers()},1200);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
