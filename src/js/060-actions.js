/* ===== Дії: введення, кнопки, збереження, гарячі клавіші, перегляди ===== */
function openSheet(){document.body.classList.add('sheet');}
function closeSheet(){document.body.classList.remove('sheet');}
$('mbarOpen').onclick=openSheet;$('mbarText').onclick=openSheet;$('closeSheet').onclick=closeSheet;
$('mbarCopy').onclick=()=>copyAll();
$('mbarNav').onclick=()=>openNavSheet();

function fmtRef(v){const s=v.toUpperCase().replace(/[^0-9A-Z]/g,'').slice(0,16);return s.replace(/(.{4})(?=.)/g,'$1-');}
$('pRef').addEventListener('input',e=>{const f=fmtRef(e.target.value);if(f!==e.target.value)e.target.value=f;
  const m=$('refMsg');if(!f){m.textContent='';m.className='msg';}else if(!REF_RE.test(f)){m.textContent='Неповний номер';m.className='msg warn';}else{m.textContent='Формат правильний';m.className='msg ok';}renderSide();});
$('pName').addEventListener('input',()=>{tick('text');const name=norm($('pName').value);const hit=byName(name).slice().sort((a,b)=>b.ts-a.ts)[0];
  if(hit&&!$('pAge').value)$('pAge').value=hit.age||'';if(hit&&!$('pSex').value)$('pSex').value=hit.sex||'';
  S.prevId=findPrev();renderPrev();renderSide();});
['pAge','pSex','pDept','pRefDoc','pNum','pDate','pCount','pEed'].forEach(id=>$(id).addEventListener('input',()=>{tick('text');renderSide();}));
['conclFree','recFree'].forEach(id=>$(id).addEventListener('input',()=>{tick('text');renderSide();renderNav();}));
/* вік із дати народження: «12.03.1954», «12031954» або рік «1954» */
function ageFromBirth(v,ref){
  v=String(v||'').trim();let d,m,y;let mt=/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2}|\d{4})$/.exec(v)||/^(\d{2})(\d{2})(\d{4})$/.exec(v);
  const R=new Date((ref||today())+'T12:00:00');
  if(mt){d=+mt[1];m=+mt[2];y=+mt[3];if(y<100)y+=y>R.getFullYear()%100?1900:2000;}
  else if(/^(18|19|20)\d{2}$/.test(v)){y=+v;const a=R.getFullYear()-y;
    if(a<0)return {err:`Рік народження ${y} — пізніше за дату знімка. Перевірте.`};if(a>120)return {err:`Рік народження ${y} — вік понад 120 років. Перевірте.`};
    return {age:a,approx:true,y};}
  else return null;
  const B=new Date(y,m-1,d,12);if(m<1||m>12||B.getMonth()!==m-1||B.getDate()!==d)return {err:`Дати ${pad(d)}.${pad(m)}.${y} не існує. Перевірте.`};
  if(B>R)return {err:`Дата народження ${pad(d)}.${pad(m)}.${y} — пізніше за дату знімка. Перевірте.`};
  let a=R.getFullYear()-y;if(R.getMonth()+1<m||(R.getMonth()+1===m&&R.getDate()<d))a--;
  if(a>120)return {err:`Вік понад 120 років — перевірте дату народження.`};
  if(a<1){let mo=(R.getFullYear()-y)*12+R.getMonth()-(m-1);if(R.getDate()<d)mo--;mo=Math.max(0,mo);
    return {age:mo?`${mo} міс.`:`${Math.max(0,Math.round((R-B)/864e5))} дн.`,d:`${pad(d)}.${pad(m)}.${y}`};}
  return {age:a,d:`${pad(d)}.${pad(m)}.${y}`};
}
function applyBirth(){const i=$('pAge');const r=ageFromBirth(i.value,$('pDate').value);const msg=$('ageMsg');
  if(!r)return false;msg.classList.toggle('bad',!!r.err);if(r.err){msg.textContent=r.err;msg.hidden=false;return false;}
  i.value=String(r.age);msg.textContent=r.approx?`Вік ${ageStr(r.age)} — за роком народження ${r.y} (приблизно, ±1 рік)`:`Вік ${ageStr(r.age)} — дата народження ${r.d}`;msg.hidden=false;
  tick('text');renderSide();return true;}
