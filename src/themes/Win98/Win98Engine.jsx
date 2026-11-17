import { getOfflineDocsList, removeOfflineDoc, formatBytes } from '../../features/offlineVault';
import { usePwaInstall } from '../../utils/pwaInstall';
import { soundEngine } from '../../features/soundEngine';
import { noiseEngine } from '../../features/noiseEngine';
import React, { useState, useEffect, useRef, useMemo } from 'react';

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
  return c.includes('pyq') || t.includes('pyq') || t.includes('previous') || t.includes('paper');
};

const isQuantum = (f) => {
  const c = (f?.category || f?.type || '').toLowerCase();
  const t = (f?.title || f?.name || '').toLowerCase();
  return c.includes('quantum') || c.includes('important') || c.includes('imp') || c.includes('syllabus') || t.includes('quantum') || t.includes('imp');
};

const DEFAULT_THEMES = [
  { id: 'neo-brutal', name: 'Neo-Brutalism', tag: 'Bold & Vibrant', icon: '🎨', status: 'active' },
  { id: 'win98', name: 'Windows 98', tag: 'Classic Retro', icon: '💻', status: 'active' },
  { id: 'modern-dark', name: 'Modern Dark', tag: 'Sleek & Minimalist', icon: '⚡', status: 'active' },
  { id: 'crt-glow', name: 'CRT Glow', tag: 'Terminal & Scanlines', icon: '📺', status: 'active' },
  { id: 'dark-academia', name: 'Dark Academia', tag: 'Classic Paper & Serif', icon: '✒️', status: 'active' },
  { id: 'kawaii-bento', name: 'Kawaii Bento', tag: 'Cute & Aesthetic', icon: '🍱', status: 'active' }
];

