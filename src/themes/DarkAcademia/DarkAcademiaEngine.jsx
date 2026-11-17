import React, { useState, useEffect, useRef, useMemo } from 'react';
import { soundEngine } from '../../features/soundEngine';
import { noiseEngine } from '../../features/noiseEngine';
import { usePwaInstall } from '../../utils/pwaInstall';
import { getOfflineDocsList, removeOfflineDoc, formatBytes } from '../../features/offlineVault';

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

const BRANCH_FULL_NAMES = {
  CSE: 'Computer Science (CSE)',
  ECE: 'Electronics & Comm. (ECE)',
  EE: 'Electrical Engg. (EE)',
  ME: 'Mechanical Engg. (ME)',
  CE: 'Civil Engineering (CE)',
  IT: 'Information Tech. (IT)',
};

const YEAR_SLOTS = [
  { key: '1ST_YEAR', label: '1st Year', subtitle: 'Common to all (Sem 1 & 2)' },
  { key: '2ND_YEAR', label: '2nd Year', subtitle: 'Core Basics (Sem 3 & 4)' },
  { key: '3RD_YEAR', label: '3rd Year', subtitle: 'Core & Electives (Sem 5 & 6)' },
  { key: '4TH_YEAR', label: '4th Year', subtitle: 'Final Year & Electives (Sem 7 & 8)' },
];

const DEFAULT_THEMES = [
  { id: 'neo-brutal', name: 'Neo-Brutalism', tag: 'Bold & Vibrant', icon: '🎨', status: 'active' },
  { id: 'win98', name: 'Windows 98', tag: 'Classic Retro', icon: '💻', status: 'active' },
  { id: 'modern-dark', name: 'Modern Dark UI', tag: 'Minimal OLED', icon: '⚡', status: 'active' },
  { id: 'cyberpunk', name: 'Cyberpunk 2077', tag: 'Neon & Dark HUD', icon: '⚡', status: 'active' },
  { id: 'crt-glow', name: 'CRT Glow', tag: 'Terminal & Scanlines', icon: '📺', status: 'active' },
  { id: 'dark-academia', name: 'Dark Academia', tag: 'Classic Paper & Serif', icon: '✒️', status: 'active' },
  { id: 'blueprint', name: 'Architectural Blueprint', tag: 'Engineering Grid', icon: '📐', status: 'active' }
];

