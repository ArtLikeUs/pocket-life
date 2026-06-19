"use strict";
/* ===================== Pocket Life v2 — engine ===================== */
/* depends on data.js (T, VIEW_COLS/ROWS, HOME_TIERS, TOWN_*, NPCS, FOODS_*, VEHICLES, GIFTS, QUEST_POOL, OBJTYPES, NEEDS, JOBS, etc.) */

const Game = (() => {

/* ---------------- palette ---------------- */
const COL = {
  grass1:'#7bc86c', grass2:'#74c065', grassEdge:'#5fa854',
  path:'#d9c08f', pathEdge:'#c4a874',
  tree:'#2f7d3a', treeDk:'#235e2b', treeTrunk:'#7a5230',
  water:'#5ab4e0', waterDk:'#3f9bc9',
  flower:['#ff6b9d','#ffd93d','#ff8c42','#c77dff'],
  outline:'#1d1626', shadow:'rgba(20,10,30,.22)',
};

/* ---------------- runtime ---------------- */
let S = null;                       // saved game state
let profileId = null;
const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');
const BASE_VW = VIEW_COLS*T, BASE_VH = VIEW_ROWS*T;   // design viewport (world px) at zoom 1
let zoom = 1; const Z_MIN = 0.55, Z_MAX = 1.6;        // <1 sees more of the map, >1 zooms in
let scale = 1, vw = BASE_VW, vh = BASE_VH;

let scene = null;                   // {type, map, cols, rows, solid:Set, furnAt:Map, doors:Map}
let cam = {x:0, y:0}, camFree = false;   // camFree: player dragged the camera; stops auto-follow until they move
let path = [], pending = null, action = null, facing='S', walkT=0;
let npcSprites = [];                // town npc runtime
let parts = [];                     // particles
let speed = 1, paused = false, userPaused = false, transition = 0, transitionTo = null;
let pendingMove = null;   // double-tap a tile to walk there
let lastFootEvt = 0;
let babyGiggle = 0;       // timestamp of the last baby interaction → crib shows a happy reaction

/* ---------------- audio (tiny synth, no assets) ---------------- */
let AC = null;
function blip(freq=440, dur=0.08, type='sine', vol=0.05){
  try{
    if(!AC) AC = new (window.AudioContext||window.webkitAudioContext)();
    if(AC.state==='suspended') AC.resume();
    const o=AC.createOscillator(), g=AC.createGain();
    o.type=type; o.frequency.value=freq; o.connect(g); g.connect(AC.destination);
    g.gain.setValueAtTime(vol, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime+dur);
    o.start(); o.stop(AC.currentTime+dur);
  }catch(e){}
}
function chord(freqs, dur=0.18){ freqs.forEach((f,i)=>setTimeout(()=>blip(f,dur,'triangle',0.06), i*55)); }
const SFX = {
  tap:()=>blip(520,0.05,'square',0.03),
  good:()=>chord([523,659,784]),
  coin:()=>{ blip(880,0.06,'square',0.05); setTimeout(()=>blip(1175,0.08,'square',0.05),60); },
  level:()=>chord([523,659,784,1047],0.22),
  heart:()=>{ blip(660,0.09,'sine',0.05); setTimeout(()=>blip(990,0.12,'sine',0.05),90); },
  eat:()=>blip(300,0.12,'sine',0.05),
  err:()=>blip(160,0.12,'sawtooth',0.04),
};

/* ---------------- helpers ---------------- */
const el = id => document.getElementById(id);
function clamp(v,a,b){ return v<a?a:v>b?b:v; }
function hash(c,r){ let h=(c*73856093)^(r*19349663); h=(h^(h>>>13))>>>0; return h/4294967295; }
function shade(hex,f){ const n=parseInt(hex.slice(1),16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=clamp(Math.round(r*f),0,255); g=clamp(Math.round(g*f),0,255); b=clamp(Math.round(b*f),0,255);
  return 'rgb('+r+','+g+','+b+')'; }
function rr(x,y,w,h,rad,fill,stroke){
  ctx.beginPath(); ctx.moveTo(x+rad,y);
  ctx.arcTo(x+w,y,x+w,y+h,rad); ctx.arcTo(x+w,y+h,x,y+h,rad);
  ctx.arcTo(x,y+h,x,y,rad); ctx.arcTo(x,y,x+w,y,rad); ctx.closePath();
  if(fill){ ctx.fillStyle=fill; ctx.fill(); }
  if(stroke){ ctx.strokeStyle=stroke; ctx.lineWidth=stroke._w||1.5; ctx.stroke(); }
}

/* ---------------- toast / particles ---------------- */
function toast(msg){
  const box=el('toasts'); const t=document.createElement('div');
  t.className='toast'; t.textContent=msg; box.appendChild(t);
  while(box.children.length>3) box.firstChild.remove();
  setTimeout(()=>t.remove(),2600);
}
function burst(wx, wy, kind, text){
  if(kind==='coin'){ for(let i=0;i<10;i++) parts.push({x:wx,y:wy,vx:(Math.random()-.5)*70,vy:-50-Math.random()*60,life:0.9,t:'coin'}); }
  if(kind==='confetti'){ for(let i=0;i<26;i++) parts.push({x:wx,y:wy,vx:(Math.random()-.5)*160,vy:-90-Math.random()*120,life:1.3,t:'conf',c:`hsl(${Math.random()*360},90%,60%)`}); }
  if(kind==='heart'){ for(let i=0;i<6;i++) parts.push({x:wx+(Math.random()-.5)*14,y:wy,vx:(Math.random()-.5)*20,vy:-30-Math.random()*20,life:1.1,t:'heart'}); }
  if(kind==='spark'){ for(let i=0;i<8;i++) parts.push({x:wx,y:wy,vx:(Math.random()-.5)*90,vy:(Math.random()-.5)*90,life:0.5,t:'spark'}); }
  if(text) parts.push({x:wx,y:wy-6,vx:0,vy:-26,life:1.1,t:'txt',text});
}
function updateParts(dt){
  for(const p of parts){ p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.t!=='txt') p.vy+=240*dt; p.life-=dt; }
  parts = parts.filter(p=>p.life>0);
}
function drawParts(){
  for(const p of parts){
    const a=clamp(p.life,0,1); ctx.globalAlpha=a;
    if(p.t==='coin'){ ctx.fillStyle='#ffd76a'; ctx.beginPath(); ctx.arc(p.x,p.y,4,0,7); ctx.fill(); ctx.strokeStyle='#b8860b'; ctx.lineWidth=1; ctx.stroke(); }
    else if(p.t==='conf'){ ctx.fillStyle=p.c; ctx.fillRect(p.x,p.y,4,4); }
    else if(p.t==='heart'){ ctx.font='14px sans-serif'; ctx.fillText('❤️',p.x-7,p.y); }
    else if(p.t==='spark'){ ctx.fillStyle='#fff'; ctx.fillRect(p.x,p.y,2.5,2.5); }
    else if(p.t==='txt'){ ctx.font='800 13px -apple-system'; ctx.textAlign='center';
      ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.strokeText(p.text,p.x,p.y);
      ctx.fillStyle='#fff'; ctx.fillText(p.text,p.x,p.y); ctx.textAlign='left'; }
    ctx.globalAlpha=1;
  }
}

/* ============================================================ */
/*                       SCENE BUILDING                         */
/* ============================================================ */
function homeDef(){ return HOME_TIERS[S.homeTier]; }

function buildHome(){
  const def = homeDef();
  const map = def.map, rows=map.length, cols=map[0].length;
  const solid=new Set(), furnAt=new Map(), doors=new Map();
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) if(map[r][c]==='#') solid.add(c+','+r);
  for(const f of def.furn){
    const meta=OBJTYPES[f.t]; if(!meta) continue;
    const obj={...f, meta};
    for(const [dx,dy] of meta.fp){ const k=(f.c+dx)+','+(f.r+dy); solid.add(k); furnAt.set(k,obj); }
  }
  // exit door tiles are passable triggers
  for(const e of def.exit){ solid.delete(e[0]+','+e[1]); doors.set(e[0]+','+e[1],'town'); }
  scene={type:'home', map, cols, rows, solid, furnAt, doors};
  buildHomies();
}

function buildTown(){
  const map=TOWN_MAP, rows=map.length, cols=map[0].length;
  const solid=new Set(), furnAt=new Map(), doors=new Map();
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ const ch=map[r][c]; if(ch==='T'||ch==='w') solid.add(c+','+r); }
  for(const b of BUILDINGS){
    for(let yy=0; yy<b.h; yy++) for(let xx=0; xx<b.w; xx++) solid.add((b.x+xx)+','+(b.y+yy));
    doors.set(b.door[0]+','+b.door[1], 'B:'+b.id);
    solid.delete(b.door[0]+','+b.door[1]);
  }
  for(const f of TOWN_FURN){
    const meta=OBJTYPES[f.t]; const obj={...f,meta};
    for(const [dx,dy] of meta.fp){ const k=(f.c+dx)+','+(f.r+dy); solid.add(k); furnAt.set(k,obj); }
  }
  scene={type:'town', map, cols, rows, solid, furnAt, doors};
  // npc sprites (your partner lives with you now, not in town)
  const present=(S.present||NPCS.map(n=>n.id));
  const parkSpots=[[12,20],[20,21],[24,22],[16,25],[26,24]];
  npcSprites = present.filter(id=>id!==S.partner).map((id,idx)=>{ const def=npcDef(id); if(!def) return null;
    const a=def.anchor||parkSpots[idx%parkSpots.length];
    return { def, px:(a[0]+.5)*T, py:(a[1]+.5)*T, dir:'S', wt:0, cool:Math.random()*3, tpath:[], anchor:a };
  }).filter(Boolean);
}

/* ----- household sprites (partner & kids at home) ----- */
let homies=[];
function buildHomies(){
  homies=[];
  if(!scene) return;
  if(scene.type==='vacation'){
    // the family came along — spouse + minor kids, near the rental
    const rental=[...scene.furnAt.values()].find(f=>f.t==='rental');
    const bx=rental?rental.c:Math.floor(scene.cols/2)-1, by=rental?rental.r+1:Math.floor(scene.rows/2);
    const z={x:Math.max(1,bx-1),y:Math.min(scene.rows-2,by),w:4,h:2};
    (S.members||[]).filter(m=>m.role==='Partner').forEach(m=>{
      homies.push({kind:'partner', mid:m.mid, name:m.name,
        look:{skin:m.skin,shirt:m.shirt,hair:m.hair,style:m.hairStyle,dress:isDressOutfit(m.outfit),lashes:m.gender==='f'},
        px:(z.x+.5)*T, py:(z.y+.5)*T, zone:z, dir:'S', wt:0, cool:1+Math.random()*3, tpath:[], sc:1});
    });
    (S.kids||[]).forEach((k,i)=>{ if((k.age||0)<CHILD_AGE) return;
      homies.push({kind:'kid', idx:i, name:k.name, look:{skin:S.skin,shirt:k.shirt||'#ffd93d',hair:S.hair,style:0},
        px:(z.x+1+(i%2)+.5)*T, py:(z.y+1+.5)*T, zone:z, dir:'S', wt:0, cool:1+Math.random()*2, tpath:[], sc:k.age>=TEEN_AGE?0.85:0.7});
    });
    return;
  }
  if(scene.type!=='home') return;
  const def=homeDef(), pz=def.partnerZone, kz=def.kidZone;
  // inactive household members (spouse + grown kids you're not currently controlling)
  (S.members||[]).forEach((m,i)=>{ const partner=m.role==='Partner'; const z=partner?pz:kz;
    homies.push({kind:partner?'partner':'grown', mid:m.mid, name:m.name,
      look:{skin:m.skin,shirt:m.shirt,hair:m.hair,style:m.hairStyle,dress:isDressOutfit(m.outfit),lashes:m.gender==='f'},
      px:(z.x+1+(i%Math.max(1,z.w-1))+.5)*T, py:(z.y+1+.5)*T, zone:z, dir:'S', wt:0, cool:1+Math.random()*3, tpath:[], sc:m.age<TEEN_AGE?0.7:1});
  });
  // minor kids (babies stay in the crib)
  (S.kids||[]).forEach((k,i)=>{ if((k.age||0)<CHILD_AGE) return;
    homies.push({kind:'kid', idx:i, name:k.name, look:{skin:S.skin,shirt:k.shirt||'#ffd93d',hair:S.hair,style:0},
      px:(kz.x+1+(i%Math.max(1,kz.w-1))+.5)*T, py:(kz.y+2+.5)*T, zone:kz, dir:'S', wt:0, cool:1+Math.random()*2, tpath:[], sc:k.age>=TEEN_AGE?0.85:0.7});
  });
  // hired help — only on screen while their contract is active, in themed looks
  SERVICES.forEach((sv,i)=>{ if(!svc(sv.id)) return; const z=sv.id==='nanny'?kz:pz;
    homies.push({kind:'staff', svc:sv.id, name:sv.role, badge:sv.icon,
      look:{skin:SKINS[(i+3)%SKINS.length], shirt:sv.shirt, hair:HAIRC[(i+1)%HAIRC.length], style:0, dress:sv.dress, lashes:false},
      px:(z.x+1+(i%Math.max(1,z.w-1))+.5)*T, py:(z.y+1+.5)*T, zone:z, dir:'S', wt:0, cool:1+Math.random()*3, tpath:[], sc:1});
  });
}
function tickHomies(dt){
  if(!scene||(scene.type!=='home'&&scene.type!=='vacation')) return;
  for(const n of homies){
    if(n.tpath.length){ let dist=T*1.1*dt;
      while(dist>0&&n.tpath.length){ const t2=n.tpath[0]; const dx=t2.x-n.px,dy=t2.y-n.py,d=Math.hypot(dx,dy);
        if(Math.abs(dx)>Math.abs(dy)) n.dir=dx>0?'E':'W'; else n.dir=dy>0?'S':'N';
        if(d<=dist){ n.px=t2.x; n.py=t2.y; n.tpath.shift(); dist-=d; } else { n.px+=dx/d*dist; n.py+=dy/d*dist; dist=0; } }
      n.wt+=dt*9;
    } else { n.cool-=dt; if(n.cool<=0){ n.cool=3+Math.random()*5;
      const z=n.zone; const tc=z.x+Math.floor(Math.random()*z.w), tr=z.y+Math.floor(Math.random()*z.h);
      const p=findPath(Math.floor(n.px/T),Math.floor(n.py/T),tc,tr); if(p&&p.length&&p.length<10) n.tpath=p; } }
  }
}

function gotoScene(type, spawnTile){
  transition=1; transitionTo=()=>{
    if(type==='home') buildHome(); else if(type==='vacation') buildVacation(); else buildTown();
    const sp = spawnTile || (type==='home'? homeDef().spawn : type==='vacation'? (scene.vac?scene.vac.spawn:[7,7]) : TOWN_SPAWN);
    S.px=(sp[0]+.5)*T; S.py=(sp[1]+.5)*T; S.scene=type;
    path=[]; pending=null; action=null; pendingMove=null; camFree=false;
    centerCam(true);
  };
}
function buildVacation(){
  const v=VACATIONS.find(x=>x.id===(S.vacay&&S.vacay.id));
  if(!v){ buildTown(); return; }
  const W=v.cols, H=v.rows, map=[];
  for(let r=0;r<H;r++){ let row='';
    for(let c=0;c<W;c++){ let ch='.'; const edge=(c===0||c===W-1||r===0||r===H-1); const h=_townHash(c,r);
      if(v.theme==='beach'){ ch = r<=2?'w':'s'; }
      else if(v.theme==='jungle'){ ch = edge?'T':(h>0.88?'T':'.'); if(c>=3&&c<=5&&r>=11&&r<=13) ch='w'; }
      else if(v.theme==='resort'){ ch = (c>=6&&c<=10&&r>=4&&r<=7)?'w':(h>0.9?'p':'.'); }
      else { ch = edge?'T':(h>0.9?'T':'.'); if(c>=10&&c<=13&&r>=3&&r<=5) ch='w'; }
      row+=ch; }
    map.push(row); }
  const carve=(c,r)=>{ if(c>=0&&r>=0&&c<W&&r<H){ const a=map[r].split(''); a[c]=v.theme==='beach'?'s':'.'; map[r]=a.join(''); } };
  for(const f of v.furn){ const meta=OBJTYPES[f.t]; for(const [dx,dy] of meta.fp) carve(f.c+dx,f.r+dy); carve(f.c,f.r+1); }
  for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) carve(v.spawn[0]+dx,v.spawn[1]+dy);
  const solid=new Set(), furnAt=new Map(), doors=new Map();
  for(let r=0;r<H;r++) for(let c=0;c<W;c++){ const ch=map[r][c]; if(ch==='T'||ch==='w') solid.add(c+','+r); }
  const SOLIDV=['palm','cabana','tiki','ruins','rental'];
  for(const f of v.furn){ const meta=OBJTYPES[f.t]; const obj={...f,meta};
    for(const [dx,dy] of meta.fp){ const k=(f.c+dx)+','+(f.r+dy); if(SOLIDV.indexOf(f.t)>=0) solid.add(k); furnAt.set(k,obj); } }
  scene={type:'vacation', map, cols:W, rows:H, solid, furnAt, doors, theme:v.theme, vac:v};
  buildHomies();
}

/* ============================================================ */
/*                    GRID / PATHFINDING                        */
/* ============================================================ */
function walkable(c,r){ return c>=0&&r>=0&&c<scene.cols&&r<scene.rows&&!scene.solid.has(c+','+r); }
function findPath(c0,r0,c1,r1){
  if(!walkable(c1,r1)) return null;
  if(c0===c1&&r0===r1) return [];
  const prev=new Map(), q=[[c0,r0]]; prev.set(c0+','+r0,null);
  let head=0;
  while(head<q.length){
    const [c,r]=q[head++];
    for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nc=c+dc,nr=r+dr,k=nc+','+nr;
      if(!walkable(nc,nr)||prev.has(k)) continue;
      prev.set(k,[c,r]);
      if(nc===c1&&nr===r1){
        const out=[]; let cur=[nc,nr];
        while(cur){ out.unshift(cur); cur=prev.get(cur[0]+','+cur[1]); }
        out.shift();
        return out.map(([c,r])=>({x:(c+.5)*T,y:(r+.5)*T}));
      }
      q.push([nc,nr]);
    }
  }
  return null;
}
function adjFree(c,r){ // nearest walkable tile next to (c,r) for interacting
  for(const [dc,dr] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]])
    if(walkable(c+dc,r+dr)) return [c+dc,r+dr];
  return null;
}
function curTile(){ return [Math.floor(S.px/T), Math.floor(S.py/T)]; }

function goTo(c,r,then){
  const [pc,pr]=curTile();
  const p=findPath(pc,pr,c,r);
  if(p===null){ toast("Can't reach there 🚧"); SFX.err(); return false; }
  if(action&&action.returnPx){ S.px=action.returnPx[0]; S.py=action.returnPx[1]; }
  action=null; path=p; pending=then||null; return true;
}
function goNextTo(c,r,then){
  const a=adjFree(c,r); if(!a){ toast("Can't get to it 🚧"); SFX.err(); return false; }
  return goTo(a[0],a[1],then);
}

/* ============================================================ */
/*                        RENDERING                             */
/* ============================================================ */
function resize(){
  const wrap=el('canvasWrap');
  vw=BASE_VW/zoom; vh=BASE_VH/zoom;            // zoom changes how much world fits the screen
  scale=Math.min(wrap.clientWidth/vw, wrap.clientHeight/vh);
  const dpr=window.devicePixelRatio||1;
  cv.style.width=vw*scale+'px'; cv.style.height=vh*scale+'px';
  cv.width=Math.round(vw*scale*dpr); cv.height=Math.round(vh*scale*dpr);
  ctx.setTransform(scale*dpr,0,0,scale*dpr,0,0);
  ctx.imageSmoothingEnabled=false;
}
function clampCam(){
  if(!scene) return;
  const worldW=scene.cols*T, worldH=scene.rows*T;
  cam.x=clamp(cam.x,0,Math.max(0,worldW-vw)); cam.y=clamp(cam.y,0,Math.max(0,worldH-vh));
  if(worldW<vw) cam.x=(worldW-vw)/2; if(worldH<vh) cam.y=(worldH-vh)/2;
}
function centerCam(snap){
  const worldW=scene.cols*T, worldH=scene.rows*T;
  let tx=S.px-vw/2, ty=S.py-vh/2;
  tx=clamp(tx,0,Math.max(0,worldW-vw)); ty=clamp(ty,0,Math.max(0,worldH-vh));
  if(worldW<vw) tx=(worldW-vw)/2; if(worldH<vh) ty=(worldH-vh)/2;
  if(snap){ cam.x=tx; cam.y=ty; } else { cam.x+=(tx-cam.x)*0.18; cam.y+=(ty-cam.y)*0.18; }
}
// + / − zoom buttons (and pinch) call this. Keeps the player centered while following.
function setZoom(factor){
  if(!S||!scene) return;
  const z=clamp(zoom*factor, Z_MIN, Z_MAX); if(Math.abs(z-zoom)<0.001) return;
  zoom=z; resize(); if(camFree) clampCam(); else centerCam(true);
}

