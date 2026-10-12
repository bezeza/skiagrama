/* ===== «Помилка чи ідея»: записати відгук для розробника =====
   Інтернет і сервер не потрібні: відгук зберігається в програмі, у папці даних (файл «відгуки.txt»),
   його можна скопіювати й переслати розробнику в месенджер або зберегти файлом.
   Дані пацієнта автоматично НЕ додаються — лише версія, екран і вид дослідження. */
const FB_KEY='skiagrama.feedback.v1';
let FB=store.get(FB_KEY,[]);if(!Array.isArray(FB))FB=[];
const saveFB=()=>{store.set(FB_KEY,FB);folderSoon();};
const lastErrors=[];
window.addEventListener('error',e=>{lastErrors.push(String(e.message||e).slice(0,200));if(lastErrors.length>3)lastErrors.shift();});
const FB_KIND={bug:'Помилка',idea:'Ідея',ux:'Незручно'};
function fbContext(){
  const view=['desc','archive','settings'].find(k=>!$('view-'+k).hidden)||'';
  return {version:VERSION,view:{desc:'Опис',archive:'Архів',settings:'Налаштування'}[view]||view,study:STUDIES[S.study]?STUDIES[S.study].n:S.study,
    screen:`${window.innerWidth}×${window.innerHeight}`,theme:SET.theme,blank:curBlank(),folder:folderOK(),
    browser:(navigator.userAgent.match(/(Edg|Chrome|Firefox|Safari)\/[\d.]+/)||[''])[0],errors:lastErrors.slice()};
}
function fbLine(f){const c=f.ctx||{};const dt=new Date(f.ts);
  return `[${fmtD(dt.toISOString().slice(0,10))} ${pad(dt.getHours())}:${pad(dt.getMinutes())}] ${FB_KIND[f.kind]||f.kind}${f.who?' · '+f.who:''}\n${f.text}\n`+
    `— Skiagrama ${c.version||''} · ${c.view||''} · ${c.study||''} · екран ${c.screen||''} · ${c.browser||''}${c.errors&&c.errors.length?' · помилки: '+c.errors.join(' | '):''}`;}
