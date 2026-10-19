/* ===== Папка даних на комп'ютері (Chrome / Edge) =====
   File System Access API потребує безпечного контексту (у Chrome/Edge це і сайт, і файл з диска). */
const FOLDER_SUPPORTED=typeof window.showDirectoryPicker==='function'&&!!window.isSecureContext;
const DATA_DIR='Skiagrama — дані';
let dirH=null,dirOK=false,folderT=null,folderBusy=false;
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open('skiagrama',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function kvGet(k){try{const db=await idb();return await new Promise(r=>{const q=db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>r(q.result);q.onerror=()=>r(null);});}catch(e){return null;}}
async function kvSet(k,v){try{const db=await idb();await new Promise(r=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=r;t.onerror=r;});}catch(e){}}
async function kvDel(k){try{const db=await idb();await new Promise(r=>{const t=db.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=r;t.onerror=r;});}catch(e){}}
function folderOK(){return dirOK&&!!dirH;}
function folderName(){return dirH?dirH.name:'';}
async function readJSON(dir,name){try{const fh=await dir.getFileHandle(name);const f=await fh.getFile();return JSON.parse(await f.text());}catch(e){return null;}}
async function writeText(dir,name,text){const fh=await dir.getFileHandle(name,{create:true});const w=await fh.createWritable();await w.write(text);await w.close();}
async function writeJSON(dir,name,obj,compact){await writeText(dir,name,JSON.stringify(obj,null,compact?0:1));}
async function folderSync(){
  if(!dirH)return;
  const a=await readJSON(dirH,'архів.json');let added=0;
  if(a&&Array.isArray(a.archive))added=mergeInto(a.archive);
  const s=await readJSON(dirH,'налаштування.json');
  if(s&&s.settings){
    const keep={lastBackup:SET.lastBackup||s.settings.lastBackup||''};
    const f=s.settings;
    const fill=(a,b)=>{const o=Object.assign({},a||{},b||{});Object.keys(a||{}).forEach(k=>{if(typeof o[k]==='string'&&!o[k].trim()&&a[k])o[k]=a[k];});return o;};
    const mergedMy=Object.assign({},f.my||{},SET.my||{});
    const mergedOrg=fill(f.org,SET.org);
    const mergedEed=fill(Object.assign({...DEF_EED},f.eed||{}),SET.eed);
    SET=Object.assign({},f,SET,{my:mergedMy,org:mergedOrg,eed:mergedEed});
    if(!String(SET.doctor||'').trim()&&f.doctor)SET.doctor=f.doctor;
    if(!String(SET.docTitle||'').trim()&&f.docTitle)SET.docTitle=f.docTitle;
    Object.assign(SET,keep);
  }
  if(s&&Array.isArray(s.templates)){const names=new Set(TPL.map(t=>t.study+'|'+t.name));s.templates.forEach(t=>{if(!names.has(t.study+'|'+t.name))TPL.push(t);});}
  saveA();store.set(SET_KEY,SET);store.set(TPL_KEY,TPL);
  await folderWrite();
  renderNames();updCtrlBadge();applyLook();renderAll();
  if(added)toast(`З папки даних підтягнуто ${added} протоколів`);
}
async function folderWrite(){
  if(!folderOK()||folderBusy)return;folderBusy=true;
  try{
    /* архів серіалізуємо один раз (на тисячах протоколів це найдовша операція) — і для архів.json, і для щоденної копії */
    const aJson=JSON.stringify({app:'skiagrama',v:2,saved:new Date().toISOString(),archive:A});
    await writeText(dirH,'архів.json',aJson);
    await writeJSON(dirH,'налаштування.json',{app:'skiagrama-settings',v:2,settings:SET,templates:TPL});
    await writeJSON(dirH,'пакет фраз.json',phrasePack());
    if(FB.length)await fbToFolder();
    /* архів ще й по місяцях: архів/2026/2026-10.json — зручно відкрити чи віддати один місяць */
    const ad=await dirH.getDirectoryHandle('архів',{create:true});const byM={};
    A.filter(r=>!r.example).forEach(r=>{const m=(r.date||today()).slice(0,7);(byM[m]=byM[m]||[]).push(r);});
    const months=Object.keys(byM);const stamp=m=>{const maxTs=byM[m].reduce((a,r)=>Math.max(a,r.ts||0),0);return byM[m].length+':'+maxTs;};
    const touch=months.filter(m=>!folderWrite.done||folderWrite.done[m]!==stamp(m)||m===today().slice(0,7));
    for(const m of touch){const yd=await ad.getDirectoryHandle(m.slice(0,4),{create:true});await writeJSON(yd,m+'.json',{app:'skiagrama',v:2,month:m,archive:byM[m]},true);}
    folderWrite.done=Object.fromEntries(months.map(m=>[m,stamp(m)]));
    const cp=await dirH.getDirectoryHandle('копії',{create:true});
    await writeText(cp,`архів-${today()}.json`,aJson);
    if(SET.lastBackup!==today()){SET.lastBackup=today();store.set(SET_KEY,SET);}
  }catch(e){console.warn('folderWrite',e);dirOK=false;showFolderBanner('Не вдалося записати в папку даних. Натисніть, щоб дозволити знову.');}
  folderBusy=false;
}
function folderSoon(){if(!folderOK())return;clearTimeout(folderT);folderT=setTimeout(folderWrite,800);}
/* «не підключена» — банер раз на день («Завтра» ховає), решту часу — крапка на шестерні; помилки запису й дозволи — завжди */
function showFolderBanner(t,soft){folderBadge();if(soft&&SET.folderLater===today())return;$('folderBannerText').textContent=t;$('folderBanner').hidden=false;$('folderLater').hidden=!soft;}
function folderBadge(){const n=$('navSettings');if(!n)return;const need=window.isSecureContext&&FOLDER_SUPPORTED&&!folderOK();n.classList.toggle('dotw',need);n.title=need?'Налаштування — папка даних не підключена':'Налаштування';}
$('folderLater').onclick=()=>{SET.folderLater=today();saveSet();$('folderBanner').hidden=true;toast('Нагадаю завтра. Підключити можна в «Налаштуваннях»');};
async function folderPick(){
  if(!window.isSecureContext){toast('Цей браузер не дає папку даних для сторінки з диска. Відкрийте Skiagrama з сайту bezeza.github.io/skiagrama або встановіть як програму.');return;}
  if(!FOLDER_SUPPORTED){toast('Папка даних працює в Chrome або Edge на комп’ютері');return;}
  try{const parent=await window.showDirectoryPicker({id:'skiagrama',mode:'readwrite'});
    dirH=await parent.getDirectoryHandle(DATA_DIR,{create:true});dirOK=true;await kvSet('dir',dirH);
    $('folderBanner').hidden=true;await folderSync();toast(`Папку даних «${DATA_DIR}» підключено`);renderFolderInfo();}
  catch(e){if(e&&e.name!=='AbortError')toast('Не вдалося підключити папку'+(e&&e.name?': '+e.name:''));}
}
async function folderGrant(){
  if(!dirH)return folderPick();
  try{const p=await dirH.requestPermission({mode:'readwrite'});if(p==='granted'){dirOK=true;$('folderBanner').hidden=true;await folderSync();renderFolderInfo();toast('Папку даних підключено');}}
  catch(e){toast('Браузер не дав доступу до папки');}
}
async function folderForget(){dirH=null;dirOK=false;await kvDel('dir');renderFolderInfo();toast('Папку даних від’єднано. Дані в ній лишилися.');}
function renderFolderInfo(){folderBadge();
  const i=$('folderInfo');if(!i)return;
  if(!window.isSecureContext){i.textContent='Цей браузер не дає папку даних для сторінки з диска. Відкрийте Skiagrama з сайту bezeza.github.io/skiagrama і встановіть як програму.';$('folderPick').hidden=true;return;}
  if(!FOLDER_SUPPORTED){i.textContent='Цей браузер не вміє працювати з папками. На комп’ютері відкрийте Skiagrama в Chrome або Edge. На телефоні робіть резервну копію в «Архіві».';$('folderPick').hidden=true;return;}
  $('folderPick').hidden=false;$('folderForget').hidden=!dirH;
  i.textContent=folderOK()?`Підключено: «${folderName()}». Туди самі зберігаються: налаштування, пакет фраз, архів (і по місяцях у «архів»), копія кожного протоколу як аркуша — у «протоколи», щоденна копія — у «копії». Після перевстановлення браузера або на іншому комп’ютері просто оберіть цю папку знову.`
    :dirH?`Папка «${folderName()}» запам’ятована, але браузер просить дозвіл. Натисніть «Підключити папку» вгорі.`
    :`Програма створить папку «${DATA_DIR}» у вибраному місці (напр. «Документи») і сама зберігатиме туди архів, шаблони й налаштування.`;
}
$('folderPick').onclick=folderPick;$('folderForget').onclick=folderForget;$('folderGrant').onclick=folderGrant;
async function folderBoot(){
  if(!window.isSecureContext){showFileBanner();renderFolderInfo();return;}
  if(!FOLDER_SUPPORTED){renderFolderInfo();return;}
  const h=await kvGet('dir');
  if(!h){if(SET.welcomed)showFolderBanner('Папка даних не підключена. Архів живе лише в цьому браузері — підключіть папку, щоб не втратити протоколи.',true);renderFolderInfo();return;}
  dirH=h;
  try{const p=await h.queryPermission({mode:'readwrite'});if(p==='granted'){dirOK=true;await folderSync();}else showFolderBanner(`Папка даних «${h.name}» потребує дозволу браузера.`);}
  catch(e){showFolderBanner('Папка даних потребує дозволу браузера.');}
  renderFolderInfo();
}
function showFileBanner(){
  const b=$('fileBanner');if(b)b.hidden=false;
}

