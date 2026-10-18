/* ===== Збереження бланка у Word (.docx) і LibreOffice (.odt) =====
   Бланк описується однією моделлю (абзаци й таблиці), з неї пишуться обидва формати.
   Файли — справжні zip-архіви (без стиснення), без сторонніх бібліотек, працює офлайн. */

/* --- zip (метод «store») --- */
const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(u){let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRC_T[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function zipStore(files){
  const enc=new TextEncoder();const parts=[],central=[];let off=0;
  const d=new Date(),dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF,dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  files.forEach(f=>{
    const name=enc.encode(f.name),data=typeof f.data==='string'?enc.encode(f.data):f.data,crc=crc32(data);
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);
    h.setUint16(10,dt,true);h.setUint16(12,dd,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);h.setUint16(28,0,true);
    parts.push(new Uint8Array(h.buffer),name,data);
    const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,0,true);
    c.setUint16(12,dt,true);c.setUint16(14,dd,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,off,true);
    central.push(new Uint8Array(c.buffer),name);off+=30+name.length+data.length;});
  const csize=central.reduce((a,b)=>a+b.length,0);
  const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,csize,true);e.setUint32(16,off,true);
  return new Blob([...parts,...central,new Uint8Array(e.buffer)],{type:'application/zip'});
}
function downloadBlob(name,blob){try{const a=el('a',{href:URL.createObjectURL(blob),download:name});document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);return true;}catch(e){return false;}}

/* --- модель бланка ---
   P(runs,opt): runs=[{t,b,i,u,sz,color}], opt={al:'l'|'c'|'r'|'j',sz,after,before,rule:true,box:true,keep}
   T(cols мм,rows,opt): rows=[[{blocks:[P…],box,shade,va}]] */
const R=(t,o)=>Object.assign({t:String(t??'')},o||{});
const P=(runs,opt)=>({k:'p',runs:(Array.isArray(runs)?runs:[runs]).map(r=>typeof r==='string'?R(r):r),...(opt||{})});
const T=(cols,rows,opt)=>({k:'t',cols,rows,...(opt||{})});
const C=(blocks,o)=>Object.assign({blocks:Array.isArray(blocks)?blocks:[blocks]},o||{});
const BLUE='1F4E79',GREY='555555';
function manualLines(doc,keepHead){
  if(doc.manualHtml){let bl=htmlBlocks(doc.manualHtml);
    if(!keepHead){if(bl[0]&&bl[0].text===String(doc.head).trim())bl.shift();if(bl[0]&&/^На\s/.test(bl[0].text))bl.shift();}
    return bl.map((b,i)=>{const strong=(keepHead&&i===0)||/^Rö-ч:/.test(b.text)||/^Висновок/.test(b.text);
      return P(htmlRuns(b.html).map(r=>R(r.t,{b:r.b||strong,i:!!r.i,u:!!r.u})),{al:{center:'c',right:'r',left:'l'}[b.al]||'j'});});}
  let lines=String(doc.manual||'').split('\n').map(s=>s.trim()).filter(Boolean);
  if(!keepHead){if(lines[0]===String(doc.head).trim())lines.shift();if(lines[0]&&/^На\s/.test(lines[0]))lines.shift();}
  return lines.map(l=>P(/^Rö-ч:/.test(l)||/^Висновок/.test(l)?[R(l,{b:true})]:[R(l)],{al:'j'}));}
/* логотип для файлів: PNG із налаштувань, висота 12 мм */
function logoRun(hmm){const b=BL();if(!b.logo||!SET.logo||!/^data:image\/png;base64,/.test(SET.logo))return null;
  try{const bin=atob(SET.logo.split(',')[1]);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    const dv=new DataView(u.buffer);const pw=dv.getUint32(16),ph=dv.getUint32(20);if(!pw||!ph)return null;const h=hmm||12;return R('',{img:{data:u,h,w:Math.min(30,h*pw/ph)}});}catch(e){return null;}}
