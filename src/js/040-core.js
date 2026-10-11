/* ===== Сховища, налаштування, стан, генерація тексту ===== */
const SET_KEY='skiagrama.settings.v1',TPL_KEY='skiagrama.templates.v1',A_KEY='skiagrama.archive.v1',DRAFT_KEY='skiagrama.draft.v1',USE_KEY='skiagrama.usage.v1';
let SET=Object.assign({doctor:'',depts:'Терапевтичне №1, Терапевтичне №2, Хірургічне, Неврологічне, Інфекційне, Педіатричне, Амбулаторно',
  eed:{...DEF_EED},norms:{},my:{},theme:'system',font:'m',pfs:'m',flow:true,freq:true,printMode:'flip',flipEdge:'long',revBacks:false,
  lastNum:'',lastNumYear:'',lastBackup:'',welcomed:false,seenVersion:''},store.get(SET_KEY,{}));
SET.eed=Object.assign({...DEF_EED},SET.eed||{});SET.norms=SET.norms||{};SET.my=SET.my||{};
let TPL=store.get(TPL_KEY,[]);
let A=store.get(A_KEY,null);
if(!A){const old=store.get('skiagrama.journal.v1',[]);A=Array.isArray(old)?old:[];}
let USE=store.get(USE_KEY,{counts:{},rank:{},day:''});
if(USE.day!==today()){USE.rank=Object.assign({},USE.counts);USE.day=today();store.set(USE_KEY,USE);}
const saveSet=()=>{store.set(SET_KEY,SET);folderSoon();},saveTpl=()=>{store.set(TPL_KEY,TPL);folderSoon();},saveA=()=>{store.set(A_KEY,A);folderSoon();},saveUse=()=>store.set(USE_KEY,USE);

/* тема і шрифт */
const FONT={s:'14px',m:'15px',l:'16.5px',xl:'18px'},PFONT={s:'14.5px',m:'16px',l:'17.5px',xl:'19.5px'};
const THEME_LABEL={system:'Тема: авто',light:'Тема: світла',dark:'Тема: темна'};
function applyLook(){const r=document.documentElement;if(SET.theme==='system')r.removeAttribute('data-theme');else r.setAttribute('data-theme',SET.theme);
  r.style.setProperty('--fs',FONT[SET.font]||FONT.m);r.style.setProperty('--pfs',PFONT[SET.pfs]||PFONT.m);$('themeBtn').textContent=THEME_LABEL[SET.theme]||THEME_LABEL.system;}

/* стан */
const FIELDS=['pName','pAge','pSex','pNum','pDate','pEed','pDept','pRef','pRefDoc','pCount','conclFree','recFree'];
let S,clicks=0,t0=null,tDone=null,editingId=null;
function blankZones(study){const z={};STUDIES[study].zones.forEach(d=>z[d.id]={st:'n',sel:{}});return z;}
function blank(study){return {study,obj:'kol',side:'п',dept:'poper',skull:'ppn',proj:[],zones:blankZones(study),open:null,meas:{},concl:[],dismissed:[],recs:[],dyn:null,prevId:null,manual:null};}
S=blank('ogk');
const study=()=>STUDIES[S.study];
const visibleZones=()=>study().zones.filter(d=>!d.mode||d.mode===S.skull);
const normOf=d=>{const o=SET.norms[S.study+'.'+d.id];return o!=null?o:d.norm;};
const isNormOverridden=d=>SET.norms[S.study+'.'+d.id]!=null;
const fieldsObj=()=>{const o={};FIELDS.forEach(k=>o[k]=$(k).value);return o;};
const setFields=o=>{FIELDS.forEach(k=>{if(o&&k in o)$(k).value=o[k];});};
const myKey=d=>S.study+'.'+d.id;
const myList=d=>SET.my[myKey(d)]||[];

/* скасування */
let hist=[],lastKind='',lastT=0;
function snapshot(){return {S:clone(S),f:fieldsObj(),editingId};}
function pushHist(kind){const now=Date.now();if(kind==='text'&&lastKind==='text'&&now-lastT<1500){lastT=now;return;}hist.push(snapshot());if(hist.length>80)hist.shift();lastKind=kind;lastT=now;}
function tick(kind){pushHist(kind||'click');clicks++;if(!t0)t0=Date.now();tDone=null;}
function undo(){const s=hist.pop();if(!s){toast('Немає що скасовувати');return;}S=s.S;setFields(s.f);editingId=s.editingId;lastKind='';renderAll();toast('Скасовано');}