const fbText=list=>'Skiagrama — відгуки для розробника\n\n'+list.map(fbLine).join('\n\n')+'\n';
async function fbToFolder(){if(!folderOK())return;try{const fh=await dirH.getFileHandle('відгуки.txt',{create:true});const w=await fh.createWritable();await w.write(fbText(FB));await w.close();}catch(e){console.warn('feedback',e);}}
async function fbCopy(list){const t=fbText(list);try{await navigator.clipboard.writeText(t);return true;}catch(e){const ta=el('textarea');ta.value=t;document.body.append(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;}}
const PII_RE=/(?<!\p{L})[А-ЯІЇЄҐ][а-яіїєґ’']+\s+[А-ЯІЇЄҐ]\.\s?[А-ЯІЇЄҐ]\./u;
function openFeedback(){
  openDlg(box=>{dlgHead(box,'Помилка чи ідея');
    box.append(el('p',{class:'note'},'Опишіть, що сталося або що змінити. Відгук запишеться в програму і в папку даних (файл «відгуки.txt»). Потім скопіюйте його і надішліть розробнику в месенджер — або збережіть файлом.'));
    let kind='bug';const seg=el('div',{class:'seg',role:'group','aria-label':'Що це'});
    Object.keys(FB_KIND).forEach(k=>{const b=el('button',{type:'button','aria-pressed':String(k===kind),'data-k':k});b.append(icEl({bug:'bug',idea:'idea',ux:'warn'}[k]),document.createTextNode(FB_KIND[k]));
      b.onclick=()=>{kind=k;seg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.k===k)));};seg.append(b);});
    box.append(seg);
    const ta=el('textarea',{id:'fbText',rows:'5',placeholder:'Напр.: «На бланку C довгий висновок заходить на підпис» або «Додати кнопку “плевральні спайки”»','aria-label':'Текст відгуку'});
    const who=el('input',{id:'fbWho',type:'text',placeholder:'Хто пише (необов’язково)','aria-label':'Хто пише'});who.value=SET.doctor||'';
    const warn=el('p',{class:'note warnt',hidden:''},'Схоже, у тексті є ПІБ. Не пишіть дані пацієнтів — лише № знімка, якщо треба.');
    ta.addEventListener('input',()=>{warn.hidden=!PII_RE.test(ta.value);});
    box.append(ta,warn,who);
    const auto=fbContext();box.append(el('p',{class:'note'},`Автоматично додається (без даних пацієнта): Skiagrama ${auto.version}, розділ «${auto.view}», ${auto.study}, екран ${auto.screen}${auto.errors.length?', останні помилки програми':''}.`));
    const r=el('div',{class:'trow'});
    const save=el('button',{type:'button',class:'btn primary',id:'fbSave'});save.append(icEl('save'),document.createTextNode('Записати'));
    save.onclick=async()=>{const text=ta.value.trim();if(!text){ta.focus();toast('Напишіть кілька слів');return;}
      const f={id:'f'+Date.now().toString(36),ts:Date.now(),kind,text,who:who.value.trim(),ctx:fbContext(),sent:false};FB.push(f);saveFB();await fbToFolder();
      closeDlg();fbAfter(f);};
    r.append(save);box.append(r);
    const unsent=FB.filter(f=>!f.sent);
    if(FB.length){const h=el('div',{class:'fblist'});h.append(el('h3',null,`Записані відгуки: ${FB.length}${unsent.length?` (не передано: ${unsent.length})`:''}`));
      FB.slice(-5).reverse().forEach(f=>{const it=el('div',{class:'it'});it.append(el('span',{class:'pill '+(f.sent?'o':'w')},f.sent?'передано':'не передано'),el('span',{class:'t'},`${FB_KIND[f.kind]||''}: ${f.text.slice(0,90)}${f.text.length>90?'…':''}`));h.append(it);});
      const t=el('div',{class:'trow'});
      const cp=el('button',{type:'button',class:'btn',id:'fbCopyAll'});cp.append(icEl('copy'),document.createTextNode(unsent.length?`Копіювати непередані (${unsent.length})`:'Копіювати всі'));
      cp.onclick=async()=>{const list=unsent.length?unsent:FB;if(await fbCopy(list)){list.forEach(f=>f.sent=true);saveFB();toast('Скопійовано — вставте в месенджер розробнику');closeDlg();}else toast('Не вдалося скопіювати');};
      const dl=el('button',{type:'button',class:'btn',id:'fbFile'});dl.append(icEl('down'),document.createTextNode('Зберегти файлом'));
      dl.onclick=()=>{if(download(`Skiagrama_відгуки_${today()}.txt`,fbText(FB),'text/plain')){FB.forEach(f=>f.sent=true);saveFB();toast('Файл збережено — передайте його розробнику');closeDlg();}};
      t.append(cp,dl);h.append(t);box.append(h);}
    setTimeout(()=>ta.focus(),30);
  });
}
function fbAfter(f){
  openDlg(box=>{dlgHead(box,'Записано');
    box.append(el('p',null,folderOK()?`Відгук збережено в програмі й у папці даних «${folderName()}» → «відгуки.txt».`:'Відгук збережено в програмі. Підключіть папку даних — і відгуки ще й писатимуться у файл «відгуки.txt».'));
    box.append(el('p',{class:'note'},'Щоб розробник його отримав — скопіюйте і надішліть у месенджер, або збережіть файлом.'));
    const r=el('div',{class:'trow'});
    const cp=el('button',{type:'button',class:'btn primary',id:'fbCopyOne'});cp.append(icEl('copy'),document.createTextNode('Копіювати для розробника'));
    cp.onclick=async()=>{if(await fbCopy([f])){f.sent=true;saveFB();toast('Скопійовано — вставте в месенджер');closeDlg();}else toast('Не вдалося скопіювати');};
    const gh=el('a',{class:'btn',href:'https://github.com/bezeza/skiagrama/issues/new?title='+encodeURIComponent(`${FB_KIND[f.kind]}: ${f.text.slice(0,60)}`)+'&body='+encodeURIComponent(fbLine(f)),target:'_blank',rel:'noopener',title:'Потрібен інтернет і акаунт GitHub'},'На GitHub');
    gh.onclick=()=>{f.sent=true;saveFB();};
    const later=el('button',{type:'button',class:'btn'},'Пізніше');later.onclick=closeDlg;
    r.append(cp,gh,later);box.append(r);
  });
}
$('navFeedback').onclick=openFeedback;
