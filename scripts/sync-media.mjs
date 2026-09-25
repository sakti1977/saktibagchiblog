import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const manifest=JSON.parse(await fs.readFile('content/settings/media-manifest.json','utf8'));
let position=0;const failures=[];
await Promise.all(Array.from({length:4},async()=>{while(position<manifest.length){const item=manifest[position++];try{const source=new URL(item.url);if(source.protocol!=='https:'||source.hostname!=='saktibagchi.in'||!source.pathname.startsWith('/wp-content/uploads/'))throw Error('Unapproved source');const target=path.resolve('public','.'+item.path);if(!target.startsWith(path.resolve('public')+path.sep))throw Error('Unsafe target');let bytes;try{bytes=await fs.readFile(target);}catch{const response=await fetch(source,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error(`HTTP ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());}if(item.sha256&&crypto.createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('Checksum mismatch');await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);}catch(e){failures.push({path:item.path,error:e.message});}}}));
await fs.mkdir('reports',{recursive:true});await fs.writeFile('reports/media-sync.json',JSON.stringify({expected:manifest.length,failed:failures},null,2));
if(failures.length)throw Error(`${failures.length} media downloads failed; see reports/media-sync.json`);
console.log(`Verified ${manifest.length} local media files`);
