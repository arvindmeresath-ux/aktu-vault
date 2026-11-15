import React, { useState, useEffect, useRef } from 'react';

export default function NeoBrutalEngine({
  vaultData,
  onOpenPdf,
  onSelectTheme,
  themesList = [],
  activeTheme = 'neo-brutal'
}) {
  const [data, setData] = useState(vaultData || null);
  const [navPath, setNavPath] = useState({ dept: null, year: null, subject: null });
  const [activeTab, setActiveTab] = useState('notes'); // 'notes' | 'pyq' | 'quantum'
  const [searchQuery, setSearchQuery] = useState('');

  const searchInputRef = useRef(null);

  // Auto-fetch vault_data.json if not passed from parent App.jsx
  useEffect(() => {
    fetch('/vault_data.json?v=' + Date.now())
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error('Error loading vault data:', err));
  }, []);

  // Update data if prop changes
  useEffect(() => {
    if (vaultData) setData(vaultData);
  }, [vaultData]);

  const isRoot = !navPath.dept;
  const isYearSelect = navPath.dept && !navPath.year;
  const isSubjectSelect = navPath.dept && navPath.year && !navPath.subject;
  const isFileSelect = navPath.dept && navPath.year && navPath.subject;

  // Case-insensitive department resolution
  const deptKey = (navPath.dept || '').toLowerCase();
  const currentDeptObj = data?.[deptKey];
  const currentYearObj = currentDeptObj?.years?.[navPath.year];
  const allSubjects = currentYearObj?.subjects ? Object.values(currentYearObj.subjects) : [];

  const filteredSubjects = allSubjects.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSubjectObj = currentYearObj?.subjects?.[navPath.subject];
  const rawFiles = currentSubjectObj?.files || [];

  // Tab Filtering (Notes vs PYQs vs Quantum)
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

  const handleGoBack = () => {
    if (navPath.subject) setNavPath({ ...navPath, subject: null });
    else if (navPath.year) setNavPath({ ...navPath, year: null });
    else if (navPath.dept) setNavPath({ dept: null, year: null, subject: null });
  };

  // Keyboard navigation: Esc to Back, 1-4 Direct Jump
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (searchQuery) setSearchQuery('');
        else handleGoBack();
        return;
      }
      if (isSubjectSelect && e.key === '/') {
        if (searchInputRef.current) {
          e.preventDefault();
          searchInputRef.current.focus();
        }
      }
      if (isFileSelect) {
        if (e.key === '1') setActiveTab('notes');
        if (e.key === '2') setActiveTab('pyq');
        if (e.key === '3') setActiveTab('quantum');
      }
      if (isYearSelect) {
        if (e.key === '1') setNavPath({ ...navPath, year: '1ST_YEAR' });
        if (e.key === '2') setNavPath({ ...navPath, year: '2ND_YEAR' });
        if (e.key === '3') setNavPath({ ...navPath, year: '3RD_YEAR' });
        if (e.key === '4') setNavPath({ ...navPath, year: '4TH_YEAR' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navPath, searchQuery, isFileSelect, isYearSelect, isSubjectSelect]);

  const yearCards = [
    { num: '01', id: '1ST_YEAR', title: '[1] 1st Year', sub: 'Common to all (Sem 1 & 2)' },
    { num: '02', id: '2ND_YEAR', title: '[2] 2nd Year', sub: 'Core Departmental (Sem 3 & 4)' },
    { num: '03', id: '3RD_YEAR', title: '[3] 3rd Year', sub: 'Advanced Electives & Labs (Sem 5 & 6)' },
    { num: '04', id: '4TH_YEAR', title: '[4] 4th Year', sub: 'Specializations & Projects (Sem 7 & 8)' },
  ];

  const branches = [
    { code: 'cse', num: '01', name: '[1] CSE', desc: 'Computer Science & Engineering', count: data?.cse?.countText || 'empty' },
    { code: 'ece', num: '02', name: '[2] ECE', desc: 'Electronics & Communication', count: data?.ece?.countText || 'empty' },
    { code: 'ee',  num: '03', name: '[3] EE',  desc: 'Electrical Engineering', count: data?.ee?.countText || 'empty' },
    { code: 'me',  num: '04', name: '[4] ME',  desc: 'Mechanical Engineering', count: data?.me?.countText || 'empty' },
    { code: 'ce',  num: '05', name: '[5] CE',  desc: 'Civil Engineering', count: data?.ce?.countText || 'empty' },
    { code: 'it',  num: '06', name: '[6] IT',  desc: 'Information Technology', count: data?.it?.countText || 'empty' }
  ];

  return (
    <div className="min-h-screen w-full bg-[#f0f2f5] p-3 sm:p-6 flex items-center justify-center font-sans">
      {/* Outer Neo-Brutal Frame */}
      <div className="w-full max-w-[580px] bg-white border-[3px] border-black rounded-[28px] p-4 sm:p-5 shadow-[8px_8px_0px_#000000] flex flex-col min-h-[560px] justify-between">
        
        <div>
          {/* HEADER ROW: BACK (Esc) + Breadcrumb */}
          <div className="bg-[#fff275] border-[3px] border-black rounded-2xl p-2.5 flex items-center justify-between mb-4 shadow-[3px_3px_0px_#000]">
            <button
              type="button"
              onClick={handleGoBack}
              className="bg-[#ff6584] hover:bg-[#ff4f72] active:translate-x-[1px] active:translate-y-[1px] text-black font-extrabold text-xs sm:text-sm px-4 py-1.5 border-[2px] border-black rounded-xl cursor-pointer shadow-[2px_2px_0px_#000]"
            >
              ← BACK (Esc)
            </button>
            <div className="font-extrabold text-sm sm:text-base text-black tracking-wide pr-2 truncate">
              {isRoot && 'AKTU ARCHIVE'}
              {isYearSelect && `${navPath.dept?.toUpperCase()}`}
              {isSubjectSelect && `${navPath.dept?.toUpperCase()} > ${navPath.year?.replace('_YEAR', ' YR')}`}
              {isFileSelect && `${navPath.dept?.toUpperCase()} > ${navPath.subject?.slice(0, 14)}...`}
            </div>
          </div>

          {/* VIEW 1: HOME PAGE (BRANCH SELECTION) */}
          {isRoot && (
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              {branches.map((b) => (
                <div
                  key={b.code}
                  onClick={() => setNavPath({ dept: b.code, year: null, subject: null })}
                  className="bg-[#ffd29d] hover:bg-[#ffc680] active:translate-x-[2px] active:translate-y-[2px] border-[3px] border-black rounded-2xl p-3.5 cursor-pointer shadow-[4px_4px_0px_#000] flex flex-col items-center text-center justify-center min-h-[140px] select-none"
                >
                  <div className="text-2xl font-black text-black leading-none">{b.num}</div>
                  <div className="text-base font-extrabold text-black mt-2 leading-tight">{b.name}</div>
                  <div className="text-[11px] font-semibold text-zinc-700 mt-1 leading-snug">{b.desc}</div>
                  <div className="text-[10px] font-black text-black bg-white border border-black rounded-full px-2 py-0.5 mt-2 shadow-[1px_1px_0px_#000]">
                    {b.count}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* VIEW 2: 2x2 YEAR CARDS (Exact match for image_b4b2d9.png) */}
          {isYearSelect && (
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              {yearCards.map((y) => {
                const yearFilesCount = currentDeptObj?.years?.[y.id]?.totalFiles || 0;
                return (
                  <div
                    key={y.id}
                    onClick={() => setNavPath({ ...navPath, year: y.id })}
                    className="bg-[#ffd29d] hover:bg-[#ffc680] active:translate-x-[2px] active:translate-y-[2px] border-[3px] border-black rounded-2xl p-3.5 cursor-pointer shadow-[4px_4px_0px_#000] flex flex-col items-center text-center justify-center min-h-[140px] select-none"
                  >
                    <div className="text-2xl font-black text-black leading-none">{y.num}</div>
                    <div className="text-base font-extrabold text-black mt-2 leading-tight">{y.title}</div>
                    <div className="text-[11px] font-semibold text-zinc-700 mt-1 leading-snug">{y.sub}</div>
                    <div className="text-[10px] font-black text-black bg-white border border-black rounded-full px-2 py-0.5 mt-2 shadow-[1px_1px_0px_#000]">
                      {yearFilesCount} DOCS
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 3: SUBJECTS LIST (Exact match for image_b4b1fc.png) */}
          {isSubjectSelect && (
            <div>
              {/* Search Bar */}
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

              {/* Sky Blue Subject Items */}
              <div className="flex flex-col gap-2.5 max-h-[340px] overflow-y-auto pr-1">
                {filteredSubjects.length === 0 ? (
                  <div className="text-center font-bold text-xs text-zinc-500 py-8">
                    No subjects found in this year.
                  </div>
                ) : (
                  filteredSubjects.map((s) => (
                    <div
                      key={s.name}
                      onClick={() => setNavPath({ ...navPath, subject: s.name })}
                      className="bg-[#bbf2f6] hover:bg-[#a6ecf1] active:translate-x-[1px] active:translate-y-[1px] border-[2.5px] border-black rounded-2xl p-2.5 sm:p-3 flex items-center justify-between cursor-pointer shadow-[3px_3px_0px_#000] select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="text-lg">📚</span>
                        <span className="font-extrabold text-xs sm:text-sm text-black truncate">{s.name}</span>
                      </div>
                      <div className="bg-white border-[2px] border-black rounded-lg px-2.5 py-1 text-xs font-black text-black shrink-0 shadow-[1px_1px_0px_#000]">
                        {s.files.length} Files →
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* VIEW 4: FILES VIEW (Exact match for image_b4af18.png) */}
          {isFileSelect && (
            <div>
              {/* Category Tabs: [1] Notes, [2] PYQs, [3] Quantum */}
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

              {/* Mint Green File Cards with Pink READ PDF Button */}
              <div className="flex flex-col gap-2.5 max-h-[330px] overflow-y-auto pr-1">
                {currentTabFiles.length === 0 ? (
                  <div className="text-center font-bold text-xs text-zinc-500 py-8">
                    No files available in this section.
                  </div>
                ) : (
                  currentTabFiles.map((f, idx) => (
                    <div
                      key={idx}
                      className="bg-[#dcfce7] border-[2.5px] border-black rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-[3px_3px_0px_#000]"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-extrabold text-xs sm:text-sm text-black truncate">{f.title}</div>
                        <div className="text-[10px] font-black text-zinc-600 tracking-wider uppercase mt-0.5">
                          {f.category}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { if (onOpenPdf) onOpenPdf(f); }}
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

        {/* BOTTOM NAVIGATION HINTS */}
        <div className="pt-3 border-t-[2px] border-black mt-3 flex items-center justify-center text-[10px] sm:text-[11px] font-extrabold text-zinc-700 tracking-tight select-none">
          ⌨ [↑↓ NAVIGATE] [ENTER OPEN] [ESC BACK] [1-4 DIRECT JUMP]
        </div>

      </div>
    </div>
  );
}