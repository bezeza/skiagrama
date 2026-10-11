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
  await p.fill('#conclTools .myadd input','Плевральні спайки справа');await p.click('#conclTools .myadd button');
  ok(await p.isVisible('#conclChips .chip >> text=Плевральні спайки справа')&&(await paper(p)).includes('Rö-ч: Плевральні спайки справа.'),'свій висновок: кнопка і в протоколі');
  await p.fill('#conclFree','Кальцинат у корені');await p.click('#conclKeep');
  ok(await p.isVisible('#conclChips .chip >> text=Кальцинат у корені')&&(await p.inputValue('#conclFree'))==='','«Запамʼятати як кнопку»');
  await p.click('#conclTools >> text=✎ Редагувати кнопки');
  await p.fill('#conclTools .erow[data-k="Емфізема легень"] input','Емфізема легень (буллезна)');
  await p.fill('#conclTools input[aria-label="Висновок норми"]','Органи грудної клітки без патології');
  await p.click('#conclTools .erow[data-k="Гідроторакс"] >> text=Сховати');
  await p.click('#conclTools >> text=Готово');
  ok(!(await p.isVisible('#conclChips .chip >> text=Гідроторакс'))&&await p.isVisible('#conclChips .chip >> text=Емфізема легень (буллезна)'),'олівець висновку: перейменувати, сховати');
  await p.evaluate(()=>{const S=window.__skg.S;S.concl=[];window.__skg.renderAll();});
  ok((await paper(p)).includes('Rö-ч: Органи грудної клітки без патології.'),'свій висновок норми');
  await p.click('#zone-pneum .seg button:nth-child(2)');await p.click('#zone-pneum >> text=підвищена');
  ok((await p.textContent('#sugs')).includes('Емфізема легень (буллезна)'),'підказка бере нову назву кнопки');
  await p.fill('#recTools .myadd input','Rö-контроль через 3 тижні');await p.click('#recTools .myadd button');
  ok((await paper(p)).includes('Rö-контроль через 3 тижні'),'своя рекомендація');
  const pk=await p.evaluate(()=>window.__skg.phrasePack());
  ok(!!(pk.lists['concl.ogk']&&pk.lists['rec']&&pk.conclNorm.ogk),'пакет фраз містить висновки й рекомендації');
  {const q=await ctx.newPage();await q.goto(FILE);await q.click('#allNorm');
   ok(await q.isVisible('#conclChips .chip >> text=Плевральні спайки справа')&&(await paper(q)).includes('Органи грудної клітки без патології'),'свої висновки зберігаються після перезапуску');
   await q.click('#conclTools >> text=✎ Редагувати кнопки');await q.click('#conclTools button >> text=Повернути як було');await q.click('#conclTools button >> text=Точно');
   ok(await q.isVisible('#conclChips .chip >> text=Гідроторакс')&&!(await q.isVisible('#conclChips .chip >> text=Плевральні спайки справа')),'«Повернути як було» для висновків');await q.close();}
  await p.click('#allNorm');
  // тема «Кабінет»
  await p.click('#navSettings');await p.selectOption('#sTheme','grey');
  ok((await p.evaluate(()=>getComputedStyle(document.body).backgroundColor))==='rgb(42, 43, 45)','тема «Кабінет»: темно-сірий фон');
  await p.selectOption('#sTheme','system');await p.click('#view-settings [data-back]');
  // памʼятка
  await p.click('#navHelp');await p.click('#dlg >> text=Памʼятка на 1 сторінку');ok((await p.textContent('#dlg')).includes('Протокол за 5 кроків'),'памʼятка відкривається з довідки');await p.click('#dlg >> text=Закрити');
  // збереження з бланком
  await p.fill('#pEed','0,35');await p.keyboard.press('Control+s');
  ok(await p.evaluate(()=>{const r=JSON.parse(localStorage.getItem('skiagrama.archive.v1')).slice(-1)[0];return !!(r.doc&&r.blank);}),'архів зберігає дані для бланка');
  await p.click('#navArchive');const ds=await p.textContent('#dayBox');
  ok(/1\s*протоколів сьогодні/.test(ds)&&ds.includes('не надруковано'),'підсумок дня в архіві: '+ds.replace(/\s+/g,' ').slice(0,80));
  ok(errs.length===0,'без помилок JavaScript'+(errs.length?': '+errs.join(' | '):''));
  await ctx.close();
}
await b.close();
console.log(`\nУсього: ${pass} пройдено, ${fail} не пройдено`);
process.exit(fail?1:0);
