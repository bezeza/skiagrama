/* ===== Сховища, налаштування, стан, генерація тексту ===== */
const SET_KEY='skiagrama.settings.v1',TPL_KEY='skiagrama.templates.v1',A_KEY='skiagrama.archive.v1',DRAFT_KEY='skiagrama.draft.v1',USE_KEY='skiagrama.usage.v1',AUDIT_KEY='skiagrama.audit.v1';
const DEF_ORG={name:'',sub:'',cab:'Рентгенологічний кабінет',addr:'',tel:'',edrpou:'',form:'',order:''};
let SET=Object.assign({doctor:'',depts:'Терапевтичне №1, Терапевтичне №2, Хірургічне, Неврологічне, Інфекційне, Педіатричне, Амбулаторно',
  eed:{...DEF_EED},docTitle:'Лікар-рентгенолог',norms:{},my:{},theme:'system',font:'m',pfs:'m',flow:true,freq:true,printMode:'full',flipEdge:'long',revBacks:false,blank:'C',org:{},btn:{},btnAdd:{},btnOrder:{},lists:{},conclNorm:{},
  lastNum:'',lastNumYear:'',lastBackup:'',welcomed:false,seenVersion:''},store.get(SET_KEY,{}));
SET.eed=Object.assign({...DEF_EED},SET.eed||{});SET.norms=SET.norms||{};SET.my=SET.my||{};
['org','btn','btnAdd','btnOrder','lists','conclNorm','zoneMeta','customZones','boneEdit'].forEach(k=>{if(!SET[k]||typeof SET[k]!=='object')SET[k]={};});
if(!SET.proj||typeof SET.proj!=='object')SET.proj={};
if(!Array.isArray(SET.boneAdd))SET.boneAdd=[];
if(!Array.isArray(SET.boneHide))SET.boneHide=[];
/* 0.5.1: ноутбук більше не зменшує все до 90 % — текст лишається читабельним */
if(!SET.v051lap){SET.v051lap=true;if(SET.screen==='laptop'&&SET.scale===90)SET.scale=100;store.set(SET_KEY,SET);}
/* скорочення: «.кт» + пробіл → фраза; «__» — пропуск, Tab переходить до наступного */
const DEF_ABBR={'кт':'КТ ОГК для уточнення характеру змін','конт':'Rö-контроль через __ днів','вог':'В __ долі __ легені визначається вогнищева тінь __ мм з __ контурами.'};
if(!SET.abbr||typeof SET.abbr!=='object')SET.abbr=Object.assign({},DEF_ABBR);
/* 2.2: за замовчуванням довгий протокол — на цілий аркуш (зворот половинки — лише опція) */
if(!SET.v22){SET.printMode='full';SET.v22=true;store.set(SET_KEY,SET);}
let TPL=store.get(TPL_KEY,[]);
let A=store.get(A_KEY,null);
if(!A){const old=store.get('skiagrama.journal.v1',[]);A=Array.isArray(old)?old:[];}
/* Архів — у IndexedDB браузера (сотні МБ). Раніше був у localStorage: там ~5 млн символів ≈ 1800 протоколів,
   після чого нові протоколи тихо не зберігалися б. Старий архів переноситься сам при першому запуску.
   Дві вкладки: перед записом підтягуємо чужі зміни; видалені записи пам’ятаємо (DEL_KEY), щоб вони не «воскресали». */
const DEL_KEY='skiagrama.archive.deleted';
let aKnown=new Set(A.map(r=>r.id)),aDeleted=new Set(store.get(DEL_KEY,[])),aChain=Promise.resolve(),aFailNote=false;
let AUDIT=store.get(AUDIT_KEY,[]);
if(!Array.isArray(AUDIT))AUDIT=[];
function audit(action){
  AUDIT.push({time:new Date().toISOString(),actor:String(SET.doctor||'Не вказано'),action});
  if(AUDIT.length>5000)AUDIT.splice(0,AUDIT.length-5000);
  store.set(AUDIT_KEY,AUDIT);
}
const bc=typeof BroadcastChannel==='function'?new BroadcastChannel('skiagrama'):null;
function idbPut(k,v){return idb().then(db=>new Promise(res=>{try{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>res(true);t.onerror=t.onabort=()=>res(false);}catch(e){res(false);}})).catch(()=>false);}
function mergeInto(list){let n=0;const byId=new Map(A.map(r=>[r.id,r]));
  aVer++;(list||[]).forEach(r=>{if(!r||!r.id||aDeleted.has(r.id))return;const o=byId.get(r.id);if(!o){A.push(r);byId.set(r.id,r);n++;}else if((r.ts||0)>(o.ts||0))Object.assign(o,r);});return n;}
