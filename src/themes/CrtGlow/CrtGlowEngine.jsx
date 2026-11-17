import React, { useState, useEffect, useRef, useMemo } from 'react';
import { soundEngine } from '../../features/soundEngine';
import { noiseEngine } from '../../features/noiseEngine';
import { loadPinnedDocs, togglePinDoc } from '../../components/PinnedDocsModal';
import { getOfflineDocsList, removeOfflineDoc } from '../../features/offlineVault';

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

export default function CrtGlowEngine({
  vaultData,
  activeTheme = 'crt-glow',
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
  
  const [pinnedDocs, setPinnedDocs] = useState(() => {
    try { return loadPinnedDocs(); } catch { return []; }
  });
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [isPinnedModalOpen, setIsPinnedModalOpen] = useState(false);
  const [isNoiseModalOpen, setIsNoiseModalOpen] = useState(false);
  const [offlineDocs, setOfflineDocs] = useState([]);

  // Noise & Ambience state with buffering support
  const [noisePreset, setNoisePreset] = useState(() => noiseEngine.getPreset());
  const [noiseVolume, setNoiseVolume] = useState(() => Math.round(noiseEngine.getVolume() * 100));
  const [isBuffering, setIsBuffering] = useState(false);

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

  // Window global overrides to force local CRT-styled modals
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

  // Listen for noise buffering state
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

  const activeSubjectLabel = currentSubjectObj?.name || selectedSubject;
  const activeThemesList = themesList && themesList.length > 0 ? themesList : DEFAULT_THEMES;

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center px-3 py-5 font-mono select-none text-[#33ff33]">
      <div className="w-full max-w-[580px] mx-auto flex flex-col">
        {/* Top VDU Telemetry & Controls Bar */}
        <div className="flex items-center justify-between pb-2.5 text-xs border-b border-[#33ff33]/40 mb-4 gap-2">
          <span className="font-mono text-[10px] sm:text-[11px] tracking-widest text-[#33ff33] flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-[#33ff33] animate-pulse inline-block shrink-0" />
            <span className="truncate">VDU: CRT-MONOCHROME-P1 // 60Hz // BEAM: LOCKED</span>
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
                className="px-2.5 py-1 rounded bg-[#030d06] border border-[#33ff33] text-[#33ff33] font-mono text-[11px] font-bold hover:bg-[#33ff33] hover:text-[#030d06] cursor-pointer transition-colors"
              >
                [ TOOLS ] ▾
              </button>

              {isToolsOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-lg bg-[#030d06] border-2 border-[#33ff33] shadow-[0_0_30px_rgba(51,255,51,0.35)] p-2 z-50 space-y-1">
                  <div className="px-2.5 py-1 flex items-center justify-between text-[10px] font-mono tracking-widest text-[#33ff33]/80 border-b border-[#33ff33]/30 mb-1">
                    <span>✨ QUICK TOOLBOX</span>
                    <span>KEYS</span>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      setIsToolsOpen(false);
                      if (typeof window.__aktuTriggerPwaInstall === 'function') {
                        await window.__aktuTriggerPwaInstall();
                      }
                    }}
                    className="w-full px-2.5 py-2 rounded hover:bg-[#092b13] text-[#33ff33] flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="font-bold">📲 Install App</span>
                    <span className="text-[10px] opacity-80">PWA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      try { setPinnedDocs(loadPinnedDocs()); } catch {}
                      setIsPinnedModalOpen(true);
                    }}
                    className="w-full px-2.5 py-2 rounded hover:bg-[#092b13] text-[#33ff33] flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="font-bold">📌 Pinned Docs</span>
                    <span className="text-[10px] opacity-80">{pinnedDocs.length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      setIsNoiseModalOpen(true);
                    }}
                    className="w-full px-2.5 py-2 rounded hover:bg-[#092b13] text-[#33ff33] flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="font-bold">🎧 Study Ambience</span>
                    <span className="text-[10px] opacity-80">
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
                    className="w-full px-2.5 py-2 rounded hover:bg-[#092b13] text-[#33ff33] flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="font-bold">🔊 Sound Effects</span>
                    <span className="text-[10px] opacity-80">{sfxOn ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      handleResetHome();
                    }}
                    className="w-full px-2.5 py-2 rounded hover:bg-[#092b13] text-[#33ff33] flex items-center justify-between text-xs cursor-pointer"
                  >
                    <span className="font-bold">🏠 Reset to Home</span>
                    <span className="text-[10px] opacity-80">Esc</span>
                  </button>
                </div>
              )}
            </div>

            {/* Theme Switcher Dropdown */}
            <div className="relative" ref={themeMenuRef}>
              <button
                type="button"
                onClick={() => {
                  try { soundEngine.playTick(); } catch {}
                  setIsThemeOpen((v) => !v);
                  setIsToolsOpen(false);
                }}
                className="px-2.5 py-1 rounded bg-[#030d06] border border-[#33ff33] text-[#33ff33] font-mono text-[11px] font-bold hover:bg-[#33ff33] hover:text-[#030d06] cursor-pointer transition-colors"
              >
                [ THEME ] ▾
              </button>

              {isThemeOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-lg bg-[#030d06] border-2 border-[#33ff33] shadow-[0_0_30px_rgba(51,255,51,0.35)] p-1.5 z-50">
                  <div className="px-2.5 py-1 text-[10px] font-mono tracking-widest text-[#33ff33]/80 border-b border-[#33ff33]/30 mb-1">
                    SELECT_VDU_PROFILE
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
                        className={`w-full text-left px-2.5 py-2 rounded flex items-center justify-between transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#33ff33] text-[#030d06] font-bold'
                            : 'text-[#33ff33] hover:bg-[#092b13]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span>{th.icon}</span>
                          <div className="truncate">
                            <div className="text-xs font-bold truncate">{th.name}</div>
                            <div className={`text-[10px] truncate ${active ? 'text-[#030d06]/80' : 'text-[#33ff33]/70'}`}>
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

        {/* Main CRT Phosphor Bezel Container */}
        <div className="bg-[#030d06] border-2 border-[#33ff33] rounded-xl p-4 shadow-[0_0_35px_rgba(51,255,51,0.3)] flex flex-col gap-3 relative overflow-hidden">
          {/* Scanline Overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-10 opacity-30"
            style={{
              backgroundImage: 'linear-gradient(rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 50%)',
              backgroundSize: '100% 4px',
            }}
          />

          {/* VDU Directory Address Bar */}
          <div className="bg-[#05170a] border border-[#33ff33]/60 p-2.5 flex items-center justify-between z-20 gap-2">
            <span className="text-xs font-bold tracking-widest text-[#33ff33] uppercase truncate">
              {selectedDept
                ? `SYS:\\${selectedDept.toUpperCase()}${selectedYear ? `\\${selectedYear}` : ''}${activeSubjectLabel ? `\\${activeSubjectLabel}` : ''}`
                : 'ROOT:\\SYS_CATALOG // [1-6 OR ↑↓]'}
            </span>

            <div className="flex items-center gap-1.5 shrink-0">
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
                title="Open Offline Saved PDFs"
                className="text-xs bg-[#092b13] text-[#33ff33] border-[1.5px] border-[#33ff33] px-3 py-1 font-bold cursor-pointer hover:bg-[#33ff33] hover:text-[#030d06] transition-all shrink-0 flex items-center gap-1.5 shadow-[0_0_16px_rgba(51,255,51,0.65),inset_0_0_8px_rgba(51,255,51,0.3)]"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping shrink-0" />
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>OFFLINE_VAULT [{offlineDocs.length}]</span>
              </button>

              {selectedDept && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-xs bg-[#030d06] text-[#33ff33] border border-[#33ff33] px-2.5 py-0.5 font-bold cursor-pointer hover:bg-[#33ff33] hover:text-[#030d06] transition-colors shrink-0"
                >
                  [ ESC_RETURN ]
                </button>
              )}
            </div>
          </div>

          {/* Level 1: Branches (.SYS Modules) */}
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
                    className={`border border-[#33ff33]/40 p-2.5 flex items-center justify-between cursor-pointer transition-all ${
                      isFocused
                        ? 'bg-[#33ff33] text-[#030d06] font-bold shadow-[0_0_20px_rgba(51,255,51,0.8)] translate-x-1'
                        : 'bg-[#05170a] text-[#33ff33] hover:border-[#33ff33] hover:bg-[#092b13]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs opacity-75">[{idx + 1}]</span>
                      <div>
                        <span className="text-sm font-bold tracking-wider block">
                          {b.code}.SYS
                        </span>
                        <span className="text-[10px] opacity-80">{b.subtitle}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] font-bold block">{b.count} BLOCKS</span>
                      <span className="text-[10px] tracking-widest">LOAD →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Level 2: Academic Year Sectors */}
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
                    className={`border border-[#33ff33]/40 p-3 flex items-center justify-between cursor-pointer transition-all ${
                      isFocused
                        ? 'bg-[#33ff33] text-[#030d06] font-bold shadow-[0_0_20px_rgba(51,255,51,0.8)] translate-x-1'
                        : 'bg-[#05170a] text-[#33ff33] hover:bg-[#092b13] hover:border-[#33ff33]'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-bold block">
                        SECTOR 0{idx + 1} // [{idx + 1}] {yr.label}
                      </span>
                      <span className="text-[10px] opacity-80">{yr.subtitle}</span>
                    </div>
                    <span className="text-xs font-bold">
                      {yr.fileCount > 0 ? `${yr.fileCount} BLK // MOUNT →` : 'MOUNT →'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Level 3: Subject Index Records */}
          {selectedDept && selectedYear && !selectedSubject && (
            <div className="flex flex-col gap-2.5 z-20">
              <input
                ref={searchRef}
                type="text"
                placeholder="QUERY_RECORD (/)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusIdx(0);
                }}
                className="bg-[#05170a] border border-[#33ff33] p-2 text-xs text-[#33ff33] outline-none font-mono placeholder-[#33ff33]/50"
              />
              <div ref={listContainerRef} className="flex flex-col gap-2.5 z-20">
                {filteredSubjects.length === 0 ? (
                  <div className="bg-[#05170a] border border-[#33ff33]/40 p-4 text-center text-xs text-[#33ff33]/70">
                    ERR_NO_RECORDS_FOUND_IN_SECTOR
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
                        className={`border border-[#33ff33]/40 p-2.5 flex items-center justify-between cursor-pointer transition-all gap-2 ${
                          isFocused
                            ? 'bg-[#33ff33] text-[#030d06] font-bold shadow-[0_0_20px_rgba(51,255,51,0.8)] translate-x-1'
                            : 'bg-[#05170a] text-[#33ff33] hover:bg-[#092b13] hover:border-[#33ff33]'
                        }`}
                      >
                        <span className="text-xs font-bold truncate">{sub.name}</span>
                        <span className="text-[11px] font-bold shrink-0">
                          {sub.files.length} FILES →
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Level 4: Subject Files (Notes / PYQ / Important) */}
          {selectedDept && selectedYear && selectedSubject && (
            <div className="flex flex-col gap-2.5 z-20">
              <div className="flex gap-2 border-b border-[#33ff33]/40 pb-2">
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
                    className={`text-xs px-2.5 py-1 border border-[#33ff33] cursor-pointer transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#33ff33] text-[#030d06] font-bold'
                        : 'text-[#33ff33] hover:bg-[#092b13]'
                    }`}
                  >
                    [{idx + 1}] {tab.id.toUpperCase()} ({tab.count})
                  </button>
                ))}
              </div>

              <div ref={listContainerRef} className="flex flex-col gap-2.5 z-20">
                {currentTabFiles.length === 0 ? (
                  <div className="bg-[#05170a] border border-[#33ff33]/40 p-4 text-center text-xs text-[#33ff33]/70">
                    SECTOR_EMPTY // NO_{activeTab.toUpperCase()}_DATA
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
                        className={`border border-[#33ff33]/40 p-2.5 flex items-center justify-between cursor-pointer transition-all gap-2 ${
                          isFocused
                            ? 'bg-[#33ff33] text-[#030d06] font-bold shadow-[0_0_20px_rgba(51,255,51,0.8)] translate-x-1'
                            : 'bg-[#05170a] text-[#33ff33] hover:bg-[#092b13] hover:border-[#33ff33]'
                        }`}
                      >
                        <span className="text-xs font-bold truncate">{doc.title}</span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 shrink-0 ${
                            isFocused
                              ? 'bg-[#030d06] text-[#33ff33]'
                              : 'bg-[#33ff33] text-[#030d06]'
                          }`}
                        >
                          EXEC_PDF
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* CRT Offline VDU Vault Modal */}
          {isOfflineModalOpen && (
            <div
              onClick={() => setIsOfflineModalOpen(false)}
              className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#030d06] border-2 border-[#33ff33] rounded-lg p-4 shadow-[0_0_35px_rgba(51,255,51,0.4)] text-[#33ff33] flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#33ff33]/40">
                  <div>
                    <div className="text-xs font-bold tracking-widest">&gt; LOCAL_VDU_VAULT.SYS</div>
                    <div className="text-[10px] opacity-75">{offlineDocs.length} BLOCK(S) CACHED OFFLINE</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOfflineModalOpen(false)}
                    className="px-2.5 py-0.5 border border-[#33ff33] text-xs font-bold hover:bg-[#33ff33] hover:text-[#030d06] cursor-pointer"
                  >
                    [ X ]
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1.5">
                  {offlineDocs.length === 0 ? (
                    <div className="border border-[#33ff33]/30 p-5 text-center text-xs opacity-80">
                      NO_OFFLINE_SECTORS_ALLOCATED.<br />
                      <span className="text-[10px] opacity-70">Open any PDF and click the Offline icon to cache locally.</span>
                    </div>
                  ) : (
                    offlineDocs.map((doc, i) => (
                      <div
                        key={doc.url || i}
                        className="border border-[#33ff33]/50 hover:border-[#33ff33] bg-[#05170a] px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsOfflineModalOpen(false);
                            onOpenPdf?.(doc);
                          }}
                          className="text-left min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="text-xs font-bold truncate">&gt; {doc.title || 'CACHED_FILE.PDF'}</div>
                          <div className="text-[10px] opacity-70">[ EXECUTE_OFFLINE ]</div>
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
                          className="px-2 py-0.5 border border-[#33ff33]/70 hover:bg-[#33ff33] hover:text-[#030d06] text-[10px] font-bold cursor-pointer shrink-0"
                        >
                          [ DEL ]
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CRT Pinned Study Docs Modal */}
          {isPinnedModalOpen && (
            <div
              onClick={() => setIsPinnedModalOpen(false)}
              className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-[#030d06] border-2 border-[#33ff33] rounded-lg p-4 shadow-[0_0_35px_rgba(51,255,51,0.4)] text-[#33ff33] flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#33ff33]/40">
                  <div>
                    <div className="text-xs font-bold tracking-widest">&gt; PINNED_STUDY_DOCS.SYS</div>
                    <div className="text-[10px] opacity-75">{pinnedDocs.length} RECORD(S) PINNED</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPinnedModalOpen(false)}
                    className="px-2.5 py-0.5 border border-[#33ff33] text-xs font-bold hover:bg-[#33ff33] hover:text-[#030d06] cursor-pointer"
                  >
                    [ X ]
                  </button>
                </div>

                <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1.5">
                  {pinnedDocs.length === 0 ? (
                    <div className="border border-[#33ff33]/30 p-5 text-center text-xs opacity-80">
                      NO_PINNED_DOCUMENTS_FOUND.<br />
                      <span className="text-[10px] opacity-70">Click the star icon on any document to pin it here.</span>
                    </div>
                  ) : (
                    pinnedDocs.map((doc, i) => (
                      <div
                        key={doc.url || i}
                        className="border border-[#33ff33]/50 hover:border-[#33ff33] bg-[#05170a] px-3 py-2 flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsPinnedModalOpen(false);
                            onOpenPdf?.(doc);
                          }}
                          className="text-left min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="text-xs font-bold truncate">&gt; {doc.title || doc.name}</div>
                          <div className="text-[10px] opacity-70">[ EXECUTE ]</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              const updated = togglePinDoc(doc);
                              setPinnedDocs([...updated]);
                            } catch {}
                          }}
                          className="px-2 py-0.5 border border-[#33ff33]/70 hover:bg-[#33ff33] hover:text-[#030d06] text-[10px] font-bold cursor-pointer shrink-0"
                        >
                          [ UNPIN ]
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CRT Study Ambience / Noise Modal with Buffering Transition Banner */}
          {isNoiseModalOpen && (
            <div
              onClick={() => setIsNoiseModalOpen(false)}
              className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 font-mono"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-[#030d06] border-2 border-[#33ff33] rounded-lg p-4 shadow-[0_0_35px_rgba(51,255,51,0.4)] text-[#33ff33] flex flex-col gap-3"
              >
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#33ff33]/40">
                  <div className="text-xs font-bold tracking-widest">&gt; NOISE.EXE - AMBIENCE</div>
                  <button
                    type="button"
                    onClick={() => setIsNoiseModalOpen(false)}
                    className="px-2.5 py-0.5 border border-[#33ff33] text-xs font-bold hover:bg-[#33ff33] hover:text-[#030d06] cursor-pointer"
                  >
                    [ X ]
                  </button>
                </div>

                <div className="text-[11px] opacity-90 mb-1">Select acoustic synthesizer profile:</div>

                {/* Buffering Transition Banner */}
                {isBuffering && (
                  <div className="bg-[#05170a] border border-[#33ff33] p-2 text-center text-xs text-[#33ff33] animate-pulse font-bold tracking-wider">
                    &gt; TUNING_FREQUENCY // BUFFERING STREAM... 📻⚡
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'off', label: 'MUTE/OFF' },
                    { id: 'brown', label: 'BROWN NOISE' },
                    { id: 'pink', label: 'PINK NOISE' },
                    { id: 'hiss', label: 'TAPE HISS' },
                    { 
                      id: 'music', 
                      label: isBuffering && noisePreset === 'music' ? 'TUNING...' : 'LOFI RADIO 🎵', 
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
                            setNoisePreset('music');
                            noiseEngine.play(p.id, p.url);
                          } else {
                            setIsBuffering(false);
                            noiseEngine.play(p.id, p.url);
                            setNoisePreset(p.id);
                          }
                        }}
                        className={`p-2 text-xs font-bold border border-[#33ff33] cursor-pointer transition-colors ${
                          p.id === 'music' ? 'col-span-2' : ''
                        } ${
                          isLoading 
                            ? 'bg-[#33ff33] text-[#030d06] animate-pulse' 
                            : isSelected 
                              ? 'bg-[#33ff33] text-[#030d06]' 
                              : 'bg-[#05170a] hover:bg-[#092b13]'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                  <div className="flex items-center justify-between text-xs">
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
                    className="w-full accent-[#33ff33] cursor-pointer"
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-[#33ff33]/40">
                  <button
                    type="button"
                    onClick={() => setIsNoiseModalOpen(false)}
                    className="px-4 py-1 bg-[#33ff33] text-[#030d06] text-xs font-bold cursor-pointer"
                  >
                    [ OK ]
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Phosphor VDU Tagline */}
          <div className="border-t border-[#33ff33]/30 pt-2 text-center text-[10px] tracking-widest text-[#33ff33]/80 z-20">
            DR. APJ ABDUL KALAM TECHNICAL ARCHIVES // PHOSPHOR TUBE VDU
          </div>
        </div>
      </div>
    </div>
  );
}