import React, { useState, useEffect, useRef, useMemo } from 'react';
import { soundEngine } from '../../features/soundEngine';
import { noiseEngine } from '../../features/noiseEngine';
import { usePwaInstall } from '../../utils/pwaInstall';
import { getOfflineDocsList, removeOfflineDoc, formatBytes } from '../../features/offlineVault';

const BRANCH_META = {
  CSE: { full: 'Computer Science (CSE)', badgeBg: 'bg-[#fce7f3] text-[#be185d] border-[#fbcfe8]', icon: '💻' },
  ECE: { full: 'Electronics & Comm. (ECE)', badgeBg: 'bg-[#e0e7ff] text-[#4338ca] border-[#c7d2fe]', icon: '📡' },
  EE:  { full: 'Electrical Engg. (EE)', badgeBg: 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]', icon: '⚡' },
  ME:  { full: 'Mechanical Engg. (ME)', badgeBg: 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]', icon: '⚙️' },
  CE:  { full: 'Civil Engineering (CE)', badgeBg: 'bg-[#ffedd5] text-[#c2410c] border-[#fed7aa]', icon: '🏛️' },
  IT:  { full: 'Information Tech. (IT)', badgeBg: 'bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff]', icon: '☁️' },
};

const YEAR_SLOTS = [
  { key: '1ST_YEAR', label: '1st Year', subtitle: 'Common Foundation • Sem 1 & 2', emoji: '🌱' },
  { key: '2ND_YEAR', label: '2nd Year', subtitle: 'Core Engineering • Sem 3 & 4', emoji: '🌸' },
  { key: '3RD_YEAR', label: '3rd Year', subtitle: 'Advanced Systems • Sem 5 & 6', emoji: '✨' },
  { key: '4TH_YEAR', label: '4th Year', subtitle: 'Capstone & Electives • Sem 7 & 8', emoji: '🎓' },
];

