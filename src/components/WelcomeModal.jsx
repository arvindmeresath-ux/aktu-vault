import React, { useState, useEffect } from 'react';
import { soundEngine } from '../features/soundEngine';

export default function WelcomeModal({ activeTheme }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('aktu_welcome_seen');
    if (!hasSeenWelcome) {
      // Slight delay so the app loads smoothly first
      const timer = setTimeout(() => setIsOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    try { soundEngine.playTick(); } catch {}
    localStorage.setItem('aktu_welcome_seen', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  // Win98 retro style if win98 theme is active
  if (activeTheme === 'win98') {
    return (
      <div className="fixed inset-0 z-[99999] bg-black/60 flex items-center justify-center p-4 font-mono select-none">
        <div className="w-full max-w-md bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black p-3 shadow-2xl text-black flex flex-col gap-3">
          <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] text-white px-2 py-1 flex items-center justify-between">
            <span className="font-bold text-xs">WELCOME_TO_AKTUVault.exe</span>
            <button
              type="button"
              onClick={handleClose}
              className="px-1 bg-[#c0c0c0] text-black border border-black text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="bg-white border-2 border-t-black border-l-black border-b-white border-r-white p-4 flex flex-col gap-2.5 text-xs">
            <div className="font-bold text-sm text-[#000080]">🎓 Welcome, AKTU Engineer!</div>
            <p className="text-gray-700 leading-relaxed">
              You are inside <b>AKTUVault</b> — your zero-bloat academic portal for B.Tech Notes, PYQs, and Quantums.
            </p>
            <div className="bg-gray-100 p-2 border border-gray-300 text-[11px] space-y-1">
              <div>💡 <b>Quick Tips:</b></div>
              <div>• Press <code className="bg-white px-1 border border-gray-400">/</code> anywhere for Quick Search.</div>
              <div>• Switch themes anytime from the top menu.</div>
              <div>• Save PDFs for offline reading anytime!</div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-1 bg-[#c0c0c0] text-black border-2 border-t-white border-l-white border-b-black border-r-black text-xs font-bold cursor-pointer hover:bg-white"
            >
              Start Studying →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Modern / Neo-Brutalist Default Style
  return (
    <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-mono select-none animate-fade-in">
      <div className="w-full max-w-md bg-[#0f172a] border-2 border-[#38bdf8] rounded-2xl p-6 shadow-[0_0_40px_rgba(56,189,248,0.25)] text-white flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <div>
              <h2 className="text-base font-bold text-sky-400">Welcome to AKTUVault</h2>
              <p className="text-[11px] text-slate-400">Dr. A.P.J. Abdul Kalam Technical University</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 rounded-lg bg-white/10 text-slate-300 hover:text-white flex items-center justify-center text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
          <p>
            Your ultimate lightning-fast portal for structured B.Tech notes, previous year question papers (PYQs), and Quantums.
          </p>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1.5 text-[11px]">
            <div className="font-bold text-sky-300">⚡ Pro Navigation Tips:</div>
            <div className="text-slate-400">• Press <code className="text-sky-200 bg-black/40 px-1 py-0.5 rounded">/</code> to launch Quick Search.</div>
            <div className="text-slate-400">• Use number keys <code className="text-sky-200 bg-black/40 px-1 py-0.5 rounded">1-6</code> for instant branch selection.</div>
            <div className="text-slate-400">• Click the Theme button to try Retro Win98 or CRT Glow!</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg cursor-pointer transition-all active:scale-[0.98]"
        >
          Let's Explore & Study 🚀
        </button>
      </div>
    </div>
  );
}