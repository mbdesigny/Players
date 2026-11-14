import{createHash}from 'node:crypto';
import{readdirSync,statSync,readFileSync,writeFileSync}from 'node:fs';
import{join}from 'node:path';

const dist='dist';
function*walk(dir){
  for(const e of readdirSync(dir,{withFileTypes:true})){
    const p=join(dir,e.name);
    if(e.isDirectory())yield*walk(p);
    else if(e.name!=='sw.js')yield p;
  }
}
const h=createHash('sha256');
let count=0;
for(const p of walk(dist)){
  const st=statSync(p);
  h.update(p);h.update(String(st.size));
  if(st.size<2*1024*1024)h.update(readFileSync(p));
  count++;
}
const version=h.digest('hex').slice(0,10);
const swPath=join(dist,'sw.js');
let sw=readFileSync(swPath,'utf8');
if(!sw.includes('__CACHE_VERSION__')){
  if(process.argv.includes('--check')){console.log('sw version already bumped:',/ouns-app-([a-f0-9]+)/.exec(sw)?.[1]);process.exit(0)}
  console.error('sw.js has no __CACHE_VERSION__ placeholder');
  process.exit(1);
}
sw=sw.replace('__CACHE_VERSION__',version);
writeFileSync(swPath,sw);
console.log(`sw cache version: ${version} (${count} files hashed)`);
