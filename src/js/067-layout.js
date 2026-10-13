/* ===== Вигляд: розташування А–Г, дві частини правої панелі, згортання блоків, масштаб, режим екрана, форматування ===== */
const LAYOUTS={A:'Класичне',B:'Робоче місце',C:'Дзеркальне',D:'Один стовпчик'};
const SCALES=[90,100,110,125,150];
const isPhone=()=>window.innerWidth<=760;
const scaleNow=()=>SET.scale||((SET.screen==='laptop'||((SET.screen||'auto')==='auto'&&window.innerWidth<1500))?90:100);
const zoomNow=()=>isPhone()?1:scaleNow()/100;
const screenNow=()=>{const m=SET.screen||'auto';return m==='auto'?(window.innerWidth<1500?'laptop':'monitor'):m;};
const layoutNow=()=>isPhone()?'A':(LAYOUTS[SET.layout]?SET.layout:'B');

/* масштаб усієї програми (друк і файли не змінюються) */
function applySideHeight(){
  if(isPhone())return;
  const side=$('side');if(!side)return;
  const h=Math.max(360,(window.innerHeight-side.getBoundingClientRect().top-12)/zoomNow());
  document.documentElement.style.setProperty('--sideh',h.toFixed(1)+'px');
}
function applyScale(){const z=zoomNow(),r=document.documentElement;r.style.setProperty('--z',z);r.style.setProperty('--vh100',(window.innerHeight/z).toFixed(1)+'px');
  const ew=window.innerWidth/z;r.classList.toggle('w-lt1280',!isPhone()&&ew<1280);r.classList.toggle('w-lt1180',!isPhone()&&ew<1180);
  r.classList.toggle('scr-laptop',screenNow()==='laptop');r.classList.toggle('scr-monitor',screenNow()==='monitor');
  if(screenNow()!=='laptop'&&laptopStudyAutoFold){laptopStudyAutoFold=false;applyFolds();}
  applySideHeight();}
function setScale(v,quiet){SET.scale=Math.max(SCALES[0],Math.min(SCALES[SCALES.length-1],v));saveSet();applyScale();applySideW();if(!quiet)toast(`Масштаб ${SET.scale} %`);renderViewMenu();if(paperView)renderSide();}
function stepScale(d){const cur=scaleNow();let i=SCALES.findIndex(s=>s>=cur);if(i<0)i=SCALES.length-1;if(SCALES[i]!==cur&&d<0)i=i;else i=Math.max(0,Math.min(SCALES.length-1,i+d));setScale(SCALES[i]);}

/* режим екрана: ноутбук — компактно (90 %), монітор — просторо (110 %, більший текст протоколу) */
function setScreen(k){SET.screen=k;if(k!=='auto'){SET.scale=k==='laptop'?90:110;SET.pfs=k==='laptop'?'m':'l';}saveSet();applyLook();applyScale();applySideW();applySplit();renderViewMenu();renderSide();
  if(!$('view-settings').hidden){$('sScale').value=String(scaleNow());$('sScreen').value=k;}
  toast(k==='auto'?'Екран: визначається сам':k==='laptop'?'Екран: ноутбук — компактно':'Екран: монітор — просторо');}
/* розташування */
function applyLayout(){
  const L=layoutNow(),w=$('view-desc'),pc=$('partConcl'),c=$('sec-concl'),r=$('sec-rec'),ck=$('checkBox');
  w.classList.toggle('lay-a',L==='A');w.classList.toggle('lay-b',L!=='A');w.classList.toggle('mirror',L==='C');w.classList.toggle('onecol',L==='D');
  if(L==='A'){const form=w.querySelector('section.form');if(c.parentNode!==form){form.append(c,r);}$('checkHome').append(ck);}
  else if(c.parentNode!==pc){pc.append(c,r,ck);}
  applySplit();applyFolds();applySideHeight();
}
/* межа між протоколом і висновком */
const splitDef=()=>screenNow()==='monitor'?0.6:0.55;
function autoSplit(){const sb=$('sbody'),pd=$('partDoc'),pa=$('paper');const h=sb.clientHeight;if(!h||!pa)return splitDef();
  const need=pa.offsetHeight+(pd.offsetHeight-pd.querySelector('.pscroll').clientHeight)+20+12;
  return Math.max(.3,Math.min(splitDef(),need/h));}
