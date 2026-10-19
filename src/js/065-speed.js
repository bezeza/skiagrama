/* ===== Швидкість: «справа ↔ зліва» подвійним клацанням, скорочення «.слово», пропуски «__» ===== */

/* подвійне клацання по реченню протоколу міняє бік — після підтвердження, і пропонує узгодити висновок / опис */
function planZoneSide(id){
  const d=visibleZones().find(z=>z.id===id)||allZonesOf(S.study).find(z=>z.id===id);const z=S.zones[id];if(!d||!z||z.st!=='c')return null;
  const next=clone(z.sel);let changed=false;
  d.groups.forEach(g=>{const v=z.sel[g.id];if(v==null||v==='')return;const opts=effOpts(d,g,true);
    const one=k=>{const o=opts.find(x=>x.k===k);if(!o)return k;const sw=swapSide(o.ph);if(sw===o.ph)return k;const t=opts.find(x=>x.ph===sw);if(t){changed=true;return t.k;}return k;};
    next[g.id]=Array.isArray(v)?v.map(one):one(v);});
  return changed?{name:d.name,apply:()=>{z.sel=next;}}:null;
}
function planConclSide(){
  let changed=false;const sw=t=>{const r=swapSide(t);if(r!==t)changed=true;return r;};
  const c=S.concl.map(sw),f=$('conclFree').value,f2=sw(f);
  if(!changed)return null;
  const before=S.concl.concat(f.trim()?[f.trim()]:[]).filter(t=>swapSide(t)!==t),after=before.map(swapSide);
  return {before,after,apply:()=>{S.concl=c;$('conclFree').value=f2;S.dismissed=[];}};
}
function planZonesSide(){const ps=visibleZones().map(d=>planZoneSide(d.id)).filter(Boolean);return ps.length?{names:ps.map(x=>x.name),apply:()=>ps.forEach(x=>x.apply())}:null;}
/* сумісність зі старими викликами */
function swapZoneSide(id){const pz=planZoneSide(id);if(!pz)return false;tick();pz.apply();return true;}
function swapConclSide(){const pc=planConclSide();if(!pc)return false;tick();pc.apply();return true;}
function askSide(o){ /* o: {title, main:{label,apply}, extra:{label,apply,list}|null} */
  openDlg(box=>{box.append(el('h2',null,'Змінити бік: справа ↔ зліва?'));box.append(el('p',null,o.title));
    if(o.extra&&o.extra.list){const ul=el('ul',{class:'steps swlist'});o.extra.list.forEach(t=>ul.append(el('li',null,t)));box.append(el('p',{class:'note'},o.extra.what),ul);}
    const r=el('div',{class:'trow'});const done=(fns,msg)=>{tick();fns.forEach(f=>f());renderAll();dlgReturn=null;closeDlg();getSelection().removeAllRanges();toast(msg);};
    if(o.extra){const b1=el('button',{type:'button',class:'btn primary','data-autofocus':'1'},o.extra.label);b1.onclick=()=>done([o.main.apply,o.extra.apply],o.extra.toast);r.append(b1);
      const b2=el('button',{type:'button',class:'btn'},o.main.only);b2.onclick=()=>done([o.main.apply],o.main.toast+' — перевірте '+o.extra.check);r.append(b2);}
    else{const b1=el('button',{type:'button',class:'btn primary','data-autofocus':'1'},o.main.label);b1.onclick=()=>done([o.main.apply],o.main.toast);r.append(b1);}
    const c=el('button',{type:'button',class:'btn'},'Скасувати');c.onclick=()=>{dlgReturn=null;closeDlg();getSelection().removeAllRanges();};r.append(c);box.append(r);});
}
function swapManualWord(){
  const s=getSelection();if(!s.rangeCount)return false;const w=s.toString();if(!w||w.length>30)return false;
  const t=w.replace(/\s+$/,'');const r=swapSide(t);if(r===t)return false;
  document.execCommand('insertText',false,r+w.slice(t.length));return true;
}
$('paper').addEventListener('dblclick',e=>{
  if(paperView)return;const tx=e.target.closest('#ptext');if(!tx)return;
  if(S.manual!=null){if(swapManualWord())toast('Бік змінено у слові: справа ↔ зліва — перевірте висновок');return;}
  const zn=e.target.closest('[data-zone]'),cn=e.target.closest('.concl');
  /* поки питаємо — текст протоколу не в фокусі, щоб він не став «відредагованим вручну» */
  const calm0=()=>{getSelection().removeAllRanges();if(document.activeElement===tx)tx.blur();};
  if(zn||cn||S.study==='bone')calm0();
  const conclList=pc=>pc.before.map((t,i)=>`«${t}» → «${pc.after[i]}»`);
  if(zn){const pz=planZoneSide(zn.dataset.zone);if(!pz)return;const pc=planConclSide();
    askSide({title:`Зона «${pz.name}»: бік у описі зміниться на протилежний.`,
      main:{label:'Змінити',only:'Лише в описі',apply:pz.apply,toast:'Бік змінено в описі'},
      extra:pc?{label:'Змінити і в описі, і у висновку',apply:pc.apply,what:'У висновку теж є бік — змінити й там?',list:conclList(pc),toast:'Бік змінено в описі й у висновку',check:'висновок'}:null});}
  else if(cn){const pc=planConclSide();if(!pc)return;const pz=planZonesSide();
    askSide({title:'Бік у висновку зміниться на протилежний: '+conclList(pc).join('; ')+'.',
      main:{label:'Змінити',only:'Лише у висновку',apply:pc.apply,toast:'Бік змінено у висновку'},
      extra:pz?{label:'Змінити і у висновку, і в описі',apply:pz.apply,what:'В описі теж є бік — змінити й там?',list:pz.names.map(n=>'зона «'+n+'»'),toast:'Бік змінено у висновку й в описі',check:'опис'}:null});}
  else if(S.study==='bone'&&(S.side==='п'||S.side==='л')&&tx.children[1]&&tx.children[1].contains(e.target)){const pc=planConclSide();const to=S.side==='п'?'ліва':'права';
    askSide({title:`Бік у назві дослідження зміниться на «${to}».`,
      main:{label:'Змінити',only:'Лише в назві',apply:()=>{S.side=S.side==='п'?'л':'п';},toast:'Бік змінено в назві дослідження'},
      extra:pc?{label:'Змінити і в назві, і у висновку',apply:pc.apply,what:'У висновку теж є бік — змінити й там?',list:conclList(pc),toast:'Бік змінено в назві й у висновку',check:'висновок'}:null});}
});

