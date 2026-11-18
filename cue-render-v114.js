/* The Local v114: high-detail 2D cue-table renderer; no change to physics/rules. */
const TAU=Math.PI*2;
function path(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function ball(ctx,b,r,mode){
 const {x,y}=b;
 ctx.save();
 ctx.fillStyle='rgba(0,0,0,.48)';ctx.filter='blur(4px)';ctx.beginPath();ctx.ellipse(x+4,y+6,r*1.05,r*.78,0,0,TAU);ctx.fill();ctx.filter='none';
 let g=ctx.createRadialGradient(x-r*.48,y-r*.6,0,x+r*.15,y+r*.2,r*1.7);
 g.addColorStop(0,'#fff');g.addColorStop(.16,b.color);g.addColorStop(.67,b.color);g.addColorStop(1,'#101a18');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
 if(mode==='pool'&&b.number>0){
  if(b.number>8){ctx.save();ctx.beginPath();ctx.arc(x,y,r-.5,0,TAU);ctx.clip();ctx.fillStyle='rgba(255,255,255,.91)';ctx.fillRect(x-r,y-r*.37,2*r,r*.74);ctx.restore()}
  ctx.fillStyle='#fffef3';ctx.beginPath();ctx.ellipse(x-r*.06,y+r*.04,r*.43,r*.4,0,0,TAU);ctx.fill();ctx.fillStyle='#161616';ctx.font=`bold ${Math.max(8,r*.78)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(b.number),x-r*.06,y+r*.09);
 }
 ctx.strokeStyle='rgba(255,255,255,.32)';ctx.lineWidth=.65;ctx.beginPath();ctx.arc(x,y,r-.6,Math.PI*1.12,Math.PI*1.7);ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.82)';ctx.beginPath();ctx.ellipse(x-r*.38,y-r*.42,r*.22,r*.13,-.55,0,TAU);ctx.fill();ctx.restore();
}
export function renderPremiumCue(ctx,balls,opts){
 const {W,H,left,right,top,bottom,r,mode,pockets,drag,guide}=opts;
 ctx.clearRect(0,0,W,H);
 // Table surround and layered walnut frame.
 let bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#080f0c');bg.addColorStop(.5,'#183a2b');bg.addColorStop(1,'#050b09');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.shadowColor='#000';ctx.shadowBlur=27;ctx.shadowOffsetY=9;
 let walnut=ctx.createLinearGradient(0,0,0,H);walnut.addColorStop(0,'#a76a32');walnut.addColorStop(.17,'#4c2616');walnut.addColorStop(.55,'#6b371b');walnut.addColorStop(.85,'#3b1b10');walnut.addColorStop(1,'#b17b3c');ctx.fillStyle=walnut;path(ctx,10,10,W-20,H-20,30);ctx.fill();ctx.restore();
 ctx.strokeStyle='#e7b66a';ctx.lineWidth=2.5;path(ctx,12,12,W-24,H-24,29);ctx.stroke();
 ctx.strokeStyle='rgba(255,222,151,.3)';ctx.lineWidth=1;path(ctx,22,22,W-44,H-44,22);ctx.stroke();
 // Subtle woodgrain following long rails.
 ctx.save();path(ctx,11,11,W-22,H-22,29);ctx.clip();for(let i=0;i<26;i++){
  const yy=17+i*1.25;ctx.strokeStyle=`rgba(245,176,95,${.025+(i%5)*.012})`;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(25,yy);ctx.bezierCurveTo(240,yy+3,620,yy-4,875,yy+2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(25,H-yy);ctx.bezierCurveTo(240,H-yy-3,620,H-yy+4,875,H-yy-2);ctx.stroke();
 }ctx.restore();
 // Rail cushion: gold trim and dark green bevel.
 ctx.fillStyle='#c69a54';path(ctx,left-11,top-11,right-left+22,bottom-top+22,18);ctx.fill();
 let rail=ctx.createLinearGradient(0,top,0,bottom);rail.addColorStop(0,'#082a20');rail.addColorStop(.12,'#14513c');rail.addColorStop(.88,'#0c3528');rail.addColorStop(1,'#041e17');ctx.fillStyle=rail;path(ctx,left-6,top-6,right-left+12,bottom-top+12,13);ctx.fill();
 // Felt with stage-light falloff and finely spaced nap.
 let felt=ctx.createRadialGradient(W*.4,H*.28,24,W*.48,H*.52,540);felt.addColorStop(0,'#277e69');felt.addColorStop(.42,'#176e58');felt.addColorStop(.83,'#0b4939');felt.addColorStop(1,'#073429');ctx.fillStyle=felt;path(ctx,left,top,right-left,bottom-top,10);ctx.fill();
 ctx.save();path(ctx,left,top,right-left,bottom-top,10);ctx.clip();for(let y=top;y<bottom;y+=3){ctx.strokeStyle='rgba(255,255,255,.018)';ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke()}
 let light=ctx.createLinearGradient(0,top,0,bottom);light.addColorStop(0,'rgba(255,255,255,.12)');light.addColorStop(.34,'rgba(255,255,255,.012)');light.addColorStop(1,'rgba(0,0,0,.16)');ctx.fillStyle=light;ctx.fillRect(left,top,right-left,bottom-top);ctx.restore();
 // Baulk/centre line and spot markings.
 ctx.strokeStyle='rgba(235,255,240,.17)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(450,top+9);ctx.lineTo(450,bottom-9);ctx.stroke();
 ctx.fillStyle='rgba(255,255,255,.28)';for(const x of [230,650]){ctx.beginPath();ctx.arc(x,240,2.5,0,TAU);ctx.fill()}
 // Diamond sights on top/bottom wood rails.
 for(let i=1;i<8;i++)for(const y of [28,H-28]){const x=left+i*(right-left)/8;ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle='#f7dfaa';ctx.shadowColor='#ffcd74';ctx.shadowBlur=4;ctx.fillRect(-3,-3,6,6);ctx.restore()}
 // Pocket liners and metallic corner fittings.
 for(const [x,y] of pockets){ctx.save();ctx.shadowColor='#000';ctx.shadowBlur=11;ctx.fillStyle='#b9914c';ctx.beginPath();ctx.arc(x,y,25,0,TAU);ctx.fill();ctx.shadowBlur=0;let p=ctx.createRadialGradient(x-3,y-4,2,x,y,24);p.addColorStop(0,'#010706');p.addColorStop(.72,'#020c0b');p.addColorStop(.88,'#0d1a16');p.addColorStop(1,'#654928');ctx.fillStyle=p;ctx.beginPath();ctx.arc(x,y,22,0,TAU);ctx.fill();ctx.strokeStyle='rgba(245,212,147,.42)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,23,Math.PI*1.12,Math.PI*1.89);ctx.stroke();ctx.restore()}
 for(const b of balls){if(b.live)ball(ctx,b,r,mode)}
 const cue=balls[0];if(cue?.live&&drag&&guide){const dx=cue.x-drag.x,dy=cue.y-drag.y,d=Math.hypot(dx,dy)||1,nx=dx/d,ny=dy/d;
  ctx.save();ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=1.5;ctx.setLineDash([9,8]);ctx.beginPath();ctx.moveTo(cue.x+nx*r,cue.y+ny*r);ctx.lineTo(cue.x+nx*360,cue.y+ny*360);ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='#d9b47a';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(cue.x-nx*(r+22),cue.y-ny*(r+22));ctx.lineTo(cue.x-nx*205,cue.y-ny*205);ctx.stroke();ctx.strokeStyle='#f8e6c0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cue.x-nx*(r+22),cue.y-ny*(r+22));ctx.lineTo(cue.x-nx*120,cue.y-ny*120);ctx.stroke();ctx.restore()}
}
