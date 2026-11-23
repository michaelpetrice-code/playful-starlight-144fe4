// Reduce secondary controls without changing handlers, form submission or permissions.
(() => {
  function disclosure(label, compact = false) {
    const details = document.createElement('details');
    details.className = 'local-options' + (compact ? ' local-options-compact' : '');
    const summary = document.createElement('summary');
    summary.textContent = compact ? '•••' : label;
    summary.setAttribute('aria-label', label);
    summary.title = label;
    details.append(summary);
    return details;
  }

  function tuck(node, label, compact = false) {
    if (!node || node.closest('.local-options, .messenger-menu, .messenger-attachments') || node.hidden) return;
    const details = disclosure(label, compact);
    node.before(details);
    details.append(node);
  }

  function simplify() {
    // Share actions are secondary; posting, replying, booking and purchasing stay visible.
    document.querySelectorAll('button.tl172-share:not([type="submit"])').forEach(button => {
      if (button.id === 'tl172-page-share' || button.hasAttribute('data-tl172-public-share') || button.closest('form, #tl-auth-gate')) return;
      tuck(button, button.textContent.trim() || 'Share options', true);
    });
    document.querySelectorAll('.tl-install-banner').forEach(banner => tuck(banner, 'Get the app'));
    // Existing five-item member navigation already exposes every section through More.
    const tabs = document.getElementById('tabs');
    const bottom = document.getElementById('bottomNav');
    if (tabs && bottom?.querySelector('#moreNav')) tabs.classList.add('local-secondary-tabs');

    // Public navigation keeps its three most common destinations; every other link remains accessible.
    document.querySelectorAll('.guest-nav, .tl149-public-nav').forEach(nav => {
      if (nav.querySelector(':scope > .local-options')) return;
      const links = [...nav.children].filter(node => node.tagName === 'A');
      if (links.length <= 4) return;
      const menu = disclosure('More');
      const items = document.createElement('div');
      items.className = 'local-options-links';
      for (const link of links.slice(3)) items.append(link);
      menu.append(items);
      nav.append(menu);
      if (items.querySelector('[aria-current="page"]')) menu.open = true;
    });
    // Less frequent account tasks and arcade display preferences do not need a permanent toolbar.
    for (const [selector, label] of [
      ['#groupForm', 'Create a community'], ['#joinForm', 'Join a community'],
      ['#nickname', 'Edit leaderboard name'], ['.tl186-toolbar', 'Display & sound settings']
    ]) document.querySelectorAll(selector).forEach(node => tuck(node, label));
  }

  let queued = false;
  const observer = new MutationObserver(records => {
    if (!records.some(record => record.addedNodes.length)) return;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; simplify(); });
  });
  simplify();
  observer.observe(document.body, {childList:true, subtree:true});
  // Escape returns focus to the control that opened the closest secondary menu.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    const menu = event.target.closest?.('.local-options[open]');
    if (menu) { menu.open = false; menu.querySelector('summary').focus(); event.preventDefault(); }
  });
})();
