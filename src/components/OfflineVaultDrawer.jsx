import { pushModalBack, popModalBack } from '../utils/modalHistory';
import React, { useState, useEffect } from 'react';
import { getOfflineDocsList, removeOfflineDoc, formatBytes } from '../features/offlineVault';
import { soundEngine } from '../features/soundEngine';

export default function OfflineVaultDrawer({ activeTheme, onOpenPdf }) {
  const [docs, setDocs] = useState(() => getOfflineDocsList());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const sync = () => setDocs(getOfflineDocsList());
    const openModal = () => {
      try { soundEngine.playTick(); } catch {}
      setDocs(getOfflineDocsList());
      setIsOpen(true);
    };
    window.__aktuOpenOfflineVault = openModal;
    window.addEventListener('aktu_offline_vault_updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      delete window.__aktuOpenOfflineVault;
      window.removeEventListener('aktu_offline_vault_updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    pushModalBack('offline-vault', () => setIsOpen(false));
    return () => popModalBack('offline-vault', true);
  }, [isOpen]);

  if (!isOpen) return null;

  const isNeo = activeTheme === 'neo-brutal';
  const isModernDark = activeTheme === 'modern-dark';
  const totalBytes = docs.reduce((acc, d) => acc + (d.bytes || 0), 0);

  const handleOpenDoc = (doc) => {
    try { soundEngine.playFlip(); } catch {}
    setIsOpen(false);
    onOpenPdf({
      title: doc.title,
      subject: doc.subject,
      url: doc.url,
      link: doc.url,
    });
  };

  const handleRemove = async (e, url) => {
    e.stopPropagation();
    try { soundEngine.playTick(); } catch {}
    await removeOfflineDoc(url);
  };

  return (
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-[950] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          isModernDark
            ? 'w-full max-w-md bg-[#0b1220] border border-[#10b98166] rounded-2xl p-4 shadow-[0_0_35px_rgba(16,185,129,0.22)] flex flex-col gap-3 max-h-[82vh] text-slate-100'
            : isNeo
              ? 'w-full max-w-md bg-white border-[3px] border-black rounded-2xl p-4 shadow-[7px_7px_0px_#000] flex flex-col gap-3 max-h-[80vh]'
              : 'w-full max-w-md bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black p-2 shadow-2xl flex flex-col gap-2 max-h-[80vh] font-mono text-black'
        }
      >
        {/* Header */}
        <div
          className={
            isModernDark
              ? 'bg-[#0f1c2e] border border-[#10b98144] rounded-xl px-3.5 py-2.5 flex items-center justify-between'
              : isNeo
                ? 'bg-[#86efac] border-[2px] border-black rounded-xl px-3 py-2 flex items-center justify-between'
                : 'bg-gradient-to-r from-[#000080] to-[#1084d0] text-white px-2.5 py-1 flex items-center justify-between'
          }
        >
          <div className="flex items-center gap-2">
            {isModernDark && (
              <span className="w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_8px_#34d399]" />
            )}
            <span
              className={
                isModernDark
                  ? 'font-mono font-bold text-xs tracking-wide text-[#34d399]'
                  : isNeo
                    ? 'font-mono font-black text-xs !text-black'
                    : 'text-xs font-bold'
              }
            >
              IN-APP OFFLINE VAULT ({docs.length} • {formatBytes(totalBytes)})
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className={
              isModernDark
                ? 'bg-[#08101d] hover:bg-[#16253b] text-slate-300 hover:text-white font-mono font-bold text-xs w-7 h-7 rounded-lg border border-white/15 flex items-center justify-center cursor-pointer transition-colors'
                : isNeo
                  ? 'bg-white !text-black font-mono font-black text-xs w-6 h-6 rounded-lg border-2 border-black cursor-pointer'
                  : 'bg-[#c0c0c0] text-black font-bold text-xs px-1.5 border border-black cursor-pointer'
            }
          >
            ✕
          </button>
        </div>

        {/* Subtitle */}
        <p
          className={
            isModernDark
              ? 'text-[11px] text-slate-400 px-1 leading-relaxed'
              : isNeo
                ? 'font-mono text-[10px] font-bold text-zinc-600 px-1'
                : 'text-[10px] text-zinc-700 px-1'
          }
        >
          Encrypted in-app storage only. Opens offline inside this viewer; never saved or shared outside the app.
        </p>

        {/* Body */}
        {docs.length === 0 ? (
          <div className="py-8 px-3 text-center">
            <p
              className={
                isModernDark
                  ? 'text-xs font-bold text-slate-200 mb-1'
                  : 'font-mono text-xs font-black !text-black mb-1'
              }
            >
              No Offline PDFs Saved Yet
            </p>
            <p className={isModernDark ? 'text-[11px] text-slate-400' : 'font-mono text-[11px] text-zinc-600'}>
              Open any PDF and tap the compact ⬇ symbol in the viewer bar to save it here for offline study.
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto flex flex-col gap-2 pr-1">
            {docs.map((doc) => (
              <div
                key={doc.url}
                onClick={() => handleOpenDoc(doc)}
                className={
                  isModernDark
                    ? 'bg-[#111b2e] hover:bg-[#16243d] border border-white/10 hover:border-[#34d39966] rounded-xl p-3 flex items-center justify-between gap-2.5 cursor-pointer transition-all group'
                    : isNeo
                      ? 'bg-[#fef9c3] hover:bg-[#fef08a] border-[2px] border-black rounded-xl p-2.5 flex items-center justify-between gap-2 cursor-pointer shadow-[2px_2px_0px_#000]'
                      : 'bg-white border border-black p-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-blue-50'
                }
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      isModernDark
                        ? 'text-xs font-bold text-[#facc15] group-hover:text-[#fde047] truncate'
                        : 'font-mono text-xs font-black !text-black truncate'
                    }
                  >
                    {doc.title}
                  </p>
                  <p
                    className={
                      isModernDark
                        ? 'font-mono text-[10px] font-semibold text-[#34d399] mt-0.5'
                        : 'font-mono text-[10px] font-bold text-zinc-600'
                    }
                  >
                    {doc.subject ? `${doc.subject} • ` : ''}
                    {formatBytes(doc.bytes)} • READY OFFLINE
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, doc.url)}
                  title="Remove from Offline Vault"
                  className={
                    isModernDark
                      ? 'bg-[#28131a] hover:bg-[#3f1924] text-[#fda4af] border border-[#f43f5e44] font-mono font-bold text-[10px] w-7 h-7 rounded-lg flex items-center justify-center shrink-0 cursor-pointer transition-colors'
                      : isNeo
                        ? 'bg-[#fecaca] hover:bg-[#fca5a5] !text-black font-mono font-black text-[10px] px-2 py-1 rounded-lg border-[1.5px] border-black shrink-0 cursor-pointer'
                        : 'bg-[#c0c0c0] border border-black text-[10px] font-bold px-2 py-0.5 shrink-0 cursor-pointer'
                  }
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}