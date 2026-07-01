import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './PWAInstallPrompt.css';

const DISMISSED_UNTIL_KEY = 'paperstack_pwa_install_dismissed_until';
const NEVER_SHOW_KEY = 'paperstack_pwa_install_never_show';
const INSTALLED_KEY = 'paperstack_pwa_installed';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore private browsing/storage quota errors.
  }
}

function isStandaloneApp() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    safeGet(INSTALLED_KEY) === 'true'
  );
}

function isIosSafari() {
  const ua = window.navigator.userAgent || '';
  const isIos = /iphone|ipad|ipod/i.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  const isWebKit = /Safari/i.test(ua);
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  return isIos && isWebKit && !isOtherIosBrowser;
}

function shouldHideOnRoute(pathname) {
  return (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/')
  );
}

export default function PWAInstallPrompt() {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [supportsInstall, setSupportsInstall] = useState(false);
  const iosHelp = useMemo(() => typeof window !== 'undefined' && isIosSafari(), []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setSupportsInstall(true);
    };

    const handleAppInstalled = () => {
      safeSet(INSTALLED_KEY, 'true');
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    setVisible(false);

    if (shouldHideOnRoute(location.pathname)) return undefined;
    if (isStandaloneApp() || installed) return undefined;
    if (safeGet(NEVER_SHOW_KEY) === 'true') return undefined;

    const dismissedUntil = Number(safeGet(DISMISSED_UNTIL_KEY) || 0);
    if (dismissedUntil && dismissedUntil > Date.now()) return undefined;
    if (!deferredPrompt && !iosHelp) return undefined;

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [deferredPrompt, installed, iosHelp, location.pathname]);

  const closeForNow = () => {
    safeSet(DISMISSED_UNTIL_KEY, String(Date.now() + DAY_IN_MS));
    setVisible(false);
  };

  const neverShowAgain = () => {
    safeSet(NEVER_SHOW_KEY, 'true');
    setVisible(false);
  };

  const installApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {
      // Some browsers do not expose a resolved userChoice consistently.
    }

    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <section className="pwa-install-card" role="dialog" aria-modal="false" aria-labelledby="pwa-install-title">
      <button type="button" className="pwa-install-close" onClick={closeForNow} aria-label="Close install prompt">
        x
      </button>

      <div className="pwa-install-icon" aria-hidden="true">
        <img src="/icons/icon-192x192.png" alt="" />
      </div>

      <div className="pwa-install-content">
        <p className="pwa-install-kicker">PaperStack PWA</p>
        <h2 id="pwa-install-title" className="pwa-install-title">Install PaperStack App</h2>
        <p className="pwa-install-text">
          Access papers, exam packs, missing papers, and student resources faster from your home screen.
        </p>

        {iosHelp && !supportsInstall && (
          <p className="pwa-ios-help">On iPhone or iPad: tap Share, then Add to Home Screen.</p>
        )}

        <div className="pwa-install-actions">
          {deferredPrompt && (
            <button type="button" className="pwa-install-primary" onClick={installApp}>
              Install App
            </button>
          )}
          <button type="button" className="pwa-install-secondary" onClick={closeForNow}>
            Maybe Later
          </button>
          <button type="button" className="pwa-install-ghost" onClick={neverShowAgain}>
            Don't show again
          </button>
        </div>
      </div>
    </section>
  );
}