function docBlocks(doc,blank,w){
  const b=BL(),o=ORGB();doc=docB(doc);
  const dt=doc.docTitle||DOC_TITLE(),sign=`${dt} ______________ ${doc.doctor||'[ПІБ]'}`;
  const head2=b.head2?[P(`${b.head2Title||'Завідувач відділення'} ______________ ${b.head2Name||'[ПІБ]'}`,{before:6})]:[];
  const urg=doc.urgent?[P([R('ТЕРМІНОВО · критична знахідка · лікаря повідомлено: ____________ о ____',{b:true,color:'B3261E'})],{box:true})]:[];
  const body=()=>[P(doc.body.join(' '),{al:'j'})];
  const logo=logoRun(blank==='B'?10.5:12);
  const signT=()=>[T(b.mp?[w*0.75,w*0.25]:[w],[b.mp?[C(P(sign)),C(P('М. П.',{al:'r'}))]:[C(P(sign))]],{before:10}),...head2];
  const B=[];
  if(blank==='C'){
    const sub=[o.sub,o.cab,o.tel?'тел. '+o.tel:''].filter(Boolean).join(' · ');const rev=b.stamp==='right',al=rev?'l':'r';
    const org=C([...(logo?[P([logo],{al})]:[]),P([R(o.name||'[Назва закладу]',{b:true})],{al}),...(sub?[P([R(sub,{sz:10,color:GREY})],{al})]:[]),P([R(doc.study==='fg'?'ФЛЮОРОГРАФІЯ':'РЕНТГЕНОГРАФІЯ',{b:true,sz:10,color:BLUE})],{al})],{va:'c'});
    if(b.stamp==='none')B.push(T([w],[[org]]));
    else{const st=b.stampStyle==='corners'?C([P('')],{corners:true,h:20}):C([P([R('місце для штампу рентгенкабінету',{sz:9,color:GREY})],{al:'c'}),P([R('(№ і дата)',{sz:9,color:GREY})],{al:'c'})],{box:true,va:'c',h:20});
      B.push(T(rev?[w-55,55]:[55,w-55],[rev?[org,st]:[st,org]]));}
    B.push(P('',{sz:6}),...urg);
    if(doc.manual!=null)B.push(...manualLines(doc,true));
    else{B.push(P([R(doc.head,{b:true})]),P(doc.refLine),...body(),P([R('Rö-ч: '+doc.concl,{b:true})],{before:4}));if(doc.rec)B.push(P('Рекомендовано: '+doc.rec));}
    const foot=[doc.showEed?`ЕЕД ${doc.eed||'___'} мЗв.`:'',doc.count?cntW(doc.count):''].filter(Boolean).join(' · ');
    B.push(T([w/2,w/2],[[C(P(foot)),C(P(sign,{al:'r'}))]],{before:8}),...head2);
  }else if(blank==='B'){
    B.push(T([w*0.58,w*0.42],[[C([P([...(logo?[logo,R('  ')]:[]),R(o.name||'[Назва закладу]',{b:true,sz:13})]),P([R([o.cab,o.addr,o.tel?'тел. '+o.tel:''].filter(Boolean).join(' · '),{sz:9.5,color:GREY})])]),
      C([P([R('ПРОТОКОЛ ДОСЛІДЖЕННЯ',{sz:8.5,color:GREY,b:true})],{al:'r'}),P([R(doc.what,{b:true})],{al:'r'}),P([R(`№ ${doc.num||'___'} · ${dLong(doc.date)}`,{sz:10})],{al:'r'})])]]),P('',{rule:true,sz:4}));
    B.push(...urg);
    const cell=(l,v)=>C([P([R(l,{sz:8,color:GREY,b:true})]),P([R(v,{b:l==='ПАЦІЄНТ'})])]);
    const row=[cell('ПАЦІЄНТ',doc.name),cell('ВІК, СТАТЬ',[doc.age?ageStr(doc.age):'',sexW(doc.sex)].filter(Boolean).join(', ')||'—'),doc.showEed?cell('ЕЕД',doc.eed?doc.eed+' мЗв':'___'):doc.count?cell('ЗНІМКІВ',String(doc.count)):C(P(''))];
    const r2=doc.dept||doc.proj||(doc.showEed&&doc.count)?[[cell('ВІДДІЛЕННЯ',doc.dept||'—'),cell('ПРОЄКЦІЇ',doc.proj||'—'),doc.showEed&&doc.count?cell('ЗНІМКІВ',String(doc.count)):C(P(''))]]:[];
    B.push(T([w*0.5,w*0.3,w*0.2],[row].concat(r2),{shade:true}),P('',{sz:6}));
    const sec=(l,blocks)=>[T([28,w-28],[[C(P([R(l,{b:true,sz:9,color:BLUE})])),C(blocks)]])];
    if(doc.manual!=null)B.push(...sec('ОПИС',manualLines(doc)));
    else{B.push(...sec('ОПИС',[P(doc.body.join(' '),{al:'j'})]),...sec('ВИСНОВОК',[P([R(doc.concl,{b:true})])]));if(doc.rec)B.push(...sec('РЕКОМЕНДАЦІЇ',[P(doc.rec)]));}
    B.push(P(sign,{before:10}),...head2,P([R('Висновок не є діагнозом; оцінюється лікарем, що направив.',{sz:8.5,i:true,color:GREY})]));
  }else if(blank==='A'){
    if(logo)B.push(P([logo],{al:'c'}));
    if(b.moz)B.push(P([R('Міністерство охорони здоров’я України',{sz:10})],{al:'c'}));
    B.push(P([R([o.name||'[Назва закладу]',o.sub].filter(Boolean).join(' '),{b:true,sz:13})],{al:'c'}),
      P([R([o.cab,o.addr,o.tel?'тел. '+o.tel:'',o.edrpou?'код ЄДРПОУ '+o.edrpou:''].filter(Boolean).join(' · '),{sz:9.5})],{al:'c',rule:true}),
      P([R('ПРОТОКОЛ РЕНТГЕНОЛОГІЧНОГО ДОСЛІДЖЕННЯ',{b:true})],{al:'c',before:6}),P(`№ ${doc.num||'___'} від ${dLong(doc.date)}`,{al:'c',after:6}));
    B.push(...urg);
    const rows=[['Пацієнт:',[R(doc.name,{b:true}),R((doc.age?', '+ageStr(doc.age):'')+(doc.sex?', '+sexW(doc.sex):''))]]];
    if(doc.dept||doc.ref)rows.push(['Направлення:',[R([doc.dept,doc.refDoc?'лікар '+doc.refDoc:'',doc.ref?'е-напр. '+doc.ref:''].filter(Boolean).join(' · '))]]);
    rows.push(['Дослідження:',[R(doc.what+(doc.proj?` (${doc.proj})`:'')+(doc.count?` · ${cntW(doc.count)}`:'')+(doc.eed?` · ЕЕД ${doc.eed} мЗв`:''))]]);
    B.push(T([32,w-32],rows.map(r=>[C(P([R(r[0],{color:GREY})])),C(P(r[1]))])),P('',{sz:6}));
    if(doc.manual!=null)B.push(...manualLines(doc));
    else{B.push(P([R('Опис. ',{b:true}),R(doc.body.join(' '))],{al:'j'}));B.push(P([R('Висновок: '+doc.concl,{b:true})],{before:4}));if(doc.rec)B.push(P([R('Рекомендовано: ',{b:true}),R(doc.rec)]));}
    B.push(...signT());
  }else{ /* D */
    B.push(T([w*0.6,w*0.4],[[C([...(b.moz?[P([R('Найменування міністерства: ',{sz:9}),R('МОЗ України',{sz:9,u:true})])]:[]),P([R('Заклад: ',{sz:9}),R(o.name||'[Назва закладу]',{sz:9,b:true,u:true})]),P([R('Місцезнаходження: ',{sz:9}),R(o.addr||'[адреса]',{sz:9,u:true})]),P([R('Код за ЄДРПОУ: ',{sz:9}),R(o.edrpou||'[________]',{sz:9,u:true})])]),
      C([...(logo?[P([logo],{al:'r'})]:[]),P([R('МЕДИЧНА ДОКУМЕНТАЦІЯ',{sz:9,b:true})],{al:'r'}),P([R('Форма первинної облікової документації',{sz:9})],{al:'r'}),P([R(`№ ${o.form||'[___]'}${o.order?' · '+o.order:''}`,{sz:9})],{al:'r'})])]]));
    B.push(P([R('ПРОТОКОЛ РЕНТГЕНОЛОГІЧНОГО ДОСЛІДЖЕННЯ № ',{b:true}),R(doc.num||'___',{b:true,u:true})],{al:'c',before:8,after:6}));
    B.push(...urg);
    const f=(l,v,bb)=>[C(P(l)),C(P([R(v,{b:!!bb,u:true})]))];
    B.push(T([36,w*0.5-36,18,w*0.5-18],[[...f('1. ПІБ',doc.name,1),...f('Вік',[doc.age?ageStr(doc.age):'',sexW(doc.sex)].filter(Boolean).join(', '))],
      [...f('2. Відділення',doc.dept||'—'),...f('Дата',dLong(doc.date))],[...f('3. Дослідження',doc.what+(doc.proj?` (${doc.proj})`:'')),...f('ЕЕД',doc.showEed?(doc.eed?doc.eed+' мЗв':''):'—')]]),P('4. Опис:',{before:6}));
    if(doc.manual!=null)B.push(...manualLines(doc));
    else{B.push(...body(),P([R('5. Висновок: '),R(doc.concl,{b:true})],{before:4}));if(doc.rec)B.push(P('6. Рекомендації: '+doc.rec));}
    B.push(...signT());
  }
  return B;
}
/* без кольору: прибираємо кольори з тексту (рамки — у збирачах через model.mono) */
function monoBlocks(B){const walk=x=>{if(!x)return;if(x.k==='p')x.runs.forEach(r=>{if(r.color&&r.color!=='B3261E')r.color='333333';});if(x.k==='t')x.rows.forEach(row=>row.forEach(c=>c.blocks.forEach(walk)));if(x.k==='two')x.parts.forEach(pt=>pt.forEach(walk));};B.forEach(walk);return B;}
/* сторінка: пів аркуша (A5 альбомна) / A4; два примірники — A4 з двома половинками; поле під підшивку і зсув принтера — у полях */
function docModel(doc,blank,half){
  const b=BL(),bind=+b.bind||0,ox=+b.offX||0,oy=+b.offY||0;const two=b.copies==='two'&&half;
  const m=half?10:20,mx=half||two?12:20;
  const page=two?{w:210,h:297,mt:0,mb:0,ml:Math.max(0,mx+bind+ox),mr:Math.max(0,mx-ox)}:{w:210,h:half?148.5:297,mt:Math.max(0,m+oy),mb:Math.max(0,m-oy),ml:Math.max(0,mx+bind+ox),mr:Math.max(0,mx-ox)};
  const w=210-2*mx-bind;
  let blocks;
  if(two){const a=docBlocks(doc,blank,w),c=docBlocks(doc,blank,w);blocks=[{k:'two',w,h:148,pad:10,parts:[a,c],labels:['В ІСТОРІЮ ХВОРОБИ','ПАЦІЄНТУ'],oy}];}
  else blocks=docBlocks(doc,blank,w);
  if(b.mono)monoBlocks(blocks);
  return {page,blocks,mono:!!b.mono};
}

