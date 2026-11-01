import * as THREE from 'three';
import {initAudio,sfx,startMusic,stopMusic,setBossMusic,setSound,soundOn} from './audio.js';

const $=id=>document.getElementById(id);
THREE.ColorManagement.enabled=true;
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',precision:'highp'});
// Mismo aspecto en Android e iOS: espacio de color, tone mapping y pixelRatio fijos
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;renderer.toneMappingExposure=1;
const PIXEL_RATIO=Math.min(window.devicePixelRatio||1,2);renderer.setPixelRatio(PIXEL_RATIO);
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x2a1350);
scene.fog=new THREE.Fog(0x3a1a66,30,90);
const camera=new THREE.PerspectiveCamera(42,1,0.1,200);
// Re-maquetar en cualquier cambio de tamaño/orientación (iOS no siempre avisa a tiempo)
let vw=0,vh=0,portrait=false;
function viewSize(){const vv=window.visualViewport;const w=Math.round(document.documentElement.clientWidth||innerWidth),h=Math.round(vv&&vv.scale===1?vv.height:(innerHeight||document.documentElement.clientHeight));return [Math.max(1,w),Math.max(1,h)];}
function resize(){const [w,h]=viewSize();if(w===vw&&h===vh)return;vw=w;vh=h;renderer.setSize(w,h);camera.aspect=w/h;portrait=w/h<1;
  camera.fov=portrait?60:w/h<1.5?52:42;camera.updateProjectionMatrix();document.documentElement.classList.toggle('portrait',portrait);
  const hint=document.getElementById('rotHint');if(hint)hint.classList.toggle('hidden',!portrait||hintClosed);}
let hintClosed=false;
addEventListener('resize',resize);addEventListener('orientationchange',()=>{resize();[100,300,700].forEach(t=>setTimeout(resize,t));});
if(window.visualViewport){visualViewport.addEventListener('resize',resize);}
resize();

// ---------- Materiales toon ----------
const grad=new THREE.DataTexture(new Uint8Array([90,90,90,255,170,170,170,255,255,255,255,255]),3,1,THREE.RGBAFormat);
grad.minFilter=grad.magFilter=THREE.NearestFilter;grad.needsUpdate=true;
const toon=(c,e=0)=>new THREE.MeshToonMaterial({color:c,gradientMap:grad,emissive:e});
const shared={};const sm=(c,e=0)=>shared[c+'_'+e]||(shared[c+'_'+e]=toon(c,e));
const sun=new THREE.DirectionalLight(0xffe0c0,1.1);sun.position.set(-6,12,10);scene.add(sun);
const playerLight=new THREE.PointLight(0xff9a30,1.2,14);scene.add(playerLight);

const G={box:new THREE.BoxGeometry(1,1,1),sph:new THREE.SphereGeometry(1,16,12),cyl:new THREE.CylinderGeometry(1,1,1,12),cone:new THREE.ConeGeometry(1,1,12),ico:new THREE.IcosahedronGeometry(1,0)};
function mesh(g,m,sx=1,sy=1,sz=1,x=0,y=0,z=0,p){const o=new THREE.Mesh(g,m);o.scale.set(sx,sy,sz);o.position.set(x,y,z);if(p)p.add(o);return o;}

// ---------- Niveles ----------
let LEVEL_END=250, ARENA_X=228, platforms=[], curLevel=1, curLv=null, diff=1, diffHp=1, LV=null;
const LEVELS=[null,
 {id:1,name:'El Cementerio',boss:'REY CALABAZA',end:250,arena:228,bg:0x2a1350,fog:0x3a1a66,hemi:[0xb9a0ff,0x302040],diff:1,hp:1,music:0,
  platforms:[{x:30,w:5,y:2.2},{x:38,w:4,y:3.8},{x:62,w:6,y:2.4},{x:95,w:5,y:2.2},{x:102,w:5,y:4},{x:135,w:7,y:2.6},{x:170,w:5,y:2.2},{x:177,w:5,y:4.2},{x:200,w:6,y:2.4}],
  plan:[[18,'zombi',3],[28,'murcielago',3],[40,'zombi',4],[52,'fantasma',2],[60,'esqueleto',2],[72,'murcielago',5],[84,'zombi',5],[92,'calabazon',1],[105,'fantasma',3],[115,'esqueleto',3],[125,'murcielago',4],[138,'zombi',6],[148,'calabazon',1],[156,'fantasma',3],[165,'esqueleto',3],[178,'murcielago',6],[188,'zombi',6],[198,'calabazon',2],[208,'esqueleto',2],[214,'fantasma',4]],
  loot:[12,34,58,88,110,140,172,205],hearts:[80,160],bombs:[100,190]},
 {id:2,name:'La Mansión Encantada',boss:'SEÑOR ESPECTRO',end:280,arena:256,bg:0x140814,fog:0x24102a,hemi:[0xffc890,0x201020],diff:1.12,hp:1.25,music:1,
  platforms:[{x:24,w:5,y:2.4},{x:46,w:4,y:3.4},{x:54,w:4,y:5},{x:80,w:6,y:2.4},{x:112,w:5,y:2.6},{x:120,w:5,y:4.4},{x:150,w:7,y:2.4},{x:185,w:5,y:2.4},{x:193,w:5,y:4.2},{x:225,w:6,y:2.6}],
  plan:[[16,'libro',3],[26,'arana',2],[36,'armadura',2],[46,'vela',2],[56,'libro',5],[66,'fantasma',3],[76,'arana',3],[88,'armadura',3],[98,'vela',3],[108,'libro',5],[120,'esqueleto',2],[130,'arana',4],[142,'armadura',3],[152,'fantasma',4],[164,'vela',3],[176,'libro',6],[188,'arana',4],[200,'armadura',4],[212,'calabazon',1],[222,'vela',3],[234,'libro',6],[242,'armadura',2]],
  loot:[14,40,70,100,130,160,195,230],hearts:[90,175,240],bombs:[60,150,220]},
 {id:3,name:'El Pantano de la Bruja',boss:'BRUJA SUPREMA',end:300,arena:276,bg:0x0e2418,fog:0x1a3a28,hemi:[0xa0ffb0,0x102018],diff:1.25,hp:1.5,music:2,
  platforms:[{x:28,w:5,y:2.2},{x:50,w:5,y:3.2},{x:58,w:4,y:4.8},{x:90,w:6,y:2.4},{x:126,w:5,y:2.4},{x:134,w:5,y:4.2},{x:168,w:7,y:2.6},{x:204,w:5,y:2.4},{x:212,w:5,y:4.4},{x:246,w:6,y:2.6}],
  plan:[[16,'rana',3],[26,'bruja',1],[36,'momia',2],[46,'rana',4],[56,'murcielago',4],[66,'bruja',2],[76,'momia',3],[86,'rana',5],[96,'fantasma',3],[108,'bruja',2],[118,'momia',4],[128,'rana',5],[140,'calabazon',1],[150,'bruja',3],[160,'momia',4],[172,'rana',6],[184,'murcielago',5],[196,'bruja',3],[208,'momia',5],[220,'calabazon',2],[232,'rana',6],[244,'bruja',3],[256,'momia',4],[264,'murcielago',5]],
  loot:[14,44,74,104,134,164,194,224,254],hearts:[100,190,262],bombs:[70,160,240]}];
const hemi=new THREE.HemisphereLight(0xb9a0ff,0x302040,0.9);scene.add(hemi);
function gtex(base,top,specks,grass,rep=70,planks=false){const cv=document.createElement('canvas');cv.width=256;cv.height=64;const c=cv.getContext('2d');
  c.fillStyle=base;c.fillRect(0,0,256,64);c.fillStyle=top;c.fillRect(0,0,256,14);
  if(planks){c.fillStyle='#2a1408';for(let x=0;x<256;x+=32)c.fillRect(x,0,3,14);}
  for(let i=0;i<60;i++){c.fillStyle=specks[i%3];c.fillRect(Math.random()*256,16+Math.random()*48,6+Math.random()*14,4);}
  if(grass)for(let i=0;i<40;i++){c.fillStyle=grass;c.fillRect(Math.random()*256,10,3,6+Math.random()*6);}
  const tex=new THREE.CanvasTexture(cv);tex.wrapS=THREE.RepeatWrapping;tex.repeat.set(rep,1);return tex;}
