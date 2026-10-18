/* ===== Перегляд перед друком на весь екран: аркуш з масштабом + панель бланка й друку ===== */
let pmZoom=1,pmZoomMode='page';
function applyBind(){const b=BL(),r=document.documentElement.style;r.setProperty('--bind',(+b.bind||0)+'mm');r.setProperty('--offx',(+b.offX||0)+'mm');r.setProperty('--offy',(+b.offY||0)+'mm');}
function setBL(k,v){SET.bl=Object.assign({},SET.bl||{},{[k]:v});saveSet();applyBind();if(lastPrint.length)openPrint(lastPrint.map(x=>x.current?currentItem():x));renderSide();}
function pmOpenShell(){if($('printModal').hidden){$('printModal').hidden=false;document.body.classList.add('pm-open');closeSheet();}}
/* сторінки: справжній розмір A4, масштаб — через zoom обгортки */
function renderPmPages(){const pv=$('pmPreview');pv.textContent='';const sh=PLAN.sheets;
  sh.forEach((s,i)=>{const w=el('div',{class:'pmpage'});w.append(el('div',{class:'pml'},`Аркуш ${i+1} з ${sh.length}${s.full?' — цілий':(s.backs&&s.backs.some(Boolean)?' — лицьова':'')}`));const z=el('div',{class:'pmsheet'});z.innerHTML=pageHTML(s,'front');w.append(z);pv.append(w);
    if(s.backs&&s.backs.some(Boolean)){const w2=el('div',{class:'pmpage'});w2.append(el('div',{class:'pml'},`Аркуш ${i+1} — зворот`));const z2=el('div',{class:'pmsheet'});z2.innerHTML=pageHTML(s,'back');w2.append(z2);pv.append(w2);}});}
function showPmPages(list){const pv=$('pmPreview');pv.textContent='';list.forEach(([t,h])=>{const w=el('div',{class:'pmpage'});w.append(el('div',{class:'pml'},t));const z=el('div',{class:'pmsheet'});z.innerHTML=h;w.append(z);pv.append(w);});
  $('pmPanelBody').textContent='';$('pmPanelBody').append(el('p',{class:'note'},'Пробний аркуш друкується без налаштувань бланка.'));pmOpenShell();setTimeout(()=>pmZoomTo('page'),0);}
/* масштаб */
const PM_A4W=mm(210),PM_A4H=mm(297);
function pmApplyZoom(){$('pmPreview').style.setProperty('--pz',pmZoom.toFixed(3));$('pmZoomVal').textContent=Math.round(pmZoom*100)+' %';}
function pmZoomTo(mode){pmZoomMode=mode;const st=$('pmStage');const W=st.clientWidth-48,H=st.clientHeight-64;
  if(mode==='page')pmZoom=Math.max(.2,Math.min(W/PM_A4W,H/PM_A4H));else if(mode==='width')pmZoom=Math.max(.2,W/PM_A4W);pmApplyZoom();}
function pmStep(d){pmZoomMode='free';pmZoom=Math.max(.2,Math.min(3,+(pmZoom*(d>0?1.15:1/1.15)).toFixed(3)));pmApplyZoom();}
$('pmZoomOut').onclick=()=>pmStep(-1);$('pmZoomIn').onclick=()=>pmStep(1);$('pmFitPage').onclick=()=>pmZoomTo('page');$('pmFitWidth').onclick=()=>pmZoomTo('width');$('pmZoomVal').onclick=()=>{pmZoomMode='free';pmZoom=1;pmApplyZoom();};
$('pmStage').addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();pmStep(e.deltaY<0?1:-1);},{passive:false});
window.addEventListener('resize',()=>{if(!$('printModal').hidden&&pmZoomMode!=='free')pmZoomTo(pmZoomMode);});
/* панель */
const COPY_PIC={one:'<svg viewBox="0 0 30 40" aria-hidden="true"><rect x="1" y="1" width="28" height="38" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M1 20h28" stroke="currentColor" stroke-dasharray="2 2"/><path d="M5 6h14M5 9h18M5 12h12" stroke="currentColor" stroke-width="1.6"/><path d="M5 25h10M5 28h18M5 31h14" stroke="currentColor" stroke-width="1.6" opacity=".45"/></svg>',
  two:'<svg viewBox="0 0 30 40" aria-hidden="true"><rect x="1" y="1" width="28" height="38" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M1 20h28" stroke="currentColor" stroke-dasharray="2 2"/><path d="M5 6h14M5 9h18M5 12h12M5 25h14M5 28h18M5 31h12" stroke="currentColor" stroke-width="1.6"/></svg>',
  full:'<svg viewBox="0 0 30 40" aria-hidden="true"><rect x="1" y="1" width="28" height="38" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5 6h14M5 9h18M5 12h12M5 15h18M5 18h16M5 21h18M5 24h10" stroke="currentColor" stroke-width="1.6"/></svg>'};