/* --- DOCX --- */
const xe=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const TW=mm=>Math.round(mm*56.6929),EMU=mm=>Math.round(mm*36000);
const pgM=pg=>({t:pg.mt??pg.m,b:pg.mb??pg.m,l:pg.ml??pg.m,r:pg.mr??pg.m});
let DX=null; /* контекст збирання: картинки, чорно-білий режим */
function docxRun(r,base){
  if(r.img){DX.img=r.img.data;const id=++DX.n;return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${EMU(r.img.w)}" cy="${EMU(r.img.h)}"/><wp:docPr id="${id}" name="Логотип ${id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${EMU(r.img.w)}" cy="${EMU(r.img.h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;}
  const sz=Math.round((r.sz||base)*2);
  return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>${r.b?'<w:b/>':''}${r.i?'<w:i/>':''}${r.u?'<w:u w:val="single"/>':''}${r.color?`<w:color w:val="${r.color}"/>`:''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${xe(r.t)}</w:t></w:r>`;}
function docxP(p,base){const al={c:'center',r:'right',j:'both',l:'left'}[p.al]||'left';const k=DX&&DX.mono;
  const bd=p.rule?`<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="2" w:color="${k?'333333':'1F4E79'}"/></w:pBdr>`:p.box?'<w:pBdr><w:top w:val="single" w:sz="8" w:space="2" w:color="B3261E"/><w:left w:val="single" w:sz="8" w:space="4" w:color="B3261E"/><w:bottom w:val="single" w:sz="8" w:space="2" w:color="B3261E"/><w:right w:val="single" w:sz="8" w:space="4" w:color="B3261E"/></w:pBdr>':'';
  const runs=p.runs.filter(r=>r.t!==''||r.img).map(r=>docxRun(r,p.sz||base)).join('');
  return `<w:p><w:pPr>${bd}<w:spacing w:before="${Math.round((p.before||0)*20)}" w:after="${Math.round((p.after??2)*20)}" w:line="252" w:lineRule="auto"/><w:jc w:val="${al}"/>${p.runs.every(r=>r.t===''&&!r.img)?`<w:rPr><w:sz w:val="${Math.round((p.sz||base)*2)}"/></w:rPr>`:''}</w:pPr>${runs}</w:p>`;}
const docxBd=(v,c,sz)=>['top','left','bottom','right'].map(s=>`<w:${s} w:val="${v}" w:sz="${sz||8}" w:color="${c}"/>`).join('');
function docxT(t,base){
  const grid=t.cols.map(c=>`<w:gridCol w:w="${TW(c)}"/>`).join('');const k=DX&&DX.mono;
  const rows=t.rows.map(row=>`<w:tr>${row.some(c=>c.h)?`<w:trPr><w:trHeight w:val="${TW(Math.max(...row.map(c=>c.h||0)))}"/></w:trPr>`:''}${row.map((c,i)=>{
    const bd=c.box?`<w:tcBorders>${docxBd('single',k?'555555':'888888')}</w:tcBorders>`:c.corners?`<w:tcBorders>${docxBd('dotted',k?'555555':'AAB4BE',6)}</w:tcBorders>`:'';
    const sh=t.shade?'<w:shd w:val="clear" w:color="auto" w:fill="EEF2F6"/>':'';
    return `<w:tc><w:tcPr><w:tcW w:w="${TW(t.cols[i])}" w:type="dxa"/>${bd}${sh}${c.va==='c'?'<w:vAlign w:val="center"/>':''}</w:tcPr>${(c.blocks.length?c.blocks:[P('')]).map(b=>docxB(b,base)).join('')}${c.blocks.length&&c.blocks[c.blocks.length-1].k==='t'?docxP(P('',{sz:2}),base):''}</w:tc>`;}).join('')}</w:tr>`).join('');
  return `${t.before?docxP(P('',{sz:t.before}),base):''}<w:tbl><w:tblPr><w:tblW w:w="${TW(t.cols.reduce((a,b)=>a+b,0))}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows}</w:tbl>`;}
/* два примірники: таблиця з двох рядків рівно по пів аркуша, між ними — пунктир для розрізання */
function docxTwo(t,base){
  const row=(blocks,lab,first)=>`<w:tr><w:trPr><w:trHeight w:val="${TW(t.h)}" w:hRule="exact"/><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="${TW(t.w)}" w:type="dxa"/>${first?'<w:tcBorders><w:bottom w:val="dashed" w:sz="6" w:color="888888"/></w:tcBorders>':''}<w:tcMar><w:top w:w="${TW(Math.max(2,t.pad-4+(t.oy||0)))}" w:type="dxa"/><w:bottom w:w="${TW(t.pad)}" w:type="dxa"/></w:tcMar></w:tcPr>${docxP(P([R(lab,{sz:7,b:true,color:'6A7682'})],{al:'r',after:2}),base)}${blocks.map(b=>docxB(b,base)).join('')}${blocks.length&&blocks[blocks.length-1].k==='t'?docxP(P('',{sz:2}),base):''}</w:tc></w:tr>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${TW(t.w)}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="${TW(t.w)}"/></w:tblGrid>${row(t.parts[0],t.labels[0],true)}${row(t.parts[1],t.labels[1],false)}</w:tbl>`;}
const docxB=(b,base)=>b.k==='t'?docxT(b,base):b.k==='two'?docxTwo(b,base):docxP(b,base);
function buildDocx(model,base){
  DX={n:0,img:null,mono:!!model.mono};
  const pg=model.page,mg=pgM(pg);
  const body=model.blocks.map(b=>docxB(b,base)).join('')+(model.blocks.some(b=>b.k==='two')?'<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>':'');
  const sect=`<w:sectPr><w:pgSz w:w="${TW(pg.w)}" w:h="${TW(pg.h)}"${pg.w>pg.h?' w:orient="landscape"':''}/><w:pgMar w:top="${TW(mg.t)}" w:right="${TW(mg.r)}" w:bottom="${TW(mg.b)}" w:left="${TW(mg.l)}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;
  const docXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body}${sect}</w:body></w:document>`;
  const img=DX.img;DX=null;
  const files=[
    {name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'},
    {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'},
    {name:'word/document.xml',data:docXml}];
  if(img){files.push({name:'word/_rels/document.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.png"/></Relationships>'},{name:'word/media/logo.png',data:img});}
  return zipStore(files);
}

/* --- ODT --- */
function buildOdt(model,base){
  const st=new Map();let n=0;const sty=(fam,key,xml)=>{const k=fam+'|'+key;if(!st.has(k))st.set(k,{name:fam[0].toUpperCase()+(++n),xml});return st.get(k).name;};
  const mono=!!model.mono;let img=null,fr=0;
  const tProps=r=>{const sz=r.sz||base;return `<style:text-properties style:font-name="Times New Roman" fo:font-size="${sz}pt" style:font-size-complex="${sz}pt"${r.b?' fo:font-weight="bold" style:font-weight-complex="bold"':''}${r.i?' fo:font-style="italic"':''}${r.u?' style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"':''}${r.color?` fo:color="#${r.color}"`:''}/>`;};
  const pStyle=(p)=>{const al={c:'center',r:'end',j:'justify',l:'start'}[p.al]||'start';
    const bd=p.rule?` fo:border-bottom="0.5pt solid #${mono?'333333':'1F4E79'}" fo:padding-bottom="0.6mm"`:p.box?' fo:border="0.6pt solid #B3261E" fo:padding="1mm"':'';
    const key=[al,p.before||0,p.after??2,p.rule?1:0,p.box?1:0,p.sz||base].join(',');
    return sty('paragraph',key,n2=>`<style:style style:name="${n2}" style:family="paragraph"><style:paragraph-properties fo:text-align="${al}" fo:margin-top="${p.before||0}pt" fo:margin-bottom="${p.after??2}pt" fo:line-height="105%"${bd}/>${tProps({sz:p.sz||base})}</style:style>`);};
  const tStyle=r=>sty('text',[r.b,r.i,r.u,r.color,r.sz].join(','),n2=>`<style:style style:name="${n2}" style:family="text">${tProps(r)}</style:style>`);
  const run=r=>{if(r.img){img=r.img.data;fr++;return `<draw:frame draw:name="Логотип${fr}" text:anchor-type="as-char" svg:width="${r.img.w.toFixed(2)}mm" svg:height="${r.img.h.toFixed(2)}mm" draw:z-index="${fr}"><draw:image xlink:href="Pictures/logo.png" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>`;}
    return `<text:span text:style-name="${tStyle(r)}">${xe(r.t).replace(/ {2,}/g,m=>' <text:s text:c="'+(m.length-1)+'"/>')}</text:span>`;};
  const para=p=>`<text:p text:style-name="${pStyle(p)}">${p.runs.filter(r=>r.t!==''||r.img).map(run).join('')}</text:p>`;
  let tn=0;
  const table=t=>{const nm='Tbl'+(++tn);const total=t.cols.reduce((a,b)=>a+b,0);
    const ts=sty('table',nm,n2=>`<style:style style:name="${n2}" style:family="table"><style:table-properties style:width="${total}mm" table:align="left"${t.before?` fo:margin-top="${t.before}pt"`:''}/></style:style>`);
    const cols=t.cols.map((c,i)=>`<table:table-column table:style-name="${sty('table-column',nm+'.'+i,n2=>`<style:style style:name="${n2}" style:family="table-column"><style:table-column-properties style:column-width="${c}mm"/></style:style>`)}"/>`).join('');
    const rows=t.rows.map(row=>{const h=Math.max(0,...row.map(c=>c.h||0));const rs=h?` table:style-name="${sty('table-row',String(h),n2=>`<style:style style:name="${n2}" style:family="table-row"><style:table-row-properties style:min-row-height="${h}mm"/></style:style>`)}"`:'';
      return `<table:table-row${rs}>${row.map(c=>{const brd=c.box?` fo:border="0.6pt solid #${mono?'555555':'888888'}"`:c.corners?` fo:border="0.4pt dotted #${mono?'555555':'AAB4BE'}"`:' fo:border="none"';
        const cs=sty('table-cell',[c.box?1:0,c.corners?1:0,t.shade?1:0,c.va||''].join(','),n2=>`<style:style style:name="${n2}" style:family="table-cell"><style:table-cell-properties fo:padding="0.8mm"${brd}${t.shade?' fo:background-color="#EEF2F6"':''}${c.va==='c'?' style:vertical-align="middle"':''}/></style:style>`);
        return `<table:table-cell table:style-name="${cs}" office:value-type="string">${(c.blocks.length?c.blocks:[P('')]).map(blk).join('')}</table:table-cell>`;}).join('')}</table:table-row>`;}).join('');
    return `<table:table table:name="${nm}" table:style-name="${ts}">${cols}${rows}</table:table>`;};
  const two=t=>{const nm='Tbl'+(++tn);
    const ts=sty('table',nm,n2=>`<style:style style:name="${n2}" style:family="table"><style:table-properties style:width="${t.w}mm" table:align="left"/></style:style>`);
    const col=sty('table-column',nm+'.c',n2=>`<style:style style:name="${n2}" style:family="table-column"><style:table-column-properties style:column-width="${t.w}mm"/></style:style>`);
    const rh=t.h-0.5; /* + крихітний абзац після таблиці, бо LibreOffice завжди додає абзац у кінці */
    const rs=sty('table-row','two'+rh,n2=>`<style:style style:name="${n2}" style:family="table-row"><style:table-row-properties style:row-height="${rh}mm" fo:keep-together="always"/></style:style>`);
    const cell=first=>sty('table-cell','two'+(first?1:0)+(t.oy||0),n2=>`<style:style style:name="${n2}" style:family="table-cell"><style:table-cell-properties fo:padding-top="${Math.max(2,t.pad-4+(t.oy||0))}mm" fo:padding-bottom="${t.pad}mm" fo:padding-left="0mm" fo:padding-right="0mm" fo:border="none"${first?' fo:border-bottom="0.5pt dashed #888888"':''} style:vertical-align="top"/></style:style>`);
    const row=(blocks,lab,first)=>`<table:table-row table:style-name="${rs}"><table:table-cell table:style-name="${cell(first)}" office:value-type="string">${para(P([R(lab,{sz:7,b:true,color:'6A7682'})],{al:'r',after:2}))}${blocks.map(blk).join('')}</table:table-cell></table:table-row>`;
    return `<table:table table:name="${nm}" table:style-name="${ts}"><table:table-column table:style-name="${col}"/>${row(t.parts[0],t.labels[0],true)}${row(t.parts[1],t.labels[1],false)}</table:table>`;};
  const blk=b=>b.k==='t'?table(b):b.k==='two'?two(b):para(b);
  const body=model.blocks.map(blk).join('')+(model.blocks.some(b=>b.k==='two')?`<text:p text:style-name="${sty('paragraph','tiny',n2=>`<style:style style:name="${n2}" style:family="paragraph"><style:paragraph-properties fo:margin-top="0pt" fo:margin-bottom="0pt" fo:line-height="1pt"/><style:text-properties fo:font-size="1pt"/></style:style>`)}"/>`:'');
  const auto=[...st.values()].map(s=>typeof s.xml==='function'?s.xml(s.name):s.xml).join('');
  const NS='xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.2"';
  const fonts='<office:font-face-decls><style:font-face style:name="Times New Roman" svg:font-family="\'Times New Roman\'" style:font-family-generic="roman"/></office:font-face-decls>';
  const content=`<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS}>${fonts}<office:automatic-styles>${auto}</office:automatic-styles><office:body><office:text>${body}</office:text></office:body></office:document-content>`;
  const pg=model.page,mg=pgM(pg);
  const styles=`<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS}>${fonts}<office:automatic-styles><style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="${pg.w}mm" fo:page-height="${pg.h}mm" style:print-orientation="${pg.w>pg.h?'landscape':'portrait'}" fo:margin-top="${mg.t}mm" fo:margin-bottom="${mg.b}mm" fo:margin-left="${mg.l}mm" fo:margin-right="${mg.r}mm"/></style:page-layout></office:automatic-styles><office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles></office:document-styles>`;
  const manifest=`<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>${img?'<manifest:file-entry manifest:full-path="Pictures/logo.png" manifest:media-type="image/png"/>':''}</manifest:manifest>`;
  const files=[{name:'mimetype',data:'application/vnd.oasis.opendocument.text'},{name:'META-INF/manifest.xml',data:manifest},{name:'content.xml',data:content},{name:'styles.xml',data:styles}];
  if(img)files.push({name:'Pictures/logo.png',data:img});
  return zipStore(files);
}
/* sty() приймає або рядок, або функцію від імені стилю */
function exportModel(){const it=classify(currentItem());const doc=it.doc||docData();return {model:docModel(doc,it.blank||curBlank(),it.kind==='half'),half:it.kind==='half'};}
function saveDocx(){const {model}=exportModel();if(!downloadBlob(fileBase()+'.docx',buildDocx(model,12)))toast('Не вдалося зберегти файл');else toast('Збережено для Word (.docx)');}
function saveOdt(){const {model}=exportModel();if(!downloadBlob(fileBase()+'.odt',buildOdt(model,12)))toast('Не вдалося зберегти файл');else toast('Збережено для LibreOffice (.odt)');}