function buildLevel(L){
  if(curLv)scene.remove(curLv);
  const lv=new THREE.Group();scene.add(lv);curLv=lv;
  scene.background=new THREE.Color(L.bg);scene.fog=new THREE.Fog(L.fog,30,90);hemi.color.setHex(L.hemi[0]);hemi.groundColor.setHex(L.hemi[1]);
  LEVEL_END=L.end;ARENA_X=L.arena;platforms=L.platforms;
  const tex=L.id===1?gtex('#4a2a1a','#3a8a2a',['#5a3420','#3c2010','#6a4028'],'#52b03a'):L.id===2?gtex('#3a1e10','#7a4a28',['#4a2a14','#2e1608','#5a3418'],null,70,true):gtex('#22301a','#3a6a2a',['#2a3a1e','#1a2410','#3a4a20'],'#6ad04a');
  const gm=new THREE.MeshToonMaterial({map:tex,gradientMap:grad});
  mesh(new THREE.BoxGeometry(LEVEL_END+80,4,6),gm,1,1,1,LEVEL_END/2,-2,0,lv);
  mesh(G.box,sm(L.id===1?0x2a5a20:L.id===2?0x3a1a12:0x1a3a22),LEVEL_END+80,1,40,LEVEL_END/2,-0.6,-23,lv);
  const pc=L.id===1?[0x7a6a8a,0x5a4a6a]:L.id===2?[0x6a3a1a,0x4a2410]:[0x5a6a3a,0x3a4a24];
  for(const p of platforms){mesh(G.box,sm(pc[0]),p.w,0.6,2.4,p.x,p.y-0.3,0,lv);mesh(G.box,sm(pc[1]),p.w*0.15,p.y-0.6,1.2,p.x-p.w*0.35,(p.y-0.6)/2,0,lv);mesh(G.box,sm(pc[1]),p.w*0.15,p.y-0.6,1.2,p.x+p.w*0.35,(p.y-0.6)/2,0,lv);}
  const moon=mesh(G.sph,new THREE.MeshBasicMaterial({color:L.id===3?0xc8ff90:0xfff2b0,fog:false}),7,7,7,0,24,-80);lv.add(moon);G.moon=moon;
  const sp=[];for(let i=0;i<400;i++)sp.push((Math.random()-0.5)*400,10+Math.random()*60,-90-Math.random()*20);
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
  lv.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.6,fog:false})));
  if(L.id===1)decor1(lv);else if(L.id===2)decor2(lv);else decor3(lv);
  const sc=document.createElement('canvas');sc.width=256;sc.height=96;const s2=sc.getContext('2d');s2.fillStyle='#5a3418';s2.fillRect(0,0,256,96);s2.fillStyle='#ffb000';s2.font='bold 40px sans-serif';s2.textAlign='center';s2.fillText('PEKA',128,44);s2.font='bold 22px sans-serif';s2.fillStyle='#ffe';s2.fillText('Halloween',128,78);
  const sign=mesh(new THREE.PlaneGeometry(3,1.1),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(sc)}),1,1,1,4,2.4,-2,lv);mesh(G.box,sm(0x3a2010),0.15,2,0.15,4,1,-2.05,lv);
  const ac=sign.clone();ac.position.x=ARENA_X-6;lv.add(ac);
}
function decor1(lv){
  for(let i=-2;i<30;i++){const h=8+Math.random()*10;mesh(G.sph,sm(i%2?0x2b1a4a:0x24163e),14,h,6,i*12,-1,-40-Math.random()*8,lv);}
  for(let x=-10;x<LEVEL_END+20;x+=4+Math.random()*5){
    const z=-4-Math.random()*14,r=Math.random();
    if(r<0.3){const t=new THREE.Group();mesh(G.cyl,sm(0x2a1a14),0.35,5,0.35,0,2.5,0,t);
      for(let k=0;k<4;k++){const b=mesh(G.cyl,sm(0x2a1a14),0.12,2.4,0.12,0,3.5+k*0.5,0,t);b.rotation.z=(k%2?1:-1)*(0.7+Math.random()*0.4);b.position.x=(k%2?-1:1)*0.8;}
      if(Math.random()<0.5)mesh(G.sph,sm(0x4a2a6a),2,1.6,2,0,5.4,0,t);
      t.position.set(x,0,z);t.scale.setScalar(0.8+Math.random()*0.8);lv.add(t);}
    else if(r<0.6){const s=mesh(G.box,sm(0x8a8aa0),0.9,1.2+Math.random()*0.6,0.3,x,0.6,z,lv);s.rotation.z=(Math.random()-0.5)*0.3;mesh(G.cyl,sm(0x8a8aa0),0.45,0.3,0.45,0,0.5,0,s).rotation.x=Math.PI/2;}
    else if(r<0.85){makePumpkin(lv,x,z,0.5+Math.random()*0.5);}
    else{const h=new THREE.Group();mesh(G.box,sm(0x3a2a4a),4,4,3,0,2,0,h);const roof=mesh(G.cone,sm(0x5a1a2a),3.3,2.5,3.3,0,5.2,0,h);roof.rotation.y=Math.PI/4;
      for(const wx of[-1,1])mesh(G.box,sm(0xffcc33,0xffaa00),0.8,0.8,0.1,wx,2.6,1.55,h);mesh(G.box,sm(0x1a0a0a),0.9,1.6,0.1,0,0.8,1.55,h);
      h.position.set(x,0,z-6);lv.add(h);}
  }
  for(let x=-10;x<LEVEL_END+20;x+=1.2)mesh(G.box,sm(0x1a1020),0.15,1.4,0.15,x,0.7,-3,lv);
  mesh(G.box,sm(0x1a1020),LEVEL_END+30,0.12,0.1,LEVEL_END/2,1.1,-3,lv);
}
function decor2(lv){
  // pared con papel pintado, techo con vigas, cuadros, velas, estanterías, ventanas
  const cv=document.createElement('canvas');cv.width=64;cv.height=64;const c=cv.getContext('2d');c.fillStyle='#4a1a4a';c.fillRect(0,0,64,64);c.fillStyle='#6a2a6a';
  c.beginPath();c.moveTo(32,6);c.lineTo(50,32);c.lineTo(32,58);c.lineTo(14,32);c.fill();c.fillStyle='#3a103a';c.fillRect(0,0,4,64);
  const wt=new THREE.CanvasTexture(cv);wt.wrapS=wt.wrapT=THREE.RepeatWrapping;wt.repeat.set((LEVEL_END+80)/3,4);
  mesh(G.box,new THREE.MeshToonMaterial({map:wt,gradientMap:grad}),LEVEL_END+80,13,0.5,LEVEL_END/2,6.5,-8,lv);
  mesh(G.box,sm(0x2a1408),LEVEL_END+80,0.8,10,LEVEL_END/2,12.5,-3,lv);
  mesh(G.box,sm(0x5a2a10),LEVEL_END+80,0.6,0.6,LEVEL_END/2,0.3,-7.6,lv);
  for(let x=-10;x<LEVEL_END+20;x+=6)mesh(G.box,sm(0x3a1c0a),0.6,0.6,10,x,12,-3,lv);
  for(let x=-6;x<LEVEL_END+20;x+=5+Math.random()*4){const r=Math.random(),z=-7.5;
    if(r<0.25){const f=mesh(G.box,sm(0xc8a030,0x332200),2,2.6,0.2,x,5.5,z,lv);mesh(G.box,sm([0x3a5a8a,0x6a3a2a,0x2a5a3a][Math.floor(Math.random()*3)]),1.6,2.2,0.1,0,0,0.6,f);
      const eyes=Math.random()<0.6;if(eyes)for(const ex of[-0.15,0.15])mesh(G.sph,sm(0xff2020,0xff0000),0.06,0.06,0.3,ex,0.15,0.8,f);}
    else if(r<0.45){const g=new THREE.Group();mesh(G.cyl,sm(0xc8a030),0.08,2.4,0.08,0,1.2,0,g);mesh(G.box,sm(0xc8a030),1.4,0.1,0.1,0,2.3,0,g);
      for(const cx of[-0.65,0,0.65]){mesh(G.cyl,sm(0xf0eedc),0.09,0.4,0.09,cx,2.55,0,g);mesh(G.cone,sm(0xffcc33,0xff8800),0.08,0.22,0.08,cx,2.9,0,g);}g.position.set(x,0,-6.5);lv.add(g);}
    else if(r<0.7){const b=mesh(G.box,sm(0x4a2410),3,6,1,x,3,-7.2,lv);for(let k=0;k<4;k++){mesh(G.box,sm(0x2a1408),0.95,0.03,1,0,-0.35+k*0.24,0.05,b);for(let j=0;j<8;j++)mesh(G.box,sm(candyColors[(j+k)%6]),0.08,0.15,0.7,-0.4+j*0.11,-0.27+k*0.24,0.2,b);}}
    else if(r<0.85){const w=mesh(G.box,sm(0x6a8aff,0x2a3a88),2.2,3.4,0.2,x,6,z,lv);mesh(G.box,sm(0x2a1408),0.1,1,1.2,0,0,0.6,w);mesh(G.box,sm(0x2a1408),1,0.08,1.2,0,0,0.6,w);}
    else{const g=new THREE.Group();mesh(G.box,sm(0x5a2a10),1.2,4.5,0.8,0,2.25,0,g);mesh(G.cyl,sm(0xf0eedc),0.45,0.1,0.45,0,3.6,0.45,g).rotation.x=Math.PI/2;mesh(G.cyl,sm(0xc8a030),0.04,1.2,0.04,0,1.5,0.45,g);g.position.set(x,0,-6.8);lv.add(g);}
  }
  for(let x=10;x<LEVEL_END;x+=24){const g=new THREE.Group();mesh(G.cyl,sm(0xc8a030),0.04,2,0.04,0,1,0,g);mesh(G.cyl,sm(0xc8a030,0x332200),1.2,0.15,1.2,0,0,0,g);for(let k=0;k<6;k++){const a=k/6*Math.PI*2;mesh(G.cone,sm(0xffcc33,0xff8800),0.08,0.25,0.08,Math.cos(a),0.25,Math.sin(a),g);}g.position.set(x,9.5,-2);lv.add(g);}
  for(let x=0;x<LEVEL_END;x+=13){const w=mesh(new THREE.PlaneGeometry(2.5,2.5),new THREE.MeshBasicMaterial({color:0xdddddd,transparent:true,opacity:0.25,side:THREE.DoubleSide}),1,1,1,x,11,-7.6,lv);w.rotation.z=Math.PI/4;}
}
function decor3(lv){
  for(let i=-2;i<34;i++){mesh(G.sph,sm(i%2?0x14301e:0x10261a),14,6+Math.random()*8,6,i*12,-1,-40-Math.random()*8,lv);}
  const wm=new THREE.MeshToonMaterial({color:0x1a8a7a,gradientMap:grad,emissive:0x0a3a30,transparent:true,opacity:0.85});
  for(let x=0;x<LEVEL_END+20;x+=18)mesh(G.box,wm,8+Math.random()*6,0.1,4+Math.random()*4,x,0.05,-8,lv);
  for(let x=-10;x<LEVEL_END+20;x+=3+Math.random()*4){const z=-4-Math.random()*14,r=Math.random();
    if(r<0.3){const t=new THREE.Group();mesh(G.cyl,sm(0x2a2414),0.5,6,0.5,0,3,0,t);for(let k=0;k<3;k++){const b=mesh(G.cyl,sm(0x2a2414),0.15,2.6,0.15,(k-1)*0.7,4.5+k*0.4,0,t);b.rotation.z=(k-1)*0.8;}
      for(let k=0;k<3;k++)mesh(G.cone,sm(0x5a8a3a),0.25,1.6,0.25,(k-1)*1.1,4,0,t).rotation.z=Math.PI;t.position.set(x,0,z);t.scale.setScalar(0.8+Math.random()*0.7);lv.add(t);}
    else if(r<0.55){const c=[0x30ffe0,0xff40e0,0xb0ff30][Math.floor(Math.random()*3)];const g=new THREE.Group();mesh(G.cyl,sm(0xeeeedd),0.12,0.6,0.12,0,0.3,0,g);mesh(G.sph,sm(c,c&0x666666),0.45,0.25,0.45,0,0.65,0,g);g.position.set(x,0,z);g.scale.setScalar(0.8+Math.random()*1.2);lv.add(g);}
    else if(r<0.8){for(let k=0;k<5;k++){const rd=mesh(G.cyl,sm(0x4a7a2a),0.05,1.5+Math.random(),0.05,x+k*0.2,0.8,z,lv);rd.rotation.z=(Math.random()-0.5)*0.3;mesh(G.cyl,sm(0x5a3418),0.09,0.35,0.09,0,0.45,0,rd);}}
    else{const g=new THREE.Group();mesh(G.sph,sm(0x222222),1,0.8,1,0,0.8,0,g);mesh(G.cyl,sm(0x50ff50,0x20aa20),0.85,0.1,0.85,0,1.4,0,g);for(let k=0;k<3;k++)mesh(G.sph,sm(0x80ff80,0x30aa30),0.15,0.15,0.15,(k-1)*0.3,1.5,0,g);
      mesh(G.cone,sm(0xff6a00,0xff3300),0.4,0.6,0.4,0,0.1,0,g);g.position.set(x,0,z);lv.add(g);}}
  const fp=[];for(let i=0;i<300;i++)fp.push(Math.random()*(LEVEL_END+20),0.5+Math.random()*6,-2-Math.random()*16);
  const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.Float32BufferAttribute(fp,3));lv.add(new THREE.Points(fg,new THREE.PointsMaterial({color:0xd0ff60,size:0.18})));
}
function makePumpkin(p,x,z,s,lit=true){const g=new THREE.Group();
  for(let i=0;i<5;i++){const m=mesh(G.sph,sm(0xff7a10),0.55,0.8,0.8,(i-2)*0.28,0.75,0,g);}
  mesh(G.cyl,sm(0x2a6a10),0.08,0.35,0.08,0,1.55,0,g);
  if(lit){for(const ex of[-0.35,0.35])mesh(G.cone,sm(0xffe060,0xffaa00),0.14,0.2,0.05,ex,0.95,0.8,g);mesh(G.box,sm(0xffe060,0xffaa00),0.7,0.12,0.05,0,0.5,0.8,g);}
  g.position.set(x,0,z);g.scale.setScalar(s);p.add(g);return g;}