const PM_OPEN=new Set();
function renderPmPanel(){const box=$('pmPanelBody');const sc=box.parentElement.scrollTop;box.textContent='';const b=BL();const single=lastPrint.length===1;
  const sec=(t)=>{const d=el('div',{class:'pmsec'});d.append(el('div',{class:'pmh'},t));box.append(d);return d;};
  /* примірники */
  const cs=sec('Примірники');const cg=el('div',{class:'pmcopies',role:'group','aria-label':'Примірники'});
  [['one','Один','на пів аркуша; друга половина — наступному'],['two','Два','пацієнту + в історію хвороби, один аркуш'],['full','Цілий аркуш','один протокол на A4']].forEach(([k,t,d])=>{
    const x=el('button',{type:'button','aria-pressed':String(b.copies===k),'data-copies':k,title:d});x.innerHTML=COPY_PIC[k];x.append(el('b',null,t),el('span',null,d));x.onclick=()=>setBL('copies',k);cg.append(x);});
  cs.append(cg,el('p',{class:'note'},b.copies==='two'?'Паперу: 1 аркуш на кожен протокол.':b.copies==='full'?'Паперу: 1 аркуш на протокол, великий шрифт.':'Паперу: 1 аркуш на 2 протоколи.'));
  /* бланк */
  if(single&&printCurrent){const bs=sec('Бланк');const g=el('div',{class:'seg pmseg'});BLANK_ORDER.forEach(k=>{const x=el('button',{type:'button','aria-pressed':String(curBlank()===k),title:BLANKS[k].why},`${k} · ${BLANKS[k].sn}`);x.onclick=()=>{tick();S.blank=k;renderSide();openPrint([currentItem()]);};g.append(x);});bs.append(g);}
  const chk=(parent,k,t)=>{const l=el('label',{class:'chk'});const i=el('input',{type:'checkbox','data-bl':k});i.checked=!!b[k];i.onchange=()=>setBL(k,i.checked);l.append(i,document.createTextNode(' '+t));parent.append(l);};
  const grp=(t)=>{const d=el('details',{class:'pmgrp'});if(PM_OPEN.has(t))d.open=true;d.addEventListener('toggle',()=>{d.open?PM_OPEN.add(t):PM_OPEN.delete(t);});d.append(el('summary',null,t));const w=el('div',{class:'pmg'});d.append(w);box.append(d);return w;};
  const hs=grp('Шапка');[['moz','Рядок «МОЗ України» (бланки A, D)'],['sub','Підпорядкування'],['cab','Кабінет'],['addr','Адреса'],['tel','Телефон'],['edrpou','Код ЄДРПОУ'],['logo','Логотип']].forEach(([k,t])=>chk(hs,k,t));
  const lr=el('div',{class:'trow'});const lf=el('input',{type:'file',accept:'image/*',hidden:'',id:'pmLogoFile'});const lb=el('button',{type:'button',class:'btn sm'},SET.logo?'Замінити логотип…':'Завантажити логотип…');lb.onclick=()=>lf.click();
  lf.onchange=()=>{const f=lf.files[0];if(f)loadLogo(f);};lr.append(lb,lf);if(SET.logo){const im=el('img',{src:SET.logo,alt:'Логотип',class:'pmlogo'});const rm=el('button',{type:'button',class:'btn sm'},'Прибрати');rm.onclick=()=>{delete SET.logo;saveSet();openPrint(lastPrint);};lr.prepend(im);lr.append(rm);}
  hs.append(lr,el('p',{class:'note'},'Реквізити закладу — у «Налаштуваннях» → «Бланк і реквізити».'));
  const ps=grp('Дані пацієнта на бланку');[['age','Вік'],['sex','Стать'],['dept','Відділення'],['ref','№ е-направлення'],['refDoc','Лікар, що направив'],['proj','Проєкції'],['count','Кількість знімків'],['eed','ЕЕД']].forEach(([k,t])=>chk(ps,k,t));
  ps.append(el('p',{class:'note'},'У бланку C пацієнт і проєкції — як у тексті протоколу; тут діють ЕЕД і кількість знімків.'));
  const ss=grp('Підпис і штамп');const st=el('div',{class:'trow'});st.append(el('span',{class:'note'},'Рамка під штамп (бланк C):'));const sg=el('div',{class:'seg pmseg'});
  [['left','ліворуч'],['right','праворуч'],['none','немає']].forEach(([k,t])=>{const x=el('button',{type:'button','aria-pressed':String(b.stamp===k)},t);x.onclick=()=>setBL('stamp',k);sg.append(x);});st.append(sg);ss.append(st);
  chk(ss,'mp','«М. П.» (бланки A, D)');chk(ss,'head2','Другий підпис (завідувач)');
  if(b.head2){const f=el('div',{class:'fields'});const mk=(k,t,ph)=>{const l=el('label',{class:'f'},t);const i=el('input',{type:'text',placeholder:ph});i.value=b[k]||'';i.onchange=()=>setBL(k,i.value.trim());l.append(i);f.append(l);};mk('head2Title','Посада','Завідувач відділення');mk('head2Name','ПІБ','Прізвище І. Б.');ss.append(f);}
  const pp=grp('Папір і принтер');
  const bindRow=el('div',{class:'trow'});const bc=el('label',{class:'chk'});const bi=el('input',{type:'checkbox','data-bl':'bindOn'});bi.checked=+b.bind>0;bi.onchange=()=>setBL('bind',bi.checked?25:0);bc.append(bi,document.createTextNode(' Поле під підшивку зліва'));bindRow.append(bc);
  if(+b.bind>0){const n=el('input',{type:'number',min:'10',max:'40',step:'1',class:'pmnum','aria-label':'Ширина поля, мм'});n.value=b.bind;n.onchange=()=>setBL('bind',Math.max(10,Math.min(40,+n.value||25)));bindRow.append(n,el('span',{class:'note'},'мм'));}
  pp.append(bindRow);
  const off=el('div',{class:'trow'});off.append(el('span',{class:'note'},'Зсув принтера, мм:'));[['offX','↔'],['offY','↕']].forEach(([k,t])=>{const n=el('input',{type:'number',min:'-10',max:'10',step:'0.5',class:'pmnum','aria-label':t==='↔'?'Зсув по горизонталі, мм':'Зсув по вертикалі, мм'});n.value=b[k]||0;n.onchange=()=>setBL(k,Math.max(-10,Math.min(10,+n.value||0)));off.append(document.createTextNode(t),n);});
  const rl=el('button',{type:'button',class:'btn sm'},'Пробний аркуш з лінійкою');rl.onclick=rulerSheet;off.append(rl);pp.append(off);
  chk(pp,'mono','Без кольору (чорно-білий принтер)');
  const rs=el('button',{type:'button',class:'btn sm'},'Повернути бланк як було');rs.onclick=()=>{if(rs.dataset.c){delete SET.bl;saveSet();applyBind();openPrint(lastPrint.map(x=>x.current?currentItem():x));toast('Налаштування бланка повернуто');}else{rs.dataset.c='1';rs.textContent='Точно повернути?';setTimeout(()=>{rs.dataset.c='';rs.textContent='Повернути бланк як було';},3000);}};
  box.append(rs);
  $('pmFiles').hidden=!(single&&printCurrent);box.parentElement.scrollTop=sc;
}
/* логотип: зменшуємо до 400 px, щоб не роздувати налаштування */
function loadLogo(f){const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,400/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
  SET.logo=c.toDataURL('image/png');saveSet();toast('Логотип збережено');openPrint(lastPrint.map(x=>x.current?currentItem():x));};im.onerror=()=>toast('Це не картинка');im.src=rd.result;};rd.readAsDataURL(f);}
