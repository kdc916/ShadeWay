const WALKABLE_HIGHWAYS = new Set([
  'footway','path','pedestrian','residential','living_street','service',
  'tertiary','tertiary_link','secondary','secondary_link','primary','primary_link',
  'unclassified','track','steps','crossing','road'
]);

const R = 6371000;
const RAD = Math.PI / 180;

export function haversine(a,b){
  const p1=a[0]*RAD,p2=b[0]*RAD,dp=(b[0]-a[0])*RAD,dl=(b[1]-a[1])*RAD;
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.sqrt(Math.max(0,Math.min(1,h))));
}
export function bearing(a,b){
  const y=Math.sin((b[1]-a[1])*RAD)*Math.cos(b[0]*RAD);
  const x=Math.cos(a[0]*RAD)*Math.sin(b[0]*RAD)-Math.sin(a[0]*RAD)*Math.cos(b[0]*RAD)*Math.cos((b[1]-a[1])*RAD);
  return (Math.atan2(y,x)/RAD+360)%360;
}
function signedTurn(a,b){
  let d=(b-a+540)%360-180;
  return d;
}
export function bboxFor(start,dest,{maxPadM=700,minPadM=220}={}){
  const direct=haversine(start,dest);
  const pad=Math.max(minPadM,Math.min(maxPadM,direct*.28+100));
  const midLat=(start[0]+dest[0])/2;
  const dLat=pad/111320;
  const dLon=pad/(111320*Math.max(.25,Math.cos(midLat*RAD)));
  return {
    south:Math.min(start[0],dest[0])-dLat,
    west:Math.min(start[1],dest[1])-dLon,
    north:Math.max(start[0],dest[0])+dLat,
    east:Math.max(start[1],dest[1])+dLon
  };
}
export function overpassQueryForBBox(b){
  const box=`${b.south},${b.west},${b.north},${b.east}`;
  return `[out:json][timeout:18];(
way["highway"~"^(footway|path|pedestrian|residential|living_street|service|tertiary|tertiary_link|secondary|secondary_link|primary|primary_link|unclassified|track|steps|crossing|road)$"](${box});
way["building"](${box});
way["building:part"](${box});
);out body;>;out body qt;`;
}
function parseMeters(v){
  if(v==null)return NaN;
  const m=String(v).replace(',','.').match(/-?\d+(?:\.\d+)?/);
  return m?Number(m[0]):NaN;
}
function heightFromTags(t={}){
  const h=parseMeters(t.height);
  if(Number.isFinite(h)&&h>0)return Math.max(2,Math.min(350,h));
  const levels=Number(String(t['building:levels']??'').replace(',','.'));
  const roof=parseMeters(t['roof:height']);
  if(Number.isFinite(levels)&&levels>0)return Math.max(3,Math.min(250,levels*3+(Number.isFinite(roof)?roof:0)));
  const type=String(t.building||'').toLowerCase();
  if(/house|detached|terrace|bungalow/.test(type))return 8;
  if(/apartments|residential/.test(type))return 15;
  if(/industrial|warehouse/.test(type))return 10;
  if(/school|college|university/.test(type))return 12;
  return 12;
}
function isWalkable(tags={}){
  const h=String(tags.highway||'');
  if(!WALKABLE_HIGHWAYS.has(h))return false;
  const foot=String(tags.foot||'').toLowerCase();
  const access=String(tags.access||'').toLowerCase();
  if(foot==='no'||foot==='private')return false;
  if((access==='no'||access==='private')&&!['yes','designated','permissive'].includes(foot))return false;
  return true;
}
function oneWayFoot(tags={}){
  const f=String(tags['oneway:foot']??'').toLowerCase();
  if(['yes','1','true'].includes(f))return 1;
  if(['-1','reverse'].includes(f))return -1;
  return 0;
}
function polygonArea(poly){
  let a=0;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++)a+=(poly[j][1]*poly[i][0]-poly[i][1]*poly[j][0]);
  return a/2;
}
function convexHull(points){
  if(points.length<=3)return points.slice();
  const pts=points.map(p=>[p[1],p[0]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lo=[];
  for(const p of pts){while(lo.length>=2&&cross(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
  const up=[];
  for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(up.length>=2&&cross(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}
  const out=lo.slice(0,-1).concat(up.slice(0,-1));
  return out.map(p=>[p[1],p[0]]);
}
function pip(pt,poly){
  const x=pt[1],y=pt[0];let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i][1],yi=poly[i][0],xj=poly[j][1],yj=poly[j][0];
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi+1e-14)+xi))inside=!inside;
  }
  return inside;
}
function dayOfYearUTC(d){
  const start=Date.UTC(d.getUTCFullYear(),0,0);
  return Math.floor((Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())-start)/86400000);
}
export function solarUTC(dateInput,lat,lon){
  const d=dateInput instanceof Date?dateInput:new Date(dateInput||Date.now());
  const y=d.getUTCFullYear();
  const leap=y%4===0&&(y%100!==0||y%400===0),days=leap?366:365;
  const day=dayOfYearUTC(d),hour=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600;
  const g=2*Math.PI/days*(day-1+(hour-12)/24);
  const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const dec=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  let tst=(hour*60+eq+4*lon)%1440;if(tst<0)tst+=1440;
  let ha=tst/4-180;if(ha<-180)ha+=360;
  const har=ha*RAD,lar=lat*RAD;
  const cz=Math.max(-1,Math.min(1,Math.sin(lar)*Math.sin(dec)+Math.cos(lar)*Math.cos(dec)*Math.cos(har)));
  const zen=Math.acos(cz),alt=90-zen/RAD;
  let az=Math.atan2(Math.sin(har),Math.cos(har)*Math.sin(lar)-Math.tan(dec)*Math.cos(lar))/RAD+180;
  return {alt,az:(az+360)%360};
}
function shiftByMeters(p,meters,bearingDeg,latRef){
  const br=bearingDeg*RAD;
  const north=Math.cos(br)*meters,east=Math.sin(br)*meters;
  return [p[0]+north/111320,p[1]+east/(111320*Math.max(.2,Math.cos(latRef*RAD)))];
}
function polyBBox(poly){
  let s=90,n=-90,w=180,e=-180;
  for(const p of poly){s=Math.min(s,p[0]);n=Math.max(n,p[0]);w=Math.min(w,p[1]);e=Math.max(e,p[1])}
  return {s,n,w,e};
}
function buildShadowIndex(buildings,solar,latRef){
  const cell=.0012,index=new Map(),polys=[];
  if(solar.alt<=0.5)return {cell,index,polys,night:true};
  const shadowDir=(solar.az+180)%360;
  const tan=Math.tan(Math.max(.5,solar.alt)*RAD);
  for(const b of buildings){
    const len=Math.min(650,b.height/Math.max(.01,tan));
    if(len<.5)continue;
    const shifted=b.poly.map(p=>shiftByMeters(p,len,shadowDir,latRef));
    const hull=convexHull(b.poly.concat(shifted));
    const bb=polyBBox(hull),idx=polys.length;polys.push(hull);
    const x0=Math.floor(bb.w/cell),x1=Math.floor(bb.e/cell),y0=Math.floor(bb.s/cell),y1=Math.floor(bb.n/cell);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const k=`${x},${y}`;let arr=index.get(k);if(!arr)index.set(k,arr=[]);arr.push(idx);
    }
  }
  return {cell,index,polys,night:false};
}
function shadeAt(pt,si){
  if(si.night)return 1;
  const k=`${Math.floor(pt[1]/si.cell)},${Math.floor(pt[0]/si.cell)}`;
  for(const i of si.index.get(k)||[])if(pip(pt,si.polys[i]))return 1;
  return 0;
}
function edgeShade(a,b,si){
  const d=haversine(a,b);
  const n=Math.max(1,Math.min(6,Math.ceil(d/14)));let s=0;
  for(let i=0;i<n;i++){const t=(i+.5)/n;s+=shadeAt([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],si)}
  return s/n;
}
function highwayPenalty(tags={}){
  const h=String(tags.highway||'');
  if(h==='steps')return 1.45;
  if(h==='track')return 1.16;
  if(h==='primary'||h==='primary_link')return 1.12;
  if(h==='secondary'||h==='secondary_link')return 1.08;
  const sidewalk=String(tags.sidewalk||'').toLowerCase();
  if(['no','none'].includes(sidewalk)&&['primary','secondary','tertiary'].some(x=>h.startsWith(x)))return 1.18;
  return 1;
}
export function parseOSM(osm){
  const nodes=new Map(),ways=[];
  for(const e of osm?.elements||[]){
    if(e.type==='node'&&Number.isFinite(e.lat)&&Number.isFinite(e.lon))nodes.set(e.id,{id:e.id,lat:e.lat,lon:e.lon,tags:e.tags||{}});
    else if(e.type==='way')ways.push(e);
  }
  const buildings=[],roadWays=[];
  for(const w of ways){
    const tags=w.tags||{};
    if(tags.building||tags['building:part']){
      const poly=(w.nodes||[]).map(id=>nodes.get(id)).filter(Boolean).map(n=>[n.lat,n.lon]);
      if(poly.length>=3){
        if(haversine(poly[0],poly[poly.length-1])<.5)poly.pop();
        if(poly.length>=3&&Math.abs(polygonArea(poly))>1e-12)buildings.push({poly,height:heightFromTags(tags),tags});
      }
    }else if(tags.highway&&isWalkable(tags))roadWays.push(w);
  }
  return {nodes,roadWays,buildings};
}
export function buildGraph(parsed,solar){
  const graph=new Map(),edgeMap=new Map(),latRef=[...parsed.nodes.values()].slice(0,1)[0]?.lat||37.5;
  const shadows=buildShadowIndex(parsed.buildings,solar,latRef);
  const add=(from,to,way,wayIndex,dir)=>{
    const na=parsed.nodes.get(from),nb=parsed.nodes.get(to);if(!na||!nb)return;
    const a=[na.lat,na.lon],b=[nb.lat,nb.lon],d=haversine(a,b);if(!Number.isFinite(d)||d<.3||d>500)return;
    const tags=way.tags||{},shade=edgeShade(a,b,shadows);
    const edge={from,to,a,b,d,shade,tags,wayId:way.id,wayIndex,dir,name:tags.name||tags.ref||'',highway:tags.highway||'',penalty:highwayPenalty(tags)};
    if(!graph.has(from))graph.set(from,[]);graph.get(from).push(edge);edgeMap.set(`${from}:${to}:${way.id}`,edge);
  };
  parsed.roadWays.forEach((w,wi)=>{
    const ids=w.nodes||[],ow=oneWayFoot(w.tags||{});
    for(let i=1;i<ids.length;i++){
      if(ow>=0)add(ids[i-1],ids[i],w,wi,1);
      if(ow<=0)add(ids[i],ids[i-1],w,wi,-1);
    }
  });
  return {graph,edgeMap,shadows};
}
class MinHeap{
  constructor(){this.a=[]}
  push(item){const a=this.a;a.push(item);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p][0]<=item[0])break;a[i]=a[p];i=p}a[i]=item}
  pop(){const a=this.a;if(!a.length)return null;const root=a[0],last=a.pop();if(a.length){let i=0;a[0]=last;for(;;){let l=i*2+1,r=l+1,s=i;if(l<a.length&&a[l][0]<a[s][0])s=l;if(r<a.length&&a[r][0]<a[s][0])s=r;if(s===i)break;[a[i],a[s]]=[a[s],a[i]];i=s}}return root}
  get size(){return this.a.length}
}
function nearestNode(nodes,pt){
  let best=null,bd=Infinity;
  for(const n of nodes.values()){const d=haversine(pt,[n.lat,n.lon]);if(d<bd){bd=d;best=n}}
  return {node:best,d:bd};
}
function heatNorm(weather={}){
  const feel=Number(weather.feel??weather.apparent_temperature??weather.temp??weather.temperature??28);
  const uv=Math.max(0,Number(weather.uv??weather.uv_index??5)||0);
  const cloud=Math.max(0,Math.min(100,Number(weather.cloud??weather.cloud_cover??30)||0));
  return Math.max(0,Math.min(2.2,(feel-20)/16+uv/9))*(1-cloud*.004);
}
function edgeCost(edge,{cool=0.75,speed=1.333,weather={},distanceOnly=false}={}){
  if(distanceOnly)return edge.d;
  const seconds=edge.d/Math.max(.6,speed)*edge.penalty;
  const sun=seconds*(1-edge.shade),heat=heatNorm(weather);
  const timeWeight=1-Math.min(.72,cool*.48);
  const sunWeight=.45+cool*2.5;
  return seconds*timeWeight+sun*sunWeight+sun*heat*cool*.72;
}
function aStar(parsed,built,startId,goalId,opts={}){
  const {graph}=built,nodes=parsed.nodes;
  const goal=nodes.get(goalId);if(!goal)return null;
  const g=new Map([[startId,0]]),prev=new Map(),heap=new MinHeap();
  heap.push([0,startId]);
  let expanded=0;
  while(heap.size){
    const [f,u]=heap.pop();const gu=g.get(u);if(gu==null)continue;
    if(u===goalId)break;
    if(++expanded>60000)return null;
    for(const e of graph.get(u)||[]){
      const ng=gu+edgeCost(e,opts);
      if(ng+1e-9<(g.get(e.to)??Infinity)){
        g.set(e.to,ng);prev.set(e.to,{u,edge:e});
        const n=nodes.get(e.to),h=opts.distanceOnly?haversine([n.lat,n.lon],[goal.lat,goal.lon]):haversine([n.lat,n.lon],[goal.lat,goal.lon])/Math.max(.6,opts.speed||1.333)*.45;
        heap.push([ng+h,e.to]);
      }
    }
  }
  if(!g.has(goalId))return null;
  const ids=[goalId],edges=[];let cur=goalId;
  while(cur!==startId){const p=prev.get(cur);if(!p)return null;edges.push(p.edge);cur=p.u;ids.push(cur)}
  ids.reverse();edges.reverse();
  return {ids,edges,cost:g.get(goalId),expanded};
}
function routeSignature(r){
  if(!r?.ids?.length)return '';
  const step=Math.max(1,Math.floor(r.ids.length/20));
  return r.ids.filter((_,i)=>i%step===0||i===r.ids.length-1).join(',');
}
function slopeFactor(grade){
  if(grade>.02)return Math.max(.45,1-grade*3.5);
  if(grade<-.02){const g=Math.abs(grade);if(g<=.08)return Math.min(1.12,1+g*1.2);return Math.max(.60,1.10-(g-.08)*3)}
  return 1;
}
function metricsForPath(path,{speed=1.333,weather={}}={},elevation=null){
  let distance=0,sunSec=0,shadeSec=0,weightedSec=0,ascent=0,descent=0;
  const edgeGrades=[];
  for(let i=0;i<path.edges.length;i++){
    const e=path.edges[i];distance+=e.d;
    let grade=0;
    if(elevation&&Number.isFinite(elevation[i])&&Number.isFinite(elevation[i+1])){
      const dz=elevation[i+1]-elevation[i];grade=Math.max(-.3,Math.min(.3,dz/Math.max(1,e.d)));
      if(dz>0)ascent+=dz;else descent-=dz;
    }
    edgeGrades.push(grade);
    const sec=e.d/Math.max(.6,speed)/slopeFactor(grade)*e.penalty;
    weightedSec+=sec;shadeSec+=sec*e.shade;sunSec+=sec*(1-e.shade);
  }
  const shadePct=weightedSec?shadeSec/weightedSec*100:0;
  return {distance,durationSec:weightedSec,sunSec,shadeSec,shadePct,ascent,descent,edgeGrades,heat:heatNorm(weather)};
}
function maneuverModifier(delta){
  const a=Math.abs(delta),side=delta>0?'right':'left';
  if(a>125)return `sharp ${side}`;
  if(a<45)return `slight ${side}`;
  return side;
}
function makeManeuvers(coords,edges,dest){
  if(coords.length<2)return [];
  const out=[{location:coords[0],type:'depart',modifier:'',name:edges[0]?.name||'',distance:0}];
  let lastAdded=0;
  for(let i=1;i<coords.length-1;i++){
    const b1=bearing(coords[i-1],coords[i]),b2=bearing(coords[i],coords[i+1]),delta=signedTurn(b1,b2);
    const nextName=edges[Math.min(i,edges.length-1)]?.name||'',prevName=edges[Math.max(0,i-1)]?.name||'';
    const meaningful=Math.abs(delta)>=28||nextName&&nextName!==prevName;
    if(!meaningful||i-lastAdded<2)continue;
    out.push({location:coords[i],type:'turn',modifier:maneuverModifier(delta||1),name:nextName,distance:0});lastAdded=i;
  }
  out.push({location:dest,type:'arrive',modifier:'',name:'',distance:0});
  return out;
}
function interpolateElevationsForEdges(path,routeElev){
  if(!routeElev||routeElev.length!==path.ids.length)return null;
  return routeElev;
}
async function defaultElevationFetcher(){return null}
export async function routeShadeGraph(osm,input,{elevationFetcher=defaultElevationFetcher}={}){
  const start=input.start,dest=input.destination;
  const parsed=parseOSM(osm);
  if(parsed.nodes.size<2||parsed.roadWays.length<1)throw new Error('보행 그래프 데이터가 부족합니다.');
  const sol=solarUTC(input.dateTime||Date.now(),(start[0]+dest[0])/2,(start[1]+dest[1])/2);
  const built=buildGraph(parsed,sol);
  const s=nearestNode(parsed.nodes,start),g=nearestNode(parsed.nodes,dest);
  if(!s.node||!g.node||s.d>120||g.d>120)throw new Error(`보행망 스냅 실패 (출발 ${Math.round(s.d)}m / 도착 ${Math.round(g.d)}m)`);
  const speed=Math.max(.7,Math.min(2.3,Number(input.walkSpeedMps)||1.333));
  const cool=Math.max(0,Math.min(1,(Number(input.coolBalance)||75)/100));
  const maxDetour=Math.max(.1,Math.min(.8,(Number(input.maxDetour)||40)/100));
  const weather=input.weather||{};
  const shortest=aStar(parsed,built,s.node.id,g.node.id,{distanceOnly:true,speed,weather});
  if(!shortest)throw new Error('보행 그래프에서 목적지까지 연결되지 않았습니다.');
  const shortestM=shortest.edges.reduce((n,e)=>n+e.d,0)+s.d+g.d;
  const variants=[0,Math.max(.25,cool*.58),cool].filter((v,i,a)=>a.findIndex(x=>Math.abs(x-v)<.03)===i);
  const candidates=[],sigs=new Set();
  for(const c of variants){
    const p=c===0?shortest:aStar(parsed,built,s.node.id,g.node.id,{cool:c,speed,weather});
    if(!p)continue;
    const distance=p.edges.reduce((n,e)=>n+e.d,0)+s.d+g.d;
    if(c>0&&distance>shortestM*(1+maxDetour)+35)continue;
    const sig=routeSignature(p);if(sigs.has(sig))continue;sigs.add(sig);
    p.coolVariant=c;p.distanceWithSnap=distance;candidates.push(p);
  }
  if(!candidates.length)candidates.push(shortest);
  for(const p of candidates){
    const coords=p.ids.map(id=>{const n=parsed.nodes.get(id);return [n.lat,n.lon]});
    let elev=null;
    try{elev=await elevationFetcher(coords)}catch{}
    p.metrics=metricsForPath(p,{speed,weather},interpolateElevationsForEdges(p,elev));
    p.coords=[start,...coords,dest];
    p.maneuvers=makeManeuvers(p.coords,p.edges,dest);
    p.metrics.distance+=s.d+g.d;
    const snapSec=(s.d+g.d)/speed;
    p.metrics.durationSec+=snapSec;p.metrics.sunSec+=snapSec*(sol.alt>0?1:0);
    p.metrics.shadePct=p.metrics.durationSec?Math.max(0,Math.min(100,100-p.metrics.sunSec/p.metrics.durationSec*100)):0;
    const sunPenalty=p.metrics.sunSec*(.55+cool*2.6)*(1+p.metrics.heat*.38);
    p.finalCost=p.metrics.durationSec*(1-cool*.38)+sunPenalty;
  }
  candidates.sort((a,b)=>a.finalCost-b.finalCost);
  return {
    version:'shade-graph-v0.1',
    solar:sol,
    graph:{nodes:parsed.nodes.size,ways:parsed.roadWays.length,buildings:parsed.buildings.length},
    snap:{startM:s.d,destinationM:g.d},
    shortestM,
    routes:candidates.map((p,idx)=>({
      id:`shade-${idx+1}`,
      geometry:{type:'LineString',coordinates:p.coords.map(x=>[x[1],x[0]])},
      duration:p.metrics.durationSec,
      distance:p.metrics.distance,
      shadePct:p.metrics.shadePct,
      sunSeconds:p.metrics.sunSec,
      shadeSeconds:p.metrics.shadeSec,
      ascent:p.metrics.ascent,
      descent:p.metrics.descent,
      cost:p.finalCost,
      coolVariant:p.coolVariant,
      maneuvers:p.maneuvers
    }))
  };
}
