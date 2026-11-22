export function createNativePushClient(win, config, client) {
  let member=null, revision=0, registered=false;
  const url=config.supabaseUrl+'/functions/v1/member-push';
  function disabled(){try{return win.localStorage?.getItem('local-device-push-disabled')==='1'}catch{return false}}
  const supported=()=>Boolean(win.Notification && win.navigator?.serviceWorker && win.PushManager);
  const state={User:{PushSubscription:{get optedIn(){return registered}}}};
  async function api(action,body={}){
    const {data}=await client.auth.getSession();const token=data.session?.access_token;
    if(!token)throw new Error('Sign in to manage message alerts.');
    const response=await win.fetch(url+'?action='+action,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,apikey:config.supabaseAnonKey},body:JSON.stringify(body)});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error || (response.status===409?'Enable notifications on this device first.':'Message alerts could not connect. Please try again.'));
    return result;
  }
  async function registration(){
    const service=await win.navigator.serviceWorker.register('/sw.js',{scope:'/'});
    if(service.active)return service;
    return await Promise.race([win.navigator.serviceWorker.ready,new Promise((_,reject)=>win.setTimeout(()=>reject(new Error('Please reopen The Local and try again.')),10000))]);
  }
  async function subscription(service){
    const existing=await service.pushManager.getSubscription();if(existing)return existing;
    const response=await win.fetch(url+'?action=public-key',{cache:'no-store'});
    const data=await response.json();if(!response.ok || !data.publicKey)throw new Error('Message alerts could not connect. Please try again.');
    const base64=data.publicKey.replace(/-/g,'+').replace(/_/g,'/');
    const bytes=Uint8Array.from(win.atob(base64+'='.repeat((4-base64.length%4)%4)),c=>c.charCodeAt(0));
    return service.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
  }
  async function unregister(){
    registered=false;
    if(!supported())return;
    const service=await win.navigator.serviceWorker.getRegistration('/');
    const device=await service?.pushManager.getSubscription();if(!device)return;
    try{await api('unregister',{endpoint:device.endpoint})}finally{await device.unsubscribe()}
  }
  async function sync(next){
    const turn=++revision;const before=member;member=next||null;registered=false;
    if(!member){await unregister();return state;}
    if(!supported() || disabled() || win.Notification.permission!=='granted')return state;
    const service=await registration();
    if(before && before!==member){const old=await service.pushManager.getSubscription();if(old)await old.unsubscribe();}
    const device=await subscription(service);
    if(turn!==revision)return state;
    await api('register',{subscription:device.toJSON()});
    if(turn===revision)registered=true;
    return state;
  }
  async function enable(id){
    if(!id)throw new Error('Sign in to enable message alerts.');
    if(!supported())throw new Error('This browser cannot receive message alerts. On iPhone, add The Local to your Home Screen and open it there.');
    // Request permission directly from this click, before network calls lose user activation.
    const permission=await win.Notification.requestPermission();
    if(permission==='denied')throw new Error('Notifications are blocked. Allow notifications for The Local in your browser settings.');
    if(permission!=='granted')return 'You can enable notifications later from Alerts.';
    try{win.localStorage?.removeItem('local-device-push-disabled')}catch{}
    await sync(id);
    if(!registered)throw new Error('Message alerts could not finish connecting. Please try again.');
    return 'Message alerts are enabled on this device. Use Send a test notification to check delivery.';
  }
  async function test(id){
    if(!id)throw new Error('Sign in to test message alerts.');
    await sync(id);const result=await api('test');
    return result.sent?'Test notification sent to your enabled devices.':'Enable message alerts first.';
  }
  async function disable(){try{win.localStorage?.setItem('local-device-push-disabled','1')}catch{}await unregister();return 'Message alerts are off on this device.';}
  async function muteTable(id,table,muted){if(!id)return;await api('mute-table',{table,muted});}
  return {init:async()=>state,sync,enable,test,disable,muteTable};
}
