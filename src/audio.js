// Todo el sonido se genera en código con WebAudio, con un limitador al final.
let ctx=null,master=null,musicGain=null,sfxGain=null,noiseBuf=null,on=true,musicTimer=null,step=0,nextT=0,bossMode=false;
export function initAudio(){
  if(ctx){if(ctx.state==='suspended')ctx.resume().catch(()=>{});return;}
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
  try{ctx=new AC({sampleRate:48000,latencyHint:'interactive'});}catch(e){ctx=new AC();}
  const lim=ctx.createDynamicsCompressor();
  const t0=ctx.currentTime;lim.threshold.setValueAtTime(-10,t0);lim.knee.setValueAtTime(0,t0);lim.ratio.setValueAtTime(20,t0);lim.attack.setValueAtTime(0.002,t0);lim.release.setValueAtTime(0.15,t0);
  master=ctx.createGain();master.gain.value=on?0.7:0;
  const out=ctx.createGain();out.gain.value=0.85;
  master.connect(lim);lim.connect(out);out.connect(ctx.destination);
  musicGain=ctx.createGain();musicGain.gain.value=0.32;musicGain.connect(master);
  sfxGain=ctx.createGain();sfxGain.gain.value=0.55;sfxGain.connect(master);
  noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const d=noiseBuf.getChannelData(0);let sd=12345;for(let i=0;i<d.length;i++){sd=(Math.imul(sd,1103515245)+12345)>>>0;d[i]=(sd/4294967296)*2-1;}
}
export function setSound(v){on=v;if(master)master.gain.setTargetAtTime(v?0.7:0,ctx.currentTime,0.05);}
export function soundOn(){return on;}
function tone(f,dur,type='square',vol=0.3,slide=0,t0=0,dest=sfxGain){
  if(!ctx)return;const t=ctx.currentTime+t0;const o=ctx.createOscillator(),g=ctx.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+dur);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.008);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+0.02);
}
function noise(dur,vol=0.3,freq=1200,q=1,t0=0,type='lowpass',dest=sfxGain){
  if(!ctx)return;const t=ctx.currentTime+t0;const s=ctx.createBufferSource();s.buffer=noiseBuf;
  const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;const g=ctx.createGain();
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(f);f.connect(g);g.connect(dest);s.start(t);s.stop(t+dur);
}
let lastShot=0;
export const sfx={
  shoot(){if(!ctx||ctx.currentTime-lastShot<0.05)return;lastShot=ctx.currentTime;tone(900+Math.random()*200,0.09,'square',0.12,0.45);tone(1800,0.04,'triangle',0.06,0.6);},
  pop(){tone(500+Math.random()*300,0.12,'triangle',0.25,2.2);noise(0.06,0.12,3000);},
  hit(){tone(220,0.08,'sawtooth',0.15,0.5);noise(0.05,0.1,2000);},
  die(){tone(300,0.35,'sawtooth',0.22,0.25);noise(0.25,0.18,900);tone(150,0.3,'square',0.12,0.4,0.05);},
  boom(){noise(0.7,0.6,500,0.7);tone(90,0.6,'sine',0.6,0.3);tone(60,0.8,'triangle',0.4,0.5,0.05);},
  jump(){tone(330,0.15,'square',0.12,2.2);},
  land(){noise(0.06,0.12,400);},
  coin(){tone(988,0.07,'square',0.12);tone(1319,0.18,'square',0.12,1,0.07);},
  hurt(){tone(400,0.25,'sawtooth',0.25,0.4);noise(0.15,0.2,1500);},
  steal(){tone(700,0.1,'square',0.15,0.6);tone(500,0.15,'square',0.15,0.6,0.1);},
  roar(){tone(80,1.1,'sawtooth',0.4,0.6);tone(120,1.0,'square',0.2,0.5,0.05);noise(1.0,0.3,300,2);},
  bossHit(){tone(140,0.1,'square',0.2,0.6);noise(0.08,0.15,700);},
  laugh(){for(let i=0;i<5;i++)tone(600-i*40,0.09,'square',0.12,0.8,i*0.11);},
  win(){[523,659,784,1047,784,1047].forEach((f,i)=>tone(f,0.25,'square',0.15,1,i*0.13));},
  lose(){[392,349,311,262].forEach((f,i)=>tone(f,0.4,'triangle',0.25,0.97,i*0.25));},
  click(){tone(660,0.06,'square',0.12);},
};
// Música: secuenciador simple en La menor, más intensa en el jefe
const scale=[0,3,5,7,8,10,12];
const bassLine=[0,0,7,0,5,5,3,7];
const melody=[12,10,8,7,8,7,5,3,5,7,8,10,12,15,12,10];
function mtone(f,t,dur,type,vol){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(musicGain);o.start(t);o.stop(t+dur+0.02);}
function mnoise(t,dur,vol,freq){const s=ctx.createBufferSource();s.buffer=noiseBuf;const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=freq;const g=ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);s.connect(f);f.connect(g);g.connect(musicGain);s.start(t);s.stop(t+dur);}
const VAR=[{bass:bassLine,mel:melody,tr:0,spb:0.14,bspb:0.11,lead:'square'},
 {bass:[0,0,5,5,8,8,7,7],mel:[12,15,14,12,11,12,14,15,17,15,14,12,11,8,11,12],tr:-2,spb:0.17,bspb:0.12,lead:'sawtooth'},
 {bass:[0,3,0,5,0,7,5,3],mel:[7,10,12,10,7,5,3,5,7,10,15,12,10,7,5,7],tr:2,spb:0.13,bspb:0.1,lead:'triangle'}];
