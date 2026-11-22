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
