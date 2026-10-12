/* ===== Відображення: вкладки, розділи, зони, висновок, протокол ===== */
const STUDY_IC={ogk:'lungs',fg:'fg',bone:'bone',spine:'spine',abd:'abd',skull:'skull'};
const STUDY_SHORT={ogk:'ОГК',fg:'ФГ',bone:'Кістки',spine:'Хребет',abd:'ОЧП',skull:'Череп, ППН'};
function switchStudy(k){if(S.study===k)return;tick();editZone=null;const keep={obj:S.obj,side:S.side,dept:S.dept,skull:S.skull,blank:S.blank};S=Object.assign(blank(k),keep);S.prevId=findPrev();setEedDefault();renderAll();}
function renderStudy(){
  const st=$('studyTabs');st.textContent='';
  Object.keys(STUDIES).forEach(k=>{const b=el('button',{type:'button',role:'tab','aria-selected':String(S.study===k),title:STUDIES[k].n});b.append(STUDY_IMG[k]?el('img',{class:'simg',src:STUDY_IMG[k],alt:'',width:'36',height:'36'}):icEl(STUDY_IC[k]),document.createTextNode(STUDY_SHORT[k]||STUDIES[k].n));b.onclick=()=>switchStudy(k);st.append(b);});
  $('flowWrap').hidden=S.study!=='fg';$('flowChk').checked=!!SET.flow;
  const ex=$('studyExtra');ex.textContent='';
  if(S.study==='bone'){
    const l1=el('label',{class:'f wide'},'Кістка / суглоб');const s1=el('select');
    BONE_OBJ.forEach(o=>{const op=el('option',{value:o[0]},o[1]);if(o[0]===S.obj)op.selected=true;s1.append(op);});
    s1.onchange=()=>{tick();S.obj=s1.value;renderAll();};l1.append(s1);ex.append(l1);
    const o=BONE_OBJ.find(x=>x[0]===S.obj);
    if(o&&o[3]!=='none'){const l2=el('label',{class:'f'},'Бік');const s2=el('select');[['п','правий'],['л','лівий'],['о','обидва']].forEach(([k,t])=>{const op=el('option',{value:k},t);if(k===S.side)op.selected=true;s2.append(op);});
      s2.onchange=()=>{tick();S.side=s2.value;renderAll();};l2.append(s2);ex.append(l2);}
  }
  if(S.study==='spine'){const l=el('label',{class:'f wide'},'Відділ');const s=el('select');
    SPINE_DEPT.forEach(d=>{const op=el('option',{value:d[0]},d[1]);if(d[0]===S.dept)op.selected=true;s.append(op);});s.onchange=()=>{tick();S.dept=s.value;renderAll();};l.append(s);ex.append(l);}
  if(S.study==='skull'){const l=el('label',{class:'f wide'},'Що досліджуємо');const s=el('select');
    [['ppn','Приносові пазухи (ППН)'],['cherep','Кістки черепа']].forEach(([k,t])=>{const op=el('option',{value:k},t);if(k===S.skull)op.selected=true;s.append(op);});s.onchange=()=>{tick();S.skull=s.value;renderAll();};l.append(s);ex.append(l);}
  ex.hidden=!ex.childElementCount;
  const pc=$('projChips');pc.hidden=!['bone','spine','skull','ogk'].includes(S.study);[...pc.querySelectorAll('.chip')].forEach(n=>n.remove());
  PROJ.forEach(p=>{const on=S.proj.includes(p);const b=el('button',{type:'button',class:'chip','aria-pressed':String(on)},p);
    b.onclick=()=>{tick();on?S.proj.splice(S.proj.indexOf(p),1):S.proj.push(p);renderAll();};pc.append(b);});
  syncCount();
}
/* лічильник знімків: проєкції × (обидва суглоби → 2); ручне число не перезаписуємо */
function autoCount(){if(S.study==='fg')return 1;const n=Math.max(1,S.proj.length);return S.study==='bone'&&S.side==='о'?n*2:n;}
function syncCount(){const i=$('pCount');if(!S.countManual)i.value=String(autoCount());$('cntNote').textContent=S.countManual?'змінено вручну':(S.study==='bone'&&S.side==='о'?'за проєкціями, обидва боки — удвічі':'рахується за проєкціями');$('cntAuto').hidden=!S.countManual;
  const sp=$('samePtTop');if(sp)sp.hidden=!$('pName').value.trim();}
function setEedDefault(){$('pEed').value=SET.eed[S.study]||'';}
function nextNum(){const y=($('pDate').value||today()).slice(0,4);const n=num(SET.lastNum);return (isFinite(n)&&SET.lastNumYear===y)?String(n+1):'';}
const DOT_T={n:'норма',c:'зміни',x:'не згадується',e:'не дозаповнено'};
function renderNav(){
  const nz=$('navZones');[...nz.querySelectorAll('button')].forEach(n=>n.remove());
  visibleZones().forEach(d=>{const s=zoneState(d);const b=el('button',{type:'button',title:d.name+' — '+DOT_T[s],class:S.open===d.id?'on':null});b.append(document.createTextNode(d.name),el('span',{class:'dot '+s,'aria-hidden':'true'}));
    b.onclick=()=>gotoZone(d.id);nz.append(b);});
  $('navMeas').hidden=!activeMeas().length;
  const dc=$('navConcl');dc.textContent='Висновок';const ct=conclText();dc.append(el('span',{class:'dot '+(ct.t.includes('…')?'e':ct.auto?'n':'c'),'aria-hidden':'true'}));
  renderStepper();
}
function gotoZone(id){S.open=(S.zones[id]&&S.zones[id].st==='c')?id:S.open;S.focus=id;renderZones();renderNav();const z=$('zone-'+id);if(z)z.scrollIntoView({block:'start',behavior:'smooth'});}
function renderStepper(){const vz=visibleZones();let i=vz.findIndex(d=>d.id===S.focus);if(i<0)i=0;const d=vz[i];if(!d)return;
  $('stName').textContent=`${d.name} · ${i+1}/${vz.length}`;$('stName').onclick=()=>openNavSheet();
  $('stPrev').disabled=i===0;$('stNext').disabled=i===vz.length-1;
  $('stPrev').onclick=()=>gotoZone(vz[Math.max(0,i-1)].id);$('stNext').onclick=()=>gotoZone(vz[Math.min(vz.length-1,i+1)].id);}
