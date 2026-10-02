/* Fixed-step single-body circle physics. No scripted result or hidden outcome. */
(function(root){
'use strict';
const G=900, R=15, STEP=1/240, LEFT=42, RIGHT=456, BOTTOM=690, CHANNELS=9;
const pegs=[];
for(let row=0;row<8;row++)for(let col=0;col<(row%2?6:7);col++)pegs.push({x:82+col*56+(row%2?28:0),y:224+row*48,r:5.5});

const segments=[
[LEFT,92,LEFT,718],[LEFT,92,85,62],[85,62,464,62],
[464,62,520,116],[520,116,520,718],
[RIGHT,205,RIGHT,718],
];
for(let i=1;i<CHANNELS;i++)segments.push([LEFT+i*46,622,LEFT+i*46,718]);
class World{
constructor(charge){this.ball={x:488,y:661,vx:0,vy:-(950+470*Math.max(0,Math.min(1,charge))),angle:0,omega:0};this.elapsed=0;this.entered=false;this.result=null;this.hits=[];this.stall=0;}
contact(nx,ny,penetration,restitution,tag){const b=this.ball;b.x+=nx*(penetration+.02);b.y+=ny*(penetration+.02);const dot=b.vx*nx+b.vy*ny;if(dot<0){b.vx-=(1+restitution)*dot*nx;b.vy-=(1+restitution)*dot*ny;const tangent=-b.vx*ny+b.vy*nx;b.omega=tangent/R*.3;if(Math.abs(dot)>35)this.hits.push({x:b.x-nx*R,y:b.y-ny*R,power:Math.min(1,Math.abs(dot)/500),tag});}}
step(dt=STEP){if(this.result)return this.result;const b=this.ball;this.hits=[];this.elapsed+=dt;b.vy+=G*dt;b.vx*=Math.exp(-.035*dt);b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.omega*dt;b.omega*=Math.exp(-.2*dt);
for(let iteration=0;iteration<2;iteration++){
for(const [ax,ay,bx,by]of (this.entered?[...segments,[RIGHT,62,RIGHT,205]]:segments)){const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((b.x-ax)*dx+(b.y-ay)*dy)/(dx*dx+dy*dy)));const px=ax+t*dx,py=ay+t*dy;let nx=b.x-px,ny=b.y-py;const d=Math.hypot(nx,ny);if(d<R&&d>.00001)this.contact(nx/d,ny/d,R-d,.78,'wall');}
for(const p of pegs){const dx=b.x-p.x,dy=b.y-p.y,d=Math.hypot(dx,dy),limit=R+p.r;if(d<limit&&d>.00001)this.contact(dx/d,dy/d,limit-d,p.bumper?.88:.66,p.bumper?'bumper':'peg');}}
if(b.x<RIGHT-R-2&&b.y<622)this.entered=true;
if(b.y>=BOTTOM){if(!this.entered||b.x>RIGHT){this.result={retry:true};}else{this.result={channel:Math.max(0,Math.min(8,Math.floor((b.x-LEFT)/46)))};}return this.result;}
if(!Number.isFinite(b.x+b.y+b.vx+b.vy)||this.elapsed>40){this.result={retry:true};return this.result;}
if(Math.hypot(b.vx,b.vy)<45){this.stall+=dt;if(this.stall>.5){b.vx+=Math.sin(this.elapsed*13)*80+30;this.stall=0;}}else this.stall=0;
return null;
}
}
const api={World,pegs,segments,G,R,STEP,LEFT,RIGHT,BOTTOM,CHANNELS};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.EggPhysics=api;
})(typeof globalThis!=='undefined'?globalThis:this);
