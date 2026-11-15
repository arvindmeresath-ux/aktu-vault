import React, { useState, useEffect, useRef } from 'react';
import { THEMES_REGISTRY } from './themes/themeRegistry';

export const THEMES = THEMES_REGISTRY.map(t => ({ id: t.id, name: `${t.icon} ${t.name}` }));

export default function ViewMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('aktu_theme_id') || 'neo-brutal');
  const [crt, setCrt] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('aktu_theme_id') || 'neo-brutal';
    setActiveTheme(savedTheme);
    document.body.setAttribute('data-theme', savedTheme);

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectTheme = (themeId) => {
    localStorage.setItem('aktu_theme_id', themeId);
    document.body.setAttribute('data-theme', themeId);
    window.dispatchEvent(new CustomEvent('aktu_theme_change', { detail: themeId }));
    setIsOpen(false);
    window.location.reload(); // Clean remount ensuring zero state mismatch
  };

  const toggleCRT = () => {
    const next = !crt;
    setCrt(next);
    localStorage.setItem('aktu_crt', next ? 'true' : 'false');
    document.body.classList.toggle('crt-active', next);
  };

  return (
    <div className="relative inline-block text-left font-mono" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-cyan-400 rounded-lg text-xs font-bold hover:bg-zinc-800 transition-all shadow cursor-pointer flex items-center gap-1.5"
      >
        <span>🖥️ View / Theme</span>
        <span className="text-[10px]">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-2 z-[9999] text-xs">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-800">
            Select Theme Interface
          </div>
          <div className="py-1">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTheme(t.id)}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-zinc-800 transition-colors cursor-pointer ${
                  activeTheme === t.id ? 'text-cyan-400 font-bold bg-cyan-950/40' : 'text-zinc-300'
                }`}
              >
                <span>{t.name}</span>
                {activeTheme === t.id && <span className="text-cyan-400">●</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}