/* швидкий пошук записів за ПІБ (на тисячах протоколів не перебираємо весь архів на кожну літеру) */
let aVer=0,nameIdx=null,nameIdxKey='';
function byName(n){const key=aVer+'|'+A.length;if(!nameIdx||nameIdxKey!==key||nameIdx.arr!==A){const m=new Map();A.forEach(r=>{const k=norm(r.name);if(!k)return;let l=m.get(k);if(!l)m.set(k,l=[]);l.push(r);});nameIdx={m,arr:A};nameIdxKey=key;}return nameIdx.m.get(n)||[];}
function refreshArchiveViews(){renderNames();updCtrlBadge();if(!$('view-archive').hidden)renderArchive();}
async function archivePersist(){
  const db=await kvGet('archive');
  if(Array.isArray(db)&&mergeInto(db)){aKnown=new Set(A.map(r=>r.id));refreshArchiveViews();}
  if(await idbPut('archive',A)){store.del(A_KEY);if(bc)bc.postMessage('archive');return true;}
  try{localStorage.setItem(A_KEY,JSON.stringify(A));return true;}
  catch(e){if(!aFailNote){aFailNote=true;$('storeBanner').textContent='Пам’ять браузера заповнена — нові протоколи не зберігаються на цьому пристрої. Підключіть папку даних у «Налаштуваннях» і збережіть копію архіву.';$('storeBanner').hidden=false;}return false;}
}
function saveA(){aVer++;
  const now=new Set(A.map(r=>r.id));aKnown.forEach(id=>{if(!now.has(id))aDeleted.add(id);});aKnown=now;
  if(aDeleted.size)store.set(DEL_KEY,[...aDeleted].slice(-5000));
  aChain=aChain.then(archivePersist,archivePersist);folderSoon();return aChain;
}
const archiveSaved=()=>aChain;
if(bc)bc.onmessage=async e=>{
  if(e.data==='archive'){aDeleted=new Set(store.get(DEL_KEY,[]));A=A.filter(r=>!aDeleted.has(r.id));const db=await kvGet('archive');mergeInto(db);aKnown=new Set(A.map(r=>r.id));refreshArchiveViews();}
  else if(e.data==='hello')bc.postMessage('here');
  else if(e.data==='here')$('tabBanner').hidden=false;
};
let USE=store.get(USE_KEY,{counts:{},rank:{},day:''});
if(USE.day!==today()){USE.rank=Object.assign({},USE.counts);USE.day=today();store.set(USE_KEY,USE);}
const saveSet=()=>{store.set(SET_KEY,SET);folderSoon();},saveTpl=()=>{store.set(TPL_KEY,TPL);folderSoon();},saveUse=()=>store.set(USE_KEY,USE);

/* тема і шрифт */
const FONT={s:'14px',m:'15px',l:'16.5px',xl:'18px'},PFONT={s:'14.5px',m:'16px',l:'17.5px',xl:'19.5px'};
const THEME_LABEL={system:'Тема: авто',light:'Тема: світла',grey:'Тема: кабінет',dark:'Тема: темна'};
function applyLook(){const r=document.documentElement;if(SET.theme==='system')r.removeAttribute('data-theme');else r.setAttribute('data-theme',SET.theme);
  r.style.setProperty('--fs',FONT[SET.font]||FONT.m);r.style.setProperty('--pfs',PFONT[SET.pfs]||PFONT.m);const tb=$('themeBtn');if(tb){tb.innerHTML=ic({system:'monitor',light:'sun',grey:'half',dark:'moon'}[SET.theme]||'monitor');tb.title='Вигляд: тема, екран, розташування, масштаб';tb.setAttribute('aria-label','Вигляд');}}

/* посада в підписі — однаково в тексті протоколу й на всіх бланках */
const DOC_TITLE=()=>(SET.docTitle||'').trim()||'Лікар-рентгенолог';
/* стан */
const FIELDS=['pName','pAge','pSex','pNum','pDate','pEed','pDept','pRef','pRefDoc','pCount','conclFree','recFree'];
let S,clicks=0,t0=null,tDone=null,editingId=null;
const zoneMetaOf=(st,id)=>(SET.zoneMeta||{})[st+'.'+id]||{};
/* у флюорографії нові зони ОГК сховані, поки лікар сам їх не покаже */
const ZONE_HIDE_DEF={fg:['ptx','atel','mass']};
const zoneHidden=(st,id)=>{const m=zoneMetaOf(st,id);return m.hidden!=null?!!m.hidden:(ZONE_HIDE_DEF[st]||[]).includes(id);};
const allZonesOf=st=>(STUDIES[st]||{zones:[]}).zones.concat((SET.customZones||{})[st]||[]);
function blankZones(study){const z={};allZonesOf(study).forEach(d=>z[d.id]={st:'n',sel:{}});return z;}
function blank(study){return {study,obj:'kol',side:'п',dept:'poper',skull:'ppn',proj:[],zones:blankZones(study),open:null,meas:{},concl:[],dismissed:[],recs:[],dyn:null,prevId:null,manual:null};}
S=blank('ogk');
const study=()=>STUDIES[S.study];
function visibleZones(){
  return allZonesOf(S.study).filter(d=>(!d.mode||d.mode===S.skull)&&!zoneHidden(S.study,d.id)).map(d=>{
    const m=zoneMetaOf(S.study,d.id);return (!m.name&&!m.tpl)?d:Object.assign({},d,{name:m.name||d.name,tpl:m.tpl||d.tpl});
  });
}
const hiddenZones=()=>allZonesOf(S.study).filter(d=>(!d.mode||d.mode===S.skull)&&zoneHidden(S.study,d.id)).map(d=>{const m=zoneMetaOf(S.study,d.id);return Object.assign({},d,{name:m.name||d.name});});
const isCustomZone=d=>!!d.custom||((SET.customZones||{})[S.study]||[]).some(z=>z.id===d.id);
const normOf=d=>{const o=SET.norms[S.study+'.'+d.id];return o!=null?o:d.norm;};
const isNormOverridden=d=>SET.norms[S.study+'.'+d.id]!=null;
const fieldsObj=()=>{const o={};FIELDS.forEach(k=>o[k]=$(k).value);return o;};
const setFields=o=>{FIELDS.forEach(k=>{if(o&&k in o)$(k).value=o[k];});};
const myKey=d=>S.study+'.'+d.id;
const myList=d=>SET.my[myKey(d)]||[];

