import { bboxFor, overpassQueryForBBox, routeShadeGraph } from './shade-graph.js';

const VERSION = '1.9.4.31-production';
const JSON_HEADERS = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};
const UPSTREAM = {
  overpass:[
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter'
  ],
  nominatim:'https://nominatim.openstreetmap.org/search',
  osrm:'https://routing.openstreetmap.de/routed-foot/route/v1/driving',
  valhalla:[
    'https://valhalla.openstreetmap.de/route',
    'https://valhalla1.openstreetmap.de/route'
  ],
  weather:'https://api.open-meteo.com/v1/forecast',
  elevation:'https://api.open-meteo.com/v1/elevation',
  vworld:'https://api.vworld.kr/req/wfs'
};

function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{status,headers:{...JSON_HEADERS,'Access-Control-Allow-Origin':'*',...headers}});
}
function errorJson(message,status=500,extra={}){
  return json({ok:false,error:message,...extra},status);
}
function clientKey(request){
  // Prefer the app-install identifier so shared mobile/Wi-Fi IPs do not throttle unrelated users.
  // This is only a protective rate-limit key, not an authentication credential.
  const appId=String(request.headers.get('X-ShadeWay-Client')||'').trim();
  if(/^[A-Za-z0-9_-]{8,80}$/.test(appId))return appId;
  return request.headers.get('CF-Connecting-IP')||request.headers.get('x-forwarded-for')||'anon';
}
async function enforceRate(request,env,kind='api'){
  const binding=kind==='shade'?env.SHADE_ROUTE_RATE_LIMITER:env.API_RATE_LIMITER;
  if(!binding?.limit)return true;
  try{
    const key=`${clientKey(request)}:${kind}`;
    const r=await binding.limit({key});
    return !!r?.success;
  }catch{return true}
}
async function sha256(text){
  const data=new TextEncoder().encode(text);
  const buf=await crypto.subtle.digest('SHA-256',data);
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function fetchTimeout(url,options={},timeoutMs=9000){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);
  const parent=options.signal;
  const onAbort=()=>c.abort();
  if(parent){
    if(parent.aborted)c.abort();else parent.addEventListener('abort',onAbort,{once:true});
  }
  const started=Date.now();
  try{
    const res=await fetch(url,{...options,signal:c.signal});
    return {res,ms:Date.now()-started};
  }finally{
    clearTimeout(t);if(parent)parent.removeEventListener('abort',onAbort);
  }
}
async function d1Log(env,provider,ok,status,latencyMs,route){
  if(!env.DB?.prepare)return;
  try{
    await env.DB.prepare(`INSERT INTO api_health_log(ts,provider,ok,status,latency_ms,route) VALUES(datetime('now'),?,?,?,?,?)`)
      .bind(provider,ok?1:0,status||0,Math.round(latencyMs||0),route||'').run();
  }catch{}
}
async function upstreamJson(url,options,env,ctx,{provider='upstream',timeout=9000}={}){
  let lastErr=null;
  for(let attempt=0;attempt<2;attempt++){
    try{
      const {res,ms}=await fetchTimeout(url,options,timeout);
      ctx?.waitUntil?.(d1Log(env,provider,res.ok,res.status,ms,new URL(url).pathname));
      if(!res.ok){
        lastErr=new Error(`${provider} HTTP ${res.status}`);
        if((res.status===429||res.status>=500)&&attempt===0){await new Promise(r=>setTimeout(r,180));continue}
        throw lastErr;
      }
      const text=await res.text();
      return {data:JSON.parse(text),text,status:res.status,ms};
    }catch(e){
      lastErr=e;
      if(attempt===0&&e?.name!=='AbortError'){await new Promise(r=>setTimeout(r,180));continue}
      throw e;
    }
  }
  throw lastErr||new Error(`${provider} failed`);
}
async function cacheJson(cacheKey,ttl,ctx,loader){
  const cache=caches.default;
  const req=new Request(`https://cache.shadeway.internal/${cacheKey}`);
  const hit=await cache.match(req);
  if(hit){
    try{return {data:await hit.json(),cache:'HIT'}}catch{}
  }
  const data=await loader();
  const resp=new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json','Cache-Control':`s-maxage=${ttl}`}});
  ctx?.waitUntil?.(cache.put(req,resp.clone()));
  return {data,cache:'MISS'};
}
function safeParam(v,max=200){return String(v??'').slice(0,max)}
function haversineMeters(a,b){
  const R=6371000,rad=Math.PI/180;
  const p1=Number(a[0])*rad,p2=Number(b[0])*rad,dp=(Number(b[0])-Number(a[0]))*rad,dl=(Number(b[1])-Number(a[1]))*rad;
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}
function validBBox(s){
  const p=String(s||'').split(',').map(Number);
  if(p.length!==4||p.some(x=>!Number.isFinite(x)))return null;
  const [w,south,e,n]=p;
  if(w>=e||south>=n||south<-90||n>90||w<-180||e>180)return null;
  if((n-south)>.15||(e-w)>.2)return null;
  return {w,s:south,e,n};
}
function makeOverpassBuildingQuery(b){
  return `[out:json][timeout:12];(way["building"](${b.s},${b.w},${b.n},${b.e});way["building:part"](${b.s},${b.w},${b.n},${b.e}););out tags geom qt;`;
}
async function fetchOverpass(query,env,ctx,{ttl=900}={}){
  if(query.length>80000)throw new Error('Overpass query too large');
  const hash=await sha256(query);
  const cacheId=`overpass/${hash}`;
  try{
    const out=await cacheJson(cacheId,ttl,ctx,async()=>{
      let err=null;
      for(const ep of UPSTREAM.overpass){
        try{
          const r=await upstreamJson(ep,{
            method:'POST',
            headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8','User-Agent':'ShadeWay/1.9.4.31'},
            body:'data='+encodeURIComponent(query)
          },env,ctx,{provider:'Overpass',timeout:12000});
          if(env.BUILDING_DATA?.put){
            ctx?.waitUntil?.(env.BUILDING_DATA.put(`cache/${cacheId}.json`,r.text,{httpMetadata:{contentType:'application/json'},customMetadata:{storedAt:new Date().toISOString()}}).catch(()=>{}));
          }
          return r.data;
        }catch(e){err=e}
      }
      if(env.BUILDING_DATA?.get){
        try{
          const fallback=await env.BUILDING_DATA.get(`cache/${cacheId}.json`);
          if(fallback)return await fallback.json();
        }catch{}
      }
      throw err||new Error('Overpass unavailable');
    });
    return out;
  }catch(e){
    if(env.BUILDING_DATA?.get){
      try{
        const fallback=await env.BUILDING_DATA.get(`cache/${cacheId}.json`);
        if(fallback)return {data:await fallback.json(),cache:'R2-FALLBACK'};
      }catch{}
    }
    throw e;
  }
}
function allowQuery(url,allowed){
  const p=new URLSearchParams();
  for(const k of allowed)if(url.searchParams.has(k))p.set(k,safeParam(url.searchParams.get(k),1200));
  return p;
}
async function proxySearch(url,env,ctx){
  const q=safeParam(url.searchParams.get('q'),100).trim();
  if(!q)return errorJson('q required',400);
  const p=allowQuery(url,['format','addressdetails','limit','countrycodes','accept-language','q','viewbox','bounded']);
  p.set('q',q);if(!p.get('format'))p.set('format','jsonv2');p.set('limit',String(Math.min(30,Math.max(1,Number(p.get('limit'))||20))));
  const key=await sha256(p.toString());
  const out=await cacheJson(`search/${key}`,300,ctx,async()=>{
    const r=await upstreamJson(`${UPSTREAM.nominatim}?${p}`,{
      headers:{'Accept':'application/json','User-Agent':'ShadeWay/1.9.4.31 (walking navigation research)'}
    },env,ctx,{provider:'Nominatim',timeout:7000});
    return r.data;
  });
  return json(out.data,200,{'X-ShadeWay-Cache':out.cache});
}
async function proxyOSRM(url,env,ctx){
  const coords=safeParam(url.searchParams.get('coords'),1800);
  if(!coords||!/^-?\d/.test(coords))return errorJson('coords required',400);
  const alternatives=url.searchParams.get('alternatives')==='true'?'true':'false';
  const target=`${UPSTREAM.osrm}/${coords}?overview=full&geometries=geojson&alternatives=${alternatives}&steps=true`;
  const key=await sha256(target);
  const out=await cacheJson(`route/osrm/${key}`,60,ctx,async()=>{
    const r=await upstreamJson(target,{},env,ctx,{provider:'OSRM',timeout:9000});return r.data;
  });
  return json(out.data,200,{'X-ShadeWay-Cache':out.cache});
}
async function proxyValhalla(url,env,ctx){
  const raw=safeParam(url.searchParams.get('json'),5000);
  if(!raw)return errorJson('json required',400);
  try{JSON.parse(raw)}catch{return errorJson('invalid json',400)}
  const key=await sha256(raw),out=await cacheJson(`route/valhalla/${key}`,60,ctx,async()=>{
    let err=null;
    for(const ep of UPSTREAM.valhalla){
      try{const r=await upstreamJson(`${ep}?json=${encodeURIComponent(raw)}`,{},env,ctx,{provider:'Valhalla',timeout:9000});return r.data}catch(e){err=e}
    }
    throw err||new Error('Valhalla unavailable');
  });
  return json(out.data,200,{'X-ShadeWay-Cache':out.cache});
}
async function proxyOpenMeteo(url,env,ctx,type){
  const targetBase=type==='elevation'?UPSTREAM.elevation:UPSTREAM.weather;
  const allowed=type==='elevation'?['latitude','longitude']:['latitude','longitude','current','hourly','forecast_days','timezone','past_days'];
  const p=allowQuery(url,allowed);
  if(!p.get('latitude')||!p.get('longitude'))return errorJson('latitude/longitude required',400);
  const key=await sha256(p.toString()),ttl=type==='elevation'?86400:300;
  const out=await cacheJson(`${type}/${key}`,ttl,ctx,async()=>{
    const r=await upstreamJson(`${targetBase}?${p}`,{},env,ctx,{provider:'Open-Meteo',timeout:9000});return r.data;
  });
  return json(out.data,200,{'X-ShadeWay-Cache':out.cache});
}
async function proxyOverpass(request,env,ctx){
  const body=await request.text();
  const params=new URLSearchParams(body),query=params.get('data')||body;
  if(!query)return errorJson('Overpass data query required',400);
  const out=await fetchOverpass(query,env,ctx,{ttl:900});
  return json(out.data,200,{'X-ShadeWay-Cache':out.cache});
}
async function proxyBuildings(url,env,ctx){
  const b=validBBox(url.searchParams.get('bbox'));
  if(!b)return errorJson('bbox=w,s,e,n required (max neighborhood extent)',400);
  const out=await fetchOverpass(makeOverpassBuildingQuery(b),env,ctx,{ttl:1800});
  return json(out.data,200,{'X-ShadeWay-Cache':out.cache});
}
async function proxyVWorld(url,env,ctx){
  if(!env.VWORLD_KEY)return errorJson('VWORLD_KEY secret not configured',503);
  const b=validBBox(url.searchParams.get('bbox'));if(!b)return errorJson('bbox required',400);
  const typename=safeParam(url.searchParams.get('typename')||env.VWORLD_TYPENAME||'lt_c_spbd',80);
  const p=new URLSearchParams({
    key:env.VWORLD_KEY,
    domain:env.VWORLD_DOMAIN||new URL(url).hostname,
    SERVICE:'WFS',VERSION:'1.1.0',REQUEST:'GetFeature',TYPENAME:typename,
    BBOX:`${b.w},${b.s},${b.e},${b.n}`,SRSNAME:'EPSG:4326',MAXFEATURES:'1000',OUTPUT:'application/json'
  });
  const key=await sha256(p.toString().replace(env.VWORLD_KEY,'***'));
  const out=await cacheJson(`vworld/${key}`,3600,ctx,async()=>{
    const r=await upstreamJson(`${UPSTREAM.vworld}?${p}`,{},env,ctx,{provider:'VWorld',timeout:9000});return r.data;
  });
  return json(out.data,200,{'X-ShadeWay-Cache':out.cache});
}
async function fetchElevations(coords,env,ctx){
  if(!coords?.length)return null;
  const out=[];
  for(let i=0;i<coords.length;i+=100){
    const batch=coords.slice(i,i+100);
    const p=new URLSearchParams({
      latitude:batch.map(x=>x[0].toFixed(6)).join(','),
      longitude:batch.map(x=>x[1].toFixed(6)).join(',')
    });
    const key=await sha256(p.toString());
    const r=await cacheJson(`elevation/${key}`,86400,ctx,async()=>{
      const j=await upstreamJson(`${UPSTREAM.elevation}?${p}`,{},env,ctx,{provider:'Open-Meteo',timeout:9000});return j.data;
    });
    const arr=Array.isArray(r.data?.elevation)?r.data.elevation:[];
    out.push(...arr.map(Number));
  }
  return out;
}
async function shadeRoute(request,env,ctx){
  let input;
  try{input=await request.json()}catch{return errorJson('JSON body required',400)}
  const start=input?.start,destination=input?.destination;
  if(!Array.isArray(start)||!Array.isArray(destination)||start.length<2||destination.length<2)return errorJson('start/destination [lat,lon] required',400);
  if([...start,...destination].some(x=>!Number.isFinite(Number(x))))return errorJson('invalid coordinates',400);
  input.start=start.map(Number);input.destination=destination.map(Number);
  const direct=haversineMeters(input.start,input.destination);
  const maxMeters=Math.max(1000,Math.min(12000,Number(env.SHADE_GRAPH_MAX_METERS)||6000));
  if(direct>maxMeters)return errorJson(`Shade Graph beta is limited to neighborhood walking routes (<= ${Math.round(maxMeters/1000)} km).`,422,{directMeters:Math.round(direct),maxMeters});
  const bbox=bboxFor(input.start,input.destination);
  const query=overpassQueryForBBox(bbox);
  const osm=await fetchOverpass(query,env,ctx,{ttl:600});
  const result=await routeShadeGraph(osm.data,input,{elevationFetcher:(coords)=>fetchElevations(coords,env,ctx)});
  result.ok=true;result.backend=VERSION;result.cache=osm.cache;
  return json(result,200,{'X-ShadeWay-Cache':osm.cache});
}
async function serveR2(request,url,env){
  if(!env.BUILDING_DATA?.get)return errorJson('R2 BUILDING_DATA binding not configured',503);
  const prefix='/api/building-pmtiles/';
  let key=decodeURIComponent(url.pathname.slice(prefix.length));
  if(!key)key=env.R2_PM_TILES_KEY||'korea-buildings.pmtiles';
  if(!/^[A-Za-z0-9._/-]+$/.test(key)||key.includes('..'))return errorJson('invalid object key',400);
  const conditional=new Headers();
  for(const h of ['If-Match','If-None-Match','If-Modified-Since','If-Unmodified-Since'])if(request.headers.has(h))conditional.set(h,request.headers.get(h));
  const opts={};if(request.headers.has('Range'))opts.range=request.headers;if([...conditional].length)opts.onlyIf=conditional;
  const obj=await env.BUILDING_DATA.get(key,opts);
  if(!obj)return new Response('Not found',{status:404});
  const headers=new Headers();obj.writeHttpMetadata(headers);headers.set('etag',obj.httpEtag);headers.set('Accept-Ranges','bytes');headers.set('Access-Control-Allow-Origin','*');
  // R2 conditional GET can return metadata without a body when preconditions fail.
  if(!('body' in obj))return new Response(null,{status:412,headers});
  let status=200;
  if(obj.range&&Number.isFinite(obj.range.offset)&&Number.isFinite(obj.range.length)){
    status=206;headers.set('Content-Range',`bytes ${obj.range.offset}-${obj.range.offset+obj.range.length-1}/${obj.size}`);
    headers.set('Content-Length',String(obj.range.length));
  }else headers.set('Content-Length',String(obj.size));
  return new Response(obj.body,{status,headers});
}
async function telemetry(request,env){
  if(String(env.ALLOW_TELEMETRY||'false')!=='true')return errorJson('Server telemetry is disabled',403);
  if(!env.DB?.prepare)return errorJson('D1 DB binding not configured',503);
  let data;try{data=await request.json()}catch{return errorJson('JSON required',400)}
  const id=String(data.id||crypto.randomUUID()).slice(0,80),kind=String(data.kind||'walk').slice(0,30),payload=JSON.stringify(data).slice(0,120000);
  await env.DB.prepare(`INSERT OR REPLACE INTO route_telemetry(id,created_at,kind,payload) VALUES(?,datetime('now'),?,?)`).bind(id,kind,payload).run();
  return json({ok:true,id});
}
async function deepHealth(env,ctx){
  const tests={};
  const run=async(name,fn)=>{const s=Date.now();try{await fn();tests[name]={ok:true,ms:Date.now()-s}}catch(e){tests[name]={ok:false,ms:Date.now()-s,error:e?.message||String(e)}}};
  await Promise.all([
    run('nominatim',async()=>{await upstreamJson(`${UPSTREAM.nominatim}?format=jsonv2&limit=1&q=Seoul`,{headers:{'User-Agent':'ShadeWay/1.9.4.31'}},env,ctx,{provider:'Nominatim',timeout:5000})}),
    run('openMeteo',async()=>{await upstreamJson(`${UPSTREAM.weather}?latitude=37.5665&longitude=126.978&current=temperature_2m`,{},env,ctx,{provider:'Open-Meteo',timeout:5000})}),
    run('osrm',async()=>{await upstreamJson(`${UPSTREAM.osrm}/126.978,37.5665;126.979,37.567?overview=false&steps=false`,{},env,ctx,{provider:'OSRM',timeout:6000})}),
    run('overpass',async()=>{await fetchOverpass(`[out:json][timeout:5];node(37.565,126.977,37.566,126.978);out 1;`,env,ctx,{ttl:60})})
  ]);
  if(env.DB?.prepare)await run('d1',async()=>{await env.DB.prepare('SELECT 1 AS ok').first()});
  if(env.BUILDING_DATA?.list)await run('r2',async()=>{await env.BUILDING_DATA.list({limit:1})});
  return tests;
}
async function health(url,env,ctx){
  const capabilities={
    d1:!!env.DB?.prepare,
    r2:!!env.BUILDING_DATA?.get,
    rateLimit:!!env.API_RATE_LIMITER?.limit,
    shadeRouteRateLimit:!!env.SHADE_ROUTE_RATE_LIMITER?.limit,
    vworldSecret:!!env.VWORLD_KEY,
    telemetry:String(env.ALLOW_TELEMETRY||'false')==='true'
  };
  const data={ok:true,service:'ShadeWay Cloud Backend',version:VERSION,mode:'production',time:new Date().toISOString(),limits:{shadeGraphMaxMeters:Math.max(1000,Math.min(12000,Number(env.SHADE_GRAPH_MAX_METERS)||6000))},capabilities};
  if(url.searchParams.get('deep')==='1')data.tests=await deepHealth(env,ctx);
  return json(data);
}
async function handleApi(request,env,ctx){
  const url=new URL(request.url);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, X-ShadeWay-Client','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}});
  const kind=url.pathname==='/api/shade-route'?'shade':'api';
  if(!await enforceRate(request,env,kind))return json({ok:false,error:'Rate limit exceeded',retryAfterSeconds:60},429,{'Retry-After':'60'});
  try{
    if(url.pathname==='/api/health'&&request.method==='GET')return health(url,env,ctx);
    if(url.pathname==='/api/search'&&request.method==='GET')return proxySearch(url,env,ctx);
    if(url.pathname==='/api/route/osrm'&&request.method==='GET')return proxyOSRM(url,env,ctx);
    if(url.pathname==='/api/route/valhalla'&&request.method==='GET')return proxyValhalla(url,env,ctx);
    if(url.pathname==='/api/weather'&&request.method==='GET')return proxyOpenMeteo(url,env,ctx,'weather');
    if(url.pathname==='/api/elevation'&&request.method==='GET')return proxyOpenMeteo(url,env,ctx,'elevation');
    if(url.pathname==='/api/overpass'&&request.method==='POST')return proxyOverpass(request,env,ctx);
    if(url.pathname==='/api/buildings'&&request.method==='GET')return proxyBuildings(url,env,ctx);
    if(url.pathname==='/api/vworld'&&request.method==='GET')return proxyVWorld(url,env,ctx);
    if(url.pathname.startsWith('/api/building-pmtiles/')&&request.method==='GET')return serveR2(request,url,env);
    if(url.pathname==='/api/shade-route'&&request.method==='POST')return shadeRoute(request,env,ctx);
    if(url.pathname==='/api/telemetry'&&request.method==='POST')return telemetry(request,env);
    return errorJson('API route not found',404);
  }catch(e){
    const status=e?.name==='AbortError'?504:502;
    return errorJson(e?.message||'backend error',status,{name:e?.name||'Error'});
  }
}
export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(url.pathname.startsWith('/api/'))return handleApi(request,env,ctx);
    if(env.ASSETS?.fetch)return env.ASSETS.fetch(request);
    return new Response('ShadeWay backend',{status:200});
  }
};
