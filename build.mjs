// Збирання: src/ → index.html (сайт, PWA) і skiagrama.html (офлайн-файл); версія кешу в sw.js
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
const r=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const js=readdirSync(new URL('./src/js/',import.meta.url)).filter(f=>f.endsWith('.js')).sort().map(f=>`/* --- ${f} --- */\n`+r('./src/js/'+f)).join('\n');
const ver=(/const VERSION='([^']+)'/.exec(js)||[])[1]||'0';
const pwaHead=`<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">`;
const page=(pwa)=>r('./src/head.html').replace('<!--PWA-->',pwa?pwaHead:'')+'<style>\n'+r('./src/styles.css')+r('./src/memo.css')+'</style>\n</head>\n<body>\n'+r('./src/body.html')+'<template id="memoTpl">'+r('./src/memo.html')+'</template>\n'+
  '<script>\n(function(){\n\'use strict\';\n'+js+'\n})();\n</script>\n'+(pwa?'<script>\n'+r('./src/pwa.js')+'</script>\n':'')+'</body>\n</html>\n';
writeFileSync(new URL('./index.html',import.meta.url),page(true));
writeFileSync(new URL('./skiagrama.html',import.meta.url),page(false));
writeFileSync(new URL('./pamyatka.html',import.meta.url),`<!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skiagrama — памʼятка</title>
<style>@page{size:A4;margin:12mm}html,body{margin:0;background:#fff}body{padding:12mm}@media print{body{padding:0}}
${r('./src/memo.css')}</style></head><body>
${r('./src/memo.html')}</body></html>
`);
const sw=r('./sw.js').replace(/const VERSION='[^']*';/,`const VERSION='skiagrama-${ver}';`);
writeFileSync(new URL('./sw.js',import.meta.url),sw);
console.log('Зібрано Skiagrama',ver);
