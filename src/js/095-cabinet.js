/* ===== Пілот і щоденна робота: профіль кабінету, заміри часу, захист екрана, флешка, готовність ===== */
/* --- профіль кабінету: реквізити, тема, ЕЕД, відділення, бланк — один файл на кабінет --- */
const PROFILE_KEYS=['org','depts','eed','docTitle','theme','blank','bl','logo','printMode','flipEdge'];
function profileData(){const p={};PROFILE_KEYS.forEach(k=>{if(SET[k]!=null&&SET[k]!=='')p[k]=clone(SET[k]);});return {app:'skiagrama-profile',v:1,saved:new Date().toISOString(),profile:p};}
function applyProfile(d){if(!d||d.app!=='skiagrama-profile'||!d.profile||typeof d.profile!=='object')return false;const p=d.profile;
  PROFILE_KEYS.forEach(k=>{if(!(k in p))return;if(k==='org'||k==='eed')SET[k]=Object.assign({},SET[k]||{},p[k]||{});else SET[k]=p[k];});
  saveSet();applyLook();fillDepts();setEedDefault();applyBind();renderSettings();renderSide();return true;}
function saveProfile(){const n=(SET.org&&SET.org.name||'кабінет').replace(/[«»"<>:\\/|?*]/g,'').trim().slice(0,40)||'кабінет';
  const ok=download(`Skiagrama_профіль_${n}.json`,JSON.stringify(profileData(),null,1),'application/json');toast(ok?'Профіль кабінету збережено у файл':'Не вдалося зберегти файл');}
function pickProfile(done){const i=el('input',{type:'file',accept:'.json,application/json',hidden:''});document.body.append(i);i.onchange=()=>{const f=i.files[0];i.remove();if(!f)return;const rd=new FileReader();
  rd.onload=()=>{let ok=false;try{ok=applyProfile(JSON.parse(rd.result));}catch(e){}toast(ok?'Профіль кабінету завантажено':'Це не файл профілю кабінету Skiagrama');if(ok&&done)done();};rd.readAsText(f);};i.click();}

/* --- пілот: час від першої дії до «Готово», кількість дій, спіймані перевіркою помилки --- */
/* «спіймано» — лише справжні помилки (протиріччя, сторона, дублікат №, дата), не «ще не заповнено» */
const NOT_ERR=/^Не вказано|^Не вибрано|заповніть зміни до кінця|^Висновок порожній|^Бланк [A-D]: не заповнено/;
function noteChecks(w){if(!t0||!S)return;S.seenW=S.seenW||[];w.forEach(m=>{if(!NOT_ERR.test(m)&&!S.seenW.includes(m))S.seenW.push(m);});}
function pilotStamp(prev){if(prev&&prev.pilot)return prev.pilot;if(!t0)return null;const now=checks();
  return {sec:Math.max(1,Math.round((Date.now()-t0)/1000)),acts:clicks,caught:(S.seenW||[]).filter(m=>!now.includes(m))};}
function exportPilot(){const rows=A.filter(r=>!r.example&&r.pilot).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||a.ts-b.ts);
  if(!rows.length){toast('Ще немає протоколів із заміром часу');return;}
  const q=v=>{v=String(v==null?'':v);return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
  const head=['№','Дата','№ знімка','Вид дослідження','Період','Хв','Сек','Час, с','Помилок спіймано','Примітка'];
  const lines=[head.join(';')].concat(rows.map((r,i)=>{const s=r.pilot.sec;const c=r.pilot.caught||[];
    const dd=String(r.date||'').split('-').reverse().join('.');
    return [i+1,dd,r.num,(STUDIES[r.study]||{}).n||r.what||'','S',Math.floor(s/60),s%60,s,c.length,((c.length?'спіймано: '+c.join(' ').replace(/\s+/g,' ')+' ':'')+`(дій: ${r.pilot.acts})`)].map(q).join(';');}));
  const ok=download(`Skiagrama_журнал_пілоту_${today()}.csv`,'﻿'+lines.join('\r\n'),'text/csv');
  toast(ok?`Журнал пілоту: ${rows.length} рядків — вставте в аркуш «Журнал»`:'Не вдалося зберегти файл');}

/* --- захист екрана: після простою ховаємо дані пацієнта --- */
let lockLast=Date.now();
const lockMin=()=>SET.lockMin==null?10:+SET.lockMin;
['pointerdown','keydown','wheel','touchstart'].forEach(ev=>document.addEventListener(ev,()=>{if($('lockScr').hidden)lockLast=Date.now();},{capture:true,passive:true}));
function lockNow(){const l=$('lockScr');if(!l.hidden)return;l.hidden=false;document.body.classList.add('locked');setTimeout(()=>$('lockGo').focus(),0);}
function unlock(){$('lockScr').hidden=true;document.body.classList.remove('locked');lockLast=Date.now();}
$('lockGo').onclick=unlock;
setInterval(()=>{const m=lockMin();if(m>0&&!document.body.classList.contains('printing-batch')&&Date.now()-lockLast>m*60000)lockNow();},15000);

/* --- раз на тиждень: копія на флешку --- */
const daysSince=d=>d?Math.floor((new Date(today())-new Date(d))/864e5):Infinity;
function usbNudge(){const b=$('usbBanner');const n=A.filter(r=>!r.example).length;
  const first=A.filter(r=>!r.example&&r.date).map(r=>r.date).sort()[0];const due=n>=1&&daysSince(SET.lastUsb||first)>=7&&SET.usbLater!==today();b.hidden=!due;if(!due)return;
  $('usbText').textContent=folderOK()?`Раз на тиждень скопіюйте папку даних «${folderName()}» на флешку — на випадок поломки комп’ютера.${SET.lastUsb?' Востаннє: '+fmtD(SET.lastUsb)+'.':''}`
    :`Раз на тиждень збережіть копію архіву на флешку — на випадок поломки комп’ютера.${SET.lastUsb?' Востаннє: '+fmtD(SET.lastUsb)+'.':''}`;
  $('usbSave').hidden=folderOK();}
$('usbSave').onclick=()=>$('backupBtn').click();
$('usbDone').onclick=()=>{SET.lastUsb=today();saveSet();usbNudge();renderReady();toast('Добре. Нагадаю через тиждень');};
$('usbLater').onclick=()=>{SET.usbLater=today();saveSet();usbNudge();};

/* --- «Чи все готово до пілоту?» --- */
function readyItems(){const o=SET.org||{};const standalone=window.matchMedia&&matchMedia('(display-mode: standalone)').matches;
  return [
    [!!(o.name&&o.name.trim()),'Реквізити закладу заповнені','Заповнити',()=>{const c=$('sOrgName')||document.querySelector('#view-settings [id^="sOrg"]');if(c){c.scrollIntoView({block:'center'});c.focus();}}],
    [!!String(SET.doctor||'').trim(),'ПІБ лікаря для підпису','Вписати',()=>{$('sDoctor').scrollIntoView({block:'center'});$('sDoctor').focus();}],
    [!!(SET.eed&&String(SET.eed.ogk||'').trim()),'ЕЕД для ОГК (за паспортом апарата)','Вписати',()=>{const c=document.querySelector('#sEed input');if(c){c.scrollIntoView({block:'center'});c.focus();}}],
    [folderOK()||!FOLDER_SUPPORTED,'Папка даних підключена','Підключити',()=>$('folderPick').click()],
    [!!SET.testPrinted,'Пробний аркуш надруковано на принтері кабінету','Пробний аркуш',()=>{showView('desc');rulerSheet();}],
    [!!SET.blankSeen,'Бланк переглянуто й налаштовано','Налаштувати',()=>{showView('desc');openPrint([currentItem()]);}],
    [daysSince(SET.lastUsb)<7,'Копія на флешці за останній тиждень','Зроблено',()=>$('usbDone').click()],
    [standalone,'Програму встановлено (відкривається без браузера)',null,null]];}
function renderReady(){const ul=$('readyList');if(!ul)return;ul.textContent='';const it=readyItems();let done=0;
  it.forEach(([ok,t,bt,fn])=>{if(ok)done++;const li=el('li',{class:ok?'ok':''});li.append(el('span',{class:'rmark','aria-hidden':'true'},ok?'✓':'○'),el('span',null,t));
    if(!ok&&bt){const b=el('button',{type:'button',class:'btn sm'},bt);b.onclick=fn;li.append(b);}ul.append(li);});
  $('readySum').textContent=done===it.length?'Усе готово ✓':`Готово ${done} з ${it.length}`;}
$('sProfileSave').onclick=saveProfile;$('sProfileLoad').onclick=()=>pickProfile();$('sPilotCsv').onclick=exportPilot;
$('sLock').onchange=e=>{SET.lockMin=+e.target.value;saveSet();lockLast=Date.now();};
