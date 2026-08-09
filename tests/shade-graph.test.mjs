import assert from 'node:assert/strict';
import { parseOSM, solarUTC, bboxFor, routeShadeGraph } from '../src/shade-graph.js';

const osm={elements:[
  {type:'node',id:1,lat:37.0,lon:127.0},
  {type:'node',id:2,lat:37.0,lon:127.001},
  {type:'node',id:3,lat:37.0,lon:127.002},
  {type:'node',id:4,lat:37.001,lon:127.001},
  {type:'way',id:10,nodes:[1,2,3],tags:{highway:'footway',name:'Main'}},
  {type:'way',id:11,nodes:[2,4,3],tags:{highway:'footway',name:'Shade Lane'}},
  {type:'node',id:101,lat:36.9998,lon:127.0008},
  {type:'node',id:102,lat:36.9998,lon:127.0012},
  {type:'node',id:103,lat:37.0001,lon:127.0012},
  {type:'node',id:104,lat:37.0001,lon:127.0008},
  {type:'way',id:20,nodes:[101,102,103,104,101],tags:{building:'yes','building:levels':'5'}}
]};
assert.equal(parseOSM(osm).roadWays.length,2);
assert.ok(solarUTC('2026-08-09T03:00:00Z',37,127).az>=0);
const bb=bboxFor([37,127],[37,127.002]);assert.ok(bb.east>bb.west);
const r=await routeShadeGraph(osm,{
  start:[37,127],destination:[37,127.002],dateTime:'2026-08-09T03:00:00Z',
  coolBalance:75,maxDetour:80,walkSpeedMps:1.33,weather:{feel:31,uv:7,cloud:20}
},{elevationFetcher:async coords=>coords.map((_,i)=>20+i*.1)});
assert.ok(r.routes.length>=1);
assert.ok(r.routes[0].distance>0);
assert.ok(r.routes[0].geometry.coordinates.length>=3);
console.log('Shade Graph test PASS',r.graph,r.routes.map(x=>({d:Math.round(x.distance),shade:Math.round(x.shadePct)})));
