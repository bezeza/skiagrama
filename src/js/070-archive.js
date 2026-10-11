/* ===== Архів протоколів і «На контроль» ===== */
Object.keys(STUDIES).forEach(k=>$('aStudy').append(el('option',{value:k},STUDIES[k].n)));
let selected=new Set();
function aFiltered(){
  const q=norm($('aSearch').value),f=$('aFrom').value,t=$('aTo').value,s=$('aStudy').value;
  return A.filter(r=>(!q||norm(r.name).includes(q))&&(!f||r.date>=f)&&(!t||r.date<=t)&&(!s||r.study===s)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.ts-a.ts);
}
function ctrlItems(){return A.filter(r=>r.ctrlDue&&!r.ctrlDone).sort((a,b)=>a.ctrlDue.localeCompare(b.ctrlDue));}
function updCtrlBadge(){const n=ctrlItems().filter(r=>r.ctrlDue<=today()).length;const b=$('ctrlBadge');b.textContent='';if(n)b.append(document.createTextNode(' '),el('span',{class:'pill b',title:'на контроль'},String(n)));}
function renderCtrl(){
  const root=$('ctrlList');root.textContent='';const items=ctrlItems();const td=today(),soon=addDays(td,7);
  const shown=items.filter(r=>r.ctrlDue<=soon);
  if(!shown.length){root.append(el('p',{class:'note'},items.length?`Найближчий контроль — ${fmtD(items[0].ctrlDue)} (${items[0].name}).`:'Пацієнтів на контролі немає. Термін береться з рекомендації «Rö-контроль через …».'));return;}
  shown.forEach(r=>{const it=el('div',{class:'it'});const over=r.ctrlDue<=td;
    it.append(el('span',{class:'pill '+(over?'b':'w')},over?(r.ctrlDue===td?'сьогодні':'з '+fmtD(r.ctrlDue)):fmtD(r.ctrlDue)));
    const t=el('span',{class:'t'});t.append(el('b',null,`${r.name}${r.age?', '+r.age+' р.':''}`));t.append(document.createTextNode(` — ${STUDIES[r.study]?STUDIES[r.study].n:''} від ${fmtD(r.date)}: ${r.concl}`));it.append(t);
    const o=el('button',{type:'button',class:'btn sm'},'Новий опис');o.onclick=()=>startControl(r);
    const d=el('button',{type:'button',class:'btn sm'},'Знято з контролю');d.onclick=()=>{r.ctrlDone=true;saveA();renderCtrl();updCtrlBadge();};
    it.append(o,d);root.append(it);});
  if(items.length>shown.length)root.append(el('p',{class:'note'},`Ще ${items.length-shown.length} пацієнтів із пізнішим терміном.`));
}
function startControl(r){newPatient(false);S=blank(r.study);$('pName').value=r.name;$('pAge').value=r.age||'';$('pSex').value=r.sex||'';setEedDefault();$('pNum').value=nextNum();
  S.prevId=r.id;showView('desc');renderAll();toast('Попереднє дослідження підтягнуто — «Як минулого разу» або новий опис');}
