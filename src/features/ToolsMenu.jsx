import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Headphones, Search, Star, Download } from 'lucide-react';
import { soundEngine } from './soundEngine';
import { noiseEngine } from './noiseEngine';

export default function ToolsMenu({
  favorites = [],
  onOpenPdf,
  onToggleFavorite,
  buttonClass = '',
  align = 'left'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  const [sfxOn, setSfxOn] = useState(() => {
    try { return soundEngine.isEnabled(); } catch (e) { return true; }
  });

  const [noiseState, setNoiseState] = useState(() => {
    try {
      return { preset: noiseEngine.getPreset(), volume: noiseEngine.getVolume() };
    } catch (e) {
      return { preset: 'off', volume: 0.5 };
    }
  });

  useEffect(() => {
    const onNoiseUpdate = (e) => setNoiseState(e.detail);
    window.addEventListener('aktu_noise_update', onNoiseUpdate);
    return () => window.removeEventListener('aktu_noise_update', onNoiseUpdate);
  }, []);

  const handleToggleSfx = () => {
    try {
      const next = soundEngine.toggle();
      setSfxOn(next);
    } catch (e) {}
  };

  const handleOpenNoise = () => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('aktu_open_noise'));
  };

  const handleOpenSearch = () => {
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('aktu_open_palette'));
  };

  const handleInstallApp = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined' && window.deferredPrompt) {
      window.deferredPrompt.prompt();
    } else {
      window.dispatchEvent(new CustomEvent('aktu_install_app'));
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  let pinnedList = favorites;
  if (!pinnedList || pinnedList.length === 0) {
    try {
      pinnedList = JSON.parse(localStorage.getItem('aktu_vault_pins') || '[]');
    } catch (e) {
      pinnedList = [];
    }
  }

  const defaultBtn = "px-3 py-1 text-xs font-mono font-bold border border-[#223254] bg-[#0c1427] text-zinc-200 hover:border-zinc-400 hover:text-white rounded-lg flex items-center gap-1 cursor-pointer select-none transition-colors";

  return (
    <div className="relative inline-block text-left shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClass || defaultBtn}
        title="Tools Menu"
      >
        <span>Tools ▾</span>
      </button>

      {isOpen && (
        <div 
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-2 w-72 bg-[#0c1427] border border-[#223254] rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.9)] z-[99999] py-2 font-mono text-zinc-100 select-none text-left`}
        >
          {/* SFX Toggle */}
          <button
            type="button"
            onClick={handleToggleSfx}
            className="w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#162340] cursor-pointer border-none bg-transparent text-zinc-200 transition-colors"
          >
            <span className="flex items-center gap-2.5 shrink-0">
              {sfxOn ? <Volume2 size={14} className="text-emerald-400" /> : <VolumeX size={14} className="text-zinc-500" />}
              <span className="whitespace-nowrap">Sound Effects (SFX)</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ml-2 shrink-0 ${
              sfxOn ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}>
              {sfxOn ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Focus Ambience */}
          <button
            type="button"
            onClick={handleOpenNoise}
            className="w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#162340] cursor-pointer border-none bg-transparent text-zinc-200 transition-colors"
          >
            <span className="flex items-center gap-2.5 shrink-0">
              <Headphones size={14} className="text-cyan-400" />
              <span className="whitespace-nowrap">Focus Ambience...</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ml-2 shrink-0 ${
              noiseState && noiseState.preset !== 'off' 
                ? 'bg-amber-950 text-amber-300 border-amber-700 font-bold' 
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}>
              {noiseState && noiseState.preset !== 'off' ? noiseState.preset.toUpperCase() : 'OFF'}
            </span>
          </button>

          {/* Install Vault App */}
          <button
            type="button"
            onClick={handleInstallApp}
            className="w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#162340] cursor-pointer border-none bg-transparent text-zinc-200 transition-colors"
          >
            <span className="flex items-center gap-2.5 shrink-0">
              <Download size={14} className="text-blue-400" />
              <span className="whitespace-nowrap font-bold text-blue-200">Install Vault App</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded border ml-2 shrink-0 bg-blue-950 text-blue-300 border-blue-700">
              INSTALL
            </span>
          </button>

          {/* Search Database */}
          <button
            type="button"
            onClick={handleOpenSearch}
            className="w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-[#162340] cursor-pointer border-none bg-transparent text-zinc-200 transition-colors"
          >
            <span className="flex items-center gap-2.5 shrink-0">
              <Search size={14} className="text-violet-400" />
              <span className="whitespace-nowrap">Search Database...</span>
            </span>
            <span className="text-[10px] text-zinc-400 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700 ml-2 shrink-0">
              Ctrl+K
            </span>
          </button>

          <div className="border-b border-[#1c2a47] my-1.5" />

          {/* Pinned Notes Header */}
          <div className="px-3.5 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Star size={11} className="text-amber-400 fill-amber-400" />
              <span>PINNED NOTES ({pinnedList.length})</span>
            </span>
          </div>

          <div className="max-h-40 overflow-y-auto mt-1">
            {pinnedList.length === 0 ? (
              <div className="px-3.5 py-2 text-[11px] text-zinc-500 italic">
                No pinned notes. (Tap ★ to pin)
              </div>
            ) : (
              pinnedList.map((fav, i) => (
                <div
                  key={i}
                  className="px-3.5 py-1.5 text-xs flex items-center justify-between hover:bg-[#162340] group cursor-pointer transition-colors"
                  onClick={() => {
                    setIsOpen(false);
                    if (onOpenPdf) onOpenPdf(fav);
                  }}
                >
                  <span className="truncate pr-2 text-zinc-300 underline">{fav.title}</span>
                  <button
                    type="button"
                    title="Unpin"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onToggleFavorite) onToggleFavorite(fav);
                    }}
                    className="text-zinc-500 group-hover:text-red-400 p-0.5 border-none bg-transparent cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}