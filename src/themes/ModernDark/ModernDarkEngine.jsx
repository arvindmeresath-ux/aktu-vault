import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getOfflineDocsList, removeOfflineDoc, formatBytes } from '../../features/offlineVault';
import { soundEngine } from '../../features/soundEngine';
import { noiseEngine } from '../../features/noiseEngine';
import { usePwaInstall } from '../../utils/pwaInstall';

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
  const exists = current.some((d) => (d.url === doc.url));
  const updated = exists ? current.filter((d) => (d.url !== doc.url)) : [...current, doc];
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

const DEFAULT_THEMES = [
  { id: 'neo-brutal', name: 'Neo-Brutalism', tag: 'Bold & Vibrant', icon: '🎨', status: 'active' },
  { id: 'win98', name: 'Windows 98', tag: 'Classic Retro', icon: '💻', status: 'active' },
  { id: 'modern-dark', name: 'Modern Dark UI', tag: 'Minimal OLED', icon: '⚡', status: 'active' },
  { id: 'cyberpunk', name: 'Cyberpunk 2077', tag: 'Neon & Dark HUD', icon: '⚡', status: 'active' },
  { id: 'crt-glow', name: 'CRT Glow', tag: 'Terminal & Scanlines', icon: '📺', status: 'active' },
  { id: 'dark-academia', name: 'Dark Academia', tag: 'Classic Paper & Serif', icon: '✒️', status: 'active' },
  { id: 'blueprint', name: 'Architectural Blueprint', tag: 'Engineering Grid', icon: '📐', status: 'active' }
];

