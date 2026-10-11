/* ===== Відображення: вкладки, розділи, зони, висновок, протокол ===== */
const STUDY_SHORT={ogk:'ОГК',fg:'ФГ',bone:'Кістки',spine:'Хребет',abd:'ОЧП',skull:'Череп, ППН'};
function switchStudy(k){if(S.study===k)return;tick();const keep={obj:S.obj,side:S.side,dept:S.dept,skull:S.skull};S=Object.assign(blank(k),keep);S.prevId=findPrev();setEedDefault();renderAll();}
function renderStudy(){
  const st=$('studyTabs');st.textContent='';
  Object.keys(STUDIES).forEach(k=>{const b=el('button',{type:'button',role:'tab','aria-selected':String(S.study===k),title:STUDIES[k].n},STUDY_SHORT[k]||STUDIES[k].n);b.onclick=()=>switchStudy(k);st.append(b);});
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
}
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

function renderZones(){
  const root=$('zones');root.textContent='';
  visibleZones().forEach((d,i)=>{
    const z=S.zones[d.id];const box=el('div',{class:'zone'+(S.focus===d.id?' focus':''),id:'zone-'+d.id});const head=el('div',{class:'zone-head'});
    const h=el('h3');h.append(el('span',{class:'dot '+zoneState(d),'aria-hidden':'true'}));if(i<9)h.append(el('kbd',{class:'hk'},String(i+1)));h.append(document.createTextNode(d.name));head.append(h);
    const seg=el('div',{class:'seg',role:'group','aria-label':d.name});
    [['n','Норма'],['c','Зміни'],['x','—']].forEach(([st,l])=>{const b=el('button',{type:'button','aria-pressed':String(z.st===st),class:st==='n'?'n':'',title:st==='x'?'Не згадувати в протоколі':st==='n'?(normOf(d)||'У нормі не описується'):null},l);
      b.onclick=()=>{tick();z.st=st;S.focus=d.id;S.open=st==='c'?d.id:(S.open===d.id?null:S.open);renderAll();};seg.append(b);});
    head.append(seg);
    const t=zoneText(d);const isOpen=z.st==='c'&&S.open===d.id;
    const ph=el('button',{type:'button',class:'phrase'+(z.st==='c'?' ch':''),'aria-expanded':z.st==='c'?String(isOpen):null},
      (t||(z.st==='n'?'(у нормі не описується)':'(не згадується)'))+(z.st==='c'&&!isOpen?'  ✎':''));
    ph.onclick=()=>{if(z.st!=='c'){tick();z.st='c';}S.open=isOpen?null:d.id;S.focus=d.id;renderAll();};
    head.append(ph);box.append(head);
    if(isOpen){
      d.groups.forEach(g=>{const row=el('div',{class:'group'});row.append(el('span',{class:'gl'},g.l));
        if(g.type==='text'){const inp=el('input',{class:'t',type:'text',placeholder:g.ph||'','aria-label':d.name+': '+g.l});inp.value=z.sel[g.id]||'';
          inp.addEventListener('input',()=>{tick('text');z.sel[g.id]=inp.value;ph.textContent=zoneText(d);renderSide();renderConcl();renderNav();});row.append(inp);}
        else orderOpts(d,g).forEach(([k,phrase,label])=>{const on=g.many?(z.sel[g.id]||[]).includes(k):z.sel[g.id]===k;
          const b=el('button',{type:'button',class:'chip','aria-pressed':String(on),title:'У протокол: «'+phrase+'»'},label);
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
function renderConcl(){
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
  if(!S.concl.length&&allNormal())ch.append(el('p',{class:'note'},'Усі зони в нормі — у протокол піде «'+study().normConcl+'».'));
  const cc=$('conclChips');cc.textContent='';
  conclChipList().forEach(t=>{const on=S.concl.includes(t);const b=el('button',{type:'button',class:'chip','aria-pressed':String(on)},t);
    b.onclick=()=>{tick();on?S.concl.splice(S.concl.indexOf(t),1):S.concl.push(t);renderAll();};cc.append(b);});
}
const conclChipList=()=>[study().normConcl,...study().chips.map(c=>c.replace('{dept}',deptGen()))];
function renderRecs(){
  const rc=$('recChips');rc.textContent='';
  RECS.forEach(t=>{const on=S.recs.includes(t);const b=el('button',{type:'button',class:'chip','aria-pressed':String(on)},t);
    b.onclick=()=>{tick();on?S.recs.splice(S.recs.indexOf(t),1):S.recs.push(t);renderAll();};rc.append(b);});
}
function findPrev(){
  const name=norm($('pName').value);if(name.length<4)return null;
  const recs=A.filter(r=>norm(r.name)===name&&r.study===S.study&&r.id!==editingId).sort((a,b)=>(b.date||'').localeCompare(a.date||'')||b.ts-a.ts);
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

/* протокол: текст або «як на папері» */
let prevZoneText={},firstPaint=true,editing=false,paperView=false;
function renderPaper(){
  const p=$('paper');p.textContent='';
  if(paperView&&!editing){renderSheetView(p);return;}
  p.append(el('div',{class:'stampspace'},'місце для штампу'));
  if(editing){
    const ta=el('textarea',{id:'manualTa','aria-label':'Текст протоколу'});ta.value=protocolText();p.append(ta);
    const r=el('div',{class:'trow',style:'margin-top:10px'});
    const ok=el('button',{type:'button',class:'btn primary'},'Зберегти правку');ok.onclick=()=>{tick();S.manual=ta.value;editing=false;renderAll();toast('Текст змінено вручну');};
    const no=el('button',{type:'button',class:'btn'},'Скасувати');no.onclick=()=>{editing=false;renderSide();};
    r.append(ok,no);p.append(r);setTimeout(()=>ta.focus(),0);return;
  }
  if(S.manual!=null){
    const b=el('div',{class:'trow',style:'margin-bottom:8px'});b.append(el('span',{class:'badge'},'відредаговано вручну'));
    const rs=el('button',{type:'button',class:'btn sm'},'Скинути правку');rs.onclick=()=>{tick();S.manual=null;renderAll();};b.append(rs);p.append(b);
    p.append(el('div',{class:'manual'},S.manual));return;
  }
  const P=protocol();
  p.append(el('p',{class:'pt'},P.head),el('p',null,P.ref));
  const b=el('p',{class:'body'});const nowMap={};
  P.body.forEach(x=>{const cls=['z'];if(x.tbd)cls.push('tbd');if(!firstPaint&&prevZoneText[x.zone]!==x.t)cls.push('flash');nowMap[x.zone]=x.t;
    b.append(el('span',{class:cls.join(' '),'data-zone':x.zone,title:'Відкрити зону'},x.t),document.createTextNode(' '));});
  p.append(b);prevZoneText=nowMap;firstPaint=false;
  setTimeout(()=>p.querySelectorAll('.flash').forEach(n=>n.classList.remove('flash')),900);
  const c=el('p',{class:'concl'});c.append(P.concl.tbd?el('span',{class:'tbd'},P.concl.t):document.createTextNode(P.concl.t));p.append(c);
  if(P.rec)p.append(el('p',{class:'recs'},P.rec));
  const f=el('div',{class:'foot'});f.append(el('span',null,P.eed),el('span',null,P.doc));p.append(f);
}
function renderSheetView(p){
  p.style.padding='12px';p.style.background='transparent';p.style.boxShadow='none';
  const it=classify({name:$('pName').value.trim()||'Пацієнт',units:currentUnits()});
  const wrap=el('div',{class:'sheetview'});
  const msg={half:['ok','Вміщається в пів аркуша A4 ✓'],flip:['w','Не вміщається в пів аркуша — продовження піде на зворот тієї ж половинки'],full:['w',SET.printMode==='flip'?'Задовгий навіть для двох сторін половинки — займе цілий аркуш':'Не вміщається в пів аркуша — займе цілий аркуш']}[it.kind];
  wrap.append(el('div',{class:'fit '+msg[0]},msg[1]));
  const avail=Math.max(260,($('paper').parentElement.clientWidth||600)-50);const z=Math.min(1,avail/mm(210));
  const mkHalf=(html,label)=>{const box=el('div');box.append(el('div',{class:'note'},label));const s=el('div',{class:'sheetbox'});s.style.zoom=z;
    s.innerHTML=`<div class="pslot" style="width:210mm"><div class="pdoc">${html}</div></div>`;box.append(s);return box;};
  const stamp='<div class="pstamp show">місце для штампу</div>';
  if(it.kind==='half')wrap.append(mkHalf(stamp+unitsHTML(it.units),'Половина аркуша A4'));
  else if(it.kind==='flip'){wrap.append(mkHalf(stamp+unitsHTML(it.front),'Лицьова сторона половинки'));wrap.append(mkHalf(unitsHTML(it.back),'Зворот тієї ж половинки'));}
  else{const box=el('div');box.append(el('div',{class:'note'},'Цілий аркуш A4'));const s=el('div',{class:'sheetbox'});s.style.zoom=z;s.innerHTML=`<div class="ppage full" style="min-height:0"><div class="pdoc">${stamp}${unitsHTML(it.units)}</div></div>`;box.append(s);wrap.append(box);}
  p.append(wrap);
}
function resetPaperStyle(){const p=$('paper');p.style.padding='';p.style.background='';p.style.boxShadow='';}
$('paper').addEventListener('click',e=>{const z=e.target.closest('[data-zone]');if(!z)return;const id=z.dataset.zone;closeSheet();
  if(id==='meas'){$('measPanel').scrollIntoView({block:'start',behavior:'smooth'});return;}
  if(id==='prev'){$('prevBox').scrollIntoView({block:'center',behavior:'smooth'});return;}
  const zs=S.zones[id];if(zs&&zs.st!=='c'){tick();zs.st='c';}openZone(id,true);renderSide();renderConcl();});
function renderChecks(saveMode){
  const w=checks();const box=$('checkBox');box.classList.toggle('has',!!w.length);box.classList.toggle('ok',!w.length);
  $('checkSum').textContent=w.length?`Перевірка перед підписом: зауважень ${w.length}`:'Перевірка перед підписом: зауважень немає ✓';
  const ul=$('checkList');ul.textContent='';w.forEach(t=>ul.append(el('li',null,t)));
  const act=$('checkAct');act.textContent='';
  if(saveMode&&w.length){box.open=true;const b=el('button',{type:'button',class:'btn sm'},'Зберегти все одно');b.onclick=()=>doSave();act.append(b);}
  updBar(w);
}
function updBar(w){
  $('mbarConcl').textContent=S.manual!=null?'Текст змінено вручну':conclText().t;
  const mw=$('mbarWarn');mw.textContent='';if(w&&w.length)mw.append(el('span',{class:'pill w',title:w.join(' ')},'⚠ '+w.length));
}
function renderMeter(){
  const m=$('meter');if(!t0){m.textContent=editingId?'Відкрито протокол з архіву':'';return;}
  const sec=Math.round(((tDone||Date.now())-t0)/1000);m.textContent='';
  m.append(el('b',null,`${Math.floor(sec/60)}:${pad(sec%60)}`));m.append(document.createTextNode(` · ${clicks} дій${tDone?' · збережено в архів':''}${editingId&&!tDone?' · редагування протоколу з архіву':''}`));
}
function renderTpl(){
  const r=$('tplRow');r.textContent='';const list=TPL.filter(t=>t.study===S.study);
  if(!list.length)return;r.append(el('span',{class:'note'},'Шаблони:'));
  list.forEach(t=>{const w=el('span',{class:'tpl'});const a=el('button',{type:'button'},t.name);a.onclick=()=>{tick();applyTpl(t);};
    const x=el('button',{type:'button','aria-label':'Видалити шаблон '+t.name},'×');
    x.onclick=()=>{if(x.dataset.c){TPL=TPL.filter(q=>q!==t);saveTpl();renderTpl();}else{x.dataset.c='1';x.textContent='видалити?';setTimeout(()=>{x.dataset.c='';x.textContent='×';},3000);}};
    w.append(a,x);r.append(w);});
}
function applyTpl(t){const d=clone(t.data);Object.assign(S,{zones:Object.assign(blankZones(S.study),d.zones),concl:d.concl||[],recs:d.recs||[],proj:d.proj||S.proj,meas:d.meas||{},dismissed:[],open:null,manual:null});['obj','side','dept','skull'].forEach(k=>{if(d[k])S[k]=d[k];});renderAll();}
function renderNames(){const dl=$('nameList');dl.textContent='';const seen=new Set();
  [...A].sort((a,b)=>b.ts-a.ts).forEach(r=>{const k=norm(r.name);if(!k||seen.has(k)||seen.size>400)return;seen.add(k);dl.append(el('option',{value:r.name,label:`${r.age?r.age+' р. · ':''}${STUDIES[r.study]?STUDIES[r.study].n:''} · ${fmtD(r.date)}`}));});}
let draftT;
function saveDraftSoon(){clearTimeout(draftT);draftT=setTimeout(()=>{const f=fieldsObj();const has=f.pName.trim()||S.manual!=null||Object.values(S.zones).some(z=>z.st!=='n')||S.concl.length;if(has)store.set(DRAFT_KEY,Object.assign(snapshot(),{ts:Date.now(),clicks}));else store.del(DRAFT_KEY);},400);}
function renderSide(){if(!paperView||editing)resetPaperStyle();renderPaper();renderChecks();renderMeter();saveDraftSoon();}
function renderAll(){renderStudy();renderPrev();renderZones();renderMeas();renderConcl();renderRecs();renderTpl();renderNav();renderSide();}
