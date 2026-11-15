import { THEMES_REGISTRY } from '../themeRegistry';
import { getOfflineDocsList } from '../../features/offlineVault';
import { soundEngine } from '../../features/soundEngine';
import { usePwaInstall } from '../../utils/pwaInstall';
import PinnedDocsModal, { loadPinnedDocs, savePinnedDocs, togglePinDoc } from '../../components/PinnedDocsModal';
import StudyNoiseModal, { useStudyAmbienceAudio } from '../../components/StudyNoiseModal';
import React, { useState, useEffect, useRef } from 'react';

export default function NeoBrutalEngine({
  vaultData,
  onOpenPdf,
  onSelectTheme,
  themesList = [],
  activeTheme = 'neo-brutal'
}) {
  const [data, setData] = useState(vaultData || null);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [searchQuery, setSearchQuery] = useState('');

  const [focusedIndex, setFocusedIndex] = useState(0);

  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [neoSfxOn, setNeoSfxOn] = useState(() => {
    try { return soundEngine.isEnabled(); } catch { return true; }
  });

  useEffect(() => {
    const syncSfx = (e) => setNeoSfxOn(Boolean(e.detail));
    window.addEventListener('aktu_sfx_sync', syncSfx);
    return () => window.removeEventListener('aktu_sfx_sync', syncSfx);
  }, []);

  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isNoiseModalOpen, setIsNoiseModalOpen] = useState(false);
  const [isPinnedModalOpen, setIsPinnedModalOpen] = useState(false);
  const { canPrompt, isInstalled, triggerInstall } = usePwaInstall();
  const [pinnedDocs, setPinnedDocs] = useState(() => loadPinnedDocs());
  const [offlineCount, setOfflineCount] = useState(() => getOfflineDocsList().length);

  useEffect(() => {
    const syncOffline = () => setOfflineCount(getOfflineDocsList().length);
    window.addEventListener('aktu_offline_vault_updated', syncOffline);
    window.addEventListener('storage', syncOffline);
    return () => {
      window.removeEventListener('aktu_offline_vault_updated', syncOffline);
      window.removeEventListener('storage', syncOffline);
    };
  }, []);

  useEffect(() => {
    const syncPins = () => setPinnedDocs(loadPinnedDocs());
    window.addEventListener('aktu_pinned_update', syncPins);
    return () => window.removeEventListener('aktu_pinned_update', syncPins);
  }, []);

  const [noisePreset, setNoisePreset] = useState('off');
  const [noiseVolume, setNoiseVolume] = useState(35);

  useEffect(() => { 
    const onSync = (e) => { 
      if (e.detail) { setNoisePreset(e.detail.preset); setNoiseVolume(e.detail.volume); } 
    }; 
    window.addEventListener("aktu_noise_sync", onSync); 
    return () => window.removeEventListener("aktu_noise_sync", onSync); 
  }, []);

  const searchInputRef = useRef(null);
  const headerRef = useRef(null);
  const listContainerRef = useRef(null);
  const isPoppingHistoryRef = useRef(false);
  const prevDepthRef = useRef(0);

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
    const handleOutsideClick = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setIsToolsOpen(false);
        setIsThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isHome = !selectedDept;
  const isYearScreen = selectedDept && !selectedYear;
  const isSubjectScreen = selectedDept && selectedYear && !selectedSubject;
  const isFileScreen = selectedDept && selectedYear && selectedSubject;

  const currentDeptObj = data?.[(selectedDept || '').toLowerCase()];
  const currentYearObj = currentDeptObj?.years?.[selectedYear];
  const allSubjects = currentYearObj?.subjects ? Object.values(currentYearObj.subjects) : [];

  const filteredSubjects = allSubjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSubjectObj = currentYearObj?.subjects?.[selectedSubject];
  const rawFiles = currentSubjectObj?.files || [];

  const isPyq = (f) => {
    const c = (f.category || '').toLowerCase();
    const t = (f.title || '').toLowerCase();
    return c.includes('pyq') || t.includes('pyq') || t.includes('previous year');
  };
  const isQuantum = (f) => {
    const c = (f.category || '').toLowerCase();
    const t = (f.title || '').toLowerCase();
    return c.includes('quantum') || c.includes('important') || t.includes('quantum') || t.includes('imp');
  };

  const notesFiles = rawFiles.filter((f) => !isPyq(f) && !isQuantum(f));
  const pyqFiles = rawFiles.filter((f) => isPyq(f));
  const quantumFiles = rawFiles.filter((f) => isQuantum(f));

  let currentTabFiles = notesFiles;
  if (activeTab === 'pyq') currentTabFiles = pyqFiles;
  if (activeTab === 'quantum') currentTabFiles = quantumFiles;

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

  useEffect(() => {
    const currentDepth = (selectedDept ? 1 : 0) + (selectedYear ? 1 : 0) + (selectedSubject ? 1 : 0);

    if (isPoppingHistoryRef.current) {
      isPoppingHistoryRef.current = false;
      prevDepthRef.current = currentDepth;
      return;
    }

    if (currentDepth > prevDepthRef.current) {
      window.history.pushState(
        {
          aktuNav: true,
          dept: selectedDept,
          year: selectedYear,
          subject: selectedSubject
        },
        ''
      );
    } else if (currentDepth < prevDepthRef.current) {
      if (window.history.state && window.history.state.aktuNav) {
        isPoppingHistoryRef.current = true;
        window.history.back();
      }
    }

    prevDepthRef.current = currentDepth;
  }, [selectedDept, selectedYear, selectedSubject]);

  useEffect(() => {
    const handleDeviceBack = (e) => {
      if (window.__aktuIgnoreNextPop || window.__aktuHasOpenModal?.() || window.history.state?.aktuModal || document.querySelector('.pdf-page-wrapper')) return;

      const st = e.state;
      if (st && st.aktuPdf) return;

      isPoppingHistoryRef.current = true;
      if (st && st.aktuNav) {
        soundEngine.playFlip();
        setSelectedDept(st.dept || null);
        setSelectedYear(st.year || null);
        setSelectedSubject(st.subject || null);
      } else {
        soundEngine.playFlip();
        setSelectedSubject((prevSub) => {
          if (prevSub) return null;
          setSelectedYear((prevYr) => {
            if (prevYr) return null;
            setSelectedDept(null);
            return null;
          });
          return null;
        });
      }
    };

    window.addEventListener('popstate', handleDeviceBack);
    return () => window.removeEventListener('popstate', handleDeviceBack);
  }, []);

  const handleGoBack = () => {
    soundEngine.playFlip();
    if (selectedSubject) setSelectedSubject(null);
    else if (selectedYear) setSelectedYear(null);
    else if (selectedDept) setSelectedDept(null);
  };

  const deptOrder = ['cse', 'ece', 'ee', 'me', 'ce', 'it'];
  const yearCards = [
    { num: '01', id: '1ST_YEAR', title: '[1] 1st Year', sub: 'Common to all (Sem 1 & 2)' },
    { num: '02', id: '2ND_YEAR', title: '[2] 2nd Year', sub: 'Core Departmental (Sem 3 & 4)' },
    { num: '03', id: '3RD_YEAR', title: '[3] 3rd Year', sub: 'Advanced Electives & Labs (Sem 5 & 6)' },
    { num: '04', id: '4TH_YEAR', title: '[4] 4th Year', sub: 'Specializations & Projects (Sem 7 & 8)' },
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.querySelector('.pdf-page-wrapper')) return;

      const isTypingInInput =
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA');

      if (e.key === 'Escape' || (e.key === 'Backspace' && !isTypingInInput)) {
        if (isToolsOpen || isThemeOpen) {
          setIsToolsOpen(false);
          setIsThemeOpen(false);
        } else if (isTypingInInput) {
          document.activeElement.blur();
          if (searchQuery) setSearchQuery('');
        } else if (searchQuery) {
          setSearchQuery('');
        } else {
          handleGoBack();
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
      if (isHome) itemCount = deptOrder.length;
      else if (isYearScreen) itemCount = yearCards.length;
      else if (isSubjectScreen) itemCount = filteredSubjects.length;
      else if (isFileScreen) itemCount = currentTabFiles.length;

      if (e.key === 'ArrowDown' || (e.key === 'ArrowRight' && (isHome || isYearScreen))) {
        if (itemCount > 0) {
          e.preventDefault();
          soundEngine.playNav(); setFocusedIndex((prev) => (prev + 1) % itemCount);
        }
        return;
      }

      if (e.key === 'ArrowUp' || (e.key === 'ArrowLeft' && (isHome || isYearScreen))) {
        if (itemCount > 0) {
          e.preventDefault();
          soundEngine.playNav(); setFocusedIndex((prev) => (prev - 1 + itemCount) % itemCount);
        }
        return;
      }

      if (e.key === 'Enter') {
        if (itemCount > 0) {
          e.preventDefault();
          if (isHome) {
            const targetDept = deptOrder[focusedIndex];
            if (targetDept) { soundEngine.playOpen(); setSelectedDept(targetDept); }
          } else if (isYearScreen) {
            const targetYear = yearCards[focusedIndex];
            if (targetYear) { soundEngine.playOpen(); setSelectedYear(targetYear.id); }
          } else if (isSubjectScreen) {
            const targetSub = filteredSubjects[focusedIndex];
            if (targetSub) { soundEngine.playOpen(); setSelectedSubject(targetSub.name); }
          } else if (isFileScreen) {
            const targetFile = currentTabFiles[focusedIndex];
            if (targetFile && onOpenPdf) onOpenPdf(targetFile);
          }
        }
        return;
      }

      if (!isTypingInInput) {
        if (isHome) {
          if (e.key === '1') { soundEngine.playOpen(); setSelectedDept('cse'); }
          if (e.key === '2') { soundEngine.playOpen(); setSelectedDept('ece'); }
          if (e.key === '3') { soundEngine.playOpen(); setSelectedDept('ee'); }
          if (e.key === '4') { soundEngine.playOpen(); setSelectedDept('me'); }
          if (e.key === '5') { soundEngine.playOpen(); setSelectedDept('ce'); }
          if (e.key === '6') { soundEngine.playOpen(); setSelectedDept('it'); }
        } else if (isYearScreen) {
          if (e.key === '1') { soundEngine.playOpen(); setSelectedYear('1ST_YEAR'); }
          if (e.key === '2') { soundEngine.playOpen(); setSelectedYear('2ND_YEAR'); }
          if (e.key === '3') { soundEngine.playOpen(); setSelectedYear('3RD_YEAR'); }
          if (e.key === '4') { soundEngine.playOpen(); setSelectedYear('4TH_YEAR'); }
        } else if (isFileScreen) {
          if (e.key === '1') { soundEngine.playTick(); setActiveTab('notes'); }
          if (e.key === '2') { soundEngine.playTick(); setActiveTab('pyq'); }
          if (e.key === '3') { soundEngine.playTick(); setActiveTab('quantum'); }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedDept,
    selectedYear,
    selectedSubject,
    searchQuery,
    isHome,
    isYearScreen,
    isSubjectScreen,
    isFileScreen,
    isToolsOpen,
    isThemeOpen,
    focusedIndex,
    filteredSubjects,
    currentTabFiles,
    onOpenPdf
  ]);

  const getDeptDocCount = (deptKey) => {
    const d = data?.[deptKey];
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
  const totalDocs = cseCount + eceCount + eeCount + meCount + ceCount + itCount;

  const otherDepts = [
    { code: 'ece', idx: 1, num: 2, name: 'ECE', sub: 'Circuits & Signals', icon: '📡', bg: 'bg-[#fed7aa] hover:bg-[#fdba74]', count: eceCount },
    { code: 'ee',  idx: 2, num: 3, name: 'EE',  sub: 'Power Systems',      icon: '⚡', bg: 'bg-[#ddd6fe] hover:bg-[#c4b5fd]', count: eeCount },
    { code: 'me',  idx: 3, num: 4, name: 'ME',  sub: 'Thermo & Design',    icon: '⚙️', bg: 'bg-[#bae6fd] hover:bg-[#93c5fd]', count: meCount },
    { code: 'ce',  idx: 4, num: 5, name: 'CE',  sub: 'Structural',         icon: '🏗️', bg: 'bg-[#fbcfe8] hover:bg-[#f9a8d4]', count: ceCount },
    { code: 'it',  idx: 5, num: 6, name: 'IT',  sub: 'Network & Cloud',    icon: '🌐', bg: 'bg-[#fef08a] hover:bg-[#fde047]', count: itCount }
  ];

  const yearLabelMap = {
    '1ST_YEAR': '1ST YR',
    '2ND_YEAR': '2ND YR',
    '3RD_YEAR': '3RD YR',
    '4TH_YEAR': '4TH YR',
  };

  const focusRingClass = 'ring-4 ring-black translate-x-[-2px] translate-y-[-2px] shadow-[6px_6px_0px_#000]';

  return (
    <div
      className="min-h-screen w-full p-3 sm:p-6 flex flex-col items-center justify-center font-sans select-none"
      style={{
        backgroundColor: '#f3f4f6',
        backgroundImage: 'radial-gradient(#9ca3af 1.2px, transparent 1.2px)',
        backgroundSize: '20px 20px'
      }}
    >
                                          {/* 1. TOP HEADER BAR */}
      <div
        ref={headerRef}
        className="w-full max-w-[580px] flex items-center justify-between gap-2 mb-3 px-0.5 relative z-50"
      >
        {/* LEFT CONTAINER: REPO, BUILD, OFFLINE, TOOLS */}
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          <div className="bg-[#fb7185] border-[2.5px] border-black rounded-xl px-2.5 py-1.5 shadow-[3px_3px_0px_#000] !text-black font-black text-[10px] sm:text-xs tracking-wide whitespace-nowrap">
            REPO: AKTU-VAULT
          </div>

          <div className="bg-white border-[2.5px] border-black rounded-xl px-2.5 py-1.5 shadow-[3px_3px_0px_#000] !text-black font-mono font-black text-[10px] sm:text-[11px] tracking-tight whitespace-nowrap">
            BUILD: v2.4 [{totalDocs}]
          </div>

          {/* FANCY OFFLINE VAULT ICON PILL */}
          <button
            type="button"
            onClick={() => {
              setIsToolsOpen(false);
              setIsThemeOpen(false);
              if (typeof window.__aktuOpenOfflineVault === 'function') window.__aktuOpenOfflineVault();
            }}
            title={`In-App Offline Vault (${offlineCount} saved)`}
            aria-label="Offline Vault"
            className="relative bg-[#86efac] hover:bg-[#4ade80] active:translate-x-[1px] active:translate-y-[1px] !text-black font-black text-[10px] sm:text-xs px-2.5 py-1.5 border-[2.5px] border-black rounded-xl shadow-[3px_3px_0px_#000] cursor-pointer flex items-center justify-center whitespace-nowrap transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {offlineCount > 0 && (
              <span className="ml-1 bg-black text-[#86efac] font-mono font-black text-[9px] px-1.5 py-0.5 rounded-md leading-tight">
                {offlineCount}
              </span>
            )}
          </button>

          {/* CUTE TOOLS BUTTON & POPOVER */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsToolsOpen(!isToolsOpen);
                setIsThemeOpen(false);
              }}
              title="Quick Tools"
              aria-label="Quick Tools"
              className="bg-[#fef08a] hover:bg-[#fde047] active:translate-x-[1px] active:translate-y-[1px] !text-black font-black text-xs px-2.5 py-1.5 border-[2.5px] border-black rounded-xl shadow-[3px_3px_0px_#000,0_0_12px_rgba(250,204,21,0.85)] hover:shadow-[3px_3px_0px_#000,0_0_16px_rgba(34,211,238,0.95)] cursor-pointer flex items-center justify-center whitespace-nowrap transition-all"
            >
              <span className="text-sm leading-none drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]">{noisePreset !== "off" ? "??" : "??"}</span>
            </button>

            {isToolsOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white border-[3px] border-black rounded-2xl overflow-hidden shadow-[5px_5px_0px_#000] z-50">
                <div className="bg-[#fef08a] border-b-[2.5px] border-black px-3 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider !text-black">
                    ? Quick Toolbox
                  </span>
                  <span className="text-[9px] font-mono font-black bg-white border border-black rounded px-1.5 py-0.5 !text-black">
                    KEYS
                  </span>
                </div>

                <div className="p-2 flex flex-col gap-1.5 bg-white">
                  {!isInstalled && (
                    <button
                      type="button"
                      onClick={async () => {
                        setIsToolsOpen(false);
                        const status = await triggerInstall();
                        if (status === 'unavailable') {
                          alert(
                            'To install AKTUVault as an App:

1. Open this site in a normal (non-Incognito) Google Chrome window.
2. Click the Install icon in the right side of Chrome's address bar (or Chrome Menu ? ? Cast, save, and share ? Install AKTUVault).'
                          );
                        }
                      }}
                      className="w-full text-left !text-black font-extrabold text-xs p-2 rounded-xl bg-[#bbf7d0] hover:bg-[#86efac] border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>??</span>
                        <span>Install App</span>
                      </span>
                      <span className="text-[9px] font-mono font-black bg-white border border-black rounded px-1.5 py-0.5 !text-black">
                        {canPrompt ? 'READY' : 'PWA'}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window.__aktuOpenPinnedModal === "function") window.__aktuOpenPinnedModal();
                      setIsToolsOpen(false);
                    }}
                    className="w-full text-left !text-black font-extrabold text-xs p-2 rounded-xl bg-[#fef08a] hover:bg-[#fde047] border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>??</span>
                      <span>Pinned Docs</span>
                    </span>
                    <span className="text-[9px] font-mono font-black bg-white border border-black rounded px-1.5 py-0.5 !text-black">
                      {pinnedDocs.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window.__aktuOpenNoiseModal === "function") window.__aktuOpenNoiseModal();
                      setIsToolsOpen(false);
                    }}
                    className="w-full text-left !text-black font-extrabold text-xs p-2 rounded-xl bg-[#ddd6fe] hover:bg-[#c4b5fd] border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>??</span>
                      <span>Study Ambience</span>
                    </span>
                    <span className="text-[9px] font-mono font-black bg-white border border-black rounded px-1.5 py-0.5 !text-black">
                      {noisePreset === 'off' ? 'NOISE' : noisePreset.toUpperCase()}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = soundEngine.toggle();
                      setNeoSfxOn(next);
                    }}
                    className="w-full text-left !text-black font-extrabold text-xs p-2 rounded-xl bg-[#bae6fd] hover:bg-[#7dd3fc] border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{neoSfxOn ? '??' : '??'}</span>
                      <span>Sound Effects</span>
                    </span>
                    <span className="text-[9px] font-mono font-black bg-white border border-black rounded px-1.5 py-0.5 !text-black">
                      {neoSfxOn ? 'SFX ON' : 'OFF'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubject(null);
                      setSelectedYear(null);
                      setSelectedDept(null);
                      setIsToolsOpen(false);
                    }}
                    className="w-full text-left !text-black font-extrabold text-xs p-2 rounded-xl bg-[#fed7aa] hover:bg-[#fdba74] border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>??</span>
                      <span>Reset to Home</span>
                    </span>
                    <kbd className="text-[10px] font-mono font-black bg-white border border-black rounded px-1.5 py-0.5 !text-black">
                      Esc
                    </kbd>
                  </button>

                  <div className="mt-0.5 px-2 py-1.5 rounded-xl bg-zinc-100 border border-dashed border-zinc-400 text-[10px] font-bold !text-zinc-700 flex items-center justify-between">
                    <span>PDF Fullscreen</span>
                    <kbd className="font-mono font-black bg-white border border-black rounded px-1.5 py-0.5 !text-black">
                      F
                    </kbd>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT CONTAINER: STANDALONE THEME BUTTON */}
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsThemeOpen(!isThemeOpen);
                setIsToolsOpen(false);
              }}
              title="Select Theme"
              aria-label="Select Theme"
              className="bg-[#bae6fd] hover:bg-[#7dd3fc] active:translate-x-[1px] active:translate-y-[1px] !text-black font-black text-xs px-2.5 py-1.5 border-[2.5px] border-black rounded-xl shadow-[3px_3px_0px_#000] cursor-pointer flex items-center gap-1 whitespace-nowrap transition-all"
            >
              <span>??</span>
              <span>THEME</span>
            </button>

            {isThemeOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border-[3px] border-black rounded-2xl overflow-hidden shadow-[5px_5px_0px_#000] z-50">
                <div className="bg-[#bae6fd] border-b-[2.5px] border-black px-3 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider !text-black">
                    ? Choose Theme
                  </span>
                  <span className="text-[9px] font-mono font-black bg-white border border-black rounded px-1.5 py-0.5 !text-black">
                    6 STYLES
                  </span>
                </div>

                <div className="p-2 flex flex-col gap-1.5 bg-white max-h-[260px] overflow-y-auto">
                  {THEMES_REGISTRY.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (t.status === 'active') {
                          if (onSelectTheme) onSelectTheme(t.id);
                          setIsThemeOpen(false);
                        } else {
                          alert(t.name + " is currently in the pipeline and coming soon!");
                        }
                      }}
                      className={`w-full text-left !text-black font-extrabold text-xs p-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] transition-all flex items-center justify-between cursor-pointer ` + (t.status === 'active' ? 'bg-[#bbf7d0] hover:bg-[#86efac]' : 'bg-zinc-100 hover:bg-zinc-200 opacity-90')}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm">{t.icon}</span>
                        <div>
                          <div className="font-black text-xs">{t.name}</div>
                          <div className="text-[9px] font-bold text-zinc-600">{t.tag}</div>
                        </div>
                      </span>
                      <span className="text-[9px] font-mono font-black bg-white border border-black rounded px-1.5 py-0.5 !text-black">
                        {t.status === 'active' ? '? ON' : 'PIPELINE'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTAINER FRAME */}
      <div className="w-full max-w-[580px] bg-white border-[3.5px] border-black rounded-3xl p-5 shadow-[8px_8px_0px_#000000] flex flex-col justify-between min-h-[580px] relative z-10">
        <div>
          {/* Top Header */}
          {selectedDept ? (
            <div className="flex items-center justify-between bg-[#fef08a] border-[3px] border-black rounded-2xl p-3 shadow-[4px_4px_0px_#000] mb-4">
              <button
                type="button"
                onClick={handleGoBack}
                className="bg-[#fb7185] hover:bg-[#ff5572] text-black font-black text-xs px-3.5 py-1.5 border-2 border-black rounded-xl shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                ← BACK (Esc)
              </button>
              <span className="font-black text-xs uppercase truncate max-w-[210px] text-black">
                {selectedDept.toUpperCase()}
                {selectedYear ? ` > ${yearLabelMap[selectedYear] || selectedYear}` : ''}
                {selectedSubject ? ` > ${selectedSubject}` : ''}
              </span>
            </div>
          ) : (
            <div className="bg-[#fef08a] border-[3px] border-black rounded-2xl p-4 text-center shadow-[5px_5px_0px_#000] mb-4 flex flex-col items-center">
              <span className="bg-black text-white text-[10px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider inline-block">
                ★ LIVE VERIFIED ARCHIVE
              </span>
              <h2 className="text-lg font-black text-black mt-1.5 leading-tight">
                Select Department (1-6 or ↑↓)
              </h2>
              <p className="text-xs font-bold text-zinc-800 mt-0.5">
                Explore syllabus notes, quantums and PYQs.
              </p>
            </div>
          )}

          {/* HOME SCREEN */}
          {isHome && (
            <div ref={listContainerRef} className="flex flex-col gap-3.5">
              {/* [1] CSE FEATURED HERO CARD (Index 0) */}
              <div
                onClick={() => setSelectedDept('cse')}
                onMouseEnter={() => setFocusedIndex(0)}
                data-focused={focusedIndex === 0 ? 'true' : undefined}
                className={`bg-[#bbf7d0] hover:bg-[#a7f3d0] active:translate-x-[2px] active:translate-y-[2px] border-[3.5px] border-black rounded-2xl p-3.5 cursor-pointer shadow-[5px_5px_0px_#000] flex items-center justify-between select-none transition-all ${
                  focusedIndex === 0 ? focusRingClass : ''
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-white border-[2.5px] border-black rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-[2px_2px_0px_#000]">
                    💻
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-black">[1] CSE</span>
                      <span className="bg-[#fb7185] text-black text-[10px] font-black px-2 py-0.5 rounded-md border-[1.5px] border-black flex items-center gap-1">
                        🔥 POPULAR
                      </span>
                    </div>
                    <div className="text-xs font-bold text-zinc-800 leading-tight mt-1">
                      Computer Science & Engineering
                    </div>
                  </div>
                </div>
                <div className="bg-black text-white font-black text-xs px-3.5 py-1.5 rounded-full shrink-0 flex items-center gap-1">
                  {cseCount} Docs →
                </div>
              </div>

              {/* 2-COLUMN GRID FOR [2] ECE to [6] IT (Indices 1-5) */}
              <div className="grid grid-cols-2 gap-3.5">
                {otherDepts.map((d) => (
                  <div
                    key={d.code}
                    onClick={() => setSelectedDept(d.code)}
                    onMouseEnter={() => setFocusedIndex(d.idx)}
                    data-focused={focusedIndex === d.idx ? 'true' : undefined}
                    className={`${d.bg} active:translate-x-[2px] active:translate-y-[2px] border-[3px] border-black rounded-2xl p-3.5 cursor-pointer shadow-[4px_4px_0px_#000] min-h-[105px] select-none flex flex-col justify-between transition-all ${
                      focusedIndex === d.idx ? focusRingClass : ''
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className="text-xl leading-none">{d.icon}</span>
                      <span className="bg-white text-black border-2 border-black rounded-lg px-2 py-0.5 text-[10px] font-black shadow-[1.5px_1.5px_0px_#000]">
                        {d.count} Docs
                      </span>
                    </div>
                    <div className="text-center mt-1">
                      <div className="text-sm font-black text-black">{`[${d.num}] ${d.name}`}</div>
                      <div className="text-[10px] font-bold text-zinc-800 mt-0.5">{d.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SCREEN 2: YEAR SELECTION */}
          {isYearScreen && (
            <div ref={listContainerRef} className="grid grid-cols-2 gap-3.5 pt-1">
              {yearCards.map((y, idx) => (
                <div
                  key={y.id}
                  onClick={() => setSelectedYear(y.id)}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  data-focused={focusedIndex === idx ? 'true' : undefined}
                  className={`bg-[#ffd29d] hover:bg-[#ffc680] active:translate-x-[2px] active:translate-y-[2px] border-[3px] border-black rounded-2xl p-3.5 cursor-pointer shadow-[4px_4px_0px_#000] flex flex-col items-center text-center justify-center min-h-[140px] select-none transition-all ${
                    focusedIndex === idx ? focusRingClass : ''
                  }`}
                >
                  <div className="text-2xl font-black text-black leading-none">{y.num}</div>
                  <div className="text-base font-extrabold text-black mt-2 leading-tight">{y.title}</div>
                  <div className="text-[11px] font-semibold text-zinc-700 mt-1.5 leading-snug">{y.sub}</div>
                </div>
              ))}
            </div>
          )}

          {/* SCREEN 3: SUBJECTS LIST */}
          {isSubjectScreen && (
            <div>
              <div className="mb-3">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Search subject (Press / to search, Esc to back)..."
                  className="w-full bg-white border-[2.5px] border-black rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold text-black outline-none placeholder:text-zinc-500 shadow-[3px_3px_0px_#000]"
                />
              </div>

              <div ref={listContainerRef} className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto p-1">
                {filteredSubjects.length === 0 ? (
                  <div className="text-center font-bold text-xs text-zinc-500 py-8">
                    No subjects found in this year.
                  </div>
                ) : (
                  filteredSubjects.map((s, idx) => (
                    <div
                      key={s.name}
                      onClick={() => setSelectedSubject(s.name)}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      data-focused={focusedIndex === idx ? 'true' : undefined}
                      className={`bg-[#bbf2f6] hover:bg-[#a6ecf1] active:translate-x-[1px] active:translate-y-[1px] border-[2.5px] border-black rounded-2xl p-2.5 sm:p-3 flex items-center justify-between cursor-pointer shadow-[3px_3px_0px_#000] select-none transition-all ${
                        focusedIndex === idx ? 'ring-[3px] ring-black bg-[#67e8f9]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="text-lg">📚</span>
                        <span className="font-extrabold text-xs sm:text-sm text-black truncate">{s.name}</span>
                      </div>
                      <div className="bg-white border-[2px] border-black rounded-lg px-2.5 py-1 text-xs font-black text-black shrink-0 shadow-[1px_1px_0px_#000]">
                        {s.files?.length || 0} Files →
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SCREEN 4: FILES VIEW */}
          {isFileScreen && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`border-[2.5px] border-black rounded-xl px-3 py-1.5 text-xs font-black cursor-pointer shadow-[2px_2px_0px_#000] flex items-center gap-1.5 ${
                    activeTab === 'notes' ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
                  }`}
                >
                  <span>[1] 📝 Notes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('pyq')}
                  className={`border-[2.5px] border-black rounded-xl px-3 py-1.5 text-xs font-black cursor-pointer shadow-[2px_2px_0px_#000] flex items-center gap-1.5 ${
                    activeTab === 'pyq' ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
                  }`}
                >
                  <span>[2] 📁 PYQs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('quantum')}
                  className={`border-[2.5px] border-black rounded-xl px-3 py-1.5 text-xs font-black cursor-pointer shadow-[2px_2px_0px_#000] flex items-center gap-1.5 ${
                    activeTab === 'quantum' ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
                  }`}
                >
                  <span>[3] ⚡ Quantum</span>
                </button>
              </div>

              <div ref={listContainerRef} className="flex flex-col gap-2.5 max-h-[330px] overflow-y-auto p-1">
                {currentTabFiles.length === 0 ? (
                  <div className="text-center font-bold text-xs text-zinc-500 py-8">
                    No files available in this section.
                  </div>
                ) : (
                  currentTabFiles.map((f, idx) => (
                    <div
                      key={idx}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      onClick={() => {
                        if (onOpenPdf) onOpenPdf(f);
                      }}
                      data-focused={focusedIndex === idx ? 'true' : undefined}
                      className={`bg-[#dcfce7] hover:bg-[#bbf7d0] border-[2.5px] border-black rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-[3px_3px_0px_#000] cursor-pointer transition-all ${
                        focusedIndex === idx ? 'ring-[3px] ring-black bg-[#86efac]' : ''
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-extrabold text-xs sm:text-sm text-black truncate">{f.title}</div>
                        <div className="text-[10px] font-black text-zinc-600 tracking-wider uppercase mt-0.5">
                          {f.category}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onOpenPdf) onOpenPdf(f);
                        }}
                        className="bg-[#ff6584] hover:bg-[#ff4f72] active:translate-x-[1px] active:translate-y-[1px] text-black font-black text-xs px-3.5 py-1.5 border-[2px] border-black rounded-xl cursor-pointer shadow-[2px_2px_0px_#000] shrink-0"
                      >
                        READ PDF
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM SHORTCUTS BAR */}
        <div className="pt-3 border-t-[2.5px] border-black mt-3 flex items-center justify-center text-[10px] sm:text-[11px] font-extrabold text-zinc-700 tracking-tight select-none">
          ⌨ [↑↓ NAVIGATE] [ENTER OPEN] [ESC / ⌫ BACK] [1-6 DIRECT JUMP]
        </div>
      </div>
    </div>
  );
}