/* генерація тексту */
function groupVal(d,z,gid,showReq){
  const g=d.groups.find(x=>x.id===gid);if(!g)return '';
  const v=z.sel[gid];
  if(g.type==='text'){const t=String(v||'').trim();return t||(showReq&&g.req?'…':'');}
  if(g.many){const a=(v||[]).map(k=>(g.o.find(x=>x[0]===k)||[])[1]).filter(Boolean);return a.length?a.join(g.join||', '):(showReq&&g.req?'…':'');}
  const o=g.o.find(x=>x[0]===v);return o?o[1]:(showReq&&g.req?'…':'');
}
const hasStd=(d,z)=>d.groups.some(g=>groupVal(d,z,g.id,false));
const sentence=t=>{t=String(t).trim();if(!t)return '';t=cap(t);return /[.!?]$/.test(t)?t:t+'.';};
function zoneText(d){
  const z=S.zones[d.id];if(!z||z.st==='x')return '';
  if(z.st==='n')return normOf(d);
  const my=(z.sel.__my||[]).filter(p=>myList(d).includes(p)).map(sentence).join(' ');
  if(!hasStd(d,z)&&my)return my;
  let t=d.tpl.replace('{|segclose}',groupVal(d,z,'seg',false)?')':'').replace(/\{([^{}|]*)\|(\w+)\}/g,(m,pre,g)=>{const v=groupVal(d,z,g,false);return v?pre+v:'';})
             .replace(/\{(\w+)\}/g,(m,g)=>groupVal(d,z,g,true));
  t=t.replace(/\s+/g,' ').replace(/\s+([,.])/g,'$1').replace(/\.\./g,'.').trim();
  return cap(t)+(my?' '+my:'');
}
function zoneState(d){const z=S.zones[d.id];if(z.st==='x')return 'x';if(z.st==='n')return 'n';return zoneText(d).includes('…')?'e':'c';}
function objPhrase(){
  const o=BONE_OBJ.find(x=>x[0]===S.obj)||BONE_OBJ[0];
  if(o[3]==='none')return o[2];
  if(S.side==='о')return o[4];
  const f=SIDE_FORMS[o[3]]||SIDE_FORMS.m;return o[2].replace('{s}',S.side==='л'?f[1]:f[0]);
}
const deptGen=()=>(SPINE_DEPT.find(x=>x[0]===S.dept)||SPINE_DEPT[2])[2];
function headerLine(){
  const d=fmtD($('pDate').value),n=$('pNum').value.trim()||'___';
  const proj=S.proj.length?` (${S.proj.join(', ')} ${S.proj.length>1?'проєкції':'проєкція'})`:'';
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
    if(def.kind==='kti'){const a=num(m.a),b=num(m.b);v=(a>0&&b>0)?a/b:num(m.v);}else v=num(m.v);
    if(!isFinite(v))return;out.push({id,def,v,r:def.grade(v,m)});});
  return out;
}
function allNormal(){return visibleZones().every(d=>S.zones[d.id].st!=='c')&&measResults().every(x=>x.r.ok);}
function suggestions(){
  const out=[];const Z=S.zones;const sel=(z,g)=>(Z[z]&&Z[z].st==='c')?Z[z].sel[g]:undefined;const ch=z=>Z[z]&&Z[z].st==='c';
  const add=(t,why,tbd)=>{if(t&&!out.some(x=>x[0]===t))out.push([t,why,tbd]);};
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
  }
  if(S.study==='bone'){
    if(ch('frac')&&hasStd(BONE_ZONES[0],Z.frac)){const w=groupVal(BONE_ZONES[0],Z.frac,'where',false);const dsp=groupVal(BONE_ZONES[0],Z.frac,'disp',false);add(`Перелом ${w||'…'}${dsp?' '+dsp:''}`,'травматичні зміни');}
    const st={нерівн:'I',пом:'II',знач:'III'}[sel('space','ch')];
    if(st)add(`Деформуючий остеоартроз ${objPhrase()} ${st} ст.`,'звуження щілини',1);
    const s=sel('struct','ch')||[];if(s.some(k=>['плям','диф','регіон'].includes(k)))add('Остеопороз','кісткова структура');
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
  if(a.length)return {t:'Rö-ч: '+a.join('. ')+'.',tbd:false};
  if(allNormal())return {t:'Rö-ч: '+study().normConcl+'.',tbd:!!study().normTbd,auto:1};
  return {t:'Rö-ч: …',tbd:false};
}
function recList(){const a=[...S.recs];const f=$('recFree').value.trim().replace(/\.$/,'');if(f)a.push(f);return a;}
function recText(){const a=recList();return a.length?'Рекомендовано: '+a.join('; ')+'.':'';}
function dynText(){if(!S.dyn||!S.prevId)return '';const p=A.find(r=>r.id===S.prevId);if(!p)return '';return `Порівняно з дослідженням від ${fmtD(p.date)}: ${S.dyn}.`;}
function protocol(){
  const name=$('pName').value.trim()||'[ПІБ]',age=$('pAge').value.trim();
  const body=visibleZones().map(d=>({t:zoneText(d),tbd:d.tbd&&S.zones[d.id].st==='n'&&!isNormOverridden(d),zone:d.id})).filter(x=>x.t);
  measResults().forEach(x=>body.push({t:x.r.ph,zone:'meas'}));
  const dy=dynText();if(dy)body.push({t:dy,zone:'prev'});
  const eed=$('pEed').value.trim();
  return {head:`${name}${age?', '+age+' р.':''}`,ref:headerLine(),body,concl:conclText(),rec:recText(),eed:eed?`ЕЕД ${eed} мЗв.`:'ЕЕД ___ мЗв.',doc:SET.doctor?`Лікар: ${SET.doctor}`:'Лікар: ____________'};
}
function genText(P){P=P||protocol();return [P.head,P.ref,P.body.map(x=>x.t).join(' '),P.concl.t,P.rec,P.eed+'   '+P.doc].filter(Boolean).join('\n');}
const protocolText=()=>S.manual!=null?S.manual:genText();
function unitsFromP(P){const u=[{t:P.head,p:0,c:'pt'},{t:P.ref,p:1}];P.body.forEach(x=>u.push({t:x.t,p:2}));u.push({t:P.concl.t,p:3,c:'concl'});if(P.rec)u.push({t:P.rec,p:4});u.push({t:P.eed+'   '+P.doc,p:5,c:'foot'});return u;}
function unitsFromText(text){const u=[];String(text||'').split('\n').forEach((ln,i)=>{if(!ln.trim())return;const c=i===0?'pt':/^Rö-ч:/.test(ln)?'concl':/^ЕЕД/.test(ln)?'foot':'';ln.split(/(?<=[.!?:])\s+(?=\S)/).forEach(s=>u.push({t:s,p:i,c}));});return u;}
const currentUnits=()=>S.manual!=null?unitsFromText(S.manual):unitsFromP(protocol());

