import fs from 'node:fs/promises';
const root='source/wordpress';const checks=[];
for(const kind of ['posts','pages','categories','tags','media','comments','users']){const response=await fetch(`https://saktibagchi.in/wp-json/wp/v2/${kind}?per_page=1`);const data=JSON.parse((await fs.readFile(`${root}/${kind}.json`,'utf8')).replace(/^\uFEFF/,''));checks.push({kind,declaredTotal:Number(response.headers.get('x-wp-total')),exported:data.length,unique:new Set(data.map(p=>p.id)).size});}
const xml=await(await fetch('https://saktibagchi.in/sitemap-1.xml')).text();await fs.writeFile(`${root}/sitemap-1.xml`,xml);
await fs.writeFile('reports/source-completeness.json',JSON.stringify(checks,null,2));console.log(checks);