/* ----- tiles ----- */
function drawTerrain(){
  const c0=Math.floor(cam.x/T), r0=Math.floor(cam.y/T);
  const c1=Math.min(scene.cols, c0+Math.ceil(vw/T)+2), r1=Math.min(scene.rows, r0+Math.ceil(vh/T)+2);
  for(let r=Math.max(0,r0); r<r1; r++) for(let c=Math.max(0,c0); c<c1; c++){
    const x=c*T-cam.x, y=r*T-cam.y, ch=scene.map[r][c];
    if(scene.type==='town') drawTownTile(x,y,c,r,ch);
    else if(scene.type==='vacation') drawVacTile(x,y,c,r,ch);
    else drawHomeTile(x,y,c,r,ch);
  }
}
function drawVacTile(x,y,c,r,ch){
  const now=performance.now(), theme=scene.theme, h=hash(c,r);
  let grass = theme==='jungle'?'#4f9a47' : theme==='mountain'?'#9ac3a8' : '#7bc86c';
  if(ch==='s'){
    ctx.fillStyle=(c+r)%2?'#f1e2b2':'#ecdaa4'; ctx.fillRect(x,y,T,T);
    if(h>0.8){ ctx.fillStyle='#e3cd92'; ctx.fillRect(x+5+h*16,y+7+h*14,3,3); ctx.fillRect(x+20-h*8,y+20,2,2); }
    if(h>0.95){ ctx.font='10px sans-serif'; ctx.fillText('🐚',x+8,y+22); }
  } else if(ch==='w'){
    ctx.fillStyle=COL.waterDk; ctx.fillRect(x,y,T,T); ctx.fillStyle=COL.water;
    for(let i=0;i<3;i++){ const wy=y+4+i*11+Math.sin(now/520+c*1.3+i*2)*2; ctx.fillRect(x+1,wy,T-2,5); }
    ctx.fillStyle='rgba(255,255,255,.4)'; ctx.fillRect(x+6+Math.sin(now/430+c)*3,y+9,6,1.6);
  } else if(ch==='p'){
    ctx.fillStyle='#e3d6c2'; ctx.fillRect(x,y,T,T);   // resort tiles
    ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=1; ctx.strokeRect(x+0.5,y+0.5,T-1,T-1);
  } else if(ch==='T'){
    ctx.fillStyle=grass; ctx.fillRect(x,y,T,T);
    if(theme==='mountain') drawPine(x,y); else drawTree(x,y);
  } else {
    ctx.fillStyle=(c+r)%2?grass:shade(grass,0.95); ctx.fillRect(x,y,T,T);
    if(theme==='mountain'&&h>0.9){ ctx.fillStyle='rgba(255,255,255,.6)'; ctx.fillRect(x+6+h*14,y+8+h*12,3,3); } // snow flecks
    if(theme==='jungle'&&h>0.85){ ctx.fillStyle='#3f7d38'; for(let i=0;i<4;i++){ const gx=x+5+i*7; ctx.beginPath(); ctx.moveTo(gx,y+T-3); ctx.lineTo(gx-2,y+T-12); ctx.lineTo(gx+2,y+T-12); ctx.closePath(); ctx.fill(); } }
  }
}
function drawPine(x,y){
  ctx.fillStyle=COL.treeTrunk; ctx.fillRect(x+T/2-2,y+T-9,4,9);
  ctx.fillStyle='#2f6b3d'; ctx.beginPath(); ctx.moveTo(x+T/2,y+3); ctx.lineTo(x+5,y+T-8); ctx.lineTo(x+T-5,y+T-8); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#3d8050'; ctx.beginPath(); ctx.moveTo(x+T/2,y+7); ctx.lineTo(x+8,y+T-14); ctx.lineTo(x+T-8,y+T-14); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(x+T/2,y+3); ctx.lineTo(x+T/2-3,y+9); ctx.lineTo(x+T/2+3,y+9); ctx.closePath(); ctx.fill();
}
function drawTownTile(x,y,c,r,ch){
  const now=performance.now();
  // base grass everywhere
  ctx.fillStyle=(c+r)%2?COL.grass1:COL.grass2; ctx.fillRect(x,y,T,T);
  const h=hash(c,r);
  if(ch!=='w'&&ch!=='p'&&h>0.78){ ctx.fillStyle=COL.grassEdge;
    ctx.fillRect(x+4+h*18, y+6+h*16, 2,4); ctx.fillRect(x+8+h*10,y+12+h*12,2,4); ctx.fillRect(x+22-h*8,y+20-h*6,2,3); }
  if(ch==='p'){
    ctx.fillStyle=COL.path; ctx.fillRect(x,y,T,T);
    // soft edges where path meets grass
    const nb=(dc,dr)=>{ const cc=c+dc, rw=r+dr; return (cc>=0&&rw>=0&&cc<scene.cols&&rw<scene.rows)?scene.map[rw][cc]:'p'; };
    ctx.fillStyle=COL.pathEdge;
    if(nb(0,-1)!=='p') ctx.fillRect(x,y,T,2.5);
    if(nb(0,1)!=='p')  ctx.fillRect(x,y+T-2.5,T,2.5);
    if(nb(-1,0)!=='p') ctx.fillRect(x,y,2.5,T);
    if(nb(1,0)!=='p')  ctx.fillRect(x+T-2.5,y,2.5,T);
    if(h>.55){ ctx.fillStyle=shade(COL.path,0.88); ctx.fillRect(x+6+h*8,y+8+h*10,4,3); }
    if(h<.25){ ctx.fillStyle=shade(COL.path,1.08); ctx.fillRect(x+18,y+20,5,3); }
  }
  if(ch===','){ // tall grass with a gentle sway
    const sway=Math.sin(now/650+c*1.7+r)*1.6;
    ctx.fillStyle='#55a04b';
    for(let i=0;i<5;i++){ const gx=x+4+i*6;
      ctx.beginPath(); ctx.moveTo(gx,y+T-3); ctx.lineTo(gx-2+sway,y+T-13); ctx.lineTo(gx+2+sway,y+T-13); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle='#6db95f';
    for(let i=0;i<4;i++){ const gx=x+7+i*6;
      ctx.beginPath(); ctx.moveTo(gx,y+T-3); ctx.lineTo(gx-1.5+sway,y+T-9); ctx.lineTo(gx+1.5+sway,y+T-9); ctx.closePath(); ctx.fill(); } }
  if(ch==='f'){ const fc=COL.flower[Math.floor(h*4)]; const sw2=Math.sin(now/600+c*3+r)*1.2;
    for(const [ox,oy] of [[10,12],[21,17],[14,23]]){
      ctx.strokeStyle='#4d8a44'; ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(x+ox,y+oy+6); ctx.lineTo(x+ox+sw2,y+oy); ctx.stroke();
      for(let p=0;p<4;p++){ const a=p*Math.PI/2 + h*6;
        ctx.fillStyle=fc; ctx.beginPath(); ctx.arc(x+ox+sw2+Math.cos(a)*2.6,y+oy+Math.sin(a)*2.6,2,0,7); ctx.fill(); }
      ctx.fillStyle='#ffe14d'; ctx.beginPath(); ctx.arc(x+ox+sw2,y+oy,1.6,0,7); ctx.fill(); } }
  if(ch==='w'){
    ctx.fillStyle=COL.waterDk; ctx.fillRect(x,y,T,T);
    ctx.fillStyle=COL.water;
    for(let i=0;i<3;i++){ const wy2=y+4+i*11+Math.sin(now/520+c*1.3+i*2)*2; ctx.fillRect(x+1,wy2,T-2,5); }
    ctx.fillStyle='rgba(255,255,255,.4)';
    ctx.fillRect(x+6+Math.sin(now/430+c)*3, y+9+Math.cos(now/600+r)*2, 6,1.6);
    ctx.fillRect(x+18+Math.sin(now/380+r)*3, y+22, 5,1.6);
  }
  if(ch==='T') drawTree(x,y);
}
function drawTree(x,y){
  ctx.fillStyle='rgba(20,10,30,.18)'; ctx.beginPath(); ctx.ellipse(x+T/2,y+T-4,13,4.5,0,0,7); ctx.fill();
  ctx.fillStyle=COL.treeTrunk; ctx.fillRect(x+T/2-3,y+T-13,6,12);
  ctx.fillStyle=shade(COL.treeTrunk,0.75); ctx.fillRect(x+T/2+1,y+T-13,2,12);
  ctx.fillStyle=COL.treeDk; ctx.beginPath(); ctx.arc(x+T/2,y+T/2,15,0,7); ctx.fill();
  ctx.fillStyle=COL.tree; ctx.beginPath(); ctx.arc(x+T/2-3,y+T/2-3,13,0,7); ctx.fill();
  ctx.fillStyle='#8fd47e'; ctx.beginPath(); ctx.arc(x+T/2-6,y+T/2-6,6,0,7); ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(x+T/2-7,y+T/2-8,2.5,0,7); ctx.fill();
}
function roomAt(c,r,def){ for(const rm of def.rooms){ if(c>=rm.x&&c<rm.x+rm.w&&r>=rm.y&&r<rm.y+rm.h) return rm; } return null; }
const FLOOR_PAT={'#a8d4e2':'tile','#eedaa6':'tile','#e2c2a4':'wood','#c9b3dd':'carpet','#f3cdd6':'carpet'};
function drawHomeTile(x,y,c,r,ch){
  const def=homeDef();
  if(ch==='#'){
    // wall: dark cap + wallpaper face tinted by the room below + baseboard
    const below=roomAt(c,r+1,def);
    const wp=below?below.wp:'#574a66';
    ctx.fillStyle='#352e44'; ctx.fillRect(x,y,T,T*0.45);
    ctx.fillStyle=wp; ctx.fillRect(x,y+T*0.45,T,T*0.55);
    ctx.fillStyle='rgba(255,255,255,.10)'; ctx.fillRect(x,y+T*0.45,T,2);
    ctx.fillStyle='rgba(255,255,255,.06)';
    for(let i=0;i<3;i++) ctx.fillRect(x+4+i*11,y+T*0.52,4,T*0.4);
    ctx.fillStyle=shade(wp,0.55); ctx.fillRect(x,y+T-4,T,4);
    ctx.fillStyle='rgba(0,0,0,.28)'; ctx.fillRect(x,y,T,2);
    return;
  }
  const rm=roomAt(c,r,def); const floor=rm?rm.floor:'#2a2440';
  const pat=FLOOR_PAT[floor]||'carpet';
  ctx.fillStyle=floor; ctx.fillRect(x,y,T,T);
  if(pat==='wood'){
    ctx.fillStyle=shade(floor,0.9);
    ctx.fillRect(x,y+T/2-0.5,T,1.5);                       // plank seam
    ctx.fillRect(x+((r%2)?T*0.3:T*0.7),y+(((c+r)%2)?2:T/2+2),1.5,T/2-3); // staggered joints
    ctx.fillStyle='rgba(255,255,255,.05)'; ctx.fillRect(x,y+1,T,1.5);
  } else if(pat==='tile'){
    ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=1;
    ctx.strokeRect(x+0.5,y+0.5,T/2,T/2); ctx.strokeRect(x+T/2+0.5,y+T/2+0.5,T/2-1,T/2-1);
    if((c+r)%2){ ctx.fillStyle='rgba(0,0,0,.045)'; ctx.fillRect(x,y,T,T); }
  } else {
    if((c+r)%2){ ctx.fillStyle='rgba(255,255,255,.045)'; ctx.fillRect(x,y,T,T); }
    const h=hash(c,r); ctx.fillStyle='rgba(0,0,0,.07)';
    ctx.fillRect(x+5+h*16,y+7+h*12,2,2); ctx.fillRect(x+22-h*9,y+22-h*7,2,2);
  }
  ctx.strokeStyle='rgba(0,0,0,.05)'; ctx.lineWidth=1; ctx.strokeRect(x+0.5,y+0.5,T-1,T-1);
  // exit mat
  for(const e of def.exit){ if(e[0]===c&&e[1]===r){ rr(x+3,y+4,T-6,T-10,4,'#8a6a4a'); ctx.fillStyle='#ffd76a'; ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.fillText('🚪',x+T/2,y+T/2+4); ctx.textAlign='left'; } }
}

/* ----- buildings (town) ----- */
function drawBuildings(){
  const night=isNight();
  for(const b of BUILDINGS){
    const x=b.x*T-cam.x, y=b.y*T-cam.y, w=b.w*T, h=b.h*T;
    if(x>vw||y>vh||x+w<0||y+h<0) continue;
    // ground shadow
    ctx.fillStyle='rgba(20,10,30,.16)'; ctx.beginPath(); ctx.ellipse(x+w/2,y+h-1,w/2,6,0,0,7); ctx.fill();
    // body
    rr(x+2,y+T*0.7,w-4,h-T*0.7,5,b.wall);
    ctx.strokeStyle=COL.outline; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.13)'; ctx.fillRect(x+4,y+T*0.74,w-8,4);   // top light
    ctx.fillStyle='rgba(0,0,0,.12)'; ctx.fillRect(x+4,y+h-7,w-8,5);            // base shade
    // windows with frames + sills (skip the door column)
    const winN=Math.max(2,b.w-2);
    for(let i=0;i<winN;i++){
      const wx2=x+(w/winN)*(i+0.5)-9, wy2=y+T*1.02;
      if(Math.abs((wx2+9)-(b.door[0]*T-cam.x+T/2))<T*0.6 && b.h<=3) continue;
      rr(wx2-2,wy2-2,20,18,3,'#3b3347');
      ctx.fillStyle=night?'#ffd76a':'#cfeeff'; ctx.fillRect(wx2,wy2,16,14);
      if(night){ ctx.fillStyle='rgba(255,215,106,.22)'; ctx.beginPath(); ctx.arc(wx2+8,wy2+7,14,0,7); ctx.fill(); }
      else { ctx.fillStyle='rgba(255,255,255,.55)'; ctx.fillRect(wx2+2,wy2+2,5,4); }
      ctx.strokeStyle='#3b3347'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(wx2+8,wy2); ctx.lineTo(wx2+8,wy2+14); ctx.stroke();
      ctx.fillStyle=shade(b.wall,0.72); ctx.fillRect(wx2-3,wy2+15,22,3);       // sill
    }
    // roof with sheen + eave
    ctx.fillStyle=b.roof; ctx.beginPath();
    ctx.moveTo(x-4,y+T*0.78); ctx.lineTo(x+w/2,y-8); ctx.lineTo(x+w+4,y+T*0.78); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=COL.outline; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.14)'; ctx.beginPath();
    ctx.moveTo(x+w/2,y-8); ctx.lineTo(x+w*0.16,y+T*0.66); ctx.lineTo(x+w*0.3,y+T*0.66); ctx.closePath(); ctx.fill();
    ctx.fillStyle=shade(b.roof,0.7); ctx.fillRect(x-4,y+T*0.74,w+8,4);
    if(b.id==='house'){ rr(x+w*0.7,y+T*0.02,11,17,2,shade(b.roof,0.62)); ctx.strokeStyle=COL.outline; ctx.lineWidth=1.5; ctx.stroke(); }
    // door (panels + knob)
    const dx=b.door[0]*T-cam.x, dy=b.door[1]*T-cam.y;
    rr(dx+5,dy+4,T-10,T-4,4,'#6b4426');
    ctx.strokeStyle=COL.outline; ctx.lineWidth=2; ctx.stroke();
    ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.lineWidth=1.2;
    ctx.strokeRect(dx+8,dy+7,T-16,T*0.4); ctx.strokeRect(dx+8,dy+7+T*0.46,T-16,T*0.36);
    ctx.fillStyle='#ffd76a'; ctx.beginPath(); ctx.arc(dx+T-10,dy+T/2+2,2.2,0,7); ctx.fill();
    // striped awning for shops
    if(b.id==='diner'||b.id==='mall'){
      const ac=b.id==='diner'?'#e74c3c':'#8e5bd6'; const aw=T+10, ax=dx-5;
      for(let i=0;i<4;i++){ ctx.fillStyle=i%2?ac:'#fff7ee'; ctx.fillRect(ax+i*aw/4,dy-9,aw/4,10); }
      ctx.strokeStyle=COL.outline; ctx.lineWidth=1.5; ctx.strokeRect(ax,dy-9,aw,10);
      ctx.fillStyle='rgba(0,0,0,.12)'; ctx.fillRect(ax,dy+1,aw,3);
    }
    // sign plaque
    rr(x+w/2-16,y+T*0.46,32,19,5,'#fffaf0'); ctx.strokeStyle=COL.outline; ctx.lineWidth=1.5; ctx.stroke();
    ctx.font='13px sans-serif'; ctx.textAlign='center'; ctx.fillText(b.sign,x+w/2,y+T*0.46+14);
    // name banner so every place is clearly labeled
    ctx.font='700 9px -apple-system';
    const nw=ctx.measureText(b.label).width+12;
    rr(x+w/2-nw/2, y-22, nw, 14, 7, 'rgba(20,16,38,.82)');
    ctx.fillStyle='#fff'; ctx.fillText(b.label, x+w/2, y-12);
    ctx.textAlign='left';
  }
}

