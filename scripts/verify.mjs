import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {load} from 'cheerio';
import {spawn} from 'node:child_process';
const data=JSON.parse(await fs.readFile('src/data/site.json','utf8'));
const audit=JSON.parse(await fs.readFile('reports/audit.json','utf8'));
const routes=['/',...data.routes.map(r=>r.path)];
const errors=[],links=[],missingMedia=[];
assert.equal(new Set(routes).size,routes.length,'Routes must be unique');
async function output(p){const decoded=decodeURIComponent(p);for(const candidate of [path.join('dist',decoded,'index.html'),path.join('dist',decoded)]){try{if((await fs.stat(candidate)).isFile())return candidate;}catch{}}return null;}
let pages=0;
for(const p of routes){const file=await output(p);if(!file){errors.push({path:p,error:'Missing output'});continue;}const $=load(await fs.readFile(file,'utf8'));pages++;
 if(!$('title').text())errors.push({path:p,error:'Missing title'});
 if($('link[rel="canonical"]').attr('href')!=='https://saktibagchi.in'+p)errors.push({path:p,error:'Canonical mismatch',actual:$('link[rel="canonical"]').attr('href')});
 if(!$('meta[name="description"]').attr('content'))errors.push({path:p,error:'Missing description'});
 for(const el of $('img[src],video[src],audio[src],source[src]').toArray()){const src=$(el).attr('src');if(src.startsWith('/')){try{await fs.access(path.join('dist',decodeURI(src.split('?')[0])));}catch{missingMedia.push({page:p,src});}}}
 for(const el of $('a[href]').toArray()){const href=$(el).attr('href');if(href.startsWith('/')&&!href.startsWith('//')){let u;try{u=new URL(href,'https://saktibagchi.in');}catch{continue;}if(!u.pathname.startsWith('/wp-content/')&&!['/feed/','/sitemap.xml'].includes(u.pathname)&&!await output(u.pathname))links.push({page:p,href});}}
}
const port=4317;
const server=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),SITE_LIVE:'false'},stdio:'pipe'});
let serverError='';server.stderr.on('data',b=>serverError+=b);
try{
 let ready=false;for(let i=0;i<40;i++){try{const r=await fetch(`http://127.0.0.1:${port}/health`);if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,serverError||'Server did not start');
 for(const p of ['/',data.posts[0].path,'/archive/','/contact.html','/feed/','/sitemap.xml']){const r=await fetch(`http://127.0.0.1:${port}${p}`,{redirect:'manual'});assert.equal(r.status,200,p);assert.match(r.headers.get('x-robots-tag'),/noindex/);if(p==='/feed/')assert.match(r.headers.get('content-type'),/rss/);}
 assert.match(await(await fetch(`http://127.0.0.1:${port}/robots.txt`)).text(),/Disallow: \//);
 const id=data.posts[0].id;const redirect=await fetch(`http://127.0.0.1:${port}/?p=${id}`,{redirect:'manual'});assert.equal(redirect.status,301);assert.equal(redirect.headers.get('location'),data.posts[0].path);
 assert.equal((await fetch(`http://127.0.0.1:${port}/definitely-not-a-real-page/`)).status,404);
 assert.equal((await fetch(`http://127.0.0.1:${port}/`,{method:'POST'})).status,405);
}finally{server.kill();}
const report={testedAt:new Date().toISOString(),pagesChecked:pages,errors,missingMedia,unresolvedInternalLinks:links,sourceFailures:audit.failures};
await fs.writeFile('reports/validation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({pagesChecked:pages,errors:errors.length,missingMedia:missingMedia.length,unresolvedInternalLinks:links.length,sourceFailures:audit.failures.length,runtimeChecks:'passed'},null,2));
if(errors.length||missingMedia.length)process.exitCode=1;
