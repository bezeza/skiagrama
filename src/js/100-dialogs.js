/* ===== Вікна: пошук Ctrl+K, розділи (телефон), довідка, знайомство, що нового ===== */
let dlgOnClose=null;
let dlgReturn=null;
function openDlg(build,onClose){if($('dlg').hidden)dlgReturn=document.activeElement;const box=$('dlgBox');box.textContent='';build(box);$('dlg').hidden=false;dlgOnClose=onClose||null;const af=box.querySelector('[data-autofocus]');if(af)af.focus();}
function closeDlg(){$('dlg').hidden=true;$('dlgBox').textContent='';const f=dlgOnClose;dlgOnClose=null;if(f)f();const r=dlgReturn;dlgReturn=null;if(r&&r!==document.body&&document.body.contains(r)&&(!document.activeElement||document.activeElement===document.body))r.focus({preventScroll:true});}
$('dlg').addEventListener('click',e=>{if(e.target===$('dlg'))closeDlg();});
const dlgHead=(box,title)=>{const r=el('div',{class:'trow'});r.append(el('h2',null,title),el('span',{style:'flex:1'}));const c=el('button',{type:'button',class:'btn'},'Закрити');c.onclick=closeDlg;r.append(c);box.append(r);};

/* пошук */
function searchItems(){
  const L=[];const act=(t,go,s)=>L.push({k:'Дія',t,s:s||'',go});
  visibleZones().forEach((d,i)=>L.push({k:'Зона',t:d.name,s:String(i+1),go:()=>{showView('desc');const z=S.zones[d.id];if(z.st!=='c'){tick();z.st='c';}openZone(d.id,true);renderAll();}}));
  Object.keys(STUDIES).forEach(k=>L.push({k:'Дослідження',t:STUDIES[k].n,go:()=>{showView('desc');switchStudy(k);}}));
  conclChipList().forEach(t=>L.push({k:'Висновок',t,go:()=>{showView('desc');if(!S.concl.includes(t)){tick();S.concl.push(t);renderAll();}toast('Додано у висновок');}}));
  effList('rec').map(x=>x.t).forEach(t=>L.push({k:'Рекомендація',t,go:()=>{showView('desc');if(!S.recs.includes(t)){tick();S.recs.push(t);renderAll();}toast('Додано рекомендацію');}}));
  TPL.filter(t=>t.study===S.study).forEach(t=>L.push({k:'Шаблон',t:t.name,go:()=>{showView('desc');tick();applyTpl(t);}}));
  act('Копіювати протокол',copyAll,'Ctrl+Enter');act('Готово — зберегти в архів',done,'Ctrl+S');act('Друк',()=>$('printBtn').click(),'Ctrl+P');
  act('Норма всюди',allNorm,'Alt+N');act('Прийняти підказки висновку',acceptSugs,'Alt+Enter');act('Новий пацієнт',()=>$('newPatient').click());act('Скасувати останню дію',undo,'Ctrl+Z');act('Повторити дію',redo,'Ctrl+Y');
  act('Як на папері',()=>$('paperBtn').click());act('Правити текст протоколу',()=>{if(document.body.classList.contains('sheet')===false&&window.innerWidth<=760)openSheet();if(paperView)$('paperBtn').click();const t=$('ptext');if(t){t.focus();}});
  BLANK_ORDER.forEach(b=>act(`Бланк ${b} · ${BLANKS[b].n}`,()=>{tick();S.blank=b;renderSide();}));act('Пакет фраз',()=>showView('settings'));act('Скорочення',()=>{showView('settings');setTimeout(()=>$('abbrCard').scrollIntoView({block:'start'}),50);});act('Список на дообстеження',()=>{showView('archive');$('aStatus').value='d';renderArchive();});act('Ще дослідження цьому пацієнту',sameStudyPatient);act('Терміново — критична знахідка',()=>$('urgBtn').click());act('Вивантажити архів в Excel',()=>{showView('archive');$('aCsv').click();});act('Зберегти як PDF',()=>$('pdfBtn').click());act('Пам’ятка (1 сторінка)',openMemo);
  act('Архів',()=>showView('archive'));act('На контроль',()=>showView('archive'));act('Налаштування',()=>showView('settings'));act('Довідка',openHelp);act('Помилка чи ідея — повідомити розробнику',openFeedback);
  act('Папка даних',()=>showView('settings'));act('Пробний аркуш друку',testSheet);act('Знайомство: дані лікаря',openWelcome);
  return L;
}
function openSearch(){
  if(!$('dlg').hidden)return;
  const items=searchItems();let sel=0,shown=[];
  openDlg(box=>{
    const q=el('input',{type:'search',placeholder:'Що знайти? Зону, висновок, дію…','aria-label':'Пошук'});const list=el('div',{class:'cmdlist',role:'listbox'});
    const nz=t=>String(t).toLowerCase().replace(/[’’']/g,'');
    const draw=()=>{const words=nz(q.value.trim()).split(/\s+/).filter(Boolean);
      shown=words.length?items.filter(it=>{const x=nz(it.t+' '+it.k+' '+(it.s||''));return words.every(w=>x.includes(w));}).slice(0,40):items.filter(it=>it.k==='Дія'||it.k==='Зона');
      sel=Math.min(sel,Math.max(0,shown.length-1));list.textContent='';
      if(!shown.length)list.append(el('p',{class:'note'},'Нічого не знайдено'));
      shown.forEach((it,i)=>{const b=el('button',{type:'button',class:'cmdi'+(i===sel?' on':''),role:'option'});b.append(el('span',{class:'k'},it.k),el('span',null,it.t));if(it.s)b.append(el('span',{class:'s'},it.s));b.onclick=()=>run(it);list.append(b);});};
    const run=it=>{closeDlg();it.go();};
    q.addEventListener('input',()=>{sel=0;draw();});
    q.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){sel=Math.min(sel+1,shown.length-1);draw();e.preventDefault();}else if(e.key==='ArrowUp'){sel=Math.max(sel-1,0);draw();e.preventDefault();}else if(e.key==='Enter'&&shown[sel]){e.preventDefault();run(shown[sel]);}});
    box.append(q,list,el('p',{class:'note'},'↑↓ — вибір, Enter — відкрити, Esc — закрити.'));draw();q.dataset.autofocus='1';
  });
}
$('navSearch').onclick=openSearch;

