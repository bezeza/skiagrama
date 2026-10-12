// Автоматичні перевірки Skiagrama: node tests/run.mjs (потрібен Playwright з Chromium)
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const FILE='file://'+fileURLToPath(new URL('../skiagrama.html',import.meta.url));
let pass=0,fail=0;
const ok=(cond,name)=>{if(cond){pass++;console.log('  ✓',name);}else{fail++;console.log('  ✗',name);}};
const paper=p=>p.textContent('#paper');

const b=await chromium.launch();
for(const vp of [{width:1440,height:900,name:'ПК'},{width:390,height:844,name:'телефон'}]){
  console.log(`\n${vp.name} (${vp.width}px)`);
  const ctx=await b.newContext({viewport:vp});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(FILE);
  ok(await p.waitForSelector('#dlg:not([hidden])',{timeout:3000}).then(()=>true,()=>false),'знайомство при першому запуску');
  await p.click('text=Пропустити — заповню пізніше');
  const mob=vp.width<900;const openSheet=async()=>{if(mob)await p.click('#mbarOpen');};const closeSheet=async()=>{if(mob)await p.click('#closeSheet');};
  await p.click('#allNorm');
  let t=await paper(p);
  ok(t.includes('Інфільтративних тіней не виявлено.')&&t.includes('Rö-ч: Без патологічних змін.'),'норма всюди: ОГК');
  // пневмонія
  await p.click('#zone-infil .seg button:nth-child(2)');
  await p.click('#zone-infil >> text=обидві');await p.click('#zone-infil >> text=нижньо-медіальні поля');await p.click('#zone-infil >> text=інтенсивні зливні');
  ok((await p.textContent('#sugs')).includes('Двобічна вогнищево-зливна пневмонія'),'підказка: двобічна пневмонія');
  await p.click('#sugs >> text=Прийняти');
  t=await paper(p);ok(t.includes('В нижньо-медіальних легеневих полях обох легень визначаються інтенсивні зливні тіні.'),'фраза зони інфільтрації');
  ok(t.includes('Rö-ч: Двобічна вогнищево-зливна пневмонія.'),'висновок у протоколі');
  // мої кнопки
  await p.click('#zone-roots .seg button:nth-child(2)');
  await p.fill('#zone-roots .myadd input','кальцинати в лівому корені');await p.click('#zone-roots .myadd button');
  ok((await paper(p)).includes('Кальцинати в лівому корені.'),'моя кнопка потрапляє в протокол');
  // скасування
  await p.click('#navUndo').catch(async()=>{await p.keyboard.press('Control+z');});
  if(mob){await p.keyboard.press('Control+z');}
  ok(!(await paper(p)).includes('Кальцинати в лівому корені.'),'скасування останньої дії');
  // перевірка перед підписом
  ok((await p.textContent('#checkSum')).includes('зауважень'),'перевірка показує зауваження');
  ok(await p.evaluate(()=>!document.getElementById('doneCnt').hidden)&&await p.evaluate(()=>document.getElementById('pName').classList.contains('miss')),'лічильник на «Готово» і підсвічене порожнє поле');
  // хребет і Кобб
  await p.click('#studyTabs >> text=Хребет');
  await p.fill('#meas-cobb input >> nth=0','18');
  ok((await p.textContent('#sugs')).includes('Сколіоз II ступеня'),'Кобб 18° → сколіоз II ступеня');
  // як на папері
  await openSheet();await p.click('#paperBtn');
  ok((await paper(p)).includes('пів аркуша'),'«Як на папері» показує, як ляже протокол');
  await p.click('#paperBtn');await closeSheet();
  // флюорографія: потоковий режим
  await p.click('#studyTabs >> text=ФГ');
  await p.fill('#pEed','0,05');await p.fill('#pName','Тест Т.');await p.fill('#pAge','30');await p.fill('#pNum','20');
  await openSheet();await p.click('#doneBtn');
  ok((await p.inputValue('#pName'))===''&&(await p.inputValue('#pNum'))==='21','потік ФГ: наступний пацієнт № 21');
  ok((await p.inputValue('#pEed'))==='0,05','потік ФГ: ЕЕД збережено');
  if(mob)await closeSheet().catch(()=>{});
  // пошук
  if(!mob){await p.keyboard.press('Control+k');await p.fill('#dlg input','корені');await p.keyboard.press('Enter');
    ok(await p.isVisible('#zone-roots .myadd'),'Ctrl+K → зона «Корені»');}
  // архів і друк пачкою
  if(mob)await p.click('#mbarNav'),await p.click('#dlg >> text=Архів і «На контроль»');else await p.click('#navArchive');
  await p.click('#demoA');await p.click('#aClear');await p.click('#aSelUnprinted');await p.click('#aPrint');
  const sum=await p.textContent('#pmSummary');ok(/Аркушів A4: \d/.test(sum),'друк пачкою: '+sum);
  await p.click('#pmClose');
  ok((await p.textContent('#ctrlList')).includes('Пацієнт А.'),'«На контроль»: настав термін');
  ok(errs.length===0,'без помилок JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await ctx.close();
}

/* ---------- 0.3: модульні перевірки й нові функції (ПК) ---------- */
{
  console.log('\nМодульні перевірки і 0.3');
  const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(FILE);await p.waitForSelector('#dlg:not([hidden])');await p.click('text=Пропустити — заповню пізніше');
  // захист шаблонів: усі зони, усі кнопки
  const bad=await p.evaluate(()=>{const K=window.__skg;const out=[];let n=0;
    for(const st of Object.keys(K.STUDIES)){K.study(st);
      for(const mode of ['ppn','cherep']){if(st==='skull'){K.S.skull=mode;}
        for(const d of K.STUDIES[st].zones){if(d.mode&&d.mode!==K.S.skull)continue;
          const base={};d.groups.forEach(g=>{if(g.req&&g.type!=='text')base[g.id]=g.many?[g.o[0][0]]:g.o[0][0];if(g.type==='text'&&g.req)base[g.id]='1';});
          const variants=[{}, base];
          d.groups.forEach(g=>{if(g.type==='text'){variants.push(Object.assign({},base,{[g.id]:'тест'}));return;}
            g.o.forEach(o=>variants.push(Object.assign({},base,{[g.id]:g.many?[o[0]]:o[0]})));
            if(g.many)variants.push(Object.assign({},base,{[g.id]:g.o.map(o=>o[0])}));});
          const all={};d.groups.forEach(g=>{all[g.id]=g.type==='text'?'тест':g.many?g.o.map(o=>o[0]):g.o[g.o.length-1][0];});variants.push(all);
          for(const sel of variants){K.S.zones[d.id]={st:'c',sel:JSON.parse(JSON.stringify(sel))};const t=K.zoneText(d);n++;
            if(/[{}|]|\.\.|  | ,|\s\.$/.test(t)||!t.trim())out.push(st+'.'+d.id+': «'+t+'»');}
          K.S.zones[d.id]={st:'n',sel:{}};}
        if(st!=='skull')break;}}
    return {n,out:out.slice(0,8),cnt:out.length};});
  ok(bad.cnt===0,`шаблони зон: ${bad.n} варіантів без «{», «|», «..», подвійних пробілів`+(bad.cnt?' — '+bad.out.join(' / '):''));
  // suggestions()
  await p.evaluate(()=>{const K=window.__skg;K.study('ogk');K.setZones({infil:{st:'c',sel:{side:'права',loc:'нижні',char:'інфільтр',seg:['S9','S10']}}});});
  const sg=await p.evaluate(()=>window.__skg.suggestions().map(x=>x[0]));
  ok(sg.includes('Правобічна пневмонія (S9, S10)'),'suggestions(): правобічна пневмонія (S9, S10)');
  // вимірювання поза межами
  await p.click('#studyTabs >> text=Хребет');await p.fill('#meas-cobb input >> nth=0','300');
  ok(!(await paper(p)).includes('300')&&(await p.textContent('#checkList')).includes('поза можливими межами'),'Кобб 300° — не в протоколі, попередження');
  await p.fill('#meas-cobb input >> nth=0','');
  // повтор дії
  await p.click('#studyTabs >> text=ОГК');await p.click('#allNorm');
  await p.click('#zone-sinus .seg button:nth-child(3)');
  const t1=await paper(p);await p.keyboard.press('Control+z');const t2=await paper(p);await p.keyboard.press('Control+y');const t3=await paper(p);
  ok(t1!==t2&&t1===t3,'Ctrl+Z, потім Ctrl+Y повертає дію');
  await p.keyboard.press('Control+z');await p.keyboard.press('Control+Shift+z');ok((await paper(p))===t1,'Ctrl+Shift+Z теж повторює');
  // рядок пацієнта
  await p.fill('#pName','Коваленко Марія Іванівна');await p.fill('#pAge','72');await p.fill('#pNum','1025');
  ok((await p.textContent('#pSum')).startsWith('Коваленко М. І., 72 р. · № 1025 · '),'рядок пацієнта: '+await p.textContent('#pSum'));
  // правка прямо в тексті
  await p.click('#ptext .concl');await p.keyboard.press('End');await p.keyboard.type(' Додано вручну.');
  ok(await p.isVisible('#pman')&&(await p.evaluate(()=>window.__skg.S.manual||'')).includes('Додано вручну.'),'правка прямо в тексті позначається «відредаговано вручну»');
  await p.click('#pman button');ok(!(await paper(p)).includes('Додано вручну.')&&await p.isHidden('#pman'),'«Скинути правку» повертає автотекст');
  // Alt+клік відкриває зону
  await p.click('#ptext [data-zone="roots"]',{modifiers:['Alt']});ok(await p.isVisible('#zone-roots .myadd'),'Alt+клік по реченню відкриває зону');
  // редагування кнопок
  await p.click('#zone-infil .zpen');
  await p.fill('#zone-infil .erow[data-k="права"] input.elb','справа ✓');await p.fill('#zone-infil .erow[data-k="права"] input.eph','правої легені (ред.)');
  await p.click('#zone-infil .trow >> text=Готово');
  await p.click('#zone-infil .seg button:nth-child(2)');
  ok(await p.isVisible('#zone-infil .chip >> text=справа ✓'),'олівець: новий напис кнопки');
  await p.click('#zone-infil .chip >> text=справа ✓');ok((await paper(p)).includes('правої легені (ред.)'),'олівець: нова фраза йде в протокол');
  await p.click('#zone-infil .zpen');await p.fill('#zone-infil .egroup:nth-of-type(3) .erow.add input.elb','обидві базально').catch(()=>{});
  const pack=await p.evaluate(()=>JSON.stringify(window.__skg.phrasePack()));
  await p.click('#zone-infil .trow >> text=Повернути як було');await p.click('#zone-infil .trow >> text=Точно');
  ok(await p.isHidden('#zone-infil .zpen[aria-pressed="false"]').then(()=>true)&&!(await p.evaluate(()=>Object.keys(window.__skg.SET.btn).length)),'«Повернути як було» скидає зміни зони');
  await p.evaluate(s=>window.__skg.applyPhrasePack(JSON.parse(s)),pack);
  ok(await p.evaluate(()=>!!window.__skg.SET.btn['ogk.infil.side.права']),'пакет фраз: експорт → імпорт повертає зміни кнопок');
  await p.evaluate(()=>{window.__skg.SET.btn={};window.__skg.renderAll();});
  // бланки й автопідгонка
  await p.click('#allNorm');
  for(const bl of ['A','B','C','D']){await p.selectOption('#blankSel',bl);await p.click('#paperBtn');
    const tx=await paper(p);ok(tx.includes('Бланк '+bl)&&tx.includes('пів аркуша A4 ✓'),`бланк ${bl}: коротка норма вміщається в пів аркуша`);await p.click('#paperBtn');}
  const kinds=await p.evaluate(()=>{const K=window.__skg;const it=K.currentItem();const long=n=>({...it,doc:{...it.doc,body:Array(n).fill('Легеневий малюнок посилений, збагачений, деформований за рахунок інтерстиційного компонента в базальних відділах обох легень.')}});
    return [8,13,40].map(n=>{const c=K.classify(long(n));return c.kind+(c.cmp?'-cmp':'');}).join(',')+'|'+((K.blankAdvice({...long(13),blank:'A'})||{}).b||'');});
  const [kk,adv]=kinds.split('|');
  ok(/^half/.test(kk.split(',')[0])&&kk.split(',')[2]==='full','classify(): коротко — пів аркуша, дуже довго — цілий аркуш ('+kk+')');
  ok(kk.includes('cmp')||adv,'автопідгонка ущільнює або радить інший бланк ('+kk+', порада: '+(adv||'—')+')');
  await p.evaluate(()=>{const it=window.__skg.currentItem();});
  // новий пацієнт: курсор у ПІБ, Enter далі, вік з дати народження
  await p.click('#newPatient');
  ok(await p.waitForFunction(()=>document.activeElement.id==='pName',null,{timeout:2000}).then(()=>true,()=>false),'«Новий пацієнт» — курсор у полі ПІБ');
  await p.keyboard.type('Петренко О. В.');await p.keyboard.press('Enter');
  ok(await p.evaluate(()=>document.activeElement.id==='pAge'),'Enter: ПІБ → вік');
  const born='15.06.1954';await p.keyboard.type(born);await p.keyboard.press('Enter');
  const exp=await p.evaluate(b=>{const [d,m,y]=b.split('.').map(Number);const R=new Date(document.getElementById('pDate').value+'T12:00:00');let a=R.getFullYear()-y;if(R.getMonth()+1<m||(R.getMonth()+1===m&&R.getDate()<d))a--;return String(a);},born);
  ok((await p.inputValue('#pAge'))===exp&&await p.evaluate(()=>document.activeElement.id==='pNum'),`дата народження ${born} → вік ${exp}, Enter → №`);
  await p.keyboard.type('77');await p.keyboard.press('Enter');await p.keyboard.press('Enter');await p.keyboard.press('Enter');
  ok(await p.evaluate(()=>!!document.activeElement.closest('#projChips')),'Enter після ЕЕД → проєкції');
  await p.fill('#pAge','1960');await p.click('#pNum');ok((await p.inputValue('#pAge'))===String(new Date().getFullYear()-1960),'рік народження 1960 → вік');
  // свої висновки й рекомендації
  await p.click('#studyTabs >> text=ОГК');await p.click('#allNorm');
  await p.fill('#conclFree','Плевральні спайки справа');await p.click('#conclKeep');
  ok(await p.isVisible('#conclChips .chip >> text=Плевральні спайки справа')&&(await paper(p)).includes('Rö-ч: Плевральні спайки справа.'),'свій висновок: кнопка і в протоколі');
  ok((await p.inputValue('#conclFree'))==='','«Запамʼятати як кнопку» очищає поле');
  await p.fill('#conclFree','Кальцинат у корені');ok((await paper(p)).includes('Кальцинат у корені'),'свій висновок одразу йде в протокол');await p.fill('#conclFree','');
  await p.click('#conclTools >> text=Редагувати кнопки');
  await p.fill('#conclTools .erow[data-k="Емфізема легень"] input','Емфізема легень (буллезна)');
  await p.fill('#conclTools input[aria-label="Висновок норми"]','Органи грудної клітки без патології');
  await p.click('#conclTools .erow[data-k="Гідроторакс"] >> text=Сховати');
  await p.click('#conclTools >> text=Готово');
  ok(!(await p.isVisible('#conclChips .chip >> text=Гідроторакс'))&&await p.isVisible('#conclChips .chip >> text=Емфізема легень (буллезна)'),'олівець висновку: перейменувати, сховати');
  await p.evaluate(()=>{const S=window.__skg.S;S.concl=[];window.__skg.renderAll();});
  ok((await paper(p)).includes('Rö-ч: Органи грудної клітки без патології.'),'свій висновок норми');
  await p.click('#zone-pneum .seg button:nth-child(2)');await p.click('#zone-pneum >> text=підвищена');
  ok((await p.textContent('#sugs')).includes('Емфізема легень (буллезна)'),'підказка бере нову назву кнопки');
  await p.fill('#recFree','Rö-контроль через 3 тижні');await p.click('#recKeep');
  ok((await paper(p)).includes('Rö-контроль через 3 тижні'),'своя рекомендація');
  const pk=await p.evaluate(()=>window.__skg.phrasePack());
  ok(!!(pk.lists['concl.ogk']&&pk.lists['rec']&&pk.conclNorm.ogk),'пакет фраз містить висновки й рекомендації');
  {const q=await ctx.newPage();await q.goto(FILE);await q.click('#allNorm');
   ok(await q.isVisible('#conclChips .chip >> text=Плевральні спайки справа')&&(await paper(q)).includes('Органи грудної клітки без патології'),'свої висновки зберігаються після перезапуску');
   await q.click('#conclTools >> text=Редагувати кнопки');await q.click('#conclTools button >> text=Повернути як було');await q.click('#conclTools button >> text=Точно');
   ok(await q.isVisible('#conclChips .chip >> text=Гідроторакс')&&!(await q.isVisible('#conclChips .chip >> text=Плевральні спайки справа')),'«Повернути як було» для висновків');await q.close();}
  await p.click('#allNorm');
  // бічність і «Терміново»
  await p.click('#allNorm');await p.click('#zone-infil .seg button:nth-child(2)');for(const t of ['права','нижні поля','інфільтративні'])await p.click(`#zone-infil >> text=${t}`);
  await p.click('#conclChips .chip >> text=Лівобічна пневмонія');
  ok((await p.textContent('#checkList')).includes('Бічність'),'перевірка «право / ліво»: справа в описі, зліва у висновку');
  await p.click('#allNorm');await p.click('#urgBtn');
  ok((await paper(p)).includes('ТЕРМІНОВО')&&await p.evaluate(()=>window.__skg.docData().urgent===true),'мітка «Терміново» в протоколі');
  await p.click('#urgBtn');
  // пакет типових описів: кожен шаблон дає повний протокол без «…» і без зауважень по зонах
  const packRes=await p.evaluate(()=>{const K=window.__skg;const bad=[];let n=0;
    for(const t of K.PACKS[0].templates){K.study(t.study);K.applyTpl(t);n++;
      const txt=document.getElementById('paper').textContent;const w=[...document.querySelectorAll('#checkList li')].map(l=>l.textContent).filter(x=>/заповніть|Бічність|порожній|без патології|а зона|пропуски/.test(x));
      if(/[…{}|]/.test(txt.replace('Rö-ч: …',''))||w.length)bad.push(t.name+': '+(w.join(' ')||txt.slice(0,80)));}
    K.study('ogk');return {n,bad};});
  ok(packRes.bad.length===0,`пакет «Типові описи»: ${packRes.n} шаблонів дають повні протоколи`+(packRes.bad.length?' — '+packRes.bad.join(' / '):''));
  await p.click('#navSettings');await p.click('#packCatalog >> text=Переглянути й встановити');
  ok((await p.textContent('#dlg')).includes('не затверджено'),'перегляд пакета попереджає: чернетка');
  await p.click('#dlg >> text=Встановити');await p.click('#view-settings [data-back]');await p.click('#allNorm');
  ok(await p.isVisible('#tplRow >> text=Пневмонія справа, нижня частка'),'типові описи зʼявились у рядку «Шаблони»');
  await p.click('#tplRow >> text=Пневмонія справа, нижня частка');
  ok((await paper(p)).includes('В нижніх легеневих полях правої легені (S9, S10) визначаються інфільтративні тіні, з нечіткими контурами.'),'типовий опис заповнює зони одним кліком');
  await p.click('#navSettings');await p.click('#packUndo');await p.click('#packUndo');
  ok(await p.evaluate(()=>!window.__skg.TPL.some(t=>t.pack)),'«Повернути як було до пакета»');
  await p.click('#view-settings [data-back]');await p.click('#allNorm');
  // тема «Кабінет»
  await p.click('#navSettings');await p.selectOption('#sTheme','grey');
  ok((await p.evaluate(()=>getComputedStyle(document.body).backgroundColor))==='rgb(42, 43, 45)','тема «Кабінет»: темно-сірий фон');
  await p.selectOption('#sTheme','system');await p.click('#view-settings [data-back]');
  // памʼятка
  await p.click('#navHelp');await p.click('#dlg >> text=Памʼятка на 1 сторінку');ok((await p.textContent('#dlg')).includes('Протокол за 5 кроків'),'памʼятка відкривається з довідки');await p.click('#dlg >> text=Закрити');
  // збереження з бланком
  await p.fill('#pEed','0,35');await p.keyboard.press('Control+s');
  ok(await p.evaluate(()=>{const r=window.__skg.A.slice(-1)[0];return !!(r.doc&&r.blank);}),'архів зберігає дані для бланка');
  await p.click('#samePt');
  ok((await p.inputValue('#pName'))!==''&&(await p.inputValue('#pAge'))!==''&&await p.evaluate(()=>!document.getElementById('samePt')),'«Ще дослідження цьому пацієнту»: ПІБ і вік лишились, новий протокол');
  await p.click('#navArchive');const ds=await p.textContent('#dayBox');
  const dl=await Promise.all([p.waitForEvent('download',{timeout:5000}).catch(()=>null),p.click('#aCsv')]);
  const csv=dl[0]?require('fs').readFileSync(await dl[0].path(),'utf8'):'';
  ok(csv.startsWith('\ufeffДата;№;ПІБ')&&csv.split('\r\n').length>=2,'вивантаження архіву в Excel (CSV)');
  ok(/\d\s*протоколів сьогодні/.test(ds)&&ds.includes('не надруковано'),'підсумок дня в архіві: '+ds.replace(/\s+/g,' ').slice(0,80));
  ok(errs.length===0,'без помилок JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await ctx.close();
}
/* ---------- 0.4: швидкість, безпека висновку, результат ---------- */
{
  console.log('\n0.4: швидкість, безпека висновку, результат');
  const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(FILE);await p.waitForSelector('#dlg:not([hidden])');await p.click('text=Пропустити — заповню пізніше');
  const sw=await p.evaluate(()=>{const f=window.__skg.swapSide;return [f('правої легені'),f('Справа'),f('Правобічна пневмонія'),f('під лівим куполом'),f('правильної форми'),f('обох легень'),f('вліво')];});
  ok(sw.join('|')==='лівої легені|Зліва|Лівобічна пневмонія|під правим куполом|правильної форми|обох легень|вправо','справа ↔ зліва: заміна слів ('+sw.join(', ')+')');
  // подвійний клік по зоні та висновку
  await p.click('#allNorm');
  await p.evaluate(()=>{const K=window.__skg;K.setZones({infil:{st:'c',sel:{side:'права',loc:'нижні',char:'інфільтр'}}});K.S.concl=['Правобічна пневмонія'];K.renderAll();});
  await p.dblclick('#ptext [data-zone="infil"]');
  let t=await paper(p);
  ok(t.includes('нижніх легеневих полях лівої легені'),'подвійний клік по зоні: права → ліва');
  await p.dblclick('#ptext .concl');t=await paper(p);
  ok(t.includes('Rö-ч: Лівобічна пневмонія.'),'подвійний клік по висновку: правобічна → лівобічна');
  ok(!(await p.textContent('#checkList')).includes('Бічність'),'після заміни бічність узгоджена');
  // суперечність: висновок «гідроторакс», зона синусів — норма
  await p.evaluate(()=>{const K=window.__skg;K.S.concl=['Правобічний гідроторакс'];K.renderAll();});
  ok((await p.textContent('#checkList')).includes('а зона «Синуси, плевра» — норма'),'безпека висновку: гідроторакс при нормі синусів');
  await p.evaluate(()=>{const K=window.__skg;K.S.zones.sinus={st:'c',sel:{ch:'рідП'}};K.renderAll();});
  ok(!(await p.textContent('#checkList')).includes('Синуси, плевра» — норма'),'попередження зникає, коли зону змінено');
  // результат
  ok(await p.evaluate(()=>window.__skg.statusOf())==='p','результат: патологія (авто)');
  await p.click('#allNorm');await p.evaluate(()=>{window.__skg.S.concl=[];window.__skg.renderAll();});
  ok(await p.evaluate(()=>window.__skg.statusOf())==='n','результат: норма (авто)');
  await p.fill('#recFree','КТ ОГК для уточнення');
  ok(await p.evaluate(()=>window.__skg.autoStatus())==='d','результат: дообстеження, коли рекомендовано КТ');
  await p.fill('#recFree','');await p.click('#statusSeg >> text=Патологія');
  ok(await p.evaluate(()=>window.__skg.S.status)==='p'&&(await p.textContent('#statusNote')).includes('вручну'),'результат вибирається вручну');
  await p.click('#statusSeg >> text=Патологія');ok(await p.evaluate(()=>window.__skg.S.status)==null,'повторний клік повертає авто');
  // скорочення в полі висновку і пропуски
  await p.click('#conclFree');await p.keyboard.type('.кт ');
  ok((await p.inputValue('#conclFree'))==='КТ ОГК для уточнення характеру змін ','скорочення .кт розгортається в полі висновку');
  await p.fill('#conclFree','');await p.fill('#recFree','');await p.click('#recFree');await p.keyboard.type('.конт ');
  const sel=await p.evaluate(()=>{const i=document.getElementById('recFree');return i.value.slice(i.selectionStart,i.selectionEnd);});
  ok((await p.inputValue('#recFree')).startsWith('Rö-контроль через __ днів')&&sel==='__','після скорочення виділено пропуск «__»');
  ok((await p.textContent('#checkList')).includes('пропуски «__»'),'нагадування про незаповнений пропуск');
  await p.keyboard.type('10');
  ok((await p.inputValue('#recFree')).startsWith('Rö-контроль через 10 днів')&&!(await p.textContent('#checkList')).includes('пропуски'),'пропуск заповнено — нагадування зникло');
  // скорочення в тексті протоколу + Tab
  await p.fill('#recFree','');
  await p.click('#ptext .concl');await p.keyboard.press('End');await p.keyboard.type(' .вог ');
  const pt=await p.evaluate(()=>({t:document.getElementById('ptext').innerText,s:String(getSelection())}));
  ok(pt.t.includes('визначається вогнищева тінь __ мм')&&pt.s==='__','скорочення в протоколі, курсор на першому «__»');
  await p.keyboard.type('верхній');await p.keyboard.press('Tab');
  ok(await p.evaluate(()=>String(getSelection()))==='__','Tab — до наступного «__»');
  await p.click('#pman >> text=Скинути правку');
  // налаштування скорочень і пакет
  await p.click('#navSettings');await p.fill('#sAbbrKey','.пп');await p.fill('#sAbbrVal','Правобічна пневмонія');await p.click('#sAbbrAdd');
  ok((await p.textContent('#sAbbr')).includes('.пп'),'своє скорочення додано в «Налаштуваннях»');
  await p.fill('#sDocTitle','Лікар-радіолог');
  ok(await p.evaluate(()=>{const K=window.__skg;const it=K.classify(K.currentItem());return JSON.stringify(it).includes('Лікар-радіолог');}),'посада в підписі береться з налаштувань');
  await p.fill('#sDocTitle','');
  ok(await p.evaluate(()=>window.__skg.phrasePack().abbr['пп']==='Правобічна пневмонія'),'скорочення потрапляють у пакет фраз');
  await p.click('#view-settings [data-back]');
  // архів: статус, фільтр, CSV, підсумок дня
  await p.fill('#pName','Пацієнт Тест');await p.fill('#pAge','50');await p.fill('#pNum','777');await p.fill('#pEed','0,35');
  await p.evaluate(()=>{const K=window.__skg;K.setZones({infil:{st:'c',sel:{side:'права',loc:'нижні',char:'інфільтр'}}});K.S.concl=['Правобічна пневмонія'];K.S.recs=[];K.renderAll();});
  await p.fill('#recFree','КТ ОГК для уточнення');await p.keyboard.press('Control+s');
  ok(await p.evaluate(()=>window.__skg.A.slice(-1)[0].status)==='d','у архів зберігається результат');
  await p.click('#navArchive');
  ok((await p.textContent('#aTable')).includes('дообстеження'),'в архіві позначка результату');
  ok(await p.isVisible('#ddList'),'кнопка «Список на дообстеження»');
  await p.selectOption('#aStatus','n');ok((await p.textContent('#aTable')).includes('За цими фільтрами протоколів немає'),'фільтр за результатом');
  await p.click('#ddList');ok((await p.inputValue('#aStatus'))==='d'&&(await p.textContent('#aTable')).includes('Пацієнт Тест'),'«Список на дообстеження» показує потрібних');
  const dl=await Promise.all([p.waitForEvent('download',{timeout:5000}).catch(()=>null),p.click('#aCsv')]);
  const csv=dl[0]?require('fs').readFileSync(await dl[0].path(),'utf8'):'';
  ok(csv.includes(';Результат;')&&csv.includes(';Дообстеження;'),'CSV: колонка «Результат»');
  ok((await p.textContent('#dayBox')).includes('на дообстеження'),'підсумок дня: на дообстеження');
  // відгук розробнику
  await p.click('#navFeedback');await p.click('#dlg [data-k="idea"]');await p.fill('#fbText','Додати кнопку плевральні спайки');await p.click('#fbSave');
  ok((await p.textContent('#dlg')).includes('Записано'),'«Помилка чи ідея»: відгук записано');
  await ctx.grantPermissions(['clipboard-read','clipboard-write']);await p.click('#fbCopyOne');
  const clip=await p.evaluate(()=>navigator.clipboard.readText());
  ok(clip.includes('Ідея')&&clip.includes('плевральні спайки')&&clip.includes('Skiagrama 0.4')&&!clip.includes('Пацієнт Тест'),'відгук копіюється для розробника без даних пацієнта');
  ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('skiagrama.feedback.v1')).length===1&&JSON.parse(localStorage.getItem('skiagrama.feedback.v1'))[0].sent),'відгук збережено й позначено «передано»');
  await p.click('#navFeedback');await p.fill('#fbText','Петренко І. В. — не друкується');
  ok(await p.isVisible('#dlg .warnt'),'попередження, якщо в тексті ПІБ');await p.click('#dlg >> text=Закрити');
  ok(errs.length===0,'без помилок JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await ctx.close();
}
/* ---------- Надійність: архів, дві вкладки, вимкнене світло ---------- */
{
  console.log('\nНадійність даних');
  const ctx=await b.newContext({viewport:{width:1440,height:900}});const errs=[];
  const open=async()=>{const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(FILE);
    await p.waitForFunction(()=>window.__skg&&window.__skg.archiveSaved);await p.evaluate(()=>window.__skg.archiveSaved());
    await p.waitForTimeout(450);if(await p.isVisible('#dlg:not([hidden])'))await p.click('text=Пропустити — заповню пізніше').catch(()=>{});
    if(await p.isVisible('#dlg:not([hidden])'))await p.keyboard.press('Escape');return p;};
  // старий архів у localStorage переноситься в IndexedDB
  let p=await ctx.newPage();await p.goto(FILE);await p.waitForFunction(()=>window.__skg&&window.__skg.archiveSaved);await p.evaluate(()=>window.__skg.archiveSaved());
  await p.evaluate(()=>{localStorage.setItem('skiagrama.archive.v1',JSON.stringify([{id:'old1',ts:1,date:'2025-01-02',num:'1',name:'Старий запис',study:'ogk',concl:'Без патологічних змін.',text:'x'}]));});
  await p.close();p=await open();
  ok(await p.evaluate(()=>window.__skg.A.some(r=>r.id==='old1')&&!localStorage.getItem('skiagrama.archive.v1')),'старий архів перенесено з localStorage у сховище браузера');
  // великий архів: 6000 протоколів зберігаються і читаються
  const t0=Date.now();
  await p.evaluate(async()=>{const K=window.__skg;const base={ts:2,date:'2025-03-01',num:'1',name:'Пацієнт',study:'ogk',concl:'Правобічна пневмонія (S9, S10).',text:'П\n'.repeat(200),units:Array.from({length:12},(_,i)=>({t:'Речення протоколу номер '+i,p:2})),state:{zones:{}},doc:{body:Array(8).fill('Фраза опису зони протоколу.')}};
    for(let i=0;i<6000;i++)K.A.push(Object.assign({},base,{id:'big'+i,num:String(i),name:'Пацієнт '+i}));await K.saveA();});
  const tSave=Date.now()-t0;
  await p.close();const t1=Date.now();p=await open();const tLoad=Date.now()-t1;
  ok(await p.evaluate(()=>window.__skg.A.filter(r=>r.id.startsWith('big')).length)===6000,`6000 протоколів зберігаються (запис ${tSave} мс, відкриття ${tLoad} мс)`);
  await p.click('#navArchive');const t2=Date.now();await p.fill('#aSearch','Пацієнт 5999');await p.waitForFunction(()=>document.getElementById('aTable').textContent.includes('Пацієнт 5999'));
  ok(Date.now()-t2<1500,`пошук в архіві з 6000 записів: ${Date.now()-t2} мс`);
  await p.evaluate(async()=>{const K=window.__skg;K.A.splice(0,K.A.length,...K.A.filter(r=>!r.id.startsWith('big')));await K.saveA();});
  // дві вкладки
  const q=await open();
  ok(await p.isVisible('#tabBanner')||await q.isVisible('#tabBanner'),'попередження: програма відкрита у двох вкладках');
  await p.evaluate(async()=>{const K=window.__skg;K.A.push({id:'tabA',ts:Date.now(),date:'2026-10-11',name:'Вкладка А',study:'ogk',concl:''});await K.saveA();});
  await q.evaluate(async()=>{const K=window.__skg;K.A.push({id:'tabB',ts:Date.now(),date:'2026-10-11',name:'Вкладка Б',study:'ogk',concl:''});await K.saveA();});
  await p.evaluate(async()=>{const K=window.__skg;const i=K.A.findIndex(r=>r.id==='old1');K.A.splice(i,1);await K.saveA();});
  await q.waitForTimeout(300);
  await q.evaluate(async()=>{const K=window.__skg;K.A.push({id:'tabB2',ts:Date.now(),date:'2026-10-11',name:'Вкладка Б2',study:'ogk',concl:''});await K.saveA();});
  await p.close();await q.close();p=await open();
  const ids=await p.evaluate(()=>window.__skg.A.map(r=>r.id));
  ok(ids.includes('tabA')&&ids.includes('tabB')&&ids.includes('tabB2'),'дві вкладки: протоколи з обох збереглися');
  ok(!ids.includes('old1'),'дві вкладки: видалений протокол не повертається');
  // «вимкнули світло» посеред протоколу
  await p.fill('#pName','Пацієнт Світло');await p.click('#allNorm');await p.evaluate(()=>{window.__skg.S.concl=['Гострий бронхіт'];window.__skg.renderAll();});
  await p.waitForTimeout(700);await p.close({runBeforeUnload:false});p=await open();
  ok((await p.inputValue('#pName'))==='Пацієнт Світло'&&(await paper(p)).includes('Гострий бронхіт'),'після раптового закриття протокол відновлено');
  await p.click('#ptext .concl');await p.keyboard.press('End');await p.keyboard.type(' Правка вручну');await p.waitForTimeout(700);
  await p.close({runBeforeUnload:false});p=await open();
  ok((await paper(p)).includes('Правка вручну'),'ручна правка тексту теж відновлюється');
  await p.click('#pman >> text=Скинути правку');
  // нагадування про копію архіву (без папки даних)
  await p.evaluate(()=>{const K=window.__skg;for(let i=0;i<3;i++)K.A.push({id:'n'+i,ts:i,date:'2026-10-11',name:'Н '+i,study:'ogk',concl:''});});
  await p.waitForTimeout(500);if(await p.isVisible('#dlg'))await p.click('#dlg button >> nth=-1');if(await p.isVisible('#dlg'))await p.keyboard.press('Escape');
  await p.evaluate(()=>{window.__skg.S.concl=[];window.__skg.renderAll();});await p.fill('#pNum','55');await p.fill('#pAge','40');await p.fill('#pEed','0,35');await p.keyboard.press('Control+s');
  ok(await p.waitForSelector('#nudgeSave',{timeout:3000}).then(()=>true,()=>false),'раз на день нагадує зберегти копію архіву');
  await p.click('#dlg >> text=Пізніше');
  // переповнене сховище: попередження одразу
  await p.evaluate(()=>{Storage.prototype.setItem=function(){const e=new Error('quota');e.name='QuotaExceededError';throw e;};});
  await p.click('#navSettings');await p.fill('#sDoctor','Лікар Тест');
  ok(await p.isVisible('#storeBanner')&&(await p.textContent('#storeBanner')).includes('заповнена'),'сховище переповнене — попередження в ту ж мить');
  ok(errs.length===0,'без помилок JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await ctx.close();
}
/* ---------- Клавіатура й вузькі екрани ---------- */
{
  console.log('\nКлавіатура й вузькі екрани');
  const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(FILE);await p.click('text=Пропустити — заповню пізніше');
  const where=()=>p.evaluate(()=>{const a=document.activeElement;return a&&a.tagName==='BUTTON'?a.textContent.trim():a?a.id||a.tagName:'';});
  await p.evaluate(()=>document.activeElement.blur());await p.keyboard.press('Alt+n');await p.keyboard.press('1');
  ok(await where()==='обидві','«1» ставить фокус на першу кнопку зони');
  await p.keyboard.press('ArrowRight');await p.keyboard.press('Space');
  ok(await where()==='права'&&(await paper(p)).includes('правої легені'),'пробіл вибирає кнопку, фокус лишається на ній');
  await p.keyboard.press('ArrowDown');ok(await where()==='нижньо-медіальні поля','↓ — до наступної групи');
  await p.keyboard.press('Space');await p.keyboard.press('ArrowDown');await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowRight');await p.keyboard.press('Space');
  await p.keyboard.press('Alt+Enter');ok((await paper(p)).includes('Rö-ч: Правобічна пневмонія.'),'Alt+Enter приймає підказку висновку');
  await p.keyboard.press('Control+k');await p.keyboard.type('рекоменд');
  ok((await p.inputValue('#dlgBox input[type=search]'))==='рекоменд','Ctrl+K: друк одразу йде в пошук');
  await p.keyboard.press('Escape');ok(await where()==='інфільтративні','після закриття вікна фокус повертається');
  // архів по 300
  await p.evaluate(async()=>{const K=window.__skg;for(let i=0;i<700;i++)K.A.push({id:'m'+i,ts:i,date:'2025-05-01',num:String(i),name:'Пацієнт '+i,study:'ogk',concl:''});await K.saveA();});
  await p.click('#navArchive');ok(await p.evaluate(()=>document.querySelectorAll('#aTable tr').length)<=302&&await p.isVisible('#aMore'),'архів показує по 300 рядків');
  await p.click('#aMore');ok(await p.evaluate(()=>document.querySelectorAll('#aTable tr').length)>=601,'«Показати ще» додає рядки');
  // ноутбук 1366×768 з масштабом 125 %
  await p.setViewportSize({width:1093,height:614});await p.click('#navDesc');
  const lay=await p.evaluate(()=>({h:document.querySelector('header.top').getBoundingClientRect().height,a:document.querySelector('.actbar').getBoundingClientRect().height,s:document.documentElement.scrollWidth-document.documentElement.clientWidth}));
  ok(lay.h<80&&lay.a<50&&lay.s===0,`1366×768 при 125 %: шапка ${Math.round(lay.h)} px, кнопки в один рядок, без прокрутки вбік`);
  await p.click('.split details.menu>summary');
  ok(await p.evaluate(()=>document.querySelector('details.menu[open] .mpop').getBoundingClientRect().right<=document.documentElement.clientWidth),'меню «Копіювати» не виходить за край');
  ok(errs.length===0,'без помилок JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await ctx.close();
}
/* ---------- Дані пацієнта: крайові випадки ---------- */
{
  console.log('\nДані пацієнта: крайові випадки');
  const ctx=await b.newContext({viewport:{width:1440,height:900}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(FILE);await p.click('text=Пропустити — заповню пізніше');
  const td=new Date();const iso=d=>d.toISOString().slice(0,10);const dmy=d=>`${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
  const b5=new Date(td);b5.setMonth(b5.getMonth()-5);b5.setDate(Math.min(b5.getDate(),28));
  await p.fill('#pAge',dmy(b5));await p.press('#pAge','Enter');
  ok(/^[45] міс\.$/.test(await p.inputValue('#pAge'))&&(await paper(p)).includes(' міс.')&&!(await paper(p)).includes('міс. р.'),'немовля: вік у місяцях, без «р.»');
  await p.fill('#pAge','31.02.1990');await p.press('#pAge','Enter');
  ok((await p.textContent('#ageMsg')).includes('не існує'),'неіснуюча дата народження — попередження');
  await p.fill('#pAge','2090');await p.press('#pAge','Enter');ok((await p.textContent('#ageMsg')).includes('пізніше'),'рік народження в майбутньому — попередження');
  await p.fill('#pAge','67');
  await p.fill('#pEed','0.35');await p.press('#pEed','Tab');ok((await p.inputValue('#pEed'))==='0,35','ЕЕД «0.35» → «0,35»');
  await p.fill('#pName','петренко іван');await p.press('#pName','Tab');ok((await p.inputValue('#pName'))==='Петренко Іван','ПІБ з малої → з великої');
  const fut=new Date(td);fut.setDate(fut.getDate()+30);await p.fill('#pDate',iso(fut));
  ok(await p.evaluate(()=>window.__skg.checks().some(x=>x.includes('майбутньому'))),'дата знімка в майбутньому — зауваження');
  await p.fill('#pDate',iso(td));
  await p.evaluate(()=>{window.__skg.A.push({id:'dup1',ts:Date.now(),date:new Date().toISOString().slice(0,10),num:'4321',name:'Інший Пацієнт',study:'ogk',concl:''});});
  await p.fill('#pNum','4321');ok(await p.evaluate(()=>window.__skg.checks().some(x=>x.includes('№ 4321 уже є'))),'повтор № знімка за рік — зауваження');
  ok(await p.evaluate(()=>{window.__skg.S.blank='A';return window.__skg.checks().some(x=>x.includes('назву закладу'));}),'бланк A без реквізитів — зауваження');
  await p.evaluate(()=>{const K=window.__skg;K.S.blank='C';K.S.concl=['Деформуючий остеоартроз II ст.','Остеопороз'];K.renderAll();});
  const c=await p.evaluate(()=>document.querySelector('#ptext .concl').textContent.trim());ok(c==='Rö-ч: Деформуючий остеоартроз II ст. Остеопороз.','висновок зі скороченням без «ст..»: '+c);
  ok(errs.length===0,'без помилок JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await ctx.close();
}
await b.close();
console.log(`\nУсього: ${pass} пройдено, ${fail} не пройдено`);
process.exit(fail?1:0);
