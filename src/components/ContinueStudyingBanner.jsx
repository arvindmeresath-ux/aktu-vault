import React, { useState, useEffect } from 'react';
import { getLastReadSession, clearLastReadSession } from '../features/readingProgress';
import { soundEngine } from '../features/soundEngine';

export default function ContinueStudyingBanner({ activeTheme, onOpenPdf, isHidden }) {
  const [session, setSession] = useState(() => getLastReadSession());

  useEffect(() => {
    const syncSession = () => setSession(getLastReadSession());
    window.addEventListener('aktu_reading_progress_updated', syncSession);
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener('aktu_reading_progress_updated', syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  if (isHidden || !session) return null;

  const isNeo = activeTheme === 'neo-brutal';
  const pageLabel = session.numPages
    ? `PAGE ${session.page} / ${session.numPages}`
    : `PAGE ${session.page}`;

  const handleResume = () => {
    soundEngine.playFlip();
    onOpenPdf({
      title: session.title,
      subject: session.subject,
      url: session.url,
      link: session.url,
      resumePage: session.page,
    });
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    soundEngine.playTick();
    clearLastReadSession();
    setSession(null);
  };

  if (isNeo) {
    return (
      <div className="fixed bottom-16 sm:bottom-5 left-1/2 -translate-x-1/2 z-[900] w-[94vw] max-w-xl select-none">
        <div className="bg-[#fef08a] border-[3px] border-black rounded-2xl px-3.5 py-2.5 shadow-[5px_5px_0px_#000] flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="bg-[#fb7185] border border-black rounded px-1.5 py-0.2 font-mono text-[9px] font-black !text-black uppercase">
                CONTINUE STUDYING
              </span>
              <span className="bg-white border border-black rounded px-1.5 py-0.2 font-mono text-[9px] font-black !text-black">
                {pageLabel}
              </span>
            </div>
            <p className="font-mono text-xs font-black !text-black truncate">
              {session.title}
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleResume}
              className="bg-[#67e8f9] hover:bg-[#22d3ee] !text-black font-mono font-black text-[11px] px-3 py-1.5 rounded-xl border-[2px] border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
            >
              RESUME →
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              title="Dismiss"
              className="bg-white hover:bg-zinc-200 !text-black font-mono font-black text-xs w-7 h-7 rounded-xl border-[2px] border-black flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-11 left-1/2 -translate-x-1/2 z-[900] w-[94vw] max-w-lg select-none font-mono">
      <div className="bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black p-1.5 shadow-xl flex items-center justify-between gap-2 text-black">
        <div className="flex items-center gap-2 min-w-0 flex-1 px-1">
          <span className="bg-[#000080] text-white text-[10px] font-bold px-1.5 py-0.5 shrink-0">
            RESUME
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold truncate text-black">{session.title}</p>
            <p className="text-[10px] text-zinc-700">{pageLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleResume}
            className="bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black active:border-b-white active:border-r-white px-2.5 py-1 text-[11px] font-bold text-black cursor-pointer"
          >
            Open Page {session.page}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            title="Dismiss"
            className="bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black px-2 py-1 text-[11px] font-bold text-black cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}