/* ----- furniture ----- */
const DECO_ONLY=new Set(['plant','lamp','dresser','nightstand']);
function drawFurniture(){
  // iterate furniture objects once (dedupe by origin)
  const seen=new Set(); const now=performance.now();
  for(const [k,o] of scene.furnAt){
    if(seen.has(o)) continue; seen.add(o);
    const x=o.c*T-cam.x, y=o.r*T-cam.y;
    if(x>vw+40||y>vh+40||x+T*3<0||y+T*3<0) continue;
    if(!DECO_ONLY.has(o.t)){
      // soft pulsing halo marks everything you can use
      let maxX=0,maxY=0; for(const [dx,dy] of o.meta.fp){ if(dx>maxX)maxX=dx; if(dy>maxY)maxY=dy; }
      const w=(maxX+1)*T, h=(maxY+1)*T;
      const pulse=0.16+0.10*Math.sin(now/480+(o.c*3+o.r));
      rr(x-4,y-4,w+8,h+8,11,'rgba(255,226,150,'+(pulse*0.55).toFixed(3)+')');
      rr(x-2,y-2,w+4,h+4,9,'rgba(255,232,160,'+pulse.toFixed(3)+')');
      ctx.strokeStyle='rgba(255,240,190,'+(pulse*0.9).toFixed(3)+')'; ctx.lineWidth=1.5;
      ctx.strokeRect(x-1.5,y-1.5,w+3,h+3);
    }
    drawFurn(o.t, x, y, o);
  }
}
function box(x,y,w,h,r,fill){ rr(x,y,w,h,r,fill); ctx.strokeStyle=COL.outline; ctx.lineWidth=1.6; ctx.stroke(); }
function drawFurn(t,x,y,o){
  const busy = action && action.objKey===o.c+','+o.r;
  switch(t){
    case 'bed2': {
      box(x+2,y+2,2*T-4,2*T-4,6,'#7a5230');
      box(x+5,y+5,2*T-10,2*T-16,5,'#f6f3ee');
      rr(x+9,y+8,2*T-18,11,4,'#fff');
      box(x+5,y+T*1.15,2*T-10,T*0.7,5, ['#6f8fd1','#c9a13e','#8e5bd6'][(S.homeLv&&S.homeLv.bed)||0]); break; }
    case 'kidbed': {
      box(x+3,y+3,T-6,2*T-8,5,'#d66a8a'); rr(x+6,y+6,T-12,10,3,'#fff');
      box(x+5,y+T*1.1,T-10,T*0.7,4,'#7fc1e0'); break; }
    case 'crib': {
      box(x+3,y+4,T-6,T-8,4,'#caa15e');
      const baby=(S.kids||[]).find(k=>(k.age||0)<CHILD_AGE);
      if(baby){
        const giggling=performance.now()-babyGiggle<2400;
        const bob=giggling?Math.abs(Math.sin(performance.now()/120))*3:0, hy=y+11-bob;
        rr(x+7,y+10,T-14,T-18,4,'#ffd1dc');                                 // blanket
        ctx.fillStyle=S.skin; ctx.beginPath(); ctx.arc(x+T/2,hy,4.5,0,7); ctx.fill();
        ctx.strokeStyle=COL.outline; ctx.lineWidth=1; ctx.stroke();
        if(giggling){
          ctx.fillStyle='#1d1626'; ctx.beginPath(); ctx.arc(x+T/2-1.7,hy-0.5,0.9,0,7); ctx.arc(x+T/2+1.7,hy-0.5,0.9,0,7); ctx.fill();   // bright eyes
          ctx.strokeStyle='#c0392b'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(x+T/2,hy+1,2,0.15*Math.PI,0.85*Math.PI); ctx.stroke();     // big smile
          ctx.font='9px -apple-system'; ctx.textAlign='center'; ctx.fillText('😄',x+T-7,hy-5); ctx.textAlign='left';
        } else {
          ctx.beginPath(); ctx.moveTo(x+T/2-2,hy+0.5); ctx.lineTo(x+T/2-0.5,hy+0.5);
          ctx.moveTo(x+T/2+0.5,hy+0.5); ctx.lineTo(x+T/2+2,hy+0.5); ctx.stroke();   // sleepy eyes
          const zt=(performance.now()/700)%3;
          ctx.fillStyle='rgba(255,255,255,.85)'; ctx.font='700 8px -apple-system';
          ctx.fillText('z',x+T-9,y+8-zt*3);
        }
      } else {
        for(let i=0;i<4;i++){ ctx.fillStyle='#8a6a3a'; ctx.fillRect(x+6+i*7,y+6,2,T-14); }
        rr(x+8,y+T-12,T-16,7,3,'#ffd1dc');
      } break; }
    case 'toilet': {
      box(x+9,y+4,T-18,9,2,'#eef0f4');
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(x+T/2,y+T*0.66,9,10,0,0,7); ctx.fill();
      ctx.strokeStyle='#c9c9d1'; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(x+T/2,y+T*0.66,6,7,0,0,7); ctx.stroke(); break; }
    case 'shower': {
      box(x+3,y+3,T-6,T-6,5,'#cfeaf2');
      ctx.strokeStyle='#7db8c9'; ctx.lineWidth=2.5; ctx.strokeRect(x+4,y+4,T-8,T-8);
      ctx.fillStyle='#9aa3ad'; ctx.fillRect(x+T/2-1,y+5,2,7); ctx.beginPath(); ctx.arc(x+T/2,y+13,4,0,7); ctx.fill();
      if(busy){ ctx.strokeStyle='rgba(140,200,255,.7)'; ctx.lineWidth=1; for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(x+10+i*4,y+14); ctx.lineTo(x+9+i*4,y+T-4); ctx.stroke(); } } break; }
    case 'tub': {
      box(x+3,y+8,2*T-6,T-12,9,'#dff0f6'); rr(x+7,y+11,2*T-14,T-20,7,'#9fd8ec');
      ctx.fillStyle='#fff'; for(const [bx,by] of [[14,15],[24,13],[34,16],[44,14]]){ ctx.beginPath(); ctx.arc(x+bx,y+by,3,0,7); ctx.fill(); } break; }
    case 'sink': {
      box(x+5,y+7,T-10,T-12,3,'#9aa3ad'); ctx.fillStyle='#fff'; ctx.beginPath(); ctx.ellipse(x+T/2,y+T*0.55,7,5,0,0,7); ctx.fill();
      ctx.fillStyle='#6b7480'; ctx.fillRect(x+T/2-1,y+8,2,6); break; }
    case 'fridge': {
      box(x+5,y+1,T-10,T-3,4, ['#e6eaef','#aebfd6','#d9c08f'][(S.homeLv&&S.homeLv.kitchen)||0]);
      ctx.strokeStyle='rgba(0,0,0,.18)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x+5,y+T*0.42); ctx.lineTo(x+T-5,y+T*0.42); ctx.stroke();
      ctx.fillStyle='#6b7480'; ctx.fillRect(x+T-11,y+6,2,7); ctx.fillRect(x+T-11,y+T*0.5,2,9); break; }
    case 'stove': {
      box(x+3,y+3,T-6,T-6,3,'#5a5a66'); ctx.fillStyle='#2b2b34';
      for(const [bx,by] of [[10,11],[22,11],[10,22],[22,22]]){ ctx.beginPath(); ctx.arc(x+bx,y+by,4,0,7); ctx.fill(); }
      if(busy){ ctx.fillStyle='#ff7b3d'; ctx.beginPath(); ctx.arc(x+10,y+11,3,0,7); ctx.fill(); } break; }
    case 'counter': { box(x+2,y+5,T-4,T-9,3,'#b7a78f'); ctx.fillStyle='#9c8a6e'; ctx.fillRect(x+2,y+5,T-4,5); break; }
    case 'espresso': { box(x+3,y+6,T-6,T-9,3,'#6b4636'); rr(x+9,y+10,T-18,9,2,'#c0c0cc'); ctx.fillStyle='#3a2a20'; ctx.fillRect(x+T/2-3,y+T-9,6,5); break; }
    case 'table2': { box(x+3,y+3,2*T-6,2*T-6,5,'#9c6b3f'); ctx.fillStyle='rgba(255,255,255,.12)'; ctx.fillRect(x+6,y+6,2*T-12,5);
      ctx.font='12px sans-serif'; ctx.fillText('🍽️',x+T-7,y+T+5); break; }
    case 'tv2': case 'tv3': {
      const w=(t==='tv3'?3:2)*T; box(x+(w-((t==='tv3')?w-6:w-10))/2+ (t==='tv3'?0:0), 0,0,0,0);
      const tw=w-12, tx=x+(w-tw)/2;
      rr(x+w/2-12,y+T-9,24,6,2,'#3a3344');
      box(tx,y+4,tw,T-12,3,'#15151f');
      const watching=busy;
      ctx.fillStyle=watching?'#8fd0ff':'#2c2c40'; ctx.fillRect(tx+3,y+7,tw-6,T-20);
      if(watching){ ctx.fillStyle='#ffde8a'; ctx.fillRect(tx+tw*0.2,y+10,tw*0.25,T-26); ctx.fillStyle='#ff8fae'; ctx.fillRect(tx+tw*0.55,y+12,tw*0.2,T-28);} break; }
    case 'sofa2': case 'sofa3': {
      const w=(t==='sofa3'?3:2)*T; box(x+2,y+3,w-4,T-7,8,'#c0563f');
      for(let i=0;i<(t==='sofa3'?3:2);i++) rr(x+5+i*T,y+T*0.4,T-9,T*0.45,5,'#d4694f'); break; }
    case 'computer': {
      box(x+2,y+9,2*T-4,T-13,3,'#8b5e3c'); rr(x+T*0.5,y+3,T*0.95,15,2,'#22222e');
      ctx.fillStyle=busy?'#9fd8ff':'#45506b'; ctx.fillRect(x+T*0.5+2,y+5,T*0.95-4,11);
      if(busy){ ctx.fillStyle='#fff'; ctx.fillRect(x+T*0.6,y+7,3,2); ctx.fillRect(x+T*0.6,y+11,T*0.5,2);} break; }
    case 'phone': { box(x+5,y+8,T-10,T-12,3,'#7a5230'); rr(x+T/2-5,y+11,10,14,2,'#22222e'); ctx.fillStyle='#7fd8a8'; ctx.fillRect(x+T/2-3,y+13,6,8); break; }
    case 'bookshelf': case 'bookshelf1': {
      const w=(t==='bookshelf')?2*T:T; box(x+2,y+2,w-4,T-4,3,'#7a5230');
      const bc=['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#16a085']; const n=Math.floor((w-12)/7);
      for(let i=0;i<n;i++){ ctx.fillStyle=bc[i%6]; ctx.fillRect(x+6+i*7,y+7,5,T-16);} break; }
    case 'toybox': { box(x+4,y+8,T-8,T-12,3,'#e67e22'); ctx.font='13px sans-serif'; ctx.fillText('🧸',x+8,y+T-6); break; }
    case 'treadmill': { box(x+4,y+2,T-8,2*T-6,4,'#3a3a48'); rr(x+7,y+T*1.2,T-14,T*0.7,3,'#22222e');
      ctx.fillStyle='#9aa3ad'; ctx.fillRect(x+T/2-1,y+6,2,T*0.9); rr(x+T/2-7,y+4,14,6,2,'#15151f'); break; }
    case 'plant': {
      ctx.fillStyle='#b46a4a'; ctx.beginPath(); ctx.moveTo(x+11,y+18); ctx.lineTo(x+T-11,y+18); ctx.lineTo(x+T-14,y+T-4); ctx.lineTo(x+14,y+T-4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=COL.outline; ctx.lineWidth=1.4; ctx.stroke();
      for(const [dx,dy,rad] of [[T/2,9,9],[T/2-8,14,7],[T/2+8,14,7]]){ ctx.fillStyle='#3f9d5a'; ctx.beginPath(); ctx.arc(x+dx,y+dy,rad,0,7); ctx.fill(); } break; }
    case 'lamp': { ctx.fillStyle='#6b5a3a'; ctx.fillRect(x+T/2-2,y+12,4,T-16); rr(x+T/2-9,y+4,18,12,4,isNight()?'#ffe9a8':'#d8cba8');
      if(isNight()){ ctx.fillStyle='rgba(255,225,150,.2)'; ctx.beginPath(); ctx.arc(x+T/2,y+12,16,0,7); ctx.fill(); } break; }
    case 'dresser': { box(x+4,y+6,T-8,T-10,3,'#9c6b3f'); ctx.strokeStyle='rgba(0,0,0,.2)'; ctx.lineWidth=1; ctx.strokeRect(x+4,y+T*0.55,T-8,0.01);
      ctx.fillStyle='#d9c08f'; ctx.fillRect(x+T/2-3,y+10,6,2); ctx.fillRect(x+T/2-3,y+T*0.6,6,2); break; }
    case 'nightstand': { box(x+6,y+10,T-12,T-14,3,'#9c6b3f'); ctx.fillStyle='#5c3d24'; ctx.fillRect(x+T/2-1,y+3,2,9); rr(x+T/2-7,y-1,14,7,3,isNight()?'#ffe9a8':'#e8d9a8'); break; }
    case 'bench': { box(x+3,y+T*0.4,2*T-6,T*0.34,3,'#9c6b3f'); ctx.fillStyle='#7a5230'; ctx.fillRect(x+5,y+T*0.74,4,T*0.2); ctx.fillRect(x+2*T-9,y+T*0.74,4,T*0.2); break; }
    case 'picnic': {
      box(x+5,y+T*0.5,2*T-10,T*0.28,3,'#cf6f6f');                     // red-check tabletop
      ctx.fillStyle='rgba(255,255,255,.5)'; for(let i=0;i<5;i++) ctx.fillRect(x+8+i*((2*T-16)/5),y+T*0.5,2,T*0.28);
      ctx.fillStyle='#8a6a3a'; ctx.fillRect(x+8,y+T*0.78,4,T*0.18); ctx.fillRect(x+2*T-12,y+T*0.78,4,T*0.18);
      ctx.font='12px sans-serif'; ctx.fillText('🧺',x+2*T-16,y+T*0.48); break; }
    case 'fountain': {
      box(x+3,y+3,2*T-6,2*T-6,12,'#9aa6b2'); rr(x+9,y+9,2*T-18,2*T-18,10,COL.water);
      ctx.fillStyle='#cfeaf6'; ctx.beginPath(); ctx.arc(x+T,y+T,5,0,7); ctx.fill();
      for(let i=0;i<6;i++){ const a=performance.now()/300+i; ctx.fillStyle='rgba(255,255,255,.6)'; ctx.fillRect(x+T+Math.cos(a)*10, y+T+Math.sin(a)*10-6,2,2); } break; }
    case 'palm': {
      ctx.fillStyle=COL.treeTrunk; ctx.fillRect(x+T/2-2,y+T-16,4,16);
      ctx.fillStyle='#3f9d5a'; for(const a of [-0.9,-0.3,0.3,0.9,2.4,3.7]){ ctx.beginPath(); ctx.ellipse(x+T/2+Math.cos(a)*10,y+T-16+Math.sin(a)*7,9,4,a,0,7); ctx.fill(); }
      ctx.fillStyle='#7a4a2a'; ctx.beginPath(); ctx.arc(x+T/2,y+T-16,3,0,7); ctx.fill(); break; }
    case 'cabana': {
      ctx.fillStyle='#c9a06a'; ctx.fillRect(x+5,y+T*0.55,3,T*0.4); ctx.fillRect(x+2*T-8,y+T*0.55,3,T*0.4);
      box(x+4,y+T*0.55,2*T-8,T*0.3,5,'#e0c089');
      ctx.fillStyle='#c0563f'; ctx.beginPath(); ctx.moveTo(x+1,y+T*0.55); ctx.lineTo(x+T,y+6); ctx.lineTo(x+2*T-1,y+T*0.55); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=COL.outline; ctx.lineWidth=1.5; ctx.stroke(); break; }
    case 'lounger': { box(x+4,y+T*0.5,T-8,T*0.32,4,'#e6e1d2'); ctx.fillStyle='#9fd8ec'; ctx.fillRect(x+6,y+T*0.5+2,T-12,4);
      ctx.fillStyle='#cbb48f'; ctx.fillRect(x+6,y+T*0.82,3,5); ctx.fillRect(x+T-9,y+T*0.82,3,5); break; }
    case 'tiki': { box(x+4,y+T*0.5,2*T-8,T*0.34,4,'#7a4a2a'); ctx.fillStyle='#caa15e'; for(let i=0;i<6;i++) ctx.fillRect(x+8+i*7,y+T*0.5,2,T*0.34);
      ctx.fillStyle='#3f9d5a'; ctx.beginPath(); ctx.moveTo(x+2,y+T*0.5); ctx.lineTo(x+T,y+8); ctx.lineTo(x+2*T-2,y+T*0.5); ctx.closePath(); ctx.fill();
      ctx.font='12px sans-serif'; ctx.fillText('🍹',x+2*T-16,y+T*0.5+12); break; }
    case 'ruins': {
      ctx.fillStyle='#9a9384'; ctx.fillRect(x+4,y+T*0.6,8,1.4*T); ctx.fillRect(x+2*T-12,y+T*0.6,8,1.4*T);
      box(x+2,y+T*0.5,2*T-4,T*0.3,2,'#aaa294');
      ctx.fillStyle='#8a8475'; ctx.fillRect(x+T-3,y+T*0.8,6,T); ctx.fillStyle='#7e7869'; ctx.fillRect(x+6,y+2*T-6,2*T-12,6); break; }
    case 'campfire': {
      ctx.fillStyle='#6b4a2f'; ctx.fillRect(x+8,y+T-12,T-16,4); ctx.fillRect(x+T/2-2,y+T-16,4,10);
      const f=performance.now()/120; ctx.fillStyle='#ff7b3d'; ctx.beginPath(); ctx.moveTo(x+T/2,y+6+Math.sin(f)*2); ctx.lineTo(x+T/2-7,y+T-10); ctx.lineTo(x+T/2+7,y+T-10); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#ffd24d'; ctx.beginPath(); ctx.moveTo(x+T/2,y+12+Math.sin(f+1)*2); ctx.lineTo(x+T/2-4,y+T-10); ctx.lineTo(x+T/2+4,y+T-10); ctx.closePath(); ctx.fill(); break; }
    case 'treasure': {
      const got=(S.vacay&&(S.vacay.found||[]).indexOf(o.c+','+o.r)>=0);
      if(got){ box(x+7,y+T-13,T-14,9,2,'#8a6a3a'); ctx.fillStyle='#5a4a2a'; ctx.fillRect(x+9,y+T-11,T-18,5); }
      else { const bob=Math.sin(performance.now()/400+o.c)*1.5; box(x+7,y+T-15+bob,T-14,11,2,'#caa15e');
        ctx.fillStyle='#ffd76a'; ctx.fillRect(x+9,y+T-13+bob,T-18,3); ctx.font='12px sans-serif'; ctx.textAlign='center'; ctx.fillText('❓',x+T/2,y+T-2+bob); ctx.textAlign='left'; } break; }
    case 'excursion': {
      box(x+5,y+6,T-10,T-12,3,'#5b8fd6'); ctx.fillStyle='#fff'; ctx.font='13px sans-serif'; ctx.textAlign='center';
      ctx.fillText(o.ex&&scene.vac?((scene.vac.excursions.find(e=>e.id===o.ex)||{}).icon||'🎟️'):'🎟️',x+T/2,y+T/2+5); ctx.textAlign='left'; break; }
    case 'return': {
      ctx.fillStyle='#8a8475'; ctx.fillRect(x+T/2-2,y+10,4,T-12); box(x+4,y+4,T-8,12,3,'#5b8fd6');
      ctx.font='11px sans-serif'; ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.fillText('✈️',x+T/2,y+14); ctx.textAlign='left'; break; }
    case 'rental': {
      box(x+3,y+T*0.5,2*T-6,T*0.5-2,4,'#e3c79a');                       // walls
      ctx.fillStyle='#b3654a'; ctx.beginPath(); ctx.moveTo(x,y+T*0.55); ctx.lineTo(x+T,y+8); ctx.lineTo(x+2*T,y+T*0.55); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=COL.outline; ctx.lineWidth=1.5; ctx.stroke();
      box(x+T-6,y+T*0.62,12,T*0.36,2,'#6b4426');                        // door
      ctx.fillStyle='#9fd8ff'; ctx.fillRect(x+8,y+T*0.62,9,9); ctx.fillRect(x+2*T-20,y+T*0.62,9,9); // windows
      rr(x+2*T-20,y+T*0.4,18,12,4,'rgba(255,255,255,.9)'); ctx.font='9px sans-serif'; ctx.textAlign='center'; ctx.fillStyle='#3b3347'; ctx.fillText('🏚️',x+2*T-11,y+T*0.4+10); ctx.textAlign='left'; break; }
    default: box(x+5,y+5,T-10,T-10,4,'#8a7a9a');
  }
}

/* ----- characters ----- */
function drawPerson(px,py,look,dir,phase,scaleP){
  const sp=scaleP||1;
  const skin=look.skin, shirt=look.shirt, hair=look.hair, style=look.style||0;
  // shadow
  ctx.fillStyle=COL.shadow; ctx.beginPath(); ctx.ellipse(px,py+1,9*sp,3.5*sp,0,0,7); ctx.fill();
  const step=Math.sin(phase)*3*sp, walk=Math.abs(Math.sin(phase));
  // legs
  ctx.fillStyle='#3a3550';
  rr(px-6*sp, py-7*sp+step*0.4, 5*sp, (7-step*0.4)*sp, 2, '#3a3550');
  rr(px+1*sp, py-7*sp-step*0.4, 5*sp, (7+step*0.4)*sp, 2, '#3a3550');
  ctx.strokeStyle=COL.outline; ctx.lineWidth=1.4;
  // body
  const bodyH=15*sp;
  rr(px-8*sp, py-7*sp-bodyH, 16*sp, bodyH, 6, shirt); ctx.strokeStyle=COL.outline; ctx.lineWidth=1.4; ctx.stroke();
  // arms hint
  ctx.fillStyle=shade(shirt,0.85); rr(px-9*sp,py-7*sp-bodyH+3,3*sp,9*sp,2,shade(shirt,0.85)); rr(px+6*sp,py-7*sp-bodyH+3,3*sp,9*sp,2,shade(shirt,0.85));
  // skirt / dress (flares over the legs)
  if(look.dress){
    ctx.fillStyle=shirt; ctx.beginPath();
    ctx.moveTo(px-7*sp,py-9*sp); ctx.lineTo(px+7*sp,py-9*sp);
    ctx.lineTo(px+12*sp,py-0.5*sp); ctx.lineTo(px-12*sp,py-0.5*sp); ctx.closePath();
    ctx.fill(); ctx.strokeStyle=COL.outline; ctx.lineWidth=1.4; ctx.stroke();
    ctx.fillStyle=shade(shirt,1.12); ctx.fillRect(px-1*sp,py-9*sp,2*sp,8*sp);
  }
  // head
  const hy=py-7*sp-bodyH-7*sp;
  rr(px-8*sp, hy-8*sp, 16*sp, 16*sp, 7, skin); ctx.strokeStyle=COL.outline; ctx.lineWidth=1.4; ctx.stroke();
  // hair
  ctx.fillStyle=hair;
  if(style===6){ /* bald — tiny shine, no hair */ if(dir!=='N'){ ctx.fillStyle='rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(px-2*sp,hy-5*sp,3*sp,0,7); ctx.fill(); } }
  else if(dir==='N'){
    rr(px-8*sp,hy-8*sp,16*sp,12*sp,6,hair);
    if(style===4){ rr(px-3*sp,hy+2*sp,6*sp,14*sp,3,hair); }                 // ponytail down the back
    if(style===1||style===3){ rr(px-8*sp,hy-8*sp,16*sp,16*sp,6,hair); }      // long/bob fuller from behind
    if(style===5){ ctx.beginPath(); ctx.arc(px-6*sp,hy-7*sp,4*sp,0,7); ctx.arc(px+6*sp,hy-7*sp,4*sp,0,7); ctx.fill(); }
  } else {
    rr(px-8*sp,hy-8*sp,16*sp,7*sp,6,hair);
    if(style===1){ rr(px-8*sp,hy-8*sp,4*sp,16*sp,3,hair); rr(px+4*sp,hy-8*sp,4*sp,16*sp,3,hair); } // long
    if(style===2){ for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(px-7*sp+i*5*sp,hy-7*sp); ctx.lineTo(px-9*sp+i*5*sp,hy-13*sp); ctx.lineTo(px-4*sp+i*5*sp,hy-8*sp); ctx.closePath(); ctx.fill(); } } // spiky
    if(style===3){ rr(px-9*sp,hy-8*sp,5*sp,12*sp,4,hair); rr(px+4*sp,hy-8*sp,5*sp,12*sp,4,hair); rr(px-9*sp,hy+2*sp,18*sp,3*sp,2,hair); } // bob (chin-length, flared)
    if(style===4){ rr(px+5*sp,hy-9*sp,4*sp,3*sp,2,hair); rr(px+6*sp,hy-8*sp,5*sp,13*sp,3,hair); } // ponytail to the side
    if(style===5){ ctx.beginPath(); ctx.arc(px-6*sp,hy-9*sp,4*sp,0,7); ctx.arc(px+6*sp,hy-9*sp,4*sp,0,7); ctx.fill(); } // buns
  }
  // eyes
  if(dir!=='N'){
    ctx.fillStyle=COL.outline;
    let ex = dir==='E'?3:dir==='W'?-3:0;
    if(dir==='S'||dir==='E'||dir==='W'){
      ctx.beginPath(); ctx.arc(px-3*sp+ex*sp,hy-1*sp,1.6*sp,0,7); ctx.fill();
      ctx.beginPath(); ctx.arc(px+3*sp+ex*sp,hy-1*sp,1.6*sp,0,7); ctx.fill();
      if(look.lashes){ ctx.strokeStyle=COL.outline; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(px-5*sp+ex*sp,hy-2.5*sp); ctx.lineTo(px-3.5*sp+ex*sp,hy-1.8*sp);
        ctx.moveTo(px+5*sp+ex*sp,hy-2.5*sp); ctx.lineTo(px+3.5*sp+ex*sp,hy-1.8*sp); ctx.stroke(); }
    }
  }
}
function playerLook(){ return {skin:S.skin, shirt:S.shirt, hair:S.hair, style:S.hairStyle, dress:isDressOutfit(S.outfit), lashes:S.gender==='f'}; }
function isDressOutfit(id){ const o=OUTFITS.find(x=>x.id===id); return !!(o&&o.dress); }

function drawActors(){
  // npcs (town)
  if(scene.type==='town'){
    for(const n of npcSprites){
      const x=n.px-cam.x, y=n.py-cam.y;
      if(x<-30||y<-40||x>vw+30||y>vh+30) continue;
      drawPerson(x,y,{skin:n.def.skin,shirt:n.def.shirt,hair:n.def.hair,style:n.def.style}, n.dir, n.wt);
      // name + heart tag
      const rel=S.rels[n.def.id]?S.rels[n.def.id].rel:0;
      ctx.font='700 9px -apple-system'; ctx.textAlign='center';
      ctx.fillStyle='rgba(0,0,0,.4)'; rr(x-16,y-58,32,12,4,'rgba(20,16,38,.75)');
      ctx.fillStyle=S.partner===n.def.id?'#ff9fc0':'#fff'; ctx.fillText(n.def.name,x,y-49);
      ctx.textAlign='left';
    }
  }
  // household (partner & kids) at home
  if(scene.type==='home'||scene.type==='vacation'){
    for(const n of homies){
      if(action&&action.woo&&n.kind==='partner') continue;   // they're… busy
      const x=n.px-cam.x, y=n.py-cam.y;
      drawPerson(x,y,n.look,n.dir,n.tpath.length?n.wt:0,n.sc);
      const ny=n.sc<1?y-40:y-52;
      const lbl=n.kind==='partner'?n.name+' 💞':n.kind==='staff'?(n.badge+' '+n.name):n.name;
      rr(x-19,ny-9,38,12,4,'rgba(20,16,38,.75)');
      ctx.font='700 9px -apple-system'; ctx.textAlign='center';
      ctx.fillStyle=n.kind==='partner'?'#ff9fc0':n.kind==='staff'?'#ffd76a':'#9fe0b0';
      ctx.fillText(lbl, x, ny); ctx.textAlign='left';
    }
  }
  // player
  drawPlayer();
}
function drawPlayer(){
  if(S.atWork||S.hospital||S.studying) return;
  const x=S.px-cam.x, y=S.py-cam.y;
  if(action&&action.woo){ drawCensor(); return; }
  const sleeping=action&&action.kind==='sleep';
  const riding=scene.type==='town'&&S.vehicle&&path.length>0;
  const ps=kahunaActive()?2:1;   // 🌟 Big Kahuna: tower over everyone
  if(sleeping){
    ctx.font='800 12px -apple-system'; const zt=(performance.now()/600)%3;
    drawPerson(x,y,playerLook(),'S',0,0.9*ps);
    ctx.fillStyle='rgba(255,255,255,.9)'; ctx.fillText('z',x+10,y-44-zt*5); ctx.fillText('Z',x+16,y-54-zt*5);
  } else if(riding){
    drawRide(x,y);
  } else {
    drawPerson(x,y,playerLook(),facing,path.length?walkT:0,ps);
  }
  if(!sleeping) drawPlumbob(x, y-(riding?40:48)*(ps>1?1.6:1));
  drawBubble(x,y);
}
function drawPlumbob(x,topY){
  const m=mood(); const col=m>=70?'#41d97c':m>=40?'#ffc94d':'#ff5d6c';
  const cy=topY-6+Math.sin(performance.now()/320)*2;
  ctx.fillStyle=col;
  ctx.beginPath(); ctx.moveTo(x,cy-7); ctx.lineTo(x+5,cy); ctx.lineTo(x,cy+7); ctx.lineTo(x-5,cy); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.7)'; ctx.lineWidth=1; ctx.stroke();
  ctx.globalAlpha=.55; ctx.fillStyle='#fff';
  ctx.beginPath(); ctx.moveTo(x,cy-7); ctx.lineTo(x+5,cy); ctx.lineTo(x,cy); ctx.closePath(); ctx.fill();
  ctx.globalAlpha=1;
}
function headOnly(x,hy){
  const look=playerLook();
  rr(x-7,hy-7,14,14,6,look.skin); ctx.strokeStyle=COL.outline; ctx.lineWidth=1.3; ctx.stroke();
  rr(x-7,hy-7,14,6,5,look.hair);
  ctx.fillStyle=COL.outline; ctx.beginPath(); ctx.arc(x-2.5,hy+1,1.3,0,7); ctx.arc(x+2.5,hy+1,1.3,0,7); ctx.fill();
}
function drawRide(x,y){
  const horiz=facing==='E'||facing==='W'; const flip=facing==='W'?-1:1;
  if(S.vehicle==='bike'){
    ctx.fillStyle='rgba(20,10,30,.22)'; ctx.beginPath(); ctx.ellipse(x,y+2,13,4,0,0,7); ctx.fill();
    ctx.strokeStyle='#2b2b38'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(x-9*flip,y-3,6,0,7); ctx.stroke();
    ctx.beginPath(); ctx.arc(x+9*flip,y-3,6,0,7); ctx.stroke();
    const spin=performance.now()/90;
    ctx.lineWidth=1; ctx.beginPath();
    ctx.moveTo(x-9*flip-Math.cos(spin)*5,y-3-Math.sin(spin)*5); ctx.lineTo(x-9*flip+Math.cos(spin)*5,y-3+Math.sin(spin)*5); ctx.stroke();
    ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(x-9*flip,y-3); ctx.lineTo(x,y-11); ctx.lineTo(x+9*flip,y-3); ctx.stroke();
    drawPerson(x,y-9,playerLook(),facing,walkT*0.4);
  } else {
    const limo=S.vehicle==='limo'; const col=limo?'#23232e':'#d6453d';
    if(horiz){
      const L=limo?54:36, H=18;
      ctx.fillStyle='rgba(20,10,30,.25)'; ctx.beginPath(); ctx.ellipse(x,y+4,L/2,5,0,0,7); ctx.fill();
      rr(x-L/2,y-14,L,H,7,col); ctx.strokeStyle=COL.outline; ctx.lineWidth=2; ctx.stroke();
      rr(x-L/2+6,y-11,L-12,7,3,limo?'#3d3d52':'#9fd8ff');
      if(limo){ ctx.strokeStyle='#9fd8ff'; ctx.lineWidth=1;
        for(let i=1;i<4;i++){ ctx.beginPath(); ctx.moveTo(x-L/2+6+i*(L-12)/4,y-11); ctx.lineTo(x-L/2+6+i*(L-12)/4,y-4); ctx.stroke(); } }
      ctx.fillStyle='#1d1626'; ctx.beginPath(); ctx.arc(x-L/2+9,y+4,4.5,0,7); ctx.arc(x+L/2-9,y+4,4.5,0,7); ctx.fill();
      ctx.fillStyle='#555'; ctx.beginPath(); ctx.arc(x-L/2+9,y+4,2,0,7); ctx.arc(x+L/2-9,y+4,2,0,7); ctx.fill();
      ctx.fillStyle='#ffe9a8'; ctx.fillRect(x+flip*(L/2-2)-2,y-10,4,4);
      headOnly(x-(limo?L*0.22:0)*flip, y-17);
    } else {
      const W=20, LH=limo?48:34;
      ctx.fillStyle='rgba(20,10,30,.25)'; ctx.beginPath(); ctx.ellipse(x,y+3,12,5,0,0,7); ctx.fill();
      rr(x-W/2,y-LH+6,W,LH,7,col); ctx.strokeStyle=COL.outline; ctx.lineWidth=2; ctx.stroke();
      rr(x-W/2+4,y-LH+10,W-8,9,3,limo?'#3d3d52':'#9fd8ff');
      ctx.fillStyle='#1d1626';
      ctx.fillRect(x-W/2-2,y-LH+12,3,8); ctx.fillRect(x+W/2-1,y-LH+12,3,8);
      ctx.fillRect(x-W/2-2,y-4,3,8); ctx.fillRect(x+W/2-1,y-4,3,8);
      headOnly(x, y-LH/2);
    }
  }
}
function drawBubble(x,y){
  const topY=Math.max(y-46,28); const bx=clamp(x,28,vw-28);
  if(action&&action.icon){
    rr(bx-22,topY-6,44,30,9,'rgba(255,255,255,.96)');
    ctx.font='17px sans-serif'; ctx.textAlign='center'; ctx.fillText(action.icon,bx,topY+13);
    if(action.total){ const pct=action.kind==='sleep'? S.needs.energy/100 : 1-action.left/action.total;
      rr(bx-15,topY+16,30,3.5,2,'#e3e0ee'); rr(bx-15,topY+16,30*clamp(pct,0.02,1),3.5,2,'#5ee07a'); }
    ctx.textAlign='left';
  }
}

/* ----- day / night ----- */
function isNight(){ const h=Math.floor(S.minutes/60)%24; return h>=21||h<6; }
function nightAlpha(){ const h=(S.minutes/60)%24;
  if(h>=22||h<5) return .42; if(h>=5&&h<7.5) return .42*(1-(h-5)/2.5); if(h>=19.5&&h<22) return .42*((h-19.5)/2.5); return 0; }

function draw(){
  ctx.clearRect(0,0,vw,vh);
  if(!S||!scene){ return; }
  drawTerrain();
  if(scene.type==='town') drawBuildings();
  drawFurniture();
  drawActors();
  drawMoveHint();
  drawCheatHint();
  drawParts();
  const na=nightAlpha(); if(na>0){ ctx.fillStyle='rgba(16,18,52,'+na+')'; ctx.fillRect(0,0,vw,vh); }
  if(transition>0){ ctx.fillStyle='rgba(8,6,16,'+transition+')'; ctx.fillRect(0,0,vw,vh); }
}

/* ============================================================ */
/*                        SIMULATION                            */
/* ============================================================ */
function mood(){ const n=S.needs; return (n.hunger+n.energy+n.hygiene+n.bladder+n.fun+n.social)/6; }
function moodEmoji(){ const m=mood(); return m>=78?'😄':m>=58?'🙂':m>=38?'😐':m>=20?'☹️':'😫'; }

let levelQueue=[];
function addXP(n){
  if(S.career==='artist') n=Math.round(n*1.25);
  S.xp+=n;
  let need=80+S.level*40;
  while(S.xp>=need){ S.xp-=need; S.level++; onLevelUp(S.level); need=80+S.level*40; }
}
const LEVEL_PERKS=['+1 Charisma ✨','+1 Stamina 💪','+1 Wit 🧠','+1 Charm 💗','+1 Grit 🔥','+1 Focus 🎯','+1 Luck 🍀','+1 Style 👑'];
function onLevelUp(lv){
  SFX.level();
  const milestone = lv%10===0;
  const coins = milestone ? lv*45 : 30 + lv*8;
  addCoins(coins);
  let perk = LEVEL_PERKS[(lv-1)%LEVEL_PERKS.length];
  let gift = '';
  if(milestone){
    if(!S.milestones.includes(lv)) S.milestones.push(lv);
    gift = milestoneReward(lv);
  }
  levelQueue.push({lv, coins, milestone, perk, gift});
  if(levelQueue.length===1) showNextLevelUp();
}
function milestoneReward(lv){
  if(lv===10){ if(!S.wardrobe.includes('sunny')) S.wardrobe.push('sunny'); return '🎁 Free outfit: Sunny Tee'; }
  if(lv===20){ S.vehicles=S.vehicles||[]; if(!S.vehicles.includes('bike')) S.vehicles.push('bike'); return '🎁 Free Bike'; }
  if(lv===30){ S.gifts.ring=(S.gifts.ring||0)+1; return '🎁 Free Ring 💍'; }
  if(lv===40){ S.vehicles=S.vehicles||[]; if(!S.vehicles.includes('car')) S.vehicles.push('car'); return '🎁 Free Car'; }
  if(lv===50){ if(S.homeTier<1){ S.homeTier=1; if(scene&&scene.type==='home') buildHome(); } return '🎁 Free home upgrade!'; }
  return '🎁 Big milestone bonus';
}
function showNextLevelUp(){
  const it=levelQueue[0]; if(!it){ paused=false; const ov=el('levelOverlay'); if(ov) ov.classList.remove('show'); return; }
  const ov=el('levelOverlay'); if(!ov){ levelQueue.shift(); showNextLevelUp(); return; }
  paused=true;
  ov.innerHTML =
    `<div class="lvlCard ${it.milestone?'milestone':''}">`
    + `<div class="lvlRing">${it.milestone?'🏆':'⭐'}</div>`
    + `<h2>${it.milestone?'Milestone — Level '+it.lv+'!':'Level '+it.lv+'!'}</h2>`
    + `<div class="lvlPerk">${it.perk}</div>`
    + `<div class="lvlReward">+${it.coins}💰${it.gift?'<br>'+it.gift:''}</div>`
    + `<button class="bigbtn" id="lvlGo">${it.milestone?'Awesome!':'Continue'}</button>`
    + `</div>`;
  ov.classList.add('show');
  burst(vw/2, vh/3, it.milestone?'confetti':'spark');
  el('lvlGo').onclick=()=>{ levelQueue.shift(); SFX.good(); updateHUDNow(); save(); showNextLevelUp(); };
}
function addCoins(n){ S.coins+=n; if(S.stats) S.stats.peakCoins=Math.max(S.stats.peakCoins||0,Math.floor(S.coins)); const c=el('coins'); c.classList.add('bump'); setTimeout(()=>c.classList.remove('bump'),160); }
function spend(n){ if(kahunaActive()) return true;   // 🌟 Big Kahuna: everything's free
  if(S.coins<n){ toast("Not enough coins 💰"); SFX.err(); return false; } S.coins-=n; return true; }
/* ---- Wave 6 helpers: services + cheats ---- */
function svc(id){ return !!(S.services && S.services[id] > S.minutes); }
function kahunaActive(){ return !!(S.kahunaUntil && S.minutes < S.kahunaUntil); }
function revealActive(){ return !!(S.cheatRevealUntil && S.minutes < S.cheatRevealUntil); }
function socialMult(){ let m=1; if(kahunaActive()) m*=1.5; if(S.cheatSocial) m*=1.75; return m; }   // beneficial social boost
function serviceCost(id, termId){ const term=SERVICE_TERMS.find(t=>t.id===termId); const rate=id==='bundle'?SERVICE_BUNDLE_DAY:SERVICE_DAY;
  return Math.round(rate*term.days*(1-term.disc)); }

function qprogress(ev,amt){
  amt=amt||1; let any=false;
  for(const q of S.quests){ if(q.claimed||q.done) continue; const def=QUEST_POOL.find(d=>d.id===q.id); if(def.ev!==ev) continue;
    q.prog=Math.min(def.n,q.prog+amt); if(q.prog>=def.n){ q.done=true; any=true; SFX.good(); toast('✅ Quest ready: '+def.txt); } }
  if(any) refreshLifeDot();
}

function tick(dt){
  if(!S||paused) return;
  const sleeping=action&&action.kind==='sleep';
  const mult=(S.atWork||S.hospital||S.studying)?6:(sleeping?5:1);
  const dtMin=dt*1.6*speed*mult;   // 1.6 game-min/real-sec → 15-min day at 1×, 5-min at 3×
  S.minutes+=dtMin;

  // kids attend school in the background even while you do your thing
  if(S.kids) for(const k of S.kids){ if(k.atSchool){ k.atSchool.left-=dtMin; if(k.atSchool.left<=0) endKidSchool(k); } }

  if(S.atWork){ S.atWork.left-=dtMin; if(S.atWork.left<=0) endWork(); updateAwayChip(); return; }
  if(S.studying){ S.studying.left-=dtMin; if(S.studying.left<=0) endStudy(); updateAwayChip(); return; }
  if(S.hospital){ S.hospital.left-=dtMin; if(S.hospital.left<=0) leaveHospital(); updateAwayChip(); return; }

  const n=S.needs;
  const decorLv=S.homeLv?S.homeLv.decor:0;
  for(const d of NEEDS){
    let rate=d.decay*NEEDS_DECAY_MULT;   // global gentler-needs softener
    if(sleeping){ if(d.k==='energy') continue; rate*=(d.k==='bladder'?0.55:d.k==='hunger'?0.5:0.18); }
    if(S.career==='doctor') rate*=0.85;                                  // career perks
    if(S.career==='artist'&&d.k==='fun') rate*=0.7;
    if(S.career==='trainer'&&d.k==='energy') rate*=0.85;
    if(d.k==='fun'){ const fm={hoodie:0.9, floral:0.88}[S.outfit]; if(fm) rate*=fm; } // outfit perk
    if(decorLv&&(d.k==='fun'||d.k==='social')) rate*=(decorLv>=2?0.65:0.75); // decor tier
    if(S.partner&&d.k==='social') rate*=0.7;
    if(d.k==='hunger'&&svc('chef')) rate*=0.18;      // 🍳 chef keeps the family fed
    if(d.k==='hygiene'&&svc('maid')) rate*=0.18;     // 🧹 maid keeps things clean
    n[d.k]=clamp(n[d.k]-rate/60*dtMin,0,100);
  }

  if(action){
    if(action.kind==='sleep'){
      const rate=[15,22,30][S.homeLv?S.homeLv.bed:0]||15;
      n.energy=Math.min(100,n.energy+rate/60*dtMin);
      if(action.untilMorning){ if(S.minutes>=action.wakeAt||n.energy>=99){ wakeUp(); } }
      else if(n.energy>=99){ wakeUp(); }
    } else if(action.fx){
      action.left-=dtMin;
      if(action.left<=0){ applyFx(action.fx); finishAction(); }
    }
  }

  // warnings
  for(const d of NEEDS){
    if(n[d.k]<12&&!S.warned[d.k]){ S.warned[d.k]=true; toast('⚠️ '+S.name+"'s "+d.lbl+' is low '+d.ic); }
    if(n[d.k]>28) S.warned[d.k]=false;
  }
  // total collapse → hospital (energy gone, or 3+ needs bottomed out)
  if(!S.hospital&&!S.atWork&&!S.studying&&scene&&scene.type!=='vacation'){
    const zeros=NEEDS.filter(d=>n[d.k]<=1).length;
    if(n.energy<=0.5||zeros>=3) hospitalize();
  }
  // kids' happiness ticks continuously (🍼 a nanny keeps them content)
  if(S.kids) for(const k of S.kids){
    if(svc('nanny')) k.happy=clamp((k.happy||60)+6*dtMin/1440,0,95);
    else k.happy=clamp((k.happy||60)-10*dtMin/1440,0,100); }
  // each new day: everyone ages, town turns over
  const today=Math.floor(S.minutes/1440)+1;
  if(today>(S.lastDay||today)){ const days=today-S.lastDay; S.lastDay=today; ageEveryone(days); townDayEvents(); }
}
function ageEveryone(days){
  const inc=AGE_PER_DAY*days;
  S.age=(S.age||START_AGE)+inc;
  for(const m of (S.members||[])) m.age=(m.age||START_AGE)+inc;
  const grown=[];
  for(const k of (S.kids||[])){ const before=k.age||0; k.age=before+inc;
    if(before<CHILD_AGE&&k.age>=CHILD_AGE){ toast('🎂 '+k.name+' is a child now! 🧒'); SFX.level(); }
    if(before<TEEN_AGE&&k.age>=TEEN_AGE){ toast('🎂 '+k.name+' is a teen now! 🧑'); SFX.level(); }
    if(k.age>=ADULT_AGE) grown.push(k);
  }
  for(const k of grown){ S.kids=S.kids.filter(x=>x!==k);
    const mem=makeMember({name:k.name,skin:S.skin,shirt:k.shirt||'#7fc1e0',hair:S.hair,style:0,gender:k.gender||'nb'},'Child',k.age);
    mem.tid=k.tid; S.members.push(mem);
    toast('🎓 '+k.name+' grew up! Live as them anytime — 👪 Life › Family.'); SFX.good();
  }
  if(scene&&(scene.type==='home'||scene.type==='vacation')) buildHomies();
  checkDeaths();
}
function checkDeaths(){
  for(const m of (S.members||[]).slice()){
    if(m.age>=m.lifespan || (m.age>=70 && Math.random()<0.04)){
      S.members=S.members.filter(x=>x!==m);
      if(m.tid) treeKill(m.tid);
      if(m.role==='Partner') S.partner=null;
      toast('🕯️ '+m.name+' passed away at '+Math.floor(m.age)+'. Rest well.');
      if(scene&&(scene.type==='home'||scene.type==='vacation')) buildHomies();
    }
  }
  if(!S._ending && (S.age>=S.lifespan || (S.age>=70 && Math.random()<0.045))){ S._ending=true; setTimeout(endOfLife,400); }
}
function trackPeak(){ if(!S.stats) S.stats={}; S.stats.peakCoins=Math.max(S.stats.peakCoins||0, Math.floor(S.coins)); }
function endOfLife(){
  paused=true; closeSheet();
  const heirs=(S.members||[]).filter(m=>m.age>=TEEN_AGE);
  let body=`<div class="lvlCard" style="max-width:340px">`
    +`<div class="lvlRing" style="background:radial-gradient(circle,#6c5a8a,#3a2f55)">🕯️</div>`
    +`<h2>${S.name}'s time has come</h2>`
    +`<div class="lvlPerk">Lived to ${Math.floor(S.age)} · the ${S.surname} family, gen ${S.generation}</div>`
    +`<div class="lvlReward" style="font-size:13px;color:#bdb6d6;font-weight:500;margin:6px 0 12px">Every life ends. How will this one be remembered?</div>`;
  if(heirs.length){
    body+=`<div style="font-size:12px;color:#bdb6d6;margin-bottom:6px">Carry on through your lineage:</div>`;
    heirs.forEach(h=>{ body+=`<button class="bigbtn" style="margin-top:8px;background:linear-gradient(135deg,#7a5bd6,#5b6bd6);color:#fff" data-eol="reborn_${h.mid}">🌱 Live on as ${h.name} (${Math.floor(h.age)}, ${h.role})</button>`; });
  }
  body+=`<button class="bigbtn" style="margin-top:10px" data-eol="passon">🕊️ Pass on — see the family's 100-year legacy</button>`;
  body+=`</div>`;
  const ov=el('levelOverlay'); ov.innerHTML=body; ov.classList.add('show');
  ov.querySelectorAll('[data-eol]').forEach(b=>{ b.onclick=()=>{ const a=b.dataset.eol;
    if(a==='passon') passOn(); else rebirth(a.slice(7)); }; });
}
function rebirth(mid){
  const idx=(S.members||[]).findIndex(m=>m.mid===mid); if(idx<0){ passOn(); return; }
  const heir=S.members[idx];
  treeKill(S.tid);   // the sim you were playing has passed
  for(const f of PERSONAL){ if(heir[f]!==undefined) S[f]=heir[f]; }
  S.mid=heir.mid; S.role='You'; if(heir.tid) S.tid=heir.tid; S.members.splice(idx,1);
  S.generation=(S.generation||1)+1; S._ending=false;
  S.coins=(S.coins||0)+800;   // a modest inheritance
  buildNeedsUI(); if(scene&&(scene.type==='home'||scene.type==='vacation')) buildHomies();
  el('levelOverlay').classList.remove('show'); paused=false; updateHUDNow(); save();
  SFX.level(); burst(vw/2,vh/3,'confetti');
  toast('🌱 The '+S.surname+' line lives on — you now play as '+S.name+', generation '+S.generation+'.');
}
function legacyStory(){
  const peak=Math.max((S.stats&&S.stats.peakCoins)||0, Math.floor(S.coins||0));
  const friends=Object.values(S.rels||{}).filter(r=>r.rel>=50).length;
  const kidsCount=(S.kids||[]).length + (S.members||[]).filter(m=>m.role==='Child').length;
  let score=Math.min(40,peak/250)+Math.min(22,(S.level||1)*1.2)+kidsCount*6+friends*4;
  if(S.partner) score+=10; if(S.degree) score+=6; if(S.business&&S.business.level>=3) score+=10;
  const tier= score>=70?'great':score>=45?'good':score>=22?'okay':'hard';
  const wealth= peak>8000?'amassed a small fortune':peak>2500?'lived comfortably':peak>800?'made ends meet':'scraped by';
  const work= S.business?('built '+((BUSINESSES.find(b=>b.id===S.business.id)||{}).name||'a business')+' into a name people knew'):
              S.career?('rose to become a '+jobTitle().replace('🎓 ','')):'never quite settled on a calling';
  const love= S.partner?('shared a life with '+((npcDef(S.partner)||{}).name||'a sweetheart')):'walked their own path';
  const family= kidsCount?('raised '+kidsCount+' child'+(kidsCount>1?'ren':'')):'had no children';
  const d=LEGACY_DESCENDANTS[tier], pick=()=>d[Math.floor(Math.random()*d.length)];
  return { tier, lines:[
    `${S.name} ${S.surname} lived to ${Math.floor(S.age)}, and ${wealth}.`,
    `They ${work}, ${love}, and ${family}.`,
    `Over the next 100 years, the ${S.surname} family ${pick()}, ${pick()}, and ${pick()}.`,
    tier==='great'?'A legacy the whole town would remember. 🌟':tier==='good'?'A good life, warmly remembered. 🌳':tier==='okay'?'An ordinary life, quietly treasured. 🕊️':'A hard road — but the family endured. 🕯️',
  ]};
}
function passOn(){
  const st=legacyStory();
  const body=`<div class="lvlCard ${st.tier==='great'?'milestone':''}" style="max-width:350px">`
    +`<div class="lvlRing" style="background:radial-gradient(circle,#caa15e,#6c5a2f)">📜</div>`
    +`<h2>The ${S.surname} Legacy</h2>`
    +st.lines.map(l=>`<div style="font-size:13.5px;line-height:1.5;color:#e6e1f5;margin:8px 4px">${l}</div>`).join('')
    +`<button class="bigbtn" style="margin-top:16px" data-eol2="new">🌱 Begin a new life</button>`
    +`</div>`;
  const ov=el('levelOverlay'); ov.innerHTML=body; ov.classList.add('show');
  burst(vw/2,vh/3, st.tier==='great'?'confetti':'spark');
  ov.querySelector('[data-eol2]').onclick=()=>{ el('levelOverlay').classList.remove('show'); paused=false; newLifeSameProfile(); };
}
function newLifeSameProfile(){ S=null; showCreate(true); }
function townDayEvents(){
  const ALL=NPCS.concat(ARRIVAL_NAMES).map(n=>n.id);
  // a departure (never your partner, never close friends ≥80❤)
  if(Math.random()<0.18){
    const leavers=(S.present||[]).filter(id=>id!==S.partner && !((S.rels[id]||{}).rel>=80));
    if(leavers.length>2){
      const id=leavers[Math.floor(Math.random()*leavers.length)];
      S.present=S.present.filter(x=>x!==id);
      const reason=MOVE_REASONS[Math.floor(Math.random()*MOVE_REASONS.length)];
      S.movedAway[id]=reason;
      if(scene&&scene.type==='town') buildTown();
      toast('👋 '+(npcDef(id)||{}).name+' moved away '+reason);
    }
  }
  // an arrival (someone new, or a return)
  if(Math.random()<0.28){
    const away=ALL.filter(id=>(S.present||[]).indexOf(id)<0);
    if(away.length){
      const id=away[Math.floor(Math.random()*away.length)];
      S.present=(S.present||[]).concat(id);
      const returning=!!S.movedAway[id]; delete S.movedAway[id];
      if(scene&&scene.type==='town') buildTown();
      const d=npcDef(id);
      toast((returning?'🏡 '+d.name+' moved back to town!':'🎉 '+d.name+' just moved to town! Say hi 👋'));
    }
  }
}
function applyFx(fx){ for(const k in fx){ if(k in S.needs) S.needs[k]=clamp(S.needs[k]+fx[k],0,100); } }
function finishAction(){ if(action&&action.returnPx){ S.px=action.returnPx[0]; S.py=action.returnPx[1]; }
  if(action&&action.done) action.done(); action=null; }
function wakeUp(){ finishAction(); SFX.good(); qprogress('sleep'); toast('☀️ '+S.name+' woke up refreshed'); addXP(10); }

function moveSim(dt){
  if(!path.length){ if(pending){ const fn=pending; pending=null; fn(); } return; }
  const baseSp=T*3.6*({sporty:1.15, skirt:1.10, romper:1.05}[S.outfit]||1);
  const vmult=(scene.type==='town'&&S.vehicle)?({bike:1.6,car:2.2,limo:2.6}[S.vehicle]||1):1;
  const sp=baseSp*(speed>1?1.5:1)*vmult;
  let dist=sp*dt;
  while(dist>0&&path.length){
    const tnode=path[0]; const dx=tnode.x-S.px, dy=tnode.y-S.py, d=Math.hypot(dx,dy);
    if(Math.abs(dx)>Math.abs(dy)) facing=dx>0?'E':'W'; else facing=dy>0?'S':'N';
    if(d<=dist){ S.px=tnode.x; S.py=tnode.y; path.shift(); dist-=d; checkTrigger(); }
    else { S.px+=dx/d*dist; S.py+=dy/d*dist; dist=0; }
  }
  walkT+=dt*11;
  const now=performance.now(); if(path.length&&now-lastFootEvt>220){ lastFootEvt=now; blip(180,0.03,'square',0.015); }
}
function checkTrigger(){
  const [c,r]=curTile(); const door=scene.doors.get(c+','+r);
  if(door==='town'){ gotoScene('town', TOWN_SPAWN); }
  else if(door==='home'){ gotoScene('home', homeDef().spawn); }
}

/* ----- NPC town AI ----- */
function tickNPCs(dt){
  if(scene.type!=='town') return;
  for(const n of npcSprites){
    if(n.tpath.length){
      let dist=T*1.3*dt;
      while(dist>0&&n.tpath.length){ const t=n.tpath[0]; const dx=t.x-n.px,dy=t.y-n.py,d=Math.hypot(dx,dy);
        if(Math.abs(dx)>Math.abs(dy)) n.dir=dx>0?'E':'W'; else n.dir=dy>0?'S':'N';
        if(d<=dist){ n.px=t.x; n.py=t.y; n.tpath.shift(); dist-=d; } else { n.px+=dx/d*dist; n.py+=dy/d*dist; dist=0; } }
      n.wt+=dt*9;
    } else { n.cool-=dt;
      if(n.cool<=0){ n.cool=4+Math.random()*5;
        const a=n.anchor||n.def.anchor; const tc=clamp(a[0]+Math.round((Math.random()-.5)*3),1,scene.cols-2), tr=clamp(a[1]+Math.round((Math.random()-.5)*3),1,scene.rows-2);
        const p=findPath(Math.floor(n.px/T),Math.floor(n.py/T),tc,tr); if(p&&p.length) n.tpath=p;
      } }
  }
}

/* ============================================================ */
/*                  INTERACTIONS (sheets)                       */
/* ============================================================ */
const sheetWrap=el('sheetWrap'), sheet=el('sheet');
el('sheetBack').addEventListener('click',closeSheet);
function openSheet(html){ sheet.innerHTML=html; sheetWrap.classList.add('show'); paused=true; }
function closeSheet(){ sheetWrap.classList.remove('show'); sheet.innerHTML=''; paused=false; }
function sheetHead(icon,title,sub){ return `<div class="shead"><div class="bigico">${icon}</div><div><h3>${title}</h3><p>${sub||''}</p></div></div>`; }
function item(icon,title,sub,right,attrs){ return `<button class="sheetitem" ${attrs||''}><span class="si">${icon}</span><span class="st"><b>${title}</b>${sub?`<span>${sub}</span>`:''}</span>${right?`<span class="cost ${right.owned?'owned':''}">${right.txt}</span>`:''}</button>`; }

let sheetActions={};   // id -> fn
function bindSheet(){ sheet.querySelectorAll('[data-a]').forEach(b=>{ b.onclick=()=>{ const f=sheetActions[b.dataset.a]; if(f) f(b); }; }); }

function objSpot(o){
  // first walkable tile adjacent to ANY tile of the object's footprint (below preferred)
  const tiles=o.meta.fp.map(([dx,dy])=>[o.c+dx,o.r+dy]);
  const own=new Set(tiles.map(t=>t[0]+','+t[1]));
  for(const [dc,dr] of [[0,1],[1,0],[-1,0],[0,-1]]){
    for(const [tc,tr] of tiles){
      const nc=tc+dc, nr=tr+dr;
      if(own.has(nc+','+nr)) continue;
      if(walkable(nc,nr)) return [nc,nr];
    }
  }
  return null;
}
function goToObj(o,then){
  const sp=objSpot(o);
  if(!sp){ toast("Can't get to it 🚧"); SFX.err(); return false; }
  return goTo(sp[0],sp[1],then);
}
function tapObject(o){
  SFX.tap();
  const key=o.c+','+o.r;
  goToObj(o, ()=>showObjectSheet(o,key));
}
function startTimed(o,key,kind,icon,label,fx,dur,onDone){
  // move sim onto an interaction pose (stand at adj tile already)
  action={objKey:key, kind, icon, label, fx, total:dur, left:dur, returnPx:null, done:onDone};
  closeSheet(); toast(label+'…');
}
/* ----- hired services (Wave 6) ----- */
function svcLeft(until){ const m=Math.max(0,until-S.minutes); const d=Math.floor(m/1440), h=Math.floor((m%1440)/60); return d>0?(d+'d'+(h?(' '+h+'h'):'')):(h+'h'); }
function showServices(){
  sheetActions={};
  let body=sheetHead('🛎️',SERVICE_ORG,'Hire help for the household — they only show up while on the clock. 💼');
  SERVICES.forEach(sv=>{ const active=svc(sv.id);
    const status=active?('on duty · '+svcLeft(S.services[sv.id])+' left'):sv.blurb;
    body+=item(sv.icon, sv.role, status, active?{txt:'✓ hired',owned:true}:{txt:SERVICE_DAY+'💰/day'}, `data-a="${sv.id}"`);
    sheetActions[sv.id]=()=>showServiceHire(sv.id);
  });
  body+=item('🌟','Hire all three','The full staff together — '+SERVICE_BUNDLE_DAY+'💰/day (save vs separate)',{txt:'best deal'},'data-a="bundle"');
  sheetActions.bundle=()=>showServiceHire('bundle');
  body+=item('✖️','Close','',null,'data-a="x"'); sheetActions.x=closeSheet;
  openSheet(body); bindSheet();
}
function showServiceHire(id){
  sheetActions={};
  const isBundle=id==='bundle'; const sv=isBundle?null:SERVICES.find(s=>s.id===id);
  let body=sheetHead(isBundle?'🌟':sv.icon, isBundle?'Full staff (all three)':sv.role, isBundle?'Nanny + Chef + Maid, contracted together':sv.blurb);
  SERVICE_TERMS.forEach(term=>{ const cost=serviceCost(id,term.id); const idk='t_'+term.id;
    body+=item('🗓️', term.label, term.disc?('save '+Math.round(term.disc*100)+'%'):'pay as you go', {txt:cost+'💰'}, `data-a="${idk}"`);
    sheetActions[idk]=()=>hireService(id,term.id);
  });
  body+=item('↩️','Back','',null,'data-a="back"'); sheetActions.back=()=>showServices();
  openSheet(body); bindSheet();
}
function hireService(id, termId){
  const cost=serviceCost(id,termId); const term=SERVICE_TERMS.find(t=>t.id===termId);
  if(!spend(cost)) return;
  const targets=id==='bundle'?['nanny','chef','maid']:[id]; const ext=term.days*1440;
  for(const t of targets){ S.services[t]=Math.max(S.minutes, S.services[t]||0)+ext; }
  if(scene&&scene.type==='home') buildHomies();
  SFX.coin(); burst(S.px-cam.x,S.py-cam.y-30,'coin','-'+cost+'💰'); addXP(10);
  const who=id==='bundle'?'the full staff':SERVICES.find(s=>s.id===id).role;
  toast('🛎️ Hired '+who+' for '+term.label+'!'); qprogress('service');
  closeSheet(); updateHUDNow(); save();
}
function showServiceWorker(id){
  const sv=SERVICES.find(s=>s.id===id); if(!sv){ closeSheet(); return; }
  sheetActions={};
  const left=svc(id)?(svcLeft(S.services[id])+' left'):'off duty';
  let body=sheetHead(sv.icon, sv.role+' · '+SERVICE_ORG, sv.blurb+' · '+left);
  const add=(icon,title,sub,k,fn)=>{ body+=item(icon,title,sub,null,`data-a="${k}"`); sheetActions[k]=fn; };
  add('🙏','Thank them','A little gratitude · +fun','tx',()=>{ S.needs.fun=clamp(S.needs.fun+8,0,100); burst(S.px-cam.x,S.py-cam.y-28,'heart'); SFX.good(); closeSheet(); toast('🙏 '+sv.role+' appreciates it!'); });
  add('🗓️','Extend / manage','Hire more time','mx',()=>showServiceHire(id));
  add('✖️','Close','','x',closeSheet);
  openSheet(body); bindSheet();
}
function showObjectSheet(o,key){
  const t=o.t, m=o.meta;
  sheetActions={};
  let body=sheetHead(m.icon,m.name,m.desc);
  const add=(icon,title,sub,id,fn,right,dis)=>{ body+=item(icon,title,sub,right,`data-a="${id}"${dis?' disabled':''}`); sheetActions[id]=fn; };

  if(t==='fridge'||t==='stove'||t==='counter'){
    body+=`<p style="font-size:11px;color:#bdb6d6;margin:6px 2px">Pick a meal — pricier food fills more 🍗</p>`;
    FOODS_HOME.forEach((f,i)=>{ add(f.icon,f.name,(f.cost?f.cost+'💰 · ':'')+'+'+f.hunger+' hunger',
      'food'+i,()=>eatFood(o,key,f,false),{txt:f.cost?f.cost+'💰':'free'}); });
  } else if(t==='toilet'){ add('🚽','Use toilet','+bladder','x',()=>doAct(o,key,'🚽','Relieved',{bladder:95},10,()=>qprogress('clean',0))); }
  else if(t==='shower'){ const bl=S.homeLv?S.homeLv.bath:0;
    add('🚿','Take a shower','+hygiene'+(bl?' +fun (spa!)':''),'x',()=>doAct(o,key,'🚿','Showering',{hygiene:80+bl*10,fun:3+bl*7},22,()=>qprogress('clean'))); }
  else if(t==='tub'){ const bl=S.homeLv?S.homeLv.bath:0;
    add('🛁','Bubble bath','+hygiene +fun (slow & lovely)','x',()=>doAct(o,key,'🛁','Soaking',{hygiene:92+bl*4,fun:18+bl*8,energy:6},40,()=>qprogress('clean'))); }
  else if(t==='sink'){ add('🫧','Wash up','quick +hygiene','x',()=>doAct(o,key,'🫧','Washing',{hygiene:30},6,()=>qprogress('clean'))); }
  else if(t==='bed2'){
    add('😴','Sleep till morning','Full energy, new day','s',()=>sleep(o,key,true));
    add('💤','Quick nap','+35 energy','n',()=>sleep(o,key,false));
    if(S.partner){
      add('💞','Cuddle','+fun +social','c',()=>doAct(o,key,'💞','Cuddling',{fun:18,social:22},18,()=>{ rel(S.partner,4); }));
      add('🌹','WooHoo','Adults only 🫣 · +fun +social +❤','w2',()=>startWoohoo(o,key));
    }
  }
  else if(t==='kidbed'||t==='crib'){
    const baby=(S.kids||[]).find(k=>(k.age||0)<CHILD_AGE);
    if(baby){
      add('👋','Peekaboo!','Instant giggles 😄','pk',()=>babyPlay(baby,'👋','Peekaboo',{fun:18,social:8},['😄 giggles!','🤭 hee hee!','✨ pure delight!']));
      add('🤗','Tickle','Squeals of joy','tk',()=>babyPlay(baby,'🤗','Tickle time',{fun:20,social:6},['😆 squeals!','🥰 so happy!','😁 more, more!']));
      add('🎵','Sing a lullaby','Cozy & calm · +social','lb',()=>babyPlay(baby,'🎵','Lullaby',{social:20,fun:8,energy:5},['😴 soothed','🥱 so cozy','💜 content']));
      add('🍼','Feed the baby','Full tummy, happy baby','fd',()=>babyPlay(baby,'🍼','Feeding',{social:12,fun:8},['😋 yum yum!','🍼 all gone!','😊 satisfied']));
    } else if(S.kids&&S.kids.length){ add('🧸','Play with kid','+fun, makes them happy','p',()=>kidPlay(o,key)); add('📖','Read a bedtime story','+social +fun','r',()=>doAct(o,key,'📖','Story time',{fun:14,social:16},18,()=>{ qprogress('kidplay'); })); }
    else add('🛒','No child yet','Start a family first (👪)','x',()=>{ closeSheet(); openFamily(); });
  }
  else if(t==='tv2'||t==='tv3'){
    const eff=Math.min(2,(t==='tv3'?1:0)+(S.homeLv?S.homeLv.tv:0));
    const tvFun=[28,44,62][eff], tvDur=[60,50,45][eff];
    add('📺','Watch TV','+'+tvFun+' fun','w',()=>doAct(o,key,'📺','Watching TV',{fun:tvFun,energy:6},tvDur,()=>{ qprogress('tv'); }));
    if(S.partner||(S.kids&&S.kids.length)) add('🍿','Family movie night','+fun +social for all','f',()=>doAct(o,key,'🍿','Movie night',{fun:50+eff*6,social:30,energy:4},55,()=>{ if(S.partner) rel(S.partner,3); qprogress('tv'); }));
  }
  else if(t==='sofa2'||t==='sofa3'){ add('🛋️','Relax','+fun +a little energy','x',()=>doAct(o,key,'🛋️','Relaxing',{fun:20,energy:10},30)); }
  else if(t==='computer'){
    add('🌐','Browse the web','+fun','b',()=>doAct(o,key,'💻','Browsing',{fun:24,social:10},35));
    add('💼','Freelance gig','Earn 40–90💰 (costs energy & time)','g',()=>gig(o,key));
    add('📹','Video call a friend','+social','v',()=>doAct(o,key,'📹','Video call',{social:40,fun:8},25,()=>qprogress('social')));
  }
  else if(t==='phone'){ add('📞','Call a friend','+social','x',()=>doAct(o,key,'📞','Calling',{social:48},22,()=>qprogress('social')));
    add('🛎️','Hire household help',SERVICE_ORG,'svc',()=>{ closeSheet(); showServices(); }); }
  else if(t==='bookshelf'||t==='bookshelf1'){ add('📖','Read a book','+fun, calm','x',()=>doAct(o,key,'📖','Reading',{fun:22,energy:-2},40)); }
  else if(t==='toybox'){ add('🪀','Play around','+fun','x',()=>doAct(o,key,'🪀','Playing',{fun:26},20, ()=>{ if(S.kids&&S.kids.length) qprogress('kidplay'); })); }
  else if(t==='treadmill'){ const tr=S.career==='trainer';
    add('🏃','Work out',(tr?'2× gains (Trainer!) · ':'')+'+fun, fitness','x',()=>doAct(o,key,'🏃','Running',{fun:tr?36:18,energy:-14,hygiene:-12},30,()=>{ qprogress('fit'); addXP(tr?16:8); })); }
  else if(t==='espresso'){ const ba=S.career==='barista';
    add('☕','Pull a shot','5💰 · +'+(ba?60:30)+' energy'+(ba?' (Barista!)':''),'x',()=>{ if(!spend(5)) return; doAct(o,key,'☕','Espresso',{energy:ba?60:30,fun:4},8,()=>{ qprogress('coffee'); }); }); }
  else if(t==='table2'){ add('🍽️','Sit & eat','+social if family is home','x',()=>doAct(o,key,'🍽️','Dining',{social:20,fun:8},20,()=>{ if(S.partner) rel(S.partner,2); })); }
  else if(t==='fountain'){ add('🪙','Make a wish','Toss 1💰 for luck','x',()=>{ if(!spend(1)) return; closeSheet(); burst(S.px-cam.x,S.py-cam.y-20,'spark'); SFX.coin(); toast('🪙 You made a wish ✨'); S.needs.fun=clamp(S.needs.fun+10,0,100); qprogress('fountain'); addXP(8); }); }
  else if(t==='picnic'){ add('🧺','Have a picnic','+fun +social, relaxing','p',()=>doAct(o,key,'🧺','Picnicking',{fun:24,social:16,hunger:14},25,()=>{ qprogress('activity'); }));
    add('☀️','Sunbathe','+fun, recharge a little','s',()=>doAct(o,key,'😎','Sunbathing',{fun:16,energy:8},20)); }
  else if(t==='bench'){ add('🪑','Rest a while','+energy +fun','x',()=>doAct(o,key,'😌','Resting',{energy:18,fun:8},18,()=>{ qprogress('activity'); })); }
  else if(t==='treasure'){ const got=(S.vacay&&(S.vacay.found||[]).indexOf(key)>=0);
    if(got) add('✓','Already found','You dug this one up','x',()=>{ closeSheet(); });
    else add('⛏️','Dig it up!','Something glints in the sand…','x',()=>collectTreasure(o,key)); }
  else if(t==='excursion'){ const ex=(scene.vac.excursions||[]).find(e=>e.id===o.ex)||{};
    add(ex.icon||'🎟️','Book: '+(ex.name||'Excursion'), (ex.price||0)+'💰 · +'+(ex.fun||0)+' fun'+(ex.energy?' '+(ex.energy>0?'+':'')+ex.energy+' energy':''),'x',()=>doExcursion(o,key)); }
  else if(t==='return'){ add('✈️','Fly home','Head back, rested & happy','x',()=>{ closeSheet(); flyHome(); }); }
  else if(t==='rental'){
    add('😴','Sleep here','Full energy at your rental','s',()=>sleep(o,key,true));
    add('🚿','Freshen up','+hygiene','f',()=>doAct(o,key,'🚿','Freshening up',{hygiene:80},20));
    add('🛋️','Relax inside','+fun +energy','r',()=>doAct(o,key,'🛋️','Relaxing',{fun:20,energy:12},22)); }
  else if(t==='lounger'||t==='cabana'){ add('🌞','Soak up the sun','+fun +energy, pure bliss','x',()=>doAct(o,key,'😎','Lounging',{fun:24,energy:14},25)); }
  else if(t==='tiki'){ add('🍹','Order a drink','12💰 · +fun +social','x',()=>{ if(!spend(12)) return; doAct(o,key,'🍹','Sipping a cocktail',{fun:22,social:12},18); }); }
  else if(t==='campfire'){ add('🔥','Warm up by the fire','+fun +social','x',()=>doAct(o,key,'🔥','By the campfire',{fun:20,social:16},20)); }
  else if(t==='palm'||t==='ruins'){ add(m.icon,'Take it in',m.desc,'x',()=>{ closeSheet(); S.needs.fun=clamp(S.needs.fun+8,0,100); toast(m.icon+' '+m.desc); }); }
  else { add(m.icon,'Inspect',m.desc,'x',()=>{ closeSheet(); S.needs.fun=clamp(S.needs.fun+4,0,100); toast(m.icon+' '+m.desc); }); }

  add('✖️','Close','','close',closeSheet);
  openSheet(body); bindSheet();
}
function doAct(o,key,icon,label,fx,dur,onDone){
  // ensure standing adjacent (we already pathed there)
  action={objKey:key, kind:'timed', icon, label, fx, total:dur, left:dur, done:()=>{ burstNeeds(fx); if(onDone) onDone(); }};
  closeSheet(); SFX.tap();
}
function burstNeeds(fx){ let txt=[]; for(const k in fx){ if(fx[k]>0) txt.push('+'+fx[k]+' '+(NEEDS.find(n=>n.k===k)||{ic:''}).ic); }
  if(txt.length) burst(S.px-cam.x,S.py-cam.y-34,'spark',txt[0]); }
function eatFood(o,key,f,diner){
  const kLv=S.homeLv?S.homeLv.kitchen:0;
  let cost=f.cost;
  if(!diner&&kLv>=2) cost=Math.round(cost*0.8);          // gourmet kitchen discount
  if(cost&&!spend(cost)) return;
  const fx={hunger:f.hunger, fun:f.fun||0}; if(f.energy) fx.energy=f.energy; if(f.social) fx.social=f.social;
  if(!diner){
    const mult=1+(kLv>=2?0.5:kLv>=1?0.25:0)+(S.career==='chef'?0.3:0);   // kitchen tier + chef career
    if(mult>1){ fx.hunger=Math.min(100,Math.round(fx.hunger*mult)); fx.fun+=4; }
  }
  if(S.career==='barista'&&fx.energy) fx.energy*=2;       // barista: coffee hits different
  action={objKey:key, kind:'timed', icon:f.icon, label:'Eating '+f.name, fx, total:f.dur, left:f.dur,
    done:()=>{ burst(S.px-cam.x,S.py-cam.y-34,'spark','+'+fx.hunger+'🍗'); SFX.eat(); S.stats.eat=(S.stats.eat||0)+1; qprogress('eat'); addXP(5); } };
  closeSheet();
}
function sleep(o,key,untilMorning){
  const wakeAt=(Math.floor(S.minutes/1440)+1)*1440+7*60;
  action={objKey:key, kind:'sleep', icon:'😴', untilMorning, wakeAt, total:1, left:1};
  if(!untilMorning){ action.kind='timed'; action.icon='💤'; action.fx={energy:35}; action.total=20; action.left=20; action.done=()=>burstNeeds({energy:35}); }
  closeSheet();
}
function gig(o,key){
  if(S.needs.energy<15){ toast('Too tired for a gig ⚡'); SFX.err(); return; }
  action={objKey:key, kind:'timed', icon:'💻', label:'Freelancing', fx:{energy:-18,fun:-4,social:-3}, total:45, left:45,
    done:()=>{ let pay=40+Math.floor(Math.random()*50)+S.level*8; if(S.career==='techie') pay*=2;
      addCoins(pay); burst(S.px-cam.x,S.py-cam.y-30,'coin','+'+pay+'💰'); SFX.coin(); qprogress('gig'); addXP(20); toast('💻 Gig done! +'+pay+'💰'+(S.career==='techie'?' (pro rate 💻)':'')); } };
  closeSheet();
}
function kidPlay(o,key){
  action={objKey:key, kind:'timed', icon:'🧸', label:'Playing with kid', fx:{fun:24,social:18,energy:-6}, total:22, left:22,
    done:()=>{ burst(S.px-cam.x,S.py-cam.y-30,'heart'); SFX.heart(); const k=S.kids[0]; if(k) k.happy=clamp((k.happy||50)+20,0,100); qprogress('kidplay'); addXP(15); toast('🧸 '+(S.kids[0]?S.kids[0].name:'Your kid')+' had a blast!'); } };
  closeSheet();
}
function babyPlay(baby,icon,label,fx,lines){
  action={kind:'timed',icon,label:label+' with '+baby.name,fx,total:13,left:13,
    done:()=>{ baby.happy=clamp((baby.happy||60)+24,0,100); babyGiggle=performance.now();
      burst(S.px-cam.x,S.py-cam.y-30,'heart'); burst(S.px-cam.x,S.py-cam.y-46,'confetti');
      const crib=findFurn('crib'); if(crib){ for(let i=0;i<5;i++) parts.push({x:(crib.c+.5)*T-cam.x+(Math.random()-.5)*20,y:crib.r*T-cam.y-2,vx:(Math.random()-.5)*14,vy:-26-Math.random()*14,life:1.1,t:'heart'}); }
      SFX.heart(); qprogress('kidplay'); addXP(12);
      toast(icon+' '+baby.name+': '+lines[Math.floor(Math.random()*lines.length)]); }};
  closeSheet();
}
function findFurn(t){ for(const [k,o] of scene.furnAt){ if(o.t===t) return o; } return null; }
function startWoohoo(){
  if(!S.partner) return;
  if(scene.type!=='home'){ toast('Take it home, lovebirds 🫣'); SFX.err(); closeSheet(); return; }
  const bed=findFurn('bed2'); if(!bed){ toast('You need a bed for that 🛏️'); SFX.err(); return; }
  closeSheet();
  goToObj(bed,()=>{
    action={kind:'timed', woo:true, icon:'🌹', label:'WooHoo',
      fx:{fun:35,social:30,energy:-10}, total:25, left:25,
      bedX:bed.c*T, bedY:bed.r*T, returnPx:[S.px,S.py],
      done:()=>{ rel(S.partner,10);
        burst(S.px-cam.x,S.py-cam.y-30,'heart'); burst(S.px-cam.x,S.py-cam.y-44,'confetti'); SFX.heart();
        qprogress('woohoo'); addXP(20);
        const lines=['🌹 That was magical…','😏 WooHoo!','💞 Sparks flew!','🫣 Well then!'];
        toast(lines[Math.floor(Math.random()*lines.length)]); } };
    S.px=bed.c*T+T; S.py=bed.r*T+T;   // both vanish behind the censor mosaic
  });
}
function drawCensor(){
  const bx=action.bedX-cam.x, by=action.bedY-cam.y;
  const shake=Math.sin(performance.now()/70)*1.4;
  const cell=11, n=Math.ceil(2*T/cell);
  const tp=Math.floor(performance.now()/130);
  const pal=['#f6b6c9','#e8a3b8','#d98aa6','#f3c6d4','#caa0b8'];
  for(let i=0;i<n;i++) for(let j=0;j<n;j++){
    const hh=hash(i*7+tp, j*13+tp*3);
    ctx.fillStyle=pal[Math.floor(hh*pal.length)%pal.length];
    ctx.fillRect(bx+shake+i*cell, by+j*cell, cell-1, cell-1);
  }
  ctx.strokeStyle=COL.outline; ctx.lineWidth=2; ctx.strokeRect(bx+shake,by,2*T,2*T);
  if(Math.random()<0.07) parts.push({x:bx+T+(Math.random()-.5)*34,y:by+4,vx:(Math.random()-.5)*16,vy:-34,life:1.2,t:'heart'});
  rr(bx+T-36,by-26,72,16,6,'rgba(255,255,255,.95)');
  ctx.fillStyle='#3b3347'; ctx.font='700 9px -apple-system'; ctx.textAlign='center';
  ctx.fillText('🚪 Do not disturb',bx+T,by-15); ctx.textAlign='left';
  const pct=1-action.left/action.total;
  rr(bx+4,by+2*T+5,2*T-8,4,2,'rgba(0,0,0,.35)');
  rr(bx+4,by+2*T+5,(2*T-8)*Math.max(.03,pct),4,2,'#ff7fa3');
}
function showKidSheet(idx){
  const k=S.kids[idx]; if(!k) return;
  sheetActions={};
  const stage=(k.age||0)>=TEEN_AGE?'Teen':'Child';
  const eduTag = k.graduated?' · 🎓 graduated':(k.grade?' · grade '+k.grade+'/'+SCHOOL.grades:'');
  let body=sheetHead((k.age||0)>=TEEN_AGE?'🧑':'🧒', k.name, stage+' · Happy '+Math.round(k.happy||50)+'% · age '+Math.floor(k.age||0)+'y'+eduTag);
  const add=(icon,title,sub,id,fn)=>{ body+=item(icon,title,sub,null,`data-a="${id}"`); sheetActions[id]=fn; };
  if((k.age||0)>=CHILD_AGE && !k.graduated){
    add(k.atSchool?'⏳':'🏫', k.atSchool?'At school…':'Send to school', k.atSchool?'In class right now':'Grade '+(k.grade||0)+'/'+SCHOOL.grades+' · just like a job','sch',()=>{ closeSheet(); sendKidToSchool(idx); });
  }
  add('🥏','Play together','+fun for you both','p',()=>{
    action={kind:'timed',icon:'🥏',label:'Playing with '+k.name,fx:{fun:22,social:16,energy:-5},total:20,left:20,
      done:()=>{ k.happy=clamp((k.happy||50)+18,0,100); burst(S.px-cam.x,S.py-cam.y-30,'heart'); SFX.heart(); qprogress('kidplay'); addXP(14); toast('🥏 '+k.name+' loved it!'); }};
    closeSheet(); });
  add('✏️','Help with homework','+XP, +happiness','h',()=>{
    action={kind:'timed',icon:'✏️',label:'Homework with '+k.name,fx:{fun:4,social:10},total:18,left:18,
      done:()=>{ k.happy=clamp((k.happy||50)+8,0,100); addXP(22); SFX.good(); burst(S.px-cam.x,S.py-cam.y-30,'spark','💡'); toast('✏️ '+k.name+' aced it! +XP'); }};
    closeSheet(); });
  add('🙌','High five','instant joy','f',()=>{
    k.happy=clamp((k.happy||50)+6,0,100); burst(S.px-cam.x,S.py-cam.y-28,'spark','🙌'); SFX.good(); addXP(4); closeSheet(); });
  add('✖️','Close','','x',closeSheet);
  openSheet(body); bindSheet();
}

/* ----- NPC interaction ----- */
function rel(id,amt){
  if(!S.rels[id]) S.rels[id]={rel:0, met:true, romance:false};
  const before=S.rels[id].rel;
  S.rels[id].rel=clamp(S.rels[id].rel+amt,0,100);
  if(before<40&&S.rels[id].rel>=40) qprogress('rel40');
  const def=npcDef(id);
  if(def&&def.perk&&before<def.perkAt&&S.rels[id].rel>=def.perkAt){
    SFX.level(); burst(S.px-cam.x,S.py-cam.y-30,'confetti');
    toast('🎁 '+def.name+' perk unlocked: '+def.perkDesc+'!');
    qprogress('perkunlock');
  }
}
function npcDef(id){ return NPCS.find(n=>n.id===id) || ARRIVAL_NAMES.find(n=>n.id===id); }
function npcPresent(id){ return (S.present||NPCS.map(n=>n.id)).indexOf(id)>=0; }
function hasPerk(effectId){
  for(const n of NPCS){ if(n.perk===effectId){ const R=S.rels[n.id]; if(R&&R.rel>=n.perkAt&&npcPresent(n.id)) return true; } }
  return false;
}
function tapNPC(n){
  SFX.tap();
  n.tpath=[]; n.cool=6;   // make them wait while you walk over
  goNextTo(Math.floor(n.px/T),Math.floor(n.py/T), ()=>showNPCSheet(n.def.id));
}
function showNPCSheet(id){
  const def=npcDef(id); if(!def) return; if(!S.rels[id]) S.rels[id]={rel:0,met:true,romance:false};
  const R=S.rels[id]; sheetActions={};
  const isPartner=S.partner===id;
  const status=isPartner?'💞 Partner':R.rel>=75?'❤️ In love':R.rel>=50?'😊 Close friend':R.rel>=25?'🙂 Friend':'🤝 Acquaintance';
  let body=sheetHead('🧑','Talk to '+def.name, def.bio+' · '+status+' ('+Math.round(R.rel)+'❤)');
  if(def.job){
    const active=R.rel>=def.perkAt;
    body+=`<div style="background:${active?'rgba(94,224,122,.12)':'rgba(255,255,255,.05)'};border:1px solid ${active?'rgba(94,224,122,.35)':'rgba(255,255,255,.1)'};border-radius:12px;padding:9px 12px;margin:2px 0 4px;font-size:12px">`+
      `<b>${def.jobIcon} ${def.job}</b><br><span style="color:#bdb6d6">${active?'✅ Perk active: ':'🔒 At '+def.perkAt+'❤: '}${def.perkDesc}</span></div>`;
  }
  const add=(icon,title,sub,fn,dis)=>{ const idk='n'+Object.keys(sheetActions).length; body+=item(icon,title,sub,null,`data-a="${idk}"${dis?' disabled':''}`); sheetActions[idk]=fn; };

  add('💬','Chat','+social, +rel',()=>npcSocial(id,'chat',{social:18},6));
  add('😄','Tell a joke','+fun, +rel',()=>npcSocial(id,'joke',{fun:14,social:10},5));
  add('🙌','Compliment','+rel',()=>npcSocial(id,'compliment',{social:8},5));
  const hasGift=Object.values(S.gifts||{}).some(v=>v>0);
  add('🎁','Give a gift', hasGift?'Use a gift from your bag':'Buy gifts at the Mall 🛍️', ()=>giftPicker(id), !hasGift);
  if(!isPartner){
    if(!S.partner){   // romance only while single — keep it wholesome
      add('💘','Flirt', R.rel>=30?'Build romance':'Get closer first (30❤)', ()=>npcSocial(id,'flirt',{social:12,fun:8},6,true), R.rel<30);
      add('🌹','Ask on a date', R.rel>=50?'+lots of rel':'Need 50❤', ()=>npcDate(id), R.rel<50);
      const hasRing=(S.gifts&&S.gifts.ring>0);
      add('💍','Propose', R.rel>=75?(hasRing?'Become partners!':'Buy a 💍 ring first'):'Need 75❤ & a ring', ()=>propose(id), !(R.rel>=75&&hasRing));
    }
  } else {
    add('🤗','Hug','+social +rel',()=>npcSocial(id,'hug',{social:20,fun:6},5,true));
    add('🌹','WooHoo', scene.type==='home'?'Adults only 🫣 · +fun +social +❤':'Only at home 🏠', ()=>startWoohoo(), scene.type!=='home');
    add('🍼','Try for a baby', (S.kids&&S.kids.length>=4)?'House is full!':'Start/grow your family', ()=>tryBaby(id), S.kids&&S.kids.length>=4);
    add('💔','Break up','End the relationship',()=>breakup(id));
  }
  add('✖️','Close','',closeSheet);
  openSheet(body); bindSheet();
}
function npcSocial(id,kind,fx,dur,romantic){
  if(S.needs.energy<5){ toast('Too tired to socialize ⚡'); SFX.err(); return; }
  const def=npcDef(id);
  action={kind:'timed', icon:romantic?'💘':'💬', label:'With '+def.name, fx, total:dur, left:dur,
    done:()=>{ const amt=Math.round(((romantic?9:6) + (kind==='compliment'?2:0) + ({dress:2,gown:2,blouse:1}[S.outfit]||0))*socialMult()); rel(id, amt);
      if(romantic){ S.rels[id].romance=true; burst(S.px-cam.x,S.py-cam.y-30,'heart'); SFX.heart(); }
      else { burst(S.px-cam.x,S.py-cam.y-30,'spark', CHAT_LINES[Math.floor(Math.random()*CHAT_LINES.length)].split(' ').pop()); SFX.good(); }
      S.stats.social=(S.stats.social||0)+1; qprogress('social'); addXP(8);
      toast(def.name+': you '+CHAT_LINES[Math.floor(Math.random()*CHAT_LINES.length)]); } };
  closeSheet();
}
function npcDate(id){
  const def=npcDef(id);
  action={kind:'timed', icon:'🌹', label:'On a date with '+def.name, fx:{fun:30,social:35,energy:-6}, total:40, left:40,
    done:()=>{ rel(id,Math.round(18*socialMult())); S.rels[id].romance=true; burst(S.px-cam.x,S.py-cam.y-30,'heart'); SFX.heart(); addXP(20); toast('🌹 Lovely date with '+def.name+'!'); } };
  closeSheet();
}
function giftPicker(id){
  sheetActions={}; let body=sheetHead('🎁','Give a gift','Tap one from your bag');
  let any=false;
  GIFTS.forEach(g=>{ const have=(S.gifts&&S.gifts[g.id])||0; if(have<=0) return; any=true;
    const idk='g'+g.id; body+=item(g.icon,g.name,'x'+have+(g.rel?' · +'+g.rel+'❤':''),null,`data-a="${idk}"`);
    sheetActions[idk]=()=>{ S.gifts[g.id]--; if(g.id==='ring'){ closeSheet(); toast('Use 💍 via Propose 💍'); return; }
      rel(id,Math.round(g.rel*socialMult())); burst(S.px-cam.x,S.py-cam.y-30,'heart'); SFX.heart(); qprogress('gift'); addXP(12);
      toast(npcDef(id).name+' loved the '+g.name+'! +'+g.rel+'❤'); closeSheet(); }; });
  if(!any) body+=`<p style="color:#bdb6d6;font-size:12px;margin-top:8px">Your gift bag is empty. Buy some at 🛍️ Maple Mall.</p>`;
  body+=item('↩️','Back','','',`data-a="back"`); sheetActions.back=()=>showNPCSheet(id);
  openSheet(body); bindSheet();
}
function propose(id){
  if(!(S.gifts&&S.gifts.ring>0)){ toast('You need a 💍 ring (Mall)'); SFX.err(); return; }
  S.gifts.ring--; S.partner=id; S.rels[id].rel=Math.max(S.rels[id].rel,80); S.rels[id].romance=true;
  npcSprites=npcSprites.filter(sp=>sp.def.id!==id);   // they move in with you
  const pn=npcDef(id); if(!(S.members||[]).some(m=>m.role==='Partner')){ const mem=makeMember(pn,'Partner',S.age);
    mem.tid=treeAdd(pn.name, (treeNode(S.tid)||{}).gen||S.generation||1, []); S.members.push(mem); }
  buildHomies();
  burst(S.px-cam.x,S.py-cam.y-30,'confetti'); SFX.level(); qprogress('partner');
  addXP(60); toast('💍 '+pn.name+' said YES! They moved in 🏡💞'); closeSheet(); refreshLifeDot(); save();
}
function tryBaby(id){
  if(S.kids.length>=4){ toast('Your home is full!'); return; }
  if(S.homeTier<1){ toast('You need a bigger home for a baby — visit 🛍️ the Mall! 🏡'); SFX.err(); closeSheet(); return; }
  if(S.kids.some(k=>(k.age||0)<CHILD_AGE)){ toast('The crib is already busy 👶'); SFX.err(); return; }
  const def=KIDNAMES[Math.floor(Math.random()*KIDNAMES.length)];
  let name=(typeof prompt==='function') ? prompt('Name your baby:', def) : def;
  name=(name||def).trim().slice(0,12)||def;
  const spouse=(S.members||[]).find(m=>m.role==='Partner');
  const myGen=(treeNode(S.tid)||{}).gen||S.generation||1;
  const tid=treeAdd(name, myGen+1, [S.tid].concat(spouse&&spouse.tid?[spouse.tid]:[]));
  S.kids.push({name, tid, age:0, happy:60, grade:0, gender:Math.random()<0.5?'f':'m', shirt:SHIRTS[Math.floor(Math.random()*SHIRTS.length)]});
  buildHomies();
  burst(S.px-cam.x,S.py-cam.y-30,'confetti'); SFX.level();
  addXP(50); toast('👶 Welcome, '+name+'! Find them at home 🏠'); closeSheet(); refreshLifeDot(); save();
}
function breakup(id){ if(!confirm('Break up with '+npcDef(id).name+'?')) return;
  S.partner=null; S.members=(S.members||[]).filter(m=>m.role!=='Partner'); buildHomies();
  S.rels[id].rel=Math.max(0,S.rels[id].rel-30); S.rels[id].romance=false; toast('💔 You broke up.'); closeSheet(); save(); }

/* ----- buildings (town doors) ----- */
function enterBuilding(bid){
  SFX.tap(); const b=BUILDINGS.find(x=>x.id===bid);
  if(bid==='house'){ gotoScene('home', homeDef().spawn); return; }
  if(bid==='office'){ showWorkSheet(); return; }
  if(bid==='diner'){ showDiner(); return; }
  if(bid==='mall'){ openShop(); return; }
  if(bid==='gym'){ showGym(); return; }
  if(bid==='hospital'){ showHospital(); return; }
  if(bid==='university'){ showUniversity(); return; }
  if(bid==='school'){ showSchool(); return; }
  if(bid==='cinema'){ showActivity('🎬','Starlight Cinema','Catch a film — popcorn included 🍿',CINEMA_FILMS,'tv'); return; }
  if(bid==='arcade'){ showActivity('🕹️','Pixel Arcade','Blow off steam on the machines!',ARCADE_GAMES,'fit'); return; }
  if(bid==='library'){ showActivity('📚','Town Library','Free to browse. Quiet, please.',LIBRARY_BOOKS,null); return; }
  if(bid==='cafe'){ showActivity('☕','Cozy Cafe','Treats, drinks & good vibes.',CAFE_MENU,'coffee'); return; }
  if(bid==='travel'){ showTravelAgency(); return; }
  if(bid==='nb1'){ showNPCSheet('ava'); return; }
  if(bid==='nb2'){ showNPCSheet('noah'); return; }
}
/* ----- college ----- */
function showUniversity(){
  sheetActions={};
  let body=sheetHead('🎓','Maple University', COLLEGE.perk);
  if(S.degree){
    body+=`<p style="font-size:12px;color:#5ee07a;margin:6px 2px">🎓 You're a graduate! Your degree is boosting your career.</p>`;
  } else if(S.eduCredits>0 || S._enrolled){
    const done=S.eduCredits, total=COLLEGE.classes;
    body+=`<p style="font-size:12px;color:#bdb6d6;margin:6px 2px">Classes done: <b>${done}/${total}</b>. Attend the rest to graduate.</p>`;
    body+=item('📚','Attend a class','Builds toward your degree',null,'data-a="cls"');
    sheetActions.cls=()=>{ closeSheet(); attendClass(); };
  } else {
    body+=`<p style="font-size:12px;color:#bdb6d6;margin:6px 2px">${COLLEGE.desc} Enrollment: <b style="color:#ffd76a">${COLLEGE.enroll}💰</b>.</p>`;
    body+=item('✍️','Enroll now','then attend 4 classes',{txt:COLLEGE.enroll+'💰'},'data-a="enr"');
    sheetActions.enr=()=>{ if(!spend(COLLEGE.enroll)){ return; } S._enrolled=true; SFX.coin(); toast('✍️ Enrolled at Maple U! Attend classes to graduate.'); showUniversity(); };
  }
  body+=item('✖️','Close','',null,'data-a="x"'); sheetActions.x=closeSheet;
  openSheet(body); bindSheet();
}
function attendClass(){
  if(S.needs.energy<12){ toast('Too tired for class ⚡'); SFX.err(); return; }
  S.studying={left:180}; toast('📚 In class…'); updateAwayChip();
}
function endStudy(){
  S.studying=null;
  const n=S.needs; n.energy=clamp(n.energy-16,4,100); n.fun=clamp(n.fun-12,4,100); n.social=clamp(n.social+6,0,100);
  S.eduCredits++; addXP(30); SFX.good();
  if(S.eduCredits>=COLLEGE.classes){
    S.degree=true; S._enrolled=false; qprogress('degree');
    burst(vw/2,vh/3,'confetti'); SFX.level();
    toast('🎓 You graduated! Careers now pay more & cost less energy.');
  } else {
    toast('📚 Class done — '+S.eduCredits+'/'+COLLEGE.classes+' toward your degree');
  }
  updateAwayChip(); updateHUDNow(); save();
}
/* ----- school (kids) ----- */
function showSchool(){
  sheetActions={};
  const schoolKids=(S.kids||[]).filter(k=>(k.age||0)>=CHILD_AGE && k.grade<SCHOOL.grades);
  let body=sheetHead('🏫','Town School', SCHOOL.desc);
  if(!S.kids||!S.kids.length){ body+=`<p style="font-size:12.5px;color:#bdb6d6;margin-top:8px">No children yet. Start a family (👪) and they'll attend here once they're old enough.</p>`; }
  else if(!schoolKids.length){ body+=`<p style="font-size:12.5px;color:#bdb6d6;margin-top:8px">Your kids are either too little or already graduated 🎓</p>`; }
  else schoolKids.forEach(k=>{ const idx=S.kids.indexOf(k); const idk='sk'+idx;
    body+=item((k.age||0)>=TEEN_AGE?'🧑‍🎓':'🧒',k.name,'Grade '+k.grade+'/'+SCHOOL.grades+' · '+(k.atSchool?'in class':'send to school'),{txt:'Grade '+k.grade},`data-a="${idk}"`);
    sheetActions[idk]=()=>{ closeSheet(); sendKidToSchool(idx); };
  });
  body+=item('✖️','Close','',null,'data-a="x"'); sheetActions.x=closeSheet;
  openSheet(body); bindSheet();
}
function sendKidToSchool(idx){
  const k=S.kids[idx]; if(!k) return;
  if(k.atSchool){ toast(k.name+' is already at school 📚'); return; }
  if(k.grade>=SCHOOL.grades){ toast(k.name+' already graduated 🎓'); return; }
  k.atSchool={left:240};
  qprogress('school'); SFX.good();
  toast('🏫 '+k.name+' is at school 📚'); save();
}
function endKidSchool(k){
  k.atSchool=null; k.grade=(k.grade||0)+1;
  k.happy=clamp((k.happy||50)+6,0,100);
  if(k.grade>=SCHOOL.grades){ k.graduated=true; addXP(20); SFX.level(); burst(vw/2,vh/3,'confetti'); toast('🎓 '+k.name+' graduated from school!'); }
  else toast('🏫 '+k.name+' finished grade '+k.grade+'/'+SCHOOL.grades);
  save();
}
function showHospital(){
  sheetActions={};
  let body=sheetHead('🏥','Town Hospital','Walk-ins welcome. Collapsing is pricier.');
  body+=item('🩹','Checkup','+25 to every need',{txt:'60💰'},`data-a="chk"`);
  sheetActions.chk=()=>{ if(!spend(60)) return;
    for(const d of NEEDS) S.needs[d.k]=clamp(S.needs[d.k]+25,0,100);
    burst(S.px-cam.x,S.py-cam.y-30,'spark','+🩹'); SFX.good(); addXP(6); toast('🩹 Feeling much better!'); closeSheet(); };
  body+=item('🧘','Therapy session','+40 fun & social',{txt:'120💰'},`data-a="thx"`);
  sheetActions.thx=()=>{ if(!spend(120)) return;
    S.needs.fun=clamp(S.needs.fun+40,0,100); S.needs.social=clamp(S.needs.social+40,0,100);
    burst(S.px-cam.x,S.py-cam.y-30,'heart'); SFX.heart(); addXP(8); toast('🧘 Mind: cleared.'); closeSheet(); };
  body+=item('✖️','Close','','',`data-a="x"`); sheetActions.x=closeSheet;
  openSheet(body); bindSheet();
}
function showDiner(){
  sheetActions={}; const disc=hasPerk('dinerDiscount');
  let body=sheetHead('🍔','Sunny Diner','Eat out — tasty & a little social'+(disc?' · 🍳 Marco: 30% off!':''));
  FOODS_DINER.forEach((f,i)=>{ const idk='d'+i; const cost=disc?Math.round(f.cost*0.7):f.cost;
    body+=item(f.icon,f.name,'+'+f.hunger+'🍗'+(f.social?' +'+f.social+'💬':''),{txt:cost+'💰'},`data-a="${idk}"`);
    sheetActions[idk]=()=>{ if(!spend(cost)) return; const fx={hunger:f.hunger,fun:f.fun||0}; if(f.energy)fx.energy=f.energy; if(f.social)fx.social=f.social;
      applyFx(fx); burst(S.px-cam.x,S.py-cam.y-34,'spark','+'+f.hunger+'🍗'); SFX.eat(); S.stats.eat=(S.stats.eat||0)+1; qprogress('eat'); if(f.id==='coffee') qprogress('coffee'); addXP(6); toast('Enjoyed '+f.name+'!'); closeSheet(); }; });
  body+=item('✖️','Close','','',`data-a="x"`); sheetActions.x=closeSheet;
  openSheet(body); bindSheet();
}
/* ----- vacations ----- */
function vacationCost(v){
  const minor=(S.kids||[]).filter(k=>(k.age||0)<ADULT_AGE).length;
  const mult=1+VACATION_KID_SURCHARGE*minor;
  const flight=Math.round(v.flight*mult), rental=Math.round(v.rental*mult);
  return { minor, mult, flight, rental, total:flight+rental };
}
function showTravelAgency(){
  sheetActions={};
  const minor=(S.kids||[]).filter(k=>(k.age||0)<ADULT_AGE).length;
  let body=sheetHead('✈️','Travel Agency','Flights + a rental are included for the whole family. Each child adds '+(VACATION_KID_SURCHARGE*100)+'% until they grow up.'+(minor?' ('+minor+' kid'+(minor>1?'s':'')+' coming along)':''));
  VACATIONS.forEach(v=>{ const c=vacationCost(v); const idk='v_'+v.id;
    body+=item(v.icon,v.name,'✈️ '+c.flight+' + 🏚️ '+c.rental+(c.minor?' · family ×'+c.mult.toFixed(2):'')+' · '+v.excursions.length+' excursions',{txt:c.total+'💰'},`data-a="${idk}"`);
    sheetActions[idk]=()=>flyTo(v);
  });
  body+=item('✖️','Close','',null,'data-a="x"'); sheetActions.x=closeSheet;
  openSheet(body); bindSheet();
}
function flyTo(v){
  const c=vacationCost(v);
  if(!spend(c.total)) return;
  S.vacay={id:v.id, found:[], excursions:[]};
  closeSheet(); qprogress('vacation'); addXP(20); SFX.level();
  toast('✈️ Off to '+v.name+(c.minor?' with the kids':'')+'! '+v.icon);
  gotoScene('vacation', v.spawn);
}
function flyHome(){
  const found=(S.vacay&&S.vacay.found.length)||0, did=(S.vacay&&S.vacay.excursions.length)||0;
  const n=S.needs;
  n.fun=clamp(n.fun+40+found*4+did*6,0,100); n.energy=clamp(n.energy+25,0,100);
  n.social=clamp(n.social+20,0,100); n.hygiene=clamp(n.hygiene+10,0,100);
  if(S.partner) rel(S.partner,8);
  S.vacay=null; addXP(15); SFX.good();
  toast('🏡 Home, recharged! Found '+found+' treasure'+(found===1?'':'s')+'.');
  gotoScene('town', TOWN_SPAWN);
}
function collectTreasure(o,key){
  S.vacay.found=S.vacay.found||[];
  if(S.vacay.found.indexOf(key)>=0){ toast('Already dug up here ⛏️'); closeSheet(); return; }
  const loot=TREASURE_LOOT[Math.floor(Math.random()*TREASURE_LOOT.length)];
  S.vacay.found.push(key);
  addCoins(loot.coins); if(loot.gift){ S.gifts[loot.gift]=(S.gifts[loot.gift]||0)+1; }
  if(loot.fun) S.needs.fun=clamp(S.needs.fun+loot.fun,0,100);
  burst(S.px-cam.x,S.py-cam.y-30,'coin','+'+loot.coins+'💰'); SFX.coin(); addXP(loot.xp||16);
  qprogress('treasure');
  toast('🎉 You found '+loot.icon+' '+loot.name+'! +'+loot.coins+'💰'); closeSheet();
}
function doExcursion(o,key){
  const v=scene.vac; const ex=v.excursions.find(e=>e.id===o.ex); if(!ex) return;
  if(!spend(ex.price)){ return; }
  const fx={fun:ex.fun||0}; if(ex.social) fx.social=ex.social; if(ex.energy) fx.energy=ex.energy;
  S.vacay.excursions=S.vacay.excursions||[]; if(S.vacay.excursions.indexOf(o.ex)<0) S.vacay.excursions.push(o.ex);
  action={kind:'timed', icon:ex.icon, label:ex.name, fx, total:30, left:30,
    done:()=>{ burst(S.px-cam.x,S.py-cam.y-30,'spark','+'+(ex.fun||0)+'🎉'); SFX.good(); addXP(18); qprogress('excursion');
      // an excursion can uncover a bonus treasure nearby
      const hidden=[...scene.furnAt.values()].find(f=>f.t==='treasure' && (S.vacay.found.indexOf(f.c+','+f.r)<0));
      if(hidden && Math.random()<0.5){ toast('🗺️ The guide points out a hidden treasure nearby!'); }
      toast('✨ '+ex.name+' — unforgettable!'); } };
  closeSheet();
}
function showActivity(icon,title,sub,menu,questEv){
  sheetActions={};
  let body=sheetHead(icon,title,sub);
  menu.forEach((m,i)=>{ const idk='ac'+i;
    const bits=[]; for(const k of ['hunger','energy','fun','social']) if(m[k]) bits.push((m[k]>0?'+':'')+m[k]+' '+k);
    if(m.xp) bits.push('+'+m.xp+'xp');
    body+=item(m.icon,m.name,bits.join(' · '),{txt:m.cost?m.cost+'💰':'free'},`data-a="${idk}"`);
    sheetActions[idk]=()=>{
      if(m.cost&&!spend(m.cost)) return;
      const fx={}; for(const k of ['hunger','energy','fun','social']) if(m[k]) fx[k]=m[k];
      applyFx(fx);
      burst(S.px-cam.x,S.py-cam.y-30,'spark', m.fun?'+'+m.fun+'🎉':'✨'); SFX.good();
      if(m.xp) addXP(m.xp);
      if(questEv) qprogress(questEv);
      if(m.hunger) qprogress('eat');
      qprogress('activity');
      toast(m.icon+' '+m.name+' — nice!'); closeSheet();
    };
  });
  body+=item('✖️','Close','',null,'data-a="x"'); sheetActions.x=closeSheet;
  openSheet(body); bindSheet();
}
function showGym(){
  sheetActions={}; const tr=S.career==='trainer';
  let body=sheetHead('🏋️','Flex Gym',tr?'Staff perks: 2× gains 💪':'Sweat now, glow later');
  const opts=[['🏃','Cardio',{fun:14,energy:-16,hygiene:-14},25],['🏋️','Weights',{fun:10,energy:-20,hygiene:-12},30],['🧘','Yoga',{fun:18,energy:-6,hygiene:-6},25]];
  opts.forEach((o,i)=>{ const idk='gy'+i; body+=item(o[0],o[1],'fitness +XP',{txt:'free'},`data-a="${idk}"`);
    sheetActions[idk]=()=>{ if(S.needs.energy<12){ toast('Too tired ⚡'); SFX.err(); return; }
      const fx={...o[2]}; if(tr) fx.fun*=2;
      applyFx(fx); burst(S.px-cam.x,S.py-cam.y-30,'spark','💪'); SFX.good(); qprogress('fit'); addXP(tr?o[3]*2:o[3]); toast(o[1]+' done! 💪'); closeSheet(); }; });
  body+=item('✖️','Close','','',`data-a="x"`); sheetActions.x=closeSheet;
  openSheet(body); bindSheet();
}
function shiftPay(){
  const c=CAREERS.find(x=>x.id===S.career);
  let pay=c?Math.round(c.pay*(1+0.5*(S.jobLvl-1))):120;   // pay rises steeply with rank
  const opay={suit:1.05, gown:1.08}[S.outfit]; if(opay) pay=Math.round(pay*opay);
  if(S.vehicle==='limo') pay=Math.round(pay*1.1);
  if(S.degree) pay=Math.round(pay*1.2);                    // college bonus (wave 2 hook)
  return pay;
}
function shiftMinutes(){ return 300 + 60*Math.min(S.jobLvl,5); }   // higher rank = longer shift
function showWorkSheet(){
  sheetActions={};
  if(S.business){ showBusinessCenter(); return; }
  if(!S.career){
    let body=sheetHead('💼','Office','Pick a career — or strike out on your own.');
    body+=item('📋','Career board','Pick a job (each has perks)',null,'data-a="board"');
    body+=item('🏢','Start a business','Be your own boss (harder, no ceiling)',null,'data-a="biz"');
    body+=`<p style="font-size:11.5px;color:#bdb6d6;margin:8px 2px">🎓 Tip: earn a degree at Maple University — it boosts career pay &amp; perks.</p>`;
    sheetActions.board=()=>showCareerBoard(true);
    sheetActions.biz=()=>showBusinessCenter();
    body+=item('✖️','Close','',null,'data-a="x"'); sheetActions.x=closeSheet;
    openSheet(body); bindSheet(); return;
  }
  const c=CAREERS.find(x=>x.id===S.career);
  let body=sheetHead(c.icon,'Office — '+jobTitle(),c.perk+(S.degree?' · 🎓 degree active':''));
  body+=`<p style="font-size:12px;color:#bdb6d6;margin:6px 2px">A shift pays ~${shiftPay()}💰 over ${Math.round(shiftMinutes()/60)}h. Play the task for <b style="color:#5ee07a">+25% pay</b>. 2 good shifts in a row = promotion (rank ${S.jobLvl}/${RANKS.length}: more pay, longer hours).</p>`;
  body+=item('💼','Start a shift','Play a task for +25%, or skip',null,'data-a="go"');
  sheetActions.go=()=>{ closeSheet(); beginWork(); };
  body+=item('📋','Career board','Switch careers (rank resets)',null,'data-a="board"');
  sheetActions.board=()=>showCareerBoard(false);
  body+=item('🏢','Open a business instead','Quit the 9-5 & be your own boss',null,'data-a="biz"');
  sheetActions.biz=()=>showBusinessCenter();
  body+=item('✖️','Close','',null,'data-a="x"'); sheetActions.x=closeSheet;
  openSheet(body); bindSheet();
}
function showCareerBoard(first){
  sheetActions={};
  let body=sheetHead('📋','Career Board',first?'Pick your first job — each changes how you live!':'Switching resets your rank to Trainee');
  CAREERS.forEach(c=>{ const cur=S.career===c.id; const idk='c_'+c.id;
    body+=item(c.icon,c.name+(cur?' ✓':''),c.perk+' · base '+c.pay+'💰/shift',{txt:cur?'Current':'',owned:cur},`data-a="${idk}"${cur?' disabled':''}`);
    sheetActions[idk]=()=>{
      const had=S.career;
      S.career=c.id; S.jobLvl=1; S.promoStreak=0;
      SFX.level(); burst(S.px-cam.x,S.py-cam.y-30,'confetti');
      qprogress('career');
      toast(c.icon+' You are now a '+jobTitle()+'!'+(had?' (fresh start)':''));
      save(); closeSheet(); updateHUDNow();
    }; });
  body+=item('✖️','Close','','',`data-a="x"`); sheetActions.x=closeSheet;
  openSheet(body); bindSheet();
}

/* ----- work ----- */
function beginWork(){
  if(!S.career){ showCareerBoard(true); return; }
  const hour=Math.floor(S.minutes/60)%24;
  if(hour<7||hour>17){ toast('Office hours are 7:00–17:00 😴'); SFX.err(); return; }
  if(S.needs.energy<15){ toast('Too tired to work ⚡'); SFX.err(); return; }
  offerMinigame();
}
function offerMinigame(){
  const c=CAREERS.find(x=>x.id===S.career);
  const gid=c.games[Math.floor(Math.random()*c.games.length)];
  const g=MINIGAMES[gid];
  sheetActions={};
  let body=sheetHead(g.icon,"Today's task: "+g.name,g.tip);
  body+=`<p style="font-size:12px;color:#bdb6d6;margin:6px 2px">Complete it for a <b style="color:#5ee07a">+25% pay bonus</b> this shift — or skip and just clock in.</p>`;
  body+=item('🎮','Play the task','+25% pay if you win',null,'data-a="play"');
  body+=item('⏭️','Skip & clock in','No bonus, no fuss',null,'data-a="skip"');
  sheetActions.play=()=>{ closeSheet(); playMinigame(gid, win=>runShift(win?1.25:1.0, win)); };
  sheetActions.skip=()=>{ closeSheet(); runShift(1.0, null); };
  openSheet(body); bindSheet();
}
function runShift(bonus, won){
  S.atWork={left:shiftMinutes(), bonus};
  if(won===true) toast('🎯 Nailed it! +25% pay this shift');
  else if(won===false) toast("Just missed it — clocking in anyway 💼");
  updateAwayChip();
}
function endWork(){
  const biz=S.atWork&&S.atWork.biz;
  const bonus=(S.atWork&&S.atWork.bonus)||1;
  S.atWork=null;
  const n=S.needs;
  const eDrain=Math.round(28*(S.degree?0.7:1));   // degree: shifts cost 30% less energy
  n.hunger=clamp(n.hunger-26,4,100); n.energy=clamp(n.energy-eDrain,4,100); n.hygiene=clamp(n.hygiene-16,4,100);
  n.fun=clamp(n.fun-20,4,100); n.bladder=clamp(n.bladder-22,12,100); n.social=clamp(n.social+18,0,100);
  if(biz){ endBizDay(); updateAwayChip(); save(); return; }
  const pay=Math.round(shiftPay()*bonus);
  addCoins(pay); SFX.coin(); burst(S.px-cam.x,S.py-cam.y-30,'coin','+'+pay+'💰');
  qprogress('work'); addXP(40);
  toast('🏁 Shift done! +'+pay+'💰'+(bonus>1?' (task bonus!)':''));
  if(mood()>=58){
    S.promoStreak++;
    if(S.promoStreak>=2&&S.jobLvl<RANKS.length){
      S.jobLvl++; S.promoStreak=0; SFX.level(); burst(vw/2,vh/3,'confetti');
      toast('📈 Promoted to '+jobTitle()+'! More pay, longer hours 🎉');
    }
  } else S.promoStreak=0;
  updateAwayChip(); save();
}

/* ----- business ----- */
function bizRun(){
  const b=S.business, def=BUSINESSES.find(x=>x.id===b.id);
  const factor = 1 - def.swing + Math.random()*def.swing*2;     // 0-ish .. ~2x
  let net = Math.round(def.base * b.level * factor * (S.degree?1.15:1));
  let hit=false;
  if(def.cat==='cool' && Math.random()<BIZ_BREAKTHROUGH){ net=Math.round(Math.abs(net)*(3+Math.random()*4)); hit=true; }
  // a rough day can dip below the running costs → a loss
  net -= Math.round(def.base*b.level*0.35);
  return {net, hit, def};
}
function endBizDay(){
  const {net,hit,def}=bizRun(); const b=S.business; b.days=(b.days||0)+1;
  if(net>=0){ addCoins(net); SFX.coin(); burst(S.px-cam.x,S.py-cam.y-30,'coin','+'+net+'💰');
    toast((hit?'🤩 '+def.name+' went viral! ':'🏢 '+def.name+' day done! ')+'+'+net+'💰');
  } else { S.coins=Math.max(0,S.coins-Math.abs(net)); SFX.err();
    toast('📉 Slow day at '+def.name+'. -'+Math.abs(net)+'💰'); }
  addXP(hit?45:25); qprogress('biz');
}
function startBusiness(def){
  if(!spend(def.invest)) return;
  S.business={id:def.id, level:1, days:0};
  S.career=null;   // business is your new path
  SFX.level(); burst(vw/2,vh/3,'confetti'); addXP(30); qprogress('bizstart');
  toast(def.icon+' You opened '+def.name+'! Run it from the Office 🏢'); save(); updateHUDNow();
  closeSheet();
}
function showBusinessCenter(){
  sheetActions={};
  if(!S.business){
    let body=sheetHead('🏢','Start a Business','Be your own boss — riskier than a job, but no ceiling. Cool gigs swing wild; the 🎤 Singer is the hardest.');
    BUSINESSES.forEach(d=>{ const idk='b_'+d.id;
      body+=item(d.icon,d.name+(d.hardest?' 🔥':''),(d.cat==='cool'?'Cool · ':'Steady · ')+d.desc,{txt:d.invest+'💰'},`data-a="${idk}"`);
      sheetActions[idk]=()=>startBusiness(d);
    });
    body+=item('↩️','Back to jobs','',null,'data-a="back"'); sheetActions.back=()=>showWorkSheet();
    openSheet(body); bindSheet(); return;
  }
  // manage existing business
  const def=BUSINESSES.find(x=>x.id===S.business.id), b=S.business;
  const lvlCost=Math.round(def.levelCost*b.level);
  let body=sheetHead(def.icon, def.name+' — Lvl '+b.level, 'Avg/day ~'+Math.round(def.base*b.level)+'💰 · '+(def.cat==='cool'?'high risk/reward':'steady')+' · '+(b.days||0)+' days run');
  body+=item('🏢','Run the business','A day of hustle — variable pay',null,'data-a="run"');
  sheetActions.run=()=>{ closeSheet(); runBusiness(); };
  body+=item('📈','Invest to grow','Lvl '+b.level+'→'+(b.level+1)+' · higher income',{txt:lvlCost+'💰'},'data-a="inv"');
  sheetActions.inv=()=>{ if(!spend(lvlCost)) return; b.level++; SFX.level(); burst(vw/2,vh/2,'confetti'); addXP(15); toast('📈 '+def.name+' grew to level '+b.level+'!'); save(); showBusinessCenter(); };
  body+=item('🔚','Close the business','Sell up & go back to jobs',null,'data-a="close"');
  sheetActions.close=()=>{ if(!confirm('Close '+def.name+'?')) return; S.business=null; toast('You closed the business.'); save(); closeSheet(); };
  body+=item('✖️','Close','',null,'data-a="x"'); sheetActions.x=closeSheet;
  openSheet(body); bindSheet();
}
function runBusiness(){
  if(S.needs.energy<12){ toast('Too tired to run the business ⚡'); SFX.err(); return; }
  S.atWork={left:shiftMinutes(), biz:true, bonus:1};
  toast('🏢 Opening up shop…'); updateAwayChip();
}

/* ----- job mini-games ----- */
function playMinigame(gid, cb){
  const g=MINIGAMES[gid]; const ov=el('mgOverlay');
  if(!ov){ cb(false); return; }
  paused=true; let done=false;
  const finish=win=>{ if(done) return; done=true; ov.classList.remove('show'); ov.innerHTML=''; paused=false; cb(win); };
  ov.innerHTML=`<div class="mgCard"><h3>${g.icon} ${g.name}</h3><p class="mgTip">${g.tip}</p><div id="mgArea"></div><div id="mgStatus" class="mgStatus"></div><button class="mgSkip" id="mgSkip">Give up (no bonus)</button></div>`;
  ov.classList.add('show');
  el('mgSkip').onclick=()=>finish(false);
  const area=el('mgArea'), status=el('mgStatus');
  if(g.type==='timing') mgTiming(area,status,finish);
  else if(g.type==='mash') mgMash(area,status,finish);
  else mgSequence(area,status,finish);
}
function mgTiming(area,status,finish){
  let round=0, hits=0; const rounds=3, needed=2; let speed=1.25;
  area.innerHTML=`<div class="mgBar"><div class="mgZone" id="mgZone"></div><div class="mgMarker" id="mgMark"></div></div><button class="mgBtn" id="mgStop">STOP</button>`;
  const zone=el('mgZone'), mark=el('mgMark'), stop=el('mgStop');
  let zoneL=34+Math.random()*30, zoneW=20; zone.style.left=zoneL+'%'; zone.style.width=zoneW+'%';
  let pos=0, dir=1, raf;
  status.textContent='Round 1/3 — STOP in the green';
  function step(){ pos+=dir*speed; if(pos>=100){pos=100;dir=-1;} if(pos<=0){pos=0;dir=1;} mark.style.left=pos+'%'; raf=requestAnimationFrame(step); }
  raf=requestAnimationFrame(step);
  stop.onclick=()=>{
    const inZone=pos>=zoneL&&pos<=zoneL+zoneW;
    if(inZone){ hits++; mark.style.background='#5ee07a'; blip(880,0.08,'square',0.05); } else { mark.style.background='#ff5d6c'; blip(180,0.1,'sawtooth',0.04); }
    round++;
    if(round>=rounds){ cancelAnimationFrame(raf); setTimeout(()=>finish(hits>=needed),250); return; }
    setTimeout(()=>{ mark.style.background='#fff'; status.textContent='Round '+(round+1)+'/3 · hits: '+hits; speed+=0.45;
      zoneL=28+Math.random()*44; zone.style.left=zoneL+'%'; },200);
  };
}
function mgMash(area,status,finish){
  area.innerHTML=`<div class="mgMeter"><div class="mgMeterFill" id="mgFill"></div></div><button class="mgBtn big" id="mgTap">TAP!</button>`;
  const fillEl=el('mgFill'), tap=el('mgTap');
  let fill=0, time=5.0, last=performance.now(), raf;
  function loop2(now){ const dt=(now-last)/1000; last=now; time-=dt; fill=Math.max(0,fill-dt*7);
    fillEl.style.width=fill+'%'; status.textContent='⏱ '+time.toFixed(1)+'s  —  '+Math.round(fill)+'%';
    if(fill>=100){ cancelAnimationFrame(raf); finish(true); return; }
    if(time<=0){ cancelAnimationFrame(raf); finish(false); return; }
    raf=requestAnimationFrame(loop2); }
  raf=requestAnimationFrame(loop2);
  tap.onclick=()=>{ fill=Math.min(100,fill+8); blip(560,0.025,'square',0.03); };
}
function mgSequence(area,status,finish){
  const cols=['#ff6b6b','#4dabf7','#51cf66','#ffd43b'];
  const len=3+Math.floor(Math.random()*2);
  const seq=[]; for(let i=0;i<len;i++) seq.push(Math.floor(Math.random()*4));
  area.innerHTML='<div class="mgPads">'+cols.map((c,i)=>`<button class="mgPad" data-i="${i}" style="background:${c}"></button>`).join('')+'</div>';
  const pads=[...area.querySelectorAll('.mgPad')];
  let accepting=false, idx=0, k=0;
  status.textContent='Watch the pattern…';
  function playSeq(){ if(k>=seq.length){ accepting=true; status.textContent='Your turn — repeat it!'; return; }
    const p=pads[seq[k]]; p.classList.add('lit'); blip(380+seq[k]*130,0.2,'sine',0.05);
    setTimeout(()=>{ p.classList.remove('lit'); k++; setTimeout(playSeq,200); },440); }
  setTimeout(playSeq,500);
  pads.forEach(p=>p.onclick=()=>{ if(!accepting) return; const i=+p.dataset.i;
    p.classList.add('lit'); setTimeout(()=>p.classList.remove('lit'),150); blip(380+i*130,0.12,'sine',0.05);
    if(i===seq[idx]){ idx++; if(idx>=seq.length){ accepting=false; setTimeout(()=>finish(true),200); } }
    else { accepting=false; setTimeout(()=>finish(false),200); } });
}
function updateAwayChip(){ const c=el('awayChip');
  if(S.atWork){ const biz=S.atWork.biz; c.classList.add('show'); c.innerHTML=(biz?'🏢 Running the business…':'💼 At work…')+'<small>'+Math.ceil(S.atWork.left/60)+'h left · '+(biz?'hustling':'earning')+'</small>'; }
  else if(S.studying){ c.classList.add('show'); c.innerHTML='🎓 In class…<small>earning your degree</small>'; }
  else if(S.hospital){ c.classList.add('show'); c.innerHTML='🏥 In the hospital…<small>recovering · the bill is coming</small>'; }
  else c.classList.remove('show'); }

function hospitalize(){
  if(action&&action.returnPx){ S.px=action.returnPx[0]; S.py=action.returnPx[1]; }
  action=null; path=[]; pending=null; closeSheet(); closeModal();
  S.hospital={ left:240, bill:Math.floor(S.coins*(hasPerk('medicDiscount')?0.4:0.8)) };
  toast('😵 '+S.name+' collapsed! Rushed to the hospital…'); SFX.err();
  updateAwayChip(); save();
}
function leaveHospital(){
  const bill=S.hospital.bill; S.hospital=null;
  S.coins=Math.max(0,S.coins-bill);
  for(const d of NEEDS) S.needs[d.k]=Math.max(S.needs[d.k],68);
  // wake up outside the Town Hospital
  const h=BUILDINGS.find(b=>b.id==='hospital');
  if(scene.type!=='town') buildTown();
  S.scene='town';
  S.px=(h.door[0]+.5)*T; S.py=(h.door[1]+1+.5)*T;
  centerCam(true);
  toast('🏥 Patched up! Hospital bill: -'+bill+'💰 (80%)'); SFX.good();
  toast('💡 Keep your needs out of the red to avoid this!');
  updateAwayChip(); updateHUDNow(); save();
}

/* ============================================================ */
/*                  SHOP / QUESTS / FAMILY (modals)             */
/* ============================================================ */
const genModal=el('genModal'), genCard=el('genCard');
function openModal(html){ genCard.innerHTML=html; genModal.classList.add('show'); bindGen(); paused=true; }
function closeModal(){ genModal.classList.remove('show'); paused=false; }
let genActions={};
function bindGen(){ genCard.querySelectorAll('[data-g]').forEach(b=>{ b.onclick=()=>{ const f=genActions[b.dataset.g]; if(f) f(b); }; }); }

let shopTab='homes';
function openShop(){ closeSheet(); shopTab='homes'; renderShop(); }
function renderShop(){
  genActions={};
  let body=`<h2>🛍️ Maple Mall</h2><div class="sub">Coins: <b style="color:#ffd76a">${Math.floor(S.coins)}💰</b></div>`;
  body+=`<div class="sheetTabs">`+
    ['homes:🏠 Homes','vehicles:🚗 Rides','style:👕 Style','decor:🛋️ Home+','boosts:⚡ Boosts','gifts:🎁 Gifts'].map(t=>{ const [k,l]=t.split(':');
      return `<button class="pill ${shopTab===k?'sel':''}" data-g="tab_${k}">${l}</button>`; }).join('')+`</div>`;
  if(shopTab==='homes'){
    HOME_TIERS.forEach(h=>{ const owned=S.homeTier>=h.id; const cur=S.homeTier===h.id;
      body+=item(h.icon,h.name,h.desc,{txt:cur?'Living here':owned?'Owned':h.price+'💰',owned:owned||cur},`data-g="home_${h.id}"${owned&&!cur?'':''}`);
      genActions['home_'+h.id]=()=>buyHome(h);
    });
  } else if(shopTab==='vehicles'){
    const rd=hasPerk('rideDiscount');
    if(rd) body+=`<p style="font-size:11px;color:#bdb6d6;margin:4px 2px">🔧 Liam: 20% off all rides!</p>`;
    body+=item('🚶','On foot','Always available',{txt:S.vehicle?'':'Active',owned:!S.vehicle},`data-g="veh_none"`); genActions.veh_none=()=>{ S.vehicle=null; toast('Walking it is 🚶'); save(); renderShop(); };
    VEHICLES.forEach(v=>{ const owned=(S.vehicles||[]).includes(v.id); const active=S.vehicle===v.id; const price=rd?Math.round(v.price*0.8):v.price;
      body+=item(v.icon,v.name,v.desc,{txt:active?'Driving':owned?'Owned · tap to drive':price+'💰',owned:owned||active},`data-g="veh_${v.id}"`);
      genActions['veh_'+v.id]=()=>buyVehicle(v);
    });
  } else if(shopTab==='gifts'){
    const md=hasPerk('mallDiscount');
    body+=`<p style="font-size:11px;color:#bdb6d6;margin:4px 2px">Stock up, then give gifts to build relationships 💞${md?' · 🛍️ Yuki: 15% off!':''}</p>`;
    GIFTS.forEach(g=>{ const have=(S.gifts&&S.gifts[g.id])||0; const price=md?Math.round(g.price*0.85):g.price;
      body+=item(g.icon,g.name,g.desc+(have?' · have '+have:''),{txt:price+'💰'},`data-g="gift_${g.id}"`);
      genActions['gift_'+g.id]=()=>{ if(!spend(price)) return; S.gifts[g.id]=(S.gifts[g.id]||0)+1; SFX.coin(); toast('Bought '+g.name+' '+g.icon); save(); renderShop(); };
    });
  } else if(shopTab==='style'){
    const sd=hasPerk('styleDiscount');
    body+=`<p style="font-size:11px;color:#bdb6d6;margin:4px 2px">Outfits change your look — and your life 👗${sd?' · 💇 Sofia: 20% off!':''}</p>`;
    body+=item('🧍','Original look','Back to your first shirt',{txt:S.outfit?'Wear':'Wearing',owned:!S.outfit},`data-g="of_none"`);
    genActions.of_none=()=>{ S.outfit=null; S.shirt=S.baseShirt; SFX.good(); toast('Back to the classic look 🧍'); save(); renderShop(); };
    OUTFITS.forEach(of=>{ const owned=S.wardrobe.includes(of.id); const on=S.outfit===of.id; const price=sd?Math.round(of.price*0.8):of.price;
      body+=item(of.icon,of.name,of.perk,{txt:on?'Wearing':owned?'Wear':price+'💰',owned:on||owned},`data-g="of_${of.id}"`);
      genActions['of_'+of.id]=()=>{
        if(!owned){ if(!spend(price)) return; S.wardrobe.push(of.id); qprogress('outfit'); SFX.coin(); burst(vw/2,vh/2,'confetti'); }
        S.outfit=of.id; S.shirt=of.col; SFX.good(); toast('Wearing the '+of.name+' '+of.icon);
        save(); renderShop(); };
    });
    const hairP=sd?Math.round(SALON_HAIR_PRICE*0.8):SALON_HAIR_PRICE, styleP=sd?Math.round(SALON_STYLE_PRICE*0.8):SALON_STYLE_PRICE;
    body+=`<label style="display:block;font-size:11px;font-weight:700;color:#bdb6d6;margin:14px 0 6px;text-transform:uppercase;letter-spacing:.5px">💈 Salon — hair color (${hairP}💰)</label>`;
    body+=`<div class="swatches">`+HAIRC.map((c,i)=>`<button class="sw ${S.hair===c?'sel':''}" style="background:${c}" data-g="hc_${i}"></button>`).join('')+`</div>`;
    HAIRC.forEach((c,i)=>{ genActions['hc_'+i]=()=>{ if(S.hair===c) return; if(!spend(hairP)) return; S.hair=c; SFX.good(); burst(vw/2,vh/3,'spark'); toast('Fresh color! 💈'); save(); renderShop(); }; });
    body+=`<label style="display:block;font-size:11px;font-weight:700;color:#bdb6d6;margin:14px 0 6px;text-transform:uppercase;letter-spacing:.5px">💈 Hair style (${styleP}💰)</label>`;
    body+=`<div class="pillrow">`+HAIRSTYLES.map((nm,i)=>`<button class="pill ${S.hairStyle===i?'sel':''}" data-g="hs_${i}">${nm}</button>`).join('')+`</div>`;
    HAIRSTYLES.forEach((nm,i)=>{ genActions['hs_'+i]=()=>{ if(S.hairStyle===i) return; if(!spend(styleP)) return; S.hairStyle=i; SFX.good(); toast("New 'do! 💈"); save(); renderShop(); }; });
  } else if(shopTab==='decor'){
    body+=`<p style="font-size:11px;color:#bdb6d6;margin:4px 2px">Upgrade rooms in tiers — each level improves daily life 🏡</p>`;
    const hd=hasPerk('homeDiscount');
    if(hd) body+=`<p style="font-size:11px;color:#bdb6d6;margin:4px 2px">🌱 Ava: 15% off home upgrades!</p>`;
    HOME_UPGRADES.forEach(u=>{
      const lv=(S.homeLv&&S.homeLv[u.id])||0; const cur=u.tiers[lv]; const next=u.tiers[lv+1];
      if(next){
        const price=hd?Math.round(next.price*0.85):next.price;
        body+=item(u.icon,u.name+' → '+next.name,'Now: '+cur.name+' · '+next.desc,{txt:price+'💰'},`data-g="hu_${u.id}"`);
        genActions['hu_'+u.id]=()=>{ if(!spend(price)) return; S.homeLv[u.id]=lv+1; SFX.level(); burst(vw/2,vh/2,'confetti'); addXP(15); toast(u.icon+' '+next.name+' installed!'); save(); renderShop(); };
      } else {
        body+=item(u.icon,u.name+': '+cur.name,'Fully upgraded ✨',{txt:'MAX',owned:true},'disabled');
      }
    });
  } else if(shopTab==='boosts'){
    body+=`<p style="font-size:11px;color:#bdb6d6;margin:4px 2px">⚡ Instant energy — but it costs you happiness. Grind fast, just mind your peace 😵‍💫</p>`;
    STIMULANTS.forEach(s=>{
      const sub='+'+s.energy+' energy · '+s.fun+' fun'+(s.social?' · '+s.social+' social':'');
      body+=item(s.icon,s.name,sub,{txt:s.price+'💰'},`data-g="stim_${s.id}"`);
      genActions['stim_'+s.id]=()=>{ if(!spend(s.price)) return;
        S.needs.energy=clamp(S.needs.energy+s.energy,0,100);
        S.needs.fun=clamp(S.needs.fun+s.fun,0,100);
        if(s.social) S.needs.social=clamp(S.needs.social+s.social,0,100);
        SFX.coin(); burst(vw/2,vh/2,'spark','+'+s.energy+'⚡'); updateHUDNow();
        toast(s.icon+' '+s.name+' — wired up!'); save(); renderShop(); };
    });
  }
  body+=`<button class="closebtn" data-g="close">Done</button>`;
  genActions.tab_homes=()=>{shopTab='homes';renderShop();}; genActions.tab_vehicles=()=>{shopTab='vehicles';renderShop();};
  genActions.tab_gifts=()=>{shopTab='gifts';renderShop();}; genActions.tab_decor=()=>{shopTab='decor';renderShop();};
  genActions.tab_style=()=>{shopTab='style';renderShop();}; genActions.tab_boosts=()=>{shopTab='boosts';renderShop();};
  genActions.close=closeModal;
  openModal(body);
}
function buyHome(h){
  if(S.homeTier===h.id){ return; }
  if(S.homeTier>=h.id){ S.homeTier=h.id; if(scene.type==='home') buildHome(); toast('Moved into '+h.name); save(); renderShop(); return; }
  if(!spend(h.price)) return;
  S.homeTier=h.id; SFX.level(); burst(vw/2,vh/2,'confetti'); addXP(40);
  if(scene.type==='home') gotoScene('home', homeDef().spawn);
  toast('🎉 You bought the '+h.name+'!'); save(); renderShop();
}
function buyVehicle(v){
  const owned=(S.vehicles||[]).includes(v.id);
  if(owned){ S.vehicle=v.id; toast('Now driving the '+v.name+' '+v.icon); save(); renderShop(); return; }
  if(!spend(v.price)) return;
  S.vehicles=S.vehicles||[]; S.vehicles.push(v.id); S.vehicle=v.id; SFX.level(); burst(vw/2,vh/2,'confetti');
  qprogress('vehicle'); addXP(40); toast('🎉 Got a '+v.name+'! '+v.icon); save(); renderShop();
}

/* ----- unified Life modal: Quests | People | Save ----- */
let lifeTab='quests';
function openQuests(){ closeSheet(); lifeTab='quests'; renderLife(); }
function lifeTabBar(){
  const dot=S.quests.some(q=>q.done&&!q.claimed)?' •':'';
  return `<div class="sheetTabs">`+
    [['quests','📋 Quests'+dot],['people','👪 People'],['tree','🌳 Tree'],['save','💾 Save']].map(([k,l])=>
      `<button class="pill ${lifeTab===k?'sel':''}" data-g="lt_${k}">${l}</button>`).join('')+`</div>`;
}
function renderLife(){
  genActions={};
  if(lifeTab==='people'){ renderPeople(); return; }
  if(lifeTab==='tree'){ renderTree(); return; }
  if(lifeTab==='save'){ renderSave(); return; }
  // quests (default)
  let body=`<h2>📋 Quests</h2><div class="sub">Little goals, big rewards. New ones appear as you play.</div>`;
  body+=lifeTabBar();
  S.quests.forEach((q,i)=>{ const def=QUEST_POOL.find(d=>d.id===q.id); if(!def) return;
    const pct=Math.round(q.prog/def.n*100);
    body+=`<div class="quest"><div class="qrow"><span class="qi">${def.icon}</span><b>${def.txt}</b><span class="qreward">+${def.coin}💰 +${def.xp}xp</span></div>`;
    body+=`<div class="qbarWrap"><div class="qbar" style="width:${pct}%"></div></div>`;
    if(q.done&&!q.claimed) body+=`<button class="claim" data-g="claim_${i}">Claim reward 🎉</button>`;
    else body+=`<div style="font-size:11px;color:#bdb6d6;margin-top:6px">${q.claimed?'✅ Claimed':q.prog+' / '+def.n}</div>`;
    body+=`</div>`;
    genActions['claim_'+i]=()=>claimQuest(i);
  });
  body+=`<button class="closebtn" data-g="close">Close</button>`;
  wireLifeTabs(); genActions.close=closeModal;
  openModal(body);
}
function wireLifeTabs(){ genActions.lt_quests=()=>{lifeTab='quests';renderLife();}; genActions.lt_people=()=>{lifeTab='people';renderLife();}; genActions.lt_tree=()=>{lifeTab='tree';renderLife();}; genActions.lt_save=()=>{lifeTab='save';renderLife();}; }
function renderTree(){
  genActions={};
  const tree=S.tree||[];
  let body=`<h2>🌳 Family Tree</h2><div class="sub">The ${S.surname||''} lineage — ${tree.length} ${tree.length===1?'person':'people'}, ${(S.generation||1)} generation${(S.generation||1)>1?'s':''}</div>`;
  body+=lifeTabBar();
  const gens=[...new Set(tree.map(n=>n.gen))].sort((a,b)=>a-b);
  if(!gens.length){ body+=`<p style="color:#bdb6d6;font-size:12.5px;margin-top:10px">Your story begins here. Marry and have children to grow the tree.</p>`; }
  gens.forEach(g=>{
    body+=`<label>Generation ${g}</label>`;
    tree.filter(n=>n.gen===g).forEach(n=>{
      const you=n.tid===S.tid;
      const par=(n.parents&&n.parents.length)
        ? 'child of '+n.parents.map(pid=>(treeNode(pid)||{}).name||'—').join(' & ')
        : (n.tid==='t0' ? 'the founder' : (g===1 ? 'married into the family' : ''));
      body+=`<div class="relrow"${!n.alive?' style="opacity:.5"':''}>`
        +`<div class="ravatar" style="display:flex;align-items:center;justify-content:center;font-size:18px">${n.alive?(you?'⭐':'🙂'):'🕯️'}</div>`
        +`<div class="rinfo"><b>${n.name}${you?' <span class="tag">YOU</span>':''}${!n.alive?' <span class="meta">· passed</span>':''}</b>`
        +`<span class="meta">${par}</span></div></div>`;
    });
  });
  body+=`<button class="closebtn" data-g="close">Close</button>`;
  wireLifeTabs(); genActions.close=closeModal;
  openModal(body);
}
function claimQuest(i){
  const q=S.quests[i]; const def=QUEST_POOL.find(d=>d.id===q.id); if(!q.done||q.claimed) return;
  q.claimed=true; addCoins(def.coin); SFX.coin(); burst(vw/2,vh/2,'confetti'); addXP(def.xp);
  toast('🎉 +'+def.coin+'💰 +'+def.xp+'xp'); save();
  // replace with a fresh quest after a beat
  setTimeout(()=>{ rerollQuest(i); renderLife(); refreshLifeDot(); }, 400);
  renderLife();
}
function eligibleQuest(def){
  if(def.cond==='noPartner'&&S.partner) return false;
  if(def.cond==='hasPartner'&&!S.partner) return false;
  if(def.cond==='hasKid'&&(!S.kids||!S.kids.length)) return false;
  if(def.cond==='noVehicle'&&(S.vehicles&&S.vehicles.length)) return false;
  if(def.cond==='noCareer'&&S.career) return false;
  if(def.cond==='noOutfit'&&S.outfit) return false;
  if(def.cond==='noDegree'&&S.degree) return false;
  if(def.cond==='noBiz'&&S.business) return false;
  if(def.cond==='hasBiz'&&!S.business) return false;
  if(def.cond==='hasSchoolKid'&&!(S.kids||[]).some(k=>(k.age||0)>=CHILD_AGE)) return false;
  return true;
}
function rerollQuest(i){
  const active=new Set(S.quests.map(q=>q.id));
  const pool=QUEST_POOL.filter(d=>!active.has(d.id)&&eligibleQuest(d));
  const pick=pool.length?pool[Math.floor(Math.random()*pool.length)]:QUEST_POOL[Math.floor(Math.random()*QUEST_POOL.length)];
  S.quests[i]={id:pick.id, prog:0, done:false, claimed:false};
}
function seedQuests(){ S.quests=[]; const used=new Set();
  while(S.quests.length<4){ const d=QUEST_POOL[Math.floor(Math.random()*QUEST_POOL.length)];
    if(used.has(d.id)||!eligibleQuest(d)) continue; used.add(d.id); S.quests.push({id:d.id,prog:0,done:false,claimed:false}); } }
function refreshLifeDot(){ const any=S.quests.some(q=>q.done&&!q.claimed); el('lifeBtn').classList.toggle('dot',any); }

/* family */
function openFamily(){ closeSheet(); lifeTab='people'; renderLife(); }
function openHelp(){
  closeSheet(); genActions={};
  const row=(ic,txt)=>`<div class="helpRow"><span class="helpIc">${ic}</span><span>${txt}</span></div>`;
  let body=`<h2>📖 How to Play</h2>`
    +`<div class="sub">Pocket Life is a cozy life sim — no way to "lose", just live a good life. 🌱</div>`
    +`<label>Getting around</label>`
    +row('🖐️','<b>Drag</b> the screen to look around the map.')
    +row('👆👆','<b>Double-tap</b> any open tile to walk there.')
    +row('➕➖','Tap the <b>+/−</b> between your needs to zoom in & out.')
    +row('👋','<b>Single-tap</b> furniture or a person to interact with them.')
    +`<label>Living your life</label>`
    +row('📊','Keep your <b>needs</b> (bottom bars) out of the red — eat, sleep, wash, have fun. They drain slowly, so relax.')
    +row('🚪💼','<b>Go Out</b> to explore town & take vacations; <b>Work</b> to earn coins and climb your career.')
    +row('🛍️','<b>Shop</b> for homes, outfits, vehicles & upgrades that make life easier.')
    +row('👪','<b>Life</b> holds your quests, relationships, family tree & save/transfer code.')
    +`<label>The big picture 🎯</label>`
    +row('💞','Make friends, fall in love, marry & raise a family — name your kids and watch them grow.')
    +row('🌳','When your sim grows old, live on through an heir and grow your family <b>legacy</b> across generations.')
    +`<button class="closebtn" data-g="close">Got it!</button>`;
  genActions.close=closeModal;
  openModal(body);
}
/* ----- hidden cheat menu (Wave 6) ----- */
let cheatSeq=0, cheatSeqT=0;
function cheatTileTap(c,r){
  const tiles=(homeDef().cheat)||[]; if(!tiles.length) return false;
  const idx=tiles.findIndex(t=>t[0]===c&&t[1]===r); if(idx<0) return false;
  const now=performance.now(); if(now-cheatSeqT>2500) cheatSeq=0; cheatSeqT=now;
  const expected=cheatSeq%2;                 // A,B,A,B,A,B → 0,1,0,1,0,1
  if(idx===expected){ cheatSeq++; blip(280+cheatSeq*45,0.03,'sine',0.014);
    if(cheatSeq>=6){ cheatSeq=0; openCheats(); } }
  else cheatSeq=(idx===0)?1:0;               // wrong tile → restart the pattern
  return true;                               // a tap on a cheat tile never walks
}
function openCheats(){
  closeSheet();
  if(!revealActive()){
    const toll=shiftPay();
    if(!spend(toll)){ toast("You'll need about a shift's pay ("+toll+"💰) to crack this open"); SFX.err(); return; }
    SFX.coin(); toast('🤫 The floor clicks open… (−'+toll+'💰)');
  }
  renderCheats();
}
function renderCheats(){
  genActions={};
  const passCost=Math.round(0.4*shiftPay()*5);
  let body=`<h2>🃏 Secret Menu</h2>`
    +`<div class="sub">Shhh. ${revealActive()?('Pass active · '+svcLeft(S.cheatRevealUntil)+' left'):"Opening here costs about a shift's pay each time."}</div>`;
  const row=(ic,title,desc,key)=>`<button class="cheatBtn" data-g="${key}"><span class="cheatIc">${ic}</span><span class="cheatTxt"><b>${title}</b><span>${desc}</span></span></button>`;
  body+=row('💰','Instant Rich','Drop $500,000 into your account.','rich');
  body+=row('💖','Fulfill All Needs','Top up every need for you and the whole household.','needs');
  body+=row('🌟','The Big Kahuna','3 days as a giant: everything free, paid days off, +50% loved.','kahuna');
  body+=row('🎮','Game Got Em'+(S.cheatSocial?' ✓':''),'Every social interaction +75% better. Tap to toggle.','social');
  if(!revealActive()) body+=row('✨','Reveal pass','Mark the secret tiles & open free for a game-week — '+passCost+'💰.','pass');
  body+=`<button class="closebtn" data-g="close">Close</button>`;
  genActions.rich=()=>{ addCoins(500000); SFX.coin(); burst(vw/2,vh/3,'coin','+$500K'); toast('💰 Instant Rich — +$500,000!'); save(); renderCheats(); };
  genActions.needs=()=>{ for(const d of NEEDS) S.needs[d.k]=100; (S.members||[]).forEach(m=>{ if(m.needs) for(const d of NEEDS) m.needs[d.k]=100; }); (S.kids||[]).forEach(k=>k.happy=100); SFX.good(); burst(vw/2,vh/3,'heart'); toast('💖 The whole household is fully refreshed!'); updateHUDNow(); save(); };
  genActions.kahuna=()=>{ S.kahunaUntil=S.minutes+3*1440; SFX.level(); burst(vw/2,vh/3,'confetti'); toast('🌟 THE BIG KAHUNA! Three days of giant, free, beloved living.'); save(); if(scene&&scene.type==='home') buildHomies(); closeModal(); };
  genActions.social=()=>{ S.cheatSocial=!S.cheatSocial; SFX.good(); toast(S.cheatSocial?'🎮 Game Got Em ON — social +75%.':'Game Got Em off.'); save(); renderCheats(); };
  genActions.pass=()=>{ if(!spend(passCost)) return; S.cheatRevealUntil=S.minutes+7*1440; SFX.coin(); toast('✨ Secret tiles revealed — free for a game-week.'); save(); renderCheats(); };
  genActions.close=closeModal;
  openModal(body);
}
function renderPeople(){
  genActions={};
  let body=`<h2>👪 People</h2><div class="sub">You're playing <b>${S.name} ${S.surname||''}</b> · ${ageLabel(S.age||START_AGE)} · gen ${S.generation||1}</div>`;
  body+=lifeTabBar();
  // controllable family members (switch control)
  const ctrl=(S.members||[]);
  if(ctrl.length){ body+=`<label>Family — live as someone else</label>`;
    ctrl.forEach(m=>{ const can=m.age>=TEEN_AGE;
      body+=`<div class="relrow"><div class="ravatar" style="display:flex;align-items:center;justify-content:center;font-size:18px">${stageOf(m.age)[2]}</div><div class="rinfo"><b>${m.name} <span class="tag">${m.role}</span></b><span class="meta">${ageLabel(m.age)}</span></div>`+
        (can?`<button class="pill" data-g="sw_${m.mid}" style="padding:7px 12px">🔄 Live as</button>`:`<span class="meta">growing up</span>`)+`</div>`;
      if(can) genActions['sw_'+m.mid]=()=>{ switchTo(m.mid); };
    });
  }
  // kids
  if((S.kids||[]).length) body+=`<label>Children</label>`;
  (S.kids||[]).forEach(k=>{ const stage=(k.age||0)>=TEEN_AGE?'Teen':(k.age||0)>=CHILD_AGE?'Child':'Baby';
    body+=`<div class="relrow"><div class="ravatar" style="display:flex;align-items:center;justify-content:center;font-size:18px">${(k.age||0)>=CHILD_AGE?'🧒':'👶'}</div><div class="rinfo"><b>${k.name} <span class="tag kid">${stage}</span></b><span class="meta">Happiness ${Math.round(k.happy||50)} · age ${Math.floor(k.age||0)}y</span></div></div>`; });
  // friends
  const friends=Object.entries(S.rels).filter(([id,r])=>r.rel>0&&id!==S.partner).sort((a,b)=>b[1].rel-a[1].rel);
  if(friends.length){ body+=`<label>Townsfolk</label>`;
    friends.forEach(([id,r])=>{ const def=npcDef(id); if(!def) return;
      const gone=!npcPresent(id);
      const jobLine=def.job?`<span class="meta">${def.jobIcon} ${def.job}${r.rel>=def.perkAt?' · 🎁 perk active':''}</span>`:'';
      body+=`<div class="relrow"${gone?' style="opacity:.55"':''}><canvas class="ravatar" data-av="${id}" width="34" height="34"></canvas><div class="rinfo"><b>${def.name}${gone?' <span class="meta">(moved away)</span>':''}</b><div class="heartWrap"><div class="heartBar" style="width:${r.rel}%"></div></div>${jobLine}</div><span class="meta">${Math.round(r.rel)}❤</span></div>`; }); }
  if(!S.partner&&!friends.length) body+=`<p style="color:#bdb6d6;font-size:12.5px;margin-top:10px">Head out 🚪 and chat with townsfolk to build relationships. Each has a job — get close (50❤) for a perk! Reach 75❤ + a 💍 ring to propose.</p>`;
  body+=`<button class="closebtn" data-g="close">Close</button>`;
  wireLifeTabs(); genActions.close=closeModal;
  openModal(body);
  // draw avatars
  genCard.querySelectorAll('[data-av]').forEach(c=>{ const def=npcDef(c.dataset.av); if(def) drawAvatar(c,def); });
}
function drawAvatar(canvas,look){
  const x=canvas.getContext('2d'); x.clearRect(0,0,34,34); x.fillStyle='#161426'; x.fillRect(0,0,34,34);
  x.fillStyle=look.skin; x.beginPath(); x.arc(17,15,9,0,7); x.fill();
  x.fillStyle=look.hair; x.fillRect(8,6,18,7);
  x.fillStyle=look.shirt; x.fillRect(8,22,18,10);
  x.fillStyle='#1d1626'; x.beginPath(); x.arc(14,15,1.5,0,7); x.arc(20,15,1.5,0,7); x.fill();
}
function renderSave(){
  genActions={};
  let body=`<h2>💾 Save</h2><div class="sub">Profile: <b>${S.name}</b> · auto-saves to this device.</div>`;
  body+=lifeTabBar();
  body+=`<label>Transfer code</label><div class="sub" style="margin-bottom:6px">Copy this to move your game to another device, then paste it into "Load code" there.</div>`;
  body+=`<textarea id="saveCode" readonly>${makeCode()}</textarea>`;
  body+=`<button class="bigbtn" data-g="copy" style="margin-top:10px">Copy code 📋</button>`;
  body+=`<label>Load a code</label><textarea id="loadCode" placeholder="Paste a transfer code…"></textarea>`;
  body+=`<button class="bigbtn" data-g="load" style="margin-top:10px;background:linear-gradient(135deg,#7a5bd6,#5b6bd6);color:#fff">Load code ⬇️</button>`;
  body+=`<button class="linkbtn" data-g="switch">Switch / create another profile</button>`;
  body+=`<button class="closebtn" data-g="close">Close</button>`;
  wireLifeTabs(); genActions.close=closeModal;
  genActions.copy=()=>{ const t=el('saveCode'); t.select(); try{ document.execCommand('copy'); }catch(e){} navigator.clipboard&&navigator.clipboard.writeText(t.value); toast('Copied! 📋'); };
  genActions.load=()=>{ const v=el('loadCode').value.trim(); if(!v) return; loadCode(v); };
  genActions.switch=()=>{ save(); closeModal(); Profiles.show(); };
  openModal(body);
}
function makeCode(){ try{ return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }catch(e){ return ''; } }
function loadCode(code){
  try{ const obj=JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if(!obj.name||!obj.needs) throw 0;
    S=normalize(obj); save(); closeModal(); rebuildAll(); toast('✅ Loaded '+S.name+"'s game"); }
  catch(e){ toast('That code is invalid ❌'); SFX.err(); }
}

/* ============================================================ */
/*                    STATE / PROFILES                          */
/* ============================================================ */
function freshState(opts){
  const s={ v:3, name:opts.name, gender:opts.gender||'nb', skin:opts.skin, shirt:opts.shirt, hair:opts.hair, hairStyle:opts.hairStyle,
    scene:'home', px:0, py:0,
    needs:{hunger:82,energy:85,hygiene:80,bladder:78,fun:72,social:70},
    coins:500, level:1, xp:0, promoStreak:0, minutes:8*60, milestones:[],
    homeTier:0, upgrades:{}, homeLv:{bed:0,tv:0,kitchen:0,decor:0,bath:0},
    career:null, jobLvl:1, wardrobe:[], outfit:null, baseShirt:opts.shirt,
    degree:false, eduCredits:0, studying:null, business:null,
    present:NPCS.map(n=>n.id), movedAway:{}, lastDay:1,
    age:START_AGE, lifespan:Math.round(LIFE_MIN+Math.random()*(LIFE_MAX-LIFE_MIN)),
    members:[], mid:'founder', role:'You', surname:FAMILY_SURNAMES[Math.floor(Math.random()*FAMILY_SURNAMES.length)], generation:1,
    tree:[{tid:'t0', name:opts.name, gen:1, parents:[], alive:true}], tid:'t0', _tnext:1,
    vacay:null,
    services:{nanny:0,chef:0,maid:0}, kahunaUntil:0, cheatSocial:false, cheatRevealUntil:0,
    vehicles:[], vehicle:null, gifts:{},
    rels:{}, partner:null, kids:[], quests:[], stats:{}, warned:{} };
  return s;
}
function normalize(s){
  s.upgrades=s.upgrades||{}; s.vehicles=s.vehicles||[]; s.gifts=s.gifts||{}; s.rels=s.rels||{};
  s.kids=s.kids||[]; s.stats=s.stats||{}; s.warned=s.warned||{}; s.quests=s.quests||[];
  if(typeof s.homeTier!=='number') s.homeTier=0; if(typeof s.xp!=='number') s.xp=0;
  // v3: tiered home upgrades (migrate old booleans), careers, wardrobe
  if(!s.homeLv){
    s.homeLv={bed:0,tv:0,kitchen:0,decor:0,bath:0};
    const u=s.upgrades;
    if(u.kingbed) s.homeLv.bed=1; if(u.cinema) s.homeLv.tv=1;
    if(u.chef) s.homeLv.kitchen=1; if(u.zen) s.homeLv.decor=1;
  }
  s.career=s.career||null; if(typeof s.jobLvl!=='number') s.jobLvl=1;
  if(typeof s.promoStreak!=='number') s.promoStreak=0;
  s.wardrobe=s.wardrobe||[]; s.outfit=s.outfit||null;
  s.baseShirt=s.baseShirt||s.shirt;
  s.gender=s.gender||'nb'; s.milestones=s.milestones||[];
  if(typeof s.hairStyle!=='number'||s.hairStyle<0||s.hairStyle>=HAIRSTYLES.length) s.hairStyle=0;
  // wave 2: education + business
  s.degree=s.degree||false; if(typeof s.eduCredits!=='number') s.eduCredits=0;
  s.studying=s.studying||null; s.business=s.business||null;
  s.present=s.present||NPCS.map(n=>n.id); s.movedAway=s.movedAway||{};
  if(typeof s.lastDay!=='number') s.lastDay=Math.floor((s.minutes||480)/1440)+1;
  // wave 4: aging & generations
  if(typeof s.age!=='number') s.age=START_AGE;
  if(typeof s.lifespan!=='number') s.lifespan=Math.round(LIFE_MIN+Math.random()*(LIFE_MAX-LIFE_MIN));
  s.members=s.members||[]; s.mid=s.mid||'founder'; s.role=s.role||'You';
  s.surname=s.surname||FAMILY_SURNAMES[Math.floor(Math.random()*FAMILY_SURNAMES.length)];
  if(typeof s.generation!=='number') s.generation=1;
  s.stats=s.stats||{}; if(typeof s.stats.peakCoins!=='number') s.stats.peakCoins=Math.floor(s.coins||0);
  if(s.vacay===undefined) s.vacay=null;
  // wave 6: hired services + cheats
  s.services=s.services||{}; for(const k of ['nanny','chef','maid']) if(typeof s.services[k]!=='number') s.services[k]=0;
  if(typeof s.kahunaUntil!=='number') s.kahunaUntil=0;
  if(typeof s.cheatSocial!=='boolean') s.cheatSocial=false;
  if(typeof s.cheatRevealUntil!=='number') s.cheatRevealUntil=0;
  if(!s.tree||!s.tree.length){ s.tree=[{tid:'t0', name:s.name, gen:s.generation||1, parents:[], alive:true}]; s.tid='t0'; s._tnext=1; }
  if(!s.tid) s.tid='t0'; if(typeof s._tnext!=='number') s._tnext=s.tree.length;
  // migrate an existing spouse (NPC partner) into a controllable member
  if(s.partner && !s.members.some(m=>m.role==='Partner')){
    const pn=(NPCS.find(n=>n.id===s.partner)); if(pn) s.members.push(makeMember(pn,'Partner',s.age));
  }
  for(const k of (s.kids||[])){ if(typeof k.age!=='number') k.age = k.ageDays>=8?14:k.ageDays>=3?7:1; }
  for(const k of (s.kids||[])){ if(typeof k.grade!=='number') k.grade=0; k.atSchool=k.atSchool||null; if(typeof k.eduT!=='number') k.eduT=0; }
  // back-fill an existing family (spouse + kids) from saves that predate the tree, so they appear in it
  (()=>{ const fgen=s.generation||1; let nx=s._tnext||1;
    const seed=(name,gen,par)=>{ const tid='t'+(nx=nx+1); s.tree.push({tid, name, gen, parents:par, alive:true}); return tid; };
    const partner=(s.members||[]).find(m=>m.role==='Partner');
    if(partner && !partner.tid) partner.tid=seed(partner.name, fgen, []);
    const par=['t0'].concat(partner&&partner.tid?[partner.tid]:[]);
    (s.members||[]).forEach(m=>{ if(m.role!=='Partner' && !m.tid) m.tid=seed(m.name, fgen+1, par.slice()); });
    (s.kids||[]).forEach(k=>{ if(!k.tid) k.tid=seed(k.name, fgen+1, par.slice()); });
    s._tnext=nx; })();
  if(!s.quests.length) { S=s; seedQuests(); }
  return s;
}
function jobTitle(){
  if(S.business){ const d=BUSINESSES.find(x=>x.id===S.business.id); return (d?d.name:'Business')+(S.business.level>1?' (Lv'+S.business.level+')':''); }
  if(!S.career) return S.degree?'Graduate':'Unemployed';
  const c=CAREERS.find(x=>x.id===S.career);
  return (S.degree?'🎓 ':'')+RANKS[Math.min(S.jobLvl-1,RANKS.length-1)]+' '+(c?c.name:'');
}

/* ---- generations: members, ages, control switching ---- */
const PERSONAL=['name','gender','skin','shirt','hair','hairStyle','baseShirt','outfit','wardrobe','age','lifespan','needs','career','jobLvl','promoStreak','business','degree','eduCredits','level','xp','milestones'];
function makeMember(look, role, age){
  return { mid:'m'+Date.now().toString(36)+Math.floor(Math.random()*9999),
    role, name:look.name||role, gender:look.gender||'nb',
    skin:look.skin, shirt:look.shirt, hair:look.hair, hairStyle:(look.style!=null?look.style:look.hairStyle)||0, baseShirt:look.shirt,
    outfit:null, wardrobe:[], age:(age!=null?age:START_AGE), lifespan:Math.round(LIFE_MIN+Math.random()*(LIFE_MAX-LIFE_MIN)),
    needs:{hunger:80,energy:85,hygiene:80,bladder:78,fun:72,social:70},
    career:null, jobLvl:1, promoStreak:0, business:null, degree:false, eduCredits:0, level:1, xp:0, milestones:[] };
}
function treeAdd(name, gen, parents){ const tid='t'+(S._tnext=(S._tnext||1)+1); S.tree=S.tree||[]; S.tree.push({tid, name, gen, parents:parents||[], alive:true}); return tid; }
function treeNode(tid){ return (S.tree||[]).find(n=>n.tid===tid); }
function treeKill(tid){ const n=treeNode(tid); if(n) n.alive=false; }
function stageOf(age){ let s=LIFE_STAGES[0]; for(const st of LIFE_STAGES){ if(age>=st[0]) s=st; } return s; }
function ageLabel(age){ const s=stageOf(age); return Math.floor(age)+'y · '+s[2]+' '+s[1]; }
function switchTo(mid){
  const idx=(S.members||[]).findIndex(m=>m.mid===mid); if(idx<0) return;
  const target=S.members[idx];
  if(target.age<TEEN_AGE){ toast(target.name+' is too young to control'); SFX.err(); return; }
  const cur={}; for(const f of PERSONAL) cur[f]=S[f]; cur.mid=S.mid; cur.role=S.role; cur.tid=S.tid;
  for(const f of PERSONAL){ if(target[f]!==undefined) S[f]=target[f]; }
  S.mid=target.mid; S.role=target.role; if(target.tid) S.tid=target.tid;
  S.members[idx]=cur;
  buildNeedsUI(); if(scene&&(scene.type==='home'||scene.type==='vacation')) buildHomies();
  closeModal(); updateHUDNow(); save();
  SFX.good(); burst(vw/2,vh/3,'spark'); toast('🔄 Now living as '+S.name+' ('+ageLabel(S.age)+')');
}
function showMemberSheet(mid){
  const m=(S.members||[]).find(x=>x.mid===mid); if(!m) return;
  sheetActions={};
  let body=sheetHead(stageOf(m.age)[2], m.name, m.role+' · '+ageLabel(m.age));
  const add=(icon,title,sub,id,fn,dis)=>{ body+=item(icon,title,sub,null,`data-a="${id}"${dis?' disabled':''}`); sheetActions[id]=fn; };
  if(m.age>=TEEN_AGE){
    add('🔄','Live as '+m.name,'Take control of their life','sw',()=>switchTo(mid));
  } else add('🌱','Still growing up','Controllable once a teen','x0',()=>{});
  add('💬','Spend time together','+fun +social for you','t',()=>{
    action={kind:'timed',icon:'👨‍👧',label:'Time with '+m.name,fx:{fun:18,social:18,energy:-4},total:18,left:18,
      done:()=>{ burst(S.px-cam.x,S.py-cam.y-30,'heart'); SFX.heart(); addXP(10); toast('💞 Lovely time with '+m.name+'!'); }};
    closeSheet(); });
  add('✖️','Close','','x',closeSheet);
  openSheet(body); bindSheet();
}

function save(){ if(!S||!profileId) return; try{ localStorage.setItem('pl-save-'+profileId, JSON.stringify(S)); }catch(e){} }
function rebuildAll(){
  if(S.scene==='vacation' && S.vacay) buildVacation();
  else if(S.scene==='town') buildTown();
  else { S.scene='home'; buildHome(); }
  const sp=S.scene==='vacation'?(scene.vac?scene.vac.spawn:[7,7]):S.scene==='town'?TOWN_SPAWN:homeDef().spawn;
  if(!S.px){ S.px=(sp[0]+.5)*T; S.py=(sp[1]+.5)*T; }
  buildNeedsUI(); centerCam(true); refreshLifeDot(); updateAwayChip();
}

/* needs UI */
const barEls={};
function buildNeedsUI(){ const box=el('needs'); box.innerHTML=''; for(const d of NEEDS){ const div=document.createElement('div'); div.className='need';
  div.innerHTML='<span class="ic">'+d.ic+'</span><span class="lbl">'+d.lbl+'</span><div class="bar"><i></i></div>'; box.appendChild(div); barEls[d.k]=div.querySelector('i'); }
  // zoom control: a + / − stack tucked into the gap between the two needs columns
  const z=document.createElement('div'); z.id='zoomCtl';
  z.innerHTML='<button id="zoomIn" aria-label="Zoom in">+</button><button id="zoomOut" aria-label="Zoom out">−</button>';
  box.appendChild(z);
  z.querySelector('#zoomIn').onclick=()=>setZoom(1.18);
  z.querySelector('#zoomOut').onclick=()=>setZoom(1/1.18);
}
let hudT=0;
function updateHUD(){
  if(!S) return; const now=performance.now(); if(now-hudT<180) return; hudT=now;
  for(const d of NEEDS){ const v=S.needs[d.k]; const b=barEls[d.k]; if(!b) continue; b.style.width=v+'%';
    b.style.background=v>50?'#5ee07a':v>25?'#ffb84d':'#ff5d6c'; }
  const moodEl=document.querySelector('#who .mood'); moodEl.textContent=moodEmoji(); moodEl.classList.toggle('glow',mood()>=78);
  document.querySelector('#who .nm').textContent=S.name;
  el('lvlBadge').textContent='Lv '+S.level+' · '+Math.floor(S.age||START_AGE)+'y · '+jobTitle();
  const day=Math.floor(S.minutes/1440)+1, hh=String(Math.floor(S.minutes/60)%24).padStart(2,'0'), mm=String(Math.floor(S.minutes%60)).padStart(2,'0');
  el('clock').innerHTML='<b>Day '+day+'</b><br>'+hh+':'+mm;
  el('coins').textContent='💰 '+Math.floor(S.coins);
  el('xpBar').style.width=(S.xp/(80+S.level*40)*100)+'%';
  el('outBtn').innerHTML = scene&&scene.type==='vacation' ? '✈️ Fly Home' : scene&&scene.type==='town' ? '🏠 Home' : '🚪 Go Out';
}
function updateHUDNow(){ hudT=0; updateHUD(); }

/* ============================================================ */
/*                        INPUT                                 */
/* ============================================================ */
/* Input: one finger drags to pan the map (free camera), a quick double-tap on open
   ground walks you there, a single tap uses furniture/people. Two fingers pinch to
   zoom. The page itself never scrolls/zooms — #cv has touch-action:none. */
const activePtrs=new Map();
let dragStart=null, dragged=false, panLast=null, pinchStart=null;
let lastTap={t:0,c:-9,r:-9};
function ptrDist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }

