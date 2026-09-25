import fs from 'node:fs/promises';
import {load} from 'cheerio';
const read=async f=>JSON.parse((await fs.readFile(f,'utf8')).replace(/^\uFEFF/,''));
const tax=await read('content/settings/taxonomy.json');
const plain=s=>load(s||'').text();
for(const kind of ['posts','pages'])for(const name of await fs.readdir('content/'+kind)){if(!name.endsWith('.json'))continue;const file='content/'+kind+'/'+name;const p=await read(file);p.tagNames=(p.tags||[]).map(id=>plain(tax.tags.find(t=>t.id===id)?.name)).filter(Boolean);await fs.writeFile(file,JSON.stringify(p,null,2));}
let s=await fs.readFile('scripts/prepare-content.mjs','utf8');
s=s.replace("import sanitize from 'sanitize-html';","import sanitize from 'sanitize-html';\nimport {load} from 'cheerio';\nconst plain=s=>load(s||'').text();");
s=s.replace("p.categories ||= [];p.tags ||= [];p.categoryNames ||= [];","p.categoryNames ||= [];p.tagNames ||= (p.tags||[]).map(id=>plain(tax.tags.find(t=>t.id===id)?.name)).filter(Boolean);\n p.categories=tax.categories.filter(t=>p.categoryNames.includes(plain(t.name))).map(t=>t.id);p.tags=tax.tags.filter(t=>p.tagNames.includes(plain(t.name))).map(t=>t.id);");
s=s.replace("new URL(t.link).pathname,t.name,items","new URL(t.link).pathname,plain(t.name),items");
s=s.replace("tax.categories.find(t=>t.name===name)","tax.categories.find(t=>plain(t.name)===name)");
s=s.replace("for(const y of new Set", "for(const name of new Set(posts.flatMap(p=>p.tagNames))){if(!tax.tags.some(t=>plain(t.name)===name))listing('/tag/'+encodeURIComponent(name.toLowerCase().replace(/\\s+/g,'-'))+'/',name,posts.filter(p=>p.tagNames.includes(name)));}\nfor(const y of new Set");
await fs.writeFile('scripts/prepare-content.mjs',s);
let config=await fs.readFile('.pages.yml','utf8');config=config.replace('      - name: html','      - name: tagNames\n        label: Tags\n        type: string\n        list: true\n      - name: html');await fs.writeFile('.pages.yml',config);
const contact=await read('content/pages/3587.json');contact.description='Get in touch with Sakti Prasad Bagchi at contact@saktibagchi.in.';contact.html='<p>Let’s talk. For questions, conversations, or opportunities to work together, send me an email.</p><p><a class="button" href="mailto:contact@saktibagchi.in">Email contact@saktibagchi.in</a></p>';await fs.writeFile('content/pages/3587.json',JSON.stringify(contact,null,2));
let home=await fs.readFile('src/pages/index.astro','utf8');home=home.replace('description={data.home?.description}','description={data.settings.description}');await fs.writeFile('src/pages/index.astro',home);