function openZone(id,scroll){S.open=id;S.focus=id;renderZones();renderNav();if(scroll){const z=$('zone-'+id);if(z)z.scrollIntoView({block:'start',behavior:'smooth'});}}

/* Кнопки зони: звичайний режим і редагування (олівець ✎).
   Завдання для тебе: знайди в 020-data.js зону «Інфільтрація» (id:'infil') і подивись,
   як кнопка «права» записана в коді: ['права','правої легені','права'] — ключ, фраза в протокол, напис.
   Олівець робить те саме без коду: зміни зберігаються в SET.btn / SET.btnAdd / SET.btnOrder (040-core.js → effOpts). */
let editZone=null;
function renderZones(){const fk=focusKey();renderZonesInner();focusRestore(fk);}
function renderZonesInner(){
  const root=$('zones');root.textContent='';
  visibleZones().forEach((d,i)=>{
    const z=S.zones[d.id];const zs=zoneState(d);const ed=editZone===d.id;
    const box=el('div',{class:'zone'+(z.st==='c'||ed?' wide':'')+(zs==='e'?' err':'')+(S.focus===d.id?' focus':'')+(ed?' editing':''),id:'zone-'+d.id});const head=el('div',{class:'zone-head'});
    const h=el('h3');h.append(el('span',{class:'dot '+zoneState(d),'aria-hidden':'true'}));if(i<9)h.append(el('kbd',{class:'hk'},String(i+1)));h.append(document.createTextNode(d.name));
    const pen=el('button',{type:'button',class:'zpen','aria-pressed':String(ed),title:ed?'Завершити редагування кнопок':'Редагувати кнопки зони: напис, фраза, порядок','aria-label':'Редагувати кнопки зони '+d.name});pen.append(icEl('pen'));
    pen.onclick=()=>{editZone=ed?null:d.id;S.focus=d.id;renderZones();if(!ed){const n=$('zone-'+d.id);if(n)n.scrollIntoView({block:'nearest'});}};
    h.append(pen);head.append(h);
    const seg=el('div',{class:'seg',role:'group','aria-label':d.name});
    [['n','Норма'],['c','Зміни'],['x','—']].forEach(([st,l])=>{const b=el('button',{type:'button','aria-pressed':String(z.st===st),class:st==='n'?'n':'',title:st==='x'?'Не згадувати в протоколі':st==='n'?(normOf(d)||'У нормі не описується'):null},l);
      b.onclick=()=>{tick();z.st=st;S.focus=d.id;S.open=st==='c'?d.id:(S.open===d.id?null:S.open);renderAll();};seg.append(b);});
    head.append(seg);
    const t=zoneText(d);const isOpen=z.st==='c'&&S.open===d.id;
    const ph=el('button',{type:'button',class:'phrase'+(z.st==='c'?' ch':''),'aria-expanded':z.st==='c'?String(isOpen):null},
      (t||(z.st==='n'?'(у нормі не описується)':'(не згадується)'))+(z.st==='c'&&!isOpen?'  ✎':''));
    ph.onclick=()=>{if(z.st!=='c'){tick();z.st='c';}S.open=isOpen?null:d.id;S.focus=d.id;renderAll();};
    head.append(ph);box.append(head);
    if(ed)renderZoneEditor(d,box);
    else if(isOpen){
      d.groups.forEach(g=>{const row=el('div',{class:'group'});row.append(el('span',{class:'gl'},g.l));
        if(g.type==='text'){const inp=el('input',{class:'t',type:'text',placeholder:g.ph||'','aria-label':d.name+': '+g.l});inp.value=z.sel[g.id]||'';
          inp.addEventListener('input',()=>{tick('text');z.sel[g.id]=inp.value;ph.textContent=zoneText(d);renderSide();renderConcl();renderNav();});row.append(inp);}
        else effOpts(d,g).forEach(o=>{const k=o.k;const on=g.many?(z.sel[g.id]||[]).includes(k):z.sel[g.id]===k;
          const b=el('button',{type:'button',class:'chip','aria-pressed':String(on),title:'У протокол: «'+o.ph+'»'},o.lb);
          b.onclick=()=>{tick();if(!on)countUse(d,g,k);if(g.many){const a=z.sel[g.id]||(z.sel[g.id]=[]);const i=a.indexOf(k);i>=0?a.splice(i,1):a.push(k);}else z.sel[g.id]=on?null:k;renderAll();};row.append(b);});
        box.append(row);});
      /* мої кнопки */
      const row=el('div',{class:'group'});row.append(el('span',{class:'gl'},'Мої'));
      const mine=z.sel.__my||(z.sel.__my=[]);
      myList(d).forEach(p=>{const on=mine.includes(p);const w=el('span',{class:'tpl'});
        const a=el('button',{type:'button','aria-pressed':String(on),title:'У протокол: «'+sentence(p)+'»'},p);a.onclick=()=>{tick();on?mine.splice(mine.indexOf(p),1):mine.push(p);renderAll();};
        const x=el('button',{type:'button','aria-label':'Видалити кнопку «'+p+'»'},'×');
        x.onclick=()=>{if(x.dataset.c){SET.my[myKey(d)]=myList(d).filter(q=>q!==p);saveSet();const i=mine.indexOf(p);if(i>=0)mine.splice(i,1);renderAll();}else{x.dataset.c='1';x.textContent='видалити?';setTimeout(()=>{x.dataset.c='';x.textContent='×';},3000);}};
        w.append(a,x);row.append(w);});
      const add=el('div',{class:'myadd'});const inp=el('input',{type:'text',placeholder:'+ своя фраза, напр. «плевро-діафрагмальні спайки справа»','aria-label':'Нова фраза для зони '+d.name});
      const ok=el('button',{type:'button',class:'btn sm'},'Додати');
      const doAdd=()=>{const p=inp.value.trim().replace(/\.$/,'');if(!p)return;tick();const l=myList(d).slice();if(!l.includes(p))l.push(p);SET.my[myKey(d)]=l;saveSet();if(!mine.includes(p))mine.push(p);renderAll();toast('Кнопку додано');};
      ok.onclick=doAdd;inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();doAdd();}});add.append(inp,ok);row.append(add);box.append(row);
      const done=el('button',{type:'button',class:'btn sm'},'Згорнути');done.onclick=()=>{S.open=null;renderZones();renderNav();};box.append(done);
    }
    root.append(box);});
}
/* редактор кнопок зони */
const zonePrefix=d=>`${S.study}.${d.id}.`;
function zoneHasEdits(d){const p=zonePrefix(d);return [SET.btn,SET.btnAdd,SET.btnOrder].some(o=>Object.keys(o||{}).some(k=>k.startsWith(p)))||isNormOverridden(d);}
function resetZoneButtons(d){const p=zonePrefix(d);[SET.btn,SET.btnAdd,SET.btnOrder].forEach(o=>Object.keys(o).forEach(k=>{if(k.startsWith(p))delete o[k];}));delete SET.norms[S.study+'.'+d.id];saveSet();}
function setBtn(gk,k,patch){const key=gk+'.'+k;const o=Object.assign({},SET.btn[key]||{},patch);Object.keys(o).forEach(x=>{if(o[x]===''||o[x]===false||o[x]==null)delete o[x];});if(Object.keys(o).length)SET.btn[key]=o;else delete SET.btn[key];saveSet();}
function setAdded(gk,k,patch){const a=SET.btnAdd[gk]||[];const x=a.find(y=>y.k===k);if(x)Object.assign(x,patch);saveSet();}
function moveBtn(d,g,k,to){const list=effOpts(d,g,true).map(o=>o.k);const i=list.indexOf(k);if(i<0)return;list.splice(i,1);list.splice(Math.max(0,Math.min(list.length,to)),0,k);SET.btnOrder[gKey(d,g)]=list;saveSet();}
function renderZoneEditor(d,box){
  box.append(el('p',{class:'note'},'Режим редагування кнопок. Напис — що на кнопці, фраза — що піде в протокол. Порядок: стрілки ↑↓ або перетягніть рядок. Зміни зберігаються одразу.'));
  const nr=el('div',{class:'egroup'});nr.append(el('div',{class:'eh'},'Фраза норми'));
  const ni=el('input',{type:'text','aria-label':'Фраза норми зони '+d.name,placeholder:'(у нормі не описується)'});ni.value=normOf(d);
  ni.addEventListener('input',()=>{SET.norms[S.study+'.'+d.id]=ni.value;saveSet();renderSide();});nr.append(ni);box.append(nr);
  d.groups.filter(g=>g.type!=='text').forEach(g=>{
    const gk=gKey(d,g);const wrap=el('div',{class:'egroup'});wrap.append(el('div',{class:'eh'},g.l));
    const list=effOpts(d,g,true);
    list.forEach((o,idx)=>{
      const r=el('div',{class:'erow'+(o.hid?' hid':''),draggable:'true'});r.dataset.k=o.k;
      r.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',o.k);r.classList.add('drag');});
      r.addEventListener('dragend',()=>r.classList.remove('drag'));
      r.addEventListener('dragover',e=>{e.preventDefault();r.classList.add('over');});
      r.addEventListener('dragleave',()=>r.classList.remove('over'));
      r.addEventListener('drop',e=>{e.preventDefault();const k=e.dataTransfer.getData('text/plain');if(k&&k!==o.k){moveBtn(d,g,k,idx);renderZones();renderSide();}});
      const up=el('button',{type:'button',class:'btn sm icon','aria-label':'Вище: '+o.lb,disabled:idx===0?'':null},'↑');up.onclick=()=>{moveBtn(d,g,o.k,idx-1);renderZones();};
      const dn=el('button',{type:'button',class:'btn sm icon','aria-label':'Нижче: '+o.lb,disabled:idx===list.length-1?'':null},'↓');dn.onclick=()=>{moveBtn(d,g,o.k,idx+1);renderZones();};
      const lb=el('input',{type:'text',class:'elb','aria-label':'Напис кнопки',placeholder:'Напис'});lb.value=o.lb;
      const ph=el('input',{type:'text',class:'eph','aria-label':'Фраза в протокол',placeholder:'Фраза в протокол'});ph.value=o.ph;
      const upd=(f,v)=>{o.added?setAdded(gk,o.k,{[f]:v}):setBtn(gk,o.k,{[f]:v});renderSide();renderNav();};
      lb.addEventListener('input',()=>upd('label',lb.value.trim()));ph.addEventListener('input',()=>upd('phrase',ph.value.trim()));
      const hd=el('button',{type:'button',class:'btn sm','aria-pressed':String(o.hid)},o.hid?'Показати':'Сховати');
      hd.onclick=()=>{o.added?setAdded(gk,o.k,{hidden:!o.hid}):setBtn(gk,o.k,{hidden:!o.hid});renderZones();};
      r.append(el('span',{class:'grip','aria-hidden':'true'},'⋮⋮'),up,dn,lb,ph,hd);
      if(o.added){const x=el('button',{type:'button',class:'btn sm danger','aria-label':'Видалити кнопку '+o.lb},'×');
        x.onclick=()=>{if(x.dataset.c){SET.btnAdd[gk]=(SET.btnAdd[gk]||[]).filter(y=>y.k!==o.k);if(!SET.btnAdd[gk].length)delete SET.btnAdd[gk];saveSet();renderZones();renderSide();}else{x.dataset.c='1';x.textContent='видалити?';setTimeout(()=>{x.dataset.c='';x.textContent='×';},3000);}};r.append(x);}
      wrap.append(r);});
    const ar=el('div',{class:'erow add'});const al=el('input',{type:'text',class:'elb',placeholder:'Напис нової кнопки','aria-label':'Напис нової кнопки в групі '+g.l});const ap=el('input',{type:'text',class:'eph',placeholder:'Фраза в протокол','aria-label':'Фраза нової кнопки в групі '+g.l});
    const ab=el('button',{type:'button',class:'btn sm'},'+ Додати');
    ab.onclick=()=>{const phrase=ap.value.trim()||al.value.trim();if(!phrase){ap.focus();return;}const a=SET.btnAdd[gk]||(SET.btnAdd[gk]=[]);a.push({k:'u'+Date.now().toString(36),label:al.value.trim()||phrase,phrase});saveSet();renderZones();toast('Кнопку додано в «'+g.l+'»');};
    ap.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ab.click();}});
    ar.append(al,ap,ab);wrap.append(ar);box.append(wrap);});
  const r=el('div',{class:'trow'});
  const rs=el('button',{type:'button',class:'btn sm',disabled:zoneHasEdits(d)?null:''},'Повернути як було');
  rs.onclick=()=>{if(rs.dataset.c){resetZoneButtons(d);renderZones();renderSide();toast('Кнопки зони «'+d.name+'» повернуто');}else{rs.dataset.c='1';rs.textContent='Точно повернути стандартні кнопки?';setTimeout(()=>{rs.dataset.c='';rs.textContent='Повернути як було';},3000);}};
  const ok=el('button',{type:'button',class:'btn sm primary'},'Готово');ok.onclick=()=>{editZone=null;renderZones();};
  r.append(ok,rs);box.append(r);
}
function renderMeas(){
  const ids=activeMeas();$('measPanel').hidden=!ids.length;const root=$('meas');root.textContent='';
  ids.forEach(id=>{const def=MEAS[id];const m=S.meas[id]||(S.meas[id]={});const row=el('div',{class:'mrow',id:'meas-'+id});
    const nm=el('div');nm.append(el('b',null,def.n));nm.append(el('div',{class:'note'},'Норма: '+def.norm));row.append(nm);
    const mi=el('div',{class:'mi'});
    const mk=(key,ph,lab,cls)=>{const i=el('input',{type:'text',inputmode:cls?null:'decimal',placeholder:ph,'aria-label':def.n+': '+lab,class:cls||null});i.value=m[key]||'';i.addEventListener('input',()=>{tick('text');m[key]=i.value;updMeas();});return i;};
    if(def.kind==='kti'){mi.append(mk('a','серце, мм','ширина серця'),el('span',null,'/'),mk('b','груди, мм','ширина грудної клітки'),el('span',{class:'note'},'або'),mk('v','індекс','індекс'));}
    else{mi.append(mk('v',def.u==='%'?'%':'град.',def.n));mi.append(el('span',null,def.u||''));}
    if(def.dir){const s=el('select',{'aria-label':'Напрямок дуги'});[['','дуга —'],['правобічний','правобічна'],['лівобічний','лівобічна']].forEach(([k,t])=>{const o=el('option',{value:k},t);if(m.dir===k)o.selected=true;s.append(o);});s.onchange=()=>{tick();m.dir=s.value;updMeas();};mi.append(s);}
    if(def.lvl)mi.append(mk('lvl','хребець','рівень','lvl'));
    row.append(mi);row.append(el('div',{class:'mres',id:'mres-'+id}));root.append(row);});
  updMeas(true);
}
function updMeas(silent){
  const rs=measResults();
  activeMeas().forEach(id=>{const r=rs.find(x=>x.id===id);const box=$('mres-'+id);if(!box)return;box.textContent='';box.className='mres';
    if(!r)return;box.className='mres '+(r.r.ok?'okk':r.r.c?'out':'');const t=r.r.c?r.r.c:(r.r.ok?'У нормі':r.r.ph);
    box.append(MEAS[id].tbd?el('span',{class:'tbd'},t):document.createTextNode(t));});
  if(!silent){renderConcl();renderSide();renderNav();}
}
function renderStatus(){
  const seg=$('statusSeg');seg.textContent='';const cur=statusOf();
  Object.keys(STATUS).forEach(k=>{const b=el('button',{type:'button',class:'st-'+k,'aria-pressed':String(cur===k),'data-st':k},STATUS[k]);
    b.onclick=()=>{tick();S.status=S.status===k?null:(k===autoStatus()?null:k);renderAll();};seg.append(b);});
  $('statusNote').textContent=S.status?'вибрано вручну (клацніть ще раз — авто)':'визначено автоматично';
}
function renderConcl(){
  $('urgBtn').setAttribute('aria-pressed',String(!!S.urgent));renderStatus();
  const sg=$('sugs');sg.textContent='';
  const sugs=suggestions().filter(([t])=>!S.concl.includes(t)&&!S.dismissed.includes(t));
  sugs.forEach(([t,why,tbd])=>{const row=el('div',{class:'ci'});const sp=el('span');sp.append(el('span',tbd?{class:'tbd'}:null,t));sp.append(el('span',{class:'why'},'Підказка: '+why));row.append(sp);
    const a=el('button',{type:'button',class:'btn sm'},'Прийняти');a.onclick=()=>{tick();S.concl.push(t);renderAll();};
    const x=el('button',{type:'button',class:'btn sm'},'Ні');x.onclick=()=>{tick();S.dismissed.push(t);renderAll();};row.append(a,x);sg.append(row);});
  if(sugs.length>1){const b=el('button',{type:'button',class:'btn'},'Прийняти всі підказки');b.onclick=()=>{tick();sugs.forEach(([t])=>S.concl.push(t));renderAll();};sg.append(b);}
  const ch=$('chosen');ch.textContent='';
  S.concl.forEach((t,i)=>{const row=el('div',{class:'row'});row.append(el('span',null,t));
    if(i>0){const u=el('button',{type:'button',class:'btn sm','aria-label':'Вище'},'↑');u.onclick=()=>{tick();[S.concl[i-1],S.concl[i]]=[S.concl[i],S.concl[i-1]];renderAll();};row.append(u);}
    const x=el('button',{type:'button',class:'btn sm danger'},'Прибрати');x.onclick=()=>{tick();S.concl.splice(i,1);renderAll();};row.append(x);ch.append(row);});
  if(!S.concl.length&&allNormal())ch.append(el('p',{class:'note'},'Усі зони в нормі — у протокол піде «'+normConclOf()+'».'));
  renderChipList('concl');
}
const conclChipList=()=>[normConclOf(),...effList('concl').map(x=>x.t)];
function renderRecs(){renderChipList('rec');}
/* кнопки висновку / рекомендацій: звичайний режим, «+ свій», олівець ✎ */
let editList=null;
function addToList(kind,text){
  text=String(text||'').trim().replace(/\.$/,'');if(!text)return false;
  const key=listKeyOf(kind);const L=SET.lists[key]||(SET.lists[key]={});const a=L.add||(L.add=[]);
  if(!effList(kind,true).some(x=>x.t===text))a.push({k:'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,4),t:text});
  saveSet();const arr=kind==='concl'?S.concl:S.recs;if(!arr.includes(text))arr.push(text);return true;
}
function renderChipList(kind){
  const isC=kind==='concl';const root=$(isC?'conclChips':'recChips'),tools=$(isC?'conclTools':'recTools');root.textContent='';tools.textContent='';
  const arr=isC?S.concl:S.recs;
  if(editList===kind){root.hidden=true;renderListEditor(kind,tools);return;}root.hidden=false;
  const chip=(t,k)=>{const on=arr.includes(t);const b=el('button',{type:'button',class:'chip','aria-pressed':String(on)},t);
    b.onclick=()=>{tick();if(on)arr.splice(arr.indexOf(t),1);else{arr.push(t);if(k)countList(kind,k);}renderAll();};root.append(b);};
  if(isC)chip(normConclOf(),null);
  effList(kind).forEach(x=>chip(x.t,x.k));
  const pen=el('button',{type:'button',class:'btn sm',title:'Змінити текст кнопок, сховати, переставити'});pen.append(icEl('pen'),document.createTextNode('Редагувати кнопки'));pen.onclick=()=>{editList=kind;renderChipList(kind);};
  tools.append(pen);
}
function renderListEditor(kind,box){
  const isC=kind==='concl';const key=listKeyOf(kind);const L=()=>SET.lists[key]||(SET.lists[key]={});
  box.append(el('p',{class:'note'},(isC?`Кнопки висновку для «${study().n}». `:'Кнопки рекомендацій (спільні для всіх досліджень). ')+'Змініть текст, сховайте зайве, переставте стрілками або перетягніть. Зміни зберігаються одразу.'+(isC&&study().chips.some(c=>c.includes('{dept}'))?' {dept} — підставиться відділ хребта.':'')));
  if(isC){const nr=el('div',{class:'egroup'});nr.append(el('div',{class:'eh'},'Висновок норми (коли всі зони в нормі)'));
    const ni=el('input',{type:'text','aria-label':'Висновок норми',placeholder:study().normConcl});ni.value=(SET.conclNorm||{})[S.study]||'';
    ni.addEventListener('input',()=>{const v=ni.value.trim();if(v)SET.conclNorm[S.study]=v;else delete SET.conclNorm[S.study];saveSet();renderSide();renderNav();});nr.append(ni);box.append(nr);}
  const wrap=el('div',{class:'egroup'});wrap.append(el('div',{class:'eh'},isC?'Кнопки висновку':'Кнопки рекомендацій'));
  const list=effList(kind,true);
  const move=(k,to)=>{const ks=effList(kind,true).map(x=>x.k);const i=ks.indexOf(k);ks.splice(i,1);ks.splice(Math.max(0,Math.min(ks.length,to)),0,k);L().order=ks;saveSet();renderChipList(kind);};
  list.forEach((o,idx)=>{
    const r=el('div',{class:'erow'+(o.hid?' hid':''),draggable:'true'});r.dataset.k=o.k;
    r.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',o.k);r.classList.add('drag');});r.addEventListener('dragend',()=>r.classList.remove('drag'));
    r.addEventListener('dragover',e=>{e.preventDefault();r.classList.add('over');});r.addEventListener('dragleave',()=>r.classList.remove('over'));
    r.addEventListener('drop',e=>{e.preventDefault();const k=e.dataTransfer.getData('text/plain');if(k&&k!==o.k)move(k,idx);});
    const up=el('button',{type:'button',class:'btn sm icon','aria-label':'Вище: '+o.t,disabled:idx===0?'':null},'↑');up.onclick=()=>move(o.k,idx-1);
    const dn=el('button',{type:'button',class:'btn sm icon','aria-label':'Нижче: '+o.t,disabled:idx===list.length-1?'':null},'↓');dn.onclick=()=>move(o.k,idx+1);
    const ti=el('input',{type:'text',class:'eph','aria-label':'Текст кнопки'});ti.value=o.raw;
    ti.addEventListener('input',()=>{const v=ti.value.trim().replace(/\.$/,'');const LL=L();
      if(o.added){const a=(LL.add||[]).find(y=>y.k===o.k);if(a&&v)a.t=v;}else{LL.edit=LL.edit||{};if(v&&v!==o.k)LL.edit[o.k]=v;else delete LL.edit[o.k];}
      saveSet();renderSide();renderNav();});
    const hd=el('button',{type:'button',class:'btn sm','aria-pressed':String(o.hid)},o.hid?'Показати':'Сховати');
    hd.onclick=()=>{const LL=L();const h=LL.hidden||(LL.hidden=[]);const i=h.indexOf(o.k);i>=0?h.splice(i,1):h.push(o.k);saveSet();renderChipList(kind);};
    r.append(el('span',{class:'grip','aria-hidden':'true'},'⋮⋮'),up,dn,ti,hd);
    if(o.added){const x=el('button',{type:'button',class:'btn sm danger','aria-label':'Видалити кнопку '+o.t},'×');
      x.onclick=()=>{if(x.dataset.c){const LL=L();LL.add=(LL.add||[]).filter(y=>y.k!==o.k);saveSet();renderChipList(kind);}else{x.dataset.c='1';x.textContent='видалити?';setTimeout(()=>{x.dataset.c='';x.textContent='×';},3000);}};r.append(x);}
    wrap.append(r);});
  const ar=el('div',{class:'erow add'});const ai=el('input',{type:'text',class:'eph',placeholder:isC?'Новий висновок':'Нова рекомендація','aria-label':isC?'Новий висновок':'Нова рекомендація'});
  const ab=el('button',{type:'button',class:'btn sm'},'+ Додати');ab.onclick=()=>{const v=ai.value.trim().replace(/\.$/,'');if(!v){ai.focus();return;}const LL=L();(LL.add||(LL.add=[])).push({k:'u'+Date.now().toString(36),t:v});saveSet();renderChipList(kind);};
  ai.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ab.click();}});ar.append(ai,ab);wrap.append(ar);box.append(wrap);
  const has=!!SET.lists[key]&&Object.keys(SET.lists[key]).some(k=>{const v=SET.lists[key][k];return Array.isArray(v)?v.length:Object.keys(v||{}).length;})||(isC&&!!SET.conclNorm[S.study]);
  const r=el('div',{class:'trow'});const ok=el('button',{type:'button',class:'btn sm primary'},'Готово');ok.onclick=()=>{editList=null;renderAll();};
  const rs=el('button',{type:'button',class:'btn sm',disabled:has?null:''},'Повернути як було');
  rs.onclick=()=>{if(rs.dataset.c){delete SET.lists[key];if(isC)delete SET.conclNorm[S.study];saveSet();editList=null;renderAll();toast('Кнопки повернуто');}else{rs.dataset.c='1';rs.textContent='Точно повернути стандартні кнопки?';setTimeout(()=>{rs.dataset.c='';rs.textContent='Повернути як було';},3000);}};
  r.append(ok,rs);box.append(r);
}
function findPrev(){
  const name=norm($('pName').value);if(name.length<4)return null;
  const recs=byName(name).filter(r=>r.study===S.study&&r.id!==editingId).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.ts-a.ts);
  return recs[0]?recs[0].id:null;
}
function renderPrev(){
  const box=$('prevBox');box.textContent='';const p=S.prevId&&A.find(r=>r.id===S.prevId);
  const pn=$('prevNav');pn.textContent='';
  if(!p){box.hidden=true;return;}box.hidden=false;
  const nb=el('button',{type:'button'},'Попереднє');nb.append(el('span',{class:'dot c','aria-hidden':'true'}));nb.onclick=()=>box.scrollIntoView({block:'center',behavior:'smooth'});pn.append(nb);
  const top=el('div');top.append(el('b',null,`Попереднє: ${STUDIES[p.study]?STUDIES[p.study].n:p.study}, ${fmtD(p.date)}`));top.append(el('div',null,p.concl||''));box.append(top);
  const row=el('div',{class:'group'});row.append(el('span',{class:'gl'},'Динаміка'));
  ['позитивна динаміка','без динаміки','негативна динаміка'].forEach(t=>{const on=S.dyn===t;const b=el('button',{type:'button',class:'chip','aria-pressed':String(on)},t);b.onclick=()=>{tick();S.dyn=on?null:t;renderAll();};row.append(b);});
  box.append(row);
  if(p.state&&p.state.study===S.study){const b=el('button',{type:'button',class:'btn sm'},'Як минулого разу — перенести попередній опис');
    b.onclick=()=>{tick();const ps=clone(p.state);Object.assign(S,{zones:Object.assign(blankZones(S.study),ps.zones),concl:ps.concl||[],recs:[],meas:ps.meas||{},proj:ps.proj||[],obj:ps.obj||S.obj,side:ps.side||S.side,dept:ps.dept||S.dept,skull:ps.skull||S.skull,open:null,manual:null,dismissed:[]});renderAll();toast('Попередній опис перенесено — змініть те, що змінилося');};
    const r2=el('div',{class:'trow'});r2.append(b);box.append(r2);}
}