/* скасування */
let hist=[],future=[],lastKind='',lastT=0;
function snapshot(){return {S:clone(S),f:fieldsObj(),editingId};}
function pushHist(kind){const now=Date.now();if(kind==='text'&&lastKind==='text'&&now-lastT<1500){lastT=now;return;}hist.push(snapshot());if(hist.length>80)hist.shift();lastKind=kind;lastT=now;}
function tick(kind){pushHist(kind||'click');future=[];clicks++;if(!t0)t0=Date.now();tDone=null;}
function undo(){const s=hist.pop();if(!s){toast('Немає що скасовувати');return;}future.push(snapshot());S=s.S;setFields(s.f);editingId=s.editingId;lastKind='';renderAll();toast('Скасовано');}
function redo(){const s=future.pop();if(!s){toast('Немає що повторювати');return;}hist.push(snapshot());S=s.S;setFields(s.f);editingId=s.editingId;lastKind='';renderAll();toast('Повторено');}

/* кнопки з урахуванням правок лікаря (олівець ✎ біля зони)
   SET.btn['ogk.infil.side.права']={label,phrase,hidden} — зміна стандартної кнопки
   SET.btnAdd['ogk.infil.side']=[{k,label,phrase,hidden}] — додані кнопки
   SET.btnOrder['ogk.infil.side']=['права','обидві',…] — свій порядок */
const gKey=(d,g)=>`${S.study}.${d.id}.${g.id}`;
function effOpts(d,g,all){
  const gk=gKey(d,g),ov=SET.btn||{};
  let list=(g.o||[]).map((o,i)=>{const x=ov[gk+'.'+o[0]]||{};return {k:o[0],ph:x.phrase!=null&&x.phrase!==''?x.phrase:o[1],lb:x.label!=null&&x.label!==''?x.label:o[2],hid:!!x.hidden,i,added:false};});
  ((SET.btnAdd||{})[gk]||[]).forEach((a,j)=>list.push({k:a.k,ph:a.phrase,lb:a.label||a.phrase,hid:!!a.hidden,i:1000+j,added:true}));
  const ord=(SET.btnOrder||{})[gk];
  if(ord&&ord.length){const pos=k=>{const i=ord.indexOf(k);return i<0?9999:i;};list.sort((a,b)=>pos(a.k)-pos(b.k)||a.i-b.i);}
  else if(SET.freq){const r=USE.rank||{};list.sort((a,b)=>(r[useKey(d.id,g.id,b.k)]||0)-(r[useKey(d.id,g.id,a.k)]||0)||a.i-b.i);}
  return all?list:list.filter(x=>!x.hid);
}
/* свої висновки й рекомендації: SET.lists['concl.ogk' | 'rec'] = {edit:{оригінал:новий}, hidden:[ключі], add:[{k,t}], order:[ключі]};
   SET.conclNorm.ogk — свій висновок норми */
const listKeyOf=kind=>kind==='concl'?'concl.'+S.study:'rec';
const listUseKey=(key,k)=>`L.${key}.${k}`;
function effList(kind,all){
  const key=listKeyOf(kind);const L=SET.lists[key]||{};const ed=L.edit||{},hid=L.hidden||[];
  const list=(kind==='concl'?study().chips:RECS).map((t,i)=>({k:t,raw:ed[t]?ed[t]:t,hid:hid.includes(t),i,added:false}));
  (L.add||[]).forEach((a,j)=>list.push({k:a.k,raw:a.t,hid:hid.includes(a.k),i:1000+j,added:true}));
  const ord=L.order;
  if(ord&&ord.length){const pos=k=>{const i=ord.indexOf(k);return i<0?9999:i;};list.sort((a,b)=>pos(a.k)-pos(b.k)||a.i-b.i);}
  else if(SET.freq){const r=USE.rank||{};list.sort((a,b)=>(r[listUseKey(key,b.k)]||0)-(r[listUseKey(key,a.k)]||0)||a.i-b.i);}
  list.forEach(x=>x.t=x.raw.replace('{dept}',deptGen()));
  return all?list:list.filter(x=>!x.hid);
}
const normConclOf=()=>{const v=(SET.conclNorm||{})[S.study];return v&&v.trim()?v.trim().replace(/\.$/,''):study().normConcl;};
/* підказка висновку з урахуванням перейменованих кнопок: «Правобічна пневмонія (S9)» → «Пневмонія правої легені (S9)» */
function renameConcl(t){const L=SET.lists['concl.'+S.study];if(!L||!L.edit)return t;
  for(const k in L.edit){const v=L.edit[k];if(!v)continue;const from=k.replace('{dept}',deptGen()),to=v.replace('{dept}',deptGen());if(t===from)return to;if(t.startsWith(from+' '))return to+t.slice(from.length);}return t;}
function countList(kind,k){const key=listUseKey(listKeyOf(kind),k);USE.counts[key]=(USE.counts[key]||0)+1;saveUse();}
const optPhrase=(d,g,k)=>{const o=effOpts(d,g,true).find(x=>x.k===k);return o?o.ph:'';};

