/* ---------- helpers ---------- */
const $=id=>document.getElementById(id);
function el(tag,attrs,text){const e=document.createElement(tag);if(attrs)for(const k in attrs){if(k==='class')e.className=attrs[k];else if(attrs[k]!==false&&attrs[k]!=null)e.setAttribute(k,attrs[k]);}if(text!=null)e.textContent=text;return e;}
const num=v=>{const s=String(v??'').trim().replace(',','.');return s===''?NaN:Number(s);};
const fx=(v,d)=>isFinite(v)?v.toFixed(d).replace('.',','):'—';
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const addDays=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()+n);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;};
const fmtD=v=>{if(!v)return '__.__.__';const [y,m,d]=v.split('-');return `${d}.${m}.${y.slice(2)}`;};
const norm=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const clone=o=>JSON.parse(JSON.stringify(o));
let storeOK=true;const mem={};
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){storeOK=false;return k in mem?mem[k]:d;}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){storeOK=false;mem[k]=v;}},
  del(k){try{localStorage.removeItem(k);}catch(e){delete mem[k];}}};
try{localStorage.setItem('skg.t','1');localStorage.removeItem('skg.t');}catch(e){storeOK=false;}
if(!storeOK)$('storeBanner').hidden=false;
function toast(t){const b=$('toast');b.textContent=t;b.hidden=false;clearTimeout(toast.h);toast.h=setTimeout(()=>{b.hidden=true;},2400);}
function copyText(text,label){
  const fb=()=>{const ta=el('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.select();let ok=false;try{ok=document.execCommand('copy');}catch(e){}ta.remove();toast(ok?label+' скопійовано':'Не вдалося скопіювати — виділіть текст вручну');};
  try{navigator.clipboard.writeText(text).then(()=>toast(label+' скопійовано'),fb);}catch(e){fb();}
}
function download(name,content,type){
  try{const b=new Blob([content],{type});const a=el('a',{href:URL.createObjectURL(b),download:name});document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);return true;}catch(e){return false;}
}
const typing=e=>{const t=e.target;return t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable);};


/* ---------- іконки (один лінійний стиль, колір — від тексту) ---------- */
const ICO={
 sheet:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
 archive:'<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
 lungs:'<path d="M12 4v8"/><path d="M12 9.5c-1.6 0-2.4-2-4.2-2C5.3 7.5 4 11.5 4 15.3c0 2.6 1.4 4.2 3.4 4.2 2.3 0 3.6-1.6 3.6-4.5V12"/><path d="M12 9.5c1.6 0 2.4-2 4.2-2 2.5 0 3.8 4 3.8 7.8 0 2.6-1.4 4.2-3.4 4.2-2.3 0-3.6-1.6-3.6-4.5V12"/>',
 fg:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 6.5v6"/><path d="M11 10c-2.6 0-3.8 3-3.8 6.5H11z"/><path d="M13 10c2.6 0 3.8 3 3.8 6.5H13z"/>',
 bone:'<path d="M8.6 6.8a2.3 2.3 0 1 0-3.3 1.9 2.3 2.3 0 1 0 2.1 3.2l4.7 4.7a2.3 2.3 0 1 0 3.2 2.1 2.3 2.3 0 1 0 1.9-3.3 2.3 2.3 0 1 0-3.2-2.1L9.3 8.6a2.3 2.3 0 0 0-.7-1.8z"/>',
 spine:'<rect x="8.5" y="2.5" width="7" height="4" rx="1.4"/><rect x="8" y="10" width="8" height="4" rx="1.4"/><rect x="8.5" y="17.5" width="7" height="4" rx="1.4"/><path d="M5.5 4.5h3M15.5 4.5h3M5 12h3M16 12h3M5.5 19.5h3M15.5 19.5h3"/>',
 abd:'<rect x="4" y="4" width="16" height="16" rx="6"/><path d="M8 9.5h8"/><path d="M8 13.5c1.3 0 1.3 2 2.7 2s1.3-2 2.6-2 1.4 2 2.7 2"/>',
 skull:'<path d="M12 3a8 8 0 0 0-8 8c0 2.6 1.1 4.3 2.6 5.3V20h10.8v-3.7c1.5-1 2.6-2.7 2.6-5.3a8 8 0 0 0-8-8z"/><circle cx="9" cy="11.5" r="1.7"/><circle cx="15" cy="11.5" r="1.7"/><path d="M10.5 20v-2.5M13.5 20v-2.5"/>',
 ruler:'<path d="M3 17L17 3l4 4L7 21z"/><path d="M7.5 12.5l2 2M10.5 9.5l2 2M13.5 6.5l2 2"/>',
 concl:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4"/><path d="M9 13l2 2 4-4"/>',
 rec:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 9.5h16M8.5 3v4M15.5 3v4"/><path d="M9 15h6M13 13l2 2-2 2"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
 pen:'<path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M14 7l3 3"/>',
 list:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
 copy:'<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
 print:'<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
 folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 chart:'<path d="M5 20V11M12 20V5M19 20v-7"/>',
 down:'<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
 up:'<path d="M12 16V5M7 10l5-5 5 5"/><path d="M5 20h14"/>',
 ok:'<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16 9.5"/>',
 star:'<path d="M12 4l2.4 5 5.6.8-4 3.9.9 5.5L12 16.6l-4.9 2.6.9-5.5-4-3.9 5.6-.8z"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
 rad:'<circle cx="12" cy="12" r="1.8"/><path d="M12 3.5a8.5 8.5 0 0 1 7.4 4.3L14 11M12 3.5a8.5 8.5 0 0 0-7.4 4.3L10 11M5 16.3a8.5 8.5 0 0 0 14 0L13.3 13.4M10.7 13.4"/>',
 box:'<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 work:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2M3 12h18"/>',
 hosp:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 7v6M9 10h6M9 21v-4h6v4"/>'
};
const ic=n=>ICO[n]?`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICO[n]}</svg>`:'';
const icEl=n=>{const t=document.createElement('template');t.innerHTML=ic(n);return t.content.firstChild;};
document.querySelectorAll('[data-ic]').forEach(e=>e.insertAdjacentHTML('afterbegin',ic(e.dataset.ic)));