cv.addEventListener('pointerdown',e=>{
  if(!S||!scene) return;
  cv.setPointerCapture&&cv.setPointerCapture(e.pointerId);
  activePtrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(activePtrs.size===2){ const p=[...activePtrs.values()]; pinchStart={d:ptrDist(p[0],p[1]),zoom}; dragStart=null; panLast=null; return; }
  if(!AC){ blip(1,0.001,'sine',0.0001); } // unlock audio on first touch
  dragStart={x:e.clientX,y:e.clientY}; dragged=false; panLast={x:e.clientX,y:e.clientY};
});
cv.addEventListener('pointermove',e=>{
  if(!S||!scene||!activePtrs.has(e.pointerId)) return;
  activePtrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pinchStart&&activePtrs.size>=2){ const p=[...activePtrs.values()]; const d=ptrDist(p[0],p[1]);
    if(pinchStart.d>0){ zoom=clamp(pinchStart.zoom*(d/pinchStart.d),Z_MIN,Z_MAX); resize(); if(camFree) clampCam(); else centerCam(true); } return; }
  if(!dragStart) return;
  if(!dragged && Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)>7) dragged=true;
  if(dragged){ camFree=true; cam.x-=(e.clientX-panLast.x)/scale; cam.y-=(e.clientY-panLast.y)/scale; panLast={x:e.clientX,y:e.clientY}; clampCam(); }
});
function endPtr(e){
  const wasPinch=pinchStart&&activePtrs.size>=2;
  activePtrs.delete(e.pointerId); if(activePtrs.size<2) pinchStart=null;
  const ds=dragStart, wasDrag=dragged; dragStart=null; panLast=null;
  if(wasPinch||!ds||wasDrag) return;   // a pinch or a pan — not a tap
  handleTap(e);
}
cv.addEventListener('pointerup',endPtr);
cv.addEventListener('pointercancel',e=>{ activePtrs.delete(e.pointerId); pinchStart=null; dragStart=null; });