/* генерація тексту */
function groupVal(d,z,gid,showReq){
  const g=d.groups.find(x=>x.id===gid);if(!g)return '';
  const v=z.sel[gid];
  if(g.type==='text'){const t=String(v||'').trim();return t||(showReq&&g.req?'…':'');}
  if(g.many){const a=(v||[]).map(k=>optPhrase(d,g,k)).filter(Boolean);return a.length?a.join(g.join||', '):(showReq&&g.req?'…':'');}
  const ph=v?optPhrase(d,g,v):'';return ph||(showReq&&g.req?'…':'');
}
const hasStd=(d,z)=>(d.groups||[]).some(g=>groupVal(d,z,g.id,false));
const sentence=t=>{t=String(t).trim();if(!t)return '';t=cap(t);return /[.!?]$/.test(t)?t:t+'.';};
function zoneText(d){
  const z=S.zones[d.id];if(!z||z.st==='x')return '';
  if(z.st==='n')return normOf(d);
  const my=(z.sel.__my||[]).filter(p=>myList(d).includes(p)).map(sentence).join(' ');
  if(!hasStd(d,z)&&my)return my;
  let t=(d.tpl||'{ch}.').replace('{|segclose}',groupVal(d,z,'seg',false)?')':'').replace(/\{([^{}|]*)\|(\w+)\}/g,(m,pre,g)=>{const v=groupVal(d,z,g,false);return v?pre+v:'';})
             .replace(/\{(\w+)\}/g,(m,g)=>groupVal(d,z,g,true));
  t=t.replace(/\s+/g,' ').replace(/\s+([,.])/g,'$1').replace(/\.\./g,'.').trim();
  return cap(t)+(my?' '+my:'');
}
function zoneState(d){const z=S.zones[d.id];if(z.st==='x')return 'x';if(z.st==='n')return 'n';return zoneText(d).includes('…')?'e':'c';}
function effBone(all){
  const ed=SET.boneEdit||{},hid=SET.boneHide||[];
  const list=BONE_OBJ.map((o,i)=>{const x=ed[o[0]]||{};return {id:o[0],n:x.n||o[1],ph:x.phrase||o[2],g:x.g||o[3],both:x.both||o[4],hid:hid.includes(o[0]),i,added:false};});
  (SET.boneAdd||[]).forEach((a,j)=>list.push({id:a.id,n:a.n,ph:a.phrase,g:a.g,both:a.both,hid:hid.includes(a.id),i:1000+j,added:true}));
  return all?list:list.filter(x=>!x.hid);
}
function objPhrase(){
  const o=effBone(true).find(x=>x.id===S.obj)||effBone()[0]||{ph:'',g:'none',both:''};
  if(o.g==='none')return o.ph;
  if(S.side==='о')return o.both||o.ph;
  const f=SIDE_FORMS[o.g]||SIDE_FORMS.m;return String(o.ph).replace('{s}',S.side==='л'?f[1]:f[0]);
}
function effProj(all){
  const L=SET.proj||{},ed=L.edit||{},hid=L.hidden||[];
  let list=PROJ.map((t,i)=>({k:t,t:ed[t]||t,hid:hid.includes(t),i,added:false}));
  (L.add||[]).forEach((a,j)=>list.push({k:a.k,t:a.t,hid:hid.includes(a.k),i:1000+j,added:true}));
  const ord=L.order;if(ord&&ord.length){const pos=k=>{const i=ord.indexOf(k);return i<0?9999:i;};list.sort((a,b)=>pos(a.k)-pos(b.k)||a.i-b.i);}
  return all?list:list.filter(x=>!x.hid);
}
function projLabel(p){const x=effProj(true).find(o=>o.k===p);return x?x.t:p;}
const deptGen=()=>(SPINE_DEPT.find(x=>x[0]===S.dept)||SPINE_DEPT[2])[2];
function headerLine(){
  const d=fmtD($('pDate').value),n=$('pNum').value.trim()||'___';
  const proj=S.proj.length?` (${S.proj.map(projLabel).join(', ')} ${S.proj.length>1?'проєкції':'проєкція'})`:'';
  switch(S.study){
    case 'fg':return `На ФГ ОГК від ${d} р. № ${n}:`;
    case 'bone':return `На Rö-гр. ${objPhrase()}${proj} від ${d} р. № ${n}:`;
    case 'spine':return `На Rö-гр. ${deptGen()} відділу хребта${proj} від ${d} р. № ${n}:`;
    case 'abd':return `На оглядову Rö-гр. ОЧП від ${d} р. № ${n}:`;
    case 'skull':return `На Rö-гр. ${S.skull==='ppn'?'ППН':'черепа'}${proj} від ${d} р. № ${n}:`;
    default:return `На Rö-гр. ОГК${proj} від ${d} р. № ${n}:`;
  }
}
function activeMeas(){if(S.study==='bone')return OBJ_MEAS[S.obj]||[];return study().meas||[];}
function measResults(){
  const out=[];
  activeMeas().forEach(id=>{const def=MEAS[id];const m=S.meas[id]||{};let v;
    if(def.kind==='kti'){const ar=num(m.ar),al=num(m.al);const a=(ar>0&&al>0)?ar+al:num(m.a),b=num(m.b);v=(a>0&&b>0)?a/b:num(m.v);if(isFinite(v))v=Math.round(v*100)/100;}else v=num(m.v);
    if(!isFinite(v))return;if(def.lim&&(v<def.lim[0]||v>def.lim[1])){out.push({id,def,v,bad:true,r:{ok:1,ph:''}});return;}out.push({id,def,v,r:def.grade(v,m)});});
  return out;
}
function allNormal(){return visibleZones().every(d=>S.zones[d.id].st!=='c')&&measResults().every(x=>x.r.ok);}
function suggestions(){
  const out=[];const Z=S.zones;const sel=(z,g)=>(Z[z]&&Z[z].st==='c')?Z[z].sel[g]:undefined;const ch=z=>Z[z]&&Z[z].st==='c';
  const add=(t,why,tbd)=>{t=t&&renameConcl(t);if(t&&!out.some(x=>x[0]===t))out.push([t,why,tbd]);};
  if(S.study==='ogk'||S.study==='fg'){
    if(ch('infil')&&hasStd(OGK_ZONES[0],Z.infil)){const side={обидві:'Двобічна',права:'Правобічна',ліва:'Лівобічна'}[sel('infil','side')]||'';const type={зливні:'вогнищево-зливна',вогнищеві:'вогнищева',сегм:'сегментарна'}[sel('infil','char')]||'';const sg=groupVal(OGK_ZONES[0],Z.infil,'seg',false);add(cap(`${side} ${type} пневмонія`.replace(/\s+/g,' ').trim().toLowerCase())+(sg?` (${sg})`:''),'інфільтрація');}
    if(sel('pneum','p')==='підвищ')add('Емфізема легень','підвищена пневматизація');
    if(ch('foci')&&['щільні','кальц'].includes(sel('foci','dens'))&&sel('foci','lobe')==='верх')add('ЗЗТБ','щільні вогнища у верхній долі');
    const pat=ch('pattern')?(sel('pattern','ch')||[]):[];
    if(pat.includes('посил')&&!ch('infil'))add('Гострий бронхіт','посилений малюнок');
    if(pat.includes('деформ')&&ch('pneum'))add('Хронічний обструктивний бронхіт','деформований малюнок + емфізема');
    if(pat.includes('застій'))add('Застій у малому колі кровообігу','застійний малюнок');
    if(sel('heart','ch')==='легеневе')add('Хронічне легеневе серце','легенева конфігурація серця');
    if(['рідП','рідЛ'].includes(sel('sinus','ch')))add(sel('sinus','ch')==='рідП'?'Правобічний гідроторакс':'Лівобічний гідроторакс','рідина в плевральній порожнині');
    if(ch('ptx')&&hasStd(OGK_ZONES.find(z=>z.id==='ptx'),Z.ptx)){const side={права:'Правобічний',ліва:'Лівобічний',обидві:'Двобічний'}[sel('ptx','side')]||'';add(cap(`${side} пневмоторакс`.replace(/\s+/g,' ').trim().toLowerCase()),'пневмоторакс');}
    if(ch('atel')&&hasStd(OGK_ZONES.find(z=>z.id==='atel'),Z.atel)){const side={права:'Правобічний',ліва:'Лівобічний'}[sel('atel','side')]||'';add(cap(`${side} ателектаз`.replace(/\s+/g,' ').trim().toLowerCase()),'ателектаз');}
    if(ch('mass')&&hasStd(OGK_ZONES.find(z=>z.id==='mass'),Z.mass))add('Округла тінь (утвір) — потребує дообстеження','округла тінь',1);
    if(['правий','лівий','обидва'].includes(sel('sinus','ch')))add('Плевральні спайки','облітерація синуса');
    if(sel('heart','ch')==='вліво')add('Кардіомегалія','серце розширене вліво');
    if(sel('heart','ch')==='аорта')add('Аорта ущільнена','аорта');
    const bx=sel('bones','ch')||[];
    if(bx.includes('екс'))add('Штучний водій ритму (ЕКС)','тінь ЕКС');
    if(bx.includes('шви'))add('Післяопераційні шви на легенях','шви');
    if(bx.includes('кліпси'))add('Металеві кліпси','кліпси');
    if(bx.includes('торако'))add('Стан після торакотомії','торакотомія');
    if(bx.includes('метал'))add('Металеве стороннє тіло','метал');
    if(bx.includes('резек'))add('Стан після резекції легені','після резекції');
    if(bx.includes('перел'))add('Перелом ребра','перелом ребра');
    const infX=sel('infil','extra')||[];if(infX.includes('порожн'))add('Порожнина розпаду','порожнина в інфільтраті',1);
    if(sel('atel','loc')==='диск')add('Дископодібний ателектаз','дископодібний ателектаз');
    if((sel('roots','extra')||[]).includes('кальц'))add('Кальцинати коренів','кальцинати коренів');
  }
  if(S.study==='bone'){
    if(ch('frac')&&hasStd(BONE_ZONES[0],Z.frac)){const w=groupVal(BONE_ZONES[0],Z.frac,'where',false);const dsp=groupVal(BONE_ZONES[0],Z.frac,'disp',false);add(`Перелом ${w||'…'}${dsp?' '+dsp:''}`,'травматичні зміни');
      const fx=(sel('frac','extra')||[]);if(fx.includes('мозоль'))add('Кісткова мозоль','консолідація');if(fx.includes('консол'))add('Ознаки консолідації перелому','консолідація');}
    const st={нерівн:'I',пом:'II',знач:'III'}[sel('space','ch')];
    if(st)add(`Деформуючий остеоартроз ${objPhrase()} ${st} ст.`,'звуження щілини',1);
    const s=sel('struct','ch')||[];if(s.some(k=>['плям','диф','регіон'].includes(k)))add('Остеопороз','кісткова структура');
    if(ch('lux')&&hasStd(BONE_ZONES.find(z=>z.id==='lux'),Z.lux))add(zoneText(BONE_ZONES.find(z=>z.id==='lux')).replace(/\.$/,''),'вивих');
    if(ch('impl')&&hasStd(BONE_ZONES.find(z=>z.id==='impl'),Z.impl))add('Стан після остеосинтезу','метал / фіксація');
  }
  if(S.study==='spine'){
    if((ch('discs')&&hasStd(SPINE_ZONES[3],Z.discs))||(ch('plates')&&hasStd(SPINE_ZONES[4],Z.plates)))add(`Остеохондроз ${deptGen()} відділу хребта`,'щілини / пластинки');
    const p=sel('plates','ch')||[];if(p.includes('ост'))add('Спондильоз','остеофіти');if(p.includes('спа'))add('Спондилоартроз','фасеткові суглоби');if(p.includes('унк'))add('Унковертебральний артроз','унковертебральні суглоби');
    if(ch('bodies')&&hasStd(SPINE_ZONES[2],Z.bodies))add(`Компресійна деформація тіла хребця ${groupVal(SPINE_ZONES[2],Z.bodies,'lvl',false)||'…'}`,'тіла хребців');
    if(ch('list')&&hasStd(SPINE_ZONES[5],Z.list))add(zoneText(SPINE_ZONES[5]).replace(/\.$/,''),'лістез');
  }
  if(S.study==='abd'){
    if(ch('gas')&&hasStd(ABD_ZONES[0],Z.gas))add('Ознаки перфорації порожнистого органу','вільний газ');
    if((ch('levels')&&hasStd(ABD_ZONES[1],Z.levels))||(ch('loops')&&hasStd(ABD_ZONES[2],Z.loops)))add('Ознаки гострої кишкової непрохідності','рівні рідини / петлі');
    if(ch('stones')&&hasStd(ABD_ZONES[3],Z.stones))add(`Конкремент ${groupVal(ABD_ZONES[3],Z.stones,'side',false)||'…'}`,'тінь конкременту');
  }
  if(S.study==='skull'){
    const s=sel('max','side');if(s)add({прав:'Правобічний',лів:'Лівобічний',обидві:'Двобічний'}[s]+' гайморит','гайморові пазухи');
    if(ch('front')&&hasStd(SKULL_ZONES[3],Z.front))add('Фронтит','лобні пазухи');if(ch('ethm')&&hasStd(SKULL_ZONES[4],Z.ethm))add('Етмоїдит','решітчастий лабіринт');
    if(ch('septum')&&hasStd(SKULL_ZONES[5],Z.septum))add('Викривлення носової перегородки','носова перегородка');
    if(ch('vault')&&hasStd(SKULL_ZONES[0],Z.vault))add('Перелом кісток склепіння черепа','кістки склепіння');
  }
  measResults().forEach(x=>{if(x.r.c)add(x.r.c,x.def.n,x.def.tbd);});
  return out;
}
function conclItems(){const a=[...S.concl];const f=$('conclFree').value.trim().replace(/\.$/,'');if(f)a.push(f);return a;}
function conclText(){
  const a=conclItems();
  if(a.length)return {t:'Rö-ч: '+a.map(x=>String(x).trim().replace(/\.+$/,'')).join('. ')+'.',tbd:false};
  if(allNormal())return {t:'Rö-ч: '+normConclOf()+'.',tbd:!!study().normTbd&&!(SET.conclNorm||{})[S.study],auto:1};
  return {t:'Rö-ч: …',tbd:false};
}
function recList(){const a=[...S.recs];const f=$('recFree').value.trim().replace(/\.$/,'');if(f)a.push(f);return a;}
function recText(){const a=recList().map(x=>String(x).trim().replace(/[.;]+$/,''));return a.length?'Рекомендовано: '+a.join('; ')+'.':'';}
function dynText(){if(!S.dyn||!S.prevId)return '';const p=A.find(r=>r.id===S.prevId);if(!p)return '';return `Порівняно з дослідженням від ${fmtD(p.date)}: ${S.dyn}.`;}
function protocol(){
  const name=$('pName').value.trim()||'[ПІБ]',age=$('pAge').value.trim();
  const body=visibleZones().map(d=>({t:zoneText(d),tbd:d.tbd&&S.zones[d.id].st==='n'&&!isNormOverridden(d),zone:d.id})).filter(x=>x.t);
  measResults().filter(x=>!x.bad).forEach(x=>body.push({t:x.r.ph,zone:'meas'}));
  const dy=dynText();if(dy)body.push({t:dy,zone:'prev'});
  const eed=$('pEed').value.trim();
  return {head:`${name}${age?', '+ageStr(age):''}`,ref:headerLine(),body,concl:conclText(),rec:recText(),eed:eed?`ЕЕД ${eed} мЗв.`:'ЕЕД ___ мЗв.',doc:`${DOC_TITLE()} ______________ ${SET.doctor||'[ПІБ]'}`};
}
const STUDY_TITLE=()=>({ogk:'Rö-графія ОГК',fg:'Флюорографія ОГК',bone:`Rö-графія ${objPhrase()}`,spine:`Rö-графія ${deptGen()} відділу хребта`,abd:'Оглядова Rö-графія ОЧП',skull:`Rö-графія ${S.skull==='ppn'?'ППН':'черепа'}`}[S.study]);
function docData(){
  const P=protocol();
  return {name:$('pName').value.trim()||'[ПІБ]',age:$('pAge').value.trim(),sex:$('pSex').value,dept:$('pDept').value.trim(),ref:$('pRef').value.trim(),refDoc:$('pRefDoc').value.trim(),
    num:$('pNum').value.trim(),date:$('pDate').value,what:STUDY_TITLE(),proj:S.proj.map(p=>typeof projLabel==='function'?projLabel(p):p).join(', '),count:$('pCount')?$('pCount').value.trim():'',eed:$('pEed').value.trim(),
    study:S.study,urgent:!!S.urgent,status:statusOf(),head:P.head,refLine:P.ref,body:P.body.map(x=>x.t),concl:P.concl.t.replace(/^Rö-ч:\s*/,''),rec:P.rec.replace(/^Рекомендовано:\s*/,''),doctor:SET.doctor,docTitle:DOC_TITLE(),manual:S.manual,manualHtml:S.manual!=null&&S.manualHtml?S.manualHtml:null};
}
function genText(P){P=P||protocol();return [P.head,P.ref,P.body.map(x=>x.t).join(' '),P.concl.t,P.rec,P.eed+'   '+P.doc].filter(Boolean).join('\n');}
const protocolText=()=>S.manual!=null?S.manual:genText();
function unitsFromP(P){const u=[{t:P.head,p:0,c:'pt'},{t:P.ref,p:1}];P.body.forEach(x=>u.push({t:x.t,p:2}));u.push({t:P.concl.t,p:3,c:'concl'});if(P.rec)u.push({t:P.rec,p:4});u.push({t:P.eed+'   '+P.doc,p:5,c:'foot'});return u;}
function unitsFromText(text){const u=[];String(text||'').split('\n').forEach((ln,i)=>{if(!ln.trim())return;const c=i===0?'pt':/^Rö-ч:/.test(ln)?'concl':/^ЕЕД/.test(ln)?'foot':'';ln.split(/(?<=[.!?:])\s+(?=\S)/).forEach(s=>u.push({t:s,p:i,c}));});return u;}
const currentUnits=()=>S.manual!=null?unitsFromText(S.manual):unitsFromP(protocol());

