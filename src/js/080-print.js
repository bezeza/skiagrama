/* ===== Друк: розкладка по пів аркуша A4, зворот вручну ===== */
const mm=v=>v*96/25.4;
const CAP_HALF=mm(148.5-20);
function unitsHTML(units){return groupsOf(units).map(g=>`<p${g.c?` class="${g.c}"`:''}>${esc(g.t.join(' '))}</p>`).join('');}
const STAMP='<div class="pstamp"></div>';
function measure(html){const m=$('measure');m.innerHTML=html;return m.offsetHeight;}
function contUnits(it,rest){return [{t:`${it.name||'Пацієнт'} — продовження`,p:-1,c:'cont'},...rest];}
function classify(it){
  const h=measure(STAMP+unitsHTML(it.units));
  if(h<=CAP_HALF)return {...it,kind:'half'};
  if(SET.printMode==='flip'){
    let k=0;for(let i=1;i<=it.units.length;i++){if(measure(STAMP+unitsHTML(it.units.slice(0,i)))<=CAP_HALF)k=i;else break;}
    if(k>0&&k<it.units.length){const back=contUnits(it,it.units.slice(k));if(measure(unitsHTML(back))<=CAP_HALF)return {...it,kind:'flip',front:it.units.slice(0,k),back};}
  }
  return {...it,kind:'full'};
}
function pack(items){
  const cl=items.map(classify);const flips=cl.filter(x=>x.kind==='flip'),halves=cl.filter(x=>x.kind==='half'),fulls=cl.filter(x=>x.kind==='full');
  const sheets=[];let slot=0;
  const place=it=>{const si=Math.floor(slot/2),pos=slot%2;if(!sheets[si])sheets[si]={slots:[null,null],backs:[null,null]};sheets[si].slots[pos]=it;
    if(it.kind==='flip'){const bp=SET.flipEdge==='short'?1-pos:pos;sheets[si].backs[bp]=it;}slot++;};
  flips.forEach(place);halves.forEach(place);fulls.forEach(it=>sheets.push({full:it}));
  return {sheets,cl};
}
function slotHTML(it,side){if(!it)return '';if(side==='back')return unitsHTML(it.back);return STAMP+unitsHTML(it.kind==='flip'?it.front:it.units);}
function pageHTML(sh,side){
  if(sh.full)return `<div class="ppage full"><div class="pdoc">${STAMP}${unitsHTML(sh.full.units)}</div></div>`;
  const a=side==='back'?sh.backs:sh.slots;
  return `<div class="ppage"><div class="pslot"><div class="pdoc">${slotHTML(a[0],side)}</div></div><div class="pslot cut"><div class="pdoc">${slotHTML(a[1],side)}</div></div></div>`;
}
let PLAN=null,printIds=[];
function openPrint(items){
  printIds=items.map(i=>i.id).filter(Boolean);
  PLAN=pack(items);const sh=PLAN.sheets;const backSheets=sh.filter(s=>s.backs&&s.backs.some(Boolean));
  const nHalf=PLAN.cl.filter(x=>x.kind==='half').length,nFlip=PLAN.cl.filter(x=>x.kind==='flip').length,nFull=PLAN.cl.filter(x=>x.kind==='full').length;
  $('pmTitle').textContent=items.length>1?`Друк пачкою: ${items.length} протоколів`:'Друк протоколу';
  $('pmSummary').textContent=`Аркушів A4: ${sh.length}. Пів аркуша: ${nHalf}${nFlip?`, з продовженням на звороті: ${nFlip}`:''}${nFull?`, на цілий аркуш: ${nFull}`:''}.`;
  const steps=$('pmSteps');steps.textContent='';const btns=$('pmBtns');btns.textContent='';
  const b1=el('button',{type:'button',class:'btn primary'},backSheets.length?`1. Лицьові сторони (${sh.length} арк.)`:`Друкувати (${sh.length} арк.)`);b1.onclick=()=>doPrint('front');btns.append(b1);
  if(backSheets.length){
    const b2=el('button',{type:'button',class:'btn primary'},`2. Звороти (${backSheets.length} арк.)`);b2.onclick=()=>doPrint('back');btns.append(b2);
    [`Натисніть «Лицьові сторони» і надрукуйте всі ${sh.length} арк.`,
     `Візьміть перші ${backSheets.length} арк. (протоколи з продовженням друкуються першими), переверніть ${SET.flipEdge==='short'?'знизу догори':'як сторінку книги'} і покладіть у лоток чистою стороною для друку.`,
     'Натисніть «Звороти». Якщо продовження вийшло догори ногами або не на тому аркуші — змініть налаштування друку (є пробний аркуш).',
     'Розріжте аркуші по пунктирній лінії ✂.'].forEach(t=>steps.append(el('li',null,t)));
  }else steps.append(el('li',null,sh.some(s=>!s.full)?'Після друку розріжте аркуші по пунктирній лінії ✂.':'Кожен протокол друкується на окремому аркуші.'));
  const pv=$('pmPreview');pv.textContent='';
  sh.forEach((s,i)=>{const w=el('div',{class:'pv'});w.append(el('span',null,`Аркуш ${i+1} — лицьова`));const z=el('div',{class:'pz'});z.innerHTML=pageHTML(s,'front');w.append(z);pv.append(w);
    if(s.backs&&s.backs.some(Boolean)){const w2=el('div',{class:'pv'});w2.append(el('span',null,`Аркуш ${i+1} — зворот`));const z2=el('div',{class:'pz'});z2.innerHTML=pageHTML(s,'back');w2.append(z2);pv.append(w2);}});
  $('printModal').hidden=false;closeSheet();
}
function closePrint(){$('printModal').hidden=true;}
$('pmClose').onclick=closePrint;
$('printModal').addEventListener('click',e=>{if(e.target===$('printModal'))closePrint();});
function runPrint(html){const pa=$('printArea');pa.innerHTML=html;document.body.classList.add('printing-batch');try{window.print();}catch(e){}setTimeout(()=>document.body.classList.remove('printing-batch'),1000);}
window.addEventListener('afterprint',()=>document.body.classList.remove('printing-batch'));
function doPrint(side){
  const sh=PLAN.sheets;let pages;
  if(side==='back'){pages=sh.filter(s=>s.backs&&s.backs.some(Boolean)).map(s=>pageHTML(s,'back'));if(SET.revBacks)pages.reverse();}
  else pages=sh.map(s=>pageHTML(s,'front'));
  runPrint(pages.join(''));
  if(side==='front'&&printIds.length){A.forEach(r=>{if(printIds.includes(r.id))r.printed=true;});saveA();if(!$('view-archive').hidden)renderArchive();}
}
$('printBtn').onclick=()=>{const name=$('pName').value.trim();openPrint([{id:editingId,name:name||'Пацієнт',units:currentUnits()}]);};
function testSheet(){
  const half=(t,s)=>`<div class="ptest"><div>${t}</div><div style="font-size:13pt;font-weight:normal">${s}</div></div>`;
  const front=`<div class="ppage"><div class="pslot">${half('ЛИЦЬОВА · половина А ↑','Верх аркуша. Переверніть аркуш так, як робите завжди, і надрукуйте зворот.')}</div><div class="pslot cut">${half('ЛИЦЬОВА · половина Б ↑','Низ аркуша.')}</div></div>`;
  const bA=half('ЗВОРОТ половини А ↑','Цей текст має бути на звороті половини А і читатися не догори ногами.'),bB=half('ЗВОРОТ половини Б ↑','');
  const top=SET.flipEdge==='short'?bB:bA,bot=SET.flipEdge==='short'?bA:bB;
  const back=`<div class="ppage"><div class="pslot">${top}</div><div class="pslot cut">${bot}</div></div>`;
  $('pmTitle').textContent='Пробний аркуш';$('pmSummary').textContent='Перевірка того, як ви перевертаєте аркуш.';
  const steps=$('pmSteps');steps.textContent='';['Надрукуйте лицьову сторону.','Переверніть аркуш так, як робитимете завжди, і покладіть у лоток.','Надрукуйте зворот. Напис «ЗВОРОТ половини А» має опинитися за «ЛИЦЬОВА · половина А» і читатися нормально. Якщо ні — змініть «Як перевертаєте аркуш».'].forEach(t=>steps.append(el('li',null,t)));
  const btns=$('pmBtns');btns.textContent='';const a=el('button',{type:'button',class:'btn primary'},'1. Лицьова');a.onclick=()=>runPrint(front);const b=el('button',{type:'button',class:'btn primary'},'2. Зворот');b.onclick=()=>runPrint(back);btns.append(a,b);
  const pv=$('pmPreview');pv.textContent='';[['Лицьова',front],['Зворот',back]].forEach(([t,h])=>{const w=el('div',{class:'pv'});w.append(el('span',null,t));const z=el('div',{class:'pz'});z.innerHTML=h;w.append(z);pv.append(w);});
  $('printModal').hidden=false;
}
$('sTest').onclick=testSheet;
