/* ===== Налаштування і запуск ===== */
function renderSettings(){
  $('sDoctor').value=SET.doctor;$('sDocTitle').value=SET.docTitle||'';$('sDepts').value=SET.depts;$('sTheme').value=SET.theme;$('sScale').value=String(SET.scale||100);$('sScreen').value=SET.screen||'auto';$('sLayout').value=layoutNow();
  $('sFlow').checked=!!SET.flow;$('sFreq').checked=!!SET.freq;$('sPrintMode').value=SET.printMode;$('sFlipEdge').value=SET.flipEdge;$('sRevBacks').checked=!!SET.revBacks;
  const e=$('sEed');e.textContent='';Object.keys(STUDIES).forEach(k=>{const l=el('label',{class:'f'},STUDIES[k].n);const i=el('input',{type:'text',inputmode:'decimal'});i.value=SET.eed[k]||'';i.addEventListener('input',()=>{SET.eed[k]=i.value.trim();saveSet();});l.append(i);e.append(l);});
  const ns=$('sNormStudy');if(!ns.options.length)Object.keys(STUDIES).forEach(k=>ns.append(el('option',{value:k},STUDIES[k].n)));
  const sb=$('sBlank');if(!sb.options.length)BLANK_ORDER.forEach(b=>sb.append(el('option',{value:b},`${b} · ${BLANKS[b].n}`)));sb.value=SET.blank||'C';$('sBlankWhy').textContent=blankWhy(sb.value);
  const o=ORG();ORG_FIELDS.forEach(([id,k])=>{$(id).value=o[k]||'';});
  renderNorms();renderMy();renderAbbr();renderPacks();renderFolderInfo();$('sVer').textContent=`Skiagrama ${VERSION} бета. Працює без інтернету; оновлення приходять самі, коли є мережа.`;
}
function renderNorms(){
  const k=$('sNormStudy').value||'ogk';const root=$('sNorms');root.textContent='';
  STUDIES[k].zones.forEach(d=>{const l=el('label',{class:'f'},d.name+(d.tbd?' (стандартна фраза — припущення)':''));const i=el('input',{type:'text'});const key=k+'.'+d.id;
    i.value=SET.norms[key]!=null?SET.norms[key]:d.norm;i.placeholder='(у нормі не описується)';
    i.addEventListener('input',()=>{SET.norms[key]=i.value;saveSet();});l.append(i);root.append(l);});
}
function renderMy(){
  const root=$('sMy');root.textContent='';const keys=Object.keys(SET.my).filter(k=>(SET.my[k]||[]).length);
  if(!keys.length){root.append(el('p',{class:'note'},'Власних кнопок поки немає.'));return;}
  keys.forEach(k=>{const [st,zid]=k.split('.');const d=STUDIES[st]&&STUDIES[st].zones.find(z=>z.id===zid);const r=el('div',{class:'group'});
    r.append(el('span',{class:'gl'},`${STUDY_SHORT[st]||st} · ${d?d.name:zid}`));
    SET.my[k].forEach(p=>{const w=el('span',{class:'tpl'});w.append(el('button',{type:'button'},p));const x=el('button',{type:'button','aria-label':'Видалити'},'×');x.onclick=()=>{SET.my[k]=SET.my[k].filter(q=>q!==p);saveSet();renderMy();renderZones();};w.append(x);r.append(w);});
    root.append(r);});
}
$('sNormStudy').addEventListener('change',renderNorms);
const ORG_FIELDS=[['sOrgName','name'],['sOrgSub','sub'],['sOrgCab','cab'],['sOrgAddr','addr'],['sOrgTel','tel'],['sOrgEdrpou','edrpou'],['sOrgForm','form'],['sOrgOrder','order']];
ORG_FIELDS.forEach(([id,k])=>$(id).addEventListener('input',e=>{SET.org[k]=e.target.value.trim();saveSet();}));
const blankWhy=b=>({C:'C — вклеюєте в історію хвороби: найменше місця, рамка під штамп, звичний формат «На Rö-гр. … Rö-ч:».',B:'B — сучасний вигляд: логотип, дані пацієнта сіткою, розділи ОПИС / ВИСНОВОК / РЕКОМЕНДАЦІЇ.',A:'A — для пацієнта на руки або в іншу установу: повні реквізити закладу, «М. П.».',D:'D — облікова форма з реквізитами й пронумерованими полями.'})[b]||'';
$('sBlank').addEventListener('change',e=>{SET.blank=e.target.value;saveSet();$('sBlankWhy').textContent=blankWhy(SET.blank);renderSide();});
$('sBtnReset').onclick=e=>{const b=e.currentTarget;const k=$('sNormStudy').value||'ogk';
  if(!b.dataset.c){b.dataset.c='1';b.textContent='Точно? Усі зміни кнопок цього дослідження зникнуть';setTimeout(()=>{b.dataset.c='';b.textContent='Повернути кнопки цього дослідження як були';},3000);return;}
  [SET.btn,SET.btnAdd,SET.btnOrder].forEach(o=>Object.keys(o).forEach(x=>{if(x.startsWith(k+'.'))delete o[x];}));delete SET.lists['concl.'+k];delete SET.conclNorm[k];saveSet();b.dataset.c='';b.textContent='Повернути кнопки цього дослідження як були';renderZones();renderSide();toast('Кнопки повернуто');};