function handleTap(e){
  if(S.atWork||S.hospital||S.studying||paused||transition>0) return;
  const rect=cv.getBoundingClientRect();
  const wx=(e.clientX-rect.left)/scale+cam.x, wy=(e.clientY-rect.top)/scale+cam.y;
  const c=Math.floor(wx/T), r=Math.floor(wy/T);
  // npc? (forgiving: snap to nearest NPC within ~1.4 tiles of the tap)
  if(scene.type==='town'){
    let best=null, bestD=T*1.4;
    for(const n of npcSprites){ const dd=Math.hypot(n.px-wx,n.py-wy); if(dd<bestD){ bestD=dd; best=n; } }
    if(best){ tapNPC(best); return; }
    const door=scene.doors.get(c+','+r); if(door&&door.startsWith('B:')){ camFree=false; goNextTo(c,r,()=>enterBuilding(door.slice(2))); return; }
  } else {
    // partner / kid at home?
    let best=null, bestD=T*1.3;
    for(const n of homies){ const dd=Math.hypot(n.px-wx,n.py-wy); if(dd<bestD){ bestD=dd; best=n; } }
    if(best){ SFX.tap(); const tc=Math.floor(best.px/T), tr=Math.floor(best.py/T); camFree=false;
      goNextTo(tc,tr,()=> best.kind==='partner'?showNPCSheet(S.partner): best.kind==='grown'?showMemberSheet(best.mid): best.kind==='staff'?showServiceWorker(best.svc): showKidSheet(best.idx)); return; }
  }
  // furniture?
  const o=scene.furnAt.get(c+','+r); if(o){ camFree=false; tapObject(o); return; }
  // hidden cheat tiles by the bed (taps here never walk)
  if(scene.type==='home' && cheatTileTap(c,r)) return;
  // empty walkable tile → DOUBLE-tap to walk there (single tap just confirms the spot)
  if(walkable(c,r)){
    const now=performance.now();
    if(now-lastTap.t<360 && Math.abs(lastTap.c-c)<=1 && Math.abs(lastTap.r-r)<=1){
      lastTap.t=0; pendingMove=null; camFree=false; SFX.tap(); goTo(c,r,null);
    } else { lastTap={t:now,c,r}; pendingMove={c,r,t:now}; blip(420,0.04,'sine',0.02); }
  }
}
function drawCheatHint(){
  if(!scene||scene.type!=='home'||!revealActive()) return;
  const tiles=(homeDef().cheat)||[];
  for(const [c,r] of tiles){ const x=(c+.5)*T-cam.x, y=(r+.5)*T-cam.y; const p=performance.now()/300;
    ctx.fillStyle='rgba(255,215,120,'+(0.30+0.20*Math.sin(p+(c+r))).toFixed(2)+')';
    ctx.beginPath(); ctx.arc(x,y,5+Math.sin(p)*1.5,0,7); ctx.fill();
    ctx.font='9px -apple-system'; ctx.textAlign='center'; ctx.fillStyle='rgba(255,235,170,.85)'; ctx.fillText('✦',x,y-9); ctx.textAlign='left';
  }
}
function drawMoveHint(){
  if(!pendingMove) return;
  const age=performance.now()-(pendingMove.t||0);
  if(age>700){ pendingMove=null; return; }
  const x=(pendingMove.c+.5)*T-cam.x, y=(pendingMove.r+.5)*T-cam.y;
  const a=Math.max(0,1-age/700), rad=7+7*(age/700);
  ctx.strokeStyle='rgba(255,232,160,'+(0.8*a).toFixed(2)+')'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(x,y,rad,0,7); ctx.stroke();
  ctx.fillStyle='rgba(255,232,160,'+(0.5*a).toFixed(2)+')'; ctx.beginPath(); ctx.arc(x,y,2.5,0,7); ctx.fill();
}