// ---------- Partículas ----------
const parts=[];const partGeo=new THREE.BoxGeometry(0.2,0.2,0.2);const pmats={};
function pmat(c){return pmats[c]||(pmats[c]=new THREE.MeshBasicMaterial({color:c}));}
for(let i=0;i<260;i++){const m=new THREE.Mesh(partGeo,pmat(0xffffff));m.visible=false;scene.add(m);parts.push({m,life:0,v:new THREE.Vector3()});}
let pi=0;
function burst(x,y,colors,n=12,sp=8,size=1,grav=18){for(let i=0;i<n;i++){const p=parts[pi=(pi+1)%parts.length];p.m.material=pmat(colors[i%colors.length]);p.m.visible=true;p.m.position.set(x,y,(Math.random()-0.5));p.v.set((Math.random()-0.5)*sp,Math.random()*sp*0.9,(Math.random()-0.5)*sp*0.5);p.life=0.4+Math.random()*0.5;p.max=p.life;p.s=size*(0.6+Math.random());p.g=grav;}}
function updParts(dt){for(const p of parts){if(p.life<=0)continue;p.life-=dt;if(p.life<=0){p.m.visible=false;continue;}p.v.y-=p.g*dt;p.m.position.addScaledVector(p.v,dt);p.m.rotation.x+=dt*8;p.m.rotation.y+=dt*6;p.m.scale.setScalar(p.s*(p.life/p.max));}}
const candyColors=[0xff3a8a,0x3ae0ff,0xffe03a,0x8aff3a,0xff8a00,0xc070ff];

// ---------- Jugador ----------
function makeKid(){const g=new THREE.Group();const body=new THREE.Group();g.add(body);
  mesh(G.sph,sm(0xff7a10),0.5,0.55,0.4,0,1.05,0,body); // sudadera naranja
  mesh(G.sph,sm(0xffd0a8),0.42,0.42,0.42,0,1.85,0,body); // cabeza
  mesh(G.sph,sm(0x6a3a1a),0.44,0.25,0.44,0,2.05,0,body);
  const hat=mesh(G.cone,sm(0x5a2a9a),0.5,0.8,0.5,0,2.45,0,body);hat.rotation.z=-0.25;mesh(G.cyl,sm(0x5a2a9a),0.6,0.06,0.6,0,2.12,0,body);
  for(const ez of[-0.12,0.12])mesh(G.sph,sm(0x111111),0.06,0.08,0.04,0.38,1.9,ez,body);
  mesh(G.sph,sm(0xffaaaa),0.05,0.04,0.04,0.42,1.75,0,body);
  const legL=new THREE.Group(),legR=new THREE.Group();legL.position.set(0,0.65,0.16);legR.position.set(0,0.65,-0.16);body.add(legL,legR);
  for(const L of[legL,legR]){mesh(G.box,sm(0x2a3a8a),0.22,0.55,0.2,0,-0.28,0,L);mesh(G.box,sm(0xeeeeee),0.32,0.12,0.22,0.05,-0.6,0,L);}
  const arm=new THREE.Group();arm.position.set(0.1,1.25,0.35);body.add(arm);
  mesh(G.box,sm(0xff7a10),0.5,0.16,0.16,0.25,0,0,arm);
  const gun=new THREE.Group();gun.position.set(0.6,0,0);arm.add(gun);
  mesh(G.cyl,sm(0xff3a8a),0.14,0.6,0.14,0.2,0,0,gun).rotation.z=Math.PI/2;
  mesh(G.sph,sm(0x3ae0ff),0.2,0.2,0.2,0,0.1,0,gun);mesh(G.cyl,sm(0xffe03a),0.17,0.1,0.17,0.5,0,0,gun).rotation.z=Math.PI/2;
  const bag=mesh(G.sph,sm(0xc070ff),0.3,0.35,0.25,-0.45,1.1,0,body);
  return {g,body,legL,legR,arm,bag};}
const kid=makeKid();scene.add(kid.g);
const P={x:2,y:0,vx:0,vy:0,face:1,ground:true,hp:5,inv:0,fireCd:0,bombs:3,aimUp:false,alive:true};

// ---------- Estado ----------
let playTime=0,state='menu',score=0,loot=0,enemies=[],bullets=[],ebullets=[],pickups=[],bombsArr=[],spawnIdx=0,shake=0,camX=0,boss=null,bossStarted=false,endTimer=0,time=0,hitStop=0;
let spawns=[],lootBags=[];