/* протокол: текст (правиться прямо тут) або «як на папері» */
let prevZoneText={},firstPaint=true,paperView=false;
const ptextFocused=()=>{const a=document.activeElement;return !!(a&&a.id==='ptext');};
function readPtext(){const n=$('ptext');if(!n)return '';return n.innerText.replace(/ /g,' ').replace(/\n{3,}/g,'\n\n').replace(/\s+$/,'');}
function updManualBadge(){const b=$('pman');if(b)b.hidden=S.manual==null;}
function renderPaper(){
  const p=$('paper');
  if(!paperView&&ptextFocused())return; /* не збиваємо курсор під час правки */
  p.textContent='';
  if(paperView){renderSheetView(p);return;}
  const man=el('div',{class:'pman',id:'pman',hidden:S.manual==null?'':null});
  man.append(el('span',{class:'badge'},'відредаговано вручну'));
  const rs=el('button',{type:'button',class:'btn sm'},'Скинути правку');rs.onclick=()=>{tick();S.manual=null;renderAll();toast('Повернуто автоматичний текст');};
  man.append(rs,el('span',{class:'note'},'Кнопки зон тепер не змінюють текст — скиньте правку, щоб повернути автотекст.'));p.append(man);
  if(S.urgent)p.append(el('div',{class:'urgline'},'ТЕРМІНОВО · критична знахідка'));
  const tx=el('div',{id:'ptext',contenteditable:'true',spellcheck:'true',role:'textbox','aria-multiline':'true','aria-label':'Текст протоколу — можна правити прямо тут',title:'Клацніть і пишіть. Alt+клік по реченню — відкрити його зону.'});
  if(S.manual!=null){
    String(S.manual).split('\n').forEach((ln,i)=>{const d=el('div',{class:i===0?'pt':/^Rö-ч:/.test(ln)?'concl':''});if(ln)d.textContent=ln;else d.append(el('br'));tx.append(d);});
  }else{
    const P=protocol();
    tx.append(el('div',{class:'pt'},P.head),el('div',null,P.ref));
    const b=el('div',{class:'body'});const nowMap={};
    P.body.forEach((x,i)=>{const cls=['z'];if(x.tbd)cls.push('tbd');if(!firstPaint&&prevZoneText[x.zone]!==x.t)cls.push('flash');nowMap[x.zone]=x.t;
      if(i)b.append(document.createTextNode(' '));b.append(el('span',{class:cls.join(' '),'data-zone':x.zone},x.t));});
    tx.append(b);prevZoneText=nowMap;firstPaint=false;
    setTimeout(()=>p.querySelectorAll('.flash').forEach(n=>n.classList.remove('flash')),900);
    const c=el('div',{class:'concl'});c.append(P.concl.tbd?el('span',{class:'tbd'},P.concl.t):document.createTextNode(P.concl.t));tx.append(c);
    if(P.rec)tx.append(el('div',{class:'recs'},P.rec));
    tx.append(el('div',{class:'foot'},P.eed+'   '+P.doc));
  }
  tx.addEventListener('input',()=>{const first=S.manual==null;tick('text');S.manual=readPtext();updManualBadge();renderChecks();saveDraftSoon();if(first)renderNav();});
  tx.addEventListener('blur',()=>{if(S.manual!=null){renderBlankAdviceSoon();}});
  p.append(tx);
  p.append(el('p',{class:'note phint'},'Текст можна правити прямо тут. Alt+клік по реченню — відкрити його зону.'));
}
function renderSheetView(p){
  p.style.padding='12px';p.style.background='transparent';p.style.boxShadow='none';
  const it=classify(currentItem());const B=BLANKS[it.blank]||BLANKS.C;
  const wrap=el('div',{class:'sheetview'});
  const msg={half:['ok',it.cmp?'Вміщається в пів аркуша A4 — ущільнено до 11 pt ✓':'Вміщається в пів аркуша A4 ✓'],
    flip:['w','Не вміщається в пів аркуша — продовження піде на зворот тієї ж половинки'],
    full:['w','Не вміщається в пів аркуша навіть ущільнено — надрукується на цілому аркуші A4 з одного боку']}[it.kind];
  wrap.append(el('div',{class:'fit '+msg[0]},`Бланк ${it.blank} · ${B.n}. ${msg[1]}`));
  const avail=Math.max(260,($('paper').parentElement.clientWidth||600)-50);const z=Math.min(1,avail/mm(210));
  itemPreview(it).forEach(pg=>{const box=el('div');box.append(el('div',{class:'note'},pg.label));const s=el('div',{class:'sheetbox'});s.style.zoom=z;s.innerHTML=pg.html;box.append(s);wrap.append(box);});
  p.append(wrap);
}
function resetPaperStyle(){const p=$('paper');p.style.padding='';p.style.background='';p.style.boxShadow='';}
$('paper').addEventListener('click',e=>{if(paperView)return;const z=e.target.closest('[data-zone]');if(!z||!e.altKey)return;e.preventDefault();const id=z.dataset.zone;closeSheet();
  if(id==='meas'){$('measPanel').scrollIntoView({block:'start',behavior:'smooth'});return;}
  if(id==='prev'){$('prevBox').scrollIntoView({block:'center',behavior:'smooth'});return;}
  const zs=S.zones[id];if(zs&&zs.st!=='c'){tick();zs.st='c';}document.activeElement&&document.activeElement.blur();openZone(id,true);renderSide();renderConcl();});
