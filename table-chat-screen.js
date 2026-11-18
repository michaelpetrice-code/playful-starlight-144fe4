export function bindChatScreen(chat, button) {
  const root = document.documentElement;
  let expanded = false;
  let revision = 0;
  let transitioning = false;
  let nativeFullScreen = false;

  function setExpanded(value) {
    expanded = value;
    root.classList.toggle('tl-chat-expanded', value);
    button.textContent = value ? 'Exit full screen' : 'Full screen';
    button.setAttribute('aria-pressed', String(value));
    if (parent !== window) {
      parent.postMessage({type:'tl168-chat-expanded', expanded:value}, location.origin);
    }
  }

  async function close() {
    ++revision;
    setExpanded(false);
    if (document.fullscreenElement === chat && document.exitFullscreen) {
      try { await document.exitFullscreen(); } catch { /* The browser may have exited already. */ }
    }
  }

  button.addEventListener('click', async () => {
    if (transitioning) return;
    if (expanded || document.fullscreenElement === chat) {
      await close();
      return;
    }

    const attempt = ++revision;
    transitioning = true;
    try {
      if (document.fullscreenEnabled && chat.requestFullscreen) {
        await chat.requestFullscreen();
      }
    } catch {
      // In-app browsers and some mobile browsers only support the expanded layout.
    } finally {
      transitioning = false;
    }

    if (attempt === revision && !chat.closest('[hidden]')) {
      nativeFullScreen = document.fullscreenElement === chat;
      setExpanded(true);
    } else if (document.fullscreenElement === chat) {
      await close();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    if (!transitioning && expanded && !document.fullscreenElement && nativeFullScreen) close();
    nativeFullScreen = document.fullscreenElement === chat;
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && expanded && !document.fullscreenElement && !event.defaultPrevented) {
      event.preventDefault();
      close();
    }
  });

  return { close };
}
