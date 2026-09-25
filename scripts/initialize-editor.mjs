import fs from 'node:fs/promises';
import path from 'node:path';
const read=async f=>JSON.parse((await fs.readFile(f,'utf8')).replace(/^\uFEFF/,''));
const data=await read('src/data/site.json');
await fs.mkdir('content/posts',{recursive:true});await fs.mkdir('content/pages',{recursive:true});await fs.mkdir('content/settings',{recursive:true});
for(const p of [data.home,...data.routes.filter(p=>['post','page'].includes(p.kind))]){const folder=p.kind==='post'?'posts':'pages';await fs.writeFile(`content/${folder}/${p.id}.json`,JSON.stringify({...p,draft:false},null,2));}
await fs.writeFile('content/settings/site.json',JSON.stringify({title:'Life as Sakti',tagline:'NOTES ON A LIFE OF LEARNING',headline:'Learning from life.',headlineAccent:'Thinking out loud.',intro:'I’m Sakti. I listen, observe, and explore the rhythms of human behavior, technology, and the world around us. These are my notes along the way.',description:data.home.description,menu:data.menu},null,2));
await fs.writeFile('content/settings/comments.json',JSON.stringify(data.comments));
const tax={categories:await read('source/wordpress/categories.json'),tags:await read('source/wordpress/tags.json'),users:await read('source/wordpress/users.json')};
await fs.writeFile('content/settings/taxonomy.json',JSON.stringify(tax));
console.log('Created editable entries for',data.posts.length,'posts and',data.routes.filter(p=>p.kind==='page').length+1,'pages');