function enemyMats(e){e.mats=[];e.g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();if(o.material.emissive)o.material.userData.e=o.material.emissive.clone();e.mats.push(o.material);}});}
function makeEnemy(type,x){
  const g=new THREE.Group();let e={type,g,x,y:0,vx:0,vy:0,hp:1,r:0.6,h:1.6,t:Math.random()*10,flash:0,cd:2,score:100};
  if(type==='zombi'){e.hp=3;e.score=100;mesh(G.box,sm(0x5aa04a),0.7,0.9,0.5,0,1,0,g);mesh(G.box,sm(0x8acc6a),0.6,0.6,0.6,0,1.75,0,g);for(const z of[-0.15,0.15])mesh(G.sph,sm(0xff2020,0xaa0000),0.08,0.08,0.05,-0.31,1.82,z,g);
    for(const z of[-0.3,0.3])mesh(G.box,sm(0x8acc6a),0.7,0.15,0.15,-0.4,1.2,z,g);mesh(G.box,sm(0x4a3a7a),0.6,0.55,0.45,0,0.3,0,g);e.speed=(1.8+Math.random())*diff;}
  else if(type==='murcielago'){e.hp=1;e.score=80;e.y=4+Math.random()*3;e.r=0.5;e.h=0.8;mesh(G.sph,sm(0x3a2a4a),0.35,0.35,0.35,0,0,0,g);e.wings=[];for(const s of[-1,1]){const w=mesh(G.cone,sm(0x5a3a6a),0.5,0.9,0.12,0,0,s*0.5,g);w.rotation.x=s*Math.PI/2;e.wings.push(w);}
    for(const z of[-0.12,0.12])mesh(G.sph,sm(0xffee00,0xffaa00),0.07,0.07,0.05,-0.3,0.08,z,g);e.baseY=e.y;}
  else if(type==='fantasma'){e.hp=2;e.score=150;e.y=1.5;e.r=0.7;e.h=1.6;const m=new THREE.MeshToonMaterial({color:0xeef0ff,gradientMap:grad,transparent:true,opacity:0.75});mesh(G.sph,m,0.7,0.9,0.6,0,0.6,0,g);mesh(G.cone,m,0.7,0.9,0.6,0,-0.2,0,g).rotation.z=Math.PI;
    for(const z of[-0.2,0.2])mesh(G.sph,sm(0x111111),0.1,0.15,0.05,-0.6,0.8,z,g);mesh(G.sph,sm(0x111111),0.12,0.12,0.05,-0.62,0.45,0,g);}
  else if(type==='esqueleto'){e.hp=4;e.score=200;const b=sm(0xf0eedc);mesh(G.sph,b,0.35,0.38,0.35,0,1.85,0,g);for(let i=0;i<4;i++)mesh(G.box,b,0.55-i*0.05,0.06,0.4,0,1.45-i*0.14,0,g);mesh(G.box,b,0.08,0.9,0.08,0,1.2,0,g);
    for(const z of[-0.15,0.15]){mesh(G.box,b,0.08,0.9,0.08,0,0.45,z,g);mesh(G.sph,sm(0x111111),0.08,0.08,0.05,-0.3,1.9,z,g);}e.cd=1+Math.random()*2;}
  else if(type==='calabazon'){e.hp=12;e.score=600;e.r=1.1;e.h=2.8;const p=makePumpkin(g,0,0,1.5);p.position.y=1.0;mesh(G.box,sm(0x2a2a3a),1,1,0.8,0,0.5,0,g);e.speed=1.2;}
  else if(type==='armadura'){e.hp=7;e.score=300;e.h=2.3;e.r=0.7;const m=sm(0x9aa0b0,0x111122);mesh(G.box,m,0.8,0.9,0.6,0,1.35,0,g);mesh(G.box,m,0.6,0.6,0.6,0,2.05,0,g);mesh(G.box,sm(0xff3020,0xff2000),0.08,0.08,0.45,-0.31,2.1,0,g);
    mesh(G.cone,sm(0xc02020),0.12,0.5,0.12,0,2.55,0,g);for(const z of[-0.18,0.18])mesh(G.box,m,0.25,0.9,0.25,0,0.45,z,g);
    const sw=new THREE.Group();sw.position.set(-0.3,1.5,0.45);g.add(sw);mesh(G.box,sm(0xdde6ff,0x223344),0.12,1.6,0.06,0,0.8,0,sw);mesh(G.box,sm(0xc8a030),0.5,0.1,0.1,0,0.05,0,sw);e.sword=sw;e.speed=1.4*diff;e.cd=1+Math.random();}
  else if(type==='arana'){e.hp=2;e.score=120;e.r=0.6;e.h=0.8;e.y=9;e.hang=true;mesh(G.sph,sm(0x1a1a22),0.45,0.35,0.4,0,0.4,0,g);mesh(G.sph,sm(0x2a1a2a),0.3,0.28,0.3,-0.45,0.4,0,g);
    for(const z of[-0.1,0.1])mesh(G.sph,sm(0xff2020,0xff0000),0.06,0.06,0.06,-0.7,0.5,z,g);
    e.legs=[];for(let i=0;i<4;i++)for(const s of[-1,1]){const l=mesh(G.box,sm(0x1a1a22),0.08,0.08,0.8,(i-1.5)*0.22,0.3,s*0.45,g);l.rotation.x=s*0.6;e.legs.push(l);}
    e.thread=mesh(G.cyl,new THREE.MeshBasicMaterial({color:0xdddddd}),0.02,1,0.02,0,1,0,g);}
  else if(type==='libro'){e.hp=1;e.score=90;e.y=3.5+Math.random()*3;e.baseY=e.y;e.r=0.5;e.h=0.7;const c=[0x8a2020,0x203a8a,0x2a6a2a][Math.floor(Math.random()*3)];
    mesh(G.box,sm(0xf8f0d8),0.6,0.12,0.8,0,0.3,0,g);e.wings=[];for(const s of[-1,1]){const w=new THREE.Group();w.position.set(0,0.3,0);g.add(w);mesh(G.box,sm(c),0.65,0.05,0.42,0,0,s*0.21,w);e.wings.push(w);}
    mesh(G.sph,sm(0xffee00,0xffaa00),0.07,0.07,0.07,-0.3,0.45,0,g);}
  else if(type==='vela'){e.hp=2;e.score=140;e.r=0.45;e.h=1.6;mesh(G.cyl,sm(0xf0eedc),0.3,1.1,0.3,0,0.55,0,g);mesh(G.cyl,sm(0xf0eedc),0.33,0.15,0.33,0,1.05,0,g);
    e.flame=mesh(G.cone,sm(0xffcc33,0xff8800),0.15,0.45,0.15,0,1.4,0,g);for(const z of[-0.1,0.1])mesh(G.sph,sm(0x111111),0.05,0.07,0.04,-0.29,0.8,z,g);mesh(G.cyl,sm(0xc8a030),0.4,0.08,0.4,0,0.04,0,g);e.cd=1+Math.random()*1.5;}
  else if(type==='bruja'){e.hp=3;e.score=250;e.y=5.5+Math.random();e.baseY=e.y;e.r=0.8;e.h=1.6;mesh(G.cyl,sm(0x6a4020),0.07,2.2,0.07,0,0.3,0,g).rotation.z=Math.PI/2;
    mesh(G.cone,sm(0xc8a040),0.25,0.6,0.25,1.2,0.3,0,g).rotation.z=Math.PI/2;mesh(G.cone,sm(0x5a2a8a),0.45,1,0.45,0,0.85,0,g);mesh(G.sph,sm(0x7aea6a),0.25,0.25,0.25,0,1.45,0,g);
    mesh(G.cone,sm(0x1a1a1a),0.3,0.7,0.3,0.05,1.9,0,g);mesh(G.cyl,sm(0x1a1a1a),0.45,0.04,0.45,0,1.6,0,g);mesh(G.cone,sm(0x5aba4a),0.05,0.18,0.05,-0.28,1.42,0,g).rotation.z=Math.PI/2;e.cd=1.5;}
  else if(type==='rana'){e.hp=2;e.score=110;e.r=0.6;e.h=0.9;mesh(G.sph,sm(0x4ac030),0.55,0.4,0.5,0,0.4,0,g);for(const z of[-0.22,0.22]){mesh(G.sph,sm(0xffffff),0.14,0.14,0.14,-0.25,0.78,z,g);mesh(G.sph,sm(0x111111),0.07,0.07,0.07,-0.36,0.8,z,g);mesh(G.box,sm(0x3a9a20),0.5,0.15,0.18,0.25,0.12,z*1.6,g);}
    mesh(G.box,sm(0xff6080),0.3,0.05,0.4,-0.45,0.3,0,g);e.cd=Math.random();}
  else if(type==='momia'){e.hp=6;e.score=220;mesh(G.box,sm(0xe8e0c0),0.7,1,0.5,0,1.05,0,g);mesh(G.box,sm(0xe8e0c0),0.55,0.6,0.55,0,1.85,0,g);for(let k=0;k<5;k++)mesh(G.box,sm(0xc8c0a0),0.72,0.05,0.52,0,0.65+k*0.3,0,g).rotation.z=(k%2?0.15:-0.15);
    for(const z of[-0.12,0.12])mesh(G.sph,sm(0x30ff30,0x20aa20),0.07,0.07,0.04,-0.28,1.9,z,g);for(const z of[-0.3,0.3])mesh(G.box,sm(0xe8e0c0),0.8,0.15,0.15,-0.45,1.3,z,g);mesh(G.box,sm(0xe8e0c0),0.6,0.55,0.45,0,0.3,0,g);e.speed=1.3*diff;}
  if(type!=='jefe')e.hp=Math.round(e.hp*diffHp);
  enemyMats(e);g.position.set(x,e.y,0);scene.add(g);enemies.push(e);return e;}
function makeBoss1(){const g=new THREE.Group();const e={type:'jefe',g,x:LEVEL_END-6,y:0,vx:0,vy:0,hp:140,max:140,r:2.6,h:5.5,t:0,flash:0,cd:2,score:5000,phase:0};
  const p=makePumpkin(g,0,0,4);p.position.y=2.2;e.head=p;
  const crown=new THREE.Group();crown.position.y=8.2;g.add(crown);mesh(G.cyl,sm(0xffcc00,0x664400),1.4,0.6,1.4,0,0,0,crown);for(let i=0;i<6;i++){const a=i/6*Math.PI*2;mesh(G.cone,sm(0xffcc00,0x664400),0.25,0.8,0.25,Math.cos(a)*1.2,0.6,Math.sin(a)*1.2,crown);}
  mesh(G.cyl,sm(0x3a1a5a),2.2,2.5,2.2,0,1.0,0,g);// capa
  for(const s of[-1,1]){const arm=mesh(G.cyl,sm(0x2a6a10),0.25,3,0.25,-0.5,4,s*2.4,g);arm.rotation.x=s*0.9;}
  enemyMats(e);g.position.set(e.x,0,0);scene.add(g);enemies.push(e);return e;}