/* розділи на телефоні */
function openNavSheet(){
  openDlg(box=>{dlgHead(box,'Розділи');const l=el('div',{class:'nsl navsheet'});
    const sec=t=>l.append(el('div',{class:'nk'},t));
    const item=(t,dot,go)=>{const b=el('button',{type:'button'});if(dot)b.append(el('span',{class:'dot '+dot,'aria-hidden':'true'}));b.append(document.createTextNode(t));b.onclick=()=>{closeDlg();go();};l.append(b);};
    sec('Пацієнт');item('Дані і знімок',null,()=>$('sec-patient').scrollIntoView({block:'start'}));
    sec('Опис');visibleZones().forEach(d=>item(d.name,zoneState(d),()=>gotoZone(d.id)));
    sec('Висновок');if(activeMeas().length)item('Вимірювання',null,()=>$('measPanel').scrollIntoView({block:'start'}));item('Висновок',null,()=>$('sec-concl').scrollIntoView({block:'start'}));item('Рекомендації',null,()=>$('sec-rec').scrollIntoView({block:'start'}));
    sec('Інструменти');item('Архів і «На контроль»',null,()=>showView('archive'));item('Налаштування',null,()=>showView('settings'));item('Довідка',null,openHelp);
    box.append(l);});
}

/* довідка */
function openHelp(){
  openDlg(box=>{dlgHead(box,'Довідка');const h=el('div',{class:'help'});
    h.innerHTML=`<p class="note">Skiagrama ${esc(VERSION)} · бета-версія: основні функції готові, програма проходить перевірку в реальній роботі. Повідомляйте про помилки та ідеї. Програма готує текст протоколу; перевіряє й підписує лікар.</p>
<h3>Як скласти протокол</h3><ol>
<li>Угорі — пацієнт: ПІБ · вік (або дата народження) · № · дата · ЕЕД. Enter переводить до наступного поля.</li>
<li>«Дослідження»: ОГК, ФГ, кістки, хребет, ОЧП, череп; проєкції.</li>
<li>«Норма всюди», потім у зміненій зоні — «Зміни» і кнопки. «—» — не згадувати зону.</li>
<li>Висновок: прийміть підказку, виберіть кнопку або напишіть свій.</li>
<li>Над протоколом: <b>Готово</b> — в архів (цифра на кнопці — скільки зауважень), <b>Копіювати ▾</b> — для h24 (частинами — стрілка), <b>Друк</b>, <b>Зберегти як ▾</b> — PDF, Word, LibreOffice.</li></ol>
<h3>Корисне</h3><ul>
<li>Текст протоколу правиться прямо в ньому. Alt+клік по реченню — відкрити його зону.</li>
<li>Кілька досліджень одному пацієнту (напр. ОГК і коліно) — після «Готово» натисніть «+ Ще дослідження цьому пацієнту»: окремий протокол зі своїм № і ЕЕД, дані пацієнта лишаються.</li>
<li>«Терміново» біля висновку — для критичних знахідок; в архіві такі протоколи підсвічені, доки не натиснете «Повідомлено».</li>
<li><b>Розділи</b> під рядком пацієнта: клік — перехід до пацієнта, дослідження, опису, висновку чи рекомендацій.</li>
<li><b>Ще дослідження цьому пацієнту</b>: «Новий пацієнт ▾» вгорі або кнопка праворуч від «Додатково».</li>
<li><b>Ширина протоколу</b>: потягніть ручку між кнопками й протоколом; подвійний клік по ній — як було.</li>
<li><b>Зберегти як</b> → Word або LibreOffice — бланк, який можна правити й друкувати з Word.</li>
<li><b>Подвійне клацання</b> по реченню протоколу міняє бік: справа ↔ зліва (у зоні, у висновку, у назві дослідження кістки).</li>
<li><b>Скорочення</b>: <code>.кт</code> + пробіл → «КТ ОГК для уточнення характеру змін». Свої — у «Налаштуваннях» → «Скорочення». <code>__</code> — пропуск, <b>Tab</b> — до наступного.</li>
<li>Програма попереджає, якщо в описі справа, а у висновку зліва; якщо у висновку патологія, а її зона в нормі; якщо лишилися пропуски «__».</li>
<li><b>Помилка чи ідея</b> — кнопка-хмаринка вгорі: відгук записується в програму і в папку даних («відгуки.txt»); скопіюйте його й надішліть розробнику.</li>
<li><b>Результат</b> біля висновку: норма / патологія / дообстеження — визначається сам, можна змінити. В архіві — фільтр і «Список на дообстеження».</li>
<li>Бланк A, B, C, D — над аркушем; «Як на папері» показує, як ляже на папір. Реквізити закладу — у «Налаштуваннях».</li>
<li>Олівець біля зони, висновку чи рекомендацій — змінити кнопки під себе.</li>
<li>«Архів»: друк пачкою, «На контроль», підсумок дня, вивантаження в Excel.</li>
<li>Папка даних («Налаштування»): архів, копія кожного протоколу як аркуша й налаштування зберігаються на диск самі.</li></ul>
<h3>Гарячі клавіші</h3>
<div class="keys"><span><kbd class="k">Ctrl</kbd>+<kbd class="k">Enter</kbd></span><span>копіювати протокол</span><span><kbd class="k">Ctrl</kbd>+<kbd class="k">S</kbd></span><span>готово — зберегти в архів</span><span><kbd class="k">Ctrl</kbd>+<kbd class="k">P</kbd></span><span>друк</span><span><kbd class="k">Ctrl</kbd>+<kbd class="k">K</kbd></span><span>пошук</span><span><kbd class="k">Ctrl</kbd>+<kbd class="k">Z</kbd></span><span>скасувати</span><span><kbd class="k">Ctrl</kbd>+<kbd class="k">Y</kbd> або <kbd class="k">Ctrl</kbd>+<kbd class="k">Shift</kbd>+<kbd class="k">Z</kbd></span><span>повторити</span><span><kbd class="k">Alt</kbd>+<kbd class="k">N</kbd></span><span>норма всюди</span><span><kbd class="k">Alt</kbd>+<kbd class="k">Enter</kbd></span><span>прийняти підказки висновку</span><span><kbd class="k">←</kbd><kbd class="k">→</kbd><kbd class="k">↑</kbd><kbd class="k">↓</kbd></span><span>по кнопках зони: ←→ у групі, ↑↓ між групами; пробіл — вибрати</span><span><kbd class="k">1</kbd>…<kbd class="k">9</kbd></span><span>зона: норма ↔ зміни</span><span><kbd class="k">Ctrl</kbd>+<kbd class="k">+</kbd> / <kbd class="k">−</kbd></span><span>масштаб</span></div>`;
    box.append(h);const r=el('div',{class:'trow'});const w=el('button',{type:'button',class:'btn'},'Що нового');w.onclick=()=>{closeDlg();openWhatsNew();};const fbb=el('button',{type:'button',class:'btn'},'Помилка чи ідея');fbb.onclick=()=>{closeDlg();openFeedback();};const m=el('button',{type:'button',class:'btn'},'Пам’ятка на 1 сторінку');m.onclick=()=>{closeDlg();openMemo();};r.append(w,m,fbb);box.append(r);});
}
$('navHelp').onclick=openHelp;