/* бічність: в описі справа, а у висновку зліва (і навпаки) */
function lateralityIssue(){
  const P=protocol();const desc=P.body.map(x=>x.t).join(' ').toLowerCase();const con=conclItems().join(' ').toLowerCase();
  const both=/обох|двобіч|обидв|з обох/;if(!con||both.test(con)||both.test(desc))return '';
  const R=/правобіч|правої|правого|правий|праве|справа/,L=/лівобіч|лівої|лівого|лівий|ліве|зліва/;
  const dR=R.test(desc),dL=L.test(desc),cR=R.test(con),cL=L.test(con);
  if(dR&&!dL&&cL&&!cR)return 'Бічність: в описі — справа, а у висновку — зліва. Перевірте.';
  if(dL&&!dR&&cR&&!cL)return 'Бічність: в описі — зліва, а у висновку — справа. Перевірте.';
  return '';
}
/* «справа ↔ зліва»: міняє бік у фразі, зберігаючи велику літеру */
const SIDE_RE=/(?<![\p{L}’ʼ'])(справа|зліва|вправо|вліво|(прав|лів)(ий|ого|ому|им|ій|ої|ою|а|е|у|і|их|ими|оруч|обічн\p{L}*|осторонн\p{L}*))(?![\p{L}’ʼ'])/giu;
const SIDE_PAIR={справа:'зліва',зліва:'справа',вправо:'вліво',вліво:'вправо'};
function swapSide(t){return String(t).replace(SIDE_RE,(w,all,stem)=>{const lw=w.toLowerCase();let r=SIDE_PAIR[lw];
  if(!r)r=(stem.toLowerCase()==='прав'?'лів':'прав')+lw.slice(stem.length);
  return w[0]!==w[0].toLowerCase()?r[0].toUpperCase()+r.slice(1):r;});}