function applySplit(){const v=SET.splitH||autoSplit();$('sbody').style.setProperty('--split',(v*100).toFixed(1)+'%');}
let splitT=0;const applySplitSoon=()=>{if(SET.splitH)return;cancelAnimationFrame(splitT);splitT=requestAnimationFrame(applySplit);};
(()=>{const g=$('hGrip');let d=null;
  g.addEventListener('pointerdown',e=>{if(layoutNow()==='A'||layoutNow()==='D')return;e.preventDefault();g.setPointerCapture(e.pointerId);const sb=$('sbody').getBoundingClientRect();d={top:sb.top,h:sb.height};document.body.classList.add('resizingv');});
  g.addEventListener('pointermove',e=>{if(!d)return;SET.splitH=+Math.max(.2,Math.min(.85,(e.clientY-d.top)/d.h)).toFixed(3);applySplit();});
  const end=()=>{if(!d)return;d=null;document.body.classList.remove('resizingv');saveSet();};
  g.addEventListener('pointerup',end);g.addEventListener('pointercancel',end);
  g.addEventListener('dblclick',()=>{delete SET.splitH;saveSet();applySplit();toast('Межа — сама, під довжину протоколу');});
  g.addEventListener('keydown',e=>{if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();SET.splitH=+Math.max(.2,Math.min(.85,(SET.splitH||autoSplit())+(e.key==='ArrowUp'?-.05:.05))).toFixed(3);applySplit();saveSet();});})();

/* згортання блоків: стрілка біля заголовка, у згорнутому — рядок-підсумок */
const FOLDS=[
  {id:'sec-patient',t:'Пацієнт',at:'.secrow',how:'prepend'},
  {id:'sec-study',t:'Дослідження',at:'.cntrow',how:'append'},
  {id:'sec-zones',t:'Опис',at:'.zhead h2',how:'before'},
  {id:'measPanel',t:'Вимірювання',at:'h2',how:'before'},
  {id:'sec-concl',t:'Висновок',at:'.chead h2',how:'before'},
  {id:'sec-rec',t:'Рекомендації',at:'h2',how:'before'},
  {id:'partDoc',t:'Текст протоколу',at:null,how:null}];
const CHEV_D='<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEV_R='<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let laptopStudyAutoFold=false;
const isFolded=id=>(id==='sec-study'&&laptopStudyAutoFold)||!!(SET.fold||{})[id];
function setFold(id,v){if(id==='sec-study')laptopStudyAutoFold=false;SET.fold=SET.fold||{};if(v)SET.fold[id]=true;else delete SET.fold[id];saveSet();applyFolds();}
function foldLaptopSetup(){
  if(screenNow()!=='laptop')return;
  let changed=false;SET.fold=SET.fold||{};
  if(SET.autoFold!==false&&$('pName').value.trim()&&!isFolded('sec-patient')){SET.fold['sec-patient']=true;changed=true;}
  if(!isFolded('sec-study')){laptopStudyAutoFold=true;changed=true;}
  if(changed){saveSet();applyFolds();}
}
function initFolds(){
  FOLDS.forEach(f=>{const card=$(f.id);if(!card)return;
    const h=el('div',{class:'foldh'});const b=el('button',{type:'button',class:'fbtn','aria-label':`Розгорнути «${f.t}»`,title:'Розгорнути'});b.innerHTML=CHEV_R;b.onclick=()=>setFold(f.id,false);
    h.append(b,el('b',{class:'ft'},f.t),el('span',{class:'fsum'}),el('span',{class:'dot fdot','aria-hidden':'true'}));h.addEventListener('click',e=>{if(e.target===h||e.target.classList.contains('fsum')||e.target.classList.contains('ft'))setFold(f.id,false);});card.prepend(h);
    const c=el('button',{type:'button',class:'fbtn fclose','aria-label':`Згорнути «${f.t}»`,title:'Згорнути'});c.innerHTML=CHEV_D;c.onclick=()=>setFold(f.id,!isFolded(f.id));
    if(f.id==='partDoc'){document.querySelector('.shh h2').prepend(c);}
    else{const at=card.querySelector(f.at);if(!at)return;if(f.how==='before')at.prepend(c);else if(f.how==='prepend')at.prepend(c);else at.append(c);}
    card._fclose=c;});
}
function foldInfo(id){
  const v=x=>$(x).value.trim();
  switch(id){
    case 'sec-patient':{const miss=['pName','pAge','pNum','pDate','pEed'].some(x=>!v(x));return [[v('pName')||'ПІБ не вказано',v('pAge')?ageStr(v('pAge')):'',v('pNum')?'№ '+v('pNum'):'',v('pDate')?fmtD(v('pDate')):'',v('pEed')?'ЕЕД '+v('pEed'):''].filter(Boolean).join(' · '),miss?'e':''];}
    case 'sec-study':{const n=+$('pCount').value||1;return [[study().n+(S.study==='bone'?' · '+objPhrase():''),S.proj.join(', '),n+' '+(n===1?'знімок':n<5?'знімки':'знімків')].filter(Boolean).join(' · '),''];}
    case 'sec-zones':{const vz=visibleZones(),st=vz.map(zoneState),ch=vz.filter((d,i)=>st[i]==='c'||st[i]==='e');return [ch.length?'змінено: '+ch.map(d=>d.name).join(', ')+(ch.length<vz.length?' · решта в нормі':''):'усі зони в нормі',st.includes('e')?'e':ch.length?'c':'n'];}
    case 'measPanel':{const n=measResults().length;return [n?`виміряно: ${n}`:'немає вимірювань',''];}
    case 'sec-concl':{const it=conclItems();const t=it.length?it.join('; '):allNormal()?normConclOf():'не заповнено';return [t+' · '+STATUS[statusOf()],!it.length&&!allNormal()?'e':''];}
    case 'sec-rec':{const r=recList();return [r.length?r.join('; '):'немає',''];}
    case 'partDoc':return ['згорнуто — клік, щоб розгорнути',''];
  }return ['',''];
}
function renderFolds(){FOLDS.forEach(f=>{const card=$(f.id);if(!card||!card.classList.contains('folded'))return;const h=card.querySelector(':scope>.foldh');if(!h)return;const [t,d]=foldInfo(f.id);h.querySelector('.fsum').textContent=t;const dt=h.querySelector('.fdot');dt.className='dot fdot'+(d?' '+d:'');dt.hidden=!d;});
  const fb=$('foldAll');if(fb){const any=FOLD_ALL.some(id=>isFolded(id)),t=any?'Розгорнути все':'Згорнути все';
    fb.innerHTML=(any?'<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3l4 4 4-4M4 9l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>':'<svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 7l4-4 4 4M4 13l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>')+`<span class="lbl">${t}</span>`;
    fb.title=t+' (блоки ліворуч)';fb.setAttribute('aria-label',t);}}
