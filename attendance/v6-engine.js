(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root){ root.P79AttendanceV6=api; }
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const MAX_SHIFT_MS=24*60*60*1000;

  function s(v){return String(v==null?'':v).trim();}
  function normAtt(v){const x=s(v).replace(/^0+/,'');return x||s(v);}
  function normEmp(v){return s(v).replace(/\s+/g,'').toUpperCase();}
  function normName(v){return s(v).replace(/\([^)]*\)\s*$/,'').replace(/\s+/g,'').toUpperCase();}
  function recordType(r){
    const x=s(r&&r.status||r&&r['出勤狀態']);
    if(x==='IN'||x.includes('上班簽到')||x==='簽到'||(x.includes('上班')&&!x.includes('未'))) return 'IN';
    if(x==='OUT'||x.includes('下班簽退')||x==='簽退'||(x.includes('下班')&&!x.includes('未'))) return 'OUT';
    return 'OTHER';
  }
  function normalizeTime(v){
    let x=s(v).replace(/-/g,'/').replace(/\s+/g,' ');
    const m=x.match(/^(\d{2,4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
    if(!m) return x;
    let y=Number(m[1]); if(y<1911) y+=1911;
    return `${String(y).padStart(4,'0')}/${String(Number(m[2])).padStart(2,'0')}/${String(Number(m[3])).padStart(2,'0')} ${String(Number(m[4]||0)).padStart(2,'0')}:${String(Number(m[5]||0)).padStart(2,'0')}:${String(Number(m[6]||0)).padStart(2,'0')}`;
  }
  function ts(r){
    const n=normalizeTime(r&&r.timeStr||r&&r['出勤時間']);
    const m=n.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if(!m) return NaN;
    return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]),Number(m[5]),Number(m[6]),0).getTime();
  }
  function identity(r){
    const a=normAtt(r&&(r.attNo!=null?r.attNo:r['考勤號碼'])); if(a) return 'ATT:'+a;
    const e=normEmp(r&&(r.empId||r['自定義編號'])); if(e) return 'EMP:'+e;
    const n=normName(r&&(r.name||r['姓名'])); return n?'NAME:'+n:'';
  }
  function isManual(r){
    const source=s(r&&r.source).toLowerCase();
    const loc=s(r&&r.location);
    const note=s(r&&r.note);
    return r&&r.manuallyEdited===true || s(r&&r.manuallyEdited).toLowerCase()==='true' || source.includes('manual') || loc.includes('管理員手動') || note.includes('管理員手動');
  }
  function normalizedRecord(raw,index){
    const r={...raw};
    if(r.attNo==null) r.attNo=raw['考勤號碼'];
    if(!r.empId) r.empId=raw['自定義編號'];
    if(!r.name) r.name=raw['姓名'];
    if(!r.timeStr) r.timeStr=raw['出勤時間'];
    if(!r.status) r.status=raw['出勤狀態'];
    r.timeStr=normalizeTime(r.timeStr);
    r.__type=recordType(r); r.__ts=ts(r); r.__identity=identity(r); r.__index=index;
    return r;
  }
  function recency(r){
    const a=Date.parse(s(r&&r.manuallyEditedAt))||0;
    const b=Date.parse(s(r&&r.v5PairLinkedAt||r&&r.manualPairLinkedAt))||0;
    const idn=Number(r&&r.id)||0;
    return Math.max(a,b,idn);
  }
  function prefer(a,b){
    if(!b) return a;
    const am=isManual(a), bm=isManual(b); if(am!==bm) return am?a:b;
    const ar=recency(a), br=recency(b); if(ar!==br) return ar>br?a:b;
    return (a.__index||0)>(b.__index||0)?a:b;
  }
  function eventKey(r){
    const t=r.__type||recordType(r), i=r.__identity||identity(r), tm=normalizeTime(r.timeStr);
    return i&&t!=='OTHER'&&tm?`${i}|${t}|${tm}`:'';
  }
  function dedupe(records){
    const map=new Map(), loose=[];
    records.forEach(r=>{const k=eventKey(r); if(!k){loose.push(r);return;} map.set(k,prefer(r,map.get(k)));});
    return [...map.values(),...loose].sort((a,b)=>(a.__ts||0)-(b.__ts||0)||(a.__index||0)-(b.__index||0));
  }
  function pairSession(inRec,outRec,reason){
    const list=[inRec,outRec].filter(Boolean);
    const base=inRec||outRec||{};
    const baseTime=(inRec&&inRec.timeStr)||(outRec&&outRec.timeStr)||'';
    const date=baseTime.slice(0,10).replace(/\//g,'-');
    const month=baseTime.slice(0,7).replace('/','-');
    return {
      attNo:base.attNo,empId:base.empId,name:base.name,dept:base.dept||'一般',unit:base.unit||'',jobTitle:base.jobTitle||'',
      clockIn:inRec||null,clockOut:outRec||null,records:list,
      key:`${identity(base)}|${inRec?inRec.timeStr:''}|${outRec?outRec.timeStr:''}`,
      dateKey:date,accountingDateKey:date,accountingMonthKey:month,
      attendanceStatus:inRec&&outRec?'正常':(inRec?'缺少簽退':'缺少簽到'),
      noteText:[...new Set(list.map(x=>s(x.note)).filter(Boolean))].join(' / '),
      locationText:s((list.slice().sort((a,b)=>(b.__ts||0)-(a.__ts||0)).find(x=>s(x.location))||{}).location),
      sortTime:inRec?inRec.__ts:(outRec?outRec.__ts:0),v6PairReason:reason||''
    };
  }
  function explicitTargetId(r){return s(r.v5PairTargetId);}
  function legacyTargetId(r){return r.__type==='OUT'?s(r.manualPairClockInId):r.__type==='IN'?s(r.manualPairClockOutId):'';}
  function explicitTargetTime(r){
    return r.__type==='OUT'
      ? normalizeTime(r.manualPairClockInTimeStr)
      : (r.__type==='IN' ? normalizeTime(r.manualPairClockOutTimeStr) : '');
  }
  function validPair(a,b){
    const i=a.__type==='IN'?a:b.__type==='IN'?b:null;
    const o=a.__type==='OUT'?a:b.__type==='OUT'?b:null;
    if(!i||!o) return false;
    // V6.0.3：明確禁止跨員工配對。舊資料可能有重複 record.id，
    // 只看 ID 會把 A 員工的人工 OUT 掛到 B 員工的 IN。
    if(i.__identity!==o.__identity) return false;
    const d=o.__ts-i.__ts; return Number.isFinite(d)&&d>=0&&d<=MAX_SHIFT_MS;
  }
  function buildShifts(rawRecords){
    const normalized=dedupe((Array.isArray(rawRecords)?rawRecords:[]).map(normalizedRecord).filter(r=>r.__type!=='OTHER'&&r.__identity&&Number.isFinite(r.__ts)));
    // V6.0.3：同一個舊 record.id 可能不只一筆，不能 Map(id -> 單筆)。
    // 改成 Map(id -> 候選陣列)，再用員工身份、方向、目標時間挑真正 target。
    const byId=new Map();
    normalized.forEach(r=>{
      const id=s(r.id);
      if(!id) return;
      if(!byId.has(id)) byId.set(id,[]);
      byId.get(id).push(r);
    });

    const used=new Set(),sessions=[];
    const use=(a,b,reason)=>{if(!a||!b||used.has(a)||used.has(b)||!validPair(a,b)) return false;const i=a.__type==='IN'?a:b,o=a.__type==='OUT'?a:b;used.add(i);used.add(o);sessions.push(pairSession(i,o,reason));return true;};

    const pickExplicitTarget=(r,id)=>{
      const wantedType=r.__type==='OUT'?'IN':(r.__type==='IN'?'OUT':'');
      if(!wantedType) return null;
      const wantedTime=explicitTargetTime(r);
      const candidates=(byId.get(id)||[])
        .filter(t=>
          t!==r &&
          !used.has(t) &&
          t.__type===wantedType &&
          t.__identity===r.__identity &&
          validPair(r,t)
        )
        .sort((a,b)=>{
          const ae=wantedTime&&normalizeTime(a.timeStr)===wantedTime?0:1;
          const be=wantedTime&&normalizeTime(b.timeStr)===wantedTime?0:1;
          if(ae!==be) return ae-be;
          return Math.abs(a.__ts-r.__ts)-Math.abs(b.__ts-r.__ts);
        });
      return candidates[0]||null;
    };

    normalized.forEach(r=>{
      if(used.has(r)) return;
      const ids=[explicitTargetId(r),legacyTargetId(r)].filter(Boolean);
      for(const id of ids){
        const t=pickExplicitTarget(r,id);
        if(t&&use(r,t,'explicit-id')) return;
      }
    });
    normalized.forEach(r=>{
      if(used.has(r)||!s(r.id)) return;
      const rt=normalizeTime(r.timeStr);
      const candidates=normalized
        .filter(x=>
          !used.has(x) &&
          x!==r &&
          x.__identity===r.__identity &&
          (explicitTargetId(x)===s(r.id)||legacyTargetId(x)===s(r.id)) &&
          validPair(r,x)
        )
        .sort((a,b)=>{
          const at=explicitTargetTime(a), bt=explicitTargetTime(b);
          const ae=at&&at===rt?0:1, be=bt&&bt===rt?0:1;
          if(ae!==be) return ae-be;
          return Math.abs(a.__ts-r.__ts)-Math.abs(b.__ts-r.__ts);
        });
      const t=candidates[0]||null;
      if(t) use(r,t,'reverse-explicit-id');
    });
    normalized.forEach(r=>{
      if(used.has(r)||!isManual(r)) return;
      const want=r.__type==='OUT'?'IN':'OUT';let best=null,bestDiff=Infinity;
      normalized.forEach(c=>{
        if(c===r||used.has(c)||c.__type!==want||c.__identity!==r.__identity) return;
        if(!validPair(r,c)) return;
        const d=Math.abs(c.__ts-r.__ts);if(d<bestDiff){best=c;bestDiff=d;}
      });
      if(best) use(r,best,'manual-rescue');
    });

    const groups=new Map();
    normalized.forEach(r=>{if(used.has(r))return;if(!groups.has(r.__identity))groups.set(r.__identity,[]);groups.get(r.__identity).push(r);});
    groups.forEach(list=>{
      list.sort((a,b)=>a.__ts-b.__ts||a.__index-b.__index);
      const open=[];
      for(const r of list){
        if(r.__type==='IN'){open.push(r);continue;}
        if(r.__type==='OUT'){
          while(open.length&&r.__ts-open[0].__ts>MAX_SHIFT_MS){const old=open.shift();used.add(old);sessions.push(pairSession(old,null,'expired-in'));}
          if(open.length){const i=open.shift();use(i,r,'fifo');}
          else{used.add(r);sessions.push(pairSession(null,r,'orphan-out'));}
        }
      }
      open.forEach(i=>{if(!used.has(i)){used.add(i);sessions.push(pairSession(i,null,'open-in'));}});
    });
    sessions.sort((a,b)=>(b.sortTime||0)-(a.sortTime||0));
    return sessions;
  }
  function install(){
    if(typeof window==='undefined') return false;
    window.p79V6BuildDailyAttendanceRows=buildShifts;
    window.buildDailyAttendanceRows=function(sourceRecords){return buildShifts(sourceRecords);};
    window.p79AttendanceEngineVersion='V6.0.3';
    console.info('[PORT79] Attendance V6.0.3 single pairing engine installed');
    return true;
  }
  return {MAX_SHIFT_MS,normalizeTime,recordType,identity,isManual,dedupe,buildShifts,install};
});
if(typeof window!=='undefined'&&window.P79AttendanceV6){window.P79AttendanceV6.install();}