function addPickup(x,y,kind='candy',vx){const g=new THREE.Group();
  if(kind==='candy'){const c=candyColors[Math.floor(Math.random()*6)];mesh(G.sph,sm(c,c&0x333333),0.22,0.22,0.22,0,0,0,g);for(const s of[-1,1])mesh(G.cone,sm(c),0.15,0.2,0.15,s*0.3,0,0,g).rotation.z=-s*Math.PI/2;}
  else if(kind==='bolsa'){mesh(G.sph,sm(0xc070ff),0.5,0.55,0.45,0,0.5,0,g);mesh(G.cyl,sm(0xffcc00),0.2,0.2,0.2,0,1.0,0,g);}
  else if(kind==='corazon'){mesh(G.sph,sm(0xff2050,0x660010),0.3,0.3,0.3,-0.15,0.1,0,g);mesh(G.sph,sm(0xff2050,0x660010),0.3,0.3,0.3,0.15,0.1,0,g);mesh(G.cone,sm(0xff2050,0x660010),0.38,0.45,0.3,0,-0.2,0,g).rotation.z=Math.PI;}
  else if(kind==='bomba'){makePumpkin(g,0,0,0.45,false);}
  g.position.set(x,y,0.3);scene.add(g);pickups.push({g,x,y,vx:vx!==undefined?vx:(Math.random()-0.5)*5,vy:6+Math.random()*4,kind,t:0});}

function makeBoss(){if(curLevel===2)return makeBoss2();if(curLevel===3)return makeBoss3();return makeBoss1();}
function makeBoss2(){const g=new THREE.Group();const e={type:'jefe',g,x:LEVEL_END-6,y:1.5,vx:0,vy:0,hp:180,max:180,r:2.4,h:5.5,t:0,flash:0,cd:2,score:7000,phase:0};
  const m=new THREE.MeshToonMaterial({color:0xdde6ff,gradientMap:grad,transparent:true,opacity:0.8,emissive:0x223355});
  const body=new THREE.Group();g.add(body);mesh(G.sph,m,2.2,2.6,1.8,0,3.2,0,body);mesh(G.cone,m,2.2,2.6,1.8,0,0.8,0,body).rotation.z=Math.PI;
  for(const z of[-0.6,0.6])mesh(G.sph,sm(0x111111),0.35,0.5,0.2,-1.9,3.8,z,body);mesh(G.sph,sm(0x2a0a2a),0.5,0.4,0.2,-2,2.6,0,body);
  mesh(G.cyl,sm(0x1a1a1a),1,1.6,1,0,6.3,0,body);mesh(G.cyl,sm(0x1a1a1a),1.6,0.1,1.6,0,5.5,0,body);mesh(G.cyl,sm(0xaa2020),1.02,0.25,1.02,0,5.75,0,body);
  for(const s of[-1,1]){const a=mesh(G.sph,m,0.5,1.4,0.5,-0.5,3,s*2,body);a.rotation.x=s*0.6;}
  e.body=body;enemyMats(e);g.position.set(e.x,e.y,0);scene.add(g);enemies.push(e);return e;}
function makeBoss3(){const g=new THREE.Group();const e={type:'jefe',g,x:LEVEL_END-6,y:5,vx:0,vy:0,hp:220,max:220,r:2.2,h:4,t:0,flash:0,cd:2,score:9000,phase:0};
  const body=new THREE.Group();g.add(body);mesh(G.cyl,sm(0x6a4020),0.18,6,0.18,0.3,0.5,0,body).rotation.z=Math.PI/2;mesh(G.cone,sm(0xc8a040),0.7,1.6,0.7,3.6,0.5,0,body).rotation.z=Math.PI/2;
  mesh(G.cone,sm(0x3a1a6a),1.3,2.6,1.3,0,2,0,body);mesh(G.sph,sm(0x7aea6a),0.75,0.75,0.75,0,3.6,0,body);mesh(G.cone,sm(0x5aba4a),0.15,0.6,0.15,-0.85,3.5,0,body).rotation.z=Math.PI/2;
  for(const z of[-0.28,0.28])mesh(G.sph,sm(0xffee00,0xffaa00),0.12,0.12,0.08,-0.62,3.8,z,body);
  mesh(G.cone,sm(0x1a1a1a),0.9,2.4,0.9,0.2,5.2,0,body).rotation.z=0.25;mesh(G.cyl,sm(0x1a1a1a),1.6,0.1,1.6,0,4.2,0,body);mesh(G.cyl,sm(0x9a30ff),0.92,0.2,0.92,0,4.35,0,body);
  for(let k=0;k<6;k++)mesh(G.box,sm(0xff8a00),0.1,1.2,0.1,(Math.random()-0.5)*1.2,3.2,(Math.random()-0.5)*1.4,body).rotation.z=(Math.random()-0.5)*0.8;
  const wand=mesh(G.cyl,sm(0x3a2010),0.06,1.6,0.06,-1.2,2.4,0.9,body);wand.rotation.z=1;mesh(G.sph,sm(0x60ff90,0x30ff60),0.2,0.2,0.2,0,0.8,0,wand);
  e.body=body;enemyMats(e);g.position.set(e.x,e.y,0);scene.add(g);enemies.push(e);return e;}
function bolt(x,y,tx,ty,sp,color){const g=new THREE.Group();mesh(G.sph,sm(color,color&0x888888),0.3,0.3,0.3,0,0,0,g);g.position.set(x,y,0.3);scene.add(g);const d=Math.hypot(tx-x,ty-y)||1;ebullets.push({g,x,y,vx:(tx-x)/d*sp,vy:(ty-y)/d*sp,life:4,magic:true});}
function bossAI2(e,dt,dx){const rage=e.hp<e.max/2;e.cd-=dt;e.body.rotation.y=dx>0?Math.PI:0;e.mats.forEach(m=>{if(m.transparent)m.opacity=0.55+0.3*Math.abs(Math.sin(e.t*1.5));});
  if(e.dash){e.x+=e.vx*dt;e.dash-=dt;if(e.dash<=0)e.dash=0;}else e.x+=Math.sign(dx)*(rage?1.6:1)*dt;
  e.y=1.5+Math.sin(e.t*1.6)*1.0;e.x=Math.max(ARENA_X-4,Math.min(LEVEL_END+1,e.x));
  if(e.cd<=0){e.phase=(e.phase+1)%3;const dir=Math.sign(dx)||-1;
    if(e.phase===0){const n=rage?5:3;for(let i=0;i<n;i++)setTimeout(()=>{if(e.hp>0&&state==='play')bolt(e.x+dir*1.5,e.y+3.5,P.x,P.y+1+(i-(n-1)/2)*1.2,9,0x9ad0ff);},i*180);sfx.laugh();}
    else if(e.phase===1){burst(e.x,e.y+3,[0xdde6ff,0xffffff],25,10);e.x=Math.max(ARENA_X-3,Math.min(LEVEL_END,P.x-dir*9));e.vx=Math.sign(P.x-e.x)*12;e.dash=1.1;sfx.roar();shake=0.6;}
    else{for(let i=0;i<(rage?4:3);i++){const b=makeEnemy(i%2?'libro':'vela',e.x-1.5-i*1.5);if(b.type==='libro')b.baseY=4+i;}sfx.laugh();}
    e.cd=rage?1.9:2.7;}}
function bossAI3(e,dt,dx){const rage=e.hp<e.max/2;e.cd-=dt;e.body.rotation.y=dx>0?Math.PI:0;e.body.rotation.z=Math.sin(e.t*2)*0.08;
  if(e.dive){e.dive-=dt;const k=1-Math.abs(e.dive-0.8)/0.8;e.y=5-k*4.2;e.x+=e.vx*dt;if(e.dive<=0)e.dive=0;}
  else{e.x+=Math.sin(e.t*0.7)*(rage?7:5)*dt;e.y=5+Math.sin(e.t*1.8)*1.2;}
  e.x=Math.max(ARENA_X-4,Math.min(LEVEL_END+1,e.x));
  if(e.cd<=0){e.phase=(e.phase+1)%4;const dir=Math.sign(dx)||-1;
    if(e.phase===0){const n=rage?4:3;for(let i=0;i<n;i++)setTimeout(()=>{if(e.hp>0&&state==='play'){bolt(e.x,e.y+2.5,P.x,P.y+1,10,0x60ff90);sfx.shoot();}},i*220);sfx.laugh();}
    else if(e.phase===1){const n=rage?8:6;for(let i=0;i<n;i++){const g=new THREE.Group();mesh(G.sph,sm(0x60ff60,0x20aa20),0.28,0.34,0.28,0,0,0,g);const x=ARENA_X-3+Math.random()*(LEVEL_END-ARENA_X+4);g.position.set(x,12+Math.random()*4,0.3);scene.add(g);ebullets.push({g,x,y:12+Math.random()*4,vx:0,vy:-2,grav:true,fire:true,life:5});}sfx.laugh();}
    else if(e.phase===2){e.dive=1.6;e.vx=dx/1.6;sfx.roar();}
    else{for(let i=0;i<(rage?4:3);i++){makeEnemy(i%2?'murcielago':'rana',e.x-1-i*1.5);}sfx.laugh();}
    e.cd=rage?1.7:2.5;}}