const DEFAULT_THEMES = [
  { id: 'neo-brutal', name: 'Neo-Brutalism', tag: 'Bold & Vibrant', icon: '🎨', status: 'active' },
  { id: 'win98', name: 'Windows 98', tag: 'Classic Retro', icon: '💻', status: 'active' },
  { id: 'modern-dark', name: 'Modern Dark', tag: 'Sleek & Minimalist', icon: '⚡', status: 'active' },
  { id: 'crt-glow', name: 'CRT Glow', tag: 'Terminal & Scanlines', icon: '📺', status: 'active' },
  { id: 'dark-academia', name: 'Dark Academia', tag: 'Classic Paper & Serif', icon: '✒️', status: 'active' },
  { id: 'kawaii-bento', name: 'Kawaii Bento', tag: 'Cute & Aesthetic', icon: '🍱', status: 'active' }
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

export default function KawaiiBentoEngine({
  vaultData,
  activeTheme = 'kawaii-bento',
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

  // Global window overrides for Kawaii modals
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

  const branches = useMemo(() => {
    const defaultOrder = ['cse', 'ece', 'ee', 'me', 'ce', 'it'];
    if (!data || typeof data !== 'object') {
      return defaultOrder.map((k) => {
        const upper = k.toUpperCase();
        const meta = BRANCH_META[upper] || { full: upper, badgeBg: 'bg-slate-100 text-slate-700 border-slate-200', icon: '📁' };
        return { deptKey: k, code: upper, ...meta, count: 0 };
      });
    }

    const keys = Object.keys(data).filter((k) => k.toLowerCase() !== "departments");
    const orderedKeys = [
      ...defaultOrder.filter((k) => keys.includes(k)),
      ...keys.filter((k) => !defaultOrder.includes(k)),
    ];

    return orderedKeys.map((deptKey) => {
      const deptObj = data[deptKey] || {};
      const upper = (deptObj.code || deptKey).toUpperCase();
      const meta = BRANCH_META[upper] || { full: deptObj.name || upper, badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: '📚' };
      let count = 0;

      Object.values(deptObj.years || {}).forEach((yrObj) => {
        if (typeof yrObj?.totalFiles === 'number') {
          count += yrObj.totalFiles;
        } else {
          Object.values(yrObj?.subjects || {}).forEach((subObj) => {
            count += getSubjectFiles(subObj).length;
          });
        }
      });

      return {
        deptKey,
        code: upper,
        ...meta,
        count,
      };
    });
  }, [data]);

  const currentDeptObj = useMemo(() => {
    if (!selectedDept || !data) return null;
    return data[selectedDept] || data[selectedDept.toLowerCase()] || data[selectedDept.toUpperCase()] || null;
  }, [data, selectedDept]);

  const yearCards = useMemo(() => {
    if (!currentDeptObj?.years) return YEAR_SLOTS;
    return YEAR_SLOTS.map((slot, i) => {
      const rawYears = currentDeptObj.years;
      const yrObj = rawYears[slot.key] || rawYears[String(i + 1)];
      const fileCount = yrObj?.totalFiles || Object.values(yrObj?.subjects || yrObj || {}).reduce((acc, s) => acc + getSubjectFiles(s).length, 0);
      return {
        key: slot.key,
        label: slot.label,
        subtitle: yrObj?.subtitle || slot.subtitle,
        emoji: slot.emoji,
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

  const filteredSubjects = useMemo(() => {
    if (!currentYearObj || !currentYearObj.subjects) return [];
    const q = searchQuery.trim().toLowerCase();
    const rawSubs = currentYearObj.subjects;
    const subsArray = Array.isArray(rawSubs)
      ? rawSubs
      : Object.entries(rawSubs).map(([subKey, subObj]) => ({
          subKey,
          name: subObj?.name || subKey,
          files: getSubjectFiles(subObj),
          ...subObj,
        }));

    return subsArray
      .map((s) => ({
        subKey: s.subKey || s.name || s.id,
        name: s.name || s.subKey || s.id,
        files: getSubjectFiles(s),
        ...s,
      }))
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.subKey.toLowerCase().includes(q));
  }, [currentYearObj, searchQuery]);

  const currentSubjectObj = useMemo(() => {
    if (!selectedSubject || !currentYearObj) return null;
    return filteredSubjects.find((s) => s.name === selectedSubject || s.subKey === selectedSubject) || currentYearObj?.subjects?.[selectedSubject];
  }, [selectedSubject, filteredSubjects, currentYearObj]);

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
      className="h-screen w-full flex flex-col items-center justify-center px-4 py-4 select-none text-slate-800 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #fdf4ff 0%, #eff6ff 48%, #f0fdf4 100%)',
      }}
    >
      <div className="w-full max-w-[580px] mx-auto flex flex-col max-h-full">
        {/* Top Floating Cloud Pill Header */}
        <div className="flex items-center justify-between pb-2 mb-2 gap-2 shrink-0">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-white shadow-[0_4px_14px_rgba(148,163,184,0.14)]">
            <span className="text-sm">☁️</span>
            <span className="text-[11px] font-bold tracking-wide text-slate-700">
              AKTU CLOUD • COZY BENTO
            </span>
          </div>

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
                className="px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-white border border-sky-200/80 text-sky-700 text-xs font-bold shadow-[0_4px_14px_rgba(14,165,233,0.12)] hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
              >
                ✨ Tools ▾
              </button>

              {isToolsOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-3xl bg-white/95 backdrop-blur-xl border border-sky-100 shadow-[0_20px_50px_rgba(14,165,233,0.16)] p-2.5 z-50 space-y-1">
                  <div className="px-3 py-1 flex items-center justify-between text-[10px] font-extrabold tracking-widest uppercase text-sky-500 border-b border-sky-50 mb-1">
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
                      className="w-full px-3 py-2 rounded-2xl hover:bg-emerald-50/80 text-slate-700 flex items-center justify-between text-xs cursor-pointer transition-colors"
                    >
                      <span className="font-bold">📲 Install App</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px]">{canPrompt ? 'READY' : 'PWA'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      try { setPinnedDocs(loadPinnedDocs()); } catch {}
                      setIsPinnedModalOpen(true);
                    }}
                    className="w-full px-3 py-2 rounded-2xl hover:bg-pink-50/80 text-slate-700 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <span className="font-bold">📌 Pinned Docs</span>
                    <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 font-bold text-[10px]">{pinnedDocs.length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      setIsNoiseModalOpen(true);
                    }}
                    className="w-full px-3 py-2 rounded-2xl hover:bg-indigo-50/80 text-slate-700 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <span className="font-bold">🎧 Study Ambience</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px]">
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
                    className="w-full px-3 py-2 rounded-2xl hover:bg-purple-50/80 text-slate-700 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <span className="font-bold">🔊 Sound Effects</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${sfxOn ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                      {sfxOn ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      handleResetHome();
                    }}
                    className="w-full px-3 py-2 rounded-2xl hover:bg-amber-50/80 text-slate-700 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <span className="font-bold">🏠 Reset to Home</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px]">Esc</span>
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
                className="px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-white border border-purple-200/80 text-purple-700 text-xs font-bold shadow-[0_4px_14px_rgba(168,85,247,0.12)] hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
              >
                🎨 Theme ▾
              </button>

              {isThemeOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-3xl bg-white/95 backdrop-blur-xl border border-purple-100 shadow-[0_20px_50px_rgba(109,40,217,0.16)] p-2 z-50">
                  <div className="px-3 py-1.5 text-[10px] font-extrabold tracking-widest uppercase text-purple-500 border-b border-purple-50 mb-1">
                    CHOOSE AESTHETIC
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
                        className={`w-full text-left px-3 py-2.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                          active
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-sm'
                            : 'text-slate-700 hover:bg-purple-50/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base">{th.icon}</span>
                          <div className="truncate">
                            <div className="text-xs font-bold truncate">{th.name}</div>
                            <div className={`text-[10px] truncate ${active ? 'text-white/85' : 'text-slate-400'}`}>
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

        {/* Main Frosted Bento Container */}
        <div className="bg-white/75 backdrop-blur-2xl border-2 border-white rounded-[32px] p-4 sm:p-5 shadow-[0_20px_60px_rgba(148,163,184,0.18)] flex flex-col gap-3 overflow-hidden">
          {/* Header Section */}
          <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 shrink-0">
            <div className="min-w-0">
              <span className="inline-block text-[10px] font-extrabold tracking-widest uppercase text-purple-500 mb-0.5">
                {selectedDept ? 'STUDY WORKSPACE' : 'B.TECH RESOURCE HUB'}
              </span>
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight truncate">
                {selectedDept
                  ? `${selectedDept.toUpperCase()}${selectedYear ? ` • ${activeYearLabel}` : ''}${selectedSubject ? ` • ${activeSubjectLabel}` : ''}`
                  : 'Pick Your Engineering Branch ✨'}
              </h1>
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
                title="Open Offline Study Cloud"
                className="px-3 py-1.5 rounded-full bg-gradient-to-r from-[#fdf2f8] to-[#f3e8ff] hover:from-[#fce7f3] hover:to-[#e9d5ff] border border-pink-200/90 text-purple-800 text-xs font-extrabold shadow-[0_4px_14px_rgba(236,72,153,0.14)] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <svg className="w-4 h-4 text-pink-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                  <path d="m9 15 2 2 4-4" />
                </svg>
                <span>Offline</span>
                <span className="px-1.5 py-0.2 rounded-full bg-white text-pink-600 border border-pink-200 text-[10px] font-black">
                  {offlineDocs.length}
                </span>
              </button>

              {selectedDept && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-purple-600 text-white text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  ← Back
                </button>
              )}
            </div>
          </div>

          {/* Level 1: Branches */}
          {!selectedDept && (
            <div ref={listContainerRef} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-0.5">
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
                    className={`rounded-3xl bg-white border-2 p-3.5 cursor-pointer transition-all duration-200 flex flex-col justify-between gap-2.5 ${
                      isFocused
                        ? 'border-purple-400 shadow-[0_12px_28px_rgba(168,85,247,0.18)] -translate-y-0.5'
                        : 'border-slate-100/90 shadow-[0_4px_16px_rgba(148,163,184,0.08)] hover:border-purple-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-9 h-9 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg">
                        {b.icon}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${b.badgeBg}`}>
                        {b.count} PDFs
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-slate-900">
                          {b.code}
                        </span>
                        <span className="text-xs font-bold text-purple-500">Open →</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{b.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Level 2: Academic Year Bento Cards */}
          {selectedDept && !selectedYear && (
            <div ref={listContainerRef} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-0.5">
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
                    className={`rounded-3xl bg-white border-2 p-3.5 cursor-pointer transition-all duration-200 flex flex-col justify-between gap-2 ${
                      isFocused
                        ? 'border-pink-400 shadow-[0_12px_28px_rgba(236,72,153,0.16)] -translate-y-0.5'
                        : 'border-slate-100 shadow-[0_4px_16px_rgba(148,163,184,0.08)] hover:border-pink-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{yr.emoji}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-100 text-[11px] font-bold">
                        {yr.fileCount} Files
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">{yr.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{yr.subtitle}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Level 3: Subject List with Cozy Search Bar */}
          {selectedDept && selectedYear && !selectedSubject && (
            <div className="flex flex-col gap-2.5">
              <div className="relative shrink-0">
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="🔍 Search subject name or code (press /)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFocusIdx(0);
                  }}
                  className="w-full rounded-2xl bg-white border-2 border-purple-100 focus:border-purple-400 px-3.5 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none shadow-sm transition-colors"
                />
              </div>

              <div ref={listContainerRef} className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-0.5">
                {filteredSubjects.length === 0 ? (
                  <div className="rounded-3xl bg-white/80 border border-slate-100 p-6 text-center text-xs text-slate-500">
                    No subjects found for this semester yet 🌸
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
                        className={`rounded-2xl bg-white border-2 px-3.5 py-2.5 cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          isFocused
                            ? 'border-purple-400 bg-purple-50/40 shadow-sm translate-x-1'
                            : 'border-slate-100 hover:border-purple-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">📘</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                            {sub.name}
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[11px] font-bold shrink-0">
                          {sub.files.length} PDFs →
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Level 4: Subject Files */}
          {selectedDept && selectedYear && selectedSubject && (
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-2 p-1 rounded-full bg-slate-100/90 border border-slate-200/60 shrink-0">
                {[
                  { id: 'Notes', count: notesFiles.length, emoji: '📝' },
                  { id: 'PYQ', count: pyqFiles.length, emoji: '📄' },
                  { id: 'Important', count: quantumFiles.length, emoji: '⭐' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      try { soundEngine.playTick(); } catch {}
                      setActiveTab(tab.id);
                      setFocusIdx(0);
                    }}
                    className={`flex-1 py-1 px-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-white text-purple-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.emoji} {tab.id} ({tab.count})
                  </button>
                ))}
              </div>

              <div ref={listContainerRef} className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-0.5">
                {currentTabFiles.length === 0 ? (
                  <div className="rounded-3xl bg-white/80 border border-slate-100 p-6 text-center text-xs text-slate-500">
                    No {activeTab} files uploaded here yet ✨
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
                        className={`rounded-2xl bg-white border-2 px-3.5 py-2.5 cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          isFocused
                            ? 'border-pink-400 bg-pink-50/30 shadow-sm translate-x-1'
                            : 'border-slate-100 hover:border-pink-200'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {doc.title}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[11px] font-bold shadow-xs shrink-0">
                          Read PDF →
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Kawaii Offline Study Cloud Modal */}
          {isOfflineModalOpen && (
            <div
              onClick={() => setIsOfflineModalOpen(false)}
              className="fixed inset-0 z-[130] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#fdfaff] border-2 border-purple-200 rounded-[28px] p-5 shadow-[0_24px_60px_rgba(168,85,247,0.25)] flex flex-col gap-3.5"
              >
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-purple-100">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 border border-pink-200 flex items-center justify-center text-pink-600">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                        <path d="m9 15 2 2 4-4" />
                      </svg>
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-purple-950">Offline Study Cloud ☁️</h3>
                      <p className="text-[11px] text-purple-500 font-medium">{offlineDocs.length} saved PDF{offlineDocs.length === 1 ? '' : 's'} ready offline</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOfflineModalOpen(false)}
                    className="px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="max-h-[320px] overflow-y-auto flex flex-col gap-2 pr-0.5">
                  {offlineDocs.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-purple-100 p-6 text-center text-xs text-purple-500 font-medium">
                      No offline PDFs saved yet ✨<br />
                      <span className="text-[11px] text-slate-400">Open any PDF and tap the Cloud Download icon to save it here.</span>
                    </div>
                  ) : (
                    offlineDocs.map((doc, i) => (
                      <div
                        key={doc.url || i}
                        className="rounded-2xl bg-white border border-purple-100 hover:border-pink-300 px-3.5 py-2.5 flex items-center justify-between gap-2 transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsOfflineModalOpen(false);
                            onOpenPdf?.(doc);
                          }}
                          className="text-left min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="text-xs font-bold text-slate-800 truncate">{doc.title || 'Saved Document.pdf'}</div>
                          <div className="text-[10px] text-purple-400 font-semibold mt-0.5">Tap to read offline →</div>
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
                          title="Remove from Offline Cloud"
                          className="px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold cursor-pointer shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Kawaii Pinned Docs Modal */}
          {isPinnedModalOpen && (
            <div
              onClick={() => setIsPinnedModalOpen(false)}
              className="fixed inset-0 z-[130] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#fdfaff] border-2 border-purple-200 rounded-[28px] p-5 shadow-[0_24px_60px_rgba(168,85,247,0.25)] flex flex-col gap-3.5"
              >
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-purple-100">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-2xl bg-pink-100 border border-pink-200 flex items-center justify-center text-pink-600">
                      📌
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-purple-950">Pinned Study Docs 🌸</h3>
                      <p className="text-[11px] text-purple-500 font-medium">{pinnedDocs.length} pinned document(s)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPinnedModalOpen(false)}
                    className="px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="max-h-[320px] overflow-y-auto flex flex-col gap-2 pr-0.5">
                  {pinnedDocs.length === 0 ? (
                    <div className="rounded-2xl bg-white border border-purple-100 p-6 text-center text-xs text-purple-500 font-medium">
                      No pinned documents yet ✨<br />
                      <span className="text-[11px] text-slate-400">Click the star icon on any document to pin it here.</span>
                    </div>
                  ) : (
                    pinnedDocs.map((doc, i) => (
                      <div
                        key={doc.url || i}
                        className="rounded-2xl bg-white border border-purple-100 hover:border-pink-300 px-3.5 py-2.5 flex items-center justify-between gap-2 transition-all"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsPinnedModalOpen(false);
                            onOpenPdf?.(doc);
                          }}
                          className="text-left min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="text-xs font-bold text-slate-800 truncate">{doc.title || doc.name}</div>
                          <div className="text-[10px] text-purple-400 font-semibold mt-0.5">Tap to read →</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const updated = togglePinDoc(doc);
                              setPinnedDocs([...updated]);
                            } catch {}
                          }}
                          className="px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold cursor-pointer shrink-0"
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

          {/* Kawaii Study Ambience & Music Modal */}
          {isNoiseModalOpen && (
            <div
              onClick={() => setIsNoiseModalOpen(false)}
              className="fixed inset-0 z-[130] bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-[#fdfaff] border-2 border-purple-200 rounded-[28px] p-5 shadow-[0_24px_60px_rgba(168,85,247,0.25)] flex flex-col gap-3.5"
              >
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-purple-100">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600">
                      🎧
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-purple-950">Study Ambience ✨</h3>
                      <p className="text-[11px] text-purple-500 font-medium">Cozy focus sounds & radio</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNoiseModalOpen(false)}
                    className="px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold cursor-pointer"
                  >
                    ✕ Close
                  </button>
                </div>

                <div className="text-[11px] text-slate-600 font-medium mb-1">Select acoustic sound profile:</div>

                {isBuffering && (
                  <div className="bg-purple-50 border border-purple-200 p-2 text-center text-xs text-purple-700 animate-pulse font-bold rounded-2xl">
                    ☁️ Tuning frequency // Buffering Lofi Stream... 📻
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
                        className={`p-2.5 text-xs font-extrabold rounded-2xl cursor-pointer transition-all ${
                          p.id === 'music' ? 'col-span-2' : ''
                        } ${
                          isLoading 
                            ? 'bg-purple-500 text-white animate-pulse shadow-sm' 
                            : isSelected 
                              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-sm' 
                              : 'bg-white border border-purple-100 hover:border-purple-300 text-slate-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
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
                      const vol = Number(e.target.value);
                      setNoiseVolume(vol);
                      noiseEngine.setVolume(vol / 100);
                    }}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-purple-100">
                  <button
                    type="button"
                    onClick={() => setIsNoiseModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold shadow-sm cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subtle Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium shrink-0">
            <span>AKTU Vault • Student Edition</span>
            <span>Use ↑↓ & Enter</span>
          </div>
        </div>
      </div>
    </div>
  );
}