let V=VAR[0];
const n2f=n=>110*Math.pow(2,n/12);
function schedule(){
  if(!ctx)return;const spb=bossMode?V.bspb:V.spb;
  while(nextT<ctx.currentTime+0.25){
    const t=nextT,s=step;
    if(s%2===0)mtone(n2f(V.bass[(s>>2)%8]-12+V.tr),t,spb*1.8,'triangle',0.5);
    if(s%4===0){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(40,t+0.15);g.gain.setValueAtTime(0.7,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.2);o.connect(g);g.connect(musicGain);o.start(t);o.stop(t+0.22);}
    if(s%8===4)mnoise(t,0.12,0.3,1500);
    if(s%2===1)mnoise(t,0.03,0.12,7000);
    if(s%2===0&&(s%32<16||bossMode))mtone(n2f(V.mel[(s>>1)%16]+(bossMode?-2:0)+V.tr),t,spb*1.5,V.lead,V.lead==='sawtooth'?0.06:V.lead==='triangle'?0.14:0.09);
    if(s%16===8)mtone(n2f(scale[(s>>4)%7]+24+V.tr),t,spb*3,'sine',0.08);
    step++;nextT+=spb;
  }
}
export function startMusic(boss=false,v=0){if(!ctx)return;bossMode=boss;V=VAR[v]||VAR[0];if(musicTimer)return;nextT=ctx.currentTime+0.05;step=0;musicTimer=setInterval(schedule,60);}
export function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null;}}
export function setBossMusic(b){bossMode=b;}

// Reanudar el audio en el primer toque/tecla (Android WebView, Telegram, iOS)
let unlocked=false;function unlockAudio(){initAudio();if(ctx&&ctx.state!=='running')ctx.resume().catch(()=>{});if(ctx&&!unlocked){unlocked=true;const b=ctx.createBuffer(1,1,ctx.sampleRate),s=ctx.createBufferSource();s.buffer=b;s.connect(ctx.destination);s.start();}}
for(const ev of['touchstart','touchend','pointerdown','keydown','click'])addEventListener(ev,unlockAudio,{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ctx&&ctx.state==='suspended')ctx.resume().catch(()=>{});});
