import React, { useState, useEffect } from 'react';
import SecurityGuard from './security/SecurityGuard';
import NeoBrutalEngine from './themes/NeoBrutal/NeoBrutalEngine';
import Win98Engine from './themes/Win98/Win98Engine';
import ModernDarkEngine from './themes/ModernDark/ModernDarkEngine';
import CrtGlowEngine from './themes/CrtGlow/CrtGlowEngine';
import DarkAcademiaEngine from './themes/DarkAcademia/DarkAcademiaEngine';
import KawaiiBentoEngine from './themes/KawaiiBento/KawaiiBentoEngine';
import PdfViewerModal from './components/PdfViewerModal';
import GlobalVaultDock from './components/GlobalVaultDock';
import OfflineVaultDrawer from './components/OfflineVaultDrawer';
import { soundEngine } from './features/soundEngine';
import { THEMES_REGISTRY } from './themes/themeRegistry';
import WelcomeModal from './components/WelcomeModal';

function normalizeVaultData(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (Array.isArray(raw.departments)) return raw;

  const order = ['cse', 'ece', 'ee', 'me', 'ce', 'it'];
  const keys = Object.keys(raw);
  const sortedKeys = [
    ...order.filter((k) => keys.includes(k)),
    ...keys.filter((k) => !order.includes(k)),
  ];

  const departments = sortedKeys
    .map((key) => {
      const dept = raw[key];
      if (!dept || typeof dept !== 'object') return null;
      const rawYears = dept.years || {};
      const yearsArr = Array.isArray(rawYears)
        ? rawYears
        : Object.keys(rawYears)
            .sort((a, b) => Number(a) - Number(b))
            .map((yrKey) => {
              const yVal = rawYears[yrKey];
              if (Array.isArray(yVal)) return { year: yrKey, subjects: yVal };
              if (yVal && typeof yVal === 'object') {
                const subs = Array.isArray(yVal.subjects)
                  ? yVal.subjects
                  : Object.values(yVal).filter((v) => v && typeof v === 'object');
                return { year: yrKey, ...yVal, subjects: subs };
              }
              return { year: yrKey, subjects: [] };
            });

      return {
        ...dept,
        code: dept.code || key,
        years: yearsArr,
      };
    })
    .filter(Boolean);

  return { ...raw, departments };
}

export default function App() {
  const [vaultData, setVaultData] = useState(null);
  const [activePdf, setActivePdf] = useState(null);

  const [activeTheme, setActiveTheme] = useState(() => {
    const saved = localStorage.getItem('aktu_theme_id');
    return saved === 'win98-hc' ? 'win98' : (saved || 'neo-brutal');
  });

  const handleSelectTheme = (themeId) => {
    try { soundEngine.playTick(); } catch {}
    setActiveTheme(themeId);
    localStorage.setItem('aktu_theme_id', themeId);
    document.body.setAttribute('data-theme', themeId);
  };

  useEffect(() => {
    document.body.setAttribute('data-theme', activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    fetch('/vault_data.json?v=' + Date.now())
      .then((res) => res.json())
      .then((d) => setVaultData(normalizeVaultData(d)))
      .catch((err) => console.error('Error loading vault data:', err));
  }, []);

  const handleOpenPdf = (file) => {
    soundEngine.playFlip();
    setActivePdf(file);
  };

  const handleClosePdf = () => {
    soundEngine.playFlip();
    setActivePdf(null);
  };

  return (
    <SecurityGuard>
      <div className="w-full min-h-screen bg-[#f8fafc]">
        {activeTheme === 'neo-brutal' && (
          <NeoBrutalEngine
            vaultData={vaultData}
            activeTheme={activeTheme}
            onSelectTheme={handleSelectTheme}
            onOpenPdf={handleOpenPdf}
            themesList={THEMES_REGISTRY}
          />
        )}

        {activeTheme === 'win98' && (
          <Win98Engine
            vaultData={vaultData}
            activeTheme={activeTheme}
            onSelectTheme={handleSelectTheme}
            onOpenPdf={handleOpenPdf}
            themesList={THEMES_REGISTRY}
          />
        )}

        {activeTheme === 'modern-dark' && (
          <ModernDarkEngine
            vaultData={vaultData}
            activeTheme={activeTheme}
            onSelectTheme={handleSelectTheme}
            onOpenPdf={handleOpenPdf}
            themesList={THEMES_REGISTRY}
          />
        )}

        {activeTheme === 'dark-academia' && (
          <DarkAcademiaEngine
            vaultData={vaultData}
            activeTheme={activeTheme}
            onSelectTheme={handleSelectTheme}
            onOpenPdf={handleOpenPdf}
            themesList={THEMES_REGISTRY}
          />
        )}

        {activeTheme === 'crt-glow' && (
          <CrtGlowEngine
            vaultData={vaultData}
            activeTheme={activeTheme}
            onSelectTheme={handleSelectTheme}
            onOpenPdf={handleOpenPdf}
            themesList={THEMES_REGISTRY}
          />
        )}

        {activeTheme === 'kawaii-bento' && (
          <KawaiiBentoEngine
            vaultData={vaultData}
            activeTheme={activeTheme}
            onSelectTheme={handleSelectTheme}
            onOpenPdf={handleOpenPdf}
            themesList={THEMES_REGISTRY}
          />
        )}

        {activePdf && (
          <PdfViewerModal
            file={activePdf}
            onClose={handleClosePdf}
            activeTheme={activeTheme}
          />
        )}

        <GlobalVaultDock vaultData={vaultData} onOpenPdf={handleOpenPdf} />
        <OfflineVaultDrawer vaultData={vaultData} onOpenPdf={handleOpenPdf} />
        
        {/* Welcome Modal Mounted */}
        <WelcomeModal activeTheme={activeTheme} />
      </div>
    </SecurityGuard>
  );
}