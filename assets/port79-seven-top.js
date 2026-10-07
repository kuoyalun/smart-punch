(function(){
'use strict';

const GLOBAL_THEME_KEY='port79_global_theme_v1';
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
 ['attendance','🕒','考勤','../attendance/'],['workhours','📊','工時統計','../work-hours/'],
 ['leave','📝','請假','../leave/'],['schedule','📅','排班','../schedule/'],
 ['efficiency','🚢','效率','../aqc-efficiency/'],['hr','👥','人資','../hr/'],
 ['history','🗄️','歷史資料','../history-data/']
];
const SYSTEMS=[['attendance','考勤'],['workhours','工時統計'],['leave','請假'],['schedule','排班'],['efficiency','效率'],['hr','人資'],['history','歷史資料']];
let statusBusy=false,statusTimer=null,lastSignature='';

function currentSystem(){
 const p=location.pathname.toLowerCase();
 if(p.includes('/work-hours/'))return 'workhours';if(p.includes('/attendance/'))return 'attendance';
 if(p.includes('/leave/'))return 'leave';if(p.includes('/schedule/'))return 'schedule';
 if(p.includes('/aqc-efficiency/'))return 'efficiency';if(p.includes('/hr/'))return 'hr';
 if(p.includes('/history-data/'))return 'history';
 const b=String(document.body?.dataset?.p79System||'').toLowerCase();return b==='work-hours'?'workhours':(META[b]?b:'attendance');
}
function roleText(){try{const s=JSON.parse(sessionStorage.getItem('port79_user_session')||sessionStorage.getItem('admin_session')||'null');const r=String(s?.adminRole||s?.role||sessionStorage.getItem('aqc_admin_role')||'').toLowerCase();return r==='superadmin'?'超級管理員':r==='admin'?'管理員':'一般員工'}catch(e){return'登入使用者'}}
function gasUrl(){try{if(typeof GAS_URL!=='undefined'&&GAS_URL)return String(GAS_URL)}catch(e){}try{if(window.GAS_URL)return String(window.GAS_URL)}catch(e){}try{for(const k of ['port79_gas_url','gasUrl','GAS_URL']){const v=sessionStorage.getItem(k)||localStorage.getItem(k);if(v&&/script\.google\.com/i.test(v))return v}}catch(e){}return''}

function normalizedTheme(v){return String(v||'').toLowerCase()==='dark'?'dark':'light'}
function savedGlobalTheme(){
 let v='';try{v=localStorage.getItem(GLOBAL_THEME_KEY)||''}catch(e){}
 if(v)return normalizedTheme(v);
 try{v=localStorage.getItem('aqc_theme')||localStorage.getItem('leave_theme')||localStorage.getItem('port79_schedule_theme')||localStorage.getItem('port79_efficiency_theme')||localStorage.getItem('port79_theme')||''}catch(e){}
 return v?normalizedTheme(v):'light';
}
function applyGlobalTheme(theme,{save=true}={}){
 theme=normalizedTheme(theme);const dark=theme==='dark';
 try{
  if(save)localStorage.setItem(GLOBAL_THEME_KEY,theme);
  // 同步舊系統各自的 key，避免頁面自己的初始化把共用主題覆蓋掉。
  ['aqc_theme','leave_theme','port79_schedule_theme','port79_efficiency_theme','port79_theme'].forEach(k=>localStorage.setItem(k,theme));
 }catch(e){}
 const h=document.documentElement;
 h.classList.toggle('dark',dark);h.setAttribute('data-theme',theme);h.style.colorScheme=theme;
 document.body?.classList?.toggle('dark',dark);
 updateThemeMenuLabel(theme);
 try{window.dispatchEvent(new CustomEvent('port79-global-theme-change',{detail:{theme}}))}catch(e){}
 return theme;
}
function toggleGlobalTheme(){return applyGlobalTheme(savedGlobalTheme()==='dark'?'light':'dark')}
function updateThemeMenuLabel(theme=savedGlobalTheme()){
 const b=document.querySelector('#p79SevenStandardMenu [data-action="global-theme"]');
 if(b)b.textContent=theme==='dark'?'☀️ 全系統顯示模式：深色（切換亮色）':'🌙 全系統顯示模式：亮色（切換深色）';
}
window.p79ApplyGlobalTheme=applyGlobalTheme;window.p79ToggleGlobalTheme=toggleGlobalTheme;
window.addEventListener('storage',e=>{if(e.key===GLOBAL_THEME_KEY&&e.newValue)applyGlobalTheme(e.newValue,{save:false})});
applyGlobalTheme(savedGlobalTheme(),{save:false});

const MENU={
 attendance:[
  ['records','📋 考勤管理'],['live','📡 即時動態'],['settings','⚙️ 系統設定'],['clearDeleted','🗑️ 清空已刪除考勤'],
  ['attendance-import','考勤匯入'],['attendance-export','考勤匯出'],['attendance-compare','Excel 比對'],
  ['save-cloud','💾 儲存雲端','cloud-save'],['read-cloud','☁️ 讀取雲端'],['employee','👤 我的打卡'],['year','📆 年份顯示']
 ],
 workhours:[['stats','📊 出勤統計'],['overtime','⏱️ 加班統計'],['read-cloud','☁️ 讀取雲端'],['year','📆 年份顯示']],
 leave:[['leave-edit','✎ 編輯／審核模式']],
 schedule:[['schedule-lock','🔒 鎖定／解除編輯'],['schedule-save','💾 儲存排班'],['save-cloud','💾 儲存雲端','cloud-save'],['schedule-mode','📅 排班模式'],['import','📥 匯入'],['export','📤 匯出'],['reset-cloud','↻ 重設雲端排班']],
 efficiency:[['save-cloud','💾 儲存雲端','cloud-save'],['import','📥 匯入'],['compare','🔎 比對月報'],['export','📤 匯出'],['year','📆 年份顯示']],
 hr:[['permissions','🔐 權限總覽'],['logs','🧾 登入紀錄'],['org','⚙️ 部門／職稱／單位'],['export','📥 匯出'],['add','＋ 新增人員'],['year','📆 年份顯示']],
 history:[['history-load','🗄️ 讀取目前月份']]
};
function closeMenu(){document.getElementById('p79SevenStandardMenu')?.classList.remove('open')}
function toggleMenu(e){e?.stopPropagation();document.getElementById('p79SevenStandardMenu')?.classList.toggle('open')}

async function runAction(sys,a){closeMenu();try{
 if(a==='global-theme')return toggleGlobalTheme();
 if(a==='data-cache')return window.Port79DataCache?.openCenter?.();
 if(a==='year'){
   if(typeof window.p79ToggleYearModeFromMenu==='function')return window.p79ToggleYearModeFromMenu();
   const k='port79_year_mode';try{localStorage.setItem(k,localStorage.getItem(k)==='roc'?'gregorian':'roc')}catch(e){}location.reload();return;
 }
 if(sys==='attendance'){
  if(a==='records'){window.switchView?.('admin');return window.switchAdminTab?.('records')}
  if(a==='live'){window.switchView?.('admin');return window.switchAdminTab?.('live')}
  if(a==='settings'){window.switchView?.('admin');return window.switchAdminTab?.('settings')}
  if(a==='clearDeleted')return await window.clearDeletedAttendanceGoogleSheet?.();
  if(a==='attendance-import'){window.switchView?.('admin');window.switchAdminTab?.('records');document.getElementById('attendanceExcelInput')?.click();return}
  if(a==='attendance-export'){window.switchView?.('admin');window.switchAdminTab?.('records');return window.openExportRecordsModal?.()}
  if(a==='attendance-compare'){window.switchView?.('admin');window.switchAdminTab?.('records');return window.showAttendanceImportAuditModal?.()}
  if(a==='save-cloud')return await window.syncAllDataToCloud?.();
  if(a==='read-cloud')return await window.manualCloudRefresh?.();
  if(a==='employee')return window.switchView?.('employee');
 }
 if(sys==='workhours'){
  if(a==='stats'){location.hash='stats';return window.switchAdminTab?.('stats')}
  if(a==='overtime'){location.hash='overtime';return window.switchAdminTab?.('overtime')}
  if(a==='read-cloud')return await window.manualCloudRefresh?.();
 }
 if(sys==='leave'){
  if(a==='leave-edit'){
    if(typeof window.p79ToggleUnifiedEditMode==='function')return window.p79ToggleUnifiedEditMode();
    const admin=document.getElementById('adminMode');if(admin){admin.scrollIntoView({behavior:'smooth',block:'start'});return}
  }
 }
 if(sys==='schedule'){
  if(a==='schedule-lock')return window.p79ToggleScheduleLock?.();
  if(a==='schedule-save')return await window.saveCurrentTabSchedule?.();
  if(a==='save-cloud')return await window.manualCloudSyncSchedule?.();
  if(a==='schedule-mode')return window.p79OpenScheduleModeModal?.();
  if(a==='import')return window.openScheduleImportPicker?.();
  if(a==='export')return window.exportScheduleToExcel?.();
  if(a==='reset-cloud')return window.resetToDefaultData?.();
 }
 if(sys==='efficiency'){
  if(a==='save-cloud')return await window.manualCloudSync?.();
  if(a==='import'){document.getElementById('excelImport')?.click();return}
  if(a==='compare'){document.getElementById('compareExcelInput')?.click();return}
  if(a==='export')return window.openExportDialog?.();
 }
 if(sys==='hr'){
  if(a==='permissions')return window.openPermissionOverview?.();if(a==='logs')return await window.openSessionLogs?.();
  if(a==='org')return window.openOrgSettings?.();if(a==='export')return window.exportEmployees?.();if(a==='add')return window.openEditor?.();
 }
 if(sys==='history'&&a==='history-load')return document.getElementById('loadBtn')?.click();
 }catch(e){console.error(sys+' 功能選單執行失敗',e);alert('功能執行失敗：'+(e?.message||e))}}

function buildMenu(sys){
 const menu=document.createElement('div');menu.id='p79SevenStandardMenu';menu.className='p79-seven-standard-menu';
 const title=document.createElement('div');title.className='menu-title';title.textContent='系統功能';menu.appendChild(title);
 (MENU[sys]||[]).forEach(([a,label,cls])=>{const b=document.createElement('button');b.type='button';b.dataset.action=a;b.textContent=label;if(cls)b.classList.add(cls);b.addEventListener('click',()=>runAction(sys,a));menu.appendChild(b)});
 const sep=document.createElement('div');sep.className='sep';menu.appendChild(sep);
 const ct=document.createElement('div');ct.className='menu-title';ct.textContent='七大系統共用';menu.appendChild(ct);
 const cache=document.createElement('button');cache.type='button';cache.dataset.action='data-cache';cache.className='cache common';cache.textContent='☁️ 資料快取中心';cache.addEventListener('click',()=>runAction(sys,'data-cache'));menu.appendChild(cache);
 const theme=document.createElement('button');theme.type='button';theme.dataset.action='global-theme';theme.className='theme common';theme.addEventListener('click',()=>runAction(sys,'global-theme'));menu.appendChild(theme);
 updateThemeMenuLabel();
 return menu;
}
function ensureStandardMenu(sys){
 const wrap=document.getElementById('p79SevenMenuWrap');
 if(!wrap)return false;
 const old=document.getElementById('p79SevenStandardMenu');
 if(old)old.remove();
 wrap.appendChild(buildMenu(sys));
 const btn=document.getElementById('p79SevenMenuButton');
 if(btn&&!btn.dataset.p79StandardMenuBound){
   btn.dataset.p79StandardMenuBound='1';
   btn.addEventListener('click',toggleMenu);
 }
 return true;
}


function installAttendanceAuditCompactV2(){
 if(currentSystem()!=='attendance')return;
 if(!document.getElementById('p79-attendance-audit-wide-v3-style')){
  const st=document.createElement('style');
  st.id='p79-attendance-audit-wide-v3-style';
  st.textContent=`
  .p79-audit-compact-v2{
    font-size:11.5px!important;
    width:min(1880px,calc(100vw - 16px))!important;
    max-width:min(1880px,calc(100vw - 16px))!important;
    margin-left:auto!important;
    margin-right:auto!important;
    left:50%!important;
    right:auto!important;
    transform:translateX(-50%)!important;
  }
  .p79-audit-compact-v2 > *{
    margin-left:auto!important;
    margin-right:auto!important;
  }
  .p79-audit-compact-v2 table{
    font-size:11.5px!important;
    line-height:1.25!important;
    table-layout:fixed!important;
    min-width:1450px!important;
    width:100%!important;
    margin-left:auto!important;
    margin-right:auto!important;
  }
  .p79-audit-compact-v2 th,.p79-audit-compact-v2 td{
    padding:6px 8px!important;
    line-height:1.25!important;
    vertical-align:middle!important;
  }
  .p79-audit-compact-v2 th{
    font-size:11.5px!important;
    font-weight:800!important;
    white-space:nowrap!important;
  }
  .p79-audit-compact-v2 th:nth-child(1),.p79-audit-compact-v2 td:nth-child(1){width:38px!important}
  .p79-audit-compact-v2 th:nth-child(2),.p79-audit-compact-v2 td:nth-child(2){width:72px!important}
  .p79-audit-compact-v2 th:nth-child(3),.p79-audit-compact-v2 td:nth-child(3){width:105px!important}
  .p79-audit-compact-v2 th:nth-child(4),.p79-audit-compact-v2 td:nth-child(4){width:90px!important}
  .p79-audit-compact-v2 th:nth-child(5),.p79-audit-compact-v2 td:nth-child(5),
  .p79-audit-compact-v2 th:nth-child(6),.p79-audit-compact-v2 td:nth-child(6),
  .p79-audit-compact-v2 th:nth-child(7),.p79-audit-compact-v2 td:nth-child(7),
  .p79-audit-compact-v2 th:nth-child(8),.p79-audit-compact-v2 td:nth-child(8){
    width:165px!important;
    white-space:nowrap!important;
  }
  .p79-audit-compact-v2 th:nth-child(9),.p79-audit-compact-v2 td:nth-child(9){width:95px!important;white-space:nowrap!important}
  .p79-audit-compact-v2 th:nth-child(10),.p79-audit-compact-v2 td:nth-child(10){width:55px!important;text-align:center!important;white-space:nowrap!important}
  .p79-audit-compact-v2 th:nth-child(11),.p79-audit-compact-v2 td:nth-child(11){
    width:290px!important;
    white-space:normal!important;
    word-break:break-word!important;
  }
  .p79-audit-compact-v2 th:nth-child(12),.p79-audit-compact-v2 td:nth-child(12){width:135px!important}
  .p79-audit-compact-v2 button{
    font-size:10.5px!important;
    line-height:1.15!important;
    padding:5px 8px!important;
    border-radius:8px!important;
    min-height:0!important;
  }
  .p79-audit-compact-v2 td:nth-child(12)>div,
  .p79-audit-compact-v2 .p79-audit-actions{
    display:grid!important;
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    gap:5px!important;
    align-items:center!important;
  }
  .p79-audit-compact-v2 td:nth-child(12) button{
    width:100%!important;
    margin:0!important;
    white-space:nowrap!important;
  }
  .p79-audit-compact-v2 th:nth-child(10),
  .p79-audit-compact-v2 td:nth-child(10){
    text-align:center!important;
  }
  .p79-audit-compact-v2 [class*="sticky"][class*="top"]{
    padding:8px 12px!important;
    position:sticky!important;
    top:0!important;
    z-index:30!important;
  }
  .p79-audit-compact-v2 [class*="sticky"][class*="bottom"]{
    padding:8px 12px!important;
    position:sticky!important;
    bottom:0!important;
    z-index:30!important;
  }
  @media(max-width:1500px){
    .p79-audit-compact-v2{
      width:calc(100vw - 8px)!important;
      max-width:calc(100vw - 8px)!important;
    }
  }
  `;
  document.head.appendChild(st);
 }
 function mark(){
  document.querySelectorAll('table').forEach(t=>{
   const txt=String(t.innerText||'');
   if(!(txt.includes('Excel 上班')||txt.includes('Excel上班')))return;
   if(!(txt.includes('系統上班')&&txt.includes('系統下班')))return;
   if(!(txt.includes('比對結果')||txt.includes('操作')))return;
   let box=t.closest('dialog,[role="dialog"],.fixed,.modal,.modal-overlay');
   if(!box){
    let n=t.parentElement;
    while(n&&n!==document.body){
      const cs=getComputedStyle(n);
      if(cs.position==='fixed'||cs.position==='absolute'){box=n;break}
      n=n.parentElement;
    }
   }
   (box||t.parentElement||t).classList.add('p79-audit-compact-v2');
  });
 }
 mark();
 const mo=new MutationObserver(()=>mark());
 mo.observe(document.documentElement,{childList:true,subtree:true});
 setTimeout(mark,300);setTimeout(mark,1000);setTimeout(mark,2500);
}

function portalAttendanceAuditModal(){
 if(currentSystem()!=='attendance')return;
 const modal=document.getElementById('attendanceImportAuditModal');
 if(!modal)return;
 // 比對視窗原本位在有 transform/縮放的考勤容器內；
 // position:fixed 會被該父層限制，造成整個視窗偏到左側或右側。
 // 直接搬到 body 最外層，讓 fixed 真正以瀏覽器視窗為基準。
 if(modal.parentElement!==document.body){
   document.body.appendChild(modal);
 }
 modal.style.setProperty('position','fixed','important');
 modal.style.setProperty('left','0','important');
 modal.style.setProperty('top','0','important');
 modal.style.setProperty('right','0','important');
 modal.style.setProperty('bottom','0','important');
 modal.style.setProperty('width','100vw','important');
 modal.style.setProperty('height','100vh','important');
 modal.style.setProperty('margin','0','important');
 modal.style.setProperty('transform','none','important');
 modal.style.setProperty('translate','none','important');
 modal.style.setProperty('z-index','2147483000','important');
 const panel=modal.firstElementChild;
 if(panel){
   panel.style.setProperty('position','relative','important');
   panel.style.setProperty('left','auto','important');
   panel.style.setProperty('right','auto','important');
   panel.style.setProperty('top','auto','important');
   panel.style.setProperty('bottom','auto','important');
   panel.style.setProperty('transform','none','important');
   panel.style.setProperty('translate','none','important');
   panel.style.setProperty('width','calc(100vw - 16px)','important');
   panel.style.setProperty('max-width','none','important');
   panel.style.setProperty('height','calc(100vh - 16px)','important');
   panel.style.setProperty('max-height','none','important');
   panel.style.setProperty('margin','8px auto','important');
   panel.style.setProperty('box-sizing','border-box','important');
 }
}
function applyAttendanceAuditCompactLayout(){
 if(currentSystem()!=='attendance')return;
 const old=document.getElementById('p79-attendance-audit-compact-v20261007');
 if(old)old.remove();
 const st=document.createElement('style');
 st.id='p79-attendance-audit-compact-v20261007';
 st.textContent=`
 #attendanceImportAuditModal{
   position:fixed!important;
   inset:0!important;
   left:0!important;
   top:0!important;
   right:0!important;
   bottom:0!important;
   width:100vw!important;
   height:100vh!important;
   margin:0!important;
   transform:none!important;
   translate:none!important;
   z-index:2147483000!important;
   font-size:11.5px!important;
   align-items:center!important;
   justify-content:center!important;
   padding:6px!important;
   box-sizing:border-box!important;
   overflow:hidden!important;
 }
 #attendanceImportAuditModal>div{
   width:calc(100vw - 12px)!important;
   max-width:none!important;
   height:calc(100vh - 12px)!important;
   min-height:0!important;
   max-height:none!important;
   margin:0!important;
   display:flex!important;
   flex-direction:column!important;
   overflow:hidden!important;
 }
 #attendanceImportAuditModal h3{font-size:15px!important;line-height:1.3!important}
 #attendanceImportAuditSummary{font-size:11px!important}
 #attendanceImportAuditModal table{
   width:100%!important;
   min-width:1380px!important;
   max-width:none!important;
   table-layout:fixed!important;
   font-size:11.5px!important;
 }
 #attendanceImportAuditModal th,#attendanceImportAuditModal td{
   box-sizing:border-box!important;
   padding:6px 6px!important;
   line-height:1.25!important;
   vertical-align:middle!important;
 }
 #attendanceImportAuditModal th{
   text-align:center!important;
   white-space:nowrap!important;
 }
 /* 12欄固定比例：日期時間保留完整，結果可換行，操作兩格並排 */
 #attendanceImportAuditModal th:nth-child(1),#attendanceImportAuditModal td:nth-child(1){width:3%!important;text-align:center!important}
 #attendanceImportAuditModal th:nth-child(2),#attendanceImportAuditModal td:nth-child(2){width:6%!important}
 #attendanceImportAuditModal th:nth-child(3),#attendanceImportAuditModal td:nth-child(3){width:8%!important}
 #attendanceImportAuditModal th:nth-child(4),#attendanceImportAuditModal td:nth-child(4){width:7%!important}
 #attendanceImportAuditModal th:nth-child(5),#attendanceImportAuditModal td:nth-child(5),
 #attendanceImportAuditModal th:nth-child(6),#attendanceImportAuditModal td:nth-child(6),
 #attendanceImportAuditModal th:nth-child(7),#attendanceImportAuditModal td:nth-child(7),
 #attendanceImportAuditModal th:nth-child(8),#attendanceImportAuditModal td:nth-child(8){
   width:12%!important;
   white-space:nowrap!important;
   overflow:visible!important;
   text-overflow:clip!important;
 }
 #attendanceImportAuditModal th:nth-child(9),#attendanceImportAuditModal td:nth-child(9){width:8%!important;white-space:nowrap!important}
 #attendanceImportAuditModal th:nth-child(10),#attendanceImportAuditModal td:nth-child(10){
   width:4%!important;
   text-align:center!important;
   white-space:nowrap!important;
 }
 #attendanceImportAuditModal th:nth-child(11),#attendanceImportAuditModal td:nth-child(11){
   width:15%!important;
   white-space:normal!important;
   word-break:break-word!important;
   overflow:visible!important;
 }
 #attendanceImportAuditModal th:nth-child(12),#attendanceImportAuditModal td:nth-child(12){width:16%!important}
 #attendanceImportAuditModal button{
   font-size:10.5px!important;
   line-height:1.15!important;
   padding:5px 7px!important;
   border-radius:8px!important;
 }
 #attendanceImportAuditModal td:nth-child(12) .flex,
 #attendanceImportAuditModal td:nth-child(12) .p79-audit-actions{
   display:grid!important;
   grid-template-columns:repeat(2,minmax(0,1fr))!important;
   gap:6px!important;
   align-items:center!important;
   width:100%!important;
   min-width:0!important;
 }
 #attendanceImportAuditModal td:nth-child(12) button{
   width:100%!important;
   min-width:0!important;
   margin:0!important;
   white-space:nowrap!important;
 }
 #attendanceImportAuditModal tbody tr,
 #attendanceImportAuditModal tbody td,
 #attendanceImportAuditModal tbody tr:hover,
 #attendanceImportAuditModal tbody tr:hover td{
   transform:none!important;
   translate:none!important;
 }
 #attendanceImportAuditModal .sticky.top-0{
   padding:8px 12px!important;
   top:0!important;
   z-index:30!important;
   background:inherit!important;
 }
 #attendanceImportAuditModal .sticky.bottom-0{padding:8px 10px!important}
 @media(max-width:1400px){
   #attendanceImportAuditModal{padding:4px!important}
   #attendanceImportAuditModal>div{
     width:calc(100vw - 8px)!important;
     max-width:none!important;
     height:calc(100vh - 8px)!important;
     max-height:none!important;
   }
   #attendanceImportAuditModal table{font-size:10.5px!important}
   #attendanceImportAuditModal th,#attendanceImportAuditModal td{padding:5px 4px!important}
   #attendanceImportAuditModal button{font-size:9.5px!important;padding:4px 5px!important}
 }
 `;
 document.head.appendChild(st);
}

function syncAttendanceAuditTopSafe(){
 if(currentSystem()!=='attendance')return;
 let bottom=0;
 ['#p79SevenTop','#p79UnifiedShellV103','#p79UnifiedShell','header.sticky','header'].forEach(sel=>{
   document.querySelectorAll(sel).forEach(el=>{
     const cs=getComputedStyle(el);
     if(cs.display==='none'||cs.visibility==='hidden')return;
     const r=el.getBoundingClientRect();
     if((cs.position==='fixed'||cs.position==='sticky'||r.top<=4) && r.bottom>bottom && r.bottom<260) bottom=r.bottom;
   });
 });
 const safe=Math.max(96,Math.ceil(bottom));
 document.documentElement.style.setProperty('--p79-audit-top-safe',safe+'px');
}
function enforceAttendanceAuditSemanticLayout(){
 if(currentSystem()!=='attendance')return;
 let raf=0;
 function fix(){
  raf=0;
  portalAttendanceAuditModal();
  // full-screen audit overlay: no top offset needed
  document.querySelectorAll('table').forEach(table=>{
   const heads=[...table.querySelectorAll('thead th')];
   if(!heads.length)return;
   const labels=heads.map(th=>String(th.textContent||'').replace(/\s+/g,'').trim());
   if(!labels.some(x=>x.includes('Excel上班'))||!labels.some(x=>x.includes('系統上班')))return;

   const crossIdx=labels.findIndex(x=>x.includes('跨日'));
   const resultIdx=labels.findIndex(x=>x.includes('比對結果')||x.includes('動作'));
   const opIdx=labels.findIndex(x=>x==='操作'||x.endsWith('操作'));

   function shortAuditReason(raw){
     const t=String(raw||'').replace(/\s+/g,' ').trim();
     if(!t)return '';
     if(/正常|一致|已整合|無異常/.test(t) && !/缺|無上班|無下班|異常|不一致|錯/.test(t))return '';
     if(/跨日/.test(t) && /異常|錯/.test(t))return '跨日異常';
     if(/缺上班|無上班來源|皆缺上班|上班.*缺/.test(t))return '缺上班';
     if(/缺下班|無下班來源|皆缺下班|下班.*缺/.test(t))return '缺下班';
     if(/時間.*異常|時間.*不一致|不一致/.test(t))return '時間不一致';
     if(/Excel.*無.*來源|無.*Excel|Excel.*缺/.test(t))return 'Excel缺資料';
     if(/系統.*無|系統.*缺/.test(t))return '系統缺資料';
     if(/配對.*異常/.test(t))return '配對異常';
     return t.split(/[｜|，,；;]/).map(x=>x.trim()).filter(Boolean)[0]||t;
   }

   table.style.setProperty('table-layout','fixed','important');

   if(resultIdx>=0 && resultIdx!==opIdx){
    const col=resultIdx+1;
    table.querySelectorAll(`tbody td:nth-child(${col})`).forEach(td=>{
      if(!td.dataset.p79AuditFullText)td.dataset.p79AuditFullText=String(td.textContent||'').trim();
      const short=shortAuditReason(td.dataset.p79AuditFullText||td.textContent||'');
      const current=String(td.textContent||'').trim();
      if(current!==short){
        td.textContent=short;
      }
      td.title=short ? (td.dataset.p79AuditFullText||'') : '';
      td.style.setProperty('text-align','center','important');
      td.style.setProperty('font-weight','700','important');
      td.style.setProperty('white-space','nowrap','important');
      td.style.setProperty('overflow','hidden','important');
      td.style.setProperty('text-overflow','ellipsis','important');
    });
   }

   if(crossIdx>=0){
    const col=crossIdx+1;
    table.querySelectorAll(`thead th:nth-child(${col}),tbody td:nth-child(${col})`).forEach(cell=>{
      cell.style.setProperty('text-align','center','important');
      cell.style.setProperty('vertical-align','middle','important');
      cell.style.setProperty('white-space','nowrap','important');
      cell.style.setProperty('transform','none','important');
    });
   }

   const actionIdx=opIdx>=0?opIdx:resultIdx;
   if(actionIdx>=0){
    const col=actionIdx+1;
    table.querySelectorAll(`tbody td:nth-child(${col})`).forEach(td=>{
      const buttons=[...td.querySelectorAll('button')];
      if(buttons.length<2)return;
      let box=buttons[0].parentElement;
      while(box&&box!==td&&box.querySelectorAll('button').length<2)box=box.parentElement;
      box=box&&box!==td?box:td;
      box.style.setProperty('display','grid','important');
      box.style.setProperty('grid-template-columns','repeat(2,minmax(0,1fr))','important');
      box.style.setProperty('gap','6px','important');
      box.style.setProperty('align-items','center','important');
      box.style.setProperty('width','100%','important');
      buttons.forEach(btn=>{
        btn.style.setProperty('width','100%','important');
        btn.style.setProperty('min-width','0','important');
        btn.style.setProperty('margin','0','important');
        btn.style.setProperty('white-space','nowrap','important');
        btn.style.setProperty('transform','none','important');
      });
    });
   }
  });
 }
 function scheduleFix(){if(raf)return;raf=requestAnimationFrame(fix)}
 scheduleFix();
 if(!window.__p79AuditSemanticObserver){
   window.__p79AuditSemanticObserver=new MutationObserver(scheduleFix);
   window.__p79AuditSemanticObserver.observe(document.documentElement,{childList:true,subtree:true});
 }
 setTimeout(scheduleFix,250);setTimeout(scheduleFix,900);
 if(!window.__p79AuditTopSafeResize){
   window.__p79AuditTopSafeResize=true;
   window.addEventListener('resize',scheduleFix,{passive:true});
 }
}


function installAttendanceErrorSheet(){
 if(currentSystem()!=='attendance')return;
 if(window.__p79AttendanceErrorSheetInstalled)return;
 window.__p79AttendanceErrorSheetInstalled=true;

 const style=document.createElement('style');
 style.id='p79-attendance-error-sheet-style';
 style.textContent=\`
 #p79AttendanceErrorSheet{
   position:fixed!important;inset:0!important;z-index:2147483600!important;
   background:#f8fafc!important;color:#0f172a!important;
   display:none;flex-direction:column!important;width:100vw!important;height:100vh!important;
   overflow:hidden!important;font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif!important;
 }
 #p79AttendanceErrorSheet.open{display:flex!important}
 #p79AttendanceErrorSheet .p79aes-head{
   flex:0 0 auto;padding:10px 14px;border-bottom:1px solid #dbe4ee;background:#fff;
   display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
 }
 #p79AttendanceErrorSheet .p79aes-title{font-size:18px;font-weight:900}
 #p79AttendanceErrorSheet .p79aes-sub{font-size:11px;color:#64748b;margin-top:2px}
 #p79AttendanceErrorSheet .p79aes-tools{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
 #p79AttendanceErrorSheet button{
   border:0;border-radius:9px;padding:7px 10px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap
 }
 #p79AttendanceErrorSheet .p79aes-primary{background:#4f46e5;color:#fff}
 #p79AttendanceErrorSheet .p79aes-success{background:#f59e0b;color:#fff}
 #p79AttendanceErrorSheet .p79aes-close{background:#334155;color:#fff}
 #p79AttendanceErrorSheet .p79aes-body{flex:1 1 auto;min-height:0;overflow:auto;padding:10px 12px 16px}
 #p79AttendanceErrorSheet .p79aes-summary{
   margin-bottom:8px;padding:8px 10px;border-radius:10px;background:#fff7ed;color:#9a3412;
   border:1px solid #fed7aa;font-size:12px;font-weight:800
 }
 #p79AttendanceErrorSheet .p79aes-tablewrap{
   background:#fff;border:1px solid #dbe4ee;border-radius:12px;overflow:auto;max-height:calc(100vh - 110px)
 }
 #p79AttendanceErrorSheet table{width:100%;border-collapse:collapse;table-layout:fixed;min-width:1180px;font-size:12px}
 #p79AttendanceErrorSheet th,#p79AttendanceErrorSheet td{
   padding:8px 7px;border-bottom:1px solid #e5e7eb;vertical-align:middle;text-align:center
 }
 #p79AttendanceErrorSheet th{position:sticky;top:0;z-index:3;background:#eaf1f8;font-weight:900;white-space:nowrap}
 #p79AttendanceErrorSheet td:nth-child(1){width:50px}
 #p79AttendanceErrorSheet td:nth-child(2),#p79AttendanceErrorSheet th:nth-child(2){width:105px}
 #p79AttendanceErrorSheet td:nth-child(3),#p79AttendanceErrorSheet th:nth-child(3){width:130px}
 #p79AttendanceErrorSheet td:nth-child(4),#p79AttendanceErrorSheet th:nth-child(4){width:110px}
 #p79AttendanceErrorSheet td:nth-child(5),#p79AttendanceErrorSheet th:nth-child(5),
 #p79AttendanceErrorSheet td:nth-child(6),#p79AttendanceErrorSheet th:nth-child(6),
 #p79AttendanceErrorSheet td:nth-child(7),#p79AttendanceErrorSheet th:nth-child(7),
 #p79AttendanceErrorSheet td:nth-child(8),#p79AttendanceErrorSheet th:nth-child(8){width:160px;white-space:nowrap}
 #p79AttendanceErrorSheet td:nth-child(9),#p79AttendanceErrorSheet th:nth-child(9){width:120px}
 #p79AttendanceErrorSheet td:nth-child(10),#p79AttendanceErrorSheet th:nth-child(10){width:230px}
 #p79AttendanceErrorSheet .p79aes-reason{
   display:inline-flex;align-items:center;justify-content:center;min-width:86px;
   padding:5px 9px;border-radius:999px;background:#fee2e2;color:#b91c1c;font-weight:900
 }
 #p79AttendanceErrorSheet .p79aes-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
 #p79AttendanceErrorSheet .p79aes-actions button{width:100%;background:#eef2ff;color:#4338ca}
 #p79AttendanceErrorSheet .p79aes-actions button:first-child{background:#fef3c7;color:#b45309}
 #p79AttendanceErrorSheet .p79aes-empty{padding:42px 16px;text-align:center;color:#64748b;font-size:15px;font-weight:800}
 @media(max-width:900px){
   #p79AttendanceErrorSheet .p79aes-head{padding:8px}
   #p79AttendanceErrorSheet .p79aes-body{padding:6px}
   #p79AttendanceErrorSheet table{font-size:11px}
 }
 \`;
 document.head.appendChild(style);

 const root=document.createElement('div');
 root.id='p79AttendanceErrorSheet';
 root.innerHTML=\`
   <div class="p79aes-head">
     <div>
       <div class="p79aes-title">⚠️ 考勤異常表</div>
       <div class="p79aes-sub">只顯示需要處理的異常資料；正常資料不顯示</div>
     </div>
     <div class="p79aes-tools" id="p79AttendanceErrorTools"></div>
   </div>
   <div class="p79aes-body">
     <div class="p79aes-summary" id="p79AttendanceErrorSummary"></div>
     <div class="p79aes-tablewrap">
       <table>
         <thead><tr>
           <th>#</th><th>考勤號</th><th>工號</th><th>姓名</th>
           <th>Excel 上班</th><th>Excel 下班</th><th>系統上班</th><th>系統下班</th>
           <th>主要原因</th><th>處理</th>
         </tr></thead>
         <tbody id="p79AttendanceErrorBody"></tbody>
       </table>
     </div>
   </div>\`;
 document.body.appendChild(root);

 function norm(s){return String(s||'').replace(/\s+/g,' ').trim()}
 function shortReason(raw){
   const t=norm(raw);
   if(!t)return '';
   if(/正常|一致|已整合|無異常/.test(t) && !/缺|無上班|無下班|異常|不一致|錯|來源/.test(t))return '';
   if(/跨日/.test(t) && /異常|錯/.test(t))return '跨日異常';
   if(/缺上班|無上班來源|皆缺上班|上班.*缺/.test(t))return '缺上班';
   if(/缺下班|無下班來源|皆缺下班|下班.*缺/.test(t))return '缺下班';
   if(/時間.*異常|時間.*不一致|不一致/.test(t))return '時間不一致';
   if(/Excel.*無.*來源|無.*Excel|Excel.*缺/.test(t))return 'Excel 缺資料';
   if(/系統.*無|系統.*缺/.test(t))return '系統缺資料';
   if(/配對.*異常/.test(t))return '配對異常';
   return t.split(/[｜|，,；;]/).map(x=>x.trim()).filter(Boolean)[0]||t;
 }
 function findAudit(){
   const modal=document.getElementById('attendanceImportAuditModal');
   if(!modal)return null;
   const tables=[...modal.querySelectorAll('table')];
   const table=tables.find(t=>{
     const h=[...t.querySelectorAll('thead th')].map(x=>norm(x.textContent).replace(/\s+/g,''));
     return h.some(x=>x.includes('Excel上班'))&&h.some(x=>x.includes('系統上班'));
   });
   return table?{modal,table}:null;
 }
 function labelIndex(labels,tests){
   for(let i=0;i<labels.length;i++)if(tests.some(re=>re.test(labels[i])))return i;
   return -1;
 }
 function forwardButton(original,cls=''){
   const b=document.createElement('button');
   b.type='button';b.className=cls;b.textContent=norm(original.textContent)||'執行';
   b.addEventListener('click',e=>{
     e.preventDefault();e.stopPropagation();
     original.click();
     setTimeout(refresh,80);setTimeout(refresh,350);setTimeout(refresh,900);
   });
   return b;
 }
 function buildToolbar(modal){
   const tools=root.querySelector('#p79AttendanceErrorTools');
   tools.innerHTML='';
   const all=[...modal.querySelectorAll('button')];
   const defs=[
     [/重新比對/,'p79aes-primary'],
     [/匯出/,''],
     [/完成核對|只保留系統考勤/,'p79aes-success']
   ];
   defs.forEach(([re,cls])=>{
     const original=all.find(b=>re.test(norm(b.textContent)));
     if(original)tools.appendChild(forwardButton(original,cls));
   });
   const closeOriginal=all.find(b=>/關閉/.test(norm(b.textContent)));
   const close=document.createElement('button');
   close.type='button';close.className='p79aes-close';close.textContent='✕ 關閉';
   close.addEventListener('click',()=>{
     if(closeOriginal)closeOriginal.click();
     root.classList.remove('open');
     root.dataset.sourceOpen='0';
     const modal=document.getElementById('attendanceImportAuditModal');
     if(modal)modal.style.removeProperty('display');
   });
   tools.appendChild(close);
 }
 function refresh(){
   const found=findAudit();
   if(!found)return;
   const {modal,table}=found;
   const cs=getComputedStyle(modal);
   const sourceLooksOpen=cs.display!=='none'&&!modal.classList.contains('hidden')&&modal.getAttribute('aria-hidden')!=='true';
   if(!sourceLooksOpen && root.dataset.sourceOpen!=='1')return;

   const heads=[...table.querySelectorAll('thead th')];
   const labels=heads.map(th=>norm(th.textContent).replace(/\s+/g,''));
   const idx={
     att:labelIndex(labels,[/考勤號/]),
     emp:labelIndex(labels,[/^工號$/,/員工工號/]),
     name:labelIndex(labels,[/姓名/]),
     exIn:labelIndex(labels,[/Excel上班/]),
     exOut:labelIndex(labels,[/Excel下班/]),
     sysIn:labelIndex(labels,[/系統上班/]),
     sysOut:labelIndex(labels,[/系統下班/]),
     status:labelIndex(labels,[/系統狀態/]),
     result:labelIndex(labels,[/比對結果/,/動作/]),
     op:labelIndex(labels,[/^操作$/, /處理/])
   };

   const out=[];
   [...table.querySelectorAll('tbody tr')].forEach((tr,rowNo)=>{
     const tds=[...tr.children];
     if(!tds.length)return;
     const resultRaw=idx.result>=0?norm(tds[idx.result]?.dataset?.p79AuditFullText||tds[idx.result]?.textContent):'';
     let reason=shortReason(resultRaw);
     const statusText=idx.status>=0?norm(tds[idx.status]?.textContent):'';
     if(!reason && /缺|異常|錯|待處理/.test(statusText))reason=shortReason(statusText)||statusText;
     if(!reason)return;
     out.push({tr,tds,rowNo,reason});
   });

   const body=root.querySelector('#p79AttendanceErrorBody');
   body.innerHTML='';
   out.forEach((r,i)=>{
     const tr=document.createElement('tr');
     const val=k=>idx[k]>=0?norm(r.tds[idx[k]]?.textContent):'--';
     [String(i+1),val('att'),val('emp'),val('name'),val('exIn'),val('exOut'),val('sysIn'),val('sysOut')].forEach(v=>{
       const td=document.createElement('td');td.textContent=v||'--';tr.appendChild(td);
     });
     const reasonTd=document.createElement('td');
     reasonTd.innerHTML='<span class="p79aes-reason"></span>';
     reasonTd.querySelector('span').textContent=r.reason;
     tr.appendChild(reasonTd);

     const actionTd=document.createElement('td');
     const actionBox=document.createElement('div');actionBox.className='p79aes-actions';
     const sourceActionTd=idx.op>=0?r.tds[idx.op]:(idx.result>=0?r.tds[idx.result]:null);
     const buttons=sourceActionTd?[...sourceActionTd.querySelectorAll('button')]:[];
     buttons.slice(0,2).forEach(b=>actionBox.appendChild(forwardButton(b,'')));
     if(!buttons.length){
       const span=document.createElement('span');span.textContent='—';span.style.color='#94a3b8';actionBox.appendChild(span);
     }
     actionTd.appendChild(actionBox);tr.appendChild(actionTd);
     body.appendChild(tr);
   });
   if(!out.length){
     body.innerHTML='<tr><td colspan="10"><div class="p79aes-empty">目前沒有需要處理的異常資料</div></td></tr>';
   }
   root.querySelector('#p79AttendanceErrorSummary').textContent='異常 '+out.length+' 筆｜正常資料已自動隱藏';
   buildToolbar(modal);

   root.dataset.sourceOpen='1';
   root.classList.add('open');
   // 原本比對視窗只保留邏輯與按鈕事件，不再直接顯示，避免版面互相干擾。
   modal.style.setProperty('display','none','important');
 }
 let timer=0;
 const schedule=()=>{clearTimeout(timer);timer=setTimeout(refresh,60)};
 const mo=new MutationObserver(schedule);
 mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','aria-hidden']});
 document.addEventListener('click',()=>setTimeout(schedule,0),true);
 setTimeout(schedule,300);setTimeout(schedule,1200);
}
function applyAttendanceMenuLayout(){
 if(currentSystem()!=='attendance')return;
 ['btnAttendanceImport','btnAttendanceExport'].forEach(id=>{
   const el=document.getElementById(id);
   if(el)el.style.setProperty('display','none','important');
 });
}
function mount(){
 const sys=currentSystem(),m=META[sys]||META.attendance;
 applyAttendanceMenuLayout();
 const existing=document.getElementById('p79SevenTop');
 if(existing){
   ensureStandardMenu(sys);
   applyGlobalTheme(savedGlobalTheme(),{save:false});
   ensureCacheButtonInLegacyMenus();
   return;
 }
 const root=document.createElement('div');root.id='p79SevenTop';
 root.innerHTML=`<div class="top-row"><div class="brand"><div class="logo">${m[0]}</div><div><div class="brand-name">${m[1]}</div><div class="brand-sub">79號碼頭雲端智慧系統｜${roleText()}｜${m[2]}</div></div></div><nav id="p79SevenNav">${NAV.map(n=>`<a class="${n[0]===sys?'active':''}" href="${n[3]}">${n[1]} ${n[2]}</a>`).join('')}</nav><div class="action"><div id="p79SevenMenuWrap"><button id="p79SevenMenuButton" type="button">☰ 功能選單</button></div></div></div><div id="p79SevenStatus"><span class="cloud-title">☁️ 雲端</span>${SYSTEMS.map(([k,l])=>`<span class="sys" data-sys="${k}" data-state="idle"><b>${l}</b><span>● 待命</span></span>`).join('')}</div>`;
 document.body.insertBefore(root,document.body.firstChild);
 ensureStandardMenu(sys);
 document.addEventListener('click',e=>{if(!e.target?.closest?.('#p79SevenMenuWrap'))closeMenu()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
 applyGlobalTheme(savedGlobalTheme(),{save:false});
}

function ensureCacheButtonInLegacyMenus(){
 const selectors=['#p79SystemMenu','#p79HrSystemMenu','#p79UnifiedMenu','#attendanceDrawer','#p79UnifiedShell .p79u-actions','#p79HrShellV103 .p79v103-menu'];
 selectors.forEach(sel=>{
   const menu=document.querySelector(sel);
   if(!menu)return;
   if(menu.querySelector('[data-p79-cache-center-legacy="1"]'))return;
   const btn=document.createElement('button');
   btn.type='button';
   btn.dataset.p79CacheCenterLegacy='1';
   btn.className='p79-cache-center-legacy-btn';
   btn.textContent='☁️ 資料快取中心';
   btn.addEventListener('click',()=>{
     try{window.Port79DataCache?.openCenter?.()}catch(e){console.error(e)}
   });
   const buttons=[...menu.querySelectorAll('button')];
   const theme=buttons.find(b=>/全系統顯示模式|深淺色|亮色|暗色/.test(String(b.textContent||'')));
   if(theme)menu.insertBefore(btn,theme); else menu.appendChild(btn);
 });
}

function render(data){const systems={...(data?.systems||{})};
if(!systems.workhours){
  systems.workhours={active:[],passive:true,lastCompleted:null};
}const signature=SYSTEMS.map(([k])=>{const s=systems[k]||{},a=Array.isArray(s.active)?s.active:[],j=a[0]||{},last=s.lastCompleted||{};return[k,a.length,j.operation,j.action,j.label,last.ok,last.action,Math.floor(Number(last.ageMs||0)/10000)].join(':')}).join('|');if(signature===lastSignature)return;lastSignature=signature;SYSTEMS.forEach(([k])=>{const el=document.querySelector(`#p79SevenStatus [data-sys="${k}"]`);if(!el)return;const span=el.querySelector('span'),s=systems[k]||{},a=Array.isArray(s.active)?s.active:[];let state='idle',txt=(k==='workhours'&&s.passive?'● 被動':'● 待命');if(a.length){const j=a.find(x=>x.operation==='write')||a.find(x=>x.operation==='read')||a[0]||{};state='busy';txt=(j.operation==='write'?'✍️ ':'↙ ')+(j.operationLabel||'讀取')+'中｜'+(j.label||j.action||'雲端資料')}else if(s.lastCompleted&&Number(s.lastCompleted.ageMs||0)<15000){state=s.lastCompleted.ok===false?'error':'done';txt=(state==='done'?'✓ ':'! ')+(s.lastCompleted.operationLabel||'讀取')+'完成'}el.dataset.state=state;if(span.textContent!==txt)span.textContent=txt})}
async function poll(){if(statusBusy||document.visibilityState==='hidden')return;const url=gasUrl();if(!url)return;statusBusy=true;let ctrl,to;try{ctrl=new AbortController();to=setTimeout(()=>ctrl.abort(),4500);const r=await fetch(url+(url.includes('?')?'&':'?')+'action=getCloudActivity&_='+Date.now(),{cache:'no-store',signal:ctrl.signal});const d=await r.json();if(d?.ok)render(d)}catch(e){}finally{if(to)clearTimeout(to);statusBusy=false}}
function start(){mount();applyAttendanceMenuLayout();installAttendanceErrorSheet();setTimeout(applyAttendanceMenuLayout,300);setTimeout(applyAttendanceMenuLayout,1500);ensureCacheButtonInLegacyMenus();setTimeout(ensureCacheButtonInLegacyMenus,300);setTimeout(ensureCacheButtonInLegacyMenus,1500);poll();statusTimer=setInterval(()=>{if(document.visibilityState==='visible')poll()},15000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,20),{once:true});else setTimeout(start,20);

// 舊版比對 modal portal 已停用，改用獨立「考勤異常表」。
})();
