export async function mountCue3D(host,kind){
 const T=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js');
 const scene=new T.Scene();scene.background=new T.Color(0x171310);
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const camera=new T.PerspectiveCamera(43,1,.1,100);let low=false,balls=[];const ballMeshes=new Map();
 const panel=document.createElement('div'),toggle=document.createElement('button');toggle.type='button';toggle.textContent='Switch 3D camera';panel.append(toggle,renderer.domElement);host.append(panel);renderer.domElement.style.cssText='display:block;width:100%;aspect-ratio:16/9;touch-action:none';
 const mat=(color,roughness=.65,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const wood=mat(0x66371c,.32),felt=mat(0x126448,.95),rubber=mat(0x16472e,.85),black=mat(0x080808),brass=mat(0xb68a43,.27,.65);
 function mesh(g,m,x,y,z){const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o}
 function box(w,h,d,m,x,y,z){return mesh(new T.BoxGeometry(w,h,d),m,x,y,z)}
 box(9.3,.45,5.1,wood,0,-.35,0);box(8.04,.1,3.84,felt,0,-.05,0);
 for(const z of [-2.2,2.2])for(const x of [-2.25,2.25]){box(3.85,.28,.4,wood,x,.04,z);box(3.75,.18,.19,rubber,x,.08,z*.91)}
 for(const x of [-4.32,4.32]){box(.42,.28,3.65,wood,x,.04,0);box(.19,.18,3.55,rubber,x*.95,.08,0)}
 for(const x of [-4.02,0,4.02])for(const z of [-1.92,1.92]){mesh(new T.CylinderGeometry(.23,.19,.08,40),black,x,.015,z);mesh(new T.TorusGeometry(.23,.025,12,40),brass,x,.05,z).rotation.x=-Math.PI/2}
 for(const x of [-3.5,3.5])for(const z of [-1.7,1.7])box(.45,2,.45,wood,x,-1.55,z);
 box(40,.2,40,mat(0x30251e),0,-2.65,0);
 scene.add(new T.HemisphereLight(0xfff3dc,0x40372e,2));const light=new T.DirectionalLight(0xffedcc,3);light.position.set(-3,9,4);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-6,right:6,top:6,bottom:-6});scene.add(light);
 const palette=[0xfff9e8,0xe5b719,0x244ca7,0xb8202e,0x643a91,0xf07921,0x16774c,0x79273a,0x101010];
 function render(state){balls=state;const visible=new Set();for(let i=0;i<state.length;i++){const b=state[i];if(!b.live)continue;visible.add(i);let o=ballMeshes.get(i);if(!o){const color=kind==='snooker'?([0xfff9e8,0xb8202e,0xe5b719,0x16774c,0x78472c,0x244ca7,0xf08ba9,0x101010][b.n]):palette[b.n>8?b.n-8:b.n];const r=kind==='snooker'?.10:.12;const tex=document.createElement('canvas');tex.width=512;tex.height=256;const g=tex.getContext('2d');g.fillStyle='#'+(color??0xffffff).toString(16).padStart(6,'0');g.fillRect(0,0,512,256);if(kind==='pool'&&b.n>8){g.fillStyle='#fff9e8';g.fillRect(0,0,512,64);g.fillRect(0,192,512,64)}if(kind==='pool'&&b.n){for(const x of [128,384]){g.fillStyle='#fff9e8';g.beginPath();g.arc(x,128,36,0,Math.PI*2);g.fill();g.fillStyle='#111';g.font='bold 44px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText(b.n,x,128)}}const map=new T.CanvasTexture(tex);map.colorSpace=T.SRGBColorSpace;o=mesh(new T.SphereGeometry(r,48,32),new T.MeshPhysicalMaterial({map,roughness:.19,clearcoat:1,clearcoatRoughness:.12}),0,r,0);ballMeshes.set(i,o)}const x=(b.x-450)/100,z=(b.y-240)/100;if(o.visible&&o.userData.placed){o.rotation.z-=(x-o.position.x)/o.geometry.parameters.radius;o.rotation.x+=(z-o.position.z)/o.geometry.parameters.radius}o.position.x=x;o.position.z=z;o.visible=true;o.userData.placed=true}for(const [i,o] of ballMeshes)o.visible=visible.has(i);
 const white=state.find(b=>b.n===0&&b.live);if(low&&white){camera.position.set((white.x-450)/100-3,1.65,(white.y-240)/100+2);camera.lookAt(0,.1,0)}else{camera.position.set(0,9,7);camera.lookAt(0,0,0)}const w=Math.max(1,panel.clientWidth);renderer.setSize(w,w*9/16,false);camera.aspect=16/9;camera.updateProjectionMatrix();renderer.render(scene,camera)}
 toggle.onclick=()=>{low=!low;render(balls)};const observer=new ResizeObserver(()=>render(balls));observer.observe(panel);
 return {render,dispose(){observer.disconnect();scene.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose()});renderer.dispose();panel.remove()}};
}