/* пробний аркуш з лінійкою: видно зсув і обрізання країв */
function rulerSheet(){const tick=(n,horiz)=>Array.from({length:n},(_,i)=>`<span style="position:absolute;${horiz?`left:${i*10}mm;top:0;height:${i%5?3:6}mm;border-left`:`top:${i*10}mm;left:0;width:${i%5?3:6}mm;border-top`}:.3mm solid #111"></span>`).join('');
  const page=`<div class="ppage" style="position:relative">${tick(22,true)}${tick(30,false)}<div style="position:absolute;left:10mm;top:10mm;right:10mm;bottom:10mm;border:.4mm solid #111"></div><div style="position:absolute;left:20mm;top:30mm;font:12pt Arial;line-height:1.5;width:170mm">Пробний аркуш Skiagrama.<br>Рамка має бути рівно 10 мм від кожного краю. Позначки по краях — кожні 10 мм.<br>Якщо рамка зсунута — виміряйте, на скільки, і впишіть зсув у «Папір і принтер» з протилежним знаком.</div></div>`;
  $('pmTitle').textContent='Пробний аркуш з лінійкою';$('pmSummary').textContent='Перевірка полів і зсуву принтера.';$('pmSteps').textContent='';const btns=$('pmBtns');btns.textContent='';const a=el('button',{type:'button',class:'btn primary'},'Друкувати пробний аркуш');a.onclick=()=>runPrint(page);btns.append(a);
  showPmPages([['Пробний аркуш',page]]);}
/* відкрити перегляд: «Друк», «Перегляд перед друком», Налаштування */
$('paperBtn').onclick=()=>openPrint([currentItem()]);
$('pmPdf').onclick=()=>{closePrint();savePdf();};$('pmWord').onclick=()=>{closePrint();saveDocx();};$('pmOdt').onclick=()=>{closePrint();saveOdt();};
if($('sBlankSetup'))$('sBlankSetup').onclick=()=>{showView('desc');openPrint([currentItem()]);};