/* скорочення і пропуски */
const isTextTarget=t=>t&&(t.id==='ptext'||t.tagName==='TEXTAREA'||(t.tagName==='INPUT'&&/^(text|search)$/.test(t.type)));
function abbrBefore(text){const m=/(^|[\s(«"])\.([\p{L}\d-]{1,20})$/u.exec(text);if(!m)return null;const k=m[2].toLowerCase();const ph=(SET.abbr||{})[k];return ph?{k,ph,len:k.length+1}:null;}
function ceTextNodes(root){const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const a=[];let n;while((n=w.nextNode()))a.push(n);return a;}
function ceCaret(root){const s=getSelection();if(!s.rangeCount)return 0;const r=s.getRangeAt(0);const pre=document.createRange();pre.selectNodeContents(root);pre.setEnd(r.endContainer,r.endOffset);return pre.toString().length;}
/* виділити наступний «__» після позиції from (з переходом на початок) */
function ceSelectGap(root,from){
  const nodes=ceTextNodes(root);const find=start=>{let off=0;for(const n of nodes){const re=/_{2,}/g;re.lastIndex=Math.max(0,start-off);const m=re.exec(n.data);
      if(m){const r=document.createRange();r.setStart(n,m.index);r.setEnd(n,m.index+m[0].length);const s=getSelection();s.removeAllRanges();s.addRange(r);return true;}off+=n.data.length;}return false;};
  return find(from)||find(0);
}
function inSelectGap(inp,from){const v=inp.value;const re=/_{2,}/g;re.lastIndex=from;let m=re.exec(v);if(!m){re.lastIndex=0;m=re.exec(v);}if(!m)return false;inp.setSelectionRange(m.index,m.index+m[0].length);return true;}
function expandAbbr(t,suffix){
  if(t.id==='ptext'){
    const s=getSelection();if(!s.rangeCount||!s.isCollapsed)return false;const r=s.getRangeAt(0);const n=r.endContainer;if(n.nodeType!==3)return false;
    const a=abbrBefore(n.data.slice(0,r.endOffset));if(!a)return false;
    const start=ceCaret(t)-a.len;const sr=document.createRange();sr.setStart(n,r.endOffset-a.len);sr.setEnd(n,r.endOffset);s.removeAllRanges();s.addRange(sr);
    document.execCommand('insertText',false,a.ph+suffix);
    if(/_{2,}/.test(a.ph))ceSelectGap(t,start);
    return true;
  }
  const p=t.selectionStart;if(p==null||p!==t.selectionEnd)return false;const a=abbrBefore(t.value.slice(0,p));if(!a)return false;
  t.setSelectionRange(p-a.len,p);
  if(!document.execCommand('insertText',false,a.ph+suffix)){t.setRangeText(a.ph+suffix,p-a.len,p,'end');t.dispatchEvent(new Event('input',{bubbles:true}));}
  if(/_{2,}/.test(a.ph))inSelectGap(t,p-a.len);
  return true;
}
document.addEventListener('keydown',e=>{
  const t=e.target;if(!isTextTarget(t)||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
  if(e.key===' '||e.key==='Enter'){if(expandAbbr(t,e.key===' '?' ':'')){e.preventDefault();e.stopPropagation();}return;}
  if(e.key==='Tab'&&!e.shiftKey){
    if(t.id==='ptext'){if(/_{2,}/.test(t.textContent)){e.preventDefault();ceSelectGap(t,ceCaret(t));}}
    else if(/_{2,}/.test(t.value)){e.preventDefault();inSelectGap(t,t.selectionEnd);}
  }
},true);

/* налаштування: мої скорочення */
function renderAbbr(){
  const root=$('sAbbr');if(!root)return;root.textContent='';
  const keys=Object.keys(SET.abbr||{}).sort((a,b)=>a.localeCompare(b,'uk'));
  if(!keys.length)root.append(el('p',{class:'note'},'Скорочень поки немає.'));
  keys.forEach(k=>{const r=el('div',{class:'abbr'});r.append(el('code',null,'.'+k));
    const i=el('input',{type:'text','aria-label':'Фраза для .'+k});i.value=SET.abbr[k];i.addEventListener('input',()=>{SET.abbr[k]=i.value;saveSet();});
    const x=el('button',{type:'button',class:'btn sm danger','aria-label':'Видалити .'+k},'×');x.onclick=()=>{delete SET.abbr[k];saveSet();renderAbbr();};
    r.append(i,x);root.append(r);});
}
$('sAbbrAdd').onclick=()=>{
  const k=$('sAbbrKey').value.trim().replace(/^\./,'').toLowerCase(),v=$('sAbbrVal').value.trim();
  if(!/^[\p{L}\d-]{1,20}$/u.test(k)){toast('Скорочення — одне слово без пробілів, напр. кт');return;}
  if(!v){toast('Напишіть фразу');return;}
  SET.abbr[k]=v;saveSet();$('sAbbrKey').value='';$('sAbbrVal').value='';renderAbbr();toast(`Додано .${k}`);
};

/* стрілки по кнопках: ←→ — у межах групи, ↑↓ — до попередньої / наступної групи (без десятків Tab) */
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||!/^Arrow(Left|Right|Up|Down)$/.test(e.key))return;
  const b=e.target;if(!b||b.tagName!=='BUTTON')return;const grp=b.closest('.group, .chips, .seg');if(!grp||!grp.closest('#zones, #sec-concl, #sec-rec, #sec-study, #statusRow'))return;
  const vis=x=>x.offsetParent!==null&&!x.disabled;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const bs=[...grp.querySelectorAll('button')].filter(vis);const i=bs.indexOf(b);const n=bs[i+(e.key==='ArrowRight'?1:-1)];if(n){e.preventDefault();n.focus();}return;}
  if(grp.classList.contains('seg'))return;
  const scope=grp.closest('.zone')||grp.closest('.card');if(!scope)return;
  const groups=[...scope.querySelectorAll('.group, .chips')].filter(g=>[...g.querySelectorAll('button,input')].some(vis));const gi=groups.indexOf(grp);
  const ng=groups[gi+(e.key==='ArrowDown'?1:-1)];if(!ng)return;const f=[...ng.querySelectorAll('button,input')].find(vis);if(f){e.preventDefault();f.focus();}
});
