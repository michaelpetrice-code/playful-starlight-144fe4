// Prefer the device share sheet, then the clipboard, then a selectable link.
export async function shareLocal({
  title = 'The Local',
  message,
  url,
  notify = () => {},
  copied = 'Invitation copied. Paste it into a message.'
} = {}) {
  const link = url || location.origin + location.pathname;
  const text = message || 'Join me on The Local — chat, events, games and your local community!';
  const payload = { title, text, url: link };
  try {
    if (typeof navigator.share === 'function' &&
        (typeof navigator.canShare !== 'function' || navigator.canShare(payload))) {
      await navigator.share(payload);
      return true;
    }
  } catch (error) {
    if (error?.name === 'AbortError') return false;
  }

  const full = text + '\n' + link;
  try {
    if (typeof navigator.clipboard?.writeText === 'function') {
      await navigator.clipboard.writeText(full);
      notify(copied);
      return true;
    }
  } catch {}

  const active = document.activeElement;
  const input = document.createElement('textarea');
  input.value = full;
  input.readOnly = true;
  input.style.cssText = 'position:fixed;left:0;top:0;opacity:0;font-size:16px';
  document.body.appendChild(input);
  let copiedWithLegacyApi = false;
  try {
    input.focus({ preventScroll: true });
    input.select();
    input.setSelectionRange(0, full.length);
    copiedWithLegacyApi = document.execCommand?.('copy') === true;
  } catch {
    // Clipboard access may be blocked by browser or device policy.
  } finally {
    input.remove();
    active?.focus?.({ preventScroll: true });
  }
  if (copiedWithLegacyApi) {
    notify(copied);
    return true;
  }

  const existing = document.getElementById('local-copy-share-link');
  existing?.remove();
  const panel = document.createElement('section');
  panel.id = 'local-copy-share-link';
  panel.className = 'panel';
  panel.style.cssText = 'position:fixed;z-index:2147483647;bottom:1rem;left:1rem;right:1rem;max-width:36rem;margin-inline:auto;background:#102c24;color:#fff8e8;padding:1rem;border:1px solid #d3aa64;border-radius:12px';
  const label = document.createElement('label');
  label.textContent = 'Copy this message and link';
  const manual = document.createElement('textarea');
  manual.value = full;
  manual.readOnly = true;
  manual.rows = 4;
  manual.style.cssText = 'display:block;width:100%;box-sizing:border-box;font-size:16px;margin:.5rem 0';
  label.appendChild(manual);
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close';
  close.onclick = () => {
    panel.remove();
    active?.focus?.();
  };
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') close.click();
  });
  panel.append(label, close);
  document.body.appendChild(panel);
  manual.focus();
  manual.select();
  return false;
}