/* пакет фраз */
function phrasePack(meta){return {app:'skiagrama-phrases',v:2,saved:new Date().toISOString(),meta:meta||{title:'Мій пакет фраз',status:'чернетка'},norms:SET.norms,my:SET.my,btn:SET.btn,btnAdd:SET.btnAdd,btnOrder:SET.btnOrder,lists:SET.lists,conclNorm:SET.conclNorm,abbr:SET.abbr,templates:TPL.filter(t=>!t.pack)};}
const PACK_KEYS=['norms','my','btn','btnAdd','btnOrder','lists','conclNorm','abbr'];
function applyPhrasePack(d){
  if(!d||d.app!=='skiagrama-phrases')throw new Error('not a pack');
  SET.packUndo=clone({set:Object.fromEntries(PACK_KEYS.map(k=>[k,SET[k]])),tpl:TPL,at:today(),title:(d.meta&&d.meta.title)||'пакет'});
  ['norms','btn','btnOrder','lists','conclNorm','abbr'].forEach(k=>{if(d[k]&&typeof d[k]==='object')SET[k]=Object.assign({},SET[k],d[k]);});
  if(d.my)Object.keys(d.my).forEach(k=>{const a=SET.my[k]||[];(d.my[k]||[]).forEach(p=>{if(!a.includes(p))a.push(p);});SET.my[k]=a;});
  if(d.btnAdd)Object.keys(d.btnAdd).forEach(k=>{const a=SET.btnAdd[k]||[];(d.btnAdd[k]||[]).forEach(x=>{if(x&&x.k&&!a.some(y=>y.k===x.k))a.push(x);});SET.btnAdd[k]=a;});
  const m=d.meta||{};let nt=0;
  if(Array.isArray(d.templates))d.templates.forEach(t=>{if(!t||!t.name)return;TPL=TPL.filter(q=>!(q.study===t.study&&q.name===t.name));TPL.push(Object.assign(clone(t),m.title?{pack:m.title,packStatus:m.status||'',packAuthor:m.author||''}:{}));nt++;});
  if(m.title){SET.packs=(SET.packs||[]).filter(x=>x.id!==(m.id||m.title));SET.packs.push({id:m.id||m.title,title:m.title,version:m.version||'',status:m.status||'',author:m.author||'',experience:m.experience||'',approved:m.approved||'',installed:today(),templates:nt});}
  saveSet();saveTpl();return nt;
}
const packBadge=m=>el('span',{class:'pill '+(m.status==='затверджено'?'o':'w')},m.status==='затверджено'?'затверджено':'чернетка — не затверджено');
const packWho=m=>m.author?`Автор: ${m.author}${m.experience?`, стаж ${m.experience} р.`:''}${m.approved?` · затверджено ${fmtD(m.approved)}`:''}`:'Автор не вказаний';
function packSummary(d){const by={};(d.templates||[]).forEach(t=>{(by[t.study]=by[t.study]||[]).push(t.name);});
  const n=k=>Object.keys(d[k]||{}).length;return {by,extra:[n('norms')&&`фраз норми: ${n('norms')}`,n('btn')+n('btnAdd')&&`змін кнопок: ${n('btn')+n('btnAdd')}`,n('lists')&&`списків висновків/рекомендацій: ${n('lists')}`,n('abbr')&&`скорочень: ${n('abbr')}`].filter(Boolean)};}
