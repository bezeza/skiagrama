// Збирання: src/ → index.html (сайт, PWA) і skiagrama.html (офлайн-файл); версія кешу в sw.js
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const r=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const js=readdirSync(new URL('./src/js/',import.meta.url)).filter(f=>f.endsWith('.js')).sort().map(f=>`/* --- ${f} --- */\n`+r('./src/js/'+f)).join('\n');
const ver=(/const VERSION='([^']+)'/.exec(js)||[])[1]||'0';
/* рентгенівські іконки видів досліджень (src/img/study-*.png) — вбудовуються у файл */
const studyImg='const STUDY_IMG={'+['ogk','fg','bone','spine','abd','skull'].map(k=>`${k}:'data:image/png;base64,${readFileSync(new URL(`./src/img/study-${k}.png`,import.meta.url)).toString('base64')}'`).join(',')+'};\n';
/* шрифти вбудовуються у файл: працює без інтернету і нічого не звертається до Google */
const UR={cyrillic:'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',latin:'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'};
const FONTS=[['Rubik','rubik',[[500,'normal'],[600,'normal']]],['IBM Plex Sans','ibm-plex-sans',[[400,'normal'],[500,'normal'],[600,'normal']]],['IBM Plex Serif','ibm-plex-serif',[[400,'normal'],[500,'normal'],[400,'italic']]]];
const fontCSS=FONTS.flatMap(([fam,f,ws])=>ws.flatMap(([w,st])=>['cyrillic','latin'].map(sub=>`@font-face{font-family:'${fam}';font-style:${st};font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${readFileSync(new URL(`./src/fonts/${f}-${sub}-${w}-${st}.woff2`,import.meta.url)).toString('base64')}) format('woff2');unicode-range:${UR[sub]}}`))).join('\n')+'\n';
const pwaHead=`<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">`;
const page=(pwa)=>r('./src/head.html').replace('<!--PWA-->',pwa?pwaHead:'')+'<style>\n'+fontCSS+r('./src/styles.css')+r('./src/memo.css')+'</style>\n</head>\n<body>\n'+r('./src/body.html')+'<template id="memoTpl">'+r('./src/memo.html')+'</template>\n'+
  '<script>\n(function(){\n\'use strict\';\n'+studyImg+js+'\n})();\n</script>\n'+(pwa?'<script>\n'+r('./src/pwa.js')+'</script>\n':'')+'</body>\n</html>\n';
writeFileSync(new URL('./index.html',import.meta.url),page(true));
writeFileSync(new URL('./skiagrama.html',import.meta.url),page(false));
writeFileSync(new URL('./pamyatka.html',import.meta.url),`<!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skiagrama — памʼятка</title>
<style>@page{size:A4;margin:12mm}html,body{margin:0;background:#fff}body{padding:12mm}@media print{body{padding:0}}
${r('./src/memo.css')}</style></head><body>
${r('./src/memo.html')}</body></html>
`);
const hash=createHash('sha1').update(page(true)+r('./src/memo.html')).digest('hex').slice(0,8);
const sw=r('./sw.js').replace(/const VERSION='[^']*';/,`const VERSION='skiagrama-${ver}-${hash}';`);
writeFileSync(new URL('./sw.js',import.meta.url),sw);
console.log('Зібрано Skiagrama',ver);
