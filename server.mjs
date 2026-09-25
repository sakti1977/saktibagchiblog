import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('dist');
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.xml':'application/xml','.txt':'text/plain','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml','.pdf':'application/pdf','.wav':'audio/wav','.avif':'image/avif','.mp3':'audio/mpeg','.mp4':'video/mp4','.ico':'image/x-icon'};
const live=process.env.SITE_LIVE==='true';
if(live&&process.env.CUTOVER_VALIDATED!=='true')throw Error('Production cutover has not been validated');
const ids=JSON.parse(await readFile(path.join(root,'id-map.json'),'utf8'));
http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  if(!live)res.setHeader('X-Robots-Tag','noindex, nofollow');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/health'){res.writeHead(200);return res.end('ok');}
    if(url.pathname==='/robots.txt'){res.setHeader('Content-Type','text/plain');return res.end(live?'User-agent: *\nAllow: /\nSitemap: https://saktibagchi.in/sitemap.xml\n':'User-agent: *\nDisallow: /\n');}
    const id=url.searchParams.get('p')||url.searchParams.get('page_id');
    if(id&&ids[id]){res.writeHead(301,{Location:ids[id]});return res.end();}
    let pathname=decodeURIComponent(url.pathname);
    let file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}
    const info=await stat(file);
    if(info.isDirectory()){
      if(!pathname.endsWith('/')&&!pathname.endsWith('.html')){res.writeHead(301,{Location:url.pathname+'/'+url.search});return res.end();}
      file=path.join(file,'index.html');
    }
    const data=await readFile(file);
    res.setHeader('Content-Type',url.pathname==='/feed/'?'application/rss+xml; charset=utf-8':types[path.extname(file).toLowerCase()]||'application/octet-stream');
    res.setHeader('Cache-Control',file.includes(`${path.sep}_astro${path.sep}`)?'public, max-age=31536000, immutable':'public, max-age=300');
    res.writeHead(200);res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});res.end(await readFile(path.join(root,'404.html')).catch(()=>Buffer.from('Not found')));}
}).listen(Number(process.env.PORT||3000),'0.0.0.0');

