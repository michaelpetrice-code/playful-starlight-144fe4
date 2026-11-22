(() => {
  const standalone = window.matchMedia('(display-mode: standalone)');
  let installPrompt;
  let installed = navigator.standalone === true || standalone.matches;

  function updateInstalledState() {
    document.documentElement.classList.toggle('tl-app-installed', installed || standalone.matches);
  }

  function showInstructions(button) {
    const instructions = button.nextElementSibling;
    if (!instructions.hidden) {
      instructions.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      return;
    }

    const agent = navigator.userAgent;
    const appleMobile = /iPhone|iPad|iPod/i.test(agent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const inAppBrowser = /FBAN|FBAV|FB_IAB|Instagram|Messenger/i.test(agent);

    if (inAppBrowser) {
      instructions.textContent = 'Open The Local in your phone’s browser first: use this app’s menu and choose Open in browser, or copy https://thelocal.me.uk into Safari, Chrome or Samsung Internet. Then tap Install The Local again.';
    } else if (appleMobile) {
      instructions.textContent = 'Tap Share (or your browser menu), then Add to Home Screen. Turn on Open as Web App if shown, then tap Add. If this option is missing, open https://thelocal.me.uk in Safari and use Share → Add to Home Screen.';
    } else if (/Android/i.test(agent)) {
      instructions.textContent = /SamsungBrowser/i.test(agent)
        ? 'In Samsung Internet, open the menu (☰), then Add page to → Home screen, or choose Install if offered.'
        : /Firefox/i.test(agent)
          ? 'In Firefox, open the menu (⋮), then Add app to Home screen or Add to Home screen if offered.'
          : 'Open your browser menu (⋮), then Install app or Add to Home screen. Confirm Add or Install. If unavailable, open https://thelocal.me.uk in Chrome or Samsung Internet.';
    } else if (/Macintosh|Mac OS X/i.test(agent) && /Safari/i.test(agent) && !/Chrome|Chromium|Edg|OPR/i.test(agent)) {
      instructions.textContent = 'In Safari on a supported Mac, choose File → Add to Dock (or Share → Add to Dock), then Add. If unavailable, bookmark The Local or open it in Chrome or Edge to install.';
    } else {
      instructions.textContent = 'Open your browser menu and look for Install The Local, Install this site as an app, or Apps → Install this site. If installation is unavailable, bookmark The Local, or open https://thelocal.me.uk in Chrome or Edge to install.';
    }

    instructions.hidden = false;
    button.setAttribute('aria-expanded', 'true');
  }

  updateInstalledState();
  standalone.addEventListener?.('change', updateInstalledState);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    installPrompt = undefined;
    updateInstalledState();
  });

  document.addEventListener('click', async event => {
    const button = event.target.closest?.('[data-tl-install]');
    if (!button || installed || standalone.matches) return;
    if (!installPrompt) {
      showInstructions(button);
      return;
    }

    const prompt = installPrompt;
    installPrompt = undefined;
    button.disabled = true;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome !== 'accepted' && button.nextElementSibling.hidden) showInstructions(button);
    } catch {
      if (button.nextElementSibling.hidden) showInstructions(button);
    } finally {
      button.disabled = false;
    }
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }, { once: true });
  }
})();
