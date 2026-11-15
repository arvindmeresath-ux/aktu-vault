import { useState, useEffect } from 'react';

let deferredPromptEvent = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPromptEvent = e;
    window.dispatchEvent(new Event('aktu_pwa_prompt_ready'));
  });

  window.addEventListener('appinstalled', () => {
    deferredPromptEvent = null;
    window.dispatchEvent(new Event('aktu_pwa_installed'));
  });
}

export function usePwaInstall() {
  const [canPrompt, setCanPrompt] = useState(() => Boolean(deferredPromptEvent));
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  });

  useEffect(() => {
    const onReady = () => setCanPrompt(true);
    const onInstalled = () => {
      setCanPrompt(false);
      setIsInstalled(true);
    };
    window.addEventListener('aktu_pwa_prompt_ready', onReady);
    window.addEventListener('aktu_pwa_installed', onInstalled);
    return () => {
      window.removeEventListener('aktu_pwa_prompt_ready', onReady);
      window.removeEventListener('aktu_pwa_installed', onInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    if (deferredPromptEvent) {
      deferredPromptEvent.prompt();
      const choice = await deferredPromptEvent.userChoice;
      if (choice && choice.outcome === 'accepted') {
        deferredPromptEvent = null;
        setCanPrompt(false);
        setIsInstalled(true);
      }
      return 'prompted';
    }
    return 'unavailable';
  };

  return { canPrompt, isInstalled, triggerInstall };
}