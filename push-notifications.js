// Shared by the main app and standalone table pages. Never stores a REST API key.
export function createPushClient(win, doc, config) {
  let ready = null, desiredMember = null, identityTail = Promise.resolve();
  function init() {
    if (!config.oneSignalAppId) return Promise.resolve(null);
    if (ready) return ready;
    ready = new Promise((resolve, reject) => {
      const timer = win.setTimeout(() => reject(new Error('Phone alerts could not connect. Please try again.')), 15000);
      win.OneSignalDeferred = win.OneSignalDeferred || [];
      win.OneSignalDeferred.push(async sdk => {
        try {
          await sdk.init({appId:config.oneSignalAppId,serviceWorkerPath:'OneSignalSDKWorker.js',serviceWorkerParam:{scope:'/onesignal/'},promptOptions:{slidedown:{prompts:[{type:'push',autoPrompt:false}]}}});
          win.clearTimeout(timer); resolve(sdk);
        } catch (error) { win.clearTimeout(timer); reject(error); }
      });
      if (!doc.querySelector('script[data-local-push]')) {
        const script = doc.createElement('script');
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.defer = true; script.dataset.localPush = '1';
        script.onerror = () => { win.clearTimeout(timer); reject(new Error('Phone alerts could not connect. Please try again.')); };
        doc.head.append(script);
      }
    });
    // Keep a failed initialization cached: retrying init on the same page can double-initialize the SDK.
    return ready;
  }
  async function sync(member) {
    desiredMember = member || null;
    const sdk = await init();
    if (!sdk) return null;
    const task = identityTail.then(async () => {
      if (desiredMember) await sdk.login(desiredMember);
      else { await sdk.User.PushSubscription.optOut(); await sdk.logout(); }
    });
    identityTail = task.catch(() => {});
    await task;
    return sdk;
  }
  async function enable(member) {
    if (!member) throw new Error('Sign in to enable message alerts.');
    const sdk = await sync(member);
    if (!sdk) {
      if (!win.Notification || !win.navigator?.serviceWorker) throw new Error('Open The Local in a supported browser. On iPhone, add it to your Home Screen first.');
      const permission = await win.Notification.requestPermission();
      if (permission === 'denied') throw new Error('Notifications are blocked. Allow notifications for The Local in your browser settings.');
      return permission === 'granted' ? 'Notifications allowed on this device. Phone delivery is being connected; check the message bell in the meantime.' : 'You can enable notifications later from Alerts.';
    }
    if (!sdk.Notifications.isPushSupported()) throw new Error('This browser cannot receive phone alerts. On iPhone, add The Local to your Home Screen and open it there.');
    if (sdk.Notifications.permissionNative === 'denied') throw new Error('Notifications are blocked. Allow notifications for The Local in your browser settings.');
    await sdk.User.PushSubscription.optIn();
    return sdk.User.PushSubscription.optedIn ? 'Message alerts are enabled on this device.' : 'Allow notifications when your browser asks, then check Alerts again.';
  }
  return {init,sync,enable};
}
