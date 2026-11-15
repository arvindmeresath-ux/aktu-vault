import React, { useState, useEffect, useRef } from 'react';
import { Star, FileText } from 'lucide-react';

export default function FavoritesMenu({ favorites = [], onOpenPdf, onToggleFavorite, isRetro = false, align = "left" }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('touchstart', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const count = favorites.length;

  return (
    <div ref={menuRef} className="relative inline-block text-left" style={{ position: 'relative', display: 'inline-block' }}>
      {/* TRIGGER BUTTON */}
      {isRetro ? (
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="cursor-pointer hover:bg-[#000080] hover:text-white px-1 py-0.5 text-xs font-mono flex items-center gap-1 select-none border-none bg-transparent text-inherit"
        >
          Favorites{count > 0 ? ` (${count})` : ''} ▾
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="px-2 py-0.5 text-xs font-mono font-bold border border-amber-400/60 bg-black text-amber-300 hover:bg-amber-950/60 rounded flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
        >
          <Star size={11} className={count > 0 ? "fill-amber-400 text-amber-400" : "text-amber-400"} />
          <span>PINNED {count > 0 ? `(${count})` : ''} ▾</span>
        </button>
      )}

      {/* FLOATING DROPDOWN MENU */}
      {isOpen && (
        <div
          className="w-72 bg-[#070d17] border-2 border-amber-400/80 rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.95)] p-2 text-xs flex flex-col gap-1 outline-none font-mono"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: align === 'right' ? 'auto' : '0px',
            right: align === 'right' ? '0px' : 'auto',
            zIndex: 99999,
            maxWidth: 'calc(100vw - 24px)',
          }}
        >
          <div className="px-2 py-1 text-[10px] font-bold text-amber-300 uppercase tracking-widest border-b border-gray-800 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Star size={11} className="fill-amber-400" />
              <span>Quick Desk / Pinned ({count})</span>
            </span>
            <span className="text-[9px] text-gray-500 font-mono">1-Click Open</span>
          </div>

          <div className="flex flex-col gap-1 mt-1 max-h-60 overflow-y-auto">
            {count === 0 ? (
              <div className="p-3 text-center text-gray-400 text-[11px] leading-relaxed">
                No pinned files yet.<br />
                <span className="text-[10px] text-gray-500">Click the ⭐ star on any notes/PYQ to pin it here.</span>
              </div>
            ) : (
              favorites.map((fav, i) => (
                <div
                  key={i}
                  className="p-1.5 rounded-lg bg-[#0a1322] hover:bg-[#102038] text-gray-200 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                  onClick={() => {
                    onOpenPdf(fav);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-1.5 truncate flex-1">
                    <FileText size={14} className="text-amber-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-xs truncate font-bold group-hover:text-amber-300">{fav.title}</p>
                      <p className="text-[9px] text-gray-400 truncate">{fav.branch} • {fav.subject}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Remove from Pins"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(fav);
                    }}
                    className="p-1 text-gray-400 hover:text-red-400 shrink-0 cursor-pointer"
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