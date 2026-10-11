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
async function writeJSON(dir,name,obj){const fh=await dir.getFileHandle(name,{create:true});const w=await fh.createWritable();await w.write(JSON.stringify(obj,null,1));await w.close();}
async function folderSync(){
  if(!dirH)return;
  const a=await readJSON(dirH,'архів.json');let added=0;
  if(a&&Array.isArray(a.archive))added=mergeArchive(a.archive);
  const s=await readJSON(dirH,'налаштування.json');
  if(s&&s.settings&&!SET.__fromFolder){const keep={lastBackup:SET.lastBackup};const mergedMy=Object.assign({},s.settings.my||{},SET.my||{});SET=Object.assign({},s.settings,SET,{my:mergedMy});SET.eed=Object.assign({...DEF_EED},s.settings.eed||{},SET.eed||{});Object.assign(SET,keep);}
  if(s&&Array.isArray(s.templates)){const names=new Set(TPL.map(t=>t.study+'|'+t.name));s.templates.forEach(t=>{if(!names.has(t.study+'|'+t.name))TPL.push(t);});}
  store.set(A_KEY,A);store.set(SET_KEY,SET);store.set(TPL_KEY,TPL);
  await folderWrite();
  renderNames();updCtrlBadge();applyLook();renderAll();
  if(added)toast(`З папки даних підтягнуто ${added} протоколів`);
}
async function folderWrite(){
  if(!folderOK()||folderBusy)return;folderBusy=true;
  try{
    await writeJSON(dirH,'архів.json',{app:'skiagrama',v:2,saved:new Date().toISOString(),archive:A});
    await writeJSON(dirH,'налаштування.json',{app:'skiagrama-settings',v:2,settings:SET,templates:TPL});
    const cp=await dirH.getDirectoryHandle('копії',{create:true});
    await writeJSON(cp,`архів-${today()}.json`,{app:'skiagrama',v:2,saved:new Date().toISOString(),archive:A});
    if(SET.lastBackup!==today()){SET.lastBackup=today();store.set(SET_KEY,SET);}
  }catch(e){dirOK=false;showFolderBanner('Не вдалося записати в папку даних. Натисніть, щоб дозволити знову.');}
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
  i.textContent=folderOK()?`Підключено: «${folderName()}». Архів, шаблони й налаштування зберігаються туди самі, а щоденна копія — у підпапку «копії». Після перевстановлення браузера або на іншому компʼютері просто оберіть цю папку знову.`
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
