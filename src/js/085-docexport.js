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
function docModel(doc,blank,half){
  const o=ORG(),dt=doc.docTitle||DOC_TITLE(),sign=`${dt} ______________ ${doc.doctor||'[ПІБ]'}`,w=half?190:170;
  const urg=doc.urgent?[P([R('ТЕРМІНОВО · критична знахідка · лікаря повідомлено: ____________ о ____',{b:true,color:'B3261E'})],{box:true})]:[];
  const body=()=>[P(doc.body.join(' '),{al:'j'})];
  const B=[];
  if(blank==='C'){
    const sub=[o.sub,o.cab,o.tel?'тел. '+o.tel:''].filter(Boolean).join(' · ');
    B.push(T([55,w-55],[[C([P([R('місце для штампу рентгенкабінету',{sz:9,color:GREY})],{al:'c'}),P([R('(№ і дата)',{sz:9,color:GREY})],{al:'c'})],{box:true,va:'c',h:20}),
      C([P([R(o.name||'[Назва закладу]',{b:true})]),...(sub?[P([R(sub,{sz:10,color:GREY})])]:[]),P([R(doc.study==='fg'?'ФЛЮОРОГРАФІЯ':'РЕНТГЕНОГРАФІЯ',{b:true,sz:10,color:BLUE})])],{va:'c'})]]),P('',{sz:6}));
    B.push(...urg);
    if(doc.manual!=null)B.push(...manualLines(doc,true));
    else{B.push(P([R(doc.head,{b:true})]),P(doc.refLine),...body(),P([R('Rö-ч: '+doc.concl,{b:true})],{before:4}));if(doc.rec)B.push(P('Рекомендовано: '+doc.rec));}
    B.push(T([w/2,w/2],[[C(P(`ЕЕД ${doc.eed||'___'} мЗв.`)),C(P(sign,{al:'r'}))]],{before:8}));
  }else if(blank==='B'){
    B.push(T([w*0.58,w*0.42],[[C([P([R(o.name||'[Назва закладу]',{b:true,sz:13})]),P([R([o.cab,o.addr,o.tel?'тел. '+o.tel:''].filter(Boolean).join(' · '),{sz:9.5,color:GREY})])]),
      C([P([R('ПРОТОКОЛ ДОСЛІДЖЕННЯ',{sz:8.5,color:GREY,b:true})],{al:'r'}),P([R(doc.what,{b:true})],{al:'r'}),P([R(`№ ${doc.num||'___'} · ${dLong(doc.date)}`,{sz:10})],{al:'r'})])]]),P('',{rule:true,sz:4}));
    B.push(...urg);
    const cell=(l,v)=>C([P([R(l,{sz:8,color:GREY,b:true})]),P([R(v,{b:l==='ПАЦІЄНТ'})])]);
    const row=[cell('ПАЦІЄНТ',doc.name),cell('ВІК, СТАТЬ',[doc.age?ageStr(doc.age):'',sexW(doc.sex)].filter(Boolean).join(', ')||'—'),cell('ЕЕД',doc.eed?doc.eed+' мЗв':'___')];
    B.push(T([w*0.5,w*0.3,w*0.2],[row].concat(doc.dept||doc.proj?[[cell('ВІДДІЛЕННЯ',doc.dept||'—'),cell('ПРОЄКЦІЇ',doc.proj||'—'),C(P(''))]]:[]),{shade:true}),P('',{sz:6}));
    const sec=(l,blocks)=>[T([28,w-28],[[C(P([R(l,{b:true,sz:9,color:BLUE})])),C(blocks)]])];
    if(doc.manual!=null)B.push(...sec('ОПИС',manualLines(doc)));
    else{B.push(...sec('ОПИС',[P(doc.body.join(' '),{al:'j'})]),...sec('ВИСНОВОК',[P([R(doc.concl,{b:true})])]));if(doc.rec)B.push(...sec('РЕКОМЕНДАЦІЇ',[P(doc.rec)]));}
    B.push(P(sign,{before:10}),P([R('Висновок не є діагнозом; оцінюється лікарем, що направив.',{sz:8.5,i:true,color:GREY})]));
  }else if(blank==='A'){
    B.push(P([R('Міністерство охорони здоров’я України',{sz:10})],{al:'c'}),P([R([o.name||'[Назва закладу]',o.sub].filter(Boolean).join(' '),{b:true,sz:13})],{al:'c'}),
      P([R([o.cab,o.addr,o.tel?'тел. '+o.tel:'',o.edrpou?'код ЄДРПОУ '+o.edrpou:''].filter(Boolean).join(' · '),{sz:9.5})],{al:'c',rule:true}),
      P([R('ПРОТОКОЛ РЕНТГЕНОЛОГІЧНОГО ДОСЛІДЖЕННЯ',{b:true})],{al:'c',before:6}),P(`№ ${doc.num||'___'} від ${dLong(doc.date)}`,{al:'c',after:6}));
    B.push(...urg);
    const rows=[['Пацієнт:',[R(doc.name,{b:true}),R((doc.age?', '+ageStr(doc.age):'')+(doc.sex?', '+sexW(doc.sex):''))]]];
    if(doc.dept||doc.ref)rows.push(['Направлення:',[R([doc.dept,doc.refDoc?'лікар '+doc.refDoc:'',doc.ref?'е-напр. '+doc.ref:''].filter(Boolean).join(' · '))]]);
    rows.push(['Дослідження:',[R(doc.what+(doc.proj?` (${doc.proj})`:'')+(doc.eed?` · ЕЕД ${doc.eed} мЗв`:''))]]);
    B.push(T([32,w-32],rows.map(r=>[C(P([R(r[0],{color:GREY})])),C(P(r[1]))])),P('',{sz:6}));
    if(doc.manual!=null)B.push(...manualLines(doc));
    else{B.push(P([R('Опис. ',{b:true}),R(doc.body.join(' '))],{al:'j'}));B.push(P([R('Висновок: '+doc.concl,{b:true})],{before:4}));if(doc.rec)B.push(P([R('Рекомендовано: ',{b:true}),R(doc.rec)]));}
    B.push(T([w*0.75,w*0.25],[[C(P(sign)),C(P('М. П.',{al:'r'}))]],{before:10}));
  }else{ /* D */
    B.push(T([w*0.6,w*0.4],[[C([P([R('Найменування міністерства: ',{sz:9}),R('МОЗ України',{sz:9,u:true})]),P([R('Заклад: ',{sz:9}),R(o.name||'[Назва закладу]',{sz:9,b:true,u:true})]),P([R('Місцезнаходження: ',{sz:9}),R(o.addr||'[адреса]',{sz:9,u:true})]),P([R('Код за ЄДРПОУ: ',{sz:9}),R(o.edrpou||'[________]',{sz:9,u:true})])]),
      C([P([R('МЕДИЧНА ДОКУМЕНТАЦІЯ',{sz:9,b:true})],{al:'r'}),P([R('Форма первинної облікової документації',{sz:9})],{al:'r'}),P([R(`№ ${o.form||'[___]'}${o.order?' · '+o.order:''}`,{sz:9})],{al:'r'})])]]));
    B.push(P([R('ПРОТОКОЛ РЕНТГЕНОЛОГІЧНОГО ДОСЛІДЖЕННЯ № ',{b:true}),R(doc.num||'___',{b:true,u:true})],{al:'c',before:8,after:6}));
    B.push(...urg);
    const f=(l,v,b)=>[C(P(l)),C(P([R(v,{b:!!b,u:true})]))];
    B.push(T([36,w*0.5-36,18,w*0.5-18],[[...f('1. ПІБ',doc.name,1),...f('Вік',[doc.age?ageStr(doc.age):'',sexW(doc.sex)].filter(Boolean).join(', '))],
      [...f('2. Відділення',doc.dept||'—'),...f('Дата',dLong(doc.date))],[...f('3. Дослідження',doc.what+(doc.proj?` (${doc.proj})`:'')),...f('ЕЕД',doc.eed?doc.eed+' мЗв':'')]]),P('4. Опис:',{before:6}));
    if(doc.manual!=null)B.push(...manualLines(doc));
    else{B.push(...body(),P([R('5. Висновок: '),R(doc.concl,{b:true})],{before:4}));if(doc.rec)B.push(P('6. Рекомендації: '+doc.rec));}
    B.push(T([w*0.75,w*0.25],[[C(P(sign)),C(P('М. П.',{al:'r'}))]],{before:10}));
  }
  return {page:half?{w:210,h:148.5,m:10}:{w:210,h:297,m:20},blocks:B};
}