const loadPinnedDocs = () => {
  try {
    const raw = localStorage.getItem('aktu_pinned_docs');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const savePinnedDocs = (docs) => {
  try {
    localStorage.setItem('aktu_pinned_docs', JSON.stringify(docs));
    window.dispatchEvent(new CustomEvent('aktu_pinned_update'));
  } catch {}
};

const togglePinDoc = (doc) => {
  const current = loadPinnedDocs();
  const exists = current.some((d) => d.url === doc.url);
  const updated = exists ? current.filter((d) => d.url !== doc.url) : [...current, doc];
  savePinnedDocs(updated);
  return updated;
};

const getSubjectFiles = (sub) => {
  if (!sub) return [];
  if (Array.isArray(sub.files)) return sub.files;
  return [
    ...(Array.isArray(sub.notes) ? sub.notes : []),
    ...(Array.isArray(sub.pyqs) ? sub.pyqs : []),
    ...(Array.isArray(sub.quantums) ? sub.quantums : []),
    ...(Array.isArray(sub.syllabus) ? sub.syllabus : [])
  ];
};

const isPyq = (f) => {
  const c = (f?.category || f?.type || '').toLowerCase();
  const t = (f?.title || f?.name || '').toLowerCase();
  return c.includes('pyq') || t.includes('pyq') || t.includes('previous year');
};

const isQuantum = (f) => {
  const c = (f?.category || f?.type || '').toLowerCase();
  const t = (f?.title || f?.name || '').toLowerCase();
  return c.includes('quantum') || c.includes('important') || c.includes('imp') || t.includes('quantum') || t.includes('imp');
};

export default function DarkAcademiaEngine({
  vaultData,
  activeTheme = 'dark-academia',
  onSelectTheme,
  themesList = DEFAULT_THEMES,
  onOpenPdf,
}) {
  const [data, setData] = useState(vaultData || null);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [activeTab, setActiveTab] = useState('Notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusIdx, setFocusIdx] = useState(0);

  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [sfxOn, setSfxOn] = useState(() => soundEngine.isEnabled());
  
  const [pinnedDocs, setPinnedDocs] = useState(() => loadPinnedDocs());
  const [offlineDocs, setOfflineDocs] = useState([]);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [isPinnedModalOpen, setIsPinnedModalOpen] = useState(false);
  const [isNoiseModalOpen, setIsNoiseModalOpen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const { canPrompt, isInstalled, triggerInstall } = usePwaInstall();
  const [noisePreset, setNoisePreset] = useState(() => noiseEngine.getPreset());
  const [noiseVolume, setNoiseVolume] = useState(() => Math.round(noiseEngine.getVolume() * 100));

  useEffect(() => {
    const syncOffline = async () => {
      try {
        const list = await getOfflineDocsList();
        setOfflineDocs(Array.isArray(list) ? list : []);
      } catch {
        setOfflineDocs([]);
      }
    };
    syncOffline();
    window.addEventListener('aktu_offline_vault_updated', syncOffline);
    window.addEventListener('storage', syncOffline);
    return () => {
      window.removeEventListener('aktu_offline_vault_updated', syncOffline);
      window.removeEventListener('storage', syncOffline);
    };
  }, []);

  // Global window overrides for Dark Academia modals
  useEffect(() => {
    window.__aktuOpenOfflineVault = () => {
      try { soundEngine.playTick(); } catch {}
      getOfflineDocsList().then((list) => setOfflineDocs(Array.isArray(list) ? list : []));
      setIsOfflineModalOpen(true);
    };
    window.__aktuOpenPinnedModal = () => {
      try { soundEngine.playTick(); } catch {}
      try { setPinnedDocs(loadPinnedDocs()); } catch {}
      setIsPinnedModalOpen(true);
    };
    window.__aktuOpenNoiseModal = () => {
      try { soundEngine.playTick(); } catch {}
      setIsNoiseModalOpen(true);
    };
  }, []);

  // Noise stream buffering listener
  useEffect(() => {
    const onBuffering = (e) => {
      if (e.detail?.preset === 'music') setIsBuffering(true);
    };
    const onNoiseUpdate = (e) => {
      if (e.detail) {
        setNoisePreset(e.detail.preset);
        setNoiseVolume(Math.round(e.detail.volume * 100));
        setIsBuffering(false);
      }
    };
    window.addEventListener('aktu_noise_buffering', onBuffering);
    window.addEventListener('aktu_noise_update', onNoiseUpdate);
    return () => {
      window.removeEventListener('aktu_noise_buffering', onBuffering);
      window.removeEventListener('aktu_noise_update', onNoiseUpdate);
    };
  }, []);

  const themeMenuRef = useRef(null);
  const toolsMenuRef = useRef(null);
  const searchRef = useRef(null);
  const listContainerRef = useRef(null);
  const prevDepthRef = useRef(0);
  const isPoppingHistoryRef = useRef(false);

  useEffect(() => {
    fetch('/vault_data.json?v=' + Date.now())
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error('Error loading vault data:', err));
  }, []);

  useEffect(() => {
    if (vaultData) setData(vaultData);
  }, [vaultData]);

  // Smooth auto-scroll focused item into view
  useEffect(() => {
    if (!listContainerRef.current) return;
    const focusedEl = listContainerRef.current.querySelector('[data-focused="true"]');
    if (focusedEl) {
      focusedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusIdx, selectedDept, selectedYear, selectedSubject, activeTab]);

  // Sync Department -> Year -> Subject navigation with Browser / Mobile Back Gesture
  useEffect(() => {
    const currentDepth = (selectedDept ? 1 : 0) + (selectedYear ? 1 : 0) + (selectedSubject ? 1 : 0);
    if (currentDepth > prevDepthRef.current) {
      if (!isPoppingHistoryRef.current) {
        window.history.pushState({ aktuNav: true, depth: currentDepth }, '');
      }
    } else if (currentDepth < prevDepthRef.current) {
      if (!isPoppingHistoryRef.current && window.history.state?.aktuNav) {
        isPoppingHistoryRef.current = true;
        window.history.back();
      }
    }
    isPoppingHistoryRef.current = false;
    prevDepthRef.current = currentDepth;
  }, [selectedDept, selectedYear, selectedSubject]);

  useEffect(() => {
    const onPopState = () => {
      if (window.__aktuIgnoreNextPop || window.__aktuHasOpenModal?.() || window.history.state?.aktuModal) return;
      if (selectedSubject) {
        isPoppingHistoryRef.current = true;
        setSelectedSubject(null);
        setFocusIdx(0);
      } else if (selectedYear) {
        isPoppingHistoryRef.current = true;
        setSelectedYear(null);
        setSearchQuery('');
        setFocusIdx(0);
      } else if (selectedDept) {
        isPoppingHistoryRef.current = true;
        setSelectedDept(null);
        setFocusIdx(0);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [selectedDept, selectedYear, selectedSubject]);

  useEffect(() => {
    const syncPins = () => {
      try { setPinnedDocs(loadPinnedDocs()); } catch {}
    };
    const syncSfx = (e) => {
      if (typeof e.detail === 'boolean') setSfxOn(e.detail);
      else setSfxOn(soundEngine.isEnabled());
    };
    const handleOutside = (e) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target)) setIsThemeOpen(false);
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target)) setIsToolsOpen(false);
    };

    window.addEventListener('aktu_pinned_update', syncPins);
    window.addEventListener('storage', syncPins);
    window.addEventListener('aktu_sfx_sync', syncSfx);
    document.addEventListener('mousedown', handleOutside);
    return () => {
      window.removeEventListener('aktu_pinned_update', syncPins);
      window.removeEventListener('storage', syncPins);
      window.removeEventListener('aktu_sfx_sync', syncSfx);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, []);

  const deptOrder = ['cse', 'ece', 'ee', 'me', 'ce', 'it'];

  const getDeptDocCount = (deptKey) => {
    const d = data?.[deptKey];
    if (!d || !d.years) return 0;
    let count = 0;
    Object.values(d.years).forEach((yr) => {
      if (yr?.subjects) {
        Object.values(yr.subjects).forEach((sub) => {
          count += getSubjectFiles(sub).length;
        });
      }
    });
    return count;
  };

  const branches = useMemo(() => {
    return deptOrder.map((k) => {
      const upper = k.toUpperCase();
      const count = getDeptDocCount(k);
      return {
        deptKey: k,
        code: upper,
        subtitle: BRANCH_FULL_NAMES[upper] || upper,
        count,
      };
    });
  }, [data]);

  const currentDeptObj = useMemo(() => {
    if (!selectedDept || !data) return null;
    return data[selectedDept] || data[selectedDept.toLowerCase()] || data[selectedDept.toUpperCase()] || null;
  }, [data, selectedDept]);

  const yearCards = useMemo(() => {
    const rawYears = currentDeptObj?.years || {};
    return YEAR_SLOTS.map((slot, i) => {
      const yrObj = rawYears[slot.key] || rawYears[String(i + 1)];
      const fileCount = yrObj?.totalFiles || Object.values(yrObj?.subjects || yrObj || {}).reduce((acc, s) => acc + getSubjectFiles(s).length, 0);
      return {
        key: slot.key,
        label: slot.label,
        subtitle: yrObj?.subtitle || slot.subtitle,
        fileCount,
      };
    });
  }, [currentDeptObj]);

  const currentYearObj = useMemo(() => {
    if (!currentDeptObj || !currentDeptObj.years || !selectedYear) return null;
    const rawYears = currentDeptObj.years;
    if (rawYears[selectedYear]) return rawYears[selectedYear];
    const yearNum = String(selectedYear).replace(/\D/g, '');
    return rawYears[yearNum] || rawYears[Object.keys(rawYears)[Number(yearNum) - 1]] || null;
  }, [currentDeptObj, selectedYear]);

  const allSubjects = useMemo(() => {
    if (!currentYearObj || !currentYearObj.subjects) return [];
    const rawSubs = currentYearObj.subjects;
    if (Array.isArray(rawSubs)) return rawSubs;
    return Object.keys(rawSubs).map((subKey) => {
      const subVal = rawSubs[subKey];
      const filesArr = getSubjectFiles(subVal);
      return {
        subKey: subVal?.name || subKey,
        name: subVal?.name || subKey,
        files: filesArr,
        count: filesArr.length,
        ...subVal
      };
    });
  }, [currentYearObj]);

  const filteredSubjects = allSubjects.filter((s) =>
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSubjectObj = useMemo(() => {
    if (!selectedSubject) return null;
    return allSubjects.find((s) => s.name === selectedSubject || s.subKey === selectedSubject) || currentYearObj?.subjects?.[selectedSubject];
  }, [selectedSubject, allSubjects, currentYearObj]);

  const rawFiles = useMemo(() => getSubjectFiles(currentSubjectObj), [currentSubjectObj]);

  const notesFiles = useMemo(() => rawFiles.filter((f) => !isPyq(f) && !isQuantum(f)), [rawFiles]);
  const pyqFiles = useMemo(() => rawFiles.filter((f) => isPyq(f)), [rawFiles]);
  const quantumFiles = useMemo(() => rawFiles.filter((f) => isQuantum(f)), [rawFiles]);

  const currentTabFiles =
    activeTab === 'PYQ'
      ? pyqFiles
      : activeTab === 'Important'
      ? quantumFiles
      : notesFiles;

  const handleBack = () => {
    try { soundEngine.playFlip(); } catch {}
    setFocusIdx(0);
    if (selectedSubject) {
      setSelectedSubject(null);
    } else if (selectedYear) {
      setSelectedYear(null);
      setSearchQuery('');
    } else if (selectedDept) {
      setSelectedDept(null);
    }
  };

  const handleResetHome = () => {
    try { soundEngine.playFlip(); } catch {}
    setSelectedDept(null);
    setSelectedYear(null);
    setSelectedSubject(null);
    setSearchQuery('');
    setFocusIdx(0);
  };

  // Keyboard Navigation Engine
  useEffect(() => {
    const onKeyDown = (e) => {
      if (document.querySelector('.pdf-page-wrapper')) return;

      const tag = document.activeElement?.tagName;
      const isTypingInInput = tag === 'INPUT' || tag === 'TEXTAREA';

      const isHome = !selectedDept;
      const isYearScreen = selectedDept && !selectedYear;
      const isSubjectScreen = selectedDept && selectedYear && !selectedSubject;
      const isFileScreen = selectedDept && selectedYear && selectedSubject;

      if (e.key === 'Escape' || (e.key === 'Backspace' && !isTypingInInput)) {
        if (isToolsOpen || isThemeOpen || isOfflineModalOpen || isPinnedModalOpen || isNoiseModalOpen) {
          e.preventDefault();
          setIsToolsOpen(false);
          setIsThemeOpen(false);
          setIsOfflineModalOpen(false);
          setIsPinnedModalOpen(false);
          setIsNoiseModalOpen(false);
        } else if (isTypingInInput) {
          e.preventDefault();
          document.activeElement.blur();
          if (searchQuery) setSearchQuery('');
        } else if (selectedDept || selectedYear || selectedSubject) {
          e.preventDefault();
          handleBack();
        }
        return;
      }

      if (isTypingInInput) return;

      const listLen = isHome
        ? branches.length
        : isYearScreen
        ? yearCards.length
        : isSubjectScreen
        ? filteredSubjects.length
        : currentTabFiles.length;

      if (e.key === '/' && isSubjectScreen) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (e.key === 'ArrowDown' || (e.key === 'ArrowRight' && (isHome || isYearScreen))) {
        if (listLen > 0) {
          e.preventDefault();
          try { soundEngine.playNav(); } catch {}
          setFocusIdx((prev) => (prev + 1) % listLen);
        }
        return;
      }

      if (e.key === 'ArrowUp' || (e.key === 'ArrowLeft' && (isHome || isYearScreen))) {
        if (listLen > 0) {
          e.preventDefault();
          try { soundEngine.playNav(); } catch {}
          setFocusIdx((prev) => (prev - 1 + listLen) % listLen);
        }
        return;
      }

      if (e.key === 'Enter' && listLen > 0) {
        e.preventDefault();
        if (isHome && branches[focusIdx]) {
          try { soundEngine.playOpen(); } catch {}
          setSelectedDept(branches[focusIdx].deptKey);
          setFocusIdx(0);
        } else if (isYearScreen && yearCards[focusIdx]) {
          try { soundEngine.playOpen(); } catch {}
          setSelectedYear(yearCards[focusIdx].key);
          setFocusIdx(0);
        } else if (isSubjectScreen && filteredSubjects[focusIdx]) {
          try { soundEngine.playOpen(); } catch {}
          setSelectedSubject(filteredSubjects[focusIdx].name);
          setActiveTab('Notes');
          setFocusIdx(0);
        } else if (isFileScreen && currentTabFiles[focusIdx]) {
          onOpenPdf?.(currentTabFiles[focusIdx]);
        }
        return;
      }

      if (/^[1-6]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (isHome && branches[idx]) {
          try { soundEngine.playOpen(); } catch {}
          setSelectedDept(branches[idx].deptKey);
          setFocusIdx(0);
        } else if (isYearScreen && yearCards[idx]) {
          try { soundEngine.playOpen(); } catch {}
          setSelectedYear(yearCards[idx].key);
          setFocusIdx(0);
        } else if (isFileScreen && idx < 3) {
          try { soundEngine.playTick(); } catch {}
          setActiveTab(['Notes', 'PYQ', 'Important'][idx]);
          setFocusIdx(0);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    selectedDept,
    selectedYear,
    selectedSubject,
    searchQuery,
    isToolsOpen,
    isThemeOpen,
    isOfflineModalOpen,
    isPinnedModalOpen,
    isNoiseModalOpen,
    branches,
    yearCards,
    filteredSubjects,
    currentTabFiles,
    focusIdx,
    onOpenPdf,
  ]);

  const activeYearLabel = yearCards.find((y) => y.key === selectedYear)?.label || selectedYear;
  const activeSubjectLabel = currentSubjectObj?.name || selectedSubject;
  const activeThemesList = themesList && themesList.length > 0 ? themesList : DEFAULT_THEMES;

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-6 select-none font-serif text-[#d4af37]"
      style={{
        backgroundColor: '#140e0a',
        backgroundImage: 'radial-gradient(rgba(197, 160, 89, 0.14) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    >
      <div className="w-full max-w-[580px] mx-auto flex flex-col">
        {/* Top Manuscript Status & Controls Header */}
        <div className="flex items-center justify-between pb-2.5 text-xs border-b border-[#c5a059]/30 mb-4 gap-2">
          <span className="tracking-widest text-[#c5a059] font-mono text-[10px] sm:text-[11px] truncate">
            FOLIO REG: AKTU-2026 // VERIFIED ARCHIVE
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Toolbox Dropdown */}
            <div className="relative" ref={toolsMenuRef}>
              <button
                type="button"
                onClick={() => {
                  try { soundEngine.playTick(); } catch {}
                  setIsToolsOpen((v) => !v);
                  setIsThemeOpen(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#23160e] border border-[#c5a059] text-[#f7eed8] font-mono text-[11px] font-bold hover:bg-[#3d2314] cursor-pointer transition-colors"
              >
                [ TOOLS ] ▾
              </button>

              {isToolsOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#23160e] border-2 border-[#c5a059] shadow-[0_20px_50px_rgba(0,0,0,0.95)] p-2 z-50 space-y-1">
                  <div className="px-2.5 py-1 flex items-center justify-between text-[10px] font-mono tracking-widest text-[#c5a059] border-b border-[#c5a059]/30 mb-1">
                    <span>✨ QUICK TOOLBOX</span>
                    <span>KEYS</span>
                  </div>

                  {!isInstalled && (
                    <button
                      type="button"
                      onClick={async () => {
                        setIsToolsOpen(false);
                        const status = await triggerInstall();
                        if (status === 'unavailable') {
                          alert("To install AKTUVault as an App, open this site in Chrome and select 'Install App' from browser options.");
                        }
                      }}
                      className="w-full px-2.5 py-2 rounded-xl hover:bg-[#3d2314] text-[#f7eed8] flex items-center justify-between text-xs cursor-pointer"
                    >
                      <span className="font-bold">📲 Install App</span>
                      <span className="font-mono text-[10px] text-[#c5a059]">{canPrompt ? 'READY' : 'PWA'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      try { setPinnedDocs(loadPinnedDocs()); } catch {}
                      setIsPinnedModalOpen(true);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl hover:bg-[#3d2314] text-[#f7eed8] flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="font-bold">📌 Pinned Docs</span>
                    <span className="font-mono text-[10px] text-[#c5a059]">{pinnedDocs.length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      setIsNoiseModalOpen(true);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl hover:bg-[#3d2314] text-[#f7eed8] flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="font-bold">🎧 Study Ambience</span>
                    <span className="font-mono text-[10px] text-[#c5a059]">
                      {noisePreset === 'off' ? 'NOISE' : noisePreset.toUpperCase()}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = soundEngine.toggle();
                      setSfxOn(Boolean(next));
                    }}
                    className="w-full px-2.5 py-2 rounded-xl hover:bg-[#3d2314] text-[#f7eed8] flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="font-bold">🔊 Sound Effects</span>
                    <span className="font-mono text-[10px] text-[#c5a059]">{sfxOn ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      handleResetHome();
                    }}
                    className="w-full px-2.5 py-2 rounded-xl hover:bg-[#3d2314] text-[#f7eed8] flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="font-bold">🏠 Reset to Home</span>
                    <span className="font-mono text-[10px] text-[#c5a059]">Esc</span>
                  </button>
                </div>
              )}
            </div>

            {/* Theme Selector Dropdown */}
            <div className="relative" ref={themeMenuRef}>
              <button
                type="button"
                onClick={() => {
                  try { soundEngine.playTick(); } catch {}
                  setIsThemeOpen((v) => !v);
                  setIsToolsOpen(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#23160e] border border-[#c5a059] text-[#f7eed8] font-mono text-[11px] font-bold hover:bg-[#3d2314] cursor-pointer transition-colors"
              >
                [ THEME ] ▾
              </button>

              {isThemeOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl bg-[#23160e] border-2 border-[#c5a059] shadow-[0_20px_50px_rgba(0,0,0,0.95)] p-1.5 z-50">
                  <div className="px-2.5 py-1 text-[10px] font-mono tracking-widest text-[#c5a059] border-b border-[#c5a059]/30 mb-1">
                    SELECT ARCHIVE EDITION
                  </div>
                  {activeThemesList.map((th) => {
                    const active = th.id === activeTheme;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => {
                          try { soundEngine.playDegauss(); } catch {}
                          setIsThemeOpen(false);
                          onSelectTheme?.(th.id);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#f5eedb] text-[#2b170c] font-bold'
                            : 'text-[#f7eed8] hover:bg-[#3d2314]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span>{th.icon}</span>
                          <div className="truncate">
                            <div className="text-xs font-bold truncate">{th.name}</div>
                            <div className={`text-[10px] truncate ${active ? 'text-[#5c3c1e]' : 'text-[#c5a059]'}`}>
                              {th.tag}
                            </div>
                          </div>
                        </div>
                        {active && <span className="text-xs font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Kalam Technical Manuscript Outer Folio Frame */}
        <div className="bg-[#23160e] border-2 border-[#c5a059] rounded-2xl p-5 shadow-[0_25px_50px_rgba(0,0,0,0.9)] flex flex-col gap-4">
          {/* Catalogue Register Header */}
          <div className="border-b border-[#c5a059]/40 pb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] tracking-[0.18em] uppercase text-[#c5a059] block mb-0.5">
                CATALOGUE REGISTER
              </span>
              <h2 className="text-base font-bold text-[#f7eed8] truncate">
                {selectedDept
                  ? `Volume: ${selectedDept.toUpperCase()}${selectedYear ? ` (${activeYearLabel})` : ''}${selectedSubject ? ` • ${activeSubjectLabel}` : ''}`
                  : 'Curricula & Manuscripts'}
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  try { soundEngine.playTick(); } catch {}
                  try {
                    const list = await getOfflineDocsList();
                    setOfflineDocs(Array.isArray(list) ? list : []);
                  } catch {}
                  setIsOfflineModalOpen(true);
                }}
                title="Open Offline Folio Vault"
                className="text-xs bg-[#3d2314] text-[#f7eed8] border border-[#c5a059] rounded-lg px-3 py-1 hover:bg-[#c5a059] hover:text-[#23160e] cursor-pointer transition-all shrink-0 flex items-center gap-1.5 shadow-[0_0_12px_rgba(197,160,89,0.35)]"
              >
                <span>📜 OFFLINE VAULT [{offlineDocs.length}]</span>
              </button>

              {selectedDept && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-xs bg-[#3d2314] text-[#f7eed8] border border-[#c5a059] rounded-lg px-3 py-1 hover:bg-[#c5a059] hover:text-[#23160e] cursor-pointer transition-colors shrink-0"
                >
                  ← Previous (Esc)
                </button>
              )}
            </div>
          </div>

          {/* Level 1: Branches */}
          {!selectedDept && (
            <div ref={listContainerRef} className="flex flex-col gap-2.5 z-20">
              {branches.map((b, idx) => {
                const isFocused = focusIdx === idx;
                return (
                  <div
                    key={b.deptKey}
                    onClick={() => {
                      try { soundEngine.playOpen(); } catch {}
                      setSelectedDept(b.deptKey);
                      setFocusIdx(0);
                    }}
                    onMouseEnter={() => setFocusIdx(idx)}
                    data-focused={isFocused ? 'true' : undefined}
                    className={`bg-[#f5eedb] text-[#2b170c] border border-[#8b6b43] rounded-xl px-4 py-3 cursor-pointer hover:bg-[#ede2c5] hover:shadow-md transition-all flex items-center justify-between ${
                      isFocused ? 'ring-2 ring-[#c5a059] bg-[#ede2c5] translate-x-1' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      <span className="text-sm font-bold text-[#8b6b43] w-7 text-center leading-tight shrink-0">
                        § {ROMAN_NUMERALS[idx] || idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm font-bold block text-[#2b170c] truncate">
                          [{idx + 1}] {b.code}
                        </span>
                        <span className="text-xs text-[#5c3c1e] truncate block">{b.subtitle}</span>
                      </div>
                    </div>
                    <span className="text-xs text-[#8b6b43] italic shrink-0">
                      {b.count} Tomes →
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Level 2: Academic Year Folios */}
          {selectedDept && !selectedYear && (
            <div ref={listContainerRef} className="flex flex-col gap-2.5 z-20">
              {yearCards.map((yr, idx) => {
                const isFocused = focusIdx === idx;
                return (
                  <div
                    key={yr.key}
                    onClick={() => {
                      try { soundEngine.playOpen(); } catch {}
                      setSelectedYear(yr.key);
                      setFocusIdx(0);
                    }}
                    onMouseEnter={() => setFocusIdx(idx)}
                    data-focused={isFocused ? 'true' : undefined}
                    className={`bg-[#f5eedb] text-[#2b170c] border border-[#8b6b43] rounded-xl px-4 py-3 cursor-pointer hover:bg-[#ede2c5] transition-all flex items-center justify-between ${
                      isFocused ? 'ring-2 ring-[#c5a059] bg-[#ede2c5] translate-x-1' : ''
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-sm font-bold block truncate">
                        Folio 0{idx + 1} • [{idx + 1}] {yr.label}
                      </span>
                      <span className="text-xs text-[#5c3c1e] truncate block">{yr.subtitle}</span>
                    </div>
                    <span className="text-xs text-[#8b6b43] italic shrink-0">
                      {yr.fileCount > 0 ? `${yr.fileCount} Folios →` : 'Read →'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Level 3: Subject Manuscripts Index */}
          {selectedDept && selectedYear && !selectedSubject && (
            <div className="flex flex-col gap-2.5 z-20">
              <input
                ref={searchRef}
                type="text"
                placeholder="Search manuscript index (/)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusIdx(0);
                }}
                className="bg-[#f5eedb] border border-[#8b6b43] px-3 py-2 text-xs text-[#2b170c] placeholder-[#8b6b43] outline-none rounded-lg"
              />
              <div ref={listContainerRef} className="flex flex-col gap-2.5 z-20">
                {filteredSubjects.length === 0 ? (
                  <div className="bg-[#f5eedb]/90 text-[#5c3c1e] border border-[#8b6b43] rounded-xl p-4 text-center text-xs italic">
                    No manuscript folios indexed for this volume yet.
                  </div>
                ) : (
                  filteredSubjects.map((sub, idx) => {
                    const isFocused = focusIdx === idx;
                    return (
                      <div
                        key={sub.subKey}
                        onClick={() => {
                          try { soundEngine.playOpen(); } catch {}
                          setSelectedSubject(sub.name);
                          setActiveTab('Notes');
                          setFocusIdx(0);
                        }}
                        onMouseEnter={() => setFocusIdx(idx)}
                        data-focused={isFocused ? 'true' : undefined}
                        className={`bg-[#f5eedb] text-[#2b170c] border border-[#8b6b43] rounded-xl px-4 py-3 cursor-pointer hover:bg-[#ede2c5] transition-all flex items-center justify-between gap-2 ${
                          isFocused ? 'ring-2 ring-[#c5a059] bg-[#ede2c5] translate-x-1' : ''
                        }`}
                      >
                        <span className="text-xs font-bold truncate">{sub.name}</span>
                        <span className="text-xs text-[#8b6b43] italic shrink-0">
                          {sub.files.length} Folios →
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Level 4: Subject Documents (Notes / PYQ / Important) */}
          {selectedDept && selectedYear && selectedSubject && (
            <div className="flex flex-col gap-2.5 z-20">
              <div className="flex gap-2 border-b border-[#c5a059]/40 pb-2.5">
                {[
                  { id: 'Notes', count: notesFiles.length },
                  { id: 'PYQ', count: pyqFiles.length },
                  { id: 'Important', count: quantumFiles.length },
                ].map((tab, idx) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      try { soundEngine.playTick(); } catch {}
                      setActiveTab(tab.id);
                      setFocusIdx(0);
                    }}
                    className={`text-xs px-3 py-1 rounded-lg border border-[#c5a059] cursor-pointer transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#c5a059] text-[#23160e] font-bold'
                        : 'text-[#d4af37] hover:bg-[#3d2314]'
                    }`}
                  >
                    [{idx + 1}] {tab.id} ({tab.count})
                  </button>
                ))}
              </div>

              <div ref={listContainerRef} className="flex flex-col gap-2.5 z-20">
                {currentTabFiles.length === 0 ? (
                  <div className="bg-[#f5eedb]/90 text-[#5c3c1e] border border-[#8b6b43] rounded-xl p-4 text-center text-xs italic">
                    No {activeTab} folios archived under this manuscript.
                  </div>
                ) : (
                  currentTabFiles.map((doc, idx) => {
                    const isFocused = focusIdx === idx;
                    return (
                      <div
                        key={doc.url || idx}
                        onClick={() => onOpenPdf?.(doc)}
                        onMouseEnter={() => setFocusIdx(idx)}
                        data-focused={isFocused ? 'true' : undefined}
                        className={`bg-[#f5eedb] text-[#2b170c] border border-[#8b6b43] rounded-xl px-4 py-2.5 cursor-pointer hover:bg-[#ede2c5] transition-all flex items-center justify-between gap-2 ${
                          isFocused ? 'ring-2 ring-[#c5a059] bg-[#ede2c5] translate-x-1' : ''
                        }`}
                      >
                        <span className="text-xs font-bold truncate">{doc.title}</span>
                        <button
                          type="button"
                          className="bg-[#3d2314] text-[#f7eed8] text-xs px-3 py-1 rounded-lg border border-[#c5a059] hover:bg-[#c5a059] hover:text-[#23160e] transition-colors shrink-0 cursor-pointer"
                        >
                          Inspect
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Dark Academia Offline Folio Vault Modal */}
          {isOfflineModalOpen && (
            <div
              onClick={() => setIsOfflineModalOpen(false)}
              className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 font-serif"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#23160e] border-2 border-[#c5a059] rounded-2xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-[#f7eed8] flex flex-col gap-3.5"
              >
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#c5a059]/40">
                  <div>
                    <div className="text-xs font-bold tracking-widest text-[#c5a059] uppercase">📜 ARCHIVAL OFFLINE VAULT</div>
                    <div className="text-[11px] text-[#f7eed8]/70">{offlineDocs.length} Manuscript{offlineDocs.length === 1 ? '' : 's'} bound locally</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOfflineModalOpen(false)}
                    className="px-3 py-1 rounded-lg bg-[#3d2314] hover:bg-[#c5a059] hover:text-[#23160e] text-[#f7eed8] border border-[#c5a059] text-xs font-bold cursor-pointer transition-colors"
                  >
                    Close
                  </button>
                </div>

                <div className="max-h-[320px] overflow-y-auto flex flex-col gap-2 pr-0.5">
                  {offlineDocs.length === 0 ? (
                    <div className="rounded-xl bg-[#170e0a] border border-[#c5a059]/30 p-6 text-center text-xs text-[#c5a059]">
                      No manuscripts bound offline yet ✨<br />
                      <span className="text-[11px] text-[#f7eed8]/50">Open any PDF and tap the Offline button to store it in your archive.</span>
                    </div>
                  ) : (
                    offlineDocs.map((doc, i) => (
                      <div
                        key={doc.url || i}
                        className="rounded-xl bg-[#170e0a] border border-[#c5a059]/40 hover:border-[#c5a059] px-3.5 py-2.5 flex items-center justify-between gap-2 transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsOfflineModalOpen(false);
                            onOpenPdf?.(doc);
                          }}
                          className="text-left min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="text-xs font-bold text-[#f7eed8] truncate">{doc.title || 'Archival Manuscript.pdf'}</div>
                          <div className="text-[10px] text-[#c5a059] font-medium mt-0.5">Inspect Manuscript →</div>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await removeOfflineDoc(doc.url);
                              const updated = await getOfflineDocsList();
                              setOfflineDocs(Array.isArray(updated) ? updated : []);
                              window.dispatchEvent(new Event('aktu_offline_vault_updated'));
                            } catch {}
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#3d2314] hover:bg-rose-950 text-[#f7eed8] border border-[#c5a059]/50 text-[10px] font-bold cursor-pointer shrink-0 transition-colors"
                        >
                          Eject
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dark Academia Pinned Docs Modal */}
          {isPinnedModalOpen && (
            <div
              onClick={() => setIsPinnedModalOpen(false)}
              className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 font-serif"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#23160e] border-2 border-[#c5a059] rounded-2xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-[#f7eed8] flex flex-col gap-3.5"
              >
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#c5a059]/40">
                  <div>
                    <div className="text-xs font-bold tracking-widest text-[#c5a059] uppercase">📌 PINNED STUDY MANUSCRIPTS</div>
                    <div className="text-[11px] text-[#f7eed8]/70">{pinnedDocs.length} Manuscript(s) pinned</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPinnedModalOpen(false)}
                    className="px-3 py-1 rounded-lg bg-[#3d2314] hover:bg-[#c5a059] hover:text-[#23160e] text-[#f7eed8] border border-[#c5a059] text-xs font-bold cursor-pointer transition-colors"
                  >
                    Close
                  </button>
                </div>

                <div className="max-h-[320px] overflow-y-auto flex flex-col gap-2 pr-0.5">
                  {pinnedDocs.length === 0 ? (
                    <div className="rounded-xl bg-[#170e0a] border border-[#c5a059]/30 p-6 text-center text-xs text-[#c5a059]">
                      No pinned manuscripts yet.<br />
                      <span className="text-[11px] text-[#f7eed8]/50">Click the star icon on any document to pin it here.</span>
                    </div>
                  ) : (
                    pinnedDocs.map((doc, i) => (
                      <div
                        key={doc.url || i}
                        className="rounded-xl bg-[#170e0a] border border-[#c5a059]/40 hover:border-[#c5a059] px-3.5 py-2.5 flex items-center justify-between gap-2 transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsPinnedModalOpen(false);
                            onOpenPdf?.(doc);
                          }}
                          className="text-left min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="text-xs font-bold text-[#f7eed8] truncate">{doc.title || doc.name}</div>
                          <div className="text-[10px] text-[#c5a059] font-medium mt-0.5">Inspect →</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const updated = togglePinDoc(doc);
                              setPinnedDocs([...updated]);
                            } catch {}
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#3d2314] hover:bg-rose-950 text-[#f7eed8] border border-[#c5a059]/50 text-[10px] font-bold cursor-pointer shrink-0 transition-colors"
                        >
                          Unpin
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dark Academia Study Ambience & Music Modal */}
          {isNoiseModalOpen && (
            <div
              onClick={() => setIsNoiseModalOpen(false)}
              className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 font-serif"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-[#23160e] border-2 border-[#c5a059] rounded-2xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-[#f7eed8] flex flex-col gap-3.5"
              >
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#c5a059]/40">
                  <div className="text-xs font-bold tracking-widest text-[#c5a059] uppercase">🎧 Study Ambience & Music</div>
                  <button
                    type="button"
                    onClick={() => setIsNoiseModalOpen(false)}
                    className="px-3 py-1 rounded-lg bg-[#3d2314] hover:bg-[#c5a059] hover:text-[#23160e] text-[#f7eed8] border border-[#c5a059] text-xs font-bold cursor-pointer transition-colors"
                  >
                    Close
                  </button>
                </div>

                <div className="text-[11px] text-[#f7eed8]/80 mb-1 font-mono">Select acoustic synthesizer profile:</div>

                {isBuffering && (
                  <div className="bg-[#170e0a] border border-[#c5a059] p-2 text-center text-xs text-[#c5a059] animate-pulse font-mono font-bold tracking-wider rounded-xl">
                    &gt; TUNING_FREQUENCY // BUFFERING STREAM... 📻⚡
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'off', label: 'Mute / Off' },
                    { id: 'brown', label: 'Deep Brown' },
                    { id: 'pink', label: 'Soft Pink' },
                    { id: 'hiss', label: '90s Tape Hiss' },
                    { 
                      id: 'music', 
                      label: isBuffering && noisePreset === 'music' ? 'Tuning...' : 'Lofi Radio 🎵', 
                      url: 'https://stream.zeno.fm/f3wvbbqmdg8uv' 
                    },
                  ].map((p) => {
                    const isSelected = noisePreset === p.id;
                    const isLoading = p.id === 'music' && isBuffering && isSelected;

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          try { soundEngine.playTick(); } catch {}
                          if (p.id === 'off') {
                            noiseEngine.stop();
                            setIsBuffering(false);
                            setNoisePreset('off');
                          } else if (p.id === 'music') {
                            setIsBuffering(true);
                            setNoisePreset(p.id);
                            noiseEngine.play(p.id, p.url);
                          } else {
                            setIsBuffering(false);
                            noiseEngine.play(p.id, p.url);
                            setNoisePreset(p.id);
                          }
                        }}
                        className={`p-2.5 text-xs font-bold border border-[#c5a059] rounded-xl cursor-pointer transition-colors ${
                          p.id === 'music' ? 'col-span-2' : ''
                        } ${
                          isLoading 
                            ? 'bg-[#c5a059] text-[#23160e] animate-pulse' 
                            : isSelected 
                              ? 'bg-[#c5a059] text-[#23160e]' 
                              : 'bg-[#170e0a] hover:bg-[#3d2314] text-[#f7eed8]'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-1.5 mt-2 font-mono">
                  <div className="flex items-center justify-between text-xs text-[#c5a059]">
                    <span>VOLUME LEVEL:</span>
                    <span>{noiseVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={noiseVolume}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNoiseVolume(val);
                      noiseEngine.setVolume(val / 100);
                    }}
                    className="w-full accent-[#c5a059] cursor-pointer"
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-[#c5a059]/40">
                  <button
                    type="button"
                    onClick={() => setIsNoiseModalOpen(false)}
                    className="px-4 py-1.5 rounded-lg bg-[#c5a059] text-[#23160e] text-xs font-bold cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Archival Motto */}
          <div className="border-t border-[#c5a059]/30 pt-2.5 text-center text-[11px] italic text-[#c5a059]">
            Excellence in Engineering Archival • Dr. APJ Abdul Kalam Tech University
          </div>
        </div>
      </div>
    </div>
  );
}