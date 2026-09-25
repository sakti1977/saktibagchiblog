import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const audit=JSON.parse(await fs.readFile('reports/audit.json','utf8'));const manifest=JSON.parse(await fs.readFile('content/settings/media-manifest.json','utf8'));
const assets=[],failures=[];
for(const item of manifest){try{const data=await fs.readFile('public'+item.path);assets.push({...item,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});}catch{failures.push({type:'media',path:item.path,url:item.url,error:'Large legacy video pending separate storage; not referenced by imported posts/pages'});}}
audit.assets=assets;audit.failures=[...audit.failures.filter(f=>f.type!=='media'),...failures];audit.counts.assets=assets.length;audit.updatedAt=new Date().toISOString();await fs.writeFile('reports/audit.json',JSON.stringify(audit,null,2));console.log({copied:assets.length,bytes:assets.reduce((a,b)=>a+b.bytes,0),pending:failures.length});