function openPackPreview(d){
  const m=d.meta||{title:'Пакет фраз'};const sm=packSummary(d);
  openDlg(box=>{dlgHead(box,m.title||'Пакет фраз');
    const top=el('div',{class:'trow'});top.append(packBadge(m),el('span',{class:'note'},packWho(m)+(m.version?` · версія ${m.version}`:'')));box.append(top);
    if(m.status!=='затверджено')box.append(el('p',{class:'banner'},'Пакет не затверджено рентгенологом. Перевірте кожен опис перед використанням у протоколах.'));
    if(m.note)box.append(el('p',{class:'note'},m.note));
    Object.keys(sm.by).forEach(st=>{box.append(el('h3',{style:'margin:6px 0 2px;font-size:15px'},`Типові описи — ${STUDIES[st]?STUDIES[st].n:st}`));const ul=el('ul',{class:'steps'});sm.by[st].forEach(n=>ul.append(el('li',null,n)));box.append(ul);});
    if(sm.extra.length)box.append(el('p',{class:'note'},'Також: '+sm.extra.join(', ')+'.'));
    box.append(el('p',{class:'note'},'Після встановлення типові описи з’являться в рядку «Шаблони» над зонами. Ваші фрази й кнопки доповнюються, а не стираються; повернути як було можна однією кнопкою.'));
    const r=el('div',{class:'trow'});const ok=el('button',{type:'button',class:'btn primary'},'Встановити');ok.onclick=()=>{const nt=applyPhrasePack(d);closeDlg();renderSettings();renderAll();toast(`Пакет «${m.title}» встановлено${nt?`: типових описів ${nt}`:''}`);};
    const no=el('button',{type:'button',class:'btn'},'Скасувати');no.onclick=closeDlg;r.append(ok,no);box.append(r);});
}
function renderPacks(){
  const cat=$('packCatalog');cat.textContent='';
  PACKS.forEach(d=>{const m=d.meta;const sm=packSummary(d);const it=el('div',{class:'pack'});
    const t=el('div',{class:'pt'});t.append(el('b',null,m.title),packBadge(m));it.append(t);
    it.append(el('div',{class:'note'},Object.keys(sm.by).map(st=>`${STUDY_SHORT[st]||st}: ${sm.by[st].length}`).join(' · ')+' · '+packWho(m)));
    const inst=(SET.packs||[]).find(x=>x.id===m.id);
    const b=el('button',{type:'button',class:'btn sm'},inst?'Переглянути / встановити знову':'Переглянути й встановити');b.onclick=()=>openPackPreview(d);it.append(b);cat.append(it);});
  const ib=$('packInstalled');ib.textContent='';const ps=SET.packs||[];
  if(ps.length){ib.append(el('p',{class:'note'},'Встановлено: '+ps.map(p=>`«${p.title}»${p.status==='затверджено'?'':' (чернетка)'} — ${fmtD(p.installed)}`).join('; ')+'.'));}
  $('packUndo').hidden=!SET.packUndo;if(SET.packUndo)$('packUndo').textContent=`Повернути як було до «${SET.packUndo.title}»`;
}
$('packUndo').onclick=e=>{const b=e.currentTarget;if(!SET.packUndo)return;if(!b.dataset.c){b.dataset.c='1';const t=b.textContent;b.textContent='Точно? Зміни з пакета зникнуть';setTimeout(()=>{b.dataset.c='';b.textContent=t;},3000);return;}
  const u=SET.packUndo;PACK_KEYS.forEach(k=>{SET[k]=u.set[k]||{};});TPL=u.tpl||[];SET.packs=(SET.packs||[]).filter(p=>p.title!==u.title);delete SET.packUndo;saveSet();saveTpl();b.dataset.c='';renderSettings();renderAll();toast('Повернуто як було до пакета');};
