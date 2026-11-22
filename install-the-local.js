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
      instructions.textContent = 'Tap this app’s menu → Open in browser. Then tap Install The Local.';
    } else if (appleMobile) {
      instructions.textContent = 'In Safari: Share → Add to Home Screen → Add. Turn on Open as Web App if shown.';
    } else if (/Android/i.test(agent)) {
      instructions.textContent = /SamsungBrowser/i.test(agent)
        ? 'In Samsung Internet, open the menu (☰), then Add page to → Home screen, or choose Install if offered.'
        : /Firefox/i.test(agent)
          ? 'In Firefox, open the menu (⋮), then Add app to Home screen or Add to Home screen if offered.'
          : 'Tap ⋮ → Install app or Add to Home screen → Add.';
    } else if (/Macintosh|Mac OS X/i.test(agent) && /Safari/i.test(agent) && !/Chrome|Chromium|Edg|OPR/i.test(agent)) {
      instructions.textContent = 'In Safari: File → Add to Dock → Add. If that option is missing, bookmark this page.';
    } else {
      instructions.textContent = 'Open your browser menu and choose Install The Local or Apps → Install this site. If there’s no install option, bookmark this page.';
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
