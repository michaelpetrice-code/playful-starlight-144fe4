window.addEventListener('message', event => {
  if (event.origin !== location.origin) return;
  const frame = document.getElementById('tl122-secure-tables');
  if (!frame || event.source !== frame.contentWindow) return;

  if (event.data?.type === 'tl168-chat-expanded' && typeof event.data.expanded === 'boolean') {
    frame.classList.toggle('tl-chat-frame-expanded', event.data.expanded);
    return;
  }

  if (event.data?.type === 'tl-table-invite-opened') {
    const clean = new URL(location.href);
    if (clean.searchParams.get('venue') === event.data.venue && clean.searchParams.get('table') === event.data.table) {
      clean.searchParams.delete('invite');
      history.replaceState(null, '', clean.href);
    }
    return;
  }

  if (event.data?.type !== 'tl122-table-height') return;
  const height = event.data.height;
  if (!Number.isFinite(height) || height <= 0) return;
  const size = Math.max(360, Math.ceil(height)) + 'px';
  if (frame.style.height !== size) frame.style.height = size;
});

// Size chat against the phone's visible area, including when the keyboard opens.
function sizeConversationFrame() {
  const frame = document.getElementById('tl122-secure-tables');
  if (!frame?.classList.contains('tl-conversation-frame')) return;
  const viewport = window.visualViewport;
  const nav = document.getElementById('bottomNav');
  const navHeight = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().height : 0;
  frame.style.setProperty('--conversation-frame-height', `${Math.max(160,(viewport?.height || innerHeight)-navHeight)}px`);
  frame.style.setProperty('--conversation-frame-top', `${viewport?.offsetTop || 0}px`);
}
window.addEventListener('message', event => {
  const frame = document.getElementById('tl122-secure-tables');
  if (event.origin !== location.origin || event.source !== frame?.contentWindow || event.data?.type !== 'tl-table-conversation' || typeof event.data.active !== 'boolean') return;
  frame.classList.toggle('tl-conversation-frame',event.data.active);
  sizeConversationFrame();
});
window.visualViewport?.addEventListener('resize',sizeConversationFrame);
window.visualViewport?.addEventListener('scroll',sizeConversationFrame);
window.addEventListener('resize',sizeConversationFrame);
