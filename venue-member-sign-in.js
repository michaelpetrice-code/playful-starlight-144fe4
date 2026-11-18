const coombeOrigin = 'https://stellar-mandazi-6aa7db.netlify.app';

export function bindVenueSignIn(button, getClient, feedback, onSignedIn) {
  let pending;
  button.addEventListener('click', () => {
    if (pending) return;
    if (!getClient()) {
      feedback('Sign-in is still connecting. Try again shortly.', 'error');
      return;
    }

    const nonce = crypto.randomUUID();
    const url = new URL('/continue-to-the-local.html',coombeOrigin);
    url.hash = new URLSearchParams({nonce, origin:location.origin}).toString();
    const popup = window.open(url,'_blank');
    if (!popup) {
      feedback('Allow the Coombe sign-in window to open and try again.','error');
      return;
    }
    button.disabled = true;
    feedback('Continue in the Coombe sign-in window.');
    const watcher = setInterval(() => {
      if (!popup.closed) return;
      finish();
    },600);
    const timeout = setTimeout(finish,300000);
    pending = popup;

    function finish() {
      clearInterval(watcher);
      clearTimeout(timeout);
      window.removeEventListener('message',receive);
      pending = null;
      button.disabled = false;
    }

    async function receive(event) {
      if (event.origin !== coombeOrigin || event.source !== popup ||
        event.data?.type !== 'tl-coombe-verified' || event.data.nonce !== nonce ||
        typeof event.data.accessToken !== 'string') return;

      clearInterval(watcher);
      clearTimeout(timeout);
      window.removeEventListener('message',receive);
      try {
        const client = getClient();
        if ((await client.auth.getSession()).data?.session) {
          throw Error('You’re already signed in to The Local.');
        }
        const {data,error} = await client.functions.invoke('venue-member-sign-in',{body:{accessToken:event.data.accessToken}});
        if (error) {
          const detail = await error.context?.json?.().catch(()=>null);
          throw Error(detail?.message || 'Venue sign-in is unavailable. Try again later.');
        }
        if (typeof data?.tokenHash !== 'string') throw Error('Couldn’t start your Local session.');
        const {error:loginError} = await client.auth.verifyOtp({token_hash:data.tokenHash,type:'email'});
        if (loginError) throw Error('The sign-in expired. Please try again.');
        onSignedIn();
      } catch (error) {
        feedback(error.message,'error');
      } finally {
        popup.close();
        finish();
      }
    }
    window.addEventListener('message',receive);
  });
}
