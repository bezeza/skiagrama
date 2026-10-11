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

