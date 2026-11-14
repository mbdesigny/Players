import{test,describe,beforeEach,afterEach}from 'node:test';
import assert from 'node:assert/strict';
import{apiFetch,ApiError,nominatimSearch,clearApiCache,NOMINATIM_UA}from '../src/scripts/lib/api.js';

const realFetch=globalThis.fetch;
function useFetch(fn){globalThis.fetch=fn}
describe('apiFetch',()=>{
  beforeEach(()=>clearApiCache());
  afterEach(()=>{globalThis.fetch=realFetch});
  test('returns parsed JSON on ok response',async()=>{
    useFetch(async()=>({ok:true,json:async()=>({a:1})}));
    assert.deepEqual(await apiFetch('https://x.test/a'),{a:1});
  });
  test('throws ApiError with status on http error',async()=>{
    useFetch(async()=>({ok:false,status:404}));
    await assert.rejects(()=>apiFetch('https://x.test/a',{retries:0}),e=>e instanceof ApiError&&e.status===404);
  });
  test('fails fast on 4xx without retry',async()=>{
    let calls=0;
    useFetch(async()=>{calls++;return{ok:false,status:400}});
    await assert.rejects(()=>apiFetch('https://x.test/a',{retries:3}),ApiError);
    assert.equal(calls,1);
  });
  test('retries on 5xx then succeeds',async()=>{
    let calls=0;
    useFetch(async()=>{calls++;if(calls<3)return{ok:false,status:503};return{ok:true,json:async()=>({ok:1})}});
    const j=await apiFetch('https://x.test/a',{retries:3});
    assert.equal(calls,3);
    assert.deepEqual(j,{ok:1});
  });
  test('retries on 429',async()=>{
    let calls=0;
    useFetch(async()=>{calls++;if(calls<2)return{ok:false,status:429};return{ok:true,json:async()=>({})}});
    await apiFetch('https://x.test/a',{retries:2});
    assert.equal(calls,2);
  });
  test('times out slow responses',async()=>{
    useFetch((u,o)=>new Promise((res,rej)=>{
      o.signal.addEventListener('abort',()=>{const e=new Error('aborted');e.name='AbortError';rej(e)});
      setTimeout(()=>res({ok:true,json:async()=>({})}),5000);
    }));
    await assert.rejects(()=>apiFetch('https://x.test/a',{timeout:30,retries:0}));
  });
  test('cache hit within ttl avoids refetch',async()=>{
    let calls=0;
    useFetch(async()=>{calls++;return{ok:true,json:async()=>({n:calls})}});
    const a=await apiFetch('https://x.test/c',{ttl:60000});
    const b=await apiFetch('https://x.test/c',{ttl:60000});
    assert.equal(calls,1);
    assert.deepEqual(a,b);
  });
  test('cache respects different headers as different keys',async()=>{
    let calls=0;
    useFetch(async()=>{calls++;return{ok:true,json:async()=>({n:calls})}});
    await apiFetch('https://x.test/h',{ttl:60000,headers:{'Accept-Language':'ar'}});
    await apiFetch('https://x.test/h',{ttl:60000,headers:{'Accept-Language':'en'}});
    assert.equal(calls,2);
  });
});
describe('nominatimSearch',()=>{
  afterEach(()=>{globalThis.fetch=realFetch});
  test('sends Accept-Language and User-Agent headers',async()=>{
    let seen=null;
    useFetch(async(u,o)=>{seen={u:String(u),h:o&&o.headers};return{ok:true,json:async()=>([])}});
    await nominatimSearch('ميلة','ar');
    assert.match(seen.u,/nominatim\.openstreetmap\.org\/search\?q=/);
    assert.match(seen.u,/q=%D9%85%D9%8A%D9%84%D8%A9/);
    assert.equal(seen.h['Accept-Language'],'ar');
    assert.equal(seen.h['User-Agent'],NOMINATIM_UA);
  });
  test('throttles consecutive requests to ~1/sec',async()=>{
    useFetch(async()=>({ok:true,json:async()=>([])}));
    const t0=Date.now();
    await nominatimSearch('a','ar');
    await nominatimSearch('b','ar');
    const dt=Date.now()-t0;
    assert.ok(dt>=1000,`second call waited only ${dt}ms`);
  });
});