// ---------- Entrada ----------
const keys={};let pausePressed=false;
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyP'||e.code==='Escape')pausePressed=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();initAudio();});
addEventListener('keyup',e=>{keys[e.code]=false;});
const touch={x:0,up:false,down:false,jump:false,fire:false,bomb:false};
const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0||/[?&]touch/.test(location.search);
(function(){const st=$('stick'),kn=$('knob');let id=null;
  const mv=(t)=>{const r=st.getBoundingClientRect();let dx=t.clientX-r.left-r.width/2,dy=t.clientY-r.top-r.height/2;const d=Math.hypot(dx,dy);if(d>45){dx*=45/d;dy*=45/d;}kn.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;touch.x=Math.abs(dx)>10?dx/45:0;touch.up=dy<-22;touch.down=dy>26;};
  st.addEventListener('touchstart',e=>{e.preventDefault();initAudio();const t=e.changedTouches[0];id=t.identifier;mv(t);},{passive:false});
  st.addEventListener('touchmove',e=>{e.preventDefault();for(const t of e.changedTouches)if(t.identifier===id)mv(t);},{passive:false});
  const end=e=>{for(const t of e.changedTouches)if(t.identifier===id){id=null;touch.x=0;touch.up=touch.down=false;kn.style.transform='translate(-50%,-50%)';}};
  st.addEventListener('touchend',end);st.addEventListener('touchcancel',end);
  for(const [b,k] of[['tF','fire'],['tJ','jump'],['tB','bomb']]){const el=$(b);el.addEventListener('touchstart',e=>{e.preventDefault();initAudio();touch[k]=true;},{passive:false});const u=e=>{e.preventDefault();touch[k]=false;};el.addEventListener('touchend',u,{passive:false});el.addEventListener('touchcancel',u,{passive:false});}
})();
let prevPadPause=false,padIdx=-1;
addEventListener('gamepadconnected',e=>{padIdx=e.gamepad.index;});
function readInput(){
  const I={x:0,up:false,jump:false,fire:false,bomb:false};
  if(keys.ArrowLeft||keys.KeyA)I.x-=1;if(keys.ArrowRight||keys.KeyD)I.x+=1;
  I.up=!!(keys.ArrowUp||keys.KeyW);I.jump=!!(keys.Space||keys.KeyK);I.fire=!!(keys.KeyJ||keys.KeyZ);I.bomb=!!(keys.KeyL||keys.KeyX);
  if(touch.x)I.x=touch.x;I.up=I.up||touch.up;I.jump=I.jump||touch.jump;I.fire=I.fire||touch.fire;I.bomb=I.bomb||touch.bomb;
  const pads=navigator.getGamepads?navigator.getGamepads():[];
  for(const gp of pads){if(!gp)continue;const b=i=>gp.buttons[i]&&gp.buttons[i].pressed;const ax=gp.axes[0]||0,ay=gp.axes[1]||0;
    if(Math.abs(ax)>0.25)I.x=ax;if(b(14))I.x=-1;if(b(15))I.x=1;if(ay<-0.5||b(12))I.up=true;
    if(b(0))I.jump=true;if(b(2)||b(7)||b(5))I.fire=true;if(b(1)||b(3)||b(6))I.bomb=true;
    const pp=b(9);if(pp&&!prevPadPause)pausePressed=true;prevPadPause=pp;if(state==='menu'&&(b(0)||pp))startGame();if(state==='trans'&&b(0))nextLevel();}
  return I;}
let prevJump=false,prevBomb=false;

// ---------- Juego ----------
function clearAll(){for(const a of[enemies,bullets,ebullets,pickups,bombsArr])for(const o of a)scene.remove(o.g||o.m);enemies=[];bullets=[];ebullets=[];pickups=[];bombsArr=[];}
const PROG_KEY='pekahalloween.nivel';
function progress(){try{return Math.max(1,Math.min(3,parseInt(localStorage.getItem(PROG_KEY))||1));}catch(e){return 1;}}
function unlock(n){try{if(n>progress())localStorage.setItem(PROG_KEY,String(n));}catch(e){}}
function startGame(){startLevel(1,false);}
let transAt=0;
function startLevel(n,keep){initAudio();sfx.click();clearAll();curLevel=n;LV=LEVELS[n];diff=LV.diff;diffHp=LV.hp;buildLevel(LV);
  const bombs=keep?Math.max(3,P.bombs):3;Object.assign(P,{x:2,y:0,vx:0,vy:0,face:1,hp:5,inv:1,fireCd:0,bombs,alive:true,ground:true});
  if(!keep){score=0;loot=0;}spawnIdx=0;boss=null;bossStarted=false;endTimer=0;camX=0;
  spawns=LV.plan.map(([x,t,n])=>({x,t,n}));lootBags=LV.loot;
  for(const x of lootBags)addPickup(x,1.5,'bolsa',0);
  for(const x of LV.hearts)addPickup(x,1.5,'corazon',0);for(const x of LV.bombs)addPickup(x,1.5,'bomba',0);
  $('bossbar').querySelector('span').textContent=LV.boss;
  ['menu','over','pause','trans'].forEach(i=>$(i).classList.add('hidden'));$('hud').classList.remove('hidden');$('bossbar').classList.add('hidden');
  if(isTouch)$('touch').classList.remove('hidden');state='play';stopMusic();startMusic(false,LV.music);setBossMusic(false);hud();}
function levelDone(){if(curLevel>=3){unlock(3);endGame(true);return;}
  unlock(curLevel+1);state='trans';$('touch').classList.add('hidden');stopMusic();sfx.win();const N=LEVELS[curLevel+1];
  $('transT').textContent=`¡Nivel ${curLevel} superado!`;$('transN').textContent=`Nivel ${curLevel+1}: ${N.name}`;$('transP').textContent=`Puntos: ${score} · Caramelos: ${loot}`;
  transAt=performance.now();setTimeout(()=>$('trans').classList.remove('hidden'),400);}
function nextLevel(){if(state==='trans'&&performance.now()-transAt>900)startLevel(curLevel+1,true);}
function refreshMenu(){const pr=progress();const c=$('cont');c.classList.toggle('hidden',pr<2);c.textContent=`Continuar (Nivel ${pr})`;
  document.querySelectorAll('#lvsel button').forEach(b=>{const n=+b.dataset.n;b.disabled=n>pr;b.textContent=n>pr?`🔒 ${n}`:`Nivel ${n}`;});}
function hud(){$('hp').textContent='❤️'.repeat(Math.max(0,Math.min(5,P.hp)))+'🖤'.repeat(Math.max(0,5-P.hp));$('score').textContent=score;$('loot').textContent='🍬 '+loot;$('bombs').textContent='🎃 '+P.bombs;
  if(boss)$('bossbar').querySelector('i').style.width=Math.max(0,boss.hp/boss.max*100)+'%';}
function endGame(win){state='over';$('touch').classList.add('hidden');stopMusic();
  $('overT').textContent=win?'¡VICTORIA!':'GAME OVER';$('overP').textContent=win?`¡Has salvado el botín! Puntos: ${score} · Caramelos: ${loot}`:`Los monstruos se llevaron el botín... Puntos: ${score} · Caramelos: ${loot}`;
  win?sfx.win():sfx.lose();setTimeout(()=>$('over').classList.remove('hidden'),win?400:900);}
function setPause(p){if(state==='play'&&p){state='pause';$('pause').classList.remove('hidden');stopMusic();}else if(state==='pause'&&!p){state='play';$('pause').classList.add('hidden');startMusic(bossStarted,LV.music);}}

function shoot(){const up=P.aimUp;const g=new THREE.Group();const c=candyColors[Math.floor(Math.random()*6)];
  mesh(G.sph,sm(c,c&0x444444),0.2,0.2,0.2,0,0,0,g);for(const s of[-1,1])mesh(G.cone,sm(0xffffff),0.12,0.18,0.12,s*0.26,0,0,g).rotation.z=-s*Math.PI/2;
  const sx=up?P.x+0.15*P.face:P.x+1.2*P.face,sy=up?P.y+2.6:P.y+1.25+(Math.random()-0.5)*0.25;
  g.position.set(sx,sy,0.35);if(up)g.rotation.z=Math.PI/2;scene.add(g);
  const sp=24;bullets.push({g,x:sx,y:sy,vx:up?(Math.random()-0.5)*2:sp*P.face,vy:up?sp:(Math.random()-0.5)*1.2,life:0.9});
  sfx.shoot();burst(sx,sy,[0xffffff,c],3,3,0.6,0);}
function throwBomb(){const g=new THREE.Group();makePumpkin(g,0,0,0.45);g.position.set(P.x,P.y+1.5,0.3);scene.add(g);bombsArr.push({g,x:P.x,y:P.y+1.5,vx:9*P.face+P.vx*0.5,vy:10});P.bombs--;sfx.jump();hud();}
function explode(x,y,r=3.8,dmg=8,fromEnemy=false){sfx.boom();shake=Math.max(shake,0.9);burst(x,y,[0xff8a00,0xffe03a,0xff3a00,0x333333],40,16,1.6);hitStop=0.05;
  if(fromEnemy){if(Math.abs(P.x-x)<r&&Math.abs(P.y+1-y)<r)hurtPlayer();return;}
  for(const e of enemies)if(Math.hypot(e.x-x,(e.y+e.h/2)-y)<r+e.r)damage(e,dmg);}
function damage(e,d){if(e.hp<=0)return;e.hp-=d;e.flash=0.08;
  if(e.type==='jefe'){sfx.bossHit();hud();score+=10;}else sfx.hit();
  burst(e.x,e.y+e.h*0.6,candyColors,4,6,0.8);
  if(e.hp<=0)kill(e);}
function kill(e){score+=e.score;sfx.die();shake=Math.max(shake,e.type==='jefe'?1.5:e.type==='calabazon'?0.6:0.25);
  burst(e.x,e.y+e.h/2,e.type==='fantasma'?[0xffffff,0xccccff]:e.type==='esqueleto'?[0xf0eedc,0xffffff]:[0xff7a10,0x5aa04a,0xffe03a],e.type==='jefe'?80:20,e.type==='jefe'?20:10,1.3);
  const n=e.type==='jefe'?30:e.type==='calabazon'?8:2+Math.floor(Math.random()*2);for(let i=0;i<n;i++)addPickup(e.x,e.y+1,'candy');
  if(e.type!=='jefe'&&Math.random()<0.06)addPickup(e.x,e.y+1,Math.random()<0.5?'corazon':'bomba');
  if(e.type==='jefe'){explode(e.x,3,0,0);setTimeout(()=>explode(e.x-2,5,0,0),250);setTimeout(()=>explode(e.x+1,2,0,0),500);endTimer=2.2;}
  e.dead=true;scene.remove(e.g);hud();}