/* що нового */
function openWhatsNew(){
  openDlg(box=>{dlgHead(box,'Що нового');CHANGELOG.forEach(([v,items])=>{box.append(el('h3',{style:'margin:4px 0 0;font-size:15px'},'Версія '+v));const ul=el('ul',{class:'steps'});items.forEach(t=>ul.append(el('li',null,t)));box.append(ul);});},
    ()=>{SET.seenVersion=VERSION;saveSet();});
}
$('vBadge').onclick=openWhatsNew;

/* знайомство */
function openWelcome(){
  openDlg(box=>{
    box.append(el('h2',null,'Вітаю! Кілька даних — один раз'));
    box.append(el('p',{class:'note'},'Вони підставлятимуться в протоколи і зберігаються лише на цьому пристрої. Усе можна змінити пізніше в «Налаштуваннях». Skiagrama — бета-версія: текст протоколу перевіряє й підписує лікар.'));
    const tips=el('ol',{class:'steps'});[['Встановіть програму','у Chrome чи Edge — значок «Встановити» в адресному рядку або кнопка вгорі. Тоді вона відкривається як звичайна програма і оновлюється сама, коли є інтернет.'],['Оберіть папку даних','кнопка нижче, напр. «D:\\Skiagrama». Туди самі зберігатимуться архів, копії протоколів і налаштування.'],['Реквізити закладу','— у «Налаштуваннях» → «Бланк і реквізити закладу».']].forEach(([b,t])=>{const li=el('li');li.append(el('b',null,b+' '),document.createTextNode(t));tips.append(li);});box.append(tips);
    const f=el('div',{class:'fields'});
    const mk=(lab,val,ph,cls,mode)=>{const l=el('label',{class:'f'+(cls?' '+cls:'')},lab);const i=el('input',{type:'text',placeholder:ph||'',inputmode:mode||null});i.value=val||'';l.append(i);f.append(l);return i;};
    const d=mk('ПІБ лікаря (для підпису)',SET.doctor,'Прізвище І. Б.','wide');
    const e1=mk('ЕЕД ОГК, мЗв',SET.eed.ogk,'0,35',null,'decimal');const e2=mk('ЕЕД флюорографії, мЗв',SET.eed.fg,'',null,'decimal');
    box.append(f);
    const r=el('div',{class:'trow'});
    if(FOLDER_SUPPORTED){const fb=el('button',{type:'button',class:'btn'},folderOK()?'Папку даних підключено ✓':'Обрати папку даних');fb.onclick=async()=>{await folderPick();fb.textContent=folderOK()?'Папку даних підключено ✓':'Обрати папку даних';};r.append(fb);}
    const t=el('button',{type:'button',class:'btn'},'Пробний аркуш друку');t.onclick=()=>{save();closeDlg();testSheet();};r.append(t);
    box.append(r);
    const save=()=>{SET.doctor=d.value.trim();SET.eed.ogk=e1.value.trim();SET.eed.fg=e2.value.trim();SET.welcomed=true;SET.seenVersion=VERSION;saveSet();setEedDefault();renderSide();};
    const r2=el('div',{class:'trow'});const ok=el('button',{type:'button',class:'btn primary'},'Готово');ok.onclick=()=>{save();closeDlg();toast('Збережено');};
    const skip=el('button',{type:'button',class:'btn'},'Пропустити — заповню пізніше');skip.onclick=()=>{SET.welcomed=true;SET.seenVersion=VERSION;saveSet();closeDlg();};
    r2.append(ok,skip);box.append(r2);setTimeout(()=>d.focus(),30);
  });
}

/* пам’ятка на 1 сторінку: окремий файл поруч (сайт) або вбудована (офлайн-файл) */
function openMemo(){
  const html=$('memoTpl').innerHTML;
  openDlg(box=>{dlgHead(box,'Пам’ятка');const r=el('div',{class:'trow'});const pr=el('button',{type:'button',class:'btn primary'},'Друкувати (1 аркуш A4)');
    pr.onclick=()=>{closeDlg();runPrint(`<div class="ppage full">${html}</div>`);};r.append(pr,el('span',{class:'note'},'Повісьте біля робочого місця рентгенолога й лаборанта.'));box.append(r);
    const v=el('div',{class:'memo-view'});v.innerHTML=html;box.append(v);});
}
