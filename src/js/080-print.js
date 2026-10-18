/* ===== Друк: бланки A–D, автопідгонка в пів аркуша A4, цілий аркуш або зворот ===== */
const mm=v=>v*96/25.4;
const CAP_HALF=mm(148.5-20);

/* одиниці друку: {t: текст | h: готовий HTML, p: абзац, c: клас, blk: окремий блок} */
function unitsHTML(units){
  const out=[];let cur=null;
  units.forEach(u=>{const piece=u.h!=null?u.h:esc(u.t);
    if(cur&&!u.blk&&!cur.blk&&u.p!=null&&cur.p===u.p)cur.parts.push(piece);
    else{cur={p:u.p,c:u.c,al:u.al,blk:u.blk,parts:[piece]};out.push(cur);}});
  return out.map(g=>g.blk?g.parts.join(''):`<p${g.c?` class="${g.c}"`:''}${g.al?` style="text-align:${g.al}"`:''}>${g.parts.join(' ')}</p>`).join('');
}
const STAMP='<div class="pstamp"></div>';
function measure(html,cls){const m=$('measure');m.className='pdoc '+(cls||'');m.innerHTML=html;return m.offsetHeight;}

/* реквізити закладу (DEF_ORG — у 040-core.js) */
const ORG=()=>Object.assign({},DEF_ORG,SET.org||{});
/* налаштування бланка (перегляд перед друком): що показувати, підпис, папір */
const BL_DEF={copies:'one',moz:true,sub:true,cab:true,addr:true,tel:true,edrpou:true,logo:true,age:true,sex:true,dept:true,ref:true,refDoc:true,proj:true,count:false,eed:true,
  stamp:'left',stampStyle:'corners',mp:true,head2:false,head2Name:'',head2Title:'Завідувач відділення',bind:0,offX:0,offY:0,mono:false};
