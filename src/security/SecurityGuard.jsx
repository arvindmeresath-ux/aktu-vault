import React, { useEffect, useState } from "react";

export default function SecurityGuard({ children }) {
  const [isAllowedBrowser, setIsAllowedBrowser] = useState(true);

  useEffect(() => {
    // 1. Browser Check (Chrome, Safari, Telegram WebView allowed)
    const ua = navigator.userAgent;
    const isChrome = /Chrome/.test(ua) && !/Edge|Edg|OPR|Opera/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isTelegram = /Telegram/.test(ua) || /MicroMessenger/.test(ua);

    if (!isChrome && !isSafari && !isTelegram) {
      setIsAllowedBrowser(false);
    }

    // 2. Disable Right Click
    const handleContextMenu = (e) => e.preventDefault();
    document.addEventListener("contextmenu", handleContextMenu);

    // 3. Disable Inspect Shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S)
    const handleKeyDown = (e) => {
      if (
        e.keyCode === 123 || 
        (e.ctrlKey && e.shiftKey && [73, 74, 67].includes(e.keyCode)) || 
        (e.ctrlKey && [85, 83].includes(e.keyCode))
      ) {
        e.preventDefault();
        return false;
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    // 4. Anti-DevTools Debugger Trap
    const devToolsTrap = setInterval(() => {
      const startTime = performance.now();
      debugger;
      const endTime = performance.now();
      if (endTime - startTime > 100) {
        document.body.innerHTML = `
          <div style="display:flex;height:100vh;align-items:center;justify-content:center;background:#0f172a;color:#f87171;font-family:sans-serif;text-align:center;">
            <div>
              <h2 style="margin-bottom:8px;">Access Denied</h2>
              <p style="color:#94a3b8;">Developer tools are disabled for this portal.</p>
            </div>
          </div>
        `;
      }
    }, 1000);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      clearInterval(devToolsTrap);
    };
  }, []);

  if (!isAllowedBrowser) {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        color: "#f8fafc",
        fontFamily: "sans-serif",
        textAlign: "center",
        padding: "20px"
      }}>
        <div style={{ maxWidth: "420px", background: "#1e293b", padding: "30px", borderRadius: "12px", border: "1px solid #334155" }}>
          <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>Browser Not Supported</h2>
          <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.6" }}>
            Please open this site using <b>Google Chrome</b>, <b>Safari</b>, or directly inside the <b>Telegram Mini App</b>.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}