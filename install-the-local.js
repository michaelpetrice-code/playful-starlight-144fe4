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

    if (appleMobile) {
      instructions.textContent = (inAppBrowser ? 'Open this page in Safari first. ' : '') +
        'In Safari, tap Share, then Add to Home Screen. Turn on Open as Web App if shown, then tap Add.';
    } else if (/Android/i.test(agent)) {
      instructions.textContent = (inAppBrowser ? 'Open this page in Chrome first. ' : '') +
        'In Chrome, tap ⋮, then Install app or Add to Home screen.';
    } else {
      instructions.textContent = 'Open your browser menu and look for Install The Local or Install this site as an app.';
    }

    instructions.hidden = false;
    button.setAttribute('aria-expanded', 'true');
  }

  updateInstalledState();
  standalone.addEventListener('change', updateInstalledState);
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
    const button = event.target.closest('[data-tl-install]');
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
      if (outcome === 'accepted') {
        installed = true;
        updateInstalledState();
      }
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