const BL=()=>Object.assign({},BL_DEF,SET.bl||{});
const ORGB=()=>{const o=ORG(),b=BL();['sub','cab','addr','tel','edrpou'].forEach(k=>{if(!b[k])o[k]='';});return o;};
const docB=doc=>{const b=BL();const d=Object.assign({},doc);['age','sex','dept','ref','refDoc','proj','eed'].forEach(k=>{if(!b[k])d[k]='';});if(!b.count)d.count='';d.showEed=b.eed;return d;};
const LOGO=()=>BL().logo&&SET.logo?`<img class="bk-logo" src="${SET.logo}" alt="">`:'';
const HEAD2=()=>{const b=BL();return b.head2?`<div class="bk-sign2">${esc(b.head2Title||'Завідувач відділення')} ______________ ${esc(b.head2Name||'[ПІБ]')}</div>`:'';};
const cntW=n=>n?`${n} ${+n===1?'знімок':+n<5?'знімки':'знімків'}`:'';
const dLong=v=>{if(!v)return '__.__.____';const [y,m,d]=v.split('-');return `${d}.${m}.${y}`;};
const sexW=s=>s==='ч'?'чол.':s==='ж'?'жін.':'';
function manualBody(doc,keepHead){
  if(doc.manualHtml){let bl=htmlBlocks(doc.manualHtml);
    if(!keepHead){if(bl[0]&&bl[0].text===String(doc.head).trim())bl.shift();if(bl[0]&&/^На\s/.test(bl[0].text))bl.shift();}
    return bl.map((b,i)=>({h:b.html,p:'mh'+i,c:keepHead&&i===0?'pt':/^Rö-ч:/.test(b.text)?'concl':/^ЕЕД/.test(b.text)?'foot':'',al:['center','right','justify'].includes(b.al)?b.al:''}));}
  let lines=String(doc.manual||'').split('\n');
  if(!keepHead){if(lines[0]&&lines[0].trim()===String(doc.head).trim())lines.shift();if(lines[0]&&/^На\s/.test(lines[0].trim()))lines.shift();}
  return unitsFromText(lines.join('\n')).map(u=>Object.assign(u,{p:'m'+u.p,c:keepHead?u.c:(u.c==='pt'?'':u.c)}));
}
const LOGO_SVG='<svg width="34" height="34" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="20" fill="#1F4E79"/><g fill="none" stroke="#fff" stroke-linecap="round" stroke-width="7"><path d="M42 84 L36.6 22.5"/><path d="M50 84 L50 16.5"/><path d="M58 84 L64 23.5"/><path d="M65 85 L75 34"/><path d="M36 86 L17 48"/></g><g stroke="#1F4E79" stroke-width="2.4"><path d="M36 60 L44 60"/><path d="M46 58 L54 58"/><path d="M57 60 L65 60"/><path d="M66 64 L73 64"/><path d="M35 42 L42 42"/><path d="M46 38 L54 38"/><path d="M59 42 L67 42"/><path d="M69 50 L76 50"/><path d="M33 30 L41 30"/><path d="M46 25 L54 25"/><path d="M60 31 L67 31"/><path d="M23 70 L31 70"/><path d="M16 56 L24 56"/></g><ellipse cx="60.8" cy="54" rx="7" ry="2.8" transform="rotate(-8 60.8 54)" fill="none" stroke="#F2A65A" stroke-width="5"/></svg>';
const DT=doc=>esc(doc.docTitle||DOC_TITLE());
const SIGN=(doc,cmp)=>`<div class="bk-sign"><span>${DT(doc)} ______________ ${esc(doc.doctor||'[ПІБ]')}</span>${BL().mp?'<span class="bk-mp">М. П.</span>':''}</div>${HEAD2()}`;
const BLANKS={
 C:{n:'компактний під штамп',sn:'під штамп',why:'звичний формат рентгенолога, рамка під штамп, найбільше місця під текст',
   build(doc,cmp){const o=ORGB(),b=BL();doc=docB(doc);
     const sub=[o.sub,o.cab,o.tel?'тел. '+o.tel:''].filter(Boolean).join(' · ');
     const stamp=b.stamp==='none'?'':b.stampStyle==='corners'?'<div class="bkC-stamp corn" aria-hidden="true"></div>':'<div class="bkC-stamp">місце для штампу рентгенкабінету<br>(№ і дата)</div>';
     const h=`<div class="bkC-h${b.stamp==='right'?' rev':''}${b.stamp==='none'?' nost':''}">${stamp}<div class="bkC-orgw">${LOGO()}<div class="bkC-org"><b>${esc(o.name||'[Назва закладу]')}</b>${sub?`<span>${esc(sub)}</span>`:''}<span class="bkC-tag">${doc.study==='fg'?'ФЛЮОРОГРАФІЯ':'РЕНТГЕНОГРАФІЯ'}</span></div></div></div>`;
     const u=[{h,blk:true}];
     if(doc.manual!=null)return u.concat(manualBody(doc,true));
     u.push({t:doc.head,p:'h',c:'pt'},{t:doc.refLine,p:'r'});doc.body.forEach(t=>u.push({t,p:'b'}));
     u.push({t:'Rö-ч: '+doc.concl,p:'c',c:'concl'});if(doc.rec)u.push({t:'Рекомендовано: '+doc.rec,p:'rc'});
     u.push({h:`<div class="bk-foot"><span>${doc.showEed?`ЕЕД ${esc(doc.eed||'___')} мЗв.`:''}${doc.count?(doc.showEed?' · ':'')+cntW(doc.count):''}</span><span>${DT(doc)} ______________ ${esc(doc.doctor||'[ПІБ]')}</span></div>${HEAD2()}`,blk:true});return u;}},
 B:{n:'сучасний діловий',sn:'сучасний',why:'сучасний вигляд, дані пацієнта сіткою, розділи легко читати',
   build(doc,cmp){const o=ORGB(),b=BL();doc=docB(doc);
     const h=`<div class="bkB-h"><div class="bkB-org">${LOGO()}<div><b>${esc(o.name||'[Назва закладу]')}</b><span>${esc([o.cab,o.addr,o.tel?'тел. '+o.tel:''].filter(Boolean).join(' · '))}</span></div></div><div class="bkB-r"><small>ПРОТОКОЛ ДОСЛІДЖЕННЯ</small><b>${esc(doc.what)}</b><span>№ ${esc(doc.num||'___')} · ${dLong(doc.date)}</span></div></div><div class="bkB-bar"></div>`;
     const pt=`<div class="bkB-pt"><div class="w"><small>ПАЦІЄНТ</small><b>${esc(doc.name)}</b></div><div><small>ВІК, СТАТЬ</small><span>${esc([doc.age?ageStr(doc.age):'',sexW(doc.sex)].filter(Boolean).join(', ')||'—')}</span></div>${doc.showEed?`<div><small>ЕЕД</small><span>${esc(doc.eed?doc.eed+' мЗв':'___')}</span></div>`:''}${doc.count?`<div><small>ЗНІМКІВ</small><span>${esc(doc.count)}</span></div>`:''}${doc.dept?`<div class="w"><small>ВІДДІЛЕННЯ</small><span>${esc(doc.dept)}</span></div>`:''}${doc.proj?`<div class="w"><small>ПРОЄКЦІЇ</small><span>${esc(doc.proj)}</span></div>`:''}</div>`;
     const sec=(l,inner)=>`<div class="bkB-sec"><span>${l}</span><div>${inner}</div></div>`;
     const u=[{h,blk:true},{h:pt,blk:true}];
     if(doc.manual!=null)u.push({h:sec('ОПИС',unitsHTML(manualBody(doc))),blk:true});
     else{u.push({h:sec('ОПИС',`<p>${esc(doc.body.join(' '))}</p>`),blk:true},{h:sec('ВИСНОВОК',`<p><b>${esc(doc.concl)}</b></p>`),blk:true});if(doc.rec)u.push({h:sec('РЕКОМЕНДАЦІЇ',`<p>${esc(doc.rec)}</p>`),blk:true});}
     u.push({h:`<div class="bkB-foot"><span>${DT(doc)} ______________ ${esc(doc.doctor||'[ПІБ]')}</span><span class="d">Висновок не є діагнозом; оцінюється лікарем, що направив.</span></div>${HEAD2()}`,blk:true});return u;}},
 A:{n:'класичний офіційний',sn:'офіційний',why:'повні реквізити закладу — для пацієнта на руки або в іншу установу',
   build(doc,cmp){const o=ORGB(),b=BL();doc=docB(doc);
     const top=cmp?`<div class="bk-mini"><b>${esc(o.name||'[Назва закладу]')}</b> · ${esc(o.cab)}</div>`:
       `<div class="bkA-h">${LOGO()}${b.moz?'<div class="s">Міністерство охорони здоров’я України</div>':''}<div class="n">${esc([o.name||'[Назва закладу]',o.sub].filter(Boolean).join(' '))}</div><div class="s">${esc([o.cab,o.addr,o.tel?'тел. '+o.tel:'',o.edrpou?'код ЄДРПОУ '+o.edrpou:''].filter(Boolean).join(' · '))}</div></div><div class="bkA-rule"></div>`;
     const t=`<div class="bkA-t"><b>ПРОТОКОЛ РЕНТГЕНОЛОГІЧНОГО ДОСЛІДЖЕННЯ</b><span>№ ${esc(doc.num||'___')} від ${dLong(doc.date)}</span></div>`;
     const rows=[['Пацієнт:',`<b>${esc(doc.name)}</b>${doc.age?', '+esc(ageStr(doc.age)):''}${doc.sex?', '+sexW(doc.sex):''}`]];
     if(doc.dept||doc.ref)rows.push(['Направлення:',esc([doc.dept,doc.refDoc?'лікар '+doc.refDoc:'',doc.ref?'е-напр. '+doc.ref:''].filter(Boolean).join(' · '))]);
     rows.push(['Дослідження:',esc(doc.what+(doc.proj?` (${doc.proj})`:'')+(doc.count?` · ${cntW(doc.count)}`:'')+(doc.eed?` · ЕЕД ${doc.eed} мЗв`:''))]);
     const u=[{h:top+t,blk:true},{h:`<div class="bk-grid">${rows.map(r=>`<span class="l">${r[0]}</span><span>${r[1]}</span>`).join('')}</div>`,blk:true}];
     if(doc.manual!=null)u.push(...manualBody(doc));
     else{doc.body.forEach((x,i)=>u.push(i?{t:x,p:'b'}:{h:'<b>Опис.</b> '+esc(x),p:'b'}));u.push({h:`<b>Висновок: ${esc(doc.concl)}</b>`,p:'c'});if(doc.rec)u.push({h:`<b>Рекомендовано:</b> ${esc(doc.rec)}`,p:'rc'});}
     u.push({h:SIGN(doc,cmp),blk:true});return u;}},
 D:{n:'форма з полями',sn:'форма з полями',why:'облікова форма з реквізитами й пронумерованими полями',
   build(doc,cmp){const o=ORGB(),b=BL();doc=docB(doc);
     const req=`<div class="bkD-req"><div>${b.moz?'<span>Найменування міністерства: <u>МОЗ України</u></span>':''}<span>Заклад: <b><u>${esc(o.name||'[Назва закладу]')}</u></b></span>${cmp?'':`<span>Місцезнаходження: <u>${esc(o.addr||'[адреса]')}</u></span>`}<span>Код за ЄДРПОУ: <u>${esc(o.edrpou||'[________]')}</u></span></div><div><b>МЕДИЧНА ДОКУМЕНТАЦІЯ</b>${cmp?'':'<span>Форма первинної облікової документації</span>'}<span>№ ${esc(o.form||'[___]')}${o.order?' · '+esc(o.order):''}</span></div></div>`;
     const t=`<div class="bkD-t">ПРОТОКОЛ РЕНТГЕНОЛОГІЧНОГО ДОСЛІДЖЕННЯ № <u>${esc(doc.num||'___')}</u></div>`;
     const f=`<div class="bkD-f"><span>1. ПІБ</span><span class="u"><b>${esc(doc.name)}</b></span><span>Вік</span><span class="u">${esc([doc.age?ageStr(doc.age):'',sexW(doc.sex)].filter(Boolean).join(', '))}</span><span>2. Відділення</span><span class="u">${esc(doc.dept||'—')}</span><span>Дата</span><span class="u">${dLong(doc.date)}</span><span>3. Дослідження</span><span class="u">${esc(doc.what+(doc.proj?` (${doc.proj})`:''))}</span><span>ЕЕД</span><span class="u">${doc.showEed?esc(doc.eed?doc.eed+' мЗв':''):'—'}</span></div>`;
     const u=[{h:req+t+f,blk:true},{t:'4. Опис:',p:'bl'}];
     if(doc.manual!=null)u.push(...manualBody(doc));
     else{doc.body.forEach(x=>u.push({t:x,p:'b'}));u.push({h:`5. Висновок: <b>${esc(doc.concl)}</b>`,p:'c'});if(doc.rec)u.push({t:'6. Рекомендації: '+doc.rec,p:'rc'});}
     u.push({h:SIGN(doc,cmp),blk:true});return u;}}
};
const BLANK_ORDER=['C','B','A','D'];
const curBlank=()=>S.blank||SET.blank||'C';
function buildUnits(it,cmp){if(!it.doc)return [{h:STAMP,blk:true}].concat(it.units||[]);const u=(BLANKS[it.blank]||BLANKS.C).build(it.doc,cmp);
  if(it.doc.urgent)u.splice(1,0,{h:'<div class="urg">ТЕРМІНОВО · критична знахідка · лікаря повідомлено: ____________ о ____</div>',blk:true});return u;}
