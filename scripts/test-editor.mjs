import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const fixture='content/posts/zz-editor-test.json';
const prepare=()=>execFileSync(process.execPath,['scripts/prepare-content.mjs'],{stdio:'pipe'});
const read=async()=>JSON.parse(await fs.readFile('src/data/site.json','utf8'));
try{
 const entry={id:999999999,kind:'post',title:'Editorial workflow test',path:'/2099/01/01/editorial-workflow-test/',date:'2099-01-01T00:00:00Z',draft:true,html:'<p>A draft</p>',description:'Preview test',categoryNames:['Testing']};
 await fs.writeFile(fixture,JSON.stringify(entry));prepare();let data=await read();assert.ok(!data.posts.some(p=>p.id===entry.id));assert.ok(!data.routes.some(p=>p.path===entry.path));for(const f of ['public/sitemap.xml','public/feed/index.html','public/id-map.json'])assert.ok(!(await fs.readFile(f,'utf8')).includes('editorial-workflow-test'));
 entry.draft=false;entry.html='<p>Changed in the visual editor.</p><script>alert(1)</script>';await fs.writeFile(fixture,JSON.stringify(entry));prepare();data=await read();const published=data.posts.find(p=>p.id===entry.id);assert.ok(published.html.includes('Changed in the visual editor'));assert.ok(!published.html.includes('<script'));assert.ok(data.routes.find(p=>p.path==='/category/testing/').items.includes(entry.path));
 entry.path=data.posts.find(p=>p.id!==entry.id).path;await fs.writeFile(fixture,JSON.stringify(entry));assert.throws(prepare,/Duplicate permalink/);
 console.log('PASS: draft exclusion, publishing, rich-text sanitization, topic assignment, duplicate URL protection');
}finally{await fs.rm(fixture,{force:true});prepare();}
