export class ApiError extends Error{
  constructor(status,url){super('HTTP '+status);this.name='ApiError';this.status=status;this.url=url}
}
const cache=new Map();
export function clearApiCache(){cache.clear()}
const retryable=s=>s>=500||s===429;
export async function apiFetch(url,{timeout=10000,retries=1,headers,ttl=0}={}){
  const key=url+'\u0000'+JSON.stringify(headers||{});
  if(ttl>0){const hit=cache.get(key);if(hit&&Date.now()-hit.at<ttl)return hit.data}
  let lastErr;
  for(let attempt=0;attempt<=retries;attempt++){
    if(attempt)await new Promise(r=>setTimeout(r,400*attempt));
    const ctl=typeof AbortController!=='undefined'?new AbortController():null;
    const timer=ctl?setTimeout(()=>ctl.abort(),timeout):null;
    try{
      const res=await fetch(url,{signal:ctl?ctl.signal:undefined,headers});
      if(!res.ok)throw new ApiError(res.status,url);
      const data=await res.json();
      if(ttl>0)cache.set(key,{at:Date.now(),data});
      return data;
    }catch(e){
      lastErr=e;
      if(e instanceof ApiError&&!retryable(e.status))throw e;
    }finally{if(timer)clearTimeout(timer)}
  }
  throw lastErr;
}
let nomLast=0;
export const NOMINATIM_UA='Ouns/1.0 (Quran player; https://github.com/mbdesigny/Players)';
export async function nominatimSearch(q,lang){
  const wait=Math.max(0,1100-(Date.now()-nomLast));
  if(wait)await new Promise(r=>setTimeout(r,wait));
  nomLast=Date.now();
  const u=`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`;
  return apiFetch(u,{timeout:10000,retries:0,headers:{'Accept-Language':lang||'ar','User-Agent':NOMINATIM_UA}});
}