function hurtPlayer(){if(P.inv>0||!P.alive)return;P.hp--;P.inv=1.5;sfx.hurt();shake=Math.max(shake,0.6);P.vy=7;P.vx=-P.face*6;
  const st=Math.min(loot,5);if(st>0){loot-=st;sfx.steal();for(let i=0;i<Math.min(st,3);i++)burst(P.x,P.y+1.2,candyColors,3,7,0.9);}
  burst(P.x,P.y+1,[0xff2050,0xffffff],12,8);hud();if(P.hp<=0){P.alive=false;endGame(false);}}

function groundAt(x,y,vy){let g=0;if(vy<=0)for(const p of platforms)if(Math.abs(x-p.x)<p.w/2&&y>=p.y-0.35)g=Math.max(g,p.y);return g;}

function update(dt){
  time+=dt;const I=readInput();
  if(pausePressed){pausePressed=false;if(state==='play')setPause(true);else if(state==='pause')setPause(false);}
  if(state!=='play')return;
  playTime+=dt;
  if(hitStop>0){hitStop-=dt;return;}
  if(endTimer>0){endTimer-=dt;if(endTimer<=0){levelDone();return;}}
  // jugador
  P.aimUp=I.up;if(I.x){P.face=Math.sign(I.x);}
  const target=I.x*8;P.vx+=(target-P.vx)*Math.min(1,dt*(P.ground?14:6));
  if(I.jump&&!prevJump&&P.ground){P.vy=15;P.ground=false;sfx.jump();burst(P.x,P.y+0.1,[0xbbbbbb,0x8a6a4a],6,4,0.7);}
  if(!I.jump&&P.vy>5)P.vy-=60*dt;
  prevJump=I.jump;
  P.vy-=38*dt;P.x+=P.vx*dt;P.y+=P.vy*dt;
  const minX=Math.max(-8,portrait?camX-camera.position.z*Math.tan(camera.fov*Math.PI/360)*camera.aspect+0.8:camX-13*camera.aspect/2.2),maxX=bossStarted?LEVEL_END+2:LEVEL_END+2;P.x=Math.max(minX,Math.min(maxX,P.x));
  if(bossStarted)P.x=Math.max(ARENA_X-4,P.x);
  const gy=groundAt(P.x,P.y,P.vy);if(P.y<=gy){if(!P.ground&&P.vy<-8){sfx.land();burst(P.x,gy+0.1,[0xbbbbbb],4,3,0.6);}P.y=gy;P.vy=0;P.ground=true;}else if(P.y>gy+0.05)P.ground=false;
  P.fireCd-=dt;if(I.fire&&P.fireCd<=0){shoot();P.fireCd=0.12;}
  if(I.bomb&&!prevBomb&&P.bombs>0)throwBomb();prevBomb=I.bomb;
  P.inv=Math.max(0,P.inv-dt);
  // modelo
  kid.g.position.set(P.x,P.y,0);kid.body.rotation.y=P.face>0?0:Math.PI;
  const run=Math.abs(P.vx)>0.5&&P.ground?Math.sin(time*16):0;kid.legL.rotation.z=run*0.8;kid.legR.rotation.z=-run*0.8;kid.body.position.y=Math.abs(run)*0.08;
  kid.arm.rotation.z=P.aimUp?Math.PI/2*0.95:(P.fireCd>0.06?0.08:0);kid.g.visible=!(P.inv>0&&Math.floor(time*20)%2);
  playerLight.position.set(P.x+1,P.y+3,3);
  // aparición de enemigos
  while(spawnIdx<spawns.length&&P.x>spawns[spawnIdx].x-14){const s=spawns[spawnIdx++];for(let i=0;i<s.n;i++){const e=makeEnemy(s.t,s.x+4+i*2.2+Math.random());if(s.t==='murcielago')e.x+=i;}}
  if(!bossStarted&&P.x>ARENA_X){bossStarted=true;boss=makeBoss();sfx.roar();sfx.laugh();shake=1.2;setBossMusic(true);$('bossbar').classList.remove('hidden');hud();}
  // enemigos
  for(const e of enemies){if(e.dead)continue;e.t+=dt;const dx=P.x-e.x,dir=Math.sign(dx)||1;
    if(e.type==='zombi'){e.vx=dir*e.speed;e.x+=e.vx*dt;e.g.rotation.z=Math.sin(e.t*6)*0.08;}
    else if(e.type==='calabazon'){e.cd-=dt;if(e.cd<0&&Math.abs(dx)<10){e.vx=dir*9;e.cd=3;sfx.roar();}e.vx+=(dir*e.speed*diff-e.vx)*dt*1.2;e.x+=e.vx*dt;e.g.rotation.z=Math.sin(e.t*4)*0.1;}
    else if(e.type==='murcielago'){e.x+=dir*3.5*diff*dt;const swoop=Math.abs(dx)<4?(P.y+1.2-e.y)*1.6:0;e.baseY+=swoop*dt;e.y=e.baseY+Math.sin(e.t*4)*0.8;e.wings.forEach((w,i)=>w.rotation.x=(i?1:-1)*(Math.PI/2+Math.sin(e.t*22)*0.7));}
    else if(e.type==='fantasma'){e.x+=dir*2.6*diff*dt;e.y=1.4+Math.sin(e.t*2.5)*0.6+(P.y*0.5);e.mats.forEach(m=>{if(m.transparent)m.opacity=0.45+0.35*Math.abs(Math.sin(e.t*2));});}
    else if(e.type==='esqueleto'){const want=Math.abs(dx)>9?dir*2:Math.abs(dx)<6?-dir*1.5:0;e.x+=want*dt;e.cd-=dt;if(e.cd<0&&Math.abs(dx)<16){e.cd=2.2/diff;const g=new THREE.Group();mesh(G.box,sm(0xf0eedc),0.6,0.12,0.12,0,0,0,g);g.position.set(e.x,e.y+1.8,0.3);scene.add(g);ebullets.push({g,x:e.x,y:e.y+1.8,vx:dx*0.65,vy:9,grav:true,life:4});sfx.laugh();}}
    else if(e.type==='armadura'){e.cd-=dt;if(e.cd<0&&Math.abs(dx)<6){e.vx=dir*8*diff;e.cd=2.6/diff;sfx.hit();}e.vx+=(dir*e.speed-e.vx)*dt*2;e.x+=e.vx*dt;e.sword.rotation.z=Math.abs(e.vx)>3?1.3:0.2;e.g.rotation.z=Math.sin(e.t*5)*0.05;}
    else if(e.type==='arana'){if(e.hang){if(Math.abs(dx)<6.5){e.y-=11*dt;if(e.y<=0){e.y=0;e.hang=false;e.thread.visible=false;sfx.land();}}const L=Math.max(0.01,11-e.y);e.thread.scale.y=L;e.thread.position.y=0.5+L/2;}
      else{e.x+=dir*4*diff*dt;e.legs.forEach((l,i)=>l.rotation.y=Math.sin(e.t*20+i)*0.4);}}
    else if(e.type==='libro'){e.x+=dir*3.2*diff*dt;const swoop=Math.abs(dx)<4?(P.y+1.2-e.y)*1.8:0;e.baseY+=swoop*dt;e.y=e.baseY+Math.sin(e.t*3)*0.6;e.wings.forEach((w,i)=>w.rotation.x=(i?1:-1)*(0.4+Math.sin(e.t*16)*0.5));}
    else if(e.type==='vela'){if(Math.abs(dx)>10)e.x+=dir*1.2*dt;e.flame.scale.set(0.15+Math.random()*0.04,0.45+Math.sin(e.t*20)*0.08,0.15);e.cd-=dt;
      if(e.cd<0&&Math.abs(dx)<15){e.cd=2.4/diff;const g=new THREE.Group();mesh(G.sph,sm(0xff8800,0xff5500),0.22,0.22,0.22,0,0,0,g);g.position.set(e.x,1.3,0.3);scene.add(g);ebullets.push({g,x:e.x,y:1.3,vx:dir*8*diff,vy:0,life:3});sfx.shoot();}}
    else if(e.type==='bruja'){const tv=Math.max(-4,Math.min(4,dx*1.2))*diff;e.vx+=(tv-e.vx)*dt*1.5;e.x+=e.vx*dt;e.y=e.baseY+Math.sin(e.t*2)*0.7;e.g.rotation.z=Math.sin(e.t*3)*0.1;e.cd-=dt;
      if(e.cd<0&&Math.abs(dx)<3){e.cd=1.8/diff;const g=new THREE.Group();mesh(G.sph,sm(0x60ff60,0x20aa20),0.25,0.3,0.25,0,0,0,g);g.position.set(e.x,e.y,0.3);scene.add(g);ebullets.push({g,x:e.x,y:e.y,vx:e.vx*0.3,vy:0,grav:true,fire:true,life:4});sfx.laugh();}}
    else if(e.type==='rana'){if(e.y<=0){e.y=0;e.vx=0;e.cd-=dt;if(e.cd<0){e.vy=9+Math.random()*3;e.vx=dir*5*diff;e.cd=0.6+Math.random()*0.8;sfx.jump();}}else{e.vy-=28*dt;}e.y=Math.max(0,e.y+e.vy*dt);e.x+=e.vx*dt;}
    else if(e.type==='momia'){e.x+=dir*e.speed*dt;e.g.rotation.z=Math.sin(e.t*3)*0.1;}
    else if(e.type==='jefe'){(curLevel===1?bossAI:curLevel===2?bossAI2:bossAI3)(e,dt,dx);}
    if(['zombi','calabazon','esqueleto','armadura','vela','momia'].includes(e.type))e.y=groundAt(e.x,e.y+0.1,-1)*0;
    e.g.position.set(e.x,e.y,0);if(e.type!=='jefe')e.g.rotation.y=dir>0?Math.PI:0;
    if(e.flash>0){e.flash-=dt;e.mats.forEach(m=>m.emissive&&m.emissive.setRGB(1,1,1));}else e.mats.forEach(m=>{if(m.userData.e)m.emissive.copy(m.userData.e);});
    if(Math.abs(e.x-P.x)<e.r+0.4&&P.y+1.8>e.y&&P.y<e.y+e.h)hurtPlayer();
    if(e.x<camX-30&&e.type!=='jefe'){e.dead=true;scene.remove(e.g);}
  }
  enemies=enemies.filter(e=>!e.dead);
  // balas
  for(const b of bullets){b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.g.position.set(b.x,b.y,0.35);b.g.rotation.x+=dt*20;
    for(const e of enemies){if(!e.dead&&Math.abs(b.x-e.x)<e.r+0.2&&b.y>e.y-0.1&&b.y<e.y+e.h+0.2){damage(e,1);b.life=0;sfx.pop();burst(b.x,b.y,candyColors,5,5,0.7);break;}}
    if(b.life<=0)scene.remove(b.g);}
  bullets=bullets.filter(b=>b.life>0);
  for(const b of ebullets){b.life-=dt;if(b.grav)b.vy-=18*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.g.position.set(b.x,b.y,0.3);b.g.rotation.z+=dt*12;
    if(Math.abs(b.x-P.x)<0.6&&b.y>P.y&&b.y<P.y+2){hurtPlayer();b.life=0;}
    if(b.y<0){b.life=0;burst(b.x,0.2,b.fire?[0xff6a00,0xffe03a]:[0xf0eedc],6,5,0.7);if(b.fire)explode(b.x,0.5,1.6,0,true);}
    if(b.life<=0)scene.remove(b.g);}
  ebullets=ebullets.filter(b=>b.life>0);
  for(const b of bombsArr){b.vy-=22*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.g.position.set(b.x,b.y,0.3);b.g.rotation.z-=dt*8;let hit=b.y<=0.3;for(const e of enemies)if(Math.abs(b.x-e.x)<e.r&&b.y<e.y+e.h&&b.y>e.y)hit=true;if(hit){b.done=true;scene.remove(b.g);explode(b.x,b.y+0.5);}}
  bombsArr=bombsArr.filter(b=>!b.done);
  // botín
  for(const p of pickups){p.t+=dt;if(p.kind==='candy'||p.vy!==0){p.vy-=25*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.y<0.3){p.y=0.3;p.vy*=-0.4;p.vx*=0.6;if(Math.abs(p.vy)<1)p.vy=0;}}
    if(p.kind==='candy'&&p.t>0.4&&Math.abs(p.x-P.x)<3&&Math.abs(p.y-P.y-1)<3){p.x+=(P.x-p.x)*dt*6;p.y+=(P.y+1-p.y)*dt*6;}
    p.g.position.set(p.x,p.y+(p.kind!=='candy'?Math.sin(p.t*3)*0.2:0),0.3);p.g.rotation.y+=dt*3;
    if(p.t>0.25&&Math.abs(p.x-P.x)<0.9&&p.y>P.y-0.5&&p.y<P.y+2.4){p.got=true;scene.remove(p.g);sfx.coin();
      if(p.kind==='candy'){loot++;score+=10;}else if(p.kind==='bolsa'){loot+=10;score+=100;burst(p.x,p.y,candyColors,14,7);}else if(p.kind==='corazon')P.hp=Math.min(5,P.hp+1);else P.bombs++;hud();}
    if(p.kind==='candy'&&p.t>14){p.got=true;scene.remove(p.g);}}
  pickups=pickups.filter(p=>!p.got);
}
function bossAI(e,dt,dx){const dir=Math.sign(dx)||-1;e.cd-=dt;e.head.rotation.z=Math.sin(e.t*2)*0.08;e.head.scale.setScalar(4*(1+Math.sin(e.t*5)*0.03));
  const rage=e.hp<e.max/2;
  if(e.jumping){e.vy-=30*dt;e.y+=e.vy*dt;e.x+=e.vx*dt;if(e.y<=0){e.y=0;e.jumping=false;sfx.boom();shake=1.2;burst(e.x,0.3,[0x8a6a4a,0xbbbbbb],30,12,1.4);
      for(const s of[-1,1]){const g=new THREE.Group();mesh(G.cone,sm(0xff6a00,0xff3300),0.5,1.2,0.5,0,0.6,0,g);scene.add(g);ebullets.push({g,x:e.x+s*2.5,y:0.6,vx:s*10,vy:0,life:2.2,wave:true});}}}
  else{e.x+=(dir*(rage?2.2:1.4))*dt;}
  e.x=Math.max(ARENA_X-2,Math.min(LEVEL_END+1,e.x));
  for(const b of ebullets)if(b.wave){b.vy=0;b.y=0.6;}
  if(e.cd<=0){e.phase=(e.phase+1)%3;
    if(e.phase===0){const n=rage?5:3;for(let i=0;i<n;i++){const g=new THREE.Group();mesh(G.sph,sm(0xff6a00,0xff4400),0.35,0.35,0.35,0,0,0,g);g.position.set(e.x,6.5,0.3);scene.add(g);ebullets.push({g,x:e.x-2*Math.sign(-dx||1),y:6.5,vx:dx*0.5+(i-(n-1)/2)*3,vy:8+i%2*2,grav:true,fire:true,life:5});}sfx.laugh();}
    else if(e.phase===1){e.jumping=true;e.vy=16;e.vx=dx*0.7;sfx.roar();}
    else{for(let i=0;i<(rage?4:3);i++){const b=makeEnemy('murcielago',e.x-1-i);b.baseY=5+i;}sfx.laugh();}
    e.cd=rage?1.8:2.6;}
}