const clsOf=(it,cmp)=>(cmp?'cmp ':'')+'b'+(it.doc?(BLANKS[it.blank]?it.blank:'C'):'L');
const fitsHalf=(units,cls)=>measure(unitsHTML(units),cls)<=CAP_HALF;
function contUnits(it,rest){return [{t:`${it.name||'Пацієнт'} — продовження`,p:'cont',c:'cont'},...rest];}
function classify(it){
  const u0=buildUnits(it,false),c0=clsOf(it,false);
  if(BL().copies==='full')return {...it,kind:'full',units:u0,cls:c0};
  if(fitsHalf(u0,c0))return {...it,kind:'half',units:u0,cls:c0};
  const u1=buildUnits(it,true),c1=clsOf(it,true);
  if(fitsHalf(u1,c1))return {...it,kind:'half',units:u1,cls:c1,cmp:true};
  if(SET.printMode==='flip'){
    let lo=1,hi=u1.length-1,k=0;
    while(lo<=hi){const m=(lo+hi)>>1;if(fitsHalf(u1.slice(0,m),c1)){k=m;lo=m+1;}else hi=m-1;}
    if(k>0){const back=contUnits(it,u1.slice(k));if(fitsHalf(back,c1))return {...it,kind:'flip',front:u1.slice(0,k),back,units:u1,cls:c1,cmp:true};}
  }
  return {...it,kind:'full',units:u0,cls:c0};
}
function blankAdvice(it){
  if(!it.doc)return null;const cur=it.blank;const c=classify(it);const o=ORG();
  if(c.kind==='half'&&!c.cmp)return (cur==='A'||cur==='D')&&!o.name?{b:null,text:`У бланку ${cur} реквізити закладу на видноті — заповніть їх у «Налаштуваннях» → «Бланк і реквізити».`}:null;
  const others=BLANK_ORDER.filter(b=>b!==cur).map(b=>({b,c:classify({...it,blank:b})}));
  if(c.kind==='half'){const x=others.find(x=>x.c.kind==='half'&&!x.c.cmp);
    return x?{b:x.b,text:`У бланку ${cur} протокол ущільнено до 11 pt. У бланку ${x.b} (${BLANKS[x.b].n}) він вміститься звичайним шрифтом. Рекомендую ${x.b}.`}:null;}
  const x=others.find(x=>x.c.kind==='half');
  if(x)return {b:x.b,text:`Протокол довгий: у бланку ${x.b} (${BLANKS[x.b].n}) вміститься в пів аркуша${x.c.cmp?' (ущільнено)':''}, а в ${cur} — ${c.kind==='flip'?'піде на зворот половинки':'займе цілий аркуш'}. Рекомендую ${x.b}.`};
  return {b:null,text:'Протокол довгий — у жодному бланку не вміститься в пів аркуша, тож надрукується на цілому аркуші A4 з одного боку.'};
}
function wrapDoc(it,units){return `<div class="pdoc ${it.cls}${BL().mono?' mono':''}">${unitsHTML(units)}</div>`;}
function slotHTML(it,side){if(!it)return '';const lab=it.copy?`<span class="pcopy">${it.copy}</span>`:'';if(side==='back')return lab+wrapDoc(it,it.back);return lab+wrapDoc(it,it.kind==='flip'?it.front:it.units);}
function pageHTML(sh,side){
  if(sh.full)return `<div class="ppage full">${wrapDoc(sh.full,sh.full.units)}</div>`;
  const a=side==='back'?sh.backs:sh.slots;
  return `<div class="ppage"><div class="pslot">${slotHTML(a[0],side)}</div><div class="pslot cut">${slotHTML(a[1],side)}</div></div>`;
}
function itemPreview(it){
  const half=h=>`<div class="pslot" style="width:210mm">${h}</div>`;
  if(it.kind==='half')return [{label:'Половина аркуша A4'+(it.cmp?' (ущільнено)':''),html:half(wrapDoc(it,it.units))}];
  if(it.kind==='flip')return [{label:'Лицьова сторона половинки',html:half(wrapDoc(it,it.front))},{label:'Зворот тієї ж половинки',html:half(wrapDoc(it,it.back))}];
  return [{label:'Цілий аркуш A4',html:`<div class="ppage full" style="min-height:0">${wrapDoc(it,it.units)}</div>`}];
}
function pack(items){
  const cl=items.map(classify);const flips=cl.filter(x=>x.kind==='flip'),halves=cl.filter(x=>x.kind==='half'),fulls=cl.filter(x=>x.kind==='full');
  const sheets=[];let slot=0;
  const place=it=>{const si=Math.floor(slot/2),pos=slot%2;if(!sheets[si])sheets[si]={slots:[null,null],backs:[null,null]};sheets[si].slots[pos]=it;
    if(it.kind==='flip'){const bp=SET.flipEdge==='short'?1-pos:pos;sheets[si].backs[bp]=it;}slot++;};
  if(BL().copies==='two'){const twice=it=>{if(slot%2)slot++;place({...it,copy:'В ІСТОРІЮ ХВОРОБИ'});place({...it,copy:'ПАЦІЄНТУ'});};flips.forEach(twice);halves.forEach(twice);}
  else{flips.forEach(place);halves.forEach(place);}
  fulls.forEach(it=>sheets.push({full:it}));
  return {sheets,cl};
}
/* позначка «надруковано»: підпис тексту на момент друку — щоб помітити правку після друку */
const sigOf=t=>{const s=String(t||'').replace(/\s+/g,' ').trim();let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36);};
const printState=r=>!r.printed?'no':(r.printedSig&&r.text!=null&&r.printedSig!==sigOf(r.text)?'changed':'yes');
const PRINT_LABEL={no:'ні',yes:'так',changed:'змінено після друку'};
function renderPrintMark(){const m=$('printMark');if(!m)return;if(!S.printedSig){m.hidden=true;return;}
  const same=sigOf(protocolText())===S.printedSig;m.hidden=false;m.className='pmark '+(same?'ok':'warn');
  m.textContent=same?'✓ надруковано':'змінено після друку';m.title=same?'Цей протокол уже надруковано':'Текст змінено після друку — передрукуйте, щоб папір збігався з архівом';}