const FOLD_ALL=['sec-patient','sec-study','measPanel','sec-concl','sec-rec'];
function applyFolds(){
  FOLDS.forEach(f=>{const card=$(f.id);if(card)card.classList.toggle('folded',isFolded(f.id));});
  const sb=$('sbody');if(sb){const L=layoutNow();sb.classList.toggle('dfold',isFolded('partDoc'));$('side').classList.toggle('dfold',isFolded('partDoc'));sb.classList.toggle('cfold',L!=='A'&&isFolded('sec-concl')&&isFolded('sec-rec'));}
  renderFolds();
}
function toggleFoldAll(){const any=FOLD_ALL.some(id=>isFolded(id));SET.fold=SET.fold||{};FOLD_ALL.forEach(id=>{if(any)delete SET.fold[id];else SET.fold[id]=true;});saveSet();applyFolds();}

/* меню «Вигляд» */
const LAY_PIC={A:'<rect x="1" y="1" width="22" height="16" rx="2"/><path d="M14 1v16"/>',B:'<rect x="1" y="1" width="22" height="16" rx="2"/><path d="M14 1v16M14 9h9"/>',C:'<rect x="1" y="1" width="22" height="16" rx="2"/><path d="M10 1v16M1 9h9"/>',D:'<rect x="1" y="1" width="22" height="16" rx="2"/><path d="M1 9h22"/>'};
function renderViewMenu(){const box=$('viewPop');if(!box)return;box.textContent='';
  const row=(label,items,cur,on)=>{const r=el('div',{class:'vrow'});r.append(el('span',{class:'vl'},label));const s=el('div',{class:'seg'});
    items.forEach(([k,t,html])=>{const b=el('button',{type:'button','aria-pressed':String(cur===k),'data-keep':'1',title:t});if(html){b.innerHTML=html;b.classList.add('pic');}else b.textContent=t;b.onclick=()=>on(k);s.append(b);});r.append(s);box.append(r);};
  row('Тема',[['system','авто'],['light','світла'],['grey','кабінет'],['dark','темна']],SET.theme,k=>{SET.theme=k;saveSet();applyLook();renderViewMenu();if(!$('view-settings').hidden)$('sTheme').value=k;});
  row('Екран',[['auto','авто'],['laptop','ноутбук'],['monitor','монітор']],SET.screen||'auto',k=>setScreen(k));
  row('Розташування',Object.keys(LAYOUTS).map(k=>[k,`${k==='A'?'А':k==='B'?'Б':k==='C'?'В':'Г'} · ${LAYOUTS[k]}`,`<svg width="30" height="22" viewBox="0 0 24 18" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${LAY_PIC[k]}</svg><span>${LAYOUTS[k]}</span>`]),layoutNow(),k=>{SET.layout=k;saveSet();applyLayout();renderViewMenu();renderSide();toast('Розташування: '+LAYOUTS[k]);});
  if(!isPhone())row('Пацієнт після заповнення',[['on','згортати в рядок'],['off','не згортати']],SET.autoFold===false?'off':'on',k=>{SET.autoFold=k==='on';saveSet();renderViewMenu();if(!$('view-settings').hidden)$('sAutoFold').checked=SET.autoFold;toast(SET.autoFold?'Дані пацієнта згортатимуться після Enter у полі ЕЕД (ноутбук)':'Дані пацієнта не згортаються самі');});
  const r=el('div',{class:'vrow'});r.append(el('span',{class:'vl'},'Масштаб'));const s=el('div',{class:'seg'});
  const m=el('button',{type:'button','data-keep':'1',title:'Зменшити (Alt+−)','aria-label':'Зменшити масштаб'},'A−');m.onclick=()=>stepScale(-1);
  const cur=el('button',{type:'button','data-keep':'1',title:'Повернути 100 % (Alt+0)'},`${scaleNow()} %`);cur.onclick=()=>setScale(100);
  const pl=el('button',{type:'button','data-keep':'1',title:'Збільшити (Alt++)','aria-label':'Збільшити масштаб'},'A+');pl.onclick=()=>stepScale(1);
  s.append(m,cur,pl);r.append(s);box.append(r);
  box.append(el('p',{class:'note'},'Масштаб і шрифт стосуються лише екрана. Друк, PDF і Word — за бланком.'));
  if(isPhone())box.querySelectorAll('.vrow')[2].hidden=true;
}