/* buttons (wired from index via Game.* ) */
function toggleOut(){ if(!S||S.atWork||S.hospital||S.studying||transition>0) return; SFX.tap();
  if(scene.type==='vacation') flyHome();
  else if(scene.type==='town') gotoScene('home', homeDef().spawn);
  else gotoScene('town', TOWN_SPAWN);
}
function quickWork(){ if(!S||S.hospital||S.atWork||S.studying) return; SFX.tap();
  if(kahunaActive()){ const pay=S.career||S.business?shiftPay():200; addCoins(pay); SFX.coin(); burst(S.px-cam.x,S.py-cam.y-30,'coin','+'+pay+'💰'); toast('🌟 Big Kahuna — paid '+pay+'💰 without lifting a finger!'); save(); return; }
  if(scene.type==='vacation'){ toast("You're on vacation — enjoy it! 🌴"); return; }
  if(scene.type==='town'){ const b=BUILDINGS.find(x=>x.id==='office'); goNextTo(b.door[0],b.door[1],()=>showWorkSheet()); }
  else { toast('Head out 🚪 to reach the office 💼'); }
}
function toggleSpeed(){ speed=speed===1?3:1; el('speedBtn').textContent=speed===1?'▶︎ 1×':'⏩ 3×'; }
function togglePause(){ userPaused=!userPaused; const b=el('pauseBtn'); if(b) b.textContent=userPaused?'▶️':'⏸';
  const ov=el('pauseOverlay'); if(ov) ov.classList.toggle('show',userPaused); }