let PLAN=null,printIds=[],printCurrent=false;
let lastPrint=[];
function openPrint(items){
  lastPrint=items;applyBind();
  printIds=items.map(i=>i.id).filter(Boolean);printCurrent=items.some(i=>i.current);
  PLAN=pack(items);const sh=PLAN.sheets;const backSheets=sh.filter(s=>s.backs&&s.backs.some(Boolean));
  const nHalf=PLAN.cl.filter(x=>x.kind==='half').length,nFlip=PLAN.cl.filter(x=>x.kind==='flip').length,nFull=PLAN.cl.filter(x=>x.kind==='full').length,nCmp=PLAN.cl.filter(x=>x.cmp&&x.kind==='half').length;
  $('pmTitle').textContent=items.length>1?`Друк пачкою: ${items.length} протоколів`:'Друк протоколу';
  $('pmSummary').textContent=`Аркушів A4: ${sh.length}. Пів аркуша: ${nHalf}${nCmp?` (з них ущільнено: ${nCmp})`:''}${nFlip?`, з продовженням на звороті: ${nFlip}`:''}${nFull?`, на цілий аркуш: ${nFull}`:''}.`;
  const steps=$('pmSteps');steps.textContent='';const btns=$('pmBtns');btns.textContent='';
  const b1=el('button',{type:'button',class:'btn primary'},backSheets.length?`1. Лицьові сторони (${sh.length} арк.)`:`Друкувати (${sh.length} арк.)`);b1.onclick=()=>doPrint('front');btns.append(b1);
  if(backSheets.length){
    const b2=el('button',{type:'button',class:'btn primary'},`2. Звороти (${backSheets.length} арк.)`);b2.onclick=()=>doPrint('back');btns.append(b2);
    [`Натисніть «Лицьові сторони» і надрукуйте всі ${sh.length} арк.`,
     `Візьміть перші ${backSheets.length} арк. (протоколи з продовженням друкуються першими), переверніть ${SET.flipEdge==='short'?'знизу догори':'як сторінку книги'} і покладіть у лоток чистою стороною для друку.`,
     'Натисніть «Звороти». Якщо продовження вийшло догори ногами або не на тому аркуші — змініть налаштування друку (є пробний аркуш).',
     'Розріжте аркуші по пунктирній лінії ✂.'].forEach(t=>steps.append(el('li',null,t)));
  }else steps.append(el('li',null,sh.some(s=>!s.full)?'Після друку розріжте аркуші по пунктирній лінії ✂.':'Протокол друкується на цілому аркуші A4.'));
  if(items.length===1&&PLAN.cl[0]&&PLAN.cl[0].doc){const it=PLAN.cl[0];const B=BLANKS[it.blank]||BLANKS.C;
    const fit={half:it.cmp?'вміщається в пів аркуша A4 — ущільнено до 11 pt ✓':'вміщається в пів аркуша A4 ✓',flip:'не вміщається в пів аркуша — продовження піде на зворот',full:BL().copies==='full'?'цілий аркуш A4':'не вміщається в пів аркуша — надрукується на цілому аркуші A4'}[it.kind];
    $('pmSummary').textContent=`Бланк ${it.blank} · ${B.n}: ${fit}. `+$('pmSummary').textContent;}
  renderPmPages();renderPmPanel();
  if($('printModal').hidden){$('printModal').hidden=false;document.body.classList.add('pm-open');closeSheet();setTimeout(()=>pmZoomTo(pmZoomMode||'page'),0);}else pmApplyZoom();
}
function closePrint(){$('printModal').hidden=true;document.body.classList.remove('pm-open');}
$('pmClose').onclick=closePrint;
function runPrint(html){const pa=$('printArea');pa.innerHTML=html;document.body.classList.add('printing-batch');try{window.print();}catch(e){}setTimeout(()=>document.body.classList.remove('printing-batch'),1000);}
window.addEventListener('afterprint',()=>document.body.classList.remove('printing-batch'));
function doPrint(side){
  const sh=PLAN.sheets;let pages;
  if(side==='back'){pages=sh.filter(s=>s.backs&&s.backs.some(Boolean)).map(s=>pageHTML(s,'back'));if(SET.revBacks)pages.reverse();}
  else pages=sh.map(s=>pageHTML(s,'front'));
  runPrint(pages.join(''));
  if(side!=='front')return;
  const now=Date.now();
  if(printCurrent){S.printedSig=sigOf(protocolText());S.printedAt=now;saveDraftSoon();renderPrintMark();}
  if(printIds.length){A.forEach(r=>{if(!printIds.includes(r.id))return;r.printed=true;r.printedAt=now;r.printedSig=printCurrent&&r.id===editingId?S.printedSig:sigOf(r.text);});saveA();if(!$('view-archive').hidden)renderArchive();}
}
const currentItem=()=>({current:true,id:editingId,name:$('pName').value.trim()||'Пацієнт',doc:docData(),blank:curBlank()});
const recordItem=r=>r.doc?{id:r.id,name:r.name,doc:r.doc,blank:r.blank||SET.blank||'C'}:{id:r.id,name:r.name,units:r.units||unitsFromText(r.text||'')};
$('printBtn').onclick=()=>openPrint([currentItem()]);
/* PDF: «Зберегти як PDF» у вікні друку; назва файлу — з назви сторінки, половинка — A5 */
function savePdf(){
  const it=classify(currentItem());const two=BL().copies==='two'&&it.kind==='half';const half=it.kind==='half'&&!two;
  const pages=two?pack([currentItem()]).sheets.map(s=>pageHTML(s,'front')).join(''):half?`<div class="ppage a5"><div class="pslot">${wrapDoc(it,it.units)}</div></div>`:(it.kind==='flip'?`<div class="ppage full">${wrapDoc(it,it.units)}</div>`:pageHTML({full:it},'front'));
  const st=document.createElement('style');st.textContent=half?'@page{size:A5 landscape;margin:0}':'@page{size:A4;margin:0}';document.head.append(st);
  const t0=document.title;document.title=fileBase();toast('У вікні друку виберіть «Зберегти як PDF»');document.body.classList.add('pdf-out');
  const back=()=>{document.title=t0;st.remove();document.body.classList.remove('pdf-out');window.removeEventListener('afterprint',back);};window.addEventListener('afterprint',back);
  setTimeout(()=>{runPrint(pages);setTimeout(back,1500);},50);
}
$('pdfBtn').onclick=savePdf;
function testSheet(){
  const half=(t,s)=>`<div class="ptest"><div>${t}</div><div style="font-size:13pt;font-weight:normal">${s}</div></div>`;
  const front=`<div class="ppage"><div class="pslot">${half('ЛИЦЬОВА · половина А ↑','Верх аркуша. Переверніть аркуш так, як робите завжди, і надрукуйте зворот.')}</div><div class="pslot cut">${half('ЛИЦЬОВА · половина Б ↑','Низ аркуша.')}</div></div>`;
  const bA=half('ЗВОРОТ половини А ↑','Цей текст має бути на звороті половини А і читатися не догори ногами.'),bB=half('ЗВОРОТ половини Б ↑','');
  const top=SET.flipEdge==='short'?bB:bA,bot=SET.flipEdge==='short'?bA:bB;
  const back=`<div class="ppage"><div class="pslot">${top}</div><div class="pslot cut">${bot}</div></div>`;
  $('pmTitle').textContent='Пробний аркуш';$('pmSummary').textContent='Перевірка того, як ви перевертаєте аркуш (потрібно лише для друку продовження на звороті).';
  const steps=$('pmSteps');steps.textContent='';['Надрукуйте лицьову сторону.','Переверніть аркуш так, як робитимете завжди, і покладіть у лоток.','Надрукуйте зворот. Напис «ЗВОРОТ половини А» має опинитися за «ЛИЦЬОВА · половина А» і читатися нормально. Якщо ні — змініть «Як перевертаєте аркуш».'].forEach(t=>steps.append(el('li',null,t)));
  const btns=$('pmBtns');btns.textContent='';const a=el('button',{type:'button',class:'btn primary'},'1. Лицьова');a.onclick=()=>runPrint(front);const b=el('button',{type:'button',class:'btn primary'},'2. Зворот');b.onclick=()=>{runPrint(back);SET.testPrinted=today();saveSet();};btns.append(a,b);
  showPmPages([['Лицьова',front],['Зворот',back]]);
}
$('sTest').onclick=testSheet;
