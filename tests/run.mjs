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
await b.close();
console.log(`\nУсього: ${pass} пройдено, ${fail} не пройдено`);
process.exit(fail?1:0);