/* форматування тексту протоколу */
const FMT=[['bold','<b>Ж</b>','Жирний (Ctrl+B)'],['italic','<i>К</i>','Курсив (Ctrl+I)'],['underline','<u>П</u>','Підкреслений (Ctrl+U)'],['|'],
  ['justifyLeft','<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 4h12M2 8h8M2 12h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>','Ліворуч'],
  ['justifyCenter','<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 4h12M4 8h8M3 12h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>','По центру'],
  ['justifyRight','<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 4h12M6 8h8M3 12h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>','Праворуч'],
  ['justifyFull','<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>','По ширині'],['|'],
  ['removeFormat','<svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 13h6M7 3l-2 10M5 3h7M11 9l3 3M14 9l-3 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/></svg>','Прибрати форматування']];
function initFmt(){const bar=$('fmtBar');bar.textContent='';
  FMT.forEach(([cmd,html,t])=>{if(cmd==='|'){bar.append(el('span',{class:'sep'}));return;}const b=el('button',{type:'button','data-cmd':cmd,title:t,'aria-label':t,'aria-pressed':'false'});b.innerHTML=html;
    b.addEventListener('mousedown',e=>e.preventDefault());
    b.onclick=()=>{const tx=$('ptext');if(!tx)return;const s=getSelection();if(!s.rangeCount||!tx.contains(s.anchorNode)){tx.focus();const r=document.createRange();r.selectNodeContents(tx);r.collapse(false);s.removeAllRanges();s.addRange(r);}
      if(cmd==='removeFormat'){document.execCommand('removeFormat');document.execCommand('justifyLeft');}else document.execCommand(cmd);fmtState();};
    bar.append(b);});
  const pf=$('pfsBtn');if(pf){pf.classList.add('pfs');bar.append(pf);}
  document.addEventListener('selectionchange',fmtState);
}
function fmtState(){const tx=$('ptext');const s=getSelection();if(!tx||!s.rangeCount||!tx.contains(s.anchorNode))return;
  $('fmtBar').querySelectorAll('button[data-cmd]').forEach(b=>{const c=b.dataset.cmd;if(c==='removeFormat')return;let on=false;try{on=document.queryCommandState(c);}catch(e){}b.setAttribute('aria-pressed',String(on));});}
