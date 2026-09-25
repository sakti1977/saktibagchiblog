import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {load} from 'cheerio';
import sanitize from 'sanitize-html';
const root=process.cwd();
const read=async name=>JSON.parse((await fs.readFile(`source/wordpress/${name}.json`,'utf8')).replace(/^\uFEFF/,''));
const save=async(file,value)=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
const text=html=>load(html||'').text().replace(/\s+/g,' ').trim();
const [posts,pages,categories,tags,media,comments,users]=await Promise.all(['posts','pages','categories','tags','media','comments','users'].map(read));
const failures=[],assets=new Map(),features=[],metadata=[];
const mediaPath=raw=>{try{const u=new URL(raw,'https://saktibagchi.in');if(/^i\d\.wp\.com$/.test(u.hostname)&&u.pathname.startsWith('/saktibagchi.in/'))return decodeURI(u.pathname.replace('/saktibagchi.in',''));if(u.hostname==='saktibagchi.in'&&u.pathname.startsWith('/wp-content/uploads/'))return decodeURI(u.pathname);return null;}catch{return null;}};
const register=raw=>{const p=mediaPath(raw);if(p){assets.set(p,'https://saktibagchi.in'+encodeURI(p));return encodeURI(p);}return raw;};
const pool=async(items,fn,n=5)=>{let cursor=0;await Promise.all(Array.from({length:n},async()=>{while(cursor<items.length){const i=cursor++;await fn(items[i],i);}}));};
async function request(url){if(process.env.OFFLINE==='true')throw Error('Network download pending');for(let i=0;i<3;i++){try{const r=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!r.ok)throw Error(`HTTP ${r.status}`);return r;}catch(e){if(i===2)throw e;await new Promise(r=>setTimeout(r,500*(i+1)));}}}
function clean(html,record){const $=load(html||'',null,false);if($('form,script,iframe,object,embed').length)features.push({id:record.id,path:new URL(record.link).pathname,forms:$('form').length,iframes:$('iframe').map((_,e)=>$(e).attr('src')).get(),scripts:$('script').length});$('script,style,.sharedaddy,.jp-relatedposts,.wp-block-jetpack-subscriptions').remove();$('form').replaceWith('<p class="migration-notice">This form is being migrated. Please check back after the site launch.</p>');$('[src],[href],[poster]').each((_,el)=>{for(const attr of ['src','href','poster']){let v=$(el).attr(attr);if(!v)continue;if(mediaPath(v))v=register(v);else if(attr==='href'){try{const u=new URL(v,'https://saktibagchi.in');if(u.hostname==='saktibagchi.in')v=u.pathname+u.search+u.hash;}catch{}}$(el).attr(attr,v);}});$('img').each((_,el)=>{$(el).removeAttr('srcset').removeAttr('sizes').attr('loading','lazy');if(!$(el).attr('alt'))$(el).attr('alt','');});return sanitize($.html(),{allowedTags:sanitize.defaults.allowedTags.concat(['img','figure','figcaption','iframe','video','audio','source','details','summary']),allowedAttributes:{'*':['id','class'],a:['href','title','rel'],img:['src','alt','width','height','loading'],iframe:['src','title','width','height','allowfullscreen','loading'],video:['src','poster','controls','width','height'],audio:['src','controls'],source:['src','type'],td:['colspan','rowspan'],th:['colspan','rowspan']},allowedIframeHostnames:['www.youtube.com','www.youtube-nocookie.com','player.vimeo.com'],transformTags:{iframe:(tagName,attribs)=>({tagName,attribs:{...attribs,loading:'lazy',title:attribs.title||'Embedded media'}})}});}
for(const m of media)register(m.source_url);
const records=[];
await pool([...posts,...pages],async(p,i)=>{
 const url=new URL(p.link),cache=`reports/raw-html/${p.id}.html`;let raw;
 try{raw=await fs.readFile(cache,'utf8');}catch{try{raw=await (await request(p.link)).text();await save(cache,raw);}catch(e){failures.push({type:'page-fetch',url:p.link,error:e.message});}}
 const $=load(raw||'');
 const meta={id:p.id,url:p.link,title:$('title').text(),description:$('meta[name="description"]').attr('content')||$('meta[property="og:description"]').attr('content'),canonical:$('link[rel="canonical"]').attr('href'),robots:$('meta[name="robots"]').attr('content')};metadata.push(meta);
 const html=clean(p.content.rendered,p);
 const image=register(p.jetpack_featured_media_url||media.find(m=>m.id===p.featured_media)?.source_url||'');
 records.push({id:p.id,kind:p.type,path:url.pathname,title:text(p.title.rendered),seoTitle:meta.title||text(p.title.rendered)+' — Life as Sakti',description:meta.description||text(p.excerpt?.rendered||p.content.rendered).slice(0,180),canonical:meta.canonical||p.link,date:p.date_gmt+'Z',modified:p.modified_gmt+'Z',dateLabel:new Date(p.date_gmt+'Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}),image,html,categories:p.categories||[],tags:p.tags||[],categoryNames:(p.categories||[]).map(id=>text(categories.find(c=>c.id===id)?.name)).filter(Boolean)});
 await save(`content/${p.type}/${p.id}.html`,html);
 if((i+1)%25===0)console.log(`Copied content and SEO ${i+1}/${posts.length+pages.length}`);
});
const assetResults=[];
await pool([...assets],async([p,url],i)=>{const target=path.resolve('public','.'+p);if(!target.startsWith(path.resolve('public')+path.sep))throw Error('Unsafe asset path');try{let buffer;try{buffer=await fs.readFile(target);}catch{buffer=Buffer.from(await(await request(url)).arrayBuffer());await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,buffer);}assetResults.push({path:p,url,bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex')});}catch(e){failures.push({type:'media',url,path:p,error:e.message});}if((i+1)%50===0)console.log(`Copied media ${i+1}/${assets.size}`);},6);
const ordered=records.filter(p=>p.kind==='post').sort((a,b)=>b.date.localeCompare(a.date));
const routes=records.filter(p=>p.path!=='/');
function listing(p,title,items){if(!routes.some(r=>r.path===p))routes.push({path:p,title,kind:'listing',description:`Browse ${title.toLowerCase()} on Life as Sakti.`,canonical:'https://saktibagchi.in'+p,items:items.map(p=>p.path)});}
listing('/archive/','The writing archive',ordered);
for(const [type,terms]of [['category',categories],['tag',tags]])for(const t of terms){const items=ordered.filter(p=>p[type==='category'?'categories':'tags'].includes(t.id));if(items.length)listing(new URL(t.link).pathname,text(t.name),items);}
const years=new Set(ordered.map(p=>p.path.match(/^\/(\d{4})\//)?.[1]).filter(Boolean));
for(const y of years){listing(`/${y}/`,y,ordered.filter(p=>p.path.startsWith('/'+y+'/')));const months=new Set(ordered.filter(p=>p.path.startsWith('/'+y+'/')).map(p=>p.path.split('/')[2]));for(const m of months)listing(`/${y}/${m}/`,`${m}/${y}`,ordered.filter(p=>p.path.startsWith(`/${y}/${m}/`)));}
for(const u of users)listing(new URL(u.link).pathname,text(u.name),ordered);
const home=load(await fs.readFile('source/wordpress/homepage.html','utf8'));
const menu=[];home('nav a').each((_,el)=>{const label=home(el).text().trim();const href=home(el).attr('href');if(label&&href){try{const u=new URL(href,'https://saktibagchi.in');if(u.pathname!=='/'&&!menu.some(m=>m.path===(u.hostname==='saktibagchi.in'?u.pathname:u.href)))menu.push({label,path:u.hostname==='saktibagchi.in'?u.pathname:u.href});}catch{}}});
const data={home:records.find(p=>p.path==='/'),generatedAt:new Date().toISOString(),posts:ordered,routes,menu,comments:comments.filter(c=>c.type==='comment').map(c=>({id:c.id,parent:c.parent,post:c.post,author:c.author_name,date:c.date_gmt+'Z',html:sanitize(c.content.rendered)}))};
await save('src/data/site.json',data);
await save('public/id-map.json',Object.fromEntries(records.map(p=>[p.id,p.path])));
const xml=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
await save('public/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/',...routes.map(r=>r.path)].map(p=>`<url><loc>${xml('https://saktibagchi.in'+p)}</loc></url>`).join('')}</urlset>`);
await save('public/feed/index.html',`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Life as Sakti</title><link>https://saktibagchi.in/</link><description>Thoughts by Sakti</description>${ordered.slice(0,30).map(p=>`<item><title>${xml(p.title)}</title><link>${xml(p.canonical)}</link><guid>${xml(p.canonical)}</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate><description>${xml(p.description)}</description></item>`).join('')}</channel></rss>`);
await save('reports/audit.json',{generatedAt:data.generatedAt,counts:{posts:posts.length,pages:pages.length,categories:categories.length,tags:tags.length,mediaRecords:media.length,comments:comments.length,routes:routes.length+1,assets:assetResults.length},failures,features,metadata,assets:assetResults,menu});
console.log(JSON.stringify({counts:{posts:posts.length,pages:pages.length,routes:routes.length+1,media:assetResults.length},failures:failures.length,features:features.length,menu},null,2));


