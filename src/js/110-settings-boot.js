/* ===== Налаштування і запуск ===== */
function renderSettings(){
  $('sDoctor').value=SET.doctor;$('sDepts').value=SET.depts;$('sTheme').value=SET.theme;$('sFont').value=SET.font;
  $('sFlow').checked=!!SET.flow;$('sFreq').checked=!!SET.freq;$('sPrintMode').value=SET.printMode;$('sFlipEdge').value=SET.flipEdge;$('sRevBacks').checked=!!SET.revBacks;
  const e=$('sEed');e.textContent='';Object.keys(STUDIES).forEach(k=>{const l=el('label',{class:'f'},STUDIES[k].n);const i=el('input',{type:'text',inputmode:'decimal'});i.value=SET.eed[k]||'';i.addEventListener('input',()=>{SET.eed[k]=i.value.trim();saveSet();});l.append(i);e.append(l);});
  const ns=$('sNormStudy');if(!ns.options.length)Object.keys(STUDIES).forEach(k=>ns.append(el('option',{value:k},STUDIES[k].n)));
  renderNorms();renderMy();renderFolderInfo();$('sVer').textContent=`Skiagrama ${VERSION} бета. Працює без інтернету; оновлення приходять самі, коли є мережа.`;
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
$('sNormReset').onclick=()=>{const k=$('sNormStudy').value;Object.keys(SET.norms).forEach(x=>{if(x.startsWith(k+'.'))delete SET.norms[x];});saveSet();renderNorms();toast('Стандартні фрази повернуто');};
$('sDoctor').addEventListener('input',e=>{SET.doctor=e.target.value;saveSet();});
$('sDepts').addEventListener('input',e=>{SET.depts=e.target.value;saveSet();fillDepts();});
$('sTheme').addEventListener('change',e=>{SET.theme=e.target.value;saveSet();applyLook();});
$('sFont').addEventListener('change',e=>{SET.font=e.target.value;saveSet();applyLook();});
$('sFlow').addEventListener('change',e=>{SET.flow=e.target.checked;saveSet();});
$('sFreq').addEventListener('change',e=>{SET.freq=e.target.checked;saveSet();});
$('sFreqReset').onclick=()=>{USE={counts:{},rank:{},day:today()};saveUse();toast('Статистику фраз скинуто');};
$('sPrintMode').addEventListener('change',e=>{SET.printMode=e.target.value;saveSet();});
$('sFlipEdge').addEventListener('change',e=>{SET.flipEdge=e.target.value;saveSet();});
$('sRevBacks').addEventListener('change',e=>{SET.revBacks=e.target.checked;saveSet();});
$('sWelcome').onclick=openWelcome;
$('sExport').onclick=()=>{const ok=download(`Skiagrama_налаштування_${today()}.json`,JSON.stringify({app:'skiagrama-settings',v:2,settings:SET,templates:TPL},null,1),'application/json');$('sMsg').textContent=ok?'Налаштування і шаблони збережено у файл.':'Не вдалося зберегти файл.';};
$('sImport').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const d=JSON.parse(rd.result);if(d.app!=='skiagrama-settings')throw 0;
  SET=Object.assign(SET,d.settings||{});TPL=Array.isArray(d.templates)?d.templates:TPL;saveSet();saveTpl();fillDepts();applyLook();renderSettings();$('sMsg').textContent='Налаштування завантажено.';}catch(err){$('sMsg').textContent='Це не файл налаштувань Skiagrama.';}e.target.value='';};rd.readAsText(f);});
function fillDepts(){const dl=$('deptList');dl.textContent='';SET.depts.split(',').map(s=>s.trim()).filter(Boolean).forEach(d=>dl.append(el('option',{value:d})));}

/* запуск */
applyLook();$('vBadge').textContent=`v${VERSION} бета`;
fillDepts();renderNames();updCtrlBadge();
$('pDate').value=today();setEedDefault();$('pNum').value=nextNum();
const dr=store.get(DRAFT_KEY,null);
if(dr&&dr.S&&STUDIES[dr.S.study]){S=dr.S;S.zones=Object.assign(blankZones(S.study),S.zones);setFields(dr.f);editingId=dr.editingId||null;clicks=dr.clicks||0;renderAll();setTimeout(()=>toast('Відновлено незбережений протокол'),300);}
else renderAll();
setInterval(()=>{if(t0&&!tDone)renderMeter();},1000);
folderBoot();
if(!SET.welcomed)setTimeout(openWelcome,200);
else if(SET.seenVersion!==VERSION)setTimeout(openWhatsNew,400);