/* ============================================================ */
/*                    PROFILE / LOGIN UI                        */
/* ============================================================ */
const Profiles=(()=>{
  function all(){ try{ return JSON.parse(localStorage.getItem('pl-profiles')||'{}'); }catch(e){ return {}; } }
  function setAll(o){ localStorage.setItem('pl-profiles', JSON.stringify(o)); }
  function show(){
    const m=el('profileModal'); const list=el('profileList'); list.innerHTML='';
    const ps=all(); const ids=Object.keys(ps);
    if(!ids.length){ list.innerHTML=`<p style="color:#bdb6d6;font-size:13px;margin-bottom:6px">No profiles yet — create your first life below.</p>`; }
    ids.forEach(id=>{ const p=ps[id]; const btn=document.createElement('button'); btn.className='profcard';
      btn.innerHTML=`<canvas class="pfava" width="42" height="42"></canvas><div style="flex:1;min-width:0"><b>${p.name}</b><span>Lv ${p.level||1} · ${p.coins||0}💰 · ${p.tag||'Resident'}</span></div><span style="color:#8d87a6">▶</span>`;
      drawAvatar2(btn.querySelector('canvas'),p.look); btn.onclick=()=>login(id); list.appendChild(btn);
      // long-press to delete
      let lp; btn.addEventListener('pointerdown',()=>{ lp=setTimeout(()=>{ if(confirm('Delete profile "'+p.name+'"?')){ del(id); show(); } },650); });
      ['pointerup','pointerleave','pointermove'].forEach(ev=>btn.addEventListener(ev,()=>clearTimeout(lp)));
    });
    m.classList.add('show');
  }
  function drawAvatar2(canvas,look){ if(!look) return; const x=canvas.getContext('2d'); x.clearRect(0,0,42,42);
    x.fillStyle=look.skin; x.beginPath(); x.arc(21,19,11,0,7); x.fill(); x.fillStyle=look.hair; x.fillRect(10,7,22,9);
    x.fillStyle=look.shirt; x.fillRect(9,28,24,12); x.fillStyle='#1d1626'; x.beginPath(); x.arc(17,19,2,0,7); x.arc(25,19,2,0,7); x.fill(); }
  function login(id){ const ps=all(); if(!ps[id]) return; profileId=id;
    let saved=null; try{ saved=JSON.parse(localStorage.getItem('pl-save-'+id)); }catch(e){}
    if(!saved){ saved=freshState(ps[id].look?{...ps[id].look,name:ps[id].name}:{name:ps[id].name,skin:SKINS[2],shirt:SHIRTS[1],hair:HAIRC[1],hairStyle:0}); }
    S=normalize(saved); if(!S.quests.length) seedQuests();
    localStorage.setItem('pl-last',id);
    el('profileModal').classList.remove('show'); begin();
  }
  function create(meta,state){ const ps=all(); const id='p'+Date.now().toString(36); ps[id]={name:meta.name, look:meta, level:1, coins:500, tag:'New in town'}; setAll(ps);
    profileId=id; S=state; save(); syncMeta(); localStorage.setItem('pl-last',id); el('profileModal').classList.remove('show'); begin(); }
  function del(id){ const ps=all(); delete ps[id]; setAll(ps); localStorage.removeItem('pl-save-'+id); }
  function syncMeta(){ if(!profileId||!S) return; const ps=all(); if(ps[profileId]){ ps[profileId].level=S.level; ps[profileId].coins=Math.floor(S.coins);
    ps[profileId].tag=S.partner?'Married':(S.kids&&S.kids.length?'Parent':jobTitle()); setAll(ps); } }
  return {show, create, login, syncMeta, all};
})();