/* --- DOCX --- */
const xe=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const TW=mm=>Math.round(mm*56.6929);
function docxRun(r,base){const sz=Math.round((r.sz||base)*2);
  return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>${r.b?'<w:b/>':''}${r.i?'<w:i/>':''}${r.u?'<w:u w:val="single"/>':''}${r.color?`<w:color w:val="${r.color}"/>`:''}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${xe(r.t)}</w:t></w:r>`;}
function docxP(p,base){const al={c:'center',r:'right',j:'both'}[p.al]||'left';
  const bd=p.rule?'<w:pBdr><w:bottom w:val="single" w:sz="8" w:space="2" w:color="1F4E79"/></w:pBdr>':p.box?'<w:pBdr><w:top w:val="single" w:sz="8" w:space="2" w:color="B3261E"/><w:left w:val="single" w:sz="8" w:space="4" w:color="B3261E"/><w:bottom w:val="single" w:sz="8" w:space="2" w:color="B3261E"/><w:right w:val="single" w:sz="8" w:space="4" w:color="B3261E"/></w:pBdr>':'';
  const runs=p.runs.filter(r=>r.t!=='').map(r=>docxRun(r,p.sz||base)).join('');
  return `<w:p><w:pPr>${bd}<w:spacing w:before="${Math.round((p.before||0)*20)}" w:after="${Math.round((p.after??2)*20)}" w:line="252" w:lineRule="auto"/><w:jc w:val="${al}"/>${p.runs.every(r=>r.t==='')?`<w:rPr><w:sz w:val="${Math.round((p.sz||base)*2)}"/></w:rPr>`:''}</w:pPr>${runs}</w:p>`;}
function docxT(t,base){
  const grid=t.cols.map(c=>`<w:gridCol w:w="${TW(c)}"/>`).join('');
  const rows=t.rows.map(row=>`<w:tr>${row.some(c=>c.h)?`<w:trPr><w:trHeight w:val="${TW(Math.max(...row.map(c=>c.h||0)))}"/></w:trPr>`:''}${row.map((c,i)=>{
    const bd=c.box?'<w:tcBorders><w:top w:val="single" w:sz="8" w:color="888888"/><w:left w:val="single" w:sz="8" w:color="888888"/><w:bottom w:val="single" w:sz="8" w:color="888888"/><w:right w:val="single" w:sz="8" w:color="888888"/></w:tcBorders>':'';
    const sh=t.shade?'<w:shd w:val="clear" w:color="auto" w:fill="EEF2F6"/>':'';
    return `<w:tc><w:tcPr><w:tcW w:w="${TW(t.cols[i])}" w:type="dxa"/>${bd}${sh}${c.va==='c'?'<w:vAlign w:val="center"/>':''}</w:tcPr>${(c.blocks.length?c.blocks:[P('')]).map(b=>docxP(b,base)).join('')}</w:tc>`;}).join('')}</w:tr>`).join('');
  return `${t.before?docxP(P('',{sz:t.before}),base):''}<w:tbl><w:tblPr><w:tblW w:w="${TW(t.cols.reduce((a,b)=>a+b,0))}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblCellMar><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rows}</w:tbl>`;}
function buildDocx(model,base){
  const pg=model.page,orient=pg.w>pg.h?' w:orient="landscape"':'';const W=pg.h<200?297/2:pg.h;
  const body=model.blocks.map(b=>b.k==='t'?docxT(b,base):docxP(b,base)).join('');
  const sect=`<w:sectPr><w:pgSz w:w="${TW(pg.w)}" w:h="${TW(pg.h)}"/><w:pgMar w:top="${TW(pg.m)}" w:right="${TW(pg.m)}" w:bottom="${TW(pg.m)}" w:left="${TW(pg.m)}" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;
  const docXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}${sect}</w:body></w:document>`;
  return zipStore([
    {name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'},
    {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'},
    {name:'word/document.xml',data:docXml}]);
}

/* --- ODT --- */
function buildOdt(model,base){
  const st=new Map();let n=0;const sty=(fam,key,xml)=>{const k=fam+'|'+key;if(!st.has(k))st.set(k,{name:fam[0].toUpperCase()+(++n),xml});return st.get(k).name;};
  const tProps=r=>{const sz=r.sz||base;return `<style:text-properties style:font-name="Times New Roman" fo:font-size="${sz}pt" style:font-size-complex="${sz}pt"${r.b?' fo:font-weight="bold" style:font-weight-complex="bold"':''}${r.i?' fo:font-style="italic"':''}${r.u?' style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"':''}${r.color?` fo:color="#${r.color}"`:''}/>`;};
  const pStyle=(p)=>{const al={c:'center',r:'end',j:'justify'}[p.al]||'start';
    const bd=p.rule?' fo:border-bottom="0.5pt solid #1F4E79" fo:padding-bottom="0.6mm"':p.box?' fo:border="0.6pt solid #B3261E" fo:padding="1mm"':'';
    const key=[al,p.before||0,p.after??2,p.rule?1:0,p.box?1:0,p.sz||base].join(',');
    return sty('paragraph',key,n2=>`<style:style style:name="${n2}" style:family="paragraph"><style:paragraph-properties fo:text-align="${al}" fo:margin-top="${p.before||0}pt" fo:margin-bottom="${p.after??2}pt" fo:line-height="105%"${bd}/>${tProps({sz:p.sz||base})}</style:style>`);};
  const tStyle=r=>sty('text',[r.b,r.i,r.u,r.color,r.sz].join(','),n2=>`<style:style style:name="${n2}" style:family="text">${tProps(r)}</style:style>`);
  const para=p=>`<text:p text:style-name="${pStyle(p)}">${p.runs.filter(r=>r.t!=='').map(r=>`<text:span text:style-name="${tStyle(r)}">${xe(r.t).replace(/ {2,}/g,m=>' <text:s text:c="'+(m.length-1)+'"/>')}</text:span>`).join('')}</text:p>`;
  let tn=0;
  const table=t=>{const nm='Tbl'+(++tn);const total=t.cols.reduce((a,b)=>a+b,0);
    const ts=sty('table',nm,n2=>`<style:style style:name="${n2}" style:family="table"><style:table-properties style:width="${total}mm" table:align="left"${t.before?` fo:margin-top="${t.before}pt"`:''}/></style:style>`);
    const cols=t.cols.map((c,i)=>`<table:table-column table:style-name="${sty('table-column',nm+'.'+i,n2=>`<style:style style:name="${n2}" style:family="table-column"><style:table-column-properties style:column-width="${c}mm"/></style:style>`)}"/>`).join('');
    const rows=t.rows.map(row=>{const h=Math.max(0,...row.map(c=>c.h||0));const rs=h?` table:style-name="${sty('table-row',String(h),n2=>`<style:style style:name="${n2}" style:family="table-row"><style:table-row-properties style:min-row-height="${h}mm"/></style:style>`)}"`:'';
      return `<table:table-row${rs}>${row.map(c=>{const cs=sty('table-cell',[c.box?1:0,t.shade?1:0,c.va||''].join(','),n2=>`<style:style style:name="${n2}" style:family="table-cell"><style:table-cell-properties fo:padding="0.8mm"${c.box?' fo:border="0.6pt solid #888888"':' fo:border="none"'}${t.shade?' fo:background-color="#EEF2F6"':''}${c.va==='c'?' style:vertical-align="middle"':''}/></style:style>`);
        return `<table:table-cell table:style-name="${cs}" office:value-type="string">${(c.blocks.length?c.blocks:[P('')]).map(para).join('')}</table:table-cell>`;}).join('')}</table:table-row>`;}).join('');
    return `<table:table table:name="${nm}" table:style-name="${ts}">${cols}${rows}</table:table>`;};
  const body=model.blocks.map(b=>b.k==='t'?table(b):para(b)).join('');
  const auto=[...st.values()].map(s=>typeof s.xml==='function'?s.xml(s.name):s.xml).join('');
  const NS='xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.2"';
  const fonts='<office:font-face-decls><style:font-face style:name="Times New Roman" svg:font-family="\'Times New Roman\'" style:font-family-generic="roman"/></office:font-face-decls>';
  const content=`<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NS}>${fonts}<office:automatic-styles>${auto}</office:automatic-styles><office:body><office:text>${body}</office:text></office:body></office:document-content>`;
  const pg=model.page;
  const styles=`<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NS}>${fonts}<office:automatic-styles><style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="${pg.w}mm" fo:page-height="${pg.h}mm" style:print-orientation="${pg.w>pg.h?'landscape':'portrait'}" fo:margin-top="${pg.m}mm" fo:margin-bottom="${pg.m}mm" fo:margin-left="${pg.m}mm" fo:margin-right="${pg.m}mm"/></style:page-layout></office:automatic-styles><office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles></office:document-styles>`;
  const manifest='<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/></manifest:manifest>';
  return zipStore([{name:'mimetype',data:'application/vnd.oasis.opendocument.text'},{name:'META-INF/manifest.xml',data:manifest},{name:'content.xml',data:content},{name:'styles.xml',data:styles}]);
}
/* sty() приймає або рядок, або функцію від імені стилю */
function exportModel(){const it=classify(currentItem());const doc=it.doc||docData();return {model:docModel(doc,it.blank||curBlank(),it.kind==='half'),half:it.kind==='half'};}
function saveDocx(){const {model}=exportModel();if(!downloadBlob(fileBase()+'.docx',buildDocx(model,12)))toast('Не вдалося зберегти файл');else toast('Збережено для Word (.docx)');}
function saveOdt(){const {model}=exportModel();if(!downloadBlob(fileBase()+'.odt',buildOdt(model,12)))toast('Не вдалося зберегти файл');else toast('Збережено для LibreOffice (.odt)');}
