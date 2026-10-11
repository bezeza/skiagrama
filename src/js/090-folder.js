/* ===== Папка даних на комп'ютері (Chrome / Edge) ===== */
const FOLDER_SUPPORTED=typeof window.showDirectoryPicker==='function';
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
  if(a&&Array.isArray(a.archive))added=mergeArchive(a.archive);
  const s=await readJSON(dirH,'налаштування.json');
  if(s&&s.settings&&!SET.__fromFolder){const keep={lastBackup:SET.lastBackup};const mergedMy=Object.assign({},s.settings.my||{},SET.my||{});SET=Object.assign({},s.settings,SET,{my:mergedMy});SET.eed=Object.assign({...DEF_EED},s.settings.eed||{},SET.eed||{});Object.assign(SET,keep);}
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
    const months=Object.keys(byM);const touch=months.filter(m=>!folderWrite.done||folderWrite.done[m]!==byM[m].length||m===today().slice(0,7));
    for(const m of touch){const yd=await ad.getDirectoryHandle(m.slice(0,4),{create:true});await writeJSON(yd,m+'.json',{app:'skiagrama',v:2,month:m,archive:byM[m]},true);}
    folderWrite.done=Object.fromEntries(months.map(m=>[m,byM[m].length]));
    const cp=await dirH.getDirectoryHandle('копії',{create:true});
    await writeText(cp,`архів-${today()}.json`,aJson);
    if(SET.lastBackup!==today()){SET.lastBackup=today();store.set(SET_KEY,SET);}
  }catch(e){console.warn('folderWrite',e);dirOK=false;showFolderBanner('Не вдалося записати в папку даних. Натисніть, щоб дозволити знову.');}
  folderBusy=false;
}
function folderSoon(){if(!folderOK())return;clearTimeout(folderT);folderT=setTimeout(folderWrite,800);}
function showFolderBanner(t){$('folderBannerText').textContent=t;$('folderBanner').hidden=false;}
async function folderPick(){
  if(!FOLDER_SUPPORTED){toast('Папка даних працює в Chrome або Edge на компʼютері');return;}
  try{const parent=await window.showDirectoryPicker({id:'skiagrama',mode:'readwrite'});
    dirH=await parent.getDirectoryHandle(DATA_DIR,{create:true});dirOK=true;await kvSet('dir',dirH);
    $('folderBanner').hidden=true;await folderSync();toast(`Папку даних «${DATA_DIR}» підключено`);renderFolderInfo();}
  catch(e){if(e&&e.name!=='AbortError')toast('Не вдалося підключити папку');}
}
async function folderGrant(){
  if(!dirH)return folderPick();
  try{const p=await dirH.requestPermission({mode:'readwrite'});if(p==='granted'){dirOK=true;$('folderBanner').hidden=true;await folderSync();renderFolderInfo();toast('Папку даних підключено');}}
  catch(e){toast('Браузер не дав доступу до папки');}
}
async function folderForget(){dirH=null;dirOK=false;await kvDel('dir');renderFolderInfo();toast('Папку даних відʼєднано. Дані в ній лишилися.');}
function renderFolderInfo(){
  const i=$('folderInfo');if(!i)return;
  if(!FOLDER_SUPPORTED){i.textContent='Цей браузер не вміє працювати з папками. На компʼютері відкрийте Skiagrama в Chrome або Edge. На телефоні робіть резервну копію в «Архіві».';$('folderPick').hidden=true;return;}
  $('folderPick').hidden=false;$('folderForget').hidden=!dirH;
  i.textContent=folderOK()?`Підключено: «${folderName()}». Туди самі зберігаються: налаштування, пакет фраз, архів (і по місяцях у «архів»), копія кожного протоколу як аркуша — у «протоколи», щоденна копія — у «копії». Після перевстановлення браузера або на іншому компʼютері просто оберіть цю папку знову.`
    :dirH?`Папка «${folderName()}» запамʼятована, але браузер просить дозвіл. Натисніть «Підключити папку» вгорі.`
    :`Програма створить папку «${DATA_DIR}» у вибраному місці (напр. «Документи») і сама зберігатиме туди архів, шаблони й налаштування.`;
}
$('folderPick').onclick=folderPick;$('folderForget').onclick=folderForget;$('folderGrant').onclick=folderGrant;
async function folderBoot(){
  if(!FOLDER_SUPPORTED)return;
  const h=await kvGet('dir');if(!h)return;dirH=h;
  try{const p=await h.queryPermission({mode:'readwrite'});if(p==='granted'){dirOK=true;await folderSync();}else showFolderBanner(`Папка даних «${h.name}» потребує дозволу браузера.`);}
  catch(e){showFolderBanner('Папка даних потребує дозволу браузера.');}
  renderFolderInfo();
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
  }catch(e){}
}