/* висновок суперечить опису: у висновку патологія, а її зона — «норма» */
const CONTRA=[[/гідроторакс|плеврит|рідин|плевральн/,['sinus']],[/пневмоні|інфільтр/,['infil','foci']],[/ззтб|туберкул/,['foci','roots']],
  [/пневмоторакс|гідропневмоторакс/,['ptx','pneum','sinus']],[/ателектаз/,['atel']],[/округл|утвір|утворен/,['mass']],[/порожнин/,['infil','mass']],
  [/емфізем/,['pneum']],[/застій/,['pattern','roots']],[/бронхіт/,['pattern','roots']],[/кардіомегал|серц|аорта/,['heart']],
  [/водій ритму|(^|[^а-яіїєґ'’])екс([^а-яіїєґ'’]|$)|кардіостимулятор|шви на леген|кліпс|торакотомі|резекц\S* леген/,['bones']],
  [/перелом/,['frac','bones','vault','bodies']],[/вивих|підвивих/,['lux','frac']],[/остеосинтез|ендопротез|пластина|стриж/,['impl']],
  [/артроз/,['space','surf']],[/остеопороз/,['struct','bodies']],[/остеохондроз|спондил/,['discs','plates']],
  [/компресійн/,['bodies']],[/лістез/,['list']],[/сколіоз/,['scol','curves']],[/перфорац|пневмоперитон/,['gas']],[/непрохідн/,['levels','loops']],
  [/конкремент|сечокам|камен/,['stones']],[/гайморит/,['max']],[/фронтит/,['front']],[/етмоїдит/,['ethm']],[/синусит/,['max','front','ethm']],[/викривлен.*перегород/,['septum']]];
