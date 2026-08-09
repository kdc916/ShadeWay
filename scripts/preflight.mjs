import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
const must=['public/index.html','public/sw.js','public/manifest.webmanifest','public/_headers','src/index.js','src/shade-graph.js','wrangler.jsonc','package.json'];
for(const f of must){if(!fs.existsSync(path.join(root,f)))throw new Error(`Missing ${f}`)}
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
if(!html.includes('v1.9.4.33'))throw new Error('HTML version mismatch');
if(!html.includes('function correctReversedHeading'))throw new Error('Walk heading reversal guard missing');
if(!html.includes('A 14 m forward route look-ahead is therefore authoritative while on-route.'))throw new Error('Route-forward heading authority missing');
if(!html.includes('do not place turn-arrow markers in the middle of the route while Follow is active'))throw new Error('Follow maneuver marker removal missing');
if(!html.includes('const remainingSteps=Math.max(0,Math.round(remain/EST_STEP_LENGTH_M))'))throw new Error('Remaining steps HUD fix missing');
if(html.includes('html:`<div class=\"userWalkLabel\">🚶 약 ${estimatedSteps.toLocaleString()}걸음</div>`'))throw new Error('Map step badge regression detected');
const ids=[...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m=>m[1]);
const dup=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))];
if(dup.length)throw new Error(`Duplicate DOM ids: ${dup.join(', ')}`);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/manifest.webmanifest'),'utf8'));
if(!String(manifest.name||'').includes('1.9.4.33'))throw new Error('Manifest version mismatch');
const wr=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
if(wr.assets?.directory!=='./public')throw new Error('wrangler assets directory mismatch');
if(!Array.isArray(wr.assets?.run_worker_first)||!wr.assets.run_worker_first.includes('/api/*'))throw new Error('API worker-first routing missing');
if(wr.vars?.ALLOW_TELEMETRY!=='false')throw new Error('Telemetry must default OFF');
if(JSON.stringify(wr).includes('REPLACE_WITH'))throw new Error('Active wrangler.jsonc contains placeholder');
for(const f of ['src/index.js','src/shade-graph.js','public/sw.js'])execFileSync(process.execPath,['--check',path.join(root,f)],{stdio:'pipe'});
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'shadeway-preflight-'));
try{
  const inline=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(x=>x.trim());
  inline.forEach((code,i)=>{const f=path.join(tmp,`inline-${i}.js`);fs.writeFileSync(f,code);execFileSync(process.execPath,['--check',f],{stdio:'pipe'});});
  console.log(`Preflight PASS · ${ids.length} DOM ids · ${inline.length} inline scripts · manifest/wrangler/syntax OK`);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
