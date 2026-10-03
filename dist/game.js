'use strict';
(()=>{
const $=id=>document.getElementById(id),canvas=$('board'),ctx=canvas.getContext('2d'),P=EggPhysics;
const egg=new Image();egg.src='assets/egg.png';
const state={stock:100,best:100,stake:1,step:1,phase:'idle',multiplier:0,targets:[],charge:0,world:null,rounds:0,win:false,retry:false};
let chargeStart=0,lastTime=0,accumulator=0,clock=0,lockTimer=null,rollStep=0,sound=false,audio=null,lastTone=0,flashTimer=null;
let particles=[],trail=[],ringHits=[];
const launch=$('launch'),lock=$('lock');
function randomInt(n){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n;}
function pickTargets(count){const all=Array.from({length:9},(_,i)=>i);for(let i=8;i>0;i--){const j=randomInt(i+1);[all[i],all[j]]=[all[j],all[i]];}return all.slice(0,count).sort((a,b)=>a-b);}
function clearFlash(){clearTimeout(flashTimer);$('roundFlash').classList.remove('visible');}
function flash(value,label,kind){clearFlash();$('flashValue').textContent=value;$('flashLabel').textContent=label;$('roundFlash').classList.toggle('payout',kind==='payout');$('roundFlash').classList.add('visible');flashTimer=setTimeout(clearFlash,kind==='payout'?1900:1300);}
function renderUI(){
$('stock').textContent=state.stock.toLocaleString();$('best').textContent=state.best.toLocaleString();$('stake').textContent=state.stake;
$('multiplier').innerHTML=(state.multiplier||'—')+'<small>倍</small>';
$('reward').innerHTML=(state.multiplier?(state.stake*state.multiplier).toLocaleString():'—')+'<small>颗</small>';
const editable=state.phase==='idle';$('minus').disabled=!editable||state.stake<=1;$('plus').disabled=!editable||state.stake>=Math.min(state.stock,50);
document.querySelectorAll('[data-step]').forEach(b=>{b.disabled=!editable;const selected=Number(b.dataset.step)===state.step;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
lock.disabled=!editable||state.stock<state.stake;lock.textContent=state.phase==='rolling'?'转动':editable?'启动':'已启动';
launch.disabled=!['locked','charging'].includes(state.phase);
$('launchLabel').textContent=state.phase==='charging'?'松手':'蓄力';
launch.classList.toggle('charging',state.phase==='charging');
$('boardPhase').textContent=state.phase==='idle'&&state.stock===0?'奶蛋用完，重新开局':state.phase==='locked'&&state.retry?'力度不足，再试一次':({idle:'等待启动',rolling:'好运转动中',locked:'按住蓄力',charging:'奶蛋准备起飞',flying:'蛋在路上'})[state.phase];
$('chargeText').textContent=state.phase==='charging'?Math.round(state.charge*100)+'%':state.phase==='locked'?'按住蓄力':state.phase==='flying'?'咻——':'等待启动';
$('chargeFill').style.height=(state.phase==='charging'?state.charge*100:0)+'%';
launch.style.setProperty('--charge',state.phase==='charging'?state.charge:0);
$('reset').disabled=['rolling','charging','flying','locked'].includes(state.phase);
}
function setStake(n){if(state.phase!=='idle')return false;state.stake=Math.max(1,Math.min(50,state.stock,Math.floor(n)));renderUI();return true;}
function setStep(n){if(state.phase!=='idle'||![1,5,10].includes(n))return;state.step=n;renderUI();}
function lockRound(){if(state.phase!=='idle'||state.stock<state.stake)return false;clearFlash();state.phase='rolling';state.win=false;state.retry=false;rollStep=0;document.body.classList.remove('win');renderUI();
lockTimer=setInterval(()=>{state.multiplier=[2,3,5,10][randomInt(4)];state.targets=pickTargets(1+randomInt(4));tone(250+rollStep*28,.035,.02);renderUI();rollStep++;if(rollStep>=15){clearInterval(lockTimer);lockTimer=null;const m=[2,2,2,3,3,5,5,10][randomInt(8)];state.multiplier=m;state.targets=pickTargets(({2:5,3:4,5:2,10:1})[m]);state.stock-=state.stake;state.phase='locked';flash('×'+m,'本局倍率','multiplier');tone(630,.09,.045);renderUI();}},65);return true;
}
function beginCharge(){if(state.phase!=='locked')return;clearFlash();state.phase='charging';state.charge=0;chargeStart=performance.now();renderUI();}
function releaseCharge(cancel=false){if(state.phase!=='charging')return;if(cancel){state.phase='locked';state.charge=0;renderUI();return;}
const charge=Math.min(1,(performance.now()-chargeStart)/1100);fire(charge);}
function fire(charge){if(!['locked','charging'].includes(state.phase))return false;clearFlash();state.phase='flying';state.retry=false;state.charge=charge;state.world=new P.World(charge);trail=[];accumulator=0;tone(170+charge*400,.12,.04);renderUI();return true;}
function settle(result){state.world=null;state.charge=0;if(result.retry){state.phase='locked';state.retry=true;renderUI();return;}
state.phase='idle';state.rounds++;state.win=state.targets.includes(result.channel);if(state.win){const reward=state.stake*state.multiplier;state.stock+=reward;state.best=Math.max(state.best,state.stock);flash('+'+reward.toLocaleString(),'命中！奶蛋入账','payout');document.body.classList.add('win');setTimeout(()=>document.body.classList.remove('win'),1200);for(let i=0;i<42;i++)particles.push({x:P.LEFT+(result.channel+.5)*46,y:651,vx:(Math.random()-.5)*190,vy:-90-Math.random()*220,life:1.2+Math.random(),color:i%2?'#d1ff67':'#ffdc46'});[420,530,660,840].forEach((v,i)=>setTimeout(()=>tone(v,.13,.045),i*90));}else{tone(145,.16,.025);}
if(state.stock>0)state.stake=Math.min(state.stake,state.stock);renderUI();}
function reset(){if(state.phase!=='idle')return false;clearFlash();Object.assign(state,{stock:100,best:100,stake:1,step:1,phase:'idle',multiplier:0,targets:[],charge:0,world:null,rounds:0,win:false,retry:false});particles=[];trail=[];ringHits=[];document.body.classList.remove('win');renderUI();return true;}
function tone(freq,duration=.06,gain=.025){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{sound=false;}}
function rounded(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function circle(x,y,r,fill,stroke){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function text(t,x,y,size,color,align='center',weight=700){ctx.font=weight+' '+size+'px system-ui,sans-serif';ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(t,x,y);}
function drawEgg(x,y,angle=0,scale=1){ctx.save();ctx.translate(x,y);ctx.rotate(angle*.5);ctx.scale(scale,1/scale);ctx.shadowColor='#0008';ctx.shadowBlur=8;ctx.shadowOffsetY=4;if(egg.complete&&egg.naturalWidth){ctx.drawImage(egg,-18,-25,36,42);}else{circle(0,0,P.R,'#ffdc46');}ctx.restore();}
function draw(){ctx.clearRect(0,0,540,740);
const bg=ctx.createLinearGradient(0,0,0,740);bg.addColorStop(0,'#18492f');bg.addColorStop(1,'#0b2d23');ctx.fillStyle=bg;ctx.fillRect(0,0,540,740);
// Quiet technical lines keep the moving egg easy to follow.
ctx.strokeStyle='#6c9b5130';ctx.lineWidth=1;for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(247,365,130+i*35,.2,Math.PI*1.75);ctx.stroke();}
// Outer launch rail, visible from the lower right to the top left.
ctx.beginPath();ctx.moveTo(489,690);ctx.lineTo(489,121);ctx.quadraticCurveTo(478,93,450,92);ctx.lineTo(86,92);ctx.quadraticCurveTo(62,94,59,122);ctx.strokeStyle='#274a38';ctx.lineWidth=34;ctx.stroke();ctx.strokeStyle='#bdc998';ctx.lineWidth=2;ctx.stroke();
ctx.strokeStyle='#648459';ctx.lineWidth=3;for(const [ax,ay,bx,by]of P.segments.slice(0,6)){ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();}
if(state.world?.entered){ctx.strokeStyle='#d1ff6788';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(456,80);ctx.lineTo(456,205);ctx.stroke();}
// Small direction marks within the rail.
ctx.strokeStyle='#cbd99866';ctx.lineWidth=2;for(let y=300;y<600;y+=90){ctx.beginPath();ctx.moveTo(482,y+4);ctx.lineTo(489,y-4);ctx.lineTo(496,y+4);ctx.stroke();}
text('发射轨道',489,187,12,'#bccb9f');
rounded(122,119,250,63,16,'#092c21','#3d6344');text(state.phase==='rolling'?'好运转动中':state.multiplier?'本 局  × '+state.multiplier:'准 备' ,247,146,24,state.multiplier?'#ffdc46':'#d7e8ae');text(state.targets.length?'亮灯才算赢':'按启动开灯',247,167,12,'#91ae83');
// Central medallion bumper.
for(const p of P.pegs){if(p.bumper){circle(p.x,p.y,p.r+4,'#254e33','#6c8c4d');circle(p.x,p.y,p.r,'#ffdc46');text('蛋',p.x,p.y,24,'#305235');continue;}
ctx.shadowColor='#0009';ctx.shadowBlur=4;ctx.shadowOffsetY=3;circle(p.x,p.y,p.r+1,'#061e16');ctx.shadowBlur=0;ctx.shadowOffsetY=0;const grad=ctx.createRadialGradient(p.x-2,p.y-2,0,p.x,p.y,p.r+1);grad.addColorStop(0,'#f0f2bb');grad.addColorStop(.45,'#b7c799');grad.addColorStop(1,'#5a7953');circle(p.x,p.y,p.r,grad);}
// Bottom channels; winning lights are locked before firing.
for(let i=0;i<9;i++){const x=P.LEFT+i*46,on=state.targets.includes(i);rounded(x+3,625,40,82,8,on?'#354f27':'#08291f',on?'#91b94c':'#2d5038');if(on){ctx.shadowColor='#d1ff67';ctx.shadowBlur=15;circle(x+23,642,5,'#d1ff67');ctx.shadowBlur=0;}else circle(x+23,642,4,'#456348');text(String(i+1).padStart(2,'0'),x+23,686,14,on?'#e7ff9d':'#87a47a');ctx.strokeStyle='#7b945f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,622);ctx.lineTo(x,718);ctx.stroke();}

rounded(471,686,34,22,6,'#d6c75f','#f8df78');ctx.strokeStyle='#294f32';ctx.lineWidth=2;for(let y=691;y<705;y+=4){ctx.beginPath();ctx.moveTo(475,y);ctx.lineTo(500,y);ctx.stroke();}
if(state.phase==='flying'&&state.world){const b=state.world.ball;trail.forEach((p,i)=>circle(p.x,p.y,2+3*i/trail.length,'rgba(255,220,70,'+(i/trail.length*.18)+')'));drawEgg(b.x,b.y,b.angle,1+Math.sin(clock*12)*.025);}else drawEgg(488,661+state.charge*10,0,state.phase==='charging'?1+state.charge*.08:1);
ringHits.forEach(p=>{ctx.globalAlpha=p.life*2;circle(p.x,p.y,5+(1-p.life*2)*12,null,p.tag==='bumper'?'#ffdc46':'#d8efac');ctx.globalAlpha=1;});
particles.forEach(p=>{ctx.globalAlpha=Math.min(1,p.life);rounded(p.x,p.y,5,9,1,p.color);ctx.globalAlpha=1;});
}
function tick(t){requestAnimationFrame(tick);const elapsed=lastTime?Math.min((t-lastTime)/1000,.05):0;lastTime=t;clock+=elapsed;
if(document.hidden){accumulator=0;return;}
if(state.phase==='charging'){state.charge=Math.min(1,(t-chargeStart)/1100);renderUI();}
if(state.world&&state.phase==='flying'){accumulator+=elapsed;while(accumulator>=P.STEP&&state.world){const world=state.world,result=world.step();for(const h of world.hits){ringHits.push({...h,life:.5});if(t-lastTone>55){tone(h.tag==='bumper'?780:340+h.power*600,.04,.012+h.power*.012);lastTone=t;}}accumulator-=P.STEP;if(result)settle(result);}if(state.world){trail.push({x:state.world.ball.x,y:state.world.ball.y});if(trail.length>14)trail.shift();}}
for(const p of particles){p.x+=p.vx*elapsed;p.y+=p.vy*elapsed;p.vy+=350*elapsed;p.life-=elapsed;}particles=particles.filter(p=>p.life>0);ringHits.forEach(p=>p.life-=elapsed);ringHits=ringHits.filter(p=>p.life>0);draw();}
$('minus').onclick=()=>setStake(state.stake-state.step);$('plus').onclick=()=>setStake(state.stake+state.step);document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>setStep(Number(b.dataset.step)));lock.onclick=lockRound;$('reset').onclick=reset;
// Restrict browser selection/callouts to the machine; help text remains selectable.
['selectstart','contextmenu','dragstart','dblclick'].forEach(name=>$('machine').addEventListener(name,e=>e.preventDefault()));
launch.addEventListener('pointerdown',e=>{if(state.phase!=='locked')return;e.preventDefault();launch.setPointerCapture(e.pointerId);beginCharge();});launch.addEventListener('pointerup',e=>{e.preventDefault();releaseCharge();});launch.addEventListener('pointercancel',()=>releaseCharge(true));launch.addEventListener('lostpointercapture',()=>releaseCharge(true));
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!$('helpDialog').open&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)){e.preventDefault();beginCharge();}});window.addEventListener('keyup',e=>{if(e.code==='Space'){e.preventDefault();releaseCharge();}});window.addEventListener('blur',()=>releaseCharge(true));document.addEventListener('visibilitychange',()=>{lastTime=0;accumulator=0;if(document.hidden)releaseCharge(true);});
$('help').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();$('helpDialog').addEventListener('click',e=>{if(e.target===$('helpDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('sound').onclick=()=>{sound=!sound;$('sound').textContent='声音 '+(sound?'开':'关');$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'关闭声音':'开启声音');if(sound)tone(580,.1,.04);};
renderUI();requestAnimationFrame(tick);
const read=(input={})=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('状态查询不接受参数');return {stock:state.stock,stake:state.stake,step:state.step,phase:state.phase,multiplier:state.multiplier,litChannels:state.targets.map(i=>i+1),rounds:state.rounds};};
if(document.modelContext?.registerTool){try{document.modelContext.registerTool({name:'read_egg_pachinko',title:'查看蛋珠机状态',description:'读取奶蛋库存、本局投入、倍率、亮灯通道及阶段。',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:read});}catch{}}
})();