export default function Win98Engine({
  vaultData,
  activeTheme = 'win98',
  onSelectTheme,
  themesList = DEFAULT_THEMES,
  favorites = [],
  onOpenPdf,
  onToggleFavorite,
  onToggleSfx
}) {
  const [data, setData] = useState(vaultData || null);

  const [navPath, setNavPath] = useState({
    dept: null,
    year: null,
    subject: null
  });

  const [activeTab, setActiveTab] = useState('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    fetch('/vault_data.json?v=' + Date.now())
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error('Error loading vault data:', err));
  }, []);

  useEffect(() => {
    if (vaultData) setData(vaultData);
  }, [vaultData]);

  useEffect(() => {
    const focusedEl = document.querySelector('[data-focused="true"]');
    if (focusedEl) {
      focusedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, navPath, activeTab]);

  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const { canPrompt, isInstalled, triggerInstall } = usePwaInstall();
  const [win98PinnedCount, setWin98PinnedCount] = useState(() => loadPinnedDocs().length);
  const [win98OfflineCount, setWin98OfflineCount] = useState(0);
  const [offlineDocs, setOfflineDocs] = useState([]);

  const [isWin98PinnedOpen, setIsWin98PinnedOpen] = useState(false);
  const [isWin98OfflineModalOpen, setIsWin98OfflineModalOpen] = useState(false);
  const [isWin98NoiseOpen, setIsWin98NoiseOpen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    const syncOff = async () => {
      try {
        const list = await getOfflineDocsList();
        setOfflineDocs(Array.isArray(list) ? list : []);
        setWin98OfflineCount(Array.isArray(list) ? list.length : 0);
      } catch {
        setOfflineDocs([]);
        setWin98OfflineCount(0);
      }
    };
    syncOff();
    window.addEventListener('aktu_offline_vault_updated', syncOff);
    window.addEventListener('storage', syncOff);
    return () => {
      window.removeEventListener('aktu_offline_vault_updated', syncOff);
      window.removeEventListener('storage', syncOff);
    };
  }, []);

  const [win98NoisePreset, setWin98NoisePreset] = useState(() => noiseEngine.getPreset());
  const [win98NoiseVolume, setWin98NoiseVolume] = useState(() => Math.round(noiseEngine.getVolume() * 100));

  useEffect(() => {
    const syncPins = () => setWin98PinnedCount(loadPinnedDocs().length);
    
    const onBuffering = (e) => {
      if (e.detail?.preset === 'music') {
        setIsBuffering(true);
      }
    };

    const onNoiseUpdate = (e) => {
      if (e.detail) {
        setWin98NoisePreset(e.detail.preset);
        setWin98NoiseVolume(Math.round(e.detail.volume * 100));
        setIsBuffering(false);
      }
    };

    window.addEventListener('aktu_pinned_update', syncPins);
    window.addEventListener('aktu_noise_buffering', onBuffering);
    window.addEventListener('aktu_noise_update', onNoiseUpdate);
    
    const syncSfx = (e) => setSfxOn(Boolean(e.detail));
    window.addEventListener('aktu_sfx_sync', syncSfx);

    window.__aktuOpenNoiseModal = () => setIsWin98NoiseOpen(true);
    window.__aktuOpenPinnedModal = () => setIsWin98PinnedOpen(true);
    window.__aktuOpenOfflineVault = () => {
      try { soundEngine.playTick(); } catch {}
      getOfflineDocsList().then((list) => setOfflineDocs(Array.isArray(list) ? list : []));
      setIsWin98OfflineModalOpen(true);
    };

    return () => {
      window.removeEventListener('aktu_pinned_update', syncPins);
      window.removeEventListener('aktu_noise_buffering', onBuffering);
      window.removeEventListener('aktu_noise_update', onNoiseUpdate);
      window.removeEventListener('aktu_sfx_sync', syncSfx);
      delete window.__aktuOpenNoiseModal;
      delete window.__aktuOpenPinnedModal;
      delete window.__aktuOpenOfflineVault;
    };
  }, []);

  const themeRef = useRef(null);
  const toolsRef = useRef(null);
  const searchInputRef = useRef(null);

  const [sfxOn, setSfxOn] = useState(() => {
    try { return soundEngine.isEnabled(); } catch(e) { return true; }
  });
  const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  const [quickSearchText, setQuickSearchText] = useState('');

  const [pinnedList, setPinnedList] = useState(() => {
    if (favorites && favorites.length > 0) return favorites;
    try {
      return loadPinnedDocs();
    } catch(e) {
      return [];
    }
  });

  const isRoot = !navPath.dept;
  const win98PopRef = useRef(false);
  const win98DepthRef = useRef(0);

  useEffect(() => {
    const depth = (navPath.dept ? 1 : 0) + (navPath.year ? 1 : 0) + (navPath.subject ? 1 : 0);
    if (depth > win98DepthRef.current && !win98PopRef.current) {
      window.history.pushState(
        { aktuWin98Nav: true, dept: navPath.dept, year: navPath.year, subject: navPath.subject },
        ''
      );
    }
    win98DepthRef.current = depth;
    win98PopRef.current = false;
  }, [navPath.dept, navPath.year, navPath.subject]);

  useEffect(() => {
    const onWin98Pop = (e) => {
      if (window.__aktuIgnoreNextPop || window.__aktuHasOpenModal?.() || window.history.state?.aktuModal) {
        return;
      }
      setNavPath((prev) => {
        if (!prev.dept && !prev.year && !prev.subject) return prev;
        win98PopRef.current = true;
        try { soundEngine.playFlip(); } catch {}
        if (prev.subject) return { ...prev, subject: null };
        if (prev.year) return { ...prev, year: null };
        return { dept: null, year: null, subject: null };
      });
    };
    window.addEventListener('popstate', onWin98Pop);
    return () => window.removeEventListener('popstate', onWin98Pop);
  }, []);

  const isYearSelect = navPath.dept && !navPath.year;
  const isSubjectSelect = navPath.dept && navPath.year && !navPath.subject;
  const isFileSelect = navPath.dept && navPath.year && navPath.subject;

  let currentAddress = 'C:\\AKTU_PORTAL';
  if (navPath.dept) currentAddress += `\\${navPath.dept.toUpperCase()}`;
  if (navPath.year) currentAddress += `\\${navPath.year}`;
  if (navPath.subject) currentAddress += `\\${navPath.subject.toUpperCase().replace(/\s+/g, '_')}`;

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
    return deptOrder.map((k, idx) => {
      const upper = k.toUpperCase();
      const count = getDeptDocCount(k);
      return {
        deptKey: k,
        code: upper,
        name: `[${idx + 1}] ${upper}`,
        subtitle: BRANCH_FULL_NAMES[upper] || upper,
        count: `${count} Files`,
        rawCount: count
      };
    });
  }, [data]);

  const currentDeptObj = useMemo(() => {
    if (!navPath.dept || !data) return null;
    return data[navPath.dept] || data[navPath.dept.toLowerCase()] || data[navPath.dept.toUpperCase()] || null;
  }, [data, navPath.dept]);

  const yearCards = useMemo(() => {
    const rawYears = currentDeptObj?.years || {};
    return [
      { num: '01', id: '1ST_YEAR', label: '1st Year', subtitle: 'Common to all (Sem 1 & 2)' },
      { num: '02', id: '2ND_YEAR', label: '2nd Year', subtitle: 'Core Departmental (Sem 3 & 4)' },
      { num: '03', id: '3RD_YEAR', label: '3rd Year', subtitle: 'Core & Electives (Sem 5 & 6)' },
      { num: '04', id: '4TH_YEAR', label: '4th Year', subtitle: 'Final Year & Electives (Sem 7 & 8)' },
    ].map((slot, i) => {
      const yrObj = rawYears[slot.id] || rawYears[String(i + 1)];
      const fileCount = yrObj?.totalFiles || Object.values(yrObj?.subjects || yrObj || {}).reduce((acc, s) => acc + getSubjectFiles(s).length, 0);
      return {
        id: slot.id,
        name: `[${i + 1}] ${slot.label}`,
        subtitle: yrObj?.subtitle || slot.subtitle,
        badge: `${fileCount} FILES`,
        fileCount,
      };
    });
  }, [currentDeptObj]);

  const currentYearObj = useMemo(() => {
    if (!currentDeptObj || !currentDeptObj.years || !navPath.year) return null;
    const rawYears = currentDeptObj.years;
    if (rawYears[navPath.year]) return rawYears[navPath.year];
    const yearNum = String(navPath.year).replace(/\D/g, '');
    return rawYears[yearNum] || rawYears[Object.keys(rawYears)[Number(yearNum) - 1]] || null;
  }, [currentDeptObj, navPath.year]);

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
    if (!navPath.subject) return null;
    return allSubjects.find((s) => s.name === navPath.subject || s.subKey === navPath.subject) || currentYearObj?.subjects?.[navPath.subject];
  }, [navPath.subject, allSubjects, currentYearObj]);

  const rawFiles = useMemo(() => getSubjectFiles(currentSubjectObj), [currentSubjectObj]);

  const notesFiles = useMemo(() => rawFiles.filter((f) => !isPyq(f) && !isQuantum(f)), [rawFiles]);
  const pyqFiles = useMemo(() => rawFiles.filter((f) => isPyq(f)), [rawFiles]);
  const quantumFiles = useMemo(() => rawFiles.filter((f) => isQuantum(f)), [rawFiles]);

  let activeTabFiles = notesFiles;
  if (activeTab === 'pyq') activeTabFiles = pyqFiles;
  if (activeTab === 'quantum') activeTabFiles = quantumFiles;

  let items = [];
  if (isRoot) {
    items = branches.map((b) => ({
      id: b.deptKey,
      name: b.name,
      count: b.count,
      onClick: () => {
        setNavPath({ dept: b.deptKey, year: null, subject: null });
        setSelectedIndex(0);
      }
    }));
  } else if (isYearSelect) {
    items = yearCards.map((y) => ({
      id: y.id,
      name: y.name,
      subtitle: y.subtitle,
      badge: y.badge,
      onClick: () => {
        setNavPath({ ...navPath, year: y.id });
        setSelectedIndex(0);
        setSearchQuery('');
      }
    }));
  } else if (isSubjectSelect) {
    items = filteredSubjects.map((s) => ({
      id: s.subKey,
      name: s.name,
      badge: `[${s.files.length} files]`,
      onClick: () => {
        setNavPath({ ...navPath, subject: s.name });
        try { soundEngine.playTick(); } catch(e) {} setActiveTab('notes');
        setSelectedIndex(0);
      }
    }));
  } else if (isFileSelect) {
    items = activeTabFiles.map((f, i) => ({
      id: i,
      name: f.title || f.name,
      fileData: f,
      onClick: () => {
        if (onOpenPdf) onOpenPdf(f);
      }
    }));
  }

  const handleGoBack = () => {
    try { soundEngine.playFlip(); } catch(e) {}
    try { soundEngine.playTick(); } catch(e) {}
    if (navPath.subject) {
      setNavPath({ ...navPath, subject: null });
      setSelectedIndex(0);
    } else if (navPath.year) {
      setNavPath({ ...navPath, year: null });
      setSelectedIndex(0);
    } else if (navPath.dept) {
      setNavPath({ dept: null, year: null, subject: null });
      setSelectedIndex(0);
    }
  };

  const handleToggleFavorite = (f) => {
    const updated = togglePinDoc(f);
    setPinnedList(updated);
    if (onToggleFavorite) onToggleFavorite(f);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isFileSelect) {
        if (e.key === '1') { try { soundEngine.playTick(); } catch(e) {} setActiveTab('notes'); setSelectedIndex(0); return; }
        if (e.key === '2') { try { soundEngine.playTick(); } catch(e) {} setActiveTab('pyq'); setSelectedIndex(0); return; }
        if (e.key === '3') { try { soundEngine.playTick(); } catch(e) {} setActiveTab('quantum'); setSelectedIndex(0); return; }
      }

      if (e.key === '/') { e.preventDefault(); setQuickSearchText(''); setQuickSearchOpen(true); return; }

      if ((e.key === 'Escape' || (e.key === 'Backspace' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA'))) {
        if (searchQuery) {
          setSearchQuery('');
          return;
        }
        handleGoBack();
        return;
      }

      if (document.activeElement === searchInputRef.current) return;

      if (e.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % (items.length || 1));
        try { soundEngine.playTick(); } catch(err) {}
      } else if (e.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev - 1 + (items.length || 1)) % (items.length || 1));
        try { soundEngine.playTick(); } catch(err) {}
      } else if (e.key === 'Enter') {
        const item = items[selectedIndex];
        if (item) {
          try { soundEngine.playTick(); } catch(err) {}
          item.onClick();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, isSubjectSelect, isFileSelect, searchQuery, navPath, activeTab]);

  const activeThemesList = themesList && themesList.length > 0 ? themesList : DEFAULT_THEMES;

  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center p-2 sm:p-4 select-none font-mono">
      <style>{`
        .win98-scroll::-webkit-scrollbar { width: 16px; }
        .win98-scroll::-webkit-scrollbar-track {
          background: #dfdfdf;
          box-shadow: inset 1px 1px 0px #808080, inset -1px -1px 0px #ffffff;
        }
        .win98-scroll::-webkit-scrollbar-thumb {
          background: #c0c0c0;
          border: 1px solid #ffffff;
          border-right-color: #000000;
          border-bottom-color: #000000;
          box-shadow: inset 1px 1px 0px #dfdfdf, inset -1px -1px 0px #808080;
        }
      `}</style>

      <div className="w-full max-w-[580px] bg-black border-[2px] border-[#00ff00] flex flex-col shadow-[0_0_20px_rgba(0,255,0,0.15)]">
        {/* 1. TITLE BAR */}
        <div className="h-[28px] bg-[#000080] border-b-[2px] border-[#00ff00] px-2 flex items-center justify-between text-white text-xs">
          <div className="flex items-center gap-2 font-bold tracking-wide text-white truncate pr-2">
            <svg width="17" height="14" viewBox="0 0 17 14" fill="none" className="shrink-0 select-none">
              <rect x="0.75" y="0.75" width="15.5" height="9.5" rx="0.5" stroke="#ffff00" strokeWidth="1.3" />
              <rect x="2.5" y="2" width="12" height="7" fill="#000080" />
              <path d="M5.5 10.5L4.5 13H12.5L11.5 10.5" stroke="#ffff00" strokeWidth="1.3" />
            </svg>
            <span className="text-[12px] font-bold text-white tracking-wider truncate">
              {currentAddress}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={handleGoBack} className="w-[18px] h-[16px] bg-black border border-[#00ffff] text-[#00ffff] text-[10px] flex items-center justify-center font-bold leading-none cursor-pointer">_</button>
            <button type="button" className="w-[18px] h-[16px] bg-black border border-[#00ffff] text-[#00ffff] text-[10px] flex items-center justify-center font-bold leading-none cursor-pointer">□</button>
            <button type="button" onClick={handleGoBack} className="w-[18px] h-[16px] bg-black border border-[#00ffff] text-[#00ffff] text-[10px] flex items-center justify-center font-bold leading-none cursor-pointer">✕</button>
          </div>
        </div>

        {/* 2. MENU & TOOLBAR */}
        <div className="h-[44px] bg-black border-b-[2px] border-[#00ff00] px-2 flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span
              onClick={handleGoBack}
              className="text-[#ffff00] font-bold text-xs px-2 py-0.5 cursor-pointer select-none hover:bg-[#000080] hover:text-white"
              title="Go to Root"
            >
              File
            </span>
            <span
              onClick={() => {
                setQuickSearchOpen(true);
                setIsToolsOpen(false);
                setIsThemeOpen(false);
              }}
              className="bg-[#000080] text-white font-bold text-xs px-2 py-0.5 cursor-pointer select-none border border-[#000080] hover:border-[#ffff00]"
              title="Quick Search (/)"
            >
              Edit
            </span>

            <div className="relative inline-block" ref={toolsRef}>
              <span
                onClick={() => {
                  try { soundEngine.playTick(); } catch {}
                  setIsToolsOpen(!isToolsOpen);
                  setIsThemeOpen(false);
                }}
                className={`font-bold text-xs px-2 py-0.5 cursor-pointer select-none ${
                  isToolsOpen
                    ? 'bg-[#000080] text-[#ffff00] border border-[#ffff00]'
                    : 'text-[#00ffff] hover:bg-[#000080] hover:text-white'
                }`}
              >
                Tools
              </span>
              {isToolsOpen && (
                <div className="absolute left-0 top-full mt-1 w-64 bg-black border-2 border-[#00ffff] p-2 z-[99999] shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      const next = soundEngine.toggle();
                      setSfxOn(next);
                      if (onToggleSfx) onToggleSfx();
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs flex items-center justify-between text-white cursor-pointer hover:bg-cyan-950/40"
                  >
                    <span>🔊 Sound Effects (SFX)</span>
                    <span className="text-[#00ff00] font-bold">{sfxOn ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      setIsWin98NoiseOpen(true);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs flex items-center justify-between text-white cursor-pointer hover:bg-cyan-950/40 border-t border-cyan-900/60"
                  >
                    <span>🎧 Study Ambience</span>
                    <span className="text-[#00ffff] font-bold">
                      {win98NoisePreset === 'off' ? 'NOISE' : win98NoisePreset.toUpperCase()}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      setIsWin98PinnedOpen(true);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs flex items-center justify-between text-white cursor-pointer hover:bg-cyan-950/40 border-t border-cyan-900/60"
                  >
                    <span>📌 Pinned Docs</span>
                    <span className="text-[#fde68a] font-bold">[{win98PinnedCount}]</span>
                  </button>

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
                      className="w-full text-left px-2 py-1.5 text-xs flex items-center justify-between text-white cursor-pointer hover:bg-cyan-950/40 border-t border-cyan-900/60"
                    >
                      <span>📲 Install App</span>
                      <span className="text-[#00ff00] font-bold">{canPrompt ? 'READY' : 'PWA'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={async () => {
                try { soundEngine.playTick(); } catch {}
                try {
                  const list = await getOfflineDocsList();
                  setOfflineDocs(Array.isArray(list) ? list : []);
                } catch {}
                setIsWin98OfflineModalOpen(true);
              }}
              title={`In-App Offline Vault (${win98OfflineCount} saved)`}
              aria-label="Offline Vault"
              className="h-[34px] px-2.5 border border-[#00ff00] rounded-[2px] bg-black text-[#00ff00] flex items-center justify-center gap-1 cursor-pointer hover:bg-emerald-950/50 font-mono"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {win98OfflineCount > 0 && (
                <span className="text-[10px] font-bold">[{win98OfflineCount}]</span>
              )}
            </button>

            <div className="relative inline-block" ref={themeRef}>
              <button
                type="button"
                onClick={() => { setIsThemeOpen(!isThemeOpen); setIsToolsOpen(false); }}
                className="h-[34px] min-w-[78px] border border-[#00ffff] rounded-[2px] bg-black text-[#00ffff] px-2 flex flex-col items-center justify-center cursor-pointer hover:bg-cyan-950/40"
              >
                <span className="text-[11px] font-bold font-mono leading-none tracking-tight">[ THEME ]</span>
                <span className="text-[9px] text-[#00ffff] leading-none mt-1">▾</span>
              </button>
              {isThemeOpen && (
                <div className="absolute right-0 top-full mt-1 w-60 bg-black border-2 border-[#00ffff] p-1 z-[99999] shadow-2xl">
                  {activeThemesList.map((th) => {
                    const active = th.id === activeTheme;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => {
                          try { soundEngine.playDegauss(); } catch {}
                          setIsThemeOpen(false);
                          if (onSelectTheme) onSelectTheme(th.id);
                        }}
                        className={`w-full text-left px-2 py-1.5 text-xs flex items-center justify-between border-none cursor-pointer ${
                          active ? 'bg-[#000080] text-[#ffff00] font-bold' : 'text-zinc-300 hover:bg-zinc-900'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span>{th.icon}</span>
                          <span className="truncate">{th.name}</span>
                        </div>
                        {active && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. ADDRESS ROW */}
        <div className="bg-[#b4b4b4] px-1.5 py-1.5">
          <div className="flex items-center gap-1.5">
            {!isRoot && (
              <button
                type="button"
                onClick={handleGoBack}
                className="h-[28px] bg-black border border-[#00ffff] text-[#00ffff] px-2.5 flex items-center gap-1.5 text-xs font-bold font-mono cursor-pointer hover:bg-cyan-950/40 shrink-0 select-none"
              >
                <span>↰</span>
                <span>Up (Esc)</span>
              </button>
            )}
            <div className="h-[28px] bg-black border border-white px-2 flex items-center text-xs text-[#999999] font-mono text-left tracking-wide flex-1 truncate">
              Address: {currentAddress}
            </div>
          </div>
        </div>

        <div className="border-b border-[#707070] w-full" />

        {/* 4. MAIN INSET CONTAINER */}
        <div className="bg-[#b4b4b4] px-1.5 pt-1.5 pb-6 flex flex-col">
          <div className="bg-black border border-white p-3.5 min-h-[410px] flex flex-col justify-between">
            <div>
              {/* VIEW 1: BRANCHES */}
              {isRoot && (
                <div>
                  <div className="flex items-center justify-between text-xs text-[#4e6e87] font-mono mb-2">
                    <span>Select Folder (Use 1-6 or ↑↓):</span>
                    <span>{branches.length} Object(s)</span>
                  </div>
                  <div className="border-b border-[#384f63] mb-4" />
                  <div className="grid grid-cols-2 gap-x-5 gap-y-6">
                    {items.map((b, idx) => {
                      const isSelected = selectedIndex === idx;
                      return (
                        <div
                          key={b.id}
                          data-focused={isSelected ? "true" : undefined}
                          onClick={() => { setSelectedIndex(idx); b.onClick(); }}
                          className={`flex items-center gap-3.5 px-3 py-2.5 cursor-pointer select-none transition-none ${
                            isSelected
                              ? 'bg-[#000080] border-[1.5px] border-dashed border-[#ffff00]'
                              : 'border-[1.5px] border-transparent hover:border-zinc-800'
                          }`}
                        >
                          <svg width="28" height="22" viewBox="0 0 28 22" fill="none" className="shrink-0 select-none">
                            <path d="M1 2C1 1.44772 1.44772 1 2 1H10L12.5 3.5H26C26.5523 3.5 27 3.94772 27 4.5V19C27 19.5523 26.5523 20 26 20H2C1.44772 20 1 19.5523 1 19V2Z" fill="#D99B26"/>
                            <rect x="2" y="4" width="24" height="15" fill="#E5AC39"/>
                            <polygon points="1,8 27,8 25.5,20 2.5,20" fill="#F7CA58"/>
                          </svg>
                          <div>
                            <div className="text-[13px] font-bold text-[#ffff00] underline leading-tight">
                              {b.name}
                            </div>
                            <div className={`text-[11px] mt-1 leading-none ${
                              isSelected ? 'text-[#3f5f82] border-[1.5px] border-dashed border-[#facc15] bg-white/[0.07]' : 'text-[#4e6e87]'
                            }`}>
                              {b.count}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIEW 2: 4 YEARS */}
              {isYearSelect && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs text-[#4e6e87] font-mono mb-1">
                    <span>Directory: \\{navPath.dept?.toUpperCase()} (Use 1-4 or ↑↓)</span>
                    <span>4 Folders</span>
                  </div>
                  <div className="border-b border-[#384f63] mb-3" />
                  {items.map((y, idx) => {
                    const isSelected = selectedIndex === idx;
                    return (
                      <div
                        key={y.id}
                        data-focused={isSelected ? "true" : undefined}
                        onClick={() => { setSelectedIndex(idx); y.onClick(); }}
                        className={`px-3 py-2.5 flex items-center justify-between cursor-pointer select-none transition-none ${
                          isSelected
                            ? 'bg-[#000080] border-[1.5px] border-dashed border-[#ffff00]'
                            : 'bg-black border border-white hover:bg-zinc-950'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-2">
                          <svg width="28" height="22" viewBox="0 0 28 22" fill="none" className="shrink-0 select-none">
                            <path d="M1 2C1 1.44772 1.44772 1 2 1H10L12.5 3.5H26C26.5523 3.5 27 3.94772 27 4.5V19C27 19.5523 26.5523 20 26 20H2C1.44772 20 1 19.5523 1 19V2Z" fill="#D99B26"/>
                            <rect x="2" y="4" width="24" height="15" fill="#E5AC39"/>
                            <polygon points="1,8 27,8 25.5,20 2.5,20" fill="#F7CA58"/>
                          </svg>
                          <div className="min-w-0">
                            <div className="text-[13px] font-bold text-[#ffff00] underline leading-tight truncate">
                              {y.name}
                            </div>
                            <div className="text-[11px] text-[#7890a0] mt-1 leading-none font-mono truncate">
                              {y.subtitle}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 bg-[#b4b4b4] border border-black text-black font-bold text-[11px] px-2.5 py-1 font-mono tracking-wider">
                          {y.badge}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* VIEW 3: SUBJECTS LIST WITH FIND (/) */}
              {isSubjectSelect && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs text-[#ffff00] font-bold font-mono shrink-0 select-none">
                      Find (/):
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type subject... (Press / to search, Esc to clear)"
                      className="flex-1 bg-black border border-[#888888] focus:border-[#ffff00] text-xs font-mono text-white px-2 py-1 outline-none placeholder:text-zinc-500 placeholder:text-[11px]"
                    />
                  </div>

                  <div className="win98-scroll flex flex-col gap-1 max-h-[330px] overflow-y-scroll pr-1 border border-zinc-900">
                    {items.length === 0 ? (
                      <div className="text-xs text-zinc-500 italic p-3 text-center">
                        No matching subjects found.
                      </div>
                    ) : (
                      items.map((s, idx) => {
                        const isSelected = selectedIndex === idx;
                        return (
                          <div
                            key={s.id}
                            data-focused={isSelected ? "true" : undefined}
                            onClick={() => { setSelectedIndex(idx); s.onClick(); }}
                            className={`px-2 py-1.5 flex items-center justify-between cursor-pointer select-none transition-none ${
                              isSelected ? 'bg-white/[0.07] border-[1.5px] border-dashed border-[#facc15] rounded-xl' : 'bg-black border border-transparent hover:bg-zinc-900'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="shrink-0 select-none">
                                <rect width="16" height="16" rx="1" fill="#4B0082" />
                                <rect x="3" y="1" width="10" height="6" fill="#C0C0C0" />
                                <rect x="5" y="2" width="2" height="4" fill="#000080" />
                                <rect x="3" y="9" width="10" height="6" fill="#FFFFFF" />
                                <line x1="5" y1="11" x2="11" y2="11" stroke="#808080" strokeWidth="1" />
                                <line x1="5" y1="13" x2="11" y2="13" stroke="#808080" strokeWidth="1" />
                              </svg>
                              <span className="text-[12px] font-bold font-mono text-[#ffff00] underline leading-tight truncate">
                                {s.name}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono shrink-0 text-[#4e6e87]">
                              {s.badge}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* VIEW 4: FILES VIEW */}
              {isFileSelect && (
                <div>
                  <div className="flex items-center justify-between mb-2.5 pb-2 gap-1.5 border-b border-[#384f63] flex-wrap">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => { try { soundEngine.playTick(); } catch(e) {} setActiveTab('notes'); setSelectedIndex(0); }}
                        className={`h-[28px] px-2.5 flex items-center gap-1.5 text-xs font-bold font-mono cursor-pointer border rounded-[2px] transition-none ${
                          activeTab === 'notes'
                            ? 'bg-[#000080] border-white text-white shadow-inner'
                            : 'bg-black border-[#00ffff] text-[#00ffff] hover:bg-cyan-950/40'
                        }`}
                      >
                        <span>📄</span>
                        <span>[1] Notes.txt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { try { soundEngine.playTick(); } catch(e) {} setActiveTab('pyq'); setSelectedIndex(0); }}
                        className={`h-[28px] px-2.5 flex items-center gap-1.5 text-xs font-bold font-mono cursor-pointer border rounded-[2px] transition-none ${
                          activeTab === 'pyq'
                            ? 'bg-[#000080] border-white text-white shadow-inner'
                            : 'bg-black border-[#00ffff] text-[#00ffff] hover:bg-cyan-950/40'
                        }`}
                      >
                        <span className="text-yellow-400">📁</span>
                        <span>[2] PYQ_Archive</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { try { soundEngine.playTick(); } catch(e) {} setActiveTab('quantum'); setSelectedIndex(0); }}
                        className={`h-[28px] px-2.5 flex items-center gap-1.5 text-xs font-bold font-mono cursor-pointer border rounded-[2px] transition-none ${
                          activeTab === 'quantum'
                            ? 'bg-[#000080] border-white text-white shadow-inner'
                            : 'bg-black border-[#00ffff] text-[#00ffff] hover:bg-cyan-950/40'
                        }`}
                      >
                        <span className="text-orange-400">⚡</span>
                        <span>[3] Quantum.exe</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#4e6e87] font-mono px-2 py-1 uppercase tracking-wider mb-1">
                    <span>NAME (Press Enter to Open)</span>
                    <span className="pr-4">ACTION</span>
                  </div>

                  <div className="win98-scroll flex flex-col gap-1.5 max-h-[320px] overflow-y-scroll pr-1 border border-zinc-900">
                    {items.length === 0 ? (
                      <div className="text-xs text-zinc-500 italic p-6 text-center">
                        No files available in this section. Press 1, 2, or 3 to change tabs.
                      </div>
                    ) : (
                      items.map((f, idx) => {
                        const isSelected = selectedIndex === idx;
                        const isFav = pinnedList.some((p) => p.url === f.fileData?.url);

                        return (
                          <div
                            key={f.id}
                            data-focused={isSelected ? "true" : undefined}
                            onClick={() => { setSelectedIndex(idx); }}
                            onDoubleClick={() => f.onClick()}
                            className={`px-2 py-1.5 flex items-center justify-between cursor-pointer select-none transition-none ${
                              isSelected
                                ? 'bg-[#000080] border-[1.5px] border-dashed border-[#ffff00]'
                                : 'bg-black border border-transparent hover:bg-zinc-900'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 pr-2">
                              <span className="text-zinc-400 text-xs shrink-0 select-none">📄</span>
                              <span
                                onClick={() => f.onClick()}
                                className="text-[12px] font-bold font-mono text-[#ffff00] underline leading-tight truncate hover:text-white"
                              >
                                {f.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(f.fileData);
                                }}
                                className="w-[24px] h-[22px] bg-black border border-zinc-600 text-zinc-300 hover:text-yellow-400 flex items-center justify-center text-xs cursor-pointer select-none"
                                title="Favorite"
                              >
                                {isFav ? '★' : '☆'}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  f.onClick();
                                }}
                                className="h-[22px] px-2.5 bg-[#b4b4b4] border border-black text-black font-bold text-[11px] font-mono hover:bg-white active:bg-zinc-400 cursor-pointer shadow-sm select-none"
                              >
                                OPEN
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="h-4" />
          </div>
        </div>

        {/* 5. BOTTOM STATUS BAR */}
        <div className="bg-black border-t-[2px] border-[#00ff00] px-2.5 py-1.5 flex items-center justify-between text-[#00ff00] text-[11px] font-bold font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00ff00] inline-block shadow-[0_0_6px_#00ff00]" />
            <button type="button" onClick={handleGoBack} className="text-[#00ff00] hover:underline cursor-pointer">
              [Esc Back]
            </button>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">
              {isFileSelect ? '[1/2/3 Tabs] [Enter Open]' : '[↑↓ Nav] [/ Find]'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-[1px] bg-[#00ff00]/60 mr-1" />
            <span className="text-xs">🛡️</span>
            <span className="tracking-wider">AKTU_VAULT</span>
          </div>
        </div>
      </div>

      {/* WIN98 OFFLINE VAULT MODAL */}
      {isWin98OfflineModalOpen && (
        <div
          onClick={() => setIsWin98OfflineModalOpen(false)}
          className="fixed inset-0 z-[130] bg-black/60 flex items-center justify-center p-4 font-mono"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black p-3 shadow-2xl text-black flex flex-col gap-3"
          >
            <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] text-white px-2 py-1 flex items-center justify-between">
              <span className="font-bold text-xs">OFFLINE_VAULT.EXE ({offlineDocs.length})</span>
              <button
                type="button"
                onClick={() => setIsWin98OfflineModalOpen(false)}
                className="px-1 bg-[#c0c0c0] text-black border border-black text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto flex flex-col gap-1.5 bg-white border-2 border-t-black border-l-black border-b-white border-r-black p-2">
              {offlineDocs.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-600">
                  No offline files stored in vault.<br />
                  <span className="text-[10px]">Open any PDF and click the Save Offline button.</span>
                </div>
              ) : (
                offlineDocs.map((doc, i) => (
                  <div
                    key={doc.url || i}
                    className="bg-[#c0c0c0] border border-black p-2 flex items-center justify-between gap-2 hover:bg-[#000080] hover:text-white group"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsWin98OfflineModalOpen(false);
                        if (onOpenPdf) onOpenPdf(doc);
                      }}
                      className="text-left min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="text-xs font-bold truncate">📄 {doc.title || 'Offline PDF'}</div>
                      <div className="text-[10px] opacity-80">{formatBytes(doc.bytes)} • Click to Read</div>
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
                      className="px-2 py-0.5 bg-white text-black border border-black text-[10px] font-bold cursor-pointer shrink-0"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsWin98OfflineModalOpen(false)}
                className="px-4 py-1 bg-[#c0c0c0] text-black border-2 border-t-white border-l-white border-b-black border-r-black text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WIN98 PINNED DOCS MODAL */}
      {isWin98PinnedOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-3 select-none">
          <div className="w-full max-w-md bg-[#c0c0c0] border-2 border-white border-r-[#404040] border-b-[#404040] p-4 shadow-[4px_4px_10px_rgba(0,0,0,0.8)] font-mono">
            <div className="bg-[#000080] text-white px-2 py-1 flex items-center justify-between text-xs font-bold mb-4">
              <span>📌 Pinned Study Documents ({pinnedList.length})</span>
              <button
                type="button"
                onClick={() => setIsWin98PinnedOpen(false)}
                className="bg-[#c0c0c0] text-black px-1.5 border border-white border-r-black border-b-black text-[10px]"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 mb-4 pr-1">
              {pinnedList.length === 0 ? (
                <div className="text-center py-6 text-xs text-black/70 italic">
                  No pinned documents yet. Star items with ★ in the file view.
                </div>
              ) : (
                pinnedList.map((doc, idx) => (
                  <div key={idx} className="bg-white border border-black p-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-black font-bold truncate">{doc.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsWin98PinnedOpen(false);
                          if (onOpenPdf) onOpenPdf(doc);
                        }}
                        className="px-2.5 py-1 bg-[#dfdfdf] border border-white border-r-black border-b-black text-xs font-bold text-black"
                      >
                        READ
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleFavorite(doc)}
                        className="px-2 py-1 bg-red-100 border border-red-400 text-red-700 text-xs font-bold"
                      >
                        UNPIN
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#808080]">
              <button
                type="button"
                onClick={() => setIsWin98PinnedOpen(false)}
                className="px-6 py-1 bg-[#dfdfdf] text-black text-xs font-bold border border-white border-r-black border-b-black"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WIN98 STUDY AMBIENCE MODAL */}
      {isWin98NoiseOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-3 select-none">
          <div className="w-full max-w-md bg-[#c0c0c0] border-2 border-white border-r-[#404040] border-b-[#404040] p-4 shadow-[4px_4px_10px_rgba(0,0,0,0.8)] font-mono">
            <div className="bg-[#000080] text-white px-2 py-1 flex items-center justify-between text-xs font-bold mb-4">
              <span>Study Ambience & Lofi Radio</span>
              <button
                type="button"
                onClick={() => setIsWin98NoiseOpen(false)}
                className="bg-[#c0c0c0] text-black px-1.5 border border-white border-r-black border-b-black text-[10px]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-black mb-3">Select ambient sound or lofi stream:</p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { id: 'off', label: 'Mute / Off', icon: '🔇' },
                { id: 'brown', label: 'Deep Brown', icon: '🐻' },
                { id: 'pink', label: 'Soft Pink', icon: '🌸' },
                { id: 'hiss', label: '90s Tape Hiss', icon: '📼' },
                { 
                  id: 'music', 
                  label: isBuffering ? 'TUNING...' : 'Lofi Radio', 
                  icon: isBuffering ? '💿' : '🎵', 
                  url: 'https://stream.zeno.fm/f3wvbbqmdg8uv' 
                }
              ].map((p) => {
                const isSelected = win98NoisePreset === p.id;
                const isLofiLoading = p.id === 'music' && isBuffering;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (p.id === 'off') {
                        noiseEngine.stop();
                        setIsBuffering(false);
                      } else if (p.id === 'music') {
                        setIsBuffering(true);
                        noiseEngine.play(p.id, p.url);
                      } else {
                        setIsBuffering(false);
                        noiseEngine.play(p.id, p.url);
                      }
                    }}
                    className={`p-2.5 border text-xs font-bold flex items-center gap-2 cursor-pointer ${
                      isLofiLoading
                        ? 'bg-yellow-200 border-black animate-pulse'
                        : isSelected
                          ? 'bg-blue-900 text-white border-black'
                          : 'bg-[#dfdfdf] text-black border-white border-r-black border-b-black hover:bg-white'
                    }`}
                  >
                    <span className={`text-lg shrink-0 ${isLofiLoading ? 'animate-spin' : ''}`}>{p.icon}</span>
                    <span className="truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-black mb-1">
                <span>Volume</span>
                <span>{win98NoiseVolume}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={win98NoiseVolume}
                onChange={(e) => {
                  const vol = Number(e.target.value) / 100;
                  noiseEngine.setVolume(vol);
                }}
                className="w-full cursor-pointer accent-blue-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#808080]">
              <button
                type="button"
                onClick={() => {
                  noiseEngine.stop();
                  setIsBuffering(false);
                }}
                className="px-4 py-1 bg-[#dfdfdf] text-black text-xs border border-white border-r-black border-b-black active:border-black active:border-r-white active:border-b-white"
              >
                Mute
              </button>
              <button
                type="button"
                onClick={() => setIsWin98NoiseOpen(false)}
                className="px-5 py-1 bg-[#dfdfdf] text-black text-xs font-bold border border-white border-r-black border-b-black active:border-black active:border-r-white active:border-b-white"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instant Vault Search Modal */}
      {quickSearchOpen && (
        <div
          onClick={() => setQuickSearchOpen(false)}
          className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-[#0b1220] border border-[#38bdf866] shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden"
          >
            <div className="p-3 border-b border-white/10 flex items-center gap-2.5 bg-[#10192c]">
              <span className="text-sm">🔍</span>
              <input
                type="text"
                autoFocus
                value={quickSearchText}
                onChange={(e) => setQuickSearchText(e.target.value)}
                onKeyDown={(e) => { if ((e.key === 'Escape' || (e.key === 'Backspace' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA'))) setQuickSearchOpen(false); }}
                placeholder="Search subjects, units, PYQs, or Quantum PDFs..."
                className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => setQuickSearchOpen(false)}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                ESC
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {(() => {
                const q = quickSearchText.trim().toLowerCase();
                if (!q) {
                  return (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Type a subject name, code, or topic to jump straight in.
                    </div>
                  );
                }
                const matches = [];
                if (data && typeof data === 'object') {
                  Object.entries(data).forEach(([deptKey, deptVal]) => {
                    const years = deptVal?.years || deptVal;
                    if (!years || typeof years !== 'object') return;
                    Object.entries(years).forEach(([yrKey, yrVal]) => {
                      const subjects = yrVal?.subjects || yrVal;
                      if (!subjects || typeof subjects !== 'object') return;
                      Object.entries(subjects).forEach(([subKey, subVal]) => {
                        const subName = subVal?.name || subKey;
                        if (subName.toLowerCase().includes(q) || subKey.toLowerCase().includes(q)) {
                          matches.push({
                            type: 'subject',
                            title: subName,
                            meta: `${deptKey.toUpperCase()} • ${yrKey}`,
                            onSelect: () => {
                              setNavPath({ dept: deptKey, year: yrKey, subject: subKey });
                              setSelectedIndex(0);
                              setQuickSearchOpen(false);
                            }
                          });
                        }
                        ['notes', 'pyq', 'quantum'].forEach((cat) => {
                          const arr = Array.isArray(subVal?.[cat]) ? subVal[cat] : [];
                          arr.forEach((doc) => {
                            if (doc?.title?.toLowerCase().includes(q)) {
                              matches.push({
                                type: 'pdf',
                                title: doc.title,
                                meta: `${deptKey.toUpperCase()} • ${subName} • ${cat.toUpperCase()}`,
                                onSelect: () => {
                                  setQuickSearchOpen(false);
                                  if (onOpenPdf) onOpenPdf(doc);
                                }
                              });
                            }
                          });
                        });
                      });
                    });
                  });
                }
                if (matches.length === 0) {
                  return <div className="py-8 text-center text-xs text-slate-400">No matching subjects or PDFs found.</div>;
                }
                return matches.slice(0, 25).map((m, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={m.onSelect}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#162238] flex items-center justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-100 truncate">
                        {m.type === 'subject' ? '📁 ' : '📄 '}{m.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{m.meta}</div>
                    </div>
                    <span className="text-[10px] font-mono text-[#38bdf8] shrink-0">OPEN →</span>
                  </button>
                ));
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}