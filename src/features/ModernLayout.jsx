import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Headphones, Search, Star, Download, Laptop } from 'lucide-react';
import { soundEngine } from './soundEngine';
import { noiseEngine } from './noiseEngine';
import NeoBrutalEngine from '../themes/NeoBrutal/NeoBrutalEngine';

const ALL_THEMES = [
  { id: 'win98-hc', name: 'Windows 98 (Default)', tag: 'Classic Retro' },
  { id: 'neo-brutal', name: 'Neo-Brutalism', tag: 'Bold & High Contrast' },
  { id: 'dark-academia', name: 'Dark Academia', tag: 'Serif & Parchment' },
  { id: 'modern-dark', name: 'Modern Dark UI', tag: 'Minimal OLED' },
  { id: 'cyberpunk', name: 'Cyberpunk 2077', tag: 'Neon & Scanlines' },
  { id: 'blueprint', name: 'Architectural Blueprint', tag: 'Engineering Grid' },
  { id: 'crt-glow', name: 'Vintage CRT Monitor', tag: 'Phosphor Green' },
];

/* 1. WINDOWS 98 RETRO ENGINE */
function Win98Engine({ onSelectDept, onSelectTheme, activeTheme }) {
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const themeRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (themeRef.current && !themeRef.current.contains(e.target)) setIsThemeOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const depts = [
    { code: 'cse', name: 'Computer Science', docs: 401, num: '1' },
    { code: 'ece', name: 'Electronics & Comm.', docs: 58, num: '2' },
    { code: 'ee', name: 'Electrical Engg.', docs: 0, num: '3' },
    { code: 'me', name: 'Mechanical Engg.', docs: 0, num: '4' },
    { code: 'ce', name: 'Civil Engineering', docs: 0, num: '5' },
    { code: 'it', name: 'Information Tech.', docs: 0, num: '6' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#008080] flex flex-col items-center justify-center p-3 select-none font-sans relative pb-12">
      <div className="w-full max-w-[550px] bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-black border-b-black shadow-[4px_4px_0px_rgba(0,0,0,0.5)] p-1 flex flex-col">
        <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] px-2 py-1 flex items-center justify-between text-white font-bold text-xs">
          <div className="flex items-center gap-1.5">
            <span>💻</span>
            <span>AKTU Vault Explorer - [B.Tech Curriculum]</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="w-4 h-4 bg-[#c0c0c0] text-black border border-t-white border-l-white border-r-black border-b-black text-[10px] font-bold">_</button>
            <button className="w-4 h-4 bg-[#c0c0c0] text-black border border-t-white border-l-white border-r-black border-b-black text-[10px] font-bold">□</button>
            <button className="w-4 h-4 bg-[#c0c0c0] text-black border border-t-white border-l-white border-r-black border-b-black text-[10px] font-bold">✕</button>
          </div>
        </div>

        <div className="flex items-center gap-3 px-2 py-1 text-xs text-black border-b border-[#808080] relative bg-[#c0c0c0]">
          <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1">File</span>
          <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1">Edit</span>
          
          <div className="relative inline-block" ref={themeRef}>
            <span onClick={() => setIsThemeOpen(!isThemeOpen)} className="cursor-pointer hover:bg-[#000080] hover:text-white px-1 font-bold flex items-center gap-0.5">
              Theme ▾
            </span>
            {isThemeOpen && (
              <div className="absolute left-0 top-full mt-0.5 w-60 bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-black border-b-black shadow-[3px_3px_0px_#000] z-[99999] py-1 text-black">
                <div className="px-2 py-0.5 text-[10px] font-bold uppercase text-zinc-700 border-b border-[#808080]">Select UI Theme:</div>
                {ALL_THEMES.map((th) => (
                  <button
                    key={th.id}
                    onClick={() => { onSelectTheme(th.id); setIsThemeOpen(false); }}
                    className={`w-full text-left px-2 py-1 text-xs flex items-center justify-between cursor-pointer border-none ${
                      activeTheme === th.id ? 'bg-[#000080] text-white font-bold' : 'hover:bg-[#000080] hover:text-white text-black'
                    }`}
                  >
                    <span>{th.name}</span>
                    {activeTheme === th.id && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="cursor-pointer hover:bg-[#000080] hover:text-white px-1">Help</span>
        </div>

        <div className="flex items-center gap-1 px-1 py-1 text-xs text-black border-b border-[#808080]">
          <span className="text-[11px] text-zinc-700">Address:</span>
          <div className="flex-1 bg-white border border-t-[#808080] border-l-[#808080] border-r-white border-b-white px-1 py-0.5 font-mono text-[11px]">
            C:\AKTU-Vault\Departments\
          </div>
        </div>

        <div className="bg-white border-2 border-t-[#808080] border-l-[#808080] border-r-white border-b-white p-3 min-h-[280px]">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {depts.map((d) => (
              <div
                key={d.code}
                onClick={() => onSelectDept && onSelectDept(d.code)}
                className="flex flex-col items-center justify-center p-2 rounded cursor-pointer hover:bg-[#000080] hover:text-white group border border-transparent hover:border-dotted hover:border-yellow-200 transition-colors text-center"
              >
                <span className="text-3xl select-none leading-none mb-1">📁</span>
                <span className="font-bold text-xs leading-tight text-black group-hover:text-white">[{d.num}] {d.code.toUpperCase()}</span>
                <span className="text-[10px] text-zinc-600 group-hover:text-zinc-200 mt-0.5">{d.docs} Document(s)</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-black px-1 pt-1 gap-1">
          <div className="flex-1 border border-t-[#808080] border-l-[#808080] border-r-white border-b-white px-1.5 py-0.5">6 object(s)</div>
          <div className="border border-t-[#808080] border-l-[#808080] border-r-white border-b-white px-2 py-0.5 shrink-0">459 Total Docs</div>
          <div className="border border-t-[#808080] border-l-[#808080] border-r-white border-b-white px-2 py-0.5 shrink-0 flex items-center gap-1">
            <span>🖥️</span>
            <span>Local intranet</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-8 bg-[#c0c0c0] border-t-2 border-t-white border-b border-b-black flex items-center justify-between px-1 z-50">
        <button
          onClick={() => setIsThemeOpen(!isThemeOpen)}
          className="h-6 bg-[#c0c0c0] border-2 border-t-white border-l-white border-r-black border-b-black px-2 flex items-center gap-1 font-bold text-xs text-black"
        >
          <span>🪟</span>
          <span>Start</span>
        </button>
        <div className="border border-t-[#808080] border-l-[#808080] border-r-white border-b-white px-2 py-0.5 text-xs text-black font-mono">
          12:00 PM
        </div>
      </div>
    </div>
  );
}

/* 2. MODERN DARK OLED ENGINE */
function ModernDarkEngine({ onSelectDept, onSelectTheme, activeTheme }) {
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const themeRef = useRef(null);

  const depts = [
    { code: 'cse', name: 'Computer Science', docs: '401 Docs' },
    { code: 'ece', name: 'Electronics & Comm.', docs: '58 Docs' },
    { code: 'ee', name: 'Electrical Engg.', docs: '0 Docs' },
    { code: 'me', name: 'Mechanical Engg.', docs: '0 Docs' },
    { code: 'ce', name: 'Civil Engineering', docs: '0 Docs' },
    { code: 'it', name: 'Information Tech.', docs: '0 Docs' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#050811] text-white flex flex-col items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-[550px] flex items-center justify-between mb-4">
        <div className="text-xs font-mono font-bold text-sky-400 bg-sky-950/60 border border-sky-800/80 px-3 py-1.5 rounded-lg">
          AKTU-VAULT // OLED
        </div>
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            className="text-xs font-mono font-bold bg-[#111927] border border-[#1e293b] text-sky-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:border-sky-500 transition-colors"
          >
            <span>[ THEME ]</span>
            <span>▾</span>
          </button>
          {isThemeOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#0d1522] border border-[#1e293b] rounded-xl shadow-2xl p-1 z-[99999]">
              {ALL_THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => { onSelectTheme(th.id); setIsThemeOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between ${
                    activeTheme === th.id ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-zinc-300 hover:bg-[#152033]'
                  }`}
                >
                  <span>{th.name}</span>
                  {activeTheme === th.id && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-[550px] bg-[#090e1a] border border-[#1c2a47] rounded-2xl p-5 shadow-2xl">
        <h2 className="text-base font-bold text-white mb-1">Select Department</h2>
        <p className="text-xs text-zinc-400 mb-4">Verified syllabi, quantums & lecture notes.</p>
        <div className="grid grid-cols-2 gap-3">
          {depts.map((d, i) => (
            <div
              key={d.code}
              onClick={() => onSelectDept && onSelectDept(d.code)}
              className={`p-3.5 rounded-xl border border-[#1a2942] bg-[#0c1424] hover:border-sky-500/60 cursor-pointer transition-all ${
                i === 0 ? 'col-span-2 bg-gradient-to-r from-sky-950/40 to-[#0c1424] border-sky-500/40' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm text-sky-200">[{i + 1}] {d.code.toUpperCase()}</span>
                <span className="text-[10px] bg-[#111f38] text-sky-300 px-2 py-0.5 rounded-md font-mono">{d.docs}</span>
              </div>
              <p className="text-xs text-zinc-400">{d.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* 3. DARK ACADEMIA ENGINE */
function DarkAcademiaEngine({ onSelectDept, onSelectTheme, activeTheme }) {
  const depts = ['CSE', 'ECE', 'EE', 'ME', 'CE', 'IT'];
  return (
    <div className="min-h-screen w-full bg-[#1c140d] text-[#e8dac1] flex flex-col items-center justify-center p-4 font-serif select-none">
      <div className="w-full max-w-[550px] bg-[#2a1f16] border-2 border-[#5c4028] rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#5c4028] pb-3 mb-4">
          <h2 className="text-lg font-bold italic tracking-wide">AKTU Vault Archive</h2>
          <button onClick={() => onSelectTheme('neo-brutal')} className="text-xs bg-[#4a3420] px-3 py-1 rounded text-[#f4ebd0]">
            Change Theme
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {depts.map((d) => (
            <div key={d} onClick={() => onSelectDept && onSelectDept(d.toLowerCase())} className="bg-[#f4ebd0] text-[#1c140d] p-3 rounded-xl border border-[#3d2b1a] cursor-pointer hover:bg-[#ede0be] transition-colors">
              <span className="font-bold">{d}</span>
              <p className="text-xs text-[#5c4028] italic">Manuscripts & Syllabus</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* 4. CYBERPUNK ENGINE */
function CyberpunkEngine({ onSelectDept, onSelectTheme, activeTheme }) {
  const depts = ['CSE', 'ECE', 'EE', 'ME', 'CE', 'IT'];
  return (
    <div className="min-h-screen w-full bg-black text-yellow-300 flex flex-col items-center justify-center p-4 font-mono select-none">
      <div className="w-full max-w-[550px] border-2 border-yellow-400 bg-zinc-950 p-6 shadow-[0_0_20px_rgba(250,204,21,0.3)]">
        <div className="flex items-center justify-between border-b border-yellow-400 pb-2 mb-4">
          <span className="text-sm font-black tracking-widest">// SYSTEM OVERRIDE: AKTU</span>
          <button onClick={() => onSelectTheme('neo-brutal')} className="bg-yellow-400 text-black px-2 py-0.5 text-xs font-black">
            SWITCH THEME
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {depts.map((d) => (
            <div key={d} onClick={() => onSelectDept && onSelectDept(d.toLowerCase())} className="border border-yellow-400/40 p-3 hover:border-cyan-400 cursor-pointer">
              <span className="font-black text-yellow-300">{d}</span>
              <p className="text-[10px] text-zinc-400">STATUS: ACCESSIBLE</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* 5. BLUEPRINT ENGINE */
function BlueprintEngine({ onSelectDept, onSelectTheme, activeTheme }) {
  const depts = ['CSE', 'ECE', 'EE', 'ME', 'CE', 'IT'];
  return (
    <div className="min-h-screen w-full bg-[#0b2545] text-white flex flex-col items-center justify-center p-4 font-mono select-none">
      <div className="w-full max-w-[550px] border-2 border-white/60 bg-blue-900/40 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/40 pb-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-widest">Blueprint Schematics</span>
          <button onClick={() => onSelectTheme('neo-brutal')} className="border border-white/60 px-2 py-0.5 text-xs font-bold">
            THEME
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {depts.map((d) => (
            <div key={d} onClick={() => onSelectDept && onSelectDept(d.toLowerCase())} className="border border-white/30 p-3 hover:bg-blue-800/40 cursor-pointer">
              <span className="font-bold">{d}</span>
              <p className="text-[10px] text-blue-200">Engineering Module</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* 6. CRT GLOW ENGINE */
function CrtGlowEngine({ onSelectDept, onSelectTheme, activeTheme }) {
  const depts = ['CSE', 'ECE', 'EE', 'ME', 'CE', 'IT'];
  return (
    <div className="min-h-screen w-full bg-[#020b05] text-[#33ff33] flex flex-col items-center justify-center p-4 font-mono select-none">
      <div className="w-full max-w-[550px] border border-[#33ff33]/40 bg-[#06200c]/60 p-6 shadow-[0_0_25px_rgba(51,255,51,0.2)]">
        <div className="flex items-center justify-between border-b border-[#33ff33]/30 pb-2 mb-4">
          <span className="text-xs font-bold tracking-widest">&gt; TERMINAL_ACTIVE</span>
          <button onClick={() => onSelectTheme('neo-brutal')} className="border border-[#33ff33] px-2 py-0.5 text-xs text-[#33ff33]">
            [THEME]
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {depts.map((d) => (
            <div key={d} onClick={() => onSelectDept && onSelectDept(d.toLowerCase())} className="border border-[#33ff33]/30 p-2.5 hover:bg-[#0d3b17] cursor-pointer">
              <span className="font-bold">&gt; {d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* MASTER ROUTER COMPONENT */
export default function ModernLayout({
  activeTheme = 'neo-brutal',
  favorites = [],
  onOpenPdf,
  onToggleFavorite,
  onSelectDept,
  activeDept,
  onBack,
  sfxEnabled,
  onToggleSfx,
  noiseState,
  onOpenNoise,
  onOpenPalette,
  canInstall,
  onInstallApp,
  onSelectTheme,
  onThemeChange
}) {
  const handleThemeChange = (th) => {
    try {
      localStorage.setItem('aktu_theme_id', th);
      document.body.setAttribute('data-theme', th);
      document.documentElement.setAttribute('data-theme', th);
    } catch(e) {}
    if (typeof onSelectTheme === 'function') onSelectTheme(th);
    if (typeof onThemeChange === 'function') onThemeChange(th);
    window.dispatchEvent(new CustomEvent('aktu_theme_change', { detail: th }));
  };

  const commonProps = {
    favorites,
    onOpenPdf,
    onToggleFavorite,
    onSelectDept,
    activeDept,
    onBack,
    sfxEnabled,
    onToggleSfx,
    noiseState,
    onOpenNoise,
    onOpenPalette,
    canInstall,
    onInstallApp,
    activeTheme,
    onSelectTheme: handleThemeChange,
    onThemeChange: handleThemeChange
  };

  switch (activeTheme) {
    case 'win98-hc':
    case 'win98':
      return <Win98Engine {...commonProps} />;
    case 'dark-academia':
      return <DarkAcademiaEngine {...commonProps} />;
    case 'cyberpunk':
      return <CyberpunkEngine {...commonProps} />;
    case 'blueprint':
      return <BlueprintEngine {...commonProps} />;
    case 'crt-glow':
      return <CrtGlowEngine {...commonProps} />;
    case 'modern-dark':
      return <ModernDarkEngine {...commonProps} />;
    case 'neo-brutal':
    default:
      return <NeoBrutalEngine {...commonProps} />;
  }
}