function renderArchive(){
  renderCtrl();renderDaySum();
  const bb=$('backupBanner');const fOk=folderOK();
  bb.hidden=fOk||!(A.length&&SET.lastBackup!==today());bb.textContent=SET.lastBackup?`Останню копію архіву збережено ${fmtD(SET.lastBackup)}. Збережіть сьогоднішню копію внизу сторінки або підключіть папку даних у «Налаштуваннях».`:'Копію архіву ще не зберігали. Збережіть її внизу сторінки або підключіть папку даних у «Налаштуваннях».';
  $('backupMsg').textContent=fOk?`Архів автоматично зберігається в папку даних «${folderName()}».`:'Архів зберігається лише в браузері цього пристрою. Раз на день зберігайте копію у файл або підключіть папку даних.';
  const rows=aFiltered();const tb=$('aTable');tb.textContent='';
  if(!A.length){const tr=el('tr');tr.append(el('td',{class:'empty',colspan:'8'},'Архів порожній. Протокол потрапляє сюди після кнопки «Готово». Можна додати приклади внизу.'));tb.append(tr);updPrintBtn();return;}
  const hr=el('tr');const all=el('input',{type:'checkbox','aria-label':'Вибрати всі'});all.checked=rows.length&&rows.every(r=>selected.has(r.id));all.onchange=()=>{rows.forEach(r=>all.checked?selected.add(r.id):selected.delete(r.id));renderArchive();};
  const th0=el('th');th0.append(all);hr.append(th0);['Дата','№','ПІБ','Дослідження','Висновок','Друк',''].forEach(h=>hr.append(el('th',null,h)));tb.append(hr);
  if(!rows.length){const tr=el('tr');tr.append(el('td',{class:'empty',colspan:'8'},'За цими фільтрами протоколів немає.'));tb.append(tr);}
  rows.forEach(r=>{const tr=el('tr',r.example?{class:'ex'}:null);
    const c=el('input',{type:'checkbox','aria-label':'Вибрати для друку'});c.checked=selected.has(r.id);c.onchange=()=>{c.checked?selected.add(r.id):selected.delete(r.id);updPrintBtn();};
    const td0=el('td');td0.append(c);tr.append(td0);
    tr.append(el('td',null,fmtD(r.date)),el('td',null,r.num),el('td',null,`${r.name}${r.age?', '+r.age+' р.':''}${r.example?' (приклад)':''}`),el('td',null,r.what||''),el('td',{class:'c'},r.concl||''));
    const tp=el('td');tp.append(el('span',{class:'pill '+(r.printed?'o':'w')},r.printed?'так':'ні'));tr.append(tp);
    const ta=el('td');const o=el('button',{type:'button',class:'btn sm'},'Відкрити');o.onclick=()=>openRecord(r);
    const del=el('button',{type:'button',class:'btn sm danger'},'Видалити');del.onclick=()=>{if(del.dataset.c){A=A.filter(x=>x!==r);selected.delete(r.id);saveA();renderArchive();renderNames();updCtrlBadge();}else{del.dataset.c='1';del.textContent='Точно?';setTimeout(()=>{del.dataset.c='';del.textContent='Видалити';},3000);}};
    ta.append(o,document.createTextNode(' '),del);tr.append(ta);tb.append(tr);});
  updPrintBtn();
}
/* підсумок дня */
const dayOf=ts=>{const d=new Date(ts);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
function renderDaySum(){
  const box=$('dayBox');box.textContent='';const td=today();
  const todays=A.filter(r=>!r.example&&r.ts&&dayOf(r.ts)===td);const unpr=todays.filter(r=>!r.printed);const allUnpr=A.filter(r=>!r.example&&!r.printed);
  if(!todays.length){box.append(el('p',{class:'note'},'Сьогодні протоколів ще немає.'+(allUnpr.length?` Ненадрукованих за весь час: ${allUnpr.length}.`:'')));return;}
  const by={};todays.forEach(r=>{by[r.study]=(by[r.study]||0)+1;});
  const row=el('div',{class:'daynums'});
  const tile=(n,t,cls)=>{const d=el('div',{class:'dt'+(cls?' '+cls:'')});d.append(el('b',null,String(n)),el('span',null,t));row.append(d);};
  tile(todays.length,'протоколів сьогодні');tile(unpr.length,'не надруковано',unpr.length?'w':'o');
  const ctl=todays.filter(r=>r.ctrlDue).length;if(ctl)tile(ctl,'на контроль');
  box.append(row);
  box.append(el('p',{class:'note'},Object.keys(by).map(k=>`${STUDY_SHORT[k]||k} — ${by[k]}`).join(' · ')));
  if(unpr.length){const b=el('button',{type:'button',class:'btn primary'},`Вибрати й надрукувати сьогоднішні (${unpr.length})`);
    b.onclick=()=>{selected=new Set(unpr.map(r=>r.id));renderArchive();$('aPrint').click();};const r=el('div',{class:'trow'});r.append(b);box.append(r);}
}
function updPrintBtn(){const n=[...selected].filter(id=>A.some(r=>r.id===id)).length;$('aPrint').textContent=n?`Друкувати вибрані (${n})`:'Друкувати вибрані';$('aPrint').disabled=!n;}
function openRecord(r){
  if(r.state){S=clone(r.state);S.zones=Object.assign(blankZones(S.study),S.zones);S.open=null;}else{S=blank(r.study||'ogk');S.manual=r.text||'';}
  if(r.fields)setFields(r.fields);else{$('pName').value=r.name||'';$('pAge').value=r.age||'';$('pNum').value=r.num||'';$('pDate').value=r.date||'';$('pEed').value=r.eed||'';}
  editingId=r.id;clicks=0;t0=null;tDone=null;hist=[];firstPaint=true;showView('desc');renderAll();toast('Відкрито протокол з архіву');
}
['aSearch','aFrom','aTo','aStudy'].forEach(id=>$(id).addEventListener('input',renderArchive));
$('aToday').onclick=()=>{$('aFrom').value=today();$('aTo').value=today();renderArchive();};
$('aClear').onclick=()=>{['aSearch','aFrom','aTo'].forEach(i=>$(i).value='');$('aStudy').value='';renderArchive();};
$('aSelUnprinted').onclick=()=>{selected=new Set(aFiltered().filter(r=>!r.printed).map(r=>r.id));renderArchive();if(!selected.size)toast('Ненадрукованих протоколів у вибірці немає');};
$('aPrint').onclick=()=>{const items=A.filter(r=>selected.has(r.id)).sort((a,b)=>(a.date||'').localeCompare(b.date||'')||a.ts-b.ts).map(recordItem);if(items.length)openPrint(items);};
$('backupBtn').onclick=()=>{const ok=download(`Skiagrama_архів_${today()}.json`,JSON.stringify({app:'skiagrama',v:2,saved:new Date().toISOString(),archive:A},null,1),'application/json');
  if(ok){SET.lastBackup=today();saveSet();}toast(ok?`Копію архіву (${A.length}) збережено у файл`:'Не вдалося зберегти файл');renderArchive();};
function mergeArchive(list){const byId=new Map(A.map(r=>[r.id,r]));let n=0;list.forEach(r=>{if(!r||!r.id)return;const o=byId.get(r.id);if(!o){A.push(r);byId.set(r.id,r);n++;}else if((r.ts||0)>(o.ts||0)){Object.assign(o,r);}});return n;}
$('restoreFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const d=JSON.parse(rd.result);const list=Array.isArray(d)?d:(d.archive||d.journal);if(!Array.isArray(list))throw 0;
  const n=mergeArchive(list);saveA();renderNames();updCtrlBadge();toast(`Відновлено ${n} нових протоколів (усього ${A.length})`);renderArchive();}catch(err){toast('Це не файл копії архіву Skiagrama');}e.target.value='';};rd.readAsText(f);});
