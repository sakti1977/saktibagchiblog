import fs from 'node:fs/promises';
import path from 'node:path';
import sanitize from 'sanitize-html';
import {load} from 'cheerio';
const plainCache=new Map();
const plain=s=>{if(!plainCache.has(s))plainCache.set(s,load(s||'').text());return plainCache.get(s);};
const read=async f=>JSON.parse((await fs.readFile(f,'utf8')).replace(/^\uFEFF/,''));
const entries=async folder=>Promise.all((await fs.readdir(folder)).filter(n=>n.endsWith('.json')).map(n=>read(path.join(folder,n))));
const settings=await read('content/settings/site.json');
const tax=await read('content/settings/taxonomy.json');
const records=[...await entries('content/posts'),...await entries('content/pages')].filter(p=>!p.draft);
const used=new Set();
for(const p of records){
 if(!p.title&&p.id)p.title='Untitled entry — '+p.date.slice(0,10);
 if(!p.title||!p.path||!p.date)throw Error('Title, permalink and date required: '+p.id);
 if(!/^\/(?!\/)/.test(p.path)||/[?#\\]/.test(p.path)||p.path.includes('..')||(!p.path.endsWith('/')&&!p.path.endsWith('.html')))throw Error('Invalid permalink: '+p.path);
 if(used.has(p.path))throw Error('Duplicate permalink: '+p.path);used.add(p.path);
 if(!Number.isFinite(Date.parse(p.date)))throw Error('Invalid date: '+p.path);
 p.canonical='https://saktibagchi.in'+p.path;p.dateLabel=new Date(p.date).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
 p.categoryNames ||= [];p.tagNames ||= (p.tags||[]).map(id=>plain(tax.tags.find(t=>t.id===id)?.name)).filter(Boolean);
 p.categories=tax.categories.filter(t=>p.categoryNames.includes(plain(t.name))).map(t=>t.id);p.tags=tax.tags.filter(t=>p.tagNames.includes(plain(t.name))).map(t=>t.id);
 p.description ||= p.title;p.seoTitle ||= p.title+' — Life as Sakti';
 p.html=sanitize(p.html||'',{allowedTags:sanitize.defaults.allowedTags.concat(['img','figure','figcaption','iframe','video','audio','source','details','summary']),allowedAttributes:{'*':['id','class'],a:['href','title','rel'],img:['src','alt','width','height','loading'],iframe:['src','title','width','height','allowfullscreen','loading'],video:['src','poster','controls','width','height'],audio:['src','controls'],source:['src','type'],td:['colspan','rowspan'],th:['colspan','rowspan']},allowedIframeHostnames:['www.youtube.com','www.youtube-nocookie.com','player.vimeo.com']});
}
const posts=records.filter(p=>p.kind==='post').sort((a,b)=>b.date.localeCompare(a.date));
const routes=records.filter(p=>p.path!=='/');
function listing(p,title,items){if(!used.has(p)){used.add(p);routes.push({path:p,title,kind:'listing',description:`Browse ${title} on Life as Sakti.`,canonical:'https://saktibagchi.in'+p,items:items.map(p=>p.path)});}}
listing('/archive/','The writing archive',posts);
for(const [kind,terms]of [['category',tax.categories],['tag',tax.tags]])for(const t of terms){const items=posts.filter(p=>(kind==='category'?p.categories:p.tags).includes(t.id));if(items.length)listing(new URL(t.link).pathname,plain(t.name),items);}
for(const name of new Set(posts.flatMap(p=>p.categoryNames))){const items=posts.filter(p=>p.categoryNames.includes(name));const known=tax.categories.find(t=>plain(t.name)===name);if(!known)listing('/category/'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'/',name,items);}
for(const name of new Set(posts.flatMap(p=>p.tagNames))){if(!tax.tags.some(t=>plain(t.name)===name))listing('/tag/'+encodeURIComponent(name.toLowerCase().replace(/\s+/g,'-'))+'/',name,posts.filter(p=>p.tagNames.includes(name)));}
for(const y of new Set(posts.map(p=>p.path.match(/^\/(\d{4})\//)?.[1]).filter(Boolean))){listing(`/${y}/`,y,posts.filter(p=>p.path.startsWith('/'+y+'/')));for(const m of new Set(posts.filter(p=>p.path.startsWith('/'+y+'/')).map(p=>p.path.split('/')[2])))listing(`/${y}/${m}/`,`${m}/${y}`,posts.filter(p=>p.path.startsWith(`/${y}/${m}/`)));}
for(const u of tax.users)listing(new URL(u.link).pathname,u.name,posts);
const comments=await read('content/settings/comments.json');
const data={home:records.find(p=>p.path==='/'),settings,generatedAt:new Date().toISOString(),posts,routes,menu:settings.menu,comments:comments.filter(c=>records.some(r=>r.id===c.post))};
await fs.mkdir('src/data',{recursive:true});await fs.mkdir('public/feed',{recursive:true});
await fs.writeFile('src/data/site.json',JSON.stringify(data));
await fs.writeFile('public/id-map.json',JSON.stringify(Object.fromEntries(records.filter(p=>p.id).map(p=>[p.id,p.path]))));
const xml=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
await fs.writeFile('public/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/',...routes.map(r=>r.path)].map(p=>`<url><loc>${xml('https://saktibagchi.in'+p)}</loc></url>`).join('')}</urlset>`);
await fs.writeFile('public/feed/index.html',`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(settings.title)}</title><link>https://saktibagchi.in/</link><description>${xml(settings.description)}</description>${posts.slice(0,30).map(p=>`<item><title>${xml(p.title)}</title><link>${xml(p.canonical)}</link><guid>${xml(p.canonical)}</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate><description>${xml(p.description)}</description></item>`).join('')}</channel></rss>`);
console.log(`Prepared ${posts.length} published posts; drafts excluded from site, feeds, search and sitemap.`);