/* безпечний HTML ручного тексту: лише абзаци, b/i/u, вирівнювання */
const P_CLS=['pt','concl','recs','foot','body'];
function cleanHtml(html){const t=document.createElement('div');t.innerHTML=String(html||'');
  const ser=n=>{if(n.nodeType===3)return esc(n.data);if(n.nodeType!==1)return '';const tg=n.tagName,inner=[...n.childNodes].map(ser).join('');
    if(tg==='B'||tg==='STRONG')return inner?`<b>${inner}</b>`:'';if(tg==='I'||tg==='EM')return inner?`<i>${inner}</i>`:'';if(tg==='U')return inner?`<u>${inner}</u>`:'';if(tg==='BR')return '<br>';
    if(tg==='DIV'||tg==='P'){const cls=[...n.classList].filter(c=>P_CLS.includes(c));const al=(n.style&&n.style.textAlign)||n.getAttribute('align')||'';
      return `<div${cls.length?` class="${cls.join(' ')}"`:''}${['center','right','justify'].includes(al)?` style="text-align:${al}"`:''}>${inner||'<br>'}</div>`;}
    const fw=n.style&&n.style.fontWeight;let r=inner;if(fw==='bold'||+fw>=600)r=`<b>${r}</b>`;if(n.style&&n.style.fontStyle==='italic')r=`<i>${r}</i>`;if(n.style&&/underline/.test(n.style.textDecoration||''))r=`<u>${r}</u>`;return r;};
  return [...t.childNodes].map(ser).join('');}
const hasFmt=h=>/<(b|i|u)>|text-align/.test(h||'');
function ptextHtml(){const tx=$('ptext');if(!tx)return null;const h=cleanHtml(tx.innerHTML);return hasFmt(h)?h:null;}
/* блоки ручного HTML → рядки з текстом, html і вирівнюванням */
function htmlBlocks(h){const t=document.createElement('div');t.innerHTML=cleanHtml(h);const out=[];
  [...t.childNodes].forEach(n=>{if(n.nodeType===3){if(n.data.trim())out.push({text:n.data,html:esc(n.data),al:''});return;}
    const txt=n.textContent;if(!txt.trim())return;out.push({text:txt.replace(/\s+/g,' ').trim(),html:n.tagName==='DIV'?n.innerHTML:n.outerHTML,al:(n.style&&n.style.textAlign)||''});});return out;}
/* для Word / LibreOffice: html → відрізки з жирним / курсивом / підкресленим */
function htmlRuns(html){const t=document.createElement('div');t.innerHTML=html;const out=[];
  const walk=(n,st)=>{if(n.nodeType===3){if(n.data)out.push(Object.assign({t:n.data.replace(/\s+/g,' ')},st));return;}if(n.nodeType!==1)return;
    const s=Object.assign({},st);if(n.tagName==='B')s.b=true;if(n.tagName==='I')s.i=true;if(n.tagName==='U')s.u=true;if(n.tagName==='BR'){out.push({t:' '});return;}[...n.childNodes].forEach(c=>walk(c,s));};
  walk(t,{});return out;}

/* вигляд протоколу: текст | перегляд перед друком */
function setView(paper){paperView=paper;$('paperBtn').setAttribute('aria-pressed',String(paper));$('textBtn').setAttribute('aria-pressed',String(!paper));$('fmtBar').hidden=paper;renderSide();}
$('textBtn').onclick=()=>setView(false);
$('paperBtn').onclick=()=>setView(!paperView);

/* запуск (викликається з 110 — коли все оголошено) */
function initView(){initFolds();initFmt();
  const vm=$('viewMenu');if(vm)vm.addEventListener('toggle',()=>{if(vm.open)renderViewMenu();});
  $('foldAll').onclick=toggleFoldAll;
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{applySplitSoon();applySideHeight();});ro.observe($('paper'));ro.observe($('sbody'));ro.observe(document.querySelector('header.top'));ro.observe(document.querySelector('.banners'));}
  document.addEventListener('keydown',e=>{if(!e.altKey||e.ctrlKey||e.metaKey)return;if(e.key==='='||e.key==='+'||e.code==='NumpadAdd'){e.preventDefault();stepScale(1);}else if(e.key==='-'||e.code==='NumpadSubtract'){e.preventDefault();stepScale(-1);}else if(e.key==='0'&&!typing(e)){e.preventDefault();setScale(100);}});
  let lastPhone=isPhone();window.addEventListener('resize',()=>{applyScale();if(isPhone()!==lastPhone){lastPhone=isPhone();applyLayout();}});
  /* одноразово: старий «Розмір шрифту» → масштаб */
  if(SET.scale==null&&SET.font&&SET.font!=='m'){SET.scale={s:90,l:110,xl:125}[SET.font]||100;SET.font='m';saveSet();}
  applyScale();applyLayout();}
