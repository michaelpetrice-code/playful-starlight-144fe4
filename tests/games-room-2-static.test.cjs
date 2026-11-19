/* Run with: node tests/games-room-2-static.test.cjs
 * Static integration gates; browser playthroughs remain separate.
 */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(base,f),'utf8');
test('all 14 arcade IDs remain discoverable',()=>{const js=read('games-room-next.js');for(const id of ['eightball','snooker','dartspro','pool','connect','noughts','darts','battleships','snake','memory','wordsearch','solitaire','blocks','reversi'])assert.match(js,new RegExp('\\b'+id+'\\b'))});
test('Solitaire launch is routed to new engine',()=>{assert.match(read('games-room-next.js'),/window\.TL2Solitaire/);assert.match(read('games-room-2-solitaire.js'),/window\.TL2Solitaire=mount/)});
test('all new styles and engines are included in game page',()=>{const html=read('games-room-next.html');for(const f of ['games-room-2-solitaire.js','games-room-2-solitaire.css','games-room-2-all-games.css','games-room-2-cards.js'])assert.ok(html.includes(f),f+' missing')});
test('Solitaire validates tableau sequences and has undo and hint',()=>{const js=read('games-room-2-solitaire.js');for(const token of ['function sequence()','function restore()','function hint()','function moveFoundation(','registerCleanup(','record(\'wins\')'])assert.ok(js.includes(token),token+' missing')});
test('darts uses outer double and inner treble',()=>{const js=read('realistic-engines-v192.js');assert.match(js,/r>=183&&r<=198\?2:r>=105&&r<=120\?3:1/);assert.match(js,/score=res\.bust\?visitStart:res\.score/)});
test('battleships vertical placement checks column',()=>assert.match(read('realistic-engines-more-v192.js'),/Math\.floor\(i%10\)===x/));
test('Noughts and Crosses expert mode uses minimax',()=>assert.match(read('games-room-next.js'),/function minimax\(/));
test('responsive accessibility styles exist',()=>{const css=read('games-room-2-all-games.css');assert.match(css,/prefers-reduced-motion/);assert.match(css,/focus-visible/);assert.match(css,/@media\(max-width:480px\)/)});