$('demoA').onclick=()=>{
  const td=today();const mk=(o)=>{const r=Object.assign({id:'ex'+Math.random().toString(36).slice(2,8),ts:Date.now()+Math.random(),date:td,sex:'',eed:'0,35',printed:false,ctrlDue:'',ctrlDone:false,example:true,study:'ogk'},o);r.units=unitsFromText(r.text);return r;};
  const d=SET.doctor?`Лікар: ${SET.doctor}`:'Лікар: ____________';
  A.push(
   mk({num:'401',name:'Пацієнт А.',age:'27',what:'Rö-гр. ОГК',concl:'Гострий бронхіт.',ctrlDue:addDays(td,-1),date:addDays(td,-12),
     text:`Пацієнт А., 27 р.\nНа Rö-гр. ОГК від ${fmtD(addDays(td,-12))} р. № 401:\nІнфільтративних тіней не виявлено. Легеневий малюнок посилений, збагачений, більше зліва. Корені розширені, тяжисті, малоструктурні. Синуси вільні. Cor — R.N.\nRö-ч: Гострий бронхіт.\nРекомендовано: Rö-контроль через 10–14 днів.\nЕЕД 0,35 мЗв.   ${d}`}),
   mk({num:'402',name:'Пацієнтка К.',age:'59',what:'Rö-гр. ОГК',concl:'Двобічна вогнищево-зливна пневмонія.',ctrlDue:addDays(td,10),
     text:`Пацієнтка К., 59 р.\nНа Rö-гр. ОГК від ${fmtD(td)} р. № 402:\nВ нижньо-медіальних легеневих полях обох легень визначаються інтенсивні зливні тіні, на тлі яких легеневий малюнок не візуалізується. Корені розширені, інтенсивні, нечіткі. Синуси вільні. Cor — R.N.\nRö-ч: Двобічна вогнищево-зливна пневмонія.\nРекомендовано: Rö-контроль через 10–14 днів.\nЕЕД 0,35 мЗв.   ${d}`}),
   mk({num:'403',name:'Пацієнт Д.',age:'44',what:'Rö-гр. ОГК',concl:'ЗЗТБ. Хронічний обструктивний бронхіт. Емфізема легень. Хронічне легеневе серце.',
     text:`Пацієнт Д., 44 р.\nНа Rö-гр. ОГК від ${fmtD(td)} р. № 403:\nІнфільтративних тіней не виявлено. Легені підвищеної пневматизації, розширення міжреберних проміжків. В в/долі правої легені множинні дрібні щільні вогнища, вогнищевий фіброз. Легеневий малюнок деформований, збіднілий. Корені малоструктурні, помірно розширені. Правий корінь підтягнутий вгору. Синуси вільні. Серце — легеневе.\nRö-ч: ЗЗТБ. Хронічний обструктивний бронхіт. Емфізема легень. Хронічне легеневе серце.\nРекомендовано: Консультація фтизіатра; Порівняти з попередніми знімками.\nЕЕД 0,35 мЗв.   ${d}`}),
   mk({num:'404',name:'Пацієнт С.',age:'63',study:'spine',what:'Rö-гр. поперекового відділу хребта (пряма, бічна проєкції)',eed:'',concl:'Остеохондроз поперекового відділу хребта. Спондильоз. Спондилоартроз. Антелістез тіла хребця L5 I ст.',
     text:`Пацієнт С., 63 р.\nНа Rö-гр. поперекового відділу хребта (пряма, бічна проєкції) від ${fmtD(td)} р. № 404:\nФізіологічний лордоз випрямлений. Сколіотична деформація вершиною вліво на рівні L2–L3. Висота тіл хребців збережена. Міжхребцеві щілини нерівномірно звужені на рівні L3–L4, L4–L5, L5–S1. Визначаються субхондральний склероз замикальних пластинок, крайові остеофіти тіл хребців, ознаки спондилоартрозу на рівні L3–S1. Антелістез тіла хребця L5 I ст. Кут Кобба 12° — лівобічний сколіоз II ступеня (за Чакліним). Поперековий лордоз 34° — сплощений.\nRö-ч: Остеохондроз поперекового відділу хребта. Спондильоз. Спондилоартроз. Антелістез тіла хребця L5 I ст. Лівобічний сколіоз II ступеня. Сплощення поперекового лордозу.\nРекомендовано: Консультація невролога; Консультація травматолога; Rö-контроль після лікування.\nЕЕД ___ мЗв.   ${d}`}),
   mk({num:'405',name:'Пацієнтка Н.',age:'35',study:'fg',what:'ФГ ОГК',eed:'',concl:'Патології не виявлено.',
     text:`Пацієнтка Н., 35 р.\nНа ФГ ОГК від ${fmtD(td)} р. № 405:\nІнфільтративних тіней не виявлено. Легеневий малюнок не змінений. Корені структурні, не розширені. Синуси вільні. Cor — R.N.\nRö-ч: Патології не виявлено.\nЕЕД ___ мЗв.   ${d}`}));
  saveA();renderArchive();renderNames();updCtrlBadge();toast('Додано 5 прикладів');};
