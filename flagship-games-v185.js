(()=>{'use strict';
const E=(tag,cls,text)=>{let x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
const add=(parent,tag,cls,text)=>{let x=E(tag,cls,text);parent.append(x);return x};
function btn(parent,text,fn){let b=add(parent,'button','tl185-btn',text);b.type='button';b.onclick=fn;return b}
const rand=n=>Math.floor(Math.random()*n);
function panel(root,title,description){const box=add(root,'section','tl185-panel');add(box,'h3','',title);add(box,'p','tl185-intro',description);return box}
function eightball({root,say,record,difficulty,coach}){
 const box=panel(root,'Eight-ball • turn-based challenge','A tactical eight-ball game with ball selection, fouls, computer shots and eight-ball finishing. This is a turn-based rules challenge, not full cue-ball physics.');
 const status=add(box,'div','tl185-status'),table=add(box,'div','tl185-ball-table'),controls=add(box,'div','tl185-controls');
 let left={solid:[1,2,3,4,5,6,7],stripe:[9,10,11,12,13,14,15]},group=null,turn=0,finished=false,shots=0;
 const remain=g=>left[g].length;
 const balls=()=>[...left.solid,...left.stripe,8].filter(n=>n!==8||(!finished));
 function draw(){table.replaceChildren();for(const n of balls()){const b=add(table,'span','tl185-ball '+(n===8?'black':n<8?'solid':'stripe'),String(n));b.title='Ball '+n}status.textContent=`${turn===0?'Your turn':'Computer turn'} · Your group: ${group||'not assigned'} · Solids ${remain('solid')} · Stripes ${remain('stripe')} · Shots ${shots}`;controls.replaceChildren();if(finished)return;
 const g=group||'solid';for(const n of left[g])btn(controls,'Pot '+n,()=>shot(n));if(!group)for(const n of left.stripe)btn(controls,'Pot '+n,()=>shot(n));if(group&&!remain(group))btn(controls,'Pot the 8',()=>shot(8));btn(controls,'Safety / miss',()=>shot(0));btn(controls,'Scratch / foul',()=>shot(-1));}
 function finish(won,why){finished=true;record(won?'wins':'losses');say((won?'You win! 🏆 ':'Computer wins. ')+why);draw()}
 function shot(n){if(finished||turn!==0)return;shots++;if(n===8){if(group&&remain(group)===0)finish(true,'Eight-ball potted legally.');else finish(false,'The eight-ball was potted early.');return}
 if(n<0){say('Scratch: ball-in-hand to the computer.');turn=1;draw();setTimeout(bot,300);return}
 if(n===0){say('Safety played. Computer to shoot.');turn=1;draw();setTimeout(bot,300);return}
 const g=n<8?'solid':'stripe';if(group&&g!==group){say('Wrong group potted — foul. Computer has ball-in-hand.');turn=1;draw();setTimeout(bot,300);return}
 if(!group)group=g;left[g]=left[g].filter(x=>x!==n);say('Potted '+n+'. '+(!remain(group)?'You are now on the eight-ball.':'Continue your break.'));draw()}
 function bot(){if(finished)return;const botGroup=group==='solid'?'stripe':'solid';let options=left[botGroup];const chance=difficulty==='hard'?.82:difficulty==='easy'?.42:.65;
 if(!options.length){if(Math.random()<chance){finish(false,'The computer cleared its group and potted the eight.');return}say('Computer missed the eight-ball. Your turn.');turn=0;draw();return}
 if(Math.random()<chance){let n=options[rand(options.length)];left[botGroup]=options.filter(x=>x!==n);say('Computer potted '+n+'.');if(!left[botGroup].length&&Math.random()<chance){finish(false,'Computer completed its clearance.');return}}
 else say('Computer missed.');turn=0;draw()}
 coach(()=>group&&!remain(group)?'All your group balls are cleared. Pot the eight to win.':group?'Your group is '+group+'. Pot your own balls first, then the eight. A wrong-group pot is treated as a foul.':'The table is open. Choose solids or stripes by potting one of them.');draw();say('Your break: choose a ball to attempt.');
}
function snooker({root,say,record,difficulty,coach}){
 const box=panel(root,'Snooker • scoring challenge','Alternate turns with the computer. Pot reds followed by colours, then clear yellow to black. A simplified tactical challenge, not a full physics/referee simulation.');
 const status=add(box,'div','tl185-status'),balls=add(box,'div','tl185-snooker-balls'),controls=add(box,'div','tl185-controls');
 const colors=[['Yellow',2],['Green',3],['Brown',4],['Blue',5],['Pink',6],['Black',7]];let reds=15,phase='red',clearIndex=0,score=[0,0],turn=0,finished=false,breakPoints=0;
 function legal(){if(reds>0)return phase==='red'?[['Red',1]]:colors;return colors.slice(clearIndex,clearIndex+1)}
 function end(){finished=true;let win=score[0]>score[1];if(score[0]===score[1]){say('Scores tied — replay for a decider.');record('draws')}else{record(win?'wins':'losses');say((win?'You win! 🏆':'Computer wins.')+` Final score ${score[0]}–${score[1]}.`)}draw()}
 function draw(){status.textContent=`You ${score[0]} · Computer ${score[1]} · Reds left ${reds} · ${turn===0?'Your turn':'Computer turn'} · On: ${legal().map(x=>x[0]).join(' / ')}`;balls.replaceChildren();for(let i=0;i<reds;i++)add(balls,'span','tl185-red');for(const [name,points] of colors){if(reds||colors.indexOf(colors.find(x=>x[0]===name))>=clearIndex){let x=add(balls,'span','tl185-color c'+points,name[0]);x.title=name}}controls.replaceChildren();if(finished||turn!==0)return;for(const [name,points] of legal())btn(controls,'Pot '+name+' (+'+points+')',()=>play(name,points));btn(controls,'Miss / safety',()=>play('miss',0));btn(controls,'Foul',()=>play('foul',-4))}
 function play(name,points){if(finished||turn!==0)return;step(0,name,points)}
 function step(player,name,points){if(points<0){score[1-player]+=4;phase=reds?'red':phase;turn=1-player;breakPoints=0;say((player===0?'You':'Computer')+' fouled. Four points awarded to opponent.');draw();if(turn===1)setTimeout(bot,280);return}
 if(!points){turn=1-player;breakPoints=0;say((player===0?'You played':'Computer played')+' a safety.');draw();if(turn===1)setTimeout(bot,280);return}
 score[player]+=points;breakPoints+=points;
 if(reds>0){if(name==='Red'){reds--;phase='colour'}else phase=reds?'red':'clear'}else{clearIndex++;phase='clear'}
 if(reds===0&&name==='Red')phase='colour';if(reds===0&&name!=='Red'&&phase==='clear'&&clearIndex===0){/* last colour after last red is respotted; clearance begins */}
 if(clearIndex>=colors.length){end();return}
 say((player===0?'You potted ':'Computer potted ')+name+'. Break '+breakPoints+'.');draw();if(player===1)setTimeout(bot,350)}
 function bot(){if(finished||turn!==1)return;const chance=difficulty==='hard'?.78:difficulty==='easy'?.38:.57;if(Math.random()>chance){step(1,'miss',0);return}let options=legal(),pick=options[rand(options.length)];step(1,pick[0],pick[1])}
 coach(()=>`The ball on is ${legal().map(x=>x[0]).join(' or ')}. Reds are worth one point. After each red, choose a colour. When reds are gone, clear yellow, green, brown, blue, pink and black.`);draw();say('Snooker scoring challenge: start with a red.');
}
function darts({root,say,record,difficulty,coach}){
 const box=panel(root,'Darts • 501 versus computer','Choose your target and multiplier for each dart. Both players must finish on a double. No random pointer scoring.');
 const status=add(box,'div','tl185-status'),controls=add(box,'div','tl185-controls'),history=add(box,'div','tl185-history');
 let scores=[501,501],turn=0,darts=0,start=501,finished=false,visits=0,mult=1;
 const multi=add(box,'div','tl185-controls');for(const [name,m] of [['Single',1],['Double',2],['Treble',3]])btn(multi,name,()=>{mult=m;draw()});
 function draw(){status.textContent=`You ${scores[0]} · Computer ${scores[1]} · ${turn===0?'Your turn':'Computer turn'} · Darts left ${3-darts} · Target: ${mult===1?'Single':mult===2?'Double':'Treble'}`;controls.replaceChildren();if(finished)return;for(let n=1;n<=20;n++)btn(controls,String(n),()=>throwDart(n*mult,mult===2,`${mult===3?'T':mult===2?'D':'S'}${n}`));btn(controls,'Outer bull 25',()=>throwDart(25,false,'25'));btn(controls,'Bull 50',()=>throwDart(50,true,'Bull'));btn(controls,'Miss',()=>throwDart(0,false,'Miss'));}
 function log(s){const item=add(history,'div','',s);if(history.children.length>8)history.firstChild.remove();}
 function throwDart(points,double,label){if(finished||turn!==0)return;apply(0,points,double,label)}
 function apply(player,points,double,label){let next=scores[player]-points;log(`${player===0?'You':'Computer'}: ${label} (${points})`);darts++;
 if(next===0&&double){scores[player]=0;finished=true;record(player===0?'wins':'losses');say((player===0?'You win! 🏆':'Computer wins.')+' Double-out checkout.');draw();return}
 if(next<2||(next===0&&!double)){scores[player]=start;log('Bust — visit score restored');endVisit(player);return}
 scores[player]=next;if(darts===3){endVisit(player)}else draw()}
 function endVisit(player){visits++;darts=0;turn=1-player;start=scores[turn];draw();if(turn===1)setTimeout(bot,300);else say('Your turn. Choose a target.');}
 function bot(){if(finished||turn!==1)return;const s=scores[1],accuracy=difficulty==='hard'?.8:difficulty==='easy'?.38:.58;let n=20,m=3;if(s<=40&&s%2===0){n=s/2;m=2}else if(s<=50&&s%2===1){n=Math.max(1,Math.min(20,s-32));m=1}else if(s<62){n=16;m=2}if(Math.random()>accuracy){n=rand(20)+1;m=1}apply(1,n*m,m===2,`${m===3?'T':m===2?'D':'S'}${n}`);if(turn===1&&!finished)setTimeout(bot,300)}
 coach(()=>{let s=scores[0];if(s<=40&&s%2===0)return `Checkout available: double ${s/2}. Select Double and ${s/2}.`;if(s===50)return 'Checkout: inner bull (50).';if(s<100)return 'Try to leave an even number of 40 or less for a double-out.';return 'Aim at treble 20 to reduce your score quickly. You must finish exactly on a double.'});draw();say('501 double-out. You throw first.');
}
window.TL185Games={eightball,snooker,darts};
})();