// ---------- Cámara y bucle ----------
let last=performance.now();
function frame(now){const dt=Math.min(0.05,(now-last)/1000);last=now;
  try{update(dt);}catch(err){console.error(err);}
  updParts(dt);
  resize();const tx=portrait?(bossStarted?Math.min(Math.max(P.x+1.5,ARENA_X-1),LEVEL_END-1):Math.min(P.x+2,LEVEL_END-1)):bossStarted?Math.min(Math.max(P.x+3,ARENA_X+8),LEVEL_END-4):Math.min(P.x+4,LEVEL_END-4);
  camX+=(tx-camX)*Math.min(1,dt*5);if(state==='menu'){camX=8+Math.sin(now/3000)*5;}
  shake=Math.max(0,shake-dt*2.5);const sx=(Math.random()-0.5)*shake*0.6,sy=(Math.random()-0.5)*shake*0.6;
  if(portrait){const zoom=bossStarted?30:26;camera.position.set(camX+sx,7+sy,zoom);camera.lookAt(camX+sx*0.5,5.5+(bossStarted?1:0),0);}
  else{const zoom=bossStarted?17:14;camera.position.set(camX+sx,4.6+sy+(bossStarted?1.5:0),zoom);camera.lookAt(camX+sx*0.5,2.6+(bossStarted?1.5:0),0);}
  G.moon.position.x=camX*0.7;
  renderer.render(scene,camera);requestAnimationFrame(frame);}

$('rotHint').onclick=()=>{hintClosed=true;$('rotHint').classList.add('hidden');};
$('play').onclick=startGame;$('again').onclick=startGame;
$('snd').onclick=()=>{initAudio();setSound(!soundOn());$('snd').textContent='Sonido: '+(soundOn()?'SÍ':'NO');sfx.click();};
$('resume').onclick=()=>setPause(false);$('pauseBtn').onclick=()=>{if(state==='play')setPause(true);};
const toMenu=()=>{clearAll();stopMusic();state='menu';['over','pause','hud','touch','trans'].forEach(i=>$(i).classList.add('hidden'));$('menu').classList.remove('hidden');refreshMenu();kid.g.position.set(4,0,0);};
$('quit').onclick=toMenu;$('toMenu').onclick=toMenu;
addEventListener('keydown',e=>{if(e.repeat)return;if(state==='menu'&&(e.code==='Enter'||e.code==='Space'))startGame();else if(state==='trans'&&(e.code==='Enter'||e.code==='Space'||e.code==='KeyJ'))nextLevel();});
$('next').onclick=nextLevel;$('cont').onclick=()=>startLevel(progress(),false);document.querySelectorAll('#lvsel button').forEach(b=>b.onclick=()=>startLevel(+b.dataset.n,false));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')setPause(true);});
kid.g.position.set(4,0,0);buildLevel(LEVELS[1]);refreshMenu();
if(import.meta.env.DEV)window.__game={get state(){return state;},get P(){return P;},get score(){return score;},get loot(){return loot;},get enemies(){return enemies.length;},get boss(){return boss&&boss.hp;},startGame,startLevel,get level(){return curLevel;},killBoss:()=>{if(boss&&boss.hp>0)damage(boss,9999);},get time(){return playTime;},tp:x=>{P.x=x;},near:()=>{let close=false,up=false,back=false,bx=0;for(const e of enemies){const d=e.x-P.x;if(d>-1&&d<5&&e.y<2)close=true;if(Math.abs(d)<4&&e.y>2.5)up=true;if(d<-1.5&&d>-12){back=true;}if(Math.abs(d)<1.3&&e.y<2&&e.type!=='jefe')back=true;}if(boss&&boss.hp>0){bx=boss.x-P.x;}return {close,up,back,bx,x:P.x};}};
window.__started=true;
requestAnimationFrame(frame);
