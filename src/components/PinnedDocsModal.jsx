import { pushModalBack, popModalBack } from '../utils/modalHistory';
import React, { useEffect } from 'react';
import { getThemeModalStyle } from '../themes/themeRegistry';

export const PINNED_STORAGE_KEY = 'aktu_pinned_pdfs';

export function loadPinnedDocs() {
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePinnedDocs(list) {
  try {
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('aktu_pinned_update', { detail: list }));
  } catch {}
}

export function togglePinDoc(docItem) {
  if (!docItem || !docItem.url) return [];
  const current = loadPinnedDocs();
  const exists = current.some((d) => d.url === docItem.url);
  const updated = exists
    ? current.filter((d) => d.url !== docItem.url)
    : [
        {
          title: docItem.title || 'Untitled PDF',
          url: docItem.url,
          tag: docItem.tag || 'AKTU PDF',
          pinnedAt: Date.now(),
        },
        ...current,
      ];
  savePinnedDocs(updated);
  return updated;
}

export default function PinnedDocsModal({
  isOpen,
  onClose,
  pinnedDocs,
  onOpenPdf,
  onRemovePin,
  onClearAll,
  activeTheme = 'neo-brutal',
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    pushModalBack('pinned-docs', () => onClose());
    return () => popModalBack('pinned-docs', true);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const baseSt = getThemeModalStyle(activeTheme);
  const st =
    activeTheme === 'win98-hc' || activeTheme === 'win98'
      ? {
          windowBg:
            'bg-[#c0c0c0] text-black border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl rounded-none font-mono',
          headerBg:
            'bg-gradient-to-r from-[#000080] to-[#1084d0] text-white border-b border-black',
          bodyBg: 'bg-[#c0c0c0] text-black',
          cardBg:
            'bg-white text-black border-2 border-t-black border-l-black border-b-white border-r-white rounded-none',
          cardHover: 'hover:bg-[#e8eef7]',
          subText: 'text-zinc-700',
          badgeBg:
            'bg-[#000080] text-[#ffff00] border border-black rounded-none',
          secondaryBtn:
            'bg-[#c0c0c0] text-black border-2 border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black active:border-b-white active:border-r-white rounded-none',
          dangerBtn:
            'bg-[#c0c0c0] text-black border-2 border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black active:border-b-white active:border-r-white rounded-none',
          primaryBtn:
            'bg-[#c0c0c0] text-black border-2 border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black active:border-b-white active:border-r-white rounded-none font-bold',
          footerBg:
            'bg-[#c0c0c0] text-black border-t border-zinc-500',
        }
      : activeTheme === 'modern-dark'
        ? {
            windowBg:
              'bg-[#0b1220] text-slate-100 border border-[#eab30855] rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.16)] font-sans',
            headerBg:
              'bg-[#0f1c2e] text-[#facc15] border-b border-white/10',
            bodyBg: 'bg-[#0b1220] text-slate-100',
            cardBg:
              'bg-[#111b2e] text-slate-100 border border-white/10 rounded-xl',
            cardHover: 'hover:bg-[#16243d] hover:border-[#facc1566]',
            subText: 'text-slate-400',
            badgeBg:
              'bg-[#241f0f] text-[#facc15] border border-[#eab30855] rounded-lg',
            secondaryBtn:
              'bg-[#0f1c2e] hover:bg-[#162944] text-[#38bdf8] border border-[#38bdf855] rounded-xl transition-colors',
            dangerBtn:
              'bg-[#28131a] hover:bg-[#3f1924] text-[#fda4af] border border-[#f43f5e44] rounded-xl transition-colors',
            primaryBtn:
              'bg-[#eab308] hover:bg-[#facc15] text-[#0b1220] rounded-xl shadow-[0_0_16px_rgba(234,179,8,0.35)] transition-all',
            footerBg:
              'bg-[#0f1c2e] text-slate-300 border-t border-white/10',
          }
        : baseSt;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[130] bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[470px] overflow-hidden flex flex-col max-h-[85vh] ${st.windowBg}`}
      >
        {/* THEME-AWARE HEADER */}
        <div className={`px-4 py-2.5 flex items-center justify-between ${st.headerBg}`}>
          <div className="flex items-center gap-2">
            <span>📌</span>
            <span className="font-black text-xs sm:text-sm uppercase tracking-wide">
              Pinned Study Docs ({pinnedDocs.length})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`font-black text-xs px-2.5 py-1 cursor-pointer ${st.dangerBtn}`}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* THEME-AWARE LIST BODY */}
        <div className={`p-3.5 overflow-y-auto flex-1 flex flex-col gap-2.5 ${st.bodyBg}`}>
          {pinnedDocs.length === 0 ? (
            <div className={`p-5 text-center ${st.cardBg}`}>
              <div className="text-2xl mb-1.5">📌</div>
              <div className="font-black text-sm">No Pinned PDFs Yet</div>
              <p className={`text-xs font-semibold mt-1.5 leading-relaxed ${st.subText}`}>
                Open any Notes, Quantum, or PYQ PDF and click <strong>📌 PIN</strong> to save it here for instant exam revision.
              </p>
            </div>
          ) : (
            pinnedDocs.map((doc) => (
              <div
                key={doc.url}
                className={`p-3 flex items-center justify-between gap-2.5 transition-colors ${st.cardBg} ${st.cardHover}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPdf(doc);
                  }}
                  className="flex-1 text-left cursor-pointer min-w-0"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 ${st.badgeBg}`}>
                      {doc.tag || 'PDF'}
                    </span>
                  </div>
                  <div className="font-black text-xs sm:text-sm truncate">
                    {doc.title}
                  </div>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPdf(doc);
                    }}
                    className={`px-2.5 py-1.5 font-black text-[11px] cursor-pointer ${st.secondaryBtn}`}
                  >
                    OPEN →
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemovePin(doc.url)}
                    className={`px-2 py-1.5 font-black text-[11px] cursor-pointer ${st.dangerBtn}`}
                    title="Unpin PDF"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* THEME-AWARE FOOTER */}
        <div className={`px-4 py-2.5 flex items-center justify-between ${st.footerBg}`}>
          <span className="text-[11px] font-bold">
            {pinnedDocs.length} pinned item(s)
          </span>
          <div className="flex items-center gap-2">
            {pinnedDocs.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className={`px-2.5 py-1 text-xs font-black cursor-pointer ${st.dangerBtn}`}
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-1 text-xs font-black cursor-pointer ${st.primaryBtn}`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}