/* копія протоколу як аркуша: протоколи/2026-10/Rö_Прізвище_2026-10-11_№1025.html */
function printCSS(){const out=[];const re=/\.(pdoc|pslot|ppage|pstamp|bk[A-D]?-|bk-|cont|concl)/;
  for(const sh of document.styleSheets){let rules;try{rules=sh.cssRules;}catch(e){continue;}for(const r of rules){if(r.selectorText&&re.test(r.selectorText))out.push(r.cssText);}}return out.join('\n');}
async function folderSaveProtocol(rec){
  if(!folderOK()||!rec)return;
  try{const it=classify(recordItem(rec));const half=it.kind==='half';
    const body=half?`<div class="ppage a5"><div class="pslot">${wrapDoc(it,it.units)}</div></div>`:`<div class="ppage full">${wrapDoc(it,it.units)}</div>`;
    const title=`Rö ${rec.name||''} ${fmtD(rec.date)} № ${rec.num||''}`;
    const html=`<!doctype html><html lang="uk"><head><meta charset="utf-8"><title>${esc(title)}</title><style>@page{size:${half?'A5 landscape':'A4'};margin:0}html,body{margin:0;background:#e9ecef}body{padding:12px}.ppage{margin:0 auto;box-shadow:0 2px 12px rgba(0,0,0,.2)}@media print{body{padding:0;background:#fff}.ppage{box-shadow:none}}\n${printCSS()}</style></head><body>${body}</body></html>`;
    const pd=await dirH.getDirectoryHandle('протоколи',{create:true});const md=await pd.getDirectoryHandle((rec.date||today()).slice(0,7),{create:true});
    const nm=`Rö_${(rec.name||'протокол').replace(/[^\p{L}\p{N}]+/gu,'_')}_${rec.date||today()}${rec.num?'_№'+String(rec.num).replace(/[^\p{L}\p{N}]+/gu,''):''}.html`;
    const fh=await md.getFileHandle(nm,{create:true});const w=await fh.createWritable();await w.write(html);await w.close();
  }catch(e){console.warn('folderSaveProtocol',e);if(!folderSaveProtocol.warned){folderSaveProtocol.warned=true;toast('Протокол у архіві є, але копію в папку «протоколи» не записано');}}
}