export default function ModernDarkEngine({
  vaultData,
  onOpenPdf,
  onSelectTheme,
  themesList = DEFAULT_THEMES,
  activeTheme = 'modern-dark'
}) {
  const [data, setData] = useState(vaultData || null);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'pyqs' | 'quantums'
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(0);

  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isNoiseModalOpen, setIsNoiseModalOpen] = useState(false);
  const [isPinnedModalOpen, setIsPinnedModalOpen] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);

  const [sfxOn, setSfxOn] = useState(() => {
    try { return soundEngine.isEnabled(); } catch { return true; }
  });
  const [pinnedDocs, setPinnedDocs] = useState(() => loadPinnedDocs());
  const [offlineDocs, setOfflineDocs] = useState(() => getOfflineDocsList());
  const [offlineIds, setOfflineIds] = useState(() => new Set(offlineDocs.map((d) => d.id || d.url)));
  const [noisePreset, setNoisePreset] = useState(() => noiseEngine.getPreset());
  const [noiseVolume, setNoiseVolume] = useState(() => Math.round(noiseEngine.getVolume() * 100));
  const [bufferingPreset, setBufferingPreset] = useState(null);

  const { canPrompt, isInstalled, triggerInstall } = usePwaInstall();
  const searchInputRef = useRef(null);
  const headerRef = useRef(null);
  const listContainerRef = useRef(null);

  useEffect(() => {
    if (vaultData) {
      setData(vaultData);
      return;
    }
    fetch('/vault_data.json?v=' + Date.now())
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error('Error loading vault data:', err));
  }, [vaultData]);

  useEffect(() => {
    const syncSfx = (e) => setSfxOn(Boolean(e.detail));
    const syncOffline = () => {
      const list = getOfflineDocsList();
      setOfflineDocs(list);
      setOfflineIds(new Set(list.map((d) => d.id || d.url)));
    };
    const syncPins = () => setPinnedDocs(loadPinnedDocs());
    const onBuffering = (e) => {
      if (e.detail?.preset) setBufferingPreset(e.detail.preset);
    };
    const onNoiseUpdate = (e) => {
      if (e.detail) {
        setNoisePreset(e.detail.preset);
        setNoiseVolume(Math.round(e.detail.volume * 100));
        setBufferingPreset(null);
      }
    };
    const handleOutside = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setIsThemeOpen(false);
        setIsToolsOpen(false);
      }
    };

    // Override global opener to use Modern Dark styled modal
    window.__aktuOpenOfflineVault = () => {
      try { soundEngine.playTick(); } catch {}
      setOfflineDocs(getOfflineDocsList());
      setIsOfflineModalOpen(true);
    };

    window.addEventListener('aktu_sfx_sync', syncSfx);
    window.addEventListener('aktu_offline_vault_updated', syncOffline);
    window.addEventListener('storage', syncOffline);
    window.addEventListener('aktu_pinned_update', syncPins);
    window.addEventListener('aktu_noise_buffering', onBuffering);
    window.addEventListener('aktu_noise_update', onNoiseUpdate);
    document.addEventListener('mousedown', handleOutside);

    return () => {
      delete window.__aktuOpenOfflineVault;
      window.removeEventListener('aktu_sfx_sync', syncSfx);
      window.removeEventListener('aktu_offline_vault_updated', syncOffline);
      window.removeEventListener('storage', syncOffline);
      window.removeEventListener('aktu_pinned_update', syncPins);
      window.removeEventListener('aktu_noise_buffering', onBuffering);
      window.removeEventListener('aktu_noise_update', onNoiseUpdate);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, []);

  const totalOfflineBytes = offlineDocs.reduce((acc, d) => acc + (d.bytes || 0), 0);

  // Clean and lag-free Browser History Sync (popstate)
  useEffect(() => {
    const handlePopState = (e) => {
      if (document.querySelector('.pdf-page-wrapper')) return;
      const st = e.state;
      try { soundEngine.playFlip(); } catch {}
      if (st && st.aktuNav) {
        setSelectedDept(st.dept || null);
        setSelectedYear(st.year || null);
        setSelectedSubject(st.subject || null);
      } else {
        setSelectedDept(null);
        setSelectedYear(null);
        setSelectedSubject(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (dept, year, subject) => {
    try { soundEngine.playOpen(); } catch {}
    window.history.pushState({ aktuNav: true, dept, year, subject }, '');
    setSelectedDept(dept);
    setSelectedYear(year);
    setSelectedSubject(subject);
    setSearchQuery('');
    setFocusedIndex(0);
  };

  const goBack = () => {
    try { soundEngine.playFlip(); } catch {}
    setSearchQuery('');
    setFocusedIndex(0);
    if (selectedSubject) {
      setSelectedSubject(null);
      window.history.pushState({ aktuNav: true, dept: selectedDept, year: selectedYear, subject: null }, '');
    } else if (selectedYear) {
      setSelectedYear(null);
      window.history.pushState({ aktuNav: true, dept: selectedDept, year: null, subject: null }, '');
    } else if (selectedDept) {
      setSelectedDept(null);
      window.history.pushState({ aktuNav: true, dept: null, year: null, subject: null }, '');
    }
  };

  const currentDeptObj = data?.[(selectedDept || '').toLowerCase()];

  const years = useMemo(() => {
    if (!currentDeptObj || !currentDeptObj.years) return [];
    const rawYears = currentDeptObj.years;
    return Object.keys(rawYears).map((yearKey) => {
      const yearVal = rawYears[yearKey];
      const rawSubs = yearVal?.subjects || {};
      const subjectsArr = Array.isArray(rawSubs)
        ? rawSubs
        : Object.keys(rawSubs).map((subKey) => {
            const subVal = rawSubs[subKey];
            const filesArr = getSubjectFiles(subVal);
            return {
              name: subVal?.name || subKey,
              code: subVal?.code || subKey,
              files: filesArr,
              count: filesArr.length,
              ...subVal
            };
          });

      const totalYrFiles = yearVal?.totalFiles || subjectsArr.reduce((acc, s) => acc + (s.files?.length || 0), 0);

      return {
        year: yearVal?.id || yearVal?.year || yearKey,
        id: yearVal?.id || yearVal?.year || yearKey,
        name: yearVal?.name || yearKey,
        subtitle: yearVal?.subtitle || '',
        subjects: subjectsArr,
        totalFiles: totalYrFiles,
        badge: yearVal?.badge || `${totalYrFiles} DOCS`
      };
    });
  }, [currentDeptObj]);

  const currentYearObj = years.find((y) => String(y.year || y.id || y) === String(selectedYear));
  
  const subjects = useMemo(() => {
    if (!currentYearObj || !currentYearObj.subjects) return [];
    const rawSubs = currentYearObj.subjects;
    if (Array.isArray(rawSubs)) return rawSubs;
    return Object.keys(rawSubs).map((subKey) => {
      const subVal = rawSubs[subKey];
      const filesArr = getSubjectFiles(subVal);
      return {
        name: subVal?.name || subKey,
        files: filesArr,
        count: filesArr.length,
        ...subVal
      };
    });
  }, [currentYearObj]);

  const filteredSubjects = subjects.filter((sub) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(sub.name || '').toLowerCase().includes(q) ||
      String(sub.code || '').toLowerCase().includes(q)
    );
  });

  const currentFiles = useMemo(() => {
    if (!selectedSubject) return [];
    const targetSub = subjects.find((s) => s.name === selectedSubject);
    if (!targetSub) return [];
    const allFiles = getSubjectFiles(targetSub);
    return allFiles.filter((file) => {
      const cat = (file.category || file.type || '').toLowerCase();
      const title = (file.title || file.name || '').toLowerCase();
      const isPyq = cat.includes('pyq') || title.includes('pyq') || title.includes('previous year');
      const isQuantum = cat.includes('quantum') || cat.includes('important') || title.includes('quantum') || title.includes('imp');

      if (activeTab === 'pyqs') return isPyq;
      if (activeTab === 'quantums') return isQuantum;
      return !isPyq && !isQuantum;
    });
  }, [selectedSubject, subjects, activeTab]);

  const filteredFiles = currentFiles.filter((file) => {
    if (!searchQuery.trim()) return true;
    return String(file.title || file.name || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getDeptDocCount = (dKey) => {
    const d = data?.[dKey];
    if (!d || !d.years) return 0;
    let count = 0;
    Object.values(d.years).forEach((yr) => {
      if (yr?.subjects) {
        Object.values(yr.subjects).forEach((sub) => {
          count += sub?.files?.length || 0;
        });
      }
    });
    return count;
  };

  const cseCount = getDeptDocCount('cse') || 401;
  const eceCount = getDeptDocCount('ece') || 58;
  const eeCount = getDeptDocCount('ee') || 0;
  const meCount = getDeptDocCount('me') || 0;
  const ceCount = getDeptDocCount('ce') || 0;
  const itCount = getDeptDocCount('it') || 0;

  const departments = [
    { code: 'cse', name: '[1] CSE', desc: 'Computer Science & Engineering', countText: `${cseCount} files` },
    { code: 'ece', name: '[2] ECE', desc: 'Electronics & Communication', countText: `${eceCount} files` },
    { code: 'ee',  name: '[3] EE',  desc: 'Electrical Engineering', countText: `${eeCount} files` },
    { code: 'me',  name: '[4] ME',  desc: 'Mechanical Engineering', countText: `${meCount} files` },
    { code: 'ce',  name: '[5] CE',  desc: 'Civil Engineering', countText: `${ceCount} files` },
    { code: 'it',  name: '[6] IT',  desc: 'Information Technology', countText: `${itCount} files` }
  ];

  const yearCards = [
    { num: '01', id: '1ST_YEAR', title: '[1] 1st Year', sub: 'Common to all (Sem 1 & 2)' },
    { num: '02', id: '2ND_YEAR', title: '[2] 2nd Year', sub: 'Core Departmental (Sem 3 & 4)' },
    { num: '03', id: '3RD_YEAR', title: '[3] 3rd Year', sub: 'Advanced Electives & Labs (Sem 5 & 6)' },
    { num: '04', id: '4TH_YEAR', title: '[4] 4th Year', sub: 'Specializations & Projects (Sem 7 & 8)' },
  ];

  const isHome = !selectedDept;
  const isYearScreen = selectedDept && !selectedYear;
  const isSubjectScreen = selectedDept && selectedYear && !selectedSubject;
  const isFileScreen = selectedDept && selectedYear && selectedSubject;

  useEffect(() => {
    setFocusedIndex(0);
  }, [selectedDept, selectedYear, selectedSubject, activeTab, searchQuery]);

  useEffect(() => {
    if (!listContainerRef.current) return;
    const focusedEl = listContainerRef.current.querySelector('[data-focused="true"]');
    if (focusedEl) {
      focusedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.querySelector('.pdf-page-wrapper')) return;

      const isTypingInInput =
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

      if (e.key === 'Escape' || (e.key === 'Backspace' && !isTypingInInput)) {
        if (isToolsOpen || isThemeOpen || isPinnedModalOpen || isNoiseModalOpen || isOfflineModalOpen) {
          setIsToolsOpen(false);
          setIsThemeOpen(false);
          setIsPinnedModalOpen(false);
          setIsNoiseModalOpen(false);
          setIsOfflineModalOpen(false);
        } else if (isTypingInInput) {
          document.activeElement.blur();
          if (searchQuery) setSearchQuery('');
        } else if (searchQuery) {
          setSearchQuery('');
        } else {
          goBack();
        }
        return;
      }

      if (isSubjectScreen && e.key === '/' && !isTypingInInput) {
        if (searchInputRef.current) {
          e.preventDefault();
          searchInputRef.current.focus();
        }
        return;
      }

      if (isTypingInInput && e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') {
        return;
      }

      let itemCount = 0;
      if (isHome) itemCount = departments.length;
      else if (isYearScreen) itemCount = yearCards.length;
      else if (isSubjectScreen) itemCount = filteredSubjects.length;
      else if (isFileScreen) itemCount = filteredFiles.length;

      if (e.key === 'ArrowDown' || (e.key === 'ArrowRight' && (isHome || isYearScreen))) {
        if (itemCount > 0) {
          e.preventDefault();
          try { soundEngine.playNav(); } catch {}
          setFocusedIndex((prev) => (prev + 1) % itemCount);
        }
        return;
      }

      if (e.key === 'ArrowUp' || (e.key === 'ArrowLeft' && (isHome || isYearScreen))) {
        if (itemCount > 0) {
          e.preventDefault();
          try { soundEngine.playNav(); } catch {}
          setFocusedIndex((prev) => (prev - 1 + itemCount) % itemCount);
        }
        return;
      }

      if (e.key === 'Enter') {
        if (itemCount > 0) {
          e.preventDefault();
          if (isHome) {
            const targetDept = departments[focusedIndex];
            if (targetDept) {
              navigateTo(targetDept.code, null, null);
            }
          } else if (isYearScreen) {
            const targetYear = yearCards[focusedIndex];
            if (targetYear) {
              navigateTo(selectedDept, targetYear.id, null);
            }
          } else if (isSubjectScreen) {
            const targetSub = filteredSubjects[focusedIndex];
            if (targetSub) {
              navigateTo(selectedDept, selectedYear, targetSub.name);
              setActiveTab('notes');
            }
          } else if (isFileScreen) {
            const targetFile = filteredFiles[focusedIndex];
            if (targetFile && onOpenPdf) onOpenPdf(targetFile);
          }
        }
        return;
      }

      if (!isTypingInInput) {
        if (isHome) {
          if (e.key >= '1' && e.key <= '6') {
            const idx = parseInt(e.key, 10) - 1;
            if (departments[idx]) {
              navigateTo(departments[idx].code, null, null);
            }
          }
        } else if (isYearScreen) {
          if (e.key >= '1' && e.key <= '4') {
            const idx = parseInt(e.key, 10) - 1;
            if (yearCards[idx]) {
              navigateTo(selectedDept, yearCards[idx].id, null);
            }
          }
        } else if (isFileScreen) {
          if (e.key === '1') { try { soundEngine.playTick(); } catch {} setActiveTab('notes'); }
          if (e.key === '2') { try { soundEngine.playTick(); } catch {} setActiveTab('pyqs'); }
          if (e.key === '3') { try { soundEngine.playTick(); } catch {} setActiveTab('quantums'); }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isHome,
    isYearScreen,
    isSubjectScreen,
    isFileScreen,
    isToolsOpen,
    isThemeOpen,
    isPinnedModalOpen,
    isNoiseModalOpen,
    isOfflineModalOpen,
    focusedIndex,
    filteredSubjects,
    filteredFiles,
    departments,
    yearCards,
    selectedDept,
    selectedYear,
    onOpenPdf
  ]);

  const handleToggleSfx = () => {
    try {
      const next = !sfxOn;
      soundEngine.setEnabled(next);
      setSfxOn(next);
      if (next) soundEngine.playTick();
      window.dispatchEvent(new CustomEvent('aktu_sfx_sync', { detail: next }));
    } catch {}
  };

  const handleInstallClick = () => {
    try { soundEngine.playTick(); } catch {}
    setIsToolsOpen(false);
    if (isInstalled) {
      alert('App is already installed on your device!');
      return;
    }
    if (canPrompt) {
      triggerInstall();
    } else if (typeof window !== 'undefined' && window.deferredPrompt) {
      window.deferredPrompt.prompt();
      window.deferredPrompt.userChoice.then(() => {
        window.deferredPrompt = null;
      });
    } else {
      window.dispatchEvent(new CustomEvent('aktu_install_app'));
      alert('To install this app, tap your browser menu (three dots / share button) and select "Install App" or "Add to Home Screen".');
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-2 py-4 text-[#f1f5f9]"
      style={{
        background: 'radial-gradient(circle at 50% 0, #1e1b4b 0%, #030712 100%)',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Modern Glassmorphic Window Frame */}
      <div
        className="w-full max-w-[620px] min-h-[660px] rounded-[24px] p-5 flex flex-col justify-between transition-all"
        style={{
          background: 'linear-gradient(#0f172af2 0%, #020617fa 100%)',
          border: '1px solid #38bdf840',
          boxShadow: '0 25px 60px -15px #000000f2, 0 0 40px #38bdf81a',
        }}
      >
        <div>
          {/* Top Title Header */}
          <div
            className="flex items-center justify-between pb-3 pt-1 px-1"
            style={{ borderBottom: '1px solid #ffffff14' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-mono font-bold text-[#38bdf8]">
                📁 C:\AKTU_PORTAL
              </span>
            </div>
          </div>

          {/* Toolbar: File & Edit on Left; Offline icon, Tool icon, and Theme on Right */}
          <div
            ref={headerRef}
            className="flex items-center justify-between py-3 px-1 flex-wrap text-xs font-mono relative border-b border-white/10"
          >
            {/* Left side: File & Edit */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goBack}
                className="text-[#ffff00] font-bold px-2 py-1 cursor-pointer hover:bg-[#000080] rounded"
              >
                File
              </button>
              <button
                type="button"
                onClick={() => searchInputRef.current?.focus()}
                className="text-[#ffff00] font-bold px-2 py-1 cursor-pointer hover:bg-[#000080] rounded"
              >
                Edit
              </button>
            </div>

            {/* Right side: Offline Icon (⬇), Tool Icon (🧰), and [ THEME ] */}
            <div className="flex items-center gap-2 relative">
              {/* Offline Vault Icon Button */}
              <button
                type="button"
                onClick={() => {
                  try { soundEngine.playTick(); } catch {}
                  setOfflineDocs(getOfflineDocsList());
                  setIsOfflineModalOpen(true);
                }}
                title="Offline Vault"
                className="px-2.5 py-1.5 bg-black border border-[#38bdf8]/60 text-[#38bdf8] font-bold rounded-lg flex items-center gap-1 cursor-pointer hover:bg-sky-950/30"
              >
                <span>⬇</span>
                {offlineIds.size > 0 && <span>[{offlineIds.size}]</span>}
              </button>

              {/* Tool Icon Button (🧰) */}
              <button
                type="button"
                onClick={() => {
                  try { soundEngine.playTick(); } catch {}
                  setIsToolsOpen((v) => !v);
                  setIsThemeOpen(false);
                }}
                title="Study Tools"
                className="px-2.5 py-1.5 bg-black border border-[#38bdf8]/60 text-[#38bdf8] font-bold rounded-lg flex items-center gap-1 cursor-pointer hover:bg-sky-950/30"
              >
                <span>🧰</span>
              </button>

              {/* Theme Button */}
              <div className="relative inline-block">
                <button
                  type="button"
                  onClick={() => {
                    try { soundEngine.playTick(); } catch {}
                    setIsThemeOpen((v) => !v);
                    setIsToolsOpen(false);
                  }}
                  className="px-3 py-1.5 bg-black border border-[#38bdf8] text-[#38bdf8] font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer hover:bg-sky-950/30 transition-all shadow-[0_0_10px_rgba(56,189,248,0.2)]"
                >
                  <span>[ THEME ]</span>
                  <span className="text-[9px] leading-none text-[#38bdf8]">▼</span>
                </button>

                {isThemeOpen && (
                  <div className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-[#0d1726] border border-[#38bdf84d] shadow-2xl p-1 z-50">
                    {(themesList && themesList.length > 0 ? themesList : DEFAULT_THEMES).map((th) => {
                      const isActive = th.id === activeTheme;
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => {
                            try { soundEngine.playTick(); } catch {}
                            setIsThemeOpen(false);
                            onSelectTheme?.(th.id);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs font-mono flex items-center justify-between cursor-pointer rounded-lg mb-0.5 last:mb-0 ${
                            isActive
                              ? 'bg-[#142338] border border-[#38bdf8] text-[#38bdf8] font-bold'
                              : 'text-slate-200 hover:bg-[#142338]'
                          }`}
                        >
                          <span>{th.name}</span>
                          {isActive && <span className="text-[10px] text-[#38bdf8]">✓ ON</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tools Dropdown Menu */}
              {isToolsOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-[#0d1726] border border-[#38bdf84d] shadow-[0_15px_40px_rgba(0,0,0,0.9)] p-2 z-[99999] space-y-2 font-mono">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-100 flex items-center justify-between cursor-pointer bg-[#142338] border border-emerald-500/40 hover:bg-[#1c304f] transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span>📱</span>
                      <span>Install App</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-700">PWA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      setIsPinnedModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-100 flex items-center justify-between cursor-pointer bg-[#142338] border border-amber-500/40 hover:bg-[#1c304f] transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span>📌</span>
                      <span>Pinned Docs</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-700">{pinnedDocs.length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsOpen(false);
                      setIsNoiseModalOpen(true);
                    }}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-100 flex items-center justify-between cursor-pointer bg-[#142338] border border-indigo-500/40 hover:bg-[#1c304f] transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span>🎧</span>
                      <span>Study Ambience</span>
                    </div>
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-700">
                      {bufferingPreset ? 'LOADING...' : noisePreset}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleSfx}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold text-slate-100 flex items-center justify-between cursor-pointer bg-[#142338] border border-sky-500/40 hover:bg-[#1c304f] transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span>🔊</span>
                      <span>Sound Effects</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-950 text-sky-300 border border-sky-700">{sfxOn ? 'SFX ON' : 'SFX OFF'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Breadcrumb / Back Bar */}
          {selectedDept && (
            <div className="flex items-center justify-between gap-2 pt-3 pb-2">
              <button
                type="button"
                onClick={goBack}
                className="px-3 py-1 text-[11px] font-mono font-semibold text-[#38bdf8] bg-[#142236] border border-[#38bdf8]/40 rounded-md cursor-pointer hover:text-white"
              >
                ← Back
              </button>
              <div className="text-[11px] font-mono font-semibold text-slate-400">
                <span className="text-[#38bdf8] uppercase">{selectedDept}</span>
                {selectedYear && <span> / {selectedYear}</span>}
                {selectedSubject && <span> / {selectedSubject}</span>}
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="pt-3">
            {!data ? (
              <div className="py-10 text-center text-xs font-mono text-[#38bdf8] animate-pulse">
                Initializing AKTU Study Portal...
              </div>
            ) : !selectedDept ? (
              <div ref={listContainerRef} className="grid grid-cols-2 gap-2.5">
                {departments.map((dept, idx) => {
                  const isFocused = focusedIndex === idx;
                  return (
                    <div
                      key={dept.code}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      onClick={() => navigateTo(dept.code, null, null)}
                      data-focused={isFocused ? 'true' : undefined}
                      className="flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all bg-[#0b132b] hover:bg-[#111827]"
                      style={{
                        border: isFocused ? '2px dashed #facc15' : '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                    >
                      <div className="text-2xl shrink-0">📁</div>
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-bold text-white truncate">
                          {dept.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                          {dept.countText}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !selectedYear ? (
              <div ref={listContainerRef} className="grid grid-cols-2 gap-2.5">
                {yearCards.map((y, idx) => {
                  const yrObj = years.find((item) => String(item.id || item.year) === String(y.id));
                  const docCount = yrObj?.totalFiles || 0;
                  const isFocused = focusedIndex === idx;
                  return (
                    <div
                      key={y.id}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      onClick={() => navigateTo(selectedDept, y.id, null)}
                      data-focused={isFocused ? 'true' : undefined}
                      className="flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all bg-[#0b132b] hover:bg-[#111827]"
                      style={{
                        border: isFocused ? '2px dashed #facc15' : '1px solid rgba(255, 255, 255, 0.08)'
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="text-2xl shrink-0">📂</div>
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-bold text-white truncate">{y.title}</div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{y.sub}</div>
                        </div>
                      </div>
                      <div className="px-2.5 py-1 bg-sky-600 text-white rounded-lg text-[9px] font-mono font-bold shrink-0">
                        {docCount} DOCS
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !selectedSubject ? (
              <div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search subjects... (Press / to search)"
                  className="w-full px-3 py-2 mb-2 text-xs font-mono text-[#38bdf8] bg-[#080d16] border border-[#38bdf8]/30 rounded-lg focus:border-[#38bdf8] outline-none"
                />
                <div ref={listContainerRef} className="p-2 min-h-[340px] bg-[#0d1726] border border-[#38bdf8]/30 rounded-xl space-y-1.5 max-h-[400px] overflow-y-auto">
                  {filteredSubjects.length === 0 ? (
                    <div className="py-6 text-center text-xs font-mono text-slate-400">No matching subjects found.</div>
                  ) : (
                    filteredSubjects.map((sub, idx) => {
                      const isFocused = focusedIndex === idx;
                      return (
                        <div
                          key={sub.name}
                          onMouseEnter={() => setFocusedIndex(idx)}
                          onClick={() => {
                            navigateTo(selectedDept, selectedYear, sub.name);
                            setActiveTab('notes');
                          }}
                          data-focused={isFocused ? 'true' : undefined}
                          className={`px-3.5 py-3 rounded-lg flex items-center justify-between cursor-pointer ${
                            isFocused ? 'bg-[#142338] border border-[#facc15] text-[#facc15]' : 'bg-black/40 border border-white/5 text-white hover:bg-black/60'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold truncate">{sub.name}</span>
                          <span className="text-[10px] font-mono text-[#38bdf8]">[{sub.files?.length || 0} files]</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter files..."
                  className="w-full px-3 py-2 mb-2 text-xs font-mono text-[#38bdf8] bg-[#080d16] border border-[#38bdf8]/30 rounded-lg focus:border-[#38bdf8] outline-none"
                />
                <div className="flex gap-1 mb-2">
                  {[
                    { id: 'notes', label: 'Notes' },
                    { id: 'pyqs', label: 'PYQs' },
                    { id: 'quantums', label: 'Quantum' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        try { soundEngine.playTick(); } catch {}
                        setActiveTab(tab.id);
                      }}
                      className={`px-3 py-1 text-xs font-mono font-bold uppercase rounded-md cursor-pointer border ${
                        activeTab === tab.id ? 'bg-[#142338] text-[#38bdf8] border-[#38bdf8]' : 'bg-[#0a121f] text-slate-400 border-white/10'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div ref={listContainerRef} className="p-2 min-h-[340px] bg-[#0d1726] border border-[#38bdf8]/30 rounded-xl space-y-1.5 max-h-[400px] overflow-y-auto">
                  {filteredFiles.length === 0 ? (
                    <div className="py-6 text-center text-xs font-mono text-slate-400">No {activeTab} available.</div>
                  ) : (
                    filteredFiles.map((file, idx) => {
                      const isFocused = focusedIndex === idx;
                      const isPinned = pinnedDocs.some((d) => d.url === (file.url || file.link));
                      return (
                        <div
                          key={idx}
                          onMouseEnter={() => setFocusedIndex(idx)}
                          onClick={() => {
                            try { soundEngine.playFlip(); } catch {}
                            if (onOpenPdf) onOpenPdf(file);
                          }}
                          data-focused={isFocused ? 'true' : undefined}
                          className={`px-3.5 py-3 rounded-lg flex items-center justify-between cursor-pointer ${
                            isFocused ? 'bg-[#142338] border border-[#facc15] text-[#facc15]' : 'bg-black/40 border border-white/5 text-white hover:bg-black/60'
                          }`}
                        >
                          <span className="text-xs font-mono font-bold truncate pr-2">{file.title || file.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                try { soundEngine.playTick(); } catch {}
                                togglePinDoc({
                                  title: file.title || file.name,
                                  url: file.url || file.link,
                                  tag: file.category || file.type || 'PDF'
                                });
                                setPinnedDocs(loadPinnedDocs());
                              }}
                              className={`text-sm cursor-pointer ${isPinned ? 'text-amber-400' : 'text-slate-500 hover:text-amber-300'}`}
                            >
                              {isPinned ? '★' : '☆'}
                            </button>
                            <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 bg-sky-600 text-white rounded">OPEN</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer pinned at bottom with generous gap */}
        <div className="pt-10 pb-1 text-[11px] font-mono font-semibold text-slate-500 flex items-center justify-between border-t border-white/10">
          <span>✦ Free Student Vault • Built for AKTU</span>
          <span className="text-[#38bdf8]">READY</span>
        </div>
      </div>

      {/* Modern Dark Offline Vault Modal */}
      {isOfflineModalOpen && (
        <div 
          onClick={() => setIsOfflineModalOpen(false)}
          className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 select-none font-mono"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0d1726] border border-[#38bdf8]/40 rounded-2xl p-4 text-slate-100 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/10">
              <span className="text-xs font-bold text-[#38bdf8] flex items-center gap-1.5">
                <span>💾</span> In-App Offline Vault ({offlineDocs.length} • {formatBytes(totalOfflineBytes)})
              </span>
              <button 
                onClick={() => setIsOfflineModalOpen(false)}
                className="w-6 h-6 rounded-lg bg-[#142338] text-slate-300 hover:text-white border border-white/10 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 mb-3 pr-1">
              {offlineDocs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 italic">
                  No offline PDFs saved yet. Tap the ⬇ symbol in any PDF viewer to save it offline.
                </div>
              ) : (
                offlineDocs.map((doc, idx) => (
                  <div key={idx} className="bg-[#142338]/60 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2 hover:border-[#38bdf8]/40 transition-all">
                    <div className="min-w-0 pr-2">
                      <span className="text-xs text-slate-200 truncate font-semibold block">{doc.title}</span>
                      <span className="text-[10px] text-[#38bdf8]">{formatBytes(doc.bytes)} • READY OFFLINE</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        onClick={() => {
                          setIsOfflineModalOpen(false);
                          if (onOpenPdf) onOpenPdf(doc);
                        }} 
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#38bdf8] text-black hover:bg-sky-400 cursor-pointer"
                      >
                        READ
                      </button>
                      <button 
                        onClick={async () => {
                          try { soundEngine.playTick(); } catch {}
                          await removeOfflineDoc(doc.url);
                          setOfflineDocs(getOfflineDocsList());
                        }}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-white/10">
              <button 
                onClick={() => setIsOfflineModalOpen(false)} 
                className="px-4 py-1.5 bg-[#142338] hover:bg-[#1c304f] border border-[#38bdf8]/40 text-[#38bdf8] rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pinned Docs Modal */}
      {isPinnedModalOpen && (
        <div 
          onClick={() => setIsPinnedModalOpen(false)}
          className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 select-none font-mono"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0d1726] border border-[#38bdf8]/40 rounded-2xl p-4 text-slate-100 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/10">
              <span className="text-xs font-bold text-[#38bdf8] flex items-center gap-1.5">
                <span>📌</span> Pinned Study Documents ({pinnedDocs.length})
              </span>
              <button 
                onClick={() => setIsPinnedModalOpen(false)}
                className="w-6 h-6 rounded-lg bg-[#142338] text-slate-300 hover:text-white border border-white/10 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 mb-3 pr-1">
              {pinnedDocs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 italic">
                  No pinned docs yet. Click the star icon on any document to pin it here.
                </div>
              ) : (
                pinnedDocs.map((doc, idx) => (
                  <div key={idx} className="bg-[#142338]/60 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2 hover:border-[#38bdf8]/40 transition-all">
                    <span className="text-xs text-slate-200 truncate font-semibold">{doc.title || doc.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        onClick={() => {
                          setIsPinnedModalOpen(false);
                          if (onOpenPdf) onOpenPdf(doc);
                        }} 
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#38bdf8] text-black hover:bg-sky-400 cursor-pointer"
                      >
                        READ
                      </button>
                      <button 
                        onClick={() => {
                          const updated = togglePinDoc(doc);
                          setPinnedDocs(updated);
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-white/10">
              <button 
                onClick={() => setIsPinnedModalOpen(false)} 
                className="px-4 py-1.5 bg-[#142338] hover:bg-[#1c304f] border border-[#38bdf8]/40 text-[#38bdf8] rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Study Ambience Modal */}
      {isNoiseModalOpen && (
        <div 
          onClick={() => setIsNoiseModalOpen(false)}
          className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 select-none font-mono"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#0d1726] border border-[#38bdf8]/40 rounded-2xl p-4 text-slate-100 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/10">
              <span className="text-xs font-bold text-[#38bdf8] flex items-center gap-1.5">
                <span>🎧</span> Study Ambience & Focus Audio
              </span>
              <button 
                onClick={() => setIsNoiseModalOpen(false)}
                className="w-6 h-6 rounded-lg bg-[#142338] text-slate-300 hover:text-white border border-white/10 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 mb-3">
              {[
                { id: 'brown', title: '🌊 Deep Brown Noise', desc: 'Deep warm rumble for heavy focus' },
                { id: 'pink',  title: '🌧️ Soft Pink Noise',  desc: 'Gentle rainfall cadence tone' },
                { id: 'tape',  title: '📼 90s Tape Hiss',    desc: 'Vintage cassette room atmosphere' },
                { id: 'music', title: '🎵 Lofi Study Radio', desc: 'Continuous ambient music stream pipeline', url: 'https://stream.zeno.fm/f3wvbbqmdg8uv' },
              ].map(p => {
                const isSelected = noisePreset === p.id;
                const isLoading = bufferingPreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (noisePreset === p.id && !isLoading) noiseEngine.stop();
                      else noiseEngine.play(p.id, p.url);
                    }}
                    className={`w-full p-2.5 text-left rounded-xl border transition-all flex flex-col cursor-pointer ${
                      isSelected
                        ? 'bg-[#142338] border-[#38bdf8] text-[#38bdf8]'
                        : 'bg-[#080d16] border-white/10 text-slate-300 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>{p.title}</span>
                      <span className="text-[10px]">
                        {isLoading ? '⌛ LOADING_BUFFER' : isSelected ? '● ACTIVE' : '○ SELECT'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-0.5">{p.desc}</span>
                  </button>
                );
              })}
            </div>

            <div className="bg-[#080d16] border border-white/10 rounded-xl p-3 mb-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span>Volume</span>
                <span>{noiseVolume}%</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="100" 
                step="5"
                value={noiseVolume}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setNoiseVolume(val);
                  noiseEngine.setVolume(val / 100);
                }}
                className="w-full cursor-pointer accent-[#38bdf8]"
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/10">
              <button
                onClick={() => noiseEngine.stop()}
                disabled={noisePreset === 'off'}
                className="px-3 py-1.5 bg-[#142338] hover:bg-[#1c304f] border border-red-500/40 text-red-300 rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                ⏹ Mute Audio
              </button>
              <button
                onClick={() => setIsNoiseModalOpen(false)}
                className="px-4 py-1.5 bg-[#38bdf8] hover:bg-sky-400 text-black rounded-xl text-xs font-bold cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}