/* перевірка перед підписом */
const REF_RE=/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/i;
function checks(){
  const w=[];
  if(!$('pName').value.trim())w.push('Не вказано ПІБ.');
  if(!$('pAge').value.trim())w.push('Не вказано вік.');
  if(!$('pNum').value.trim())w.push('Не вказано № знімка.');
  if(!$('pDate').value)w.push('Не вказано дату знімка.');
  if(!$('pEed').value.trim())w.push('Не вказано ЕЕД.');
  if((S.study==='bone'||S.study==='spine')&&!S.proj.length)w.push('Не вибрано проєкції.');
  const ref=$('pRef').value.trim();
  if(ref&&!REF_RE.test(ref))w.push('№ е-направлення має вигляд 0000-0000-0000-0000.');
  if(S.manual!=null)return w;
  visibleZones().forEach(d=>{if(zoneState(d)==='e')w.push(`«${d.name}»: заповніть зміни до кінця.`);});
  const ct=conclText();
  if(ct.t.includes('…'))w.push('Висновок порожній або не заповнений.');
  const items=conclItems();const normRe=/без патолог|патології не|без кістково/i;
  if(allNormal()&&items.length&&!items.every(i=>normRe.test(i)))w.push('Усі зони в нормі, а у висновку патологія — перевірте.');
  if(!allNormal()&&items.some(i=>normRe.test(i)))w.push('Є зміни в описі, а висновок «без патології» — перевірте.');
  measResults().forEach(x=>{if(x.r.c&&!S.concl.includes(x.r.c))w.push(`${x.def.n} поза нормою, але не згадано у висновку.`);});
  return w;
}

/* часті фрази першими */
const useKey=(z,g,k)=>`${S.study}.${z}.${g}.${k}`;
function orderOpts(d,g){if(!SET.freq)return g.o;const r=USE.rank||{};return g.o.map((o,i)=>({o,i,n:r[useKey(d.id,g.id,o[0])]||0})).sort((a,b)=>b.n-a.n||a.i-b.i).map(x=>x.o);}
function countUse(d,g,k){const key=useKey(d.id,g.id,k);USE.counts[key]=(USE.counts[key]||0)+1;saveUse();}