/* creator */
function showCreate(replace){
  el('profileModal').classList.remove('show');
  const m=el('createModal'); m.classList.add('show');
  const pick={gender:'f', skin:SKINS[2], shirt:SHIRTS[6], hair:HAIRC[6], hairStyle:4};
  const pcv=el('previewCv'); pcv.width=120; pcv.height=124;
  const pctx=pcv.getContext('2d');
  function rrp(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); c.fill(); }
  function drawPrev(){ pctx.clearRect(0,0,120,124);
    const x=60,y=96, st=pick.hairStyle, dress=pick.gender==='f'&&(st===3||st===4||st===5);
    pctx.fillStyle='rgba(0,0,0,.2)'; pctx.beginPath(); pctx.ellipse(x,y+2,16,6,0,0,7); pctx.fill();
    pctx.fillStyle='#3a3550'; pctx.fillRect(x-12,y-16,10,16); pctx.fillRect(x+2,y-16,10,16);
    pctx.fillStyle=pick.shirt; rrp(pctx,x-18,y-50,36,36,8);
    if(dress){ pctx.fillStyle=pick.shirt; pctx.beginPath(); pctx.moveTo(x-15,y-22); pctx.lineTo(x+15,y-22); pctx.lineTo(x+26,y-1); pctx.lineTo(x-26,y-1); pctx.closePath(); pctx.fill(); }
    pctx.fillStyle=pick.skin; rrp(pctx,x-18,y-86,36,36,12);
    pctx.fillStyle=pick.hair;
    if(st!==6){
      rrp(pctx,x-18,y-86,36,16,10);
      if(st===1){ rrp(pctx,x-18,y-86,9,36,5); rrp(pctx,x+9,y-86,9,36,5); }
      if(st===2){ for(let i=0;i<4;i++){ pctx.beginPath(); pctx.moveTo(x-14+i*9,y-72); pctx.lineTo(x-18+i*9,y-92); pctx.lineTo(x-6+i*9,y-74); pctx.closePath(); pctx.fill(); } }
      if(st===3){ rrp(pctx,x-20,y-86,11,28,5); rrp(pctx,x+9,y-86,11,28,5); rrp(pctx,x-20,y-62,40,7,3); }
      if(st===4){ rrp(pctx,x+11,y-84,9,30,4); }
      if(st===5){ pctx.beginPath(); pctx.arc(x-13,y-86,9,0,7); pctx.arc(x+13,y-86,9,0,7); pctx.fill(); }
    } else { pctx.fillStyle='rgba(255,255,255,.12)'; pctx.beginPath(); pctx.arc(x-5,y-78,6,0,7); pctx.fill(); }
    pctx.fillStyle='#1d1626'; pctx.beginPath(); pctx.arc(x-7,y-66,3,0,7); pctx.arc(x+7,y-66,3,0,7); pctx.fill();
    if(pick.gender==='f'){ pctx.strokeStyle='#1d1626'; pctx.lineWidth=1.5; pctx.beginPath(); pctx.moveTo(x-11,y-69); pctx.lineTo(x-8,y-67); pctx.moveTo(x+11,y-69); pctx.lineTo(x+8,y-67); pctx.stroke(); }
  }
  drawPrev();
  function sw(elid,colors,key){ const box=el(elid); box.innerHTML=''; colors.forEach(col=>{ const b=document.createElement('button'); b.className='sw'+(pick[key]===col?' sel':''); b.style.background=col;
    b.onclick=()=>{ pick[key]=col; box.querySelectorAll('.sw').forEach(s=>s.classList.remove('sel')); b.classList.add('sel'); drawPrev(); }; box.appendChild(b); }); }
  const gBox=el('genderSw'); gBox.innerHTML=''; GENDERS.forEach(g=>{ const b=document.createElement('button'); b.className='pill'+(pick.gender===g.id?' sel':''); b.textContent=g.icon+' '+g.label;
    b.onclick=()=>{ pick.gender=g.id; gBox.querySelectorAll('.pill').forEach(p=>p.classList.remove('sel')); b.classList.add('sel'); drawPrev(); }; gBox.appendChild(b); });
  sw('skinSw',SKINS,'skin'); sw('shirtSw',SHIRTS,'shirt'); sw('hairSw',HAIRC,'hair');
  const hsBox=el('hairStyleSw'); hsBox.innerHTML=''; HAIRSTYLES.forEach((nm,i)=>{ const b=document.createElement('button'); b.className='pill'+(pick.hairStyle===i?' sel':''); b.textContent=nm;
    b.onclick=()=>{ pick.hairStyle=i; hsBox.querySelectorAll('.pill').forEach(p=>p.classList.remove('sel')); b.classList.add('sel'); drawPrev(); }; hsBox.appendChild(b); });
  el('startBtn').onclick=()=>{ const name=(el('nameInput').value.trim()||'Alex').slice(0,12);
    const meta={name,...pick}; const st=freshState(meta); S=st; seedQuests();
    m.classList.remove('show');
    if(replace && profileId){ save(); Profiles.syncMeta && Profiles.syncMeta(); begin(); }   // new life, same profile
    else Profiles.create(meta,st);
    toast('Tap furniture to interact 👆'); setTimeout(()=>toast('Tap 🚪 Go Out to explore town'),3000);
  };
  el('backToProfiles').onclick=()=>{ m.classList.remove('show'); if(!replace) Profiles.show(); };
}

/* ============================================================ */
/*                          BOOT                                */
/* ============================================================ */
function begin(){
  // welcome-back kindness: nobody returns to a miserable sim
  let rested=false;
  for(const d of NEEDS){ if(S.needs[d.k]<55){ S.needs[d.k]=55+Math.random()*20; rested=true; } }
  for(const k of (S.kids||[])) if((k.happy||0)<55) k.happy=60;
  rebuildAll();
  resize();
  Profiles.syncMeta();
  toast(rested ? '☀️ '+S.name+' rested up while you were away' : 'Welcome back, '+S.name+' 👋');
}
function loop(now){
  const dt=Math.min(0.05,(lastFrame? (now-lastFrame)/1000 : 0)); lastFrame=now;
  if(S&&!paused&&!userPaused){ moveSim(dt); tickNPCs(dt); tickHomies(dt); tick(dt); updateParts(dt); if(!camFree) centerCam(false); }
  if(transition>0){ transition-=dt*3.2; if(transition<=0.5&&transitionTo){ transitionTo(); transitionTo=null; } if(transition<0) transition=0; }
  draw(); updateHUD();
  requestAnimationFrame(loop);
}
let lastFrame=0;
window.addEventListener('resize',()=>{ if(S) resize(); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&S){ save(); Profiles.syncMeta(); } });
setInterval(()=>{ if(S){ save(); Profiles.syncMeta(); } },6000);

// public API
return {
  bootProfiles:()=>Profiles.show(),
  showCreate,
  toggleOut, quickWork, toggleSpeed, togglePause,
  openShop, openQuests, openFamily, openHelp,
  zoomIn:()=>setZoom(1.18), zoomOut:()=>setZoom(1/1.18), recenter:()=>{ camFree=false; },
  startLoop:()=>requestAnimationFrame(loop),
  _dbg:()=>({S, scene, homies, npcCount:npcSprites.length, rebuild:()=>{ if(scene.type==='home') buildHome(); else buildTown(); },
    enter:(bid)=>enterBuilding(bid), uni:()=>showUniversity(), biz:()=>showBusinessCenter(), school:()=>showSchool(),
    endStudy:()=>endStudy(), bizDay:()=>{ S.atWork={biz:true,bonus:1}; endWork(); },
    pathLen:()=>path.length, pending:()=>pendingMove, stepSim:(n)=>{ for(let i=0;i<(n||30);i++){ moveSim(0.05); } },
    ageUp:(n)=>ageEveryone(n||1), die:()=>{ S.age=S.lifespan+1; checkDeaths(); }, switchTo:(mid)=>switchTo(mid), passOn:()=>passOn(),
    travel:()=>showTravelAgency(), fly:(id)=>flyTo(VACATIONS.find(v=>v.id===id)), flyHome:()=>flyHome(),
    forceScene:(t)=>{ S.scene=t; if(t==='vacation') buildVacation(); else if(t==='town') buildTown(); else buildHome();
      const v=scene.vac, sp=t==='vacation'?(v?v.spawn:[7,7]):t==='town'?TOWN_SPAWN:homeDef().spawn;
      S.px=(sp[0]+.5)*T; S.py=(sp[1]+.5)*T; transition=0; centerCam(true); }}),
};
})();