/* рядок пацієнта і бланк */
function shortFio(n){const p=String(n||'').trim().split(/\s+/).filter(Boolean);if(p.length<2)return p.join(' ');return p[0]+' '+p.slice(1).map(x=>/^\p{L}\.(\p{L}\.)?$/u.test(x)||/^[(\[]/.test(x)?x:x.charAt(0).toUpperCase()+'.').join(' ');}
function patientLine(){const n=shortFio($('pName').value),a=$('pAge').value.trim(),no=$('pNum').value.trim(),d=$('pDate').value;
  return [n?n+(a?`, ${ageStr(a)}`:''):(a?ageStr(a):''),no?'№ '+no:'',d?fmtD(d):''].filter(Boolean).join(' · ');}
function renderPatientSum(){const t=patientLine();$('pSum').textContent=t||'Пацієнта не вказано';$('pSum').classList.toggle('empty',!t);$('mbarPat').textContent=t;}
function renderBlankSel(){const s=$('blankSel');if(!s.options.length)BLANK_ORDER.forEach(b=>s.append(el('option',{value:b,title:BLANKS[b].why},`${b} · ${BLANKS[b].sn}`)));s.value=curBlank();s.title=BLANKS[curBlank()].why;}
let advT=null;
function renderBlankAdviceSoon(){clearTimeout(advT);advT=setTimeout(renderBlankAdvice,350);}
function renderBlankAdvice(){
  const box=$('blankAdvice');box.textContent='';let a=null;try{a=blankAdvice(currentItem());}catch(e){a=null;}
  if(!a){box.hidden=true;return;}box.hidden=false;
  box.append(el('span',null,a.text));
  if(a.b){const b=el('button',{type:'button',class:'btn sm primary'},'Застосувати '+a.b);b.onclick=()=>{tick();S.blank=a.b;renderSide();toast('Бланк '+a.b+' · '+BLANKS[a.b].n);};box.append(b);}
  else if(/Налаштуваннях/.test(a.text)){const b=el('button',{type:'button',class:'btn sm'},'Відкрити налаштування');b.onclick=()=>showView('settings');box.append(b);}
}
function renderChecks(saveMode){
  const w=checks();const box=$('checkBox');box.classList.toggle('has',!!w.length);box.classList.toggle('ok',!w.length);
  $('checkSum').textContent=w.length?`Перевірка перед підписом: зауважень ${w.length}`:'Перевірка перед підписом: зауважень немає ✓';
  const ul=$('checkList');ul.textContent='';w.forEach(t=>ul.append(el('li',null,t)));
  const act=$('checkAct');act.textContent='';
  if(saveMode&&w.length){box.open=true;const b=el('button',{type:'button',class:'btn sm'},'Зберегти все одно');b.onclick=()=>doSave();act.append(b);}
  updBar(w);
}
const REQ_FIELDS=[['pName','Не вказано ПІБ.'],['pAge','Не вказано вік.'],['pNum','Не вказано № знімка.'],['pDate','Не вказано дату знімка.'],['pEed','Не вказано ЕЕД.']];
function updBar(w){
  const c=$('doneCnt');c.hidden=!w.length;c.textContent=w.length?String(w.length):'';$('doneBtn').title=w.length?'Перед збереженням: '+w.join(' '):'Зберегти в архів (Ctrl+S)';
  const touched=!!t0||!!$('pName').value.trim();REQ_FIELDS.forEach(([id,msg])=>$(id).classList.toggle('miss',touched&&w.includes(msg)));
  $('mbarConcl').textContent=S.manual!=null?'Текст змінено вручну':conclText().t;
  const mw=$('mbarWarn');mw.textContent='';if(w&&w.length)mw.append(el('span',{class:'pill w',title:w.join(' ')},'⚠ '+w.length));
}
function renderMeter(){
  const m=$('meter');
  if(tDone||(editingId&&!t0)){m.textContent='';if(!t0)m.append(document.createTextNode('Відкрито протокол з архіву '));else{const sec=Math.round((tDone-t0)/1000);m.append(el('b',null,`${Math.floor(sec/60)}:${pad(sec%60)}`),document.createTextNode(` · ${clicks} дій · збережено в архів `));}
    const b=el('button',{type:'button',class:'btn sm',id:'samePt'},'+ Ще дослідження цьому пацієнту');b.onclick=sameStudyPatient;m.append(b);return;}
  if(!t0){m.textContent='';return;}
  const sec=Math.round(((tDone||Date.now())-t0)/1000);m.textContent='';
  m.append(el('b',null,`${Math.floor(sec/60)}:${pad(sec%60)}`));m.append(document.createTextNode(` · ${clicks} дій${tDone?' · збережено в архів':''}${editingId&&!tDone?' · редагування протоколу з архіву':''}`));
}
function renderTpl(){
  const r=$('tplRow');r.textContent='';const list=TPL.filter(t=>t.study===S.study);
  if(!list.length)return;r.append(el('span',{class:'note'},'Шаблони:'));
  list.forEach(t=>{const w=el('span',{class:'tpl'+(t.pack?' fromPack':'')});const a=el('button',{type:'button',title:t.pack?`Типовий опис з пакета «${t.pack}»${t.packAuthor?' · '+t.packAuthor:''}${t.packStatus==='затверджено'?'':' — чернетка, перевірте'}`:null},t.name);if(t.pack&&t.packStatus!=='затверджено')a.append(el('sup',{class:'draft'},' чернетка'));a.onclick=()=>{tick();applyTpl(t);};
    const x=el('button',{type:'button','aria-label':'Видалити шаблон '+t.name},'×');
    x.onclick=()=>{if(x.dataset.c){TPL=TPL.filter(q=>q!==t);saveTpl();renderTpl();}else{x.dataset.c='1';x.textContent='видалити?';setTimeout(()=>{x.dataset.c='';x.textContent='×';},3000);}};
    w.append(a,x);r.append(w);});
}
function applyTpl(t){const d=clone(t.data);Object.assign(S,{zones:Object.assign(blankZones(S.study),d.zones),concl:d.concl||[],recs:d.recs||[],proj:d.proj||S.proj,meas:d.meas||{},dismissed:[],open:null,manual:null});['obj','side','dept','skull'].forEach(k=>{if(d[k])S[k]=d[k];});renderAll();}
function renderNames(){const dl=$('nameList');dl.textContent='';const seen=new Set();
  [...A].sort((a,b)=>b.ts-a.ts).forEach(r=>{const k=norm(r.name);if(!k||seen.has(k)||seen.size>400)return;seen.add(k);dl.append(el('option',{value:r.name,label:`${r.age?ageStr(r.age)+' · ':''}${STUDIES[r.study]?STUDIES[r.study].n:''} · ${fmtD(r.date)}`}));});}
let draftT;
function saveDraftSoon(){clearTimeout(draftT);draftT=setTimeout(()=>{const f=fieldsObj();const has=f.pName.trim()||S.manual!=null||Object.values(S.zones).some(z=>z.st!=='n')||S.concl.length;if(has)store.set(DRAFT_KEY,Object.assign(snapshot(),{ts:Date.now(),clicks}));else store.del(DRAFT_KEY);},400);}
function renderSide(){if(!paperView)resetPaperStyle();renderPatientSum();renderBlankSel();renderPaper();renderChecks();renderMeter();renderBlankAdviceSoon();saveDraftSoon();}
function updStudyCard(){}
/* фокус клавіатури не губиться, коли кнопки перемальовуються (пробіл / Enter на кнопці → фокус лишається на ній) */
function focusKey(){const a=document.activeElement;if(!a||a.tagName!=='BUTTON')return null;const box=a.closest('[id]');if(!box||box.id==='ptext'||box.id==='dlgBox')return null;
  const gs=[...box.querySelectorAll('.group')];const g=a.closest('.group');const scope=g||box;
  return {box:box.id,gi:g?gs.indexOf(g):-1,t:a.textContent.trim(),aria:a.getAttribute('aria-label'),i:[...scope.querySelectorAll('button')].indexOf(a)};}
function focusRestore(k){if(!k)return;const cur=document.activeElement;if(cur&&cur!==document.body&&document.body.contains(cur))return;
  const box=$(k.box);if(!box)return;const scope=k.gi>=0?box.querySelectorAll('.group')[k.gi]||box:box;const btns=[...scope.querySelectorAll('button')];
  const b=btns.find(x=>x.textContent.trim()===k.t&&x.getAttribute('aria-label')===k.aria)||btns[k.i];if(b)b.focus({preventScroll:true});}
function renderAll(){const fk=focusKey();renderStudy();renderPrev();updStudyCard();renderZones();renderMeas();renderConcl();renderRecs();renderTpl();renderNav();renderSide();focusRestore(fk);}