$('phExport').onclick=()=>{
  openDlg(box=>{dlgHead(box,'Мій пакет фраз');
    box.append(el('p',{class:'note'},'У файл підуть ваші фрази норми, зміни кнопок, свої висновки й рекомендації та шаблони. Підпишіть пакет — колега бачитиме, хто і коли його перевірив.'));
    const f=el('div',{class:'fields'});const mk=(lab,val,cls,type)=>{const l=el('label',{class:'f'+(cls?' '+cls:'')},lab);const i=el('input',{type:type||'text'});i.value=val||'';l.append(i);f.append(l);return i;};
    const ti=mk('Назва пакета','Типові описи ОГК і кісток','wide'),au=mk('Автор (ПІБ рентгенолога)',SET.doctor,'wide'),ex=mk('Стаж, років',''),ap=mk('Дата затвердження',today(),'','date');box.append(f);
    const chk=el('label',{class:'chk'});const cb=el('input',{type:'checkbox'});chk.append(cb,document.createTextNode(' Затверджую: усі описи в пакеті перевірив(ла) особисто'));box.append(chk);
    const r=el('div',{class:'trow'});const ok=el('button',{type:'button',class:'btn primary'},'Зберегти пакет у файл');
    ok.onclick=()=>{const meta={id:'my-'+Date.now().toString(36),title:ti.value.trim()||'Мій пакет фраз',version:'1.0',status:cb.checked&&au.value.trim()?'затверджено':'чернетка',author:au.value.trim(),experience:ex.value.trim(),approved:cb.checked?ap.value:''};
      const ok2=download(`Skiagrama_${meta.title.replace(/[^\p{L}\p{N}]+/gu,'_')}_${today()}.json`,JSON.stringify(phrasePack(meta),null,1),'application/json');closeDlg();
      $('phMsg').textContent=ok2?(meta.status==='затверджено'?`Пакет «${meta.title}» підписано (${meta.author}) і збережено у файл.`:'Пакет збережено як чернетку: щоб затвердити, вкажіть автора й поставте позначку.'):'Не вдалося зберегти файл.';};
    if(!cb.checked)0;r.append(ok);box.append(r);setTimeout(()=>ti.focus(),30);});
};
$('phImport').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const d=JSON.parse(rd.result);if(!d||d.app!=='skiagrama-phrases')throw 0;openPackPreview(d);}catch(err){$('phMsg').textContent='Це не пакет фраз Skiagrama.';}e.target.value='';};rd.readAsText(f);});
$('sNormReset').onclick=()=>{const k=$('sNormStudy').value;Object.keys(SET.norms).forEach(x=>{if(x.startsWith(k+'.'))delete SET.norms[x];});saveSet();renderNorms();toast('Стандартні фрази повернуто');};
$('sDoctor').addEventListener('input',e=>{SET.doctor=e.target.value;saveSet();});
$('sDocTitle').addEventListener('input',e=>{SET.docTitle=e.target.value.trim();saveSet();renderSide();});
$('sDepts').addEventListener('input',e=>{SET.depts=e.target.value;saveSet();fillDepts();});
$('sTheme').addEventListener('change',e=>{SET.theme=e.target.value;saveSet();applyLook();});
$('sScale').addEventListener('change',e=>setScale(+e.target.value,true));
$('sScreen').addEventListener('change',e=>setScreen(e.target.value));
$('sLayout').addEventListener('change',e=>{SET.layout=e.target.value;saveSet();applyLayout();renderSide();});
$('sFlow').addEventListener('change',e=>{SET.flow=e.target.checked;saveSet();});
$('sFreq').addEventListener('change',e=>{SET.freq=e.target.checked;saveSet();});
$('sFreqReset').onclick=()=>{USE={counts:{},rank:{},day:today()};saveUse();toast('Статистику фраз скинуто');};
$('sPrintMode').addEventListener('change',e=>{SET.printMode=e.target.value;saveSet();});
$('sFlipEdge').addEventListener('change',e=>{SET.flipEdge=e.target.value;saveSet();});
$('sRevBacks').addEventListener('change',e=>{SET.revBacks=e.target.checked;saveSet();});
$('sWelcome').onclick=openWelcome;
$('sExport').onclick=()=>{const ok=download(`Skiagrama_налаштування_${today()}.json`,JSON.stringify({app:'skiagrama-settings',v:2,settings:SET,templates:TPL},null,1),'application/json');$('sMsg').textContent=ok?'Налаштування і шаблони збережено у файл.':'Не вдалося зберегти файл.';};
$('sImport').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const d=JSON.parse(rd.result);if(d.app!=='skiagrama-settings')throw 0;
  SET=Object.assign(SET,d.settings||{});['org','btn','btnAdd','btnOrder','lists','conclNorm','abbr'].forEach(k=>{if(!SET[k]||typeof SET[k]!=='object')SET[k]={};});TPL=Array.isArray(d.templates)?d.templates:TPL;saveSet();saveTpl();fillDepts();applyLook();renderSettings();$('sMsg').textContent='Налаштування завантажено.';}catch(err){$('sMsg').textContent='Це не файл налаштувань Skiagrama.';}e.target.value='';};rd.readAsText(f);});
