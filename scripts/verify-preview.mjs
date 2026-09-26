import fs from 'node:fs/promises';
import path from 'node:path';
import {load} from 'cheerio';
const base=process.env.PREVIEW_URL||'https://preview.saktibagchi.in';
const data=JSON.parse(await fs.readFile('src/data/site.json','utf8'));
const ids=JSON.parse(await fs.readFile('dist/id-map.json','utf8'));
const results=[];
async function check(p,kind,expected=200,location){
 const start=Date.now();
 try{
  const r=await fetch(base+p,{redirect:'manual',signal:AbortSignal.timeout(30000)});
  const body=Buffer.from(await r.arrayBuffer());
  const errors=[];
  if(r.status!==expected)errors.push(`status ${r.status}, expected ${expected}`);
  if(!r.headers.get('x-robots-tag')?.includes('noindex'))errors.push('missing noindex');
  if(location&&r.headers.get('location')!==location)errors.push('redirect mismatch');
  if(kind==='page'&&r.status===200){const $=load(body.toString());if(!$('title').text())errors.push('missing title');if($('link[rel=canonical]').attr('href')!=='https://saktibagchi.in'+p)errors.push('canonical mismatch');}
  if(kind==='asset'&&r.status===200){const local=await fs.readFile(path.join('dist',decodeURIComponent(p)));if(!body.equals(local))errors.push('asset differs from build');if(r.headers.get('content-type')==='application/octet-stream')errors.push('generic content type');}
  results.push({path:p,kind,status:r.status,bytes:body.length,ms:Date.now()-start,errors});
 }catch(e){results.push({path:p,kind,errors:[e.message]});}
}
async function batch(items,fn){let i=0;await Promise.all(Array.from({length:6},async()=>{while(i<items.length){const item=items[i++];await fn(item);if(results.length%250===0)console.log(`${results.length} checked`);}}));}
await batch(['/',...data.routes.map(x=>x.path)],p=>check(p,'page'));
async function files(dir){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await files(p));else out.push(p);}return out;}
const assets=(await files('dist')).filter(p=>!p.endsWith('.html')&&!p.endsWith('.xml')&&!p.endsWith('.json')&&!p.endsWith('.txt')).map(p=>'/'+p.slice(5).split('/').map(encodeURIComponent).join('/'));
await batch(assets,p=>check(p,'asset'));
await batch(Object.entries(ids),([id,p])=>check(`/?${data.posts.some(x=>String(x.id)===id)?'p':'page_id'}=${id}`,'id-redirect',301,p));
for(const p of ['/health','/robots.txt','/feed/','/sitemap.xml'])await check(p,'endpoint');
await check('/archive','slash-redirect',301,'/archive/');
await check('/migration-validation-missing/','not-found',404);
const failures=results.filter(x=>x.errors.length);
const summary={testedAt:new Date().toISOString(),base,checks:results.length,byKind:Object.fromEntries([...new Set(results.map(r=>r.kind))].map(k=>[k,results.filter(r=>r.kind===k).length])),failures:failures.length};
await fs.writeFile('reports/preview-validation.json',JSON.stringify({summary,failures,results},null,2));
console.log(JSON.stringify(summary,null,2));
if(failures.length)console.log(JSON.stringify(failures.slice(0,20),null,2));
process.exitCode=failures.length?1:0;