$('pAge').addEventListener('blur',applyBirth);
/* ЕЕД: «0.35» → «0,35», без «мЗв»; ПІБ з малої → з великої */
$('pEed').addEventListener('blur',e=>{const v=e.target.value.trim().replace(/\s*м?зв\.?$/i,'').replace('.',',');if(v!==e.target.value){e.target.value=v;renderSide();}});
function capName(v){return v.replace(/[\p{L}’'’-]+\.?/gu,w=>{if(w!==w.toLowerCase())return w;if(/^\p{L}\.$/u.test(w))return w.toUpperCase();return w.split('-').map(x=>x?x[0].toUpperCase()+x.slice(1):x).join('-');});}
$('pName').addEventListener('blur',e=>{const v=capName(e.target.value);if(v!==e.target.value){e.target.value=v;renderSide();}});
$('pAge').addEventListener('input',()=>{$('ageMsg').hidden=true;});
/* Enter переводить далі: ПІБ → вік → № → дата → ЕЕД → проєкції / перша зона */
const ENTER_NEXT=['pName','pAge','pNum','pDate','pEed'];
function focusAfterPatient(){const pc=$('projChips');const c=!pc.hidden&&pc.querySelector('.chip');if(c){c.focus();c.scrollIntoView({block:'nearest'});return;}
  const z=document.querySelector('#zones .seg button');if(z){z.focus();z.scrollIntoView({block:'nearest'});}}
ENTER_NEXT.forEach((id,i)=>$(id).addEventListener('keydown',e=>{
  if(e.key!=='Enter'||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey||e.isComposing)return;e.preventDefault();
  if(id==='pAge')applyBirth();
  const nx=ENTER_NEXT[i+1];if(nx){const n=$(nx);n.focus();if(n.select&&n.type!=='date')n.select();}else focusAfterPatient();}));
$('urgBtn').onclick=()=>{tick();S.urgent=!S.urgent;renderAll();toast(S.urgent?'Позначено: терміново':'Мітку «Терміново» знято');};
$('conclKeep').onclick=()=>{const v=$('conclFree').value;if(!v.trim()){$('conclFree').focus();toast('Спершу введіть текст висновку');return;}tick();addToList('concl',v);$('conclFree').value='';renderAll();toast('Висновок запам’ятовано як кнопку');};
$('recKeep').onclick=()=>{const v=$('recFree').value;if(!v.trim()){$('recFree').focus();toast('Спершу введіть текст рекомендації');return;}tick();addToList('rec',v);$('recFree').value='';renderAll();toast('Рекомендацію запам’ятовано як кнопку');};
$('flowChk').addEventListener('change',e=>{SET.flow=e.target.checked;saveSet();});
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{const t=$(b.dataset.go);if(t)t.scrollIntoView({block:'start',behavior:'smooth'});}));

function allNorm(){tick();visibleZones().forEach(d=>S.zones[d.id]={st:'n',sel:{}});S.concl=[];S.dismissed=[];S.open=null;S.manual=null;$('conclFree').value='';renderAll();toast('Норму виставлено в усіх зонах');}
$('allNorm').onclick=allNorm;
function newPatient(keep){
  const date=keep?$('pDate').value:today();const eedKeep=$('pEed').value;
  S=blank(S.study);editingId=null;editZone=null;editList=null;
  ['pName','pAge','pRef','pRefDoc','conclFree','recFree','pDept'].forEach(i=>$(i).value='');$('pSex').value='';$('pCount').value='1';
  $('pDate').value=date;setEedDefault();if(keep&&eedKeep)$('pEed').value=eedKeep;$('pNum').value=nextNum();$('refMsg').textContent='';
  clicks=0;t0=null;tDone=null;store.del(DRAFT_KEY);firstPaint=true;$('ageMsg').hidden=true;renderAll();
  setTimeout(()=>{if(!$('view-desc').hidden&&window.innerWidth>760){$('pName').focus();}},0);
}
/* ще одне дослідження тому самому пацієнту (напр. ОГК + коліно): окремий протокол, № і ЕЕД, дані пацієнта лишаються */
function sameStudyPatient(){
  pushHist('click');const keep={};['pName','pAge','pSex','pDept','pRefDoc','pDate'].forEach(i=>keep[i]=$(i).value);
  newPatient(true);Object.keys(keep).forEach(i=>$(i).value=keep[i]);setEedDefault();$('pNum').value=nextNum();S.prevId=findPrev();renderAll();
  $('sec-study').scrollIntoView({block:'start',behavior:'smooth'});toast('Той самий пацієнт — виберіть вид дослідження');
}
$('newPatient').onclick=()=>{pushHist('click');newPatient(false);toast('Новий пацієнт. Попередній стан можна повернути: Ctrl+Z');};
$('navUndo').onclick=undo;$('navRedo').onclick=redo;
$('blankSel').addEventListener('change',e=>{tick();S.blank=e.target.value;renderSide();});
$('saveTpl').onclick=()=>{closeSheet();$('tplSave').hidden=false;$('sec-zones').scrollIntoView({block:'start',behavior:'smooth'});setTimeout(()=>$('tplName').focus(),300);};
$('tplSaveCancel').onclick=()=>{$('tplSave').hidden=true;};
$('tplSaveOk').onclick=()=>{const n=$('tplName').value.trim();if(!n){$('tplName').focus();return;}
  TPL=TPL.filter(t=>!(t.study===S.study&&t.name===n));
  TPL.push({name:n,study:S.study,data:clone({zones:S.zones,concl:S.concl,recs:S.recs,proj:S.proj,meas:S.meas,obj:S.obj,side:S.side,dept:S.dept,skull:S.skull})});
  saveTpl();$('tplName').value='';$('tplSave').hidden=true;renderTpl();toast('Шаблон збережено');};
function copyAll(){copyText(protocolText(),'Протокол');}
$('copyAll').onclick=copyAll;
$('copyDesc').onclick=()=>{if(S.manual!=null){copyText(S.manual,'Протокол');return;}const P=protocol();copyText([P.ref,P.body.map(x=>x.t).join(' ')].join('\n'),'Опис');};
$('copyConcl').onclick=()=>{copyText(conclText().t.replace(/^Rö-ч:\s*/,''),'Висновок');};
$('copyRec').onclick=()=>{const t=recText();if(!t){toast('Рекомендацій немає');return;}copyText(t.replace(/^Рекомендовано:\s*/,''),'Рекомендації');};
$('paperBtn').onclick=()=>{paperView=!paperView;$('paperBtn').setAttribute('aria-pressed',String(paperView));renderSide();};
$('pfsBtn').onclick=()=>{const o=['s','m','l','xl'];SET.pfs=o[(o.indexOf(SET.pfs)+1)%o.length];saveSet();applyLook();toast({s:'Текст протоколу: менший',m:'Текст протоколу: звичайний',l:'Текст протоколу: більший',xl:'Текст протоколу: великий'}[SET.pfs]);if(paperView)renderSide();};
$('themeBtn').onclick=()=>{const order=['system','light','grey','dark'];SET.theme=order[(order.indexOf(SET.theme)+1)%order.length];saveSet();applyLook();toast(THEME_LABEL[SET.theme]);if(!$('view-settings').hidden)$('sTheme').value=SET.theme;};
/* меню «▾» і «⋯»: закриваються після вибору або кліку поза ними */
document.addEventListener('click',e=>{document.querySelectorAll('details.menu[open]').forEach(d=>{if(!d.contains(e.target)||e.target.closest('.mpop button'))d.open=false;});});
window.addEventListener('resize',()=>{if(paperView){clearTimeout(window.__rz);window.__rz=setTimeout(renderSide,200);}});

/* Word і LibreOffice */
function groupsOf(units){const groups=[];units.forEach(u=>{const g=groups[groups.length-1];if(g&&g.p===u.p)g.t.push(u.t);else groups.push({p:u.p,c:u.c,t:[u.t]});});return groups;}
const fileBase=()=>`Rö_${($('pName').value.trim()||'протокол').replace(/[^\p{L}\p{N}]+/gu,'_')}_${$('pDate').value||today()}`;
$('wordBtn').onclick=()=>{
  const body=groupsOf(currentUnits()).map(g=>`<p${g.c==='pt'||g.c==='concl'?' style="font-weight:bold"':''}>${esc(g.t.join(' '))}</p>`).join('');
  const html=`<html><head><meta charset="utf-8"><style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.45}p{margin:0 0 4pt}</style></head><body><div style="height:2.2cm"></div>${body}</body></html>`;
  if(!download(fileBase()+'.doc','﻿'+html,'application/msword'))toast('Не вдалося зберегти файл');
};
$('odtBtn').onclick=()=>{
  const ps=groupsOf(currentUnits()).map(g=>`<text:p text:style-name="${g.c==='pt'||g.c==='concl'?'B':'N'}">${esc(g.t.join(' '))}</text:p>`).join('');
  const xml=`<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>
<style:style style:name="N" style:family="paragraph"><style:paragraph-properties fo:margin-bottom="0.12cm"/><style:text-properties style:font-name="Times New Roman" fo:font-family="'Times New Roman'" fo:font-size="12pt"/></style:style>
<style:style style:name="B" style:family="paragraph" style:parent-style-name="N"><style:paragraph-properties fo:margin-bottom="0.12cm"/><style:text-properties fo:font-family="'Times New Roman'" fo:font-size="12pt" fo:font-weight="bold"/></style:style>
<style:style style:name="S" style:family="paragraph"><style:paragraph-properties fo:margin-top="2.2cm"/></style:style>
</office:automatic-styles>
<office:body><office:text><text:p text:style-name="S"/>${ps}</office:text></office:body></office:document>`;
  if(!download(fileBase()+'.fodt',xml,'application/vnd.oasis.opendocument.text-flat-xml'))toast('Не вдалося зберегти файл');
};

/* Готово → архів */
function done(){const w=checks();if(w.length){renderChecks(true);openSheet();$('checkBox').scrollIntoView({block:'nearest'});return;}doSave();}
$('doneBtn').onclick=done;
function dueFrom(texts,base){
  for(const t of texts){const m=/через\s+(\d+)?\s*(?:[–-]\s*\d+\s*)?(дн|доб|тиж|міс)/i.exec(t);if(m){const n=m[1]?Number(m[1]):1;const mult=/^тиж/i.test(m[2])?7:/^міс/i.test(m[2])?30:1;return addDays(base,n*mult);}}
  return '';
}
/* без папки даних (телефон, Firefox) копія архіву робиться лише вручну — раз на день нагадуємо */
function backupNudge(){if(folderOK()||SET.lastBackup===today()||SET.nudged===today())return;const n=A.filter(r=>!r.example).length;if(n<3)return;
  SET.nudged=today();store.set(SET_KEY,SET);setTimeout(()=>{openDlg(box=>{dlgHead(box,'Копія архіву');
    box.append(el('p',null,`В архіві ${n} протоколів, і вони зберігаються лише в цьому браузері. ${SET.lastBackup?'Останню копію збережено '+fmtD(SET.lastBackup)+'.':'Копію ще не зберігали.'}`));
    box.append(el('p',{class:'note'},FOLDER_SUPPORTED?'Найкраще — підключити папку даних: тоді копії робляться самі.':'На цьому пристрої копії самі не робляться — збережіть файл і перешліть собі або на ПК.'));
    const r=el('div',{class:'trow'});const s=el('button',{type:'button',class:'btn primary',id:'nudgeSave'},'Зберегти копію зараз');s.onclick=()=>{closeDlg();$('backupBtn').click();};
    r.append(s);if(FOLDER_SUPPORTED){const f=el('button',{type:'button',class:'btn'},'Підключити папку');f.onclick=()=>{closeDlg();showView('settings');};r.append(f);}
    const l=el('button',{type:'button',class:'btn'},'Пізніше');l.onclick=closeDlg;r.append(l);box.append(r);});},900);}
function doSave(){
  const P=protocol();const text=protocolText();const units=currentUnits();const date=$('pDate').value||today();
  const prev=editingId&&A.find(r=>r.id===editingId);
  const rec={id:editingId||('r'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),ts:Date.now(),date,num:$('pNum').value.trim(),
    name:$('pName').value.trim(),age:$('pAge').value.trim(),sex:$('pSex').value,dept:$('pDept').value.trim(),ref:$('pRef').value.trim(),
    study:S.study,what:headerLine().replace(/^На\s*/,'').replace(/ від .*$/,''),eed:$('pEed').value.trim(),
    concl:S.manual!=null?((/Rö-ч:\s*(.*)/.exec(S.manual)||[])[1]||''):P.concl.t.replace(/^Rö-ч:\s*/,''),text,units,doc:docData(),blank:curBlank(),
    ctrlDue:dueFrom(recList(),date),ctrlDone:prev?!!prev.ctrlDone:false,urgent:!!S.urgent,status:statusOf(),notified:prev?!!prev.notified:false,printed:prev?!!prev.printed:false,state:clone(S),fields:fieldsObj()};
  const i=A.findIndex(r=>r.id===rec.id);if(i>=0)A[i]=rec;else A.push(rec);
  const n=num(rec.num);if(isFinite(n)&&(SET.lastNumYear!==date.slice(0,4)||!isFinite(num(SET.lastNum))||n>=num(SET.lastNum))){SET.lastNum=String(n);SET.lastNumYear=date.slice(0,4);store.set(SET_KEY,SET);}
  saveA();store.del(DRAFT_KEY);renderNames();updCtrlBadge();folderSaveProtocol(rec);
  if(S.study==='fg'&&SET.flow){const nx=nextNum();closeSheet();newPatient(true);renderAll();$('pName').focus();toast(`Збережено. Наступний пацієнт${nx?' — № '+nx:''}`);return;}
  editingId=rec.id;tDone=Date.now();renderChecks();renderMeter();toast(i>=0?'Протокол оновлено в архіві':'Збережено в архів');backupNudge();
}

function acceptSugs(){const sg=suggestions().filter(([t])=>!S.concl.includes(t)&&!S.dismissed.includes(t));if(!sg.length){toast('Підказок висновку немає');return;}tick();sg.forEach(([t])=>S.concl.push(t));renderAll();toast('Прийнято: '+sg.map(x=>x[0]).join('; '));}
/* гарячі клавіші — як у «Первинному огляді» */
document.addEventListener('keydown',e=>{
  const mod=e.ctrlKey||e.metaKey;
  if(e.key==='Escape'){if(!$('dlg').hidden){closeDlg();return;}if(!$('printModal').hidden){closePrint();return;}if(document.body.classList.contains('sheet')){closeSheet();return;}}
  if(mod&&(e.code==='KeyK')){e.preventDefault();openSearch();return;}
  if($('view-desc').hidden||!$('dlg').hidden||!$('printModal').hidden)return;
  if(e.altKey&&!mod&&e.code==='KeyN'){e.preventDefault();allNorm();return;}
  if(e.altKey&&!mod&&e.key==='Enter'){e.preventDefault();acceptSugs();return;}
  if(mod&&e.key==='Enter'){e.preventDefault();copyAll();return;}
  if(mod&&e.code==='KeyS'){e.preventDefault();done();return;}
  if(mod&&e.code==='KeyP'){e.preventDefault();$('printBtn').click();return;}
  if(typing(e))return;
  if(mod&&!e.shiftKey&&e.code==='KeyZ'){e.preventDefault();undo();return;}
  if(mod&&(e.code==='KeyY'||(e.shiftKey&&e.code==='KeyZ'))){e.preventDefault();redo();return;}
  if(!mod&&!e.altKey&&/^Digit[1-9]$/.test(e.code)){const i=Number(e.code.slice(5))-1;const d=visibleZones()[i];if(!d)return;e.preventDefault();tick();
    const z=S.zones[d.id];if(z.st==='c'&&S.open===d.id){z.st='n';S.open=null;}else{z.st='c';S.open=d.id;}S.focus=d.id;renderAll();const n=$('zone-'+d.id);if(n){n.scrollIntoView({block:'nearest'});const f=z.st==='c'?n.querySelector('.group button.chip, .group input'):null;if(f)f.focus({preventScroll:true});}}
});

/* перегляди */
function showView(v){['desc','archive','settings'].forEach(k=>{$('view-'+k).hidden=k!==v;});$('navDesc').classList.toggle('on',v==='desc');$('navArchive').classList.toggle('on',v==='archive');$('mbar').style.display=v==='desc'?'':'none';closeSheet();window.scrollTo(0,0);
  if(v==='archive')renderArchive();if(v==='settings')renderSettings();}
$('navArchive').onclick=()=>showView('archive');$('navDesc').onclick=()=>showView('desc');$('navSettings').onclick=()=>showView('settings');
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>showView('desc'));
