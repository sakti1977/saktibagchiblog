import fs from 'node:fs/promises';
let p=JSON.parse(await fs.readFile('package.json','utf8'));p.scripts['media:sync']='node scripts/sync-media.mjs';await fs.writeFile('package.json',JSON.stringify(p,null,2));
let s=await fs.readFile('server.mjs','utf8');s=s.replace("const live=process.env.SITE_LIVE==='true';", "const live=process.env.SITE_LIVE==='true';\nif(live&&process.env.CUTOVER_VALIDATED!=='true')throw Error('Production cutover has not been validated');");s=s.replace("'.mp3':'audio/mpeg'","'.wav':'audio/wav','.avif':'image/avif','.mp3':'audio/mpeg'");await fs.writeFile('server.mjs',s);