function fillDepts(){const dl=$('deptList');dl.textContent='';SET.depts.split(',').map(s=>s.trim()).filter(Boolean).forEach(d=>dl.append(el('option',{value:d})));}

/* запуск */
applyLook();initView();$('vBadge').textContent=`v${VERSION} бета`;
/* для автотестів: доступ до внутрішніх функцій (не впливає на роботу) */
window.__skg={get S(){return S;},get A(){return A;},archiveSaved,saveA,get SET(){return SET;},STUDIES,MEAS,zoneText,effList,normConclOf,suggestions,classify,currentItem,blankAdvice,BLANKS,docData,measResults,renderAll,effOpts,applyPhrasePack,swapSide,autoStatus,statusOf,contradictions,checks,phrasePack,PACKS,get TPL(){return TPL;},applyTpl:t=>applyTpl(t),
  unitsHTML,docModel,htmlBlocks,cleanHtml,layoutNow,
  setZones(z){S.zones=Object.assign(blankZones(S.study),z);renderAll();},study:k=>switchStudy(k),
  async useFolder(h){dirH=h;dirOK=true;await folderWrite();}};
fillDepts();renderNames();updCtrlBadge();
$('pDate').value=today();setEedDefault();$('pNum').value=nextNum();
const dr=store.get(DRAFT_KEY,null);
if(dr&&dr.S&&STUDIES[dr.S.study]){S=dr.S;S.zones=Object.assign(blankZones(S.study),S.zones);setFields(dr.f);editingId=dr.editingId||null;clicks=dr.clicks||0;renderAll();setTimeout(()=>toast('Відновлено незбережений протокол'),300);}
else renderAll();
setInterval(()=>{if(t0&&!tDone)renderMeter();},1000);
/* архів: перенесення з localStorage у IndexedDB і підтягування збереженого */
aChain=aChain.then(async()=>{const db=await kvGet('archive');if(Array.isArray(db))mergeInto(db);aKnown=new Set(A.map(r=>r.id));refreshArchiveViews();
  if(store.get(A_KEY,null)||!Array.isArray(db))await archivePersist();}).then(()=>folderBoot());
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});
if(bc)bc.postMessage('hello');
if(SET.welcomed&&window.innerWidth>760&&!$('pName').value)setTimeout(()=>{if($('dlg').hidden)$('pName').focus();},50);
if(!SET.welcomed)setTimeout(openWelcome,200);
else if(SET.seenVersion!==VERSION)setTimeout(openWhatsNew,400);
