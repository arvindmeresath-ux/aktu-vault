export function isStrictGoogleChrome() {
  if (typeof navigator === 'undefined') return true;

  const ua = navigator.userAgent || '';

  // Exclude Chromium forks & other browsers (Edge, Opera, Brave, Samsung, UC, Firefox, Safari)
  const isEdge = /\bEdg\b|\bEdgA\b|\bEdgiOS\b/i.test(ua);
  const isOpera = /\bOPR\b|\bOpera\b/i.test(ua);
  const isSamsung = /\bSamsungBrowser\b/i.test(ua);
  const isUC = /\bUCBrowser\b/i.test(ua);
  const isFirefox = /\bFirefox\b|\bFxiOS\b/i.test(ua);
  const isBrave = Boolean(navigator.brave);

  // Check Chrome token (Desktop: Chrome/, iOS: CriOS/)
  const hasChromeToken = /\bChrome\/\d+/i.test(ua) || /\bCriOS\/\d+/i.test(ua);

  // Also verify Chromium brand list if User-Agent Client Hints are available
  let hasGoogleChromeBrand = true;
  if (navigator.userAgentData && Array.isArray(navigator.userAgentData.brands)) {
    const brands = navigator.userAgentData.brands.map((b) => b.brand.toLowerCase());
    if (brands.length > 0) {
      hasGoogleChromeBrand = brands.some((b) => b.includes('google chrome'));
    }
  }

  return hasChromeToken && hasGoogleChromeBrand && !isEdge && !isOpera && !isSamsung && !isUC && !isFirefox && !isBrave;
}

export function renderChromeOnlyBlockScreen() {
  document.body.innerHTML = `
    <div style="min-height:100vh;background:#0f172a;display:flex;align-items:center;justify-content:center;padding:20px;font-family:monospace;">
      <div style="max-width:440px;width:100%;background:#ffffff;border:4px solid #000000;border-radius:24px;padding:28px;box-shadow:8px 8px 0px #000000;text-align:center;color:#000000;">
        <div style="display:inline-block;background:#fef08a;border:2px solid #000;border-radius:999px;padding:4px 14px;font-weight:900;font-size:11px;margin-bottom:14px;">
          BROWSER ACCESS POLICY
        </div>
        <h1 style="font-size:22px;font-weight:900;margin:0 0 10px 0;">
          Google Chrome Required
        </h1>
        <p style="font-size:13px;font-weight:700;color:#334155;line-height:1.5;margin:0 0 18px 0;">
          AKTUVault is configured to run exclusively on <strong>Google Chrome</strong> for optimal PDF rendering and security compliance.
        </p>
        <div style="background:#f1f5f9;border:2px solid #000;border-radius:14px;padding:12px;font-size:12px;font-weight:800;">
          Please copy this URL and open it in Google Chrome.
        </div>
      </div>
    </div>
  `;
}

export function initProductionAntiInspect() {
  // Keep DevTools enabled during local development; enforce strictly in production build
  if (!import.meta.env.PROD) return;

  // 1. Silence console methods in production
  const noop = () => {};
  try {
    console.log = noop;
    console.warn = noop;
    console.info = noop;
    console.debug = noop;
  } catch {}

  // 2. Disable Right-Click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });

  // 3. Block DevTools & View-Source keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    const key = (e.key || '').toUpperCase();
    const ctrlOrMeta = e.ctrlKey || e.metaKey;

    if (
      (key === 'F12' || e.keyCode === 123) ||
      (ctrlOrMeta && e.shiftKey && (key === 'I' || key === 'J' || key === 'C')) ||
      (ctrlOrMeta && key === 'U')
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // 4. Detect docked DevTools panel resize & show lockout screen
  const checkDevToolsOpen = () => {
        // Timing trap catches undocked (separate window) DevTools
    const t0 = performance.now();
    // eslint-disable-next-line no-debugger
    debugger;
    if (performance.now() - t0 > 120) {
      document.body.innerHTML = `
        <div style="min-height:100vh;background:#09090b;color:#fde68a;display:flex;align-items:center;justify-content:center;font-family:monospace;padding:24px;text-align:center;">
          <div style="max-width:420px;border:3px solid #f59e0b;border-radius:20px;padding:24px;background:#18181b;">
            <div style="font-size:28px;margin-bottom:8px;">🛡️</div>
            <div style="font-size:16px;font-weight:900;margin-bottom:8px;">INSPECTION PROTECTED</div>
            <div style="font-size:12px;color:#d4d4d8;line-height:1.5;">
              Developer Tools are restricted on this portal. Close DevTools and reload the page to continue studying.
            </div>
          </div>
        </div>
      `;
    }
    const widthGap = window.outerWidth - window.innerWidth > 170;
    const heightGap = window.outerHeight - window.innerHeight > 170;
    if (widthGap || heightGap) {
      document.body.innerHTML = `
        <div style="min-height:100vh;background:#09090b;color:#fde68a;display:flex;align-items:center;justify-content:center;font-family:monospace;padding:24px;text-align:center;">
          <div style="max-width:420px;border:3px solid #f59e0b;border-radius:20px;padding:24px;background:#18181b;">
            <div style="font-size:28px;margin-bottom:8px;">🛡️</div>
            <div style="font-size:16px;font-weight:900;margin-bottom:8px;">INSPECTION PROTECTED</div>
            <div style="font-size:12px;color:#d4d4d8;line-height:1.5;">
              Developer Tools are restricted on this portal. Close DevTools and reload the page to continue studying.
            </div>
          </div>
        </div>
      `;
    }
  };

  setInterval(checkDevToolsOpen, 1500);
}