function contradictions(){
  if(S.manual!=null)return [];const out=[];const vz=visibleZones();const nc=normConclOf();
  conclItems().forEach(it=>{if(it===nc)return;const l=it.toLowerCase();
    for(const [re,ids] of CONTRA){if(!re.test(l))continue;const zs=vz.filter(d=>ids.includes(d.id));if(!zs.length)continue;
      if(zs.every(d=>S.zones[d.id].st==='n')){out.push(`Висновок «${it}», а зона «${zs[0].name}» — норма. Перевірте.`);break;}}});
  return out;
}
/* результат: n — норма, p — патологія, d — дообстеження (авто або вибір лікаря) */
const STATUS={n:'Норма',p:'Патологія',d:'Дообстеження'};
function autoStatus(){
  const items=conclItems(),t=items.concat(recList()).join(' ').toLowerCase();
  if(/дообстеж|уточнен|(^|[^\p{L}])(кт|мрт|мскт)([^\p{L}]|$)/u.test(t))return 'd';
  const nc=normConclOf();const isN=i=>i===nc||/без патолог|патології не|без кістково/i.test(i);
  if(items.length?items.every(isN):allNormal())return 'n';
  return 'p';
}
const statusOf=()=>S.status||autoStatus();
/* незаповнені пропуски «__» (крім рядка ЕЕД / лікар) */
function hasGaps(){
  const t=S.manual!=null?String(S.manual).split('\n').filter(l=>!/^ЕЕД|^Лікар/.test(l.trim())&&!l.trim().startsWith(DOC_TITLE())).join(' '):protocol().body.map(x=>x.t).concat(conclItems(),recList()).join(' ');
  return /_{2,}/.test(t);
}
/* перевірка перед підписом */
const REF_RE=/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/i;
function checks(){
  const w=[];
  if(!$('pName').value.trim())w.push('Не вказано ПІБ.');
  if(!$('pAge').value.trim())w.push('Не вказано вік.');
  if(!$('pNum').value.trim())w.push('Не вказано № знімка.');
  if(!$('pDate').value)w.push('Не вказано дату знімка.');
  else if($('pDate').value>today())w.push('Дата знімка в майбутньому — перевірте.');
  const ag=$('pAge').value.trim();if(/^\d+$/.test(ag)&&+ag>120)w.push(`Вік ${ag} — перевірте (можна ввести дату народження).`);
  else if(ag&&!/^\d{1,3}$/.test(ag)&&!/^\d{1,3}\s*(міс|дн|р)\.?(\s*\d{1,2}\s*міс\.?)?$/.test(ag))w.push(`Вік «${ag}» — перевірте.`);
  const no=$('pNum').value.trim(),yr=($('pDate').value||today()).slice(0,4);
  if(no){const dup=A.find(r=>!r.example&&r.id!==editingId&&String(r.num).trim()===no&&(r.date||'').slice(0,4)===yr&&norm(r.name)!==norm($('pName').value));if(dup)w.push(`№ ${no} уже є в архіві за ${yr} р. (${dup.name||'без ПІБ'}, ${fmtD(dup.date)}) — перевірте.`);}
  if(['A','B','D'].includes(curBlank())&&!ORG().name)w.push(`Бланк ${curBlank()}: не заповнено назву закладу — «Налаштування» → «Бланк і реквізити закладу».`);
  if(!$('pEed').value.trim())w.push('Не вказано ЕЕД.');
  if((S.study==='bone'||S.study==='spine')&&!S.proj.length)w.push('Не вибрано проєкції.');
  const ref=$('pRef').value.trim();
  if(ref&&!REF_RE.test(ref))w.push('№ е-направлення має вигляд 0000-0000-0000-0000.');
  if(hasGaps())w.push('Є незаповнені пропуски «__» — Tab переходить до наступного.');
  if(S.manual!=null)return w;
  visibleZones().forEach(d=>{if(zoneState(d)==='e')w.push(`«${d.name}»: заповніть зміни до кінця.`);});
  const ct=conclText();
  if(ct.t.includes('…'))w.push('Висновок порожній або не заповнений.');
  const items=conclItems();const nc=normConclOf();const normRe={test:i=>i===nc||/без патолог|патології не|без кістково/i.test(i)};
  if(allNormal()&&items.length&&!items.every(i=>normRe.test(i)))w.push('Усі зони в нормі, а у висновку патологія — перевірте.');
  if(!allNormal()&&items.some(i=>normRe.test(i)))w.push('Є зміни в описі, а висновок «без патології» — перевірте.');
  const lat=lateralityIssue();if(lat)w.push(lat);
  contradictions().forEach(x=>w.push(x));
  measResults().forEach(x=>{if(x.bad)w.push(`${x.def.n}: значення ${fx(x.v,x.def.kind==='kti'?2:0)} поза можливими межами — перевірте.`);if(x.r.c&&!S.concl.includes(renameConcl(x.r.c)))w.push(`${x.def.n} поза нормою, але не згадано у висновку.`);});
  return w;
}

/* часті фрази першими */
const useKey=(z,g,k)=>`${S.study}.${z}.${g}.${k}`;
function countUse(d,g,k){const key=useKey(d.id,g.id,k);USE.counts[key]=(USE.counts[key]||0)+1;saveUse();}
