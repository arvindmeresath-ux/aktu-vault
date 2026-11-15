import { pushModalBack, popModalBack } from '../utils/modalHistory';
import { isDocSavedOffline, saveDocOffline, getOfflineDocData, removeOfflineDoc, getOfflineDocsMap, formatBytes } from '../features/offlineVault';
import { saveReadingProgress, getSavedPageForDoc } from '../features/readingProgress';
import { loadPinnedDocs, togglePinDoc } from './PinnedDocsModal';
import React, { useState, useEffect, useRef, useCallback } from 'react';

const isSafePdfUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export default function PdfViewerModal({ file, onClose, activeTheme = 'neo-brutal' }) {
  const currentPdfUrl = typeof file === 'string' ? file : (file?.url || file?.link || file?.path || '');
  const currentPdfTitle = typeof file === 'object' && file !== null ? (file.title || file.name || 'AKTU Study PDF') : 'AKTU Study PDF';
  const [isPinnedDoc, setIsPinnedDoc] = useState(false);

  useEffect(() => {
    if (!currentPdfUrl) return;
    const checkPinned = () => {
      const list = loadPinnedDocs();
      setIsPinnedDoc(list.some((d) => d.url === currentPdfUrl));
    };
    checkPinned();
    window.addEventListener('aktu_pinned_update', checkPinned);
    return () => window.removeEventListener('aktu_pinned_update', checkPinned);
  }, [currentPdfUrl]);

  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(15);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [resumePromptPage, setResumePromptPage] = useState(null);
  const [isOfflineSaved, setIsOfflineSaved] = useState(() => isDocSavedOffline(file?.url || file?.link));
  const [isSavingOffline, setIsSavingOffline] = useState(false);
  const [offlineSavePct, setOfflineSavePct] = useState(0);
  const [offlineSaveStatus, setOfflineSaveStatus] = useState('');

  useEffect(() => {
    const url = file?.url || file?.link;
    setIsOfflineSaved(isDocSavedOffline(url));
    setOfflineSavePct(0);
    setOfflineSaveStatus('');
    const syncOffline = () => setIsOfflineSaved(isDocSavedOffline(url));
    window.addEventListener('aktu_offline_vault_updated', syncOffline);
    return () => window.removeEventListener('aktu_offline_vault_updated', syncOffline);
  }, [file]);

  const handleToggleOfflineSave = async () => {
    const url = currentPdfUrl || file?.url || file?.link || file?.pdfUrl || file?.src;
    if (!url) {
      setOfflineSaveStatus('No PDF URL found on this file');
      setTimeout(() => setOfflineSaveStatus(''), 2500);
      return;
    }
    if (isSavingOffline) return;

    try { soundEngine.playTick(); } catch {}

    if (isOfflineSaved) {
      await removeOfflineDoc(url);
      setIsOfflineSaved(false);
      setOfflineSaveStatus('Removed from Offline Vault');
      setTimeout(() => setOfflineSaveStatus(''), 2200);
      return;
    }

    try {
      setIsSavingOffline(true);
      setOfflineSavePct(12);
      setOfflineSaveStatus('Saving to In-App Offline Vault...');

      let preloadedBytes = null;
      if (pdfDocRef.current && typeof pdfDocRef.current.getData === 'function') {
        try {
          setOfflineSavePct(35);
          preloadedBytes = await pdfDocRef.current.getData();
        } catch (e) {
          console.warn('getData() fallback to fetch:', e);
        }
      }

      const savedMeta = await saveDocOffline({
        url,
        title: file?.title || file?.name || 'AKTU Study Notes',
        subject: file?.subject || '',
        preloadedBytes,
        onProgress: (pct) => setOfflineSavePct(pct),
      });

      setIsOfflineSaved(true);
      setOfflineSaveStatus(`Saved Offline (${formatBytes(savedMeta?.bytes)})`);
      try { soundEngine.playOpen(); } catch {}
      setTimeout(() => setOfflineSaveStatus(''), 2800);
    } catch (err) {
      console.error('Offline vault save error:', err);
      setOfflineSaveStatus(`Save failed: ${err?.message || 'Blocked'}`);
      setTimeout(() => setOfflineSaveStatus(''), 3500);
    } finally {
      setIsSavingOffline(false);
    }
  };

  const getPdfLoadingText = (themeId, pct) => {
    if (pct >= 100) return 'Unpacking & Rendering Vector Canvases...';
    switch (themeId) {
      case 'cyberpunk':
        return `> DECRYPTING_SECURE_NODE [${pct}%]...`;
      case 'blueprint':
        return `DRAFTING SPEC VECTOR PLOT: ${pct}%`;
      case 'dark-academia':
        return `Transcribing Kalam technical folios... (${pct}%)`;
      case 'neo-brutal':
        return `★ UNPACKING AKTU VAULT: ${pct}% ★`;
      case 'crt-glow':
        return `VDU_RASTER_UNPACK: ${pct}% [60Hz]`;
      case 'modern-dark':
        return `Streaming verified document blocks... (${pct}%)`;
      default:
        return `Downloading document... (${pct}%)`;
    }
  };

  const [readMode, setReadMode] = useState('light');
  const [rotationOffset, setRotationOffset] = useState(0);
  const [trimMargins, setTrimMargins] = useState(false);
  const [dualPageView, setDualPageView] = useState(false);
  const handleRotate = () => {
    try { soundEngine.playTick(); } catch {}
    setRotationOffset((prev) => (prev + 90) % 360);
  };
  const cycleReadMode = () => {
    try { soundEngine.playTick(); } catch {}
    setReadMode((prev) => (prev === 'light' ? 'sepia' : prev === 'sepia' ? 'dark' : 'light'));
  };
  const [isCompleteScreen, setIsCompleteScreen] = useState(false);

  const canvasRefs = useRef({});
  const pdfDocRef = useRef(null);
  const activeRenderTasks = useRef([]);
  const renderRunIdRef = useRef(0);
  const containerRef = useRef(null);
  const pdfHistoryPushedRef = useRef(false);
  const csHistoryPushedRef = useRef(false);
  const isCompleteScreenRef = useRef(false);
  useEffect(() => { isCompleteScreenRef.current = isCompleteScreen; }, [isCompleteScreen]);

  const isNeo = activeTheme === 'neo-brutal';
  const isModernDark = activeTheme === 'modern-dark';
  const isKalam = activeTheme === 'dark-academia';
  const isCrt = activeTheme === 'crt-glow';
  const isKawaii = activeTheme === 'kawaii-bento';
  const isWin98 = activeTheme === 'win98-hc' || (!isNeo && !isModernDark && !isKalam && !isCrt && !isKawaii);

  const handleManualClose = useCallback(() => {
    popModalBack('pdf-viewer', false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    pushModalBack('pdf-viewer', () => {
      onClose();
    });

    return () => {
      popModalBack('pdf-viewer', true);
    };
  }, [onClose]);

  useEffect(() => {
    if (!isCompleteScreen) {
      popModalBack('pdf-complete-screen', false);
      return;
    }

    pushModalBack('pdf-complete-screen', () => {
      setIsCompleteScreen(false);
    });

    return () => {
      popModalBack('pdf-complete-screen', true);
    };
  }, [isCompleteScreen]);

  // Smooth 60fps rAF Scroll Loop
  useEffect(() => {
    const heldKeys = new Set();
    let rafId = null;

    const scrollLoop = () => {
      const container = containerRef.current;
      if (container && heldKeys.size > 0) {
        const speed = 24;
        let delta = 0;
        if (heldKeys.has('ArrowDown') || heldKeys.has('j')) delta += speed;
        if (heldKeys.has('ArrowUp') || heldKeys.has('k')) delta -= speed;
        if (delta !== 0) {
          container.scrollBy({ top: delta, behavior: 'auto' });
        }
      }
      if (heldKeys.size > 0) {
        rafId = requestAnimationFrame(scrollLoop);
      } else {
        rafId = null;
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        heldKeys.clear();
        setIsCompleteScreen((prev) => {
          if (prev) return false;
          if (pdfHistoryPushedRef.current && window.history.state?.aktuPdf) { pdfHistoryPushedRef.current = false; window.__aktuIgnoreNextPop = true; setTimeout(() => { window.__aktuIgnoreNextPop = false; }, 120); window.history.back(); } onClose();
          return false;
        });
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setIsCompleteScreen((prev) => !prev);
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'j' || e.key === 'k') {
        e.preventDefault();
        if (!heldKeys.has(e.key)) {
          heldKeys.add(e.key);
          if (!rafId) {
            rafId = requestAnimationFrame(scrollLoop);
          }
        }
        return;
      }

      const pageStep = container.clientHeight * 0.85;

      switch (e.key) {
        case 'PageDown':
        case ' ':
          e.preventDefault();
          container.scrollBy({ top: e.shiftKey ? -pageStep : pageStep, behavior: 'smooth' });
          break;
        case 'PageUp':
          e.preventDefault();
          container.scrollBy({ top: -pageStep, behavior: 'smooth' });
          break;
        case 'Home':
          e.preventDefault();
          container.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'End':
          e.preventDefault();
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          break;
        case '+':
        case '=':
          e.preventDefault();
          setScale((prev) => Math.min(prev + 0.25, 3.0));
          break;
        case '-':
        case '_':
          e.preventDefault();
          setScale((prev) => Math.max(prev - 0.25, 0.75));
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e) => {
      heldKeys.delete(e.key);
    };

    const handleWindowBlur = () => {
      heldKeys.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      heldKeys.clear();
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [onClose]);

  // Render All Pages progressively with async yielding for 60fps buttery smooth scroll
  const renderAllPages = useCallback(async (pdf, currentScale) => {
    if (!pdf) return;

    const runId = ++renderRunIdRef.current;

    activeRenderTasks.current.forEach((task) => {
      try { task.cancel(); } catch (e) {}
    });
    activeRenderTasks.current = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      if (runId !== renderRunIdRef.current) return;

      try {
        const page = await pdf.getPage(pageNum);
        if (runId !== renderRunIdRef.current) return;

        const viewport = page.getViewport({ scale: currentScale, rotation: ((page.rotate || 0) + rotationOffset) % 360 });
        const canvas = canvasRefs.current[pageNum];

        if (canvas) {
          const context = canvas.getContext('2d', { alpha: false });
          const targetW = Math.floor(viewport.width);
          const targetH = Math.floor(viewport.height);

          canvas.width = targetW;
          canvas.height = targetH;
          context.save();
          context.setTransform(1, 0, 0, 1, 0, 0);
          context.clearRect(0, 0, targetW, targetH);

          const renderTask = page.render({
            canvasContext: context,
            viewport: viewport,
          });

          activeRenderTasks.current.push(renderTask);
          await renderTask.promise;
          context.restore();
        }
      } catch (err) {}

      // Yield control briefly to maintain absolute 60fps smoothness
      await new Promise((resolve) => setTimeout(resolve, 3));
    }
  }, [rotationOffset]);

  // Load PDF Document via PDF.js
  useEffect(() => {
    let isMounted = true;
    const pdfUrl = file?.url || file?.link;
    if (!pdfUrl) return;

    setIsLoading(true);
    setLoadProgress(15);
    setLoadError(false);

    let currentPct = 15;
    const progressTimer = setInterval(() => {
      currentPct += Math.floor(Math.random() * 8) + 5;
      if (currentPct > 92) currentPct = 92;
      if (isMounted) setLoadProgress(currentPct);
    }, 120);

    let loadingTask = null;

    const loadPdf = async () => {
      try {
        if (!window.pdfjsLib) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }

        loadingTask = window.pdfjsLib.getDocument({
          url: pdfUrl,
          disableRange: true,
          disableStream: true,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        });

        loadingTask.onProgress = ({ loaded, total }) => {
          if (total && total > 0 && isMounted) {
            const realPct = Math.min(95, Math.round((loaded / total) * 100));
            if (realPct > currentPct) {
              currentPct = realPct;
              setLoadProgress(realPct);
            }
          }
        };

        const pdf = await loadingTask.promise;

        if (!isMounted) return;
        clearInterval(progressTimer);
        setLoadProgress(100);
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);

        setTimeout(() => {
          if (!isMounted) return;
          setIsLoading(false);
          setTimeout(() => {
            if (isMounted) renderAllPages(pdf, scale);
          }, 50);
        }, 180);
      } catch (error) {
        console.error('Error loading PDF:', error);
        clearInterval(progressTimer);
        if (isMounted) { setLoadError(true); setIsLoading(false); }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      clearInterval(progressTimer);
      if (loadingTask) {
        try { loadingTask.destroy(); } catch (e) {}
      }
      activeRenderTasks.current.forEach((task) => {
        try { task.cancel(); } catch (e) {}
      });
    };
  }, [file, renderAllPages, retryTick]);

  useEffect(() => {
    if (pdfDocRef.current && !isLoading) {
      renderAllPages(pdfDocRef.current, scale);
    }
  }, [scale, isLoading, renderAllPages]);

  const handleJumpToSavedPage = () => {
    if (!containerRef.current || !resumePromptPage) return;
    const wrappers = containerRef.current.querySelectorAll('.pdf-page-wrapper');
    const targetEl = wrappers[resumePromptPage - 1];
    if (targetEl) {
      soundEngine.playFlip();
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setResumePromptPage(null);
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.75));

  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const wrappers = container.querySelectorAll('.pdf-page-wrapper');
    let visiblePage = 1;
    wrappers.forEach((w, idx) => {
      const rect = w.getBoundingClientRect();
      if (rect.top < window.innerHeight / 2) {
        visiblePage = idx + 1;
      }
    });
    if (visiblePage !== currentPage) {
      setCurrentPage(visiblePage);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !isCompleteScreen) { handleManualClose(); }
      }}
      className={`fixed inset-0 z-[100] flex items-center justify-center select-none ${
        isCompleteScreen ? 'p-0 bg-black' : 'p-1.5 sm:p-4'
      }`}
      style={
        !isCompleteScreen
          ? {
              backgroundColor: '#2b2b2b',
              backgroundImage: 'radial-gradient(#4a4a4a 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }
          : undefined
      }
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={
          isCompleteScreen
            ? 'fixed inset-0 z-[110] w-screen h-screen bg-black flex flex-col overflow-hidden'
            : isNeo
            ? 'w-full max-w-[96vw] sm:max-w-[760px] h-[94vh] max-h-[780px] bg-white border-[3.5px] border-black rounded-[28px] p-3.5 shadow-[8px_8px_0px_#000000] flex flex-col overflow-hidden'
            : isModernDark
                ? `w-full ${dualPageView ? 'max-w-[96vw]' : 'max-w-[820px]'} h-[92vh] bg-[#0b1220] border border-[#38bdf855] rounded-2xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(56,189,248,0.22)]`
                : isKalam
                  ? `w-full ${dualPageView ? 'max-w-[96vw]' : 'max-w-[820px]'} h-[92vh] bg-[#23160e] border-2 border-[#c5a059] rounded-2xl flex flex-col overflow-hidden shadow-[0_25px_55px_rgba(0,0,0,0.9)] font-serif`
                  : isCrt
                    ? `w-full ${dualPageView ? 'max-w-[96vw]' : 'max-w-[820px]'} h-[92vh] bg-[#030d06] border-2 border-[#33ff33] rounded-xl flex flex-col overflow-hidden shadow-[0_0_40px_rgba(51,255,51,0.3)] font-mono`
                    : isKawaii
                      ? `w-full ${dualPageView ? 'max-w-[96vw]' : 'max-w-[820px]'} h-[92vh] bg-[#fdfaff] border-2 border-purple-200 rounded-[28px] flex flex-col overflow-hidden shadow-[0_24px_60px_rgba(168,85,247,0.2)]`
                      : `w-full ${dualPageView ? 'max-w-[96vw]' : 'max-w-[780px]'} h-[90vh] bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black flex flex-col overflow-hidden shadow-2xl`
        }
      >
        {!isCompleteScreen && (
          isNeo ? (
            <div className="flex flex-col shrink-0">
                <div
                  onClick={handleManualClose}
                  title="Click banner or press Esc to close"
                  className="bg-[#fb7185] border-[2.5px] border-black rounded-2xl px-3.5 py-1.5 shadow-[2px_2px_0px_#000] flex items-center justify-between gap-2 flex-wrap cursor-pointer mb-2.5"
                >
                  <span className="font-black text-[11px] sm:text-xs text-black tracking-wide uppercase truncate">
                    ★ AKTU STUDY HUB • 100% FREE ARCHIVE ★
                  </span>

                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 ml-auto"
                  >
                    <button
                      type="button"
                      onClick={handleRotate}
                      title="Rotate 90°"
                      className="px-2 py-0.5 bg-white hover:bg-[#fef08a] text-black border-[2px] border-black rounded-xl text-[10px] font-black shadow-[1.5px_1.5px_0px_#000] active:translate-y-[0.5px] cursor-pointer shrink-0"
                    >
                      ↻ {rotationOffset}°
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrimMargins((v) => !v)}
                      title="Auto-Trim White Margins"
                      className={`px-2 py-0.5 border-[2px] border-black rounded-xl text-[10px] font-black shadow-[1.5px_1.5px_0px_#000] active:translate-y-[0.5px] cursor-pointer shrink-0 ${
                        trimMargins ? 'bg-[#bae6fd] text-black' : 'bg-white hover:bg-[#fef08a] text-black'
                      }`}
                    >
                      ✂️ Trim
                    </button>
                    <button
                      type="button"
                      onClick={() => setDualPageView((v) => !v)}
                      title="2-Page Book View"
                      className={`px-2 py-0.5 border-[2px] border-black rounded-xl text-[10px] font-black shadow-[1.5px_1.5px_0px_#000] active:translate-y-[0.5px] cursor-pointer shrink-0 ${
                        dualPageView ? 'bg-[#bbf7d0] text-black' : 'bg-white hover:bg-[#fef08a] text-black'
                      }`}
                    >
                      📖 2-Pg
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentPdfUrl) return;
                        const updated = togglePinDoc({
                          title: currentPdfTitle,
                          url: currentPdfUrl,
                          tag: file?.tag || file?.category || 'PINNED PDF',
                        });
                        setIsPinnedDoc(updated.some((d) => d.url === currentPdfUrl));
                      }}
                      title={isPinnedDoc ? 'Unpin this PDF' : 'Pin PDF to Toolbox'}
                      className={`px-2 py-0.5 border-[2px] border-black rounded-xl text-[10px] font-black shadow-[1.5px_1.5px_0px_#000] active:translate-y-[0.5px] cursor-pointer flex items-center gap-1 shrink-0 ${
                        isPinnedDoc ? 'bg-[#fef08a] text-black' : 'bg-white hover:bg-[#fef08a] text-black'
                      }`}
                    >
                      <span>📌</span>
                      <span>{isPinnedDoc ? 'PINNED' : 'PIN'}</span>
                    </button>
                  </div>
                </div>

              <div className="w-full h-[2px] bg-black mb-2" />

              <div className="bg-[#d4d4d8] px-1.5 py-1.5 flex items-center justify-between gap-1 flex-wrap sm:flex-nowrap mb-2">
                <div className="bg-[#e4e4e7] border-[1.5px] border-black rounded-md px-2 py-1 shadow-[1.5px_1.5px_0px_#000] text-[9px] font-black text-black tracking-tight shrink-0">
                  ✦ 100% FREE EDTECH REPOSITORY - AKTU ✦
                </div>

                <div className="flex items-center gap-1 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsCompleteScreen(true)}
                    className="px-2 py-1 bg-[#000080] text-white border-2 border-t-white border-l-white border-b-black border-r-black font-bold flex items-center gap-1 active:border-t-black active:border-l-black active:border-b-white active:border-r-white text-[11px] shadow-sm cursor-pointer shrink-0"
                  >
                    <span>⛶ Complete Screen [F]</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent('aktu_open_noise'))}
                    className="px-2 py-0.5 bg-[#c0c0c0] text-black border border-t-white border-l-white border-b-black border-r-black text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer hover:bg-white shrink-0"
                  >
                    <span>🎧 NOISE</span>
                  </button>

                  <button
                    type="button"
                    onClick={cycleReadMode}
                    className="px-2 py-0.5 bg-[#c0c0c0] text-black border border-t-white border-l-white border-b-black border-r-black text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer hover:bg-white shrink-0"
                  >
                    <span>{readMode === 'light' ? '☀️ Light' : readMode === 'sepia' ? '📜 Sepia' : '🌙 Dark'}</span>
                  </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleOfflineSave();
                      }}
                      disabled={isSavingOffline}
                      title={
                        isSavingOffline
                          ? `Saving offline (${offlineSavePct}%)...`
                          : isOfflineSaved
                            ? 'Saved in App Offline Vault (Click to remove)'
                            : 'Save inside App for Offline Study'
                      }
                      className={`px-2 py-0.5 border border-t-white border-l-white border-b-black border-r-black text-[10px] font-mono font-bold flex items-center justify-center cursor-pointer shrink-0 transition-all ${
                        isOfflineSaved
                          ? 'bg-[#001a33] text-[#00ff88] shadow-[0_0_8px_rgba(0,255,136,0.75)]'
                          : 'bg-[#1e1b4b] hover:bg-[#312e81] text-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.65)]'
                      }`}
                    >
                      {isSavingOffline ? (
                        <span className="animate-pulse">{offlineSavePct}%</span>
                      ) : isOfflineSaved ? (
                        <span>💾✓</span>
                      ) : (
                        <span>💾</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleZoomOut}
                      title="Zoom Out"
                      className="w-5 h-5 bg-[#c0c0c0] text-black border border-t-white border-l-white border-b-black border-r-black text-[11px] font-black flex items-center justify-center cursor-pointer hover:bg-white shrink-0"
                    >
                      -
                    </button>

                    <span className="bg-white border border-t-black border-l-black border-b-white border-r-white px-1.5 py-0.5 text-[10px] font-mono font-black text-black min-w-[38px] text-center shrink-0">
                      {Math.round(scale * 100)}%
                    </span>

                    <button
                      type="button"
                      onClick={handleZoomIn}
                      title="Zoom In"
                      className="w-5 h-5 bg-[#c0c0c0] text-black border border-t-white border-l-white border-b-black border-r-black text-[11px] font-black flex items-center justify-center cursor-pointer hover:bg-white shrink-0"
                    >
                      +
                    </button>

                    <span className="bg-white border border-t-black border-l-black border-b-white border-r-white px-1.5 py-0.5 text-[10px] font-mono font-black text-black shrink-0">
                      Pg / {numPages || '...'}
                    </span>
                  </div>
                </div>
              </div>
            ) : isModernDark ? (
              <div className="flex flex-col shrink-0 border-b border-white/10">
                <div className="bg-gradient-to-r from-[#0f172a] via-[#13203b] to-[#0f172a] px-3.5 py-2 flex items-center justify-between gap-2 border-b border-white/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] shrink-0" />
                    <span className="font-bold text-xs text-slate-100 truncate">
                      {file?.title || 'Document.pdf'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTrimMargins((v) => !v)}
                      title="Auto-Trim White Margins"
                      className={`px-2 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors ${
                        trimMargins
                          ? 'bg-[#0ea5e9] text-[#06101d] border-[#38bdf8]'
                          : 'bg-[#111b2e] hover:bg-[#16243d] text-slate-200 border-white/10'
                      }`}
                    >
                      ✂️ Trim
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentPdfUrl) return;
                        const updated = togglePinDoc({ title: currentPdfTitle, url: currentPdfUrl, tag: file?.tag || file?.category || 'PINNED PDF' });
                        setIsPinnedDoc(updated.some((d) => d.url === currentPdfUrl));
                      }}
                      title={isPinnedDoc ? 'Unpin this PDF' : 'Pin PDF to Toolbox'}
                      className={`px-2 py-1 rounded-xl border font-bold text-[11px] cursor-pointer shrink-0 transition-colors ${
                        isPinnedDoc
                          ? 'bg-[#241f0f] text-[#facc15] border-[#eab30866] shadow-[0_0_10px_rgba(234,179,8,0.2)]'
                          : 'bg-[#111b2e] hover:bg-[#16243d] text-slate-200 border-white/10'
                      }`}
                    >
                      {isPinnedDoc ? '📌 PINNED' : '📌 PIN'}
                    </button>
                    <button
                      type="button"
                      onClick={handleManualClose}
                      className="px-2.5 py-1 rounded-xl bg-[#28131a] hover:bg-[#3f1924] text-[#fda4af] border border-[#f43f5e44] font-bold text-[11px] cursor-pointer shrink-0 transition-colors"
                    >
                      ✕ Close [Esc]
                    </button>
                  </div>
                </div>

                <div className="bg-[#0b1220] px-3 py-1.5 flex items-center justify-between gap-1.5 flex-nowrap overflow-x-auto text-slate-100">
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <button
                      type="button"
                      onClick={() => setIsCompleteScreen(true)}
                      className="px-2.5 py-1 rounded-xl bg-[#0ea5e9] hover:bg-[#38bdf8] text-[#06101d] font-bold flex items-center gap-1 text-[11px] shadow-[0_0_12px_rgba(56,189,248,0.35)] cursor-pointer shrink-0 transition-all"
                    >
                      <span>⛶ Complete Screen [F]</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('aktu_open_noise'))}
                      className="px-2 py-1 rounded-xl bg-[#111b2e] hover:bg-[#16243d] text-[#38bdf8] border border-[#38bdf844] text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                    >
                      <span>🎧 NOISE</span>
                    </button>
                    <button
                      type="button"
                      onClick={cycleReadMode}
                      className="px-2 py-1 rounded-xl bg-[#111b2e] hover:bg-[#16243d] text-slate-200 border border-white/10 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                    >
                      <span>{readMode === 'light' ? '☀️ Light' : readMode === 'sepia' ? '📜 Sepia' : '🌙 Dark'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleOfflineSave(); }}
                      disabled={isSavingOffline}
                      title={isSavingOffline ? `Saving offline (${offlineSavePct}%)...` : isOfflineSaved ? 'Saved in Offline Vault (Click to remove)' : 'Save Offline to Vault'}
                      className={`px-2 py-1 rounded-xl border flex items-center justify-center cursor-pointer shrink-0 transition-all ${
                        isOfflineSaved
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                          : 'bg-[#111b2e] hover:bg-[#16243d] text-[#38bdf8] border-[#38bdf8]/40 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                      }`}
                    >
                      {isSavingOffline ? (
                        <span className="text-[10px] font-mono font-bold animate-pulse">{offlineSavePct}%</span>
                      ) : isOfflineSaved ? (
                        <svg className="w-4 h-4 drop-shadow-[0_0_4px_rgba(52,211,153,0.85)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 drop-shadow-[0_0_4px_rgba(56,189,248,0.85)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      )}
                    </button>
                    <button type="button" onClick={handleRotate} title="Rotate 90°" className="px-2 py-1 rounded-xl bg-[#111b2e] hover:bg-[#16243d] text-slate-200 border border-white/10 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors">↻ {rotationOffset}°</button>
                    <button type="button" onClick={() => setDualPageView((v) => !v)} title="2-Page Book View" className={`px-2 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors ${dualPageView ? 'bg-[#0ea5e9] text-[#06101d] border-[#38bdf8]' : 'bg-[#111b2e] hover:bg-[#16243d] text-slate-200 border-white/10'}`}>📖 2-Pg</button>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto text-[11px] font-bold shrink-0">
                    <button type="button" onClick={handleZoomOut} className="w-6 h-6 rounded-lg bg-[#111b2e] hover:bg-[#16243d] text-sky-300 border border-white/10 flex items-center justify-center cursor-pointer">-</button>
                    <button type="button" onClick={() => setScale(1.0)} className="px-2 py-0.5 rounded-lg bg-[#111b2e] text-slate-200 border border-white/10 cursor-pointer">{Math.round(scale * 100)}%</button>
                    <button type="button" onClick={handleZoomIn} className="w-6 h-6 rounded-lg bg-[#111b2e] hover:bg-[#16243d] text-sky-300 border border-white/10 flex items-center justify-center cursor-pointer">+</button>
                    <span className="px-2 py-0.5 rounded-lg bg-[#111b2e] text-sky-300 border border-sky-400/20 ml-1">Pg / {numPages || '...'}</span>
                  </div>
                </div>
              </div>
            ) : isKalam ? (
              <div className="flex flex-col shrink-0 border-b border-[#c5a059]/40">
                <div className="bg-[#3d2314] px-3.5 py-2 flex items-center justify-between gap-2 border-b border-[#c5a059]/40">
                  <span className="font-bold text-xs text-[#f7eed8] truncate">📜 {file?.title || 'Manuscript Folio.pdf'}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTrimMargins((v) => !v)}
                      title="Auto-Trim White Margins"
                      className={`px-2 py-1 rounded-lg border text-[11px] font-bold cursor-pointer shrink-0 transition-colors ${
                        trimMargins
                          ? 'bg-[#c5a059] text-[#23160e] border-[#f7eed8]'
                          : 'bg-[#23160e] hover:bg-[#52301b] text-[#f7eed8] border-[#c5a059]/60'
                      }`}
                    >
                      ✂️ Trim
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentPdfUrl) return;
                        const updated = togglePinDoc({ title: currentPdfTitle, url: currentPdfUrl, tag: file?.tag || file?.category || 'PINNED PDF' });
                        setIsPinnedDoc(updated.some((d) => d.url === currentPdfUrl));
                      }}
                      title={isPinnedDoc ? 'Unpin this PDF' : 'Pin PDF to Toolbox'}
                      className={`px-2 py-1 rounded-lg border font-bold text-[11px] cursor-pointer shrink-0 transition-colors ${
                        isPinnedDoc
                          ? 'bg-[#c5a059] text-[#23160e] border-[#f7eed8]'
                          : 'bg-[#23160e] hover:bg-[#52301b] text-[#f7eed8] border-[#c5a059]/60'
                      }`}
                    >
                      {isPinnedDoc ? '📌 PINNED' : '📌 PIN'}
                    </button>
                    <button
                      type="button"
                      onClick={handleManualClose}
                      className="px-2.5 py-1 rounded-lg bg-[#23160e] hover:bg-rose-950 text-[#f7eed8] border border-[#c5a059]/60 font-bold text-[11px] cursor-pointer shrink-0 transition-colors"
                    >
                      ✕ Close [Esc]
                    </button>
                  </div>
                </div>
                <div className="bg-[#23160e] px-3 py-1.5 flex items-center justify-between gap-1.5 flex-nowrap overflow-x-auto">
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <button type="button" onClick={() => setIsCompleteScreen(true)} className="px-2.5 py-1 rounded-lg bg-[#c5a059] hover:bg-[#d4af37] text-[#23160e] font-bold flex items-center gap-1 text-[11px] cursor-pointer shrink-0"><span>⛶ Complete Screen [F]</span></button>
                    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('aktu_open_noise'))} className="px-2 py-1 rounded-lg bg-[#3d2314] hover:bg-[#52301b] text-[#f7eed8] border border-[#c5a059]/50 text-[11px] font-bold cursor-pointer shrink-0">🎧 NOISE</button>
                    <button type="button" onClick={cycleReadMode} className="px-2 py-1 rounded-lg bg-[#3d2314] hover:bg-[#52301b] text-[#f7eed8] border border-[#c5a059]/50 text-[11px] font-bold cursor-pointer shrink-0">{readMode === 'light' ? '☀️ Light' : readMode === 'sepia' ? '📜 Sepia' : '🌙 Dark'}</button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleOfflineSave(); }}
                      disabled={isSavingOffline}
                      title={isSavingOffline ? `Inscribing Folio (${offlineSavePct}%)...` : isOfflineSaved ? 'Saved in Offline Vault (Click to remove)' : 'Save Folio Offline'}
                      className={`px-2.5 py-1 rounded-lg border flex items-center justify-center cursor-pointer shrink-0 transition-all duration-200 ${
                        isOfflineSaved
                          ? 'bg-[#1a2e1d] text-[#4ade80] border-[#4ade80]/80 shadow-[0_0_10px_rgba(74,222,128,0.45)]'
                          : 'bg-[#3d2314] hover:bg-[#52301b] text-[#f5d076] border-[#d4af37]/80 shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                      }`}
                    >
                      {isSavingOffline ? (
                        <span className="text-[10px] font-serif font-bold text-[#f5d076] animate-pulse">{offlineSavePct}%</span>
                      ) : isOfflineSaved ? (
                        <svg className="w-4 h-4 drop-shadow-[0_0_4px_rgba(74,222,128,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 drop-shadow-[0_0_4px_rgba(245,208,118,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
                          <line x1="16" y1="8" x2="2" y2="22" />
                          <path d="M17 15v6M14.5 18.5L17 21l2.5-2.5" />
                        </svg>
                      )}
                    </button>
                    <button type="button" onClick={handleRotate} title="Rotate 90°" className="px-2 py-1 rounded-lg bg-[#3d2314] hover:bg-[#52301b] text-[#f7eed8] border border-[#c5a059]/50 text-[11px] font-bold cursor-pointer shrink-0">↻ {rotationOffset}°</button>
                    <button type="button" onClick={() => setDualPageView((v) => !v)} title="2-Page Book View" className={`px-2 py-1 rounded-lg border text-[11px] font-bold cursor-pointer shrink-0 ${dualPageView ? 'bg-[#c5a059] text-[#23160e] border-[#f7eed8]' : 'bg-[#3d2314] text-[#f7eed8] border-[#c5a059]/50'}`}>📖 2-Pg</button>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto text-[11px] font-bold shrink-0">
                    <button type="button" onClick={handleZoomOut} className="w-6 h-6 rounded-lg bg-[#3d2314] text-[#c5a059] border border-[#c5a059]/40 flex items-center justify-center cursor-pointer">-</button>
                    <button type="button" onClick={() => setScale(1.0)} className="bg-[#1a100a] text-[#f7eed8] px-2 py-0.5 rounded-lg border border-[#c5a059]/40 cursor-pointer">{Math.round(scale * 100)}%</button>
                    <button type="button" onClick={handleZoomIn} className="w-6 h-6 rounded-lg bg-[#3d2314] text-[#c5a059] border border-[#c5a059]/40 flex items-center justify-center cursor-pointer">+</button>
                    <span className="bg-[#1a100a] text-[#c5a059] px-2 py-0.5 rounded-lg border border-[#c5a059]/50 ml-1">Pg / {numPages || '...'}</span>
                  </div>
                </div>
              </div>
            ) : isCrt ? (
              <div className="flex flex-col shrink-0 border-b border-[#33ff33]/50 text-[#33ff33]">
                <div className="bg-[#05170a] px-3 py-1.5 flex items-center justify-between gap-2 border-b border-[#33ff33]/40">
                  <span className="font-bold text-xs truncate">📟 {file?.title || 'VDU_DOCUMENT.PDF'}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTrimMargins((v) => !v)}
                      title="Auto-Trim White Margins"
                      className={`px-2 py-0.5 rounded border text-[11px] font-bold cursor-pointer shrink-0 transition-colors ${
                        trimMargins
                          ? 'bg-[#33ff33] text-[#030d06] border-[#33ff33]'
                          : 'bg-[#030d06] hover:bg-[#092b13] text-[#33ff33] border-[#33ff33]/70'
                      }`}
                    >
                      ✂️ Trim
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentPdfUrl) return;
                        const updated = togglePinDoc({ title: currentPdfTitle, url: currentPdfUrl, tag: file?.tag || file?.category || 'PINNED PDF' });
                        setIsPinnedDoc(updated.some((d) => d.url === currentPdfUrl));
                      }}
                      title={isPinnedDoc ? 'Unpin this PDF' : 'Pin PDF to Toolbox'}
                      className={`px-2 py-0.5 rounded border text-[11px] font-bold cursor-pointer shrink-0 transition-colors ${
                        isPinnedDoc
                          ? 'bg-[#33ff33] text-[#030d06] border-[#33ff33]'
                          : 'bg-[#030d06] hover:bg-[#092b13] text-[#33ff33] border-[#33ff33]/70'
                      }`}
                    >
                      {isPinnedDoc ? '📌 PINNED' : '📌 PIN'}
                    </button>
                    <button
                      type="button"
                      onClick={handleManualClose}
                      className="px-2.5 py-0.5 rounded bg-[#030d06] hover:bg-[#33ff33] hover:text-[#030d06] text-[#33ff33] border border-[#33ff33] font-bold text-[11px] cursor-pointer shrink-0 transition-colors"
                    >
                      ✕ Close [Esc]
                    </button>
                  </div>
                </div>
                <div className="bg-[#030d06] px-3 py-1.5 flex items-center justify-between gap-1.5 flex-nowrap overflow-x-auto text-[11px] font-bold">
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <button type="button" onClick={() => setIsCompleteScreen(true)} className="px-2.5 py-1 rounded bg-[#33ff33] text-[#030d06] cursor-pointer shrink-0">⛶ Complete Screen [F]</button>
                    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('aktu_open_noise'))} className="px-2 py-1 rounded bg-[#05170a] border border-[#33ff33]/60 hover:bg-[#092b13] cursor-pointer shrink-0">🎧 NOISE</button>
                    <button type="button" onClick={cycleReadMode} className="px-2 py-1 rounded bg-[#05170a] border border-[#33ff33]/60 hover:bg-[#092b13] cursor-pointer shrink-0">{readMode === 'light' ? '☀️ Light' : readMode === 'sepia' ? '📜 Sepia' : '🌙 Dark'}</button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleOfflineSave(); }}
                      disabled={isSavingOffline}
                      title={isSavingOffline ? `Writing sectors (${offlineSavePct}%)...` : isOfflineSaved ? 'Cached in Local VDU Vault (Click to purge)' : 'Write Sector to Local VDU Vault'}
                      className={`px-2 py-1 rounded border flex items-center gap-1 font-mono text-[11px] font-bold cursor-pointer shrink-0 transition-all ${
                        isOfflineSaved
                          ? 'bg-[#33ff33] text-[#030d06] border-[#33ff33] shadow-[0_0_12px_rgba(51,255,51,0.85)]'
                          : 'bg-[#05170a] hover:bg-[#092b13] text-[#33ff33] border-[#33ff33]/85 shadow-[0_0_10px_rgba(51,255,51,0.4)]'
                      }`}
                    >
                      {isSavingOffline ? (
                        <span className="animate-pulse">[{offlineSavePct}%]</span>
                      ) : isOfflineSaved ? (
                        <span>[✓]</span>
                      ) : (
                        <span className="tracking-tighter drop-shadow-[0_0_4px_rgba(51,255,51,0.9)]">[&gt;_↓]</span>
                      )}
                    </button>
                    <button type="button" onClick={handleRotate} title="Rotate 90°" className="px-2 py-1 rounded bg-[#05170a] border border-[#33ff33]/60 hover:bg-[#092b13] cursor-pointer shrink-0">↻ {rotationOffset}°</button>
                    <button type="button" onClick={() => setDualPageView((v) => !v)} title="2-Page Book View" className={`px-2 py-1 rounded border cursor-pointer shrink-0 ${dualPageView ? 'bg-[#33ff33] text-[#030d06] border-[#33ff33]' : 'bg-[#05170a] border-[#33ff33]/60'}`}>📖 2-Pg</button>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    <button type="button" onClick={handleZoomOut} className="w-6 h-6 rounded bg-[#05170a] border border-[#33ff33]/60 flex items-center justify-center cursor-pointer">-</button>
                    <button type="button" onClick={() => setScale(1.0)} className="px-2 py-0.5 rounded bg-[#05170a] border border-[#33ff33]/60 cursor-pointer">{Math.round(scale * 100)}%</button>
                    <button type="button" onClick={handleZoomIn} className="w-6 h-6 rounded bg-[#05170a] border border-[#33ff33]/60 flex items-center justify-center cursor-pointer">+</button>
                    <span className="px-2 py-0.5 rounded bg-[#05170a] border border-[#33ff33]/60 ml-1">Pg / {numPages || '...'}</span>
                  </div>
                </div>
              </div>
            ) : isKawaii ? (
              <div className="flex flex-col shrink-0 border-b border-purple-100">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-2 flex items-center justify-between gap-2 border-b border-purple-100">
                  <span className="font-bold text-xs text-purple-900 truncate">☁️ {file?.title || 'Study Cloud.pdf'}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTrimMargins((v) => !v)}
                      title="Auto-Trim White Margins"
                      className={`px-2.5 py-1 rounded-full border text-[11px] font-bold cursor-pointer shrink-0 transition-colors ${
                        trimMargins
                          ? 'bg-purple-500 text-white border-purple-500'
                          : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                      }`}
                    >
                      ✂️ Trim
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentPdfUrl) return;
                        const updated = togglePinDoc({ title: currentPdfTitle, url: currentPdfUrl, tag: file?.tag || file?.category || 'PINNED PDF' });
                        setIsPinnedDoc(updated.some((d) => d.url === currentPdfUrl));
                      }}
                      title={isPinnedDoc ? 'Unpin this PDF' : 'Pin PDF to Toolbox'}
                      className={`px-2.5 py-1 rounded-full border text-[11px] font-bold cursor-pointer shrink-0 transition-colors ${
                        isPinnedDoc
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                      }`}
                    >
                      {isPinnedDoc ? '📌 PINNED' : '📌 PIN'}
                    </button>
                    <button
                      type="button"
                      onClick={handleManualClose}
                      className="px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] cursor-pointer shrink-0 transition-colors"
                    >
                      ✕ Close [Esc]
                    </button>
                  </div>
                </div>
                <div className="bg-[#fdfaff] px-3 py-1.5 flex items-center justify-between gap-1.5 flex-nowrap overflow-x-auto text-[11px] font-bold">
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <button type="button" onClick={() => setIsCompleteScreen(true)} className="px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white cursor-pointer shrink-0">⛶ Complete Screen [F]</button>
                    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('aktu_open_noise'))} className="px-2 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 cursor-pointer shrink-0">🎧 NOISE</button>
                    <button type="button" onClick={cycleReadMode} className="px-2 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 cursor-pointer shrink-0">{readMode === 'light' ? '☀️ Light' : readMode === 'sepia' ? '📜 Sepia' : '🌙 Dark'}</button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleToggleOfflineSave(); }}
                      disabled={isSavingOffline}
                      title={isSavingOffline ? `Saving to Study Cloud (${offlineSavePct}%)...` : isOfflineSaved ? 'Saved in Study Cloud (Click to remove)' : 'Save to Study Cloud Offline'}
                      className={`px-2.5 py-1 rounded-full border flex items-center justify-center cursor-pointer shrink-0 transition-all ${
                        isOfflineSaved
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.28)]'
                          : 'bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 text-pink-600 border-pink-200 shadow-[0_0_10px_rgba(236,72,153,0.22)]'
                      }`}
                    >
                      {isSavingOffline ? (
                        <span className="text-[10px] font-bold animate-pulse">{offlineSavePct}%</span>
                      ) : isOfflineSaved ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                          <path d="m9 15 2 2 4-4" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                          <path d="M12 12v6" />
                          <path d="m9.5 15.5 2.5 2.5 2.5-2.5" />
                        </svg>
                      )}
                    </button>
                    <button type="button" onClick={handleRotate} title="Rotate 90°" className="px-2 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 cursor-pointer shrink-0">↻ {rotationOffset}°</button>
                    <button type="button" onClick={() => setDualPageView((v) => !v)} title="2-Page Book View" className={`px-2 py-1 rounded-full border cursor-pointer shrink-0 ${dualPageView ? 'bg-pink-500 text-white border-pink-500' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>📖 2-Pg</button>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    <button type="button" onClick={handleZoomOut} className="w-6 h-6 rounded-full bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center cursor-pointer">-</button>
                    <button type="button" onClick={() => setScale(1.0)} className="px-2 py-0.5 rounded-full bg-white border border-purple-200 text-purple-800 cursor-pointer">{Math.round(scale * 100)}%</button>
                    <button type="button" onClick={handleZoomIn} className="w-6 h-6 rounded-full bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center cursor-pointer">+</button>
                    <span className="px-2 py-0.5 rounded-full bg-pink-50 border border-pink-200 text-pink-700 ml-1">Pg / {numPages || '...'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col shrink-0 border-b-2 border-black">
                <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] text-white px-2.5 py-1 flex items-center justify-between gap-2">
                  <span className="font-bold text-xs truncate font-mono">📄 {file?.title || 'Document.pdf'}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTrimMargins((v) => !v)}
                      title="Auto-Trim White Margins"
                      className={`px-2 py-0.5 text-[11px] font-bold border font-mono cursor-pointer shrink-0 ${
                        trimMargins
                          ? 'bg-[#ffff00] text-[#000080] border-t-black border-l-black border-b-white border-r-white'
                          : 'bg-[#c0c0c0] hover:bg-white text-black border-t-white border-l-white border-b-black border-r-black'
                      }`}
                    >
                      ✂️ Trim
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentPdfUrl) return;
                        const updated = togglePinDoc({ title: currentPdfTitle, url: currentPdfUrl, tag: file?.tag || file?.category || 'PINNED PDF' });
                        setIsPinnedDoc(updated.some((d) => d.url === currentPdfUrl));
                      }}
                      title={isPinnedDoc ? 'Unpin this PDF' : 'Pin PDF to Toolbox'}
                      className={`px-2 py-0.5 text-[11px] font-bold border font-mono cursor-pointer shrink-0 ${
                        isPinnedDoc
                          ? 'bg-[#ffff00] text-[#000080] border-t-black border-l-black border-b-white border-r-white'
                          : 'bg-[#c0c0c0] hover:bg-white text-black border-t-white border-l-white border-b-black border-r-black'
                      }`}
                    >
                      {isPinnedDoc ? '📌 PINNED' : '📌 PIN'}
                    </button>
                    <button
                      type="button"
                      onClick={handleManualClose}
                      className="px-2 py-0.5 bg-[#c00000] hover:bg-red-700 text-white font-bold text-[11px] border border-t-white border-l-white border-b-black border-r-black cursor-pointer shrink-0 font-mono"
                    >
                      ✕ Close [Esc]
                    </button>
                  </div>
                </div>

                <div className="bg-[#c0c0c0] px-2 py-1 flex items-center justify-between gap-1.5 flex-nowrap overflow-x-auto border-t border-white font-mono text-black">
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <button
                      type="button"
                      onClick={() => setIsCompleteScreen(true)}
                      className="px-2 py-0.5 bg-[#000080] text-white border-2 border-t-white border-l-white border-b-black border-r-black font-bold flex items-center gap-1 active:border-t-black active:border-l-black active:border-b-white active:border-r-white text-[11px] cursor-pointer shrink-0"
                    >
                      <span>⛶ Complete Screen [F]</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('aktu_open_noise'))}
                      className="px-2 py-0.5 bg-[#c0c0c0] text-black border-2 border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black active:border-b-white active:border-r-white text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-[#d4d4d4] shrink-0"
                    >
                      <span>🎧 NOISE</span>
                    </button>

                    <button
                      type="button"
                      onClick={cycleReadMode}
                      className="px-2 py-0.5 bg-[#c0c0c0] text-black border-2 border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black active:border-b-white active:border-r-white text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-[#d4d4d4] shrink-0"
                    >
                      <span>{readMode === 'light' ? '☀️ Light' : readMode === 'sepia' ? '📜 Sepia' : '🌙 Dark'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleOfflineSave();
                      }}
                      disabled={isSavingOffline}
                      title={
                        isSavingOffline
                          ? `Saving offline (${offlineSavePct}%)...`
                          : isOfflineSaved
                            ? 'Saved in Offline Vault (Click to remove)'
                            : 'Save Offline to Vault'
                      }
                      className={`px-2 py-0.5 border-2 flex items-center justify-center cursor-pointer shrink-0 transition-all duration-200 ${
                        isOfflineSaved
                          ? 'bg-[#001a33] text-[#00ff88] border-t-black border-l-black border-b-white border-r-white shadow-[0_0_12px_rgba(0,255,136,0.9)]'
                          : 'bg-[#c0c0c0] hover:bg-[#e8f8ff] text-[#0077ff] border-t-white border-l-white border-b-black border-r-black shadow-[0_0_10px_rgba(0,210,255,0.85)]'
                      }`}
                    >
                      {isSavingOffline ? (
                        <span className="text-[10px] font-mono font-black text-[#00ff88] animate-pulse">{offlineSavePct}%</span>
                      ) : (
                        <svg className="w-4 h-4 drop-shadow-[0_0_5px_rgba(0,220,255,0.95)]" viewBox="0 0 18 18" fill="none">
                          <path d="M2.5 2H13L15.5 4.5V15.5H2.5V2Z" fill={isOfflineSaved ? '#003322' : '#1d4ed8'} stroke={isOfflineSaved ? '#00ff88' : '#00f0ff'} strokeWidth="1.3" />
                          <rect x="5" y="2.2" width="6.5" height="4.2" rx="0.5" fill="#f8fafc" />
                          <rect x="9" y="2.8" width="1.5" height="2.8" fill="#1e3a8a" />
                          <rect x="4.2" y="8.5" width="9.6" height="6.8" rx="0.6" fill="#ffffff" />
                          <line x1="4.2" y1="10.2" x2="13.8" y2="10.2" stroke="#38bdf8" strokeWidth="1" />
                          {isOfflineSaved ? (
                            <path d="M6.8 12.7L8.4 14.2L11.5 11.2" stroke="#00b359" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          ) : (
                            <path d="M9 11V14.3M9 14.3L7.3 12.7M9 14.3L10.7 12.7" stroke="#0284c7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          )}
                          <path d="M14.5 1.5V3.5M13.5 2.5H15.5" stroke={isOfflineSaved ? '#00ff88' : '#00f0ff'} strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleRotate}
                      title="Rotate 90°"
                      className="px-2 py-0.5 bg-[#c0c0c0] hover:bg-[#d4d4d4] text-black border-2 border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black active:border-b-white active:border-r-white text-[11px] font-bold cursor-pointer shrink-0"
                    >
                      ↻ {rotationOffset}°
                    </button>

                    <button
                      type="button"
                      onClick={() => setDualPageView((v) => !v)}
                      title="2-Page Book View"
                      className={`px-2 py-0.5 border-2 text-[11px] font-bold cursor-pointer shrink-0 ${
                        dualPageView
                          ? 'bg-[#000080] text-[#ffff00] border-t-black border-l-black border-b-white border-r-white'
                          : 'bg-[#c0c0c0] hover:bg-[#d4d4d4] text-black border-t-white border-l-white border-b-black border-r-black'
                      }`}
                    >
                      📖 2-Pg
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      title="Zoom Out"
                      className="w-5 h-5 bg-[#c0c0c0] text-black border-2 border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black active:border-b-white active:border-r-white flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="bg-white px-1.5 py-0.5 border border-t-black border-l-black border-b-white border-r-white min-w-[42px] text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      title="Zoom In"
                      className="w-5 h-5 bg-[#c0c0c0] text-black border-2 border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black active:border-b-white active:border-r-white flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                    <span className="bg-white px-2 py-0.5 border border-t-black border-l-black border-b-white border-r-white ml-1">
                      Pg / {numPages || '...'}
                    </span>
                  </div>
                </div>
              </div>
            )
          )}

        {isCompleteScreen && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[120] bg-zinc-900/95 border border-zinc-700 text-white px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2.5">
            <button
              type="button"
              onClick={cycleReadMode}
              className="hover:text-yellow-300 flex items-center gap-1 cursor-pointer shrink-0 text-[11px]"
            >
              <span>{readMode === 'light' ? '☀️' : readMode === 'sepia' ? '📜' : '🌙'}</span>
              <span>{readMode === 'light' ? 'Light' : readMode === 'sepia' ? 'Sepia' : 'Dark'}</span>
            </button>
            <button type="button" onClick={handleRotate} title="Rotate 90°" className="px-2.5 py-1 rounded-xl bg-[#111b2e] hover:bg-[#16243d] text-slate-200 border border-white/10 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors">↻ {rotationOffset}°</button>
            <button type="button" onClick={() => setTrimMargins((v) => !v)} title="Auto-Trim White Margins" className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors ${trimMargins ? 'bg-[#0ea5e9] text-[#06101d] border-[#38bdf8]' : 'bg-[#111b2e] hover:bg-[#16243d] text-slate-200 border-white/10'}`}>✂️ Trim</button>
            <button type="button" onClick={() => setDualPageView((v) => !v)} title="2-Page Book View" className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors ${dualPageView ? 'bg-[#0ea5e9] text-[#06101d] border-[#38bdf8]' : 'bg-[#111b2e] hover:bg-[#16243d] text-slate-200 border-white/10'}`}>📖 2-Pg</button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleOfflineSave();
              }}
              disabled={isSavingOffline}
              title={
                isSavingOffline
                  ? `Saving offline (${offlineSavePct}%)...`
                  : isOfflineSaved
                  ? 'Saved in App Offline Vault (Click to remove)'
                  : 'Save inside App for Offline Study'
              }
              aria-label="Save Offline"
              className={
                isNeo
                  ? `w-7 h-7 rounded-lg border-[2px] border-black font-mono text-[10px] font-black cursor-pointer flex items-center justify-center shrink-0 transition-transform active:translate-y-[1px] ${
                      isOfflineSaved
                        ? 'bg-[#86efac] !text-black shadow-[1.5px_1.5px_0px_#000]'
                        : 'bg-white hover:bg-[#fef08a] !text-black'
                    }`
                  : `w-6 h-6 border border-black font-mono text-[10px] font-bold cursor-pointer flex items-center justify-center shrink-0 ${
                      isOfflineSaved
                        ? 'bg-[#008000] text-white'
                        : 'bg-[#c0c0c0] text-black border-t-white border-l-white border-b-black border-r-black'
                    }`
              }
            >
              {isSavingOffline ? (
                <span>{offlineSavePct}%</span>
              ) : isOfflineSaved ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
            </button>

            <span className="text-zinc-600">|</span>

            <button
              type="button"
              onClick={handleZoomOut}
              className="w-5 h-5 flex items-center justify-center hover:bg-zinc-800 rounded text-xs cursor-pointer shrink-0 font-bold"
            >
              -
            </button>
            <span className="text-[11px] font-bold text-zinc-300 shrink-0 font-mono">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              className="w-5 h-5 flex items-center justify-center hover:bg-zinc-800 rounded text-xs cursor-pointer shrink-0 font-bold"
            >
              +
            </button>

            <span className="text-zinc-600">|</span>

            <div className="flex items-center gap-1 text-[11px] shrink-0 font-mono">
              <span>Pg</span>
              <span className="px-1.5 bg-zinc-800 rounded text-white font-bold">
                {currentPage}
              </span>
              <span>/ {numPages || '...'}</span>
            </div>

            <button
              type="button"
              onClick={() => setIsCompleteScreen(false)}
              className="bg-[#c00000] hover:bg-red-700 text-white font-bold px-3 py-1 rounded-full text-[11px] cursor-pointer ml-1 shrink-0 flex items-center gap-1 shadow-md"
            >
              <span>✕</span>
              <span>Exit (Esc)</span>
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* PERSISTENT CANVAS SCROLL AREA WITH TIGHT GAPS & 60FPS    */}
        {/* ======================================================== */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className={`flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 ${dualPageView ? 'grid grid-cols-1 md:grid-cols-2 gap-3 items-start justify-items-center' : 'flex flex-col items-center gap-2.5'} ${isWin98 ? 'win98-scroll' : 'modern-pdf-scroll'}`}
          style={{ WebkitOverflowScrolling: 'touch', transform: 'translateZ(0)', willChange: 'transform', scrollBehavior: 'auto' }}
        >
          {(isSavingOffline || offlineSaveStatus) && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[999] w-[90vw] max-w-xs select-none pointer-events-none">
              <div
                className={
                  isNeo
                    ? 'bg-[#fef08a] border-[2.5px] border-black rounded-xl px-3 py-2 shadow-[4px_4px_0px_#000] font-mono text-black'
                    : isModernDark
                      ? 'bg-[#0f172a]/95 border border-[#38bdf8]/60 rounded-2xl px-3.5 py-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.85),0_0_16px_rgba(56,189,248,0.28)] backdrop-blur-md text-slate-100'
                      : isKalam
                        ? 'bg-[#23160e] border-2 border-[#c5a059] rounded-xl px-3.5 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.85),0_0_15px_rgba(197,160,89,0.25)] font-serif text-[#f7eed8]'
                        : isCrt
                          ? 'bg-[#030d06] border border-[#33ff33] rounded px-3 py-2 shadow-[0_0_18px_rgba(51,255,51,0.35)] font-mono text-[#33ff33]'
                          : isKawaii
                            ? 'bg-[#fdfaff] border-2 border-purple-300 rounded-2xl px-3.5 py-2 shadow-[0_10px_25px_rgba(168,85,247,0.22)] text-purple-900'
                            : 'bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black px-3 py-1.5 shadow-lg font-mono text-black'
                }
              >
                <div
                  className={`flex items-center justify-between text-[11px] font-bold mb-1 ${
                    isModernDark
                      ? 'text-sky-300'
                      : isKalam
                        ? 'text-[#f5d076]'
                        : isCrt
                          ? 'text-[#33ff33]'
                          : isKawaii
                            ? 'text-purple-800'
                            : '!text-black font-black text-[10px]'
                  }`}
                >
                  <span>
                    {isKalam
                      ? `📜 ${offlineSaveStatus || 'Inscribing Folio to Archive...'}`
                      : isCrt
                        ? `> ${offlineSaveStatus || 'WRITING_TO_LOCAL_VAULT...'}`
                        : isKawaii
                          ? `✨ ${offlineSaveStatus || 'Saving to Study Cloud...'}`
                          : (offlineSaveStatus || 'SAVING TO OFFLINE VAULT...')}
                  </span>
                  {isSavingOffline && <span>{offlineSavePct}%</span>}
                </div>
                {isSavingOffline && (
                  <div
                    className={
                      isNeo
                        ? 'w-full h-2.5 bg-white border-[1.5px] border-black rounded-full overflow-hidden'
                        : isModernDark
                          ? 'w-full h-2 bg-[#1e293b] border border-sky-400/30 rounded-full overflow-hidden'
                          : isKalam
                            ? 'w-full h-2 bg-[#140c07] border border-[#c5a059]/60 rounded-full overflow-hidden'
                            : isCrt
                              ? 'w-full h-2 bg-[#05170a] border border-[#33ff33]/70 overflow-hidden'
                              : isKawaii
                                ? 'w-full h-2 bg-purple-100 border border-purple-300 rounded-full overflow-hidden'
                                : 'w-full h-2.5 bg-white border border-black'
                    }
                  >
                    <div
                      className={
                        isNeo
                          ? 'h-full bg-[#22c55e] transition-all duration-150'
                          : isModernDark
                            ? 'h-full bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] shadow-[0_0_8px_#38bdf8] transition-all duration-150'
                            : isKalam
                              ? 'h-full bg-gradient-to-r from-[#c5a059] to-[#f5d076] shadow-[0_0_8px_rgba(245,208,118,0.6)] transition-all duration-150'
                              : isCrt
                                ? 'h-full bg-[#33ff33] shadow-[0_0_8px_#33ff33] transition-all duration-150'
                                : isKawaii
                                  ? 'h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-150'
                                  : 'h-full bg-[#000080] transition-all duration-150'
                      }
                      style={{ width: `${offlineSavePct}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {!isLoading && !loadError && resumePromptPage && (
            <div className="sticky top-2 z-30 w-full max-w-md px-3 select-none">
              {isNeo ? (
                <div className="bg-[#67e8f9] border-[2.5px] border-black rounded-xl px-3 py-2 shadow-[4px_4px_0px_#000] flex items-center justify-between gap-2 font-mono">
                  <span className="text-[11px] font-black !text-black">
                    BOOKMARKED AT PAGE {resumePromptPage} / {numPages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleJumpToSavedPage}
                      className="bg-[#fef08a] hover:bg-[#fde047] !text-black text-[10px] font-black px-2.5 py-1 rounded-lg border-[2px] border-black cursor-pointer"
                    >
                      JUMP →
                    </button>
                    <button
                      type="button"
                      onClick={() => setResumePromptPage(null)}
                      className="bg-white !text-black text-[10px] font-black px-1.5 py-1 rounded-lg border-[2px] border-black cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black px-3 py-1.5 shadow-lg flex items-center justify-between gap-2 font-mono text-black">
                  <span className="text-[11px] font-bold">
                    Last read: Page {resumePromptPage} of {numPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleJumpToSavedPage}
                      className="bg-[#000080] text-white text-[10px] font-bold px-2.5 py-0.5 border border-black cursor-pointer"
                    >
                      Jump to Page
                    </button>
                    <button
                      type="button"
                      onClick={() => setResumePromptPage(null)}
                      className="bg-[#c0c0c0] border border-black text-[10px] font-bold px-1.5 py-0.5 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isLoading && (
            <div className="my-auto py-16 px-4 w-full flex items-center justify-center select-none">
              <style>{`
                @keyframes aktuCandyStripe {
                  0% { background-position: 0 0; }
                  100% { background-position: 28px 0; }
                }
              `}</style>

              {isNeo ? (
                <div className="pdf-loader-box w-full max-w-[340px] bg-[#fef08a] border-[3px] border-black rounded-2xl px-6 py-5 shadow-[6px_6px_0px_#000] flex flex-col items-center gap-3.5">
                  <div className="bg-[#fb7185] border-[2.5px] border-black rounded-xl px-3.5 py-1 font-mono font-black text-base sm:text-lg !text-black leading-none shadow-[2px_2px_0px_#000]">
                    {loadProgress}%
                  </div>

                  <div className="w-full h-4 bg-white border-[2.5px] border-black rounded-full overflow-hidden">
                    <div
                      className="pdf-loader-fill h-full rounded-r-full border-r-2 border-black transition-all duration-150"
                      style={{
                        width: `${loadProgress}%`,
                        backgroundColor: '#fb7185',
                        backgroundImage:
                          'repeating-linear-gradient(-45deg, #fb7185 0px, #fb7185 7px, #f43f5e 7px, #f43f5e 14px)',
                        backgroundSize: '28px 28px',
                        animation: 'aktuCandyStripe 0.8s linear infinite',
                      }}
                    />
                  </div>

                  <p className="pdf-loader-sub text-[11px] font-mono text-center font-black tracking-wide !text-black">
                    {getPdfLoadingText(activeTheme, loadProgress)}
                  </p>
                </div>
              ) : isModernDark ? (
                <div className="pdf-loader-box w-full max-w-[400px] bg-[#0b1220] border border-[#38bdf844] rounded-2xl p-5 shadow-[0_0_40px_rgba(56,189,248,0.18)] flex flex-col gap-3 font-sans">
                  <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse shadow-[0_0_8px_#38bdf8]" />
                      <span className="text-xs font-bold tracking-wide text-slate-100 uppercase">
                        Loading Study Document
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#facc15] bg-[#241f0f] border border-[#eab30844] px-2 py-0.5 rounded-lg">
                      {loadProgress}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#08101d] rounded-full overflow-hidden border border-white/10 p-0.5">
                    <div
                      className="pdf-loader-fill h-full rounded-full bg-gradient-to-r from-[#0ea5e9] via-[#38bdf8] to-[#facc15] transition-all duration-150"
                      style={{
                        width: `${loadProgress}%`,
                        display: 'block',
                      }}
                    />
                  </div>
                  <p className="pdf-loader-sub text-[11px] text-center font-medium text-slate-400">
                    {getPdfLoadingText(activeTheme, loadProgress)}
                  </p>
                </div>
              ) : isKalam ? (
                <div className="pdf-loader-box w-full max-w-[400px] bg-[#23160e] border-2 border-[#c5a059] rounded-2xl p-5 shadow-2xl flex flex-col gap-3 font-serif text-[#f7eed8]">
                  <div className="w-full flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wide text-[#c5a059] uppercase">📜 Transcribing Folio</span>
                    <span className="text-xs font-bold text-[#23160e] bg-[#c5a059] px-2 py-0.5 rounded">{loadProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#1a100a] rounded-full overflow-hidden border border-[#c5a059]/40 p-0.5">
                    <div className="pdf-loader-fill h-full rounded-full bg-gradient-to-r from-[#8b6b43] via-[#c5a059] to-[#f5eedb] transition-all duration-150" style={{ width: `${loadProgress}%`, display: 'block' }} />
                  </div>
                  <p className="pdf-loader-sub text-[11px] text-center text-[#f7eed8]/80">{getPdfLoadingText(activeTheme, loadProgress)}</p>
                </div>
              ) : isCrt ? (
                <div className="pdf-loader-box w-full max-w-[400px] bg-[#030d06] border-2 border-[#33ff33] rounded-xl p-5 shadow-[0_0_30px_rgba(51,255,51,0.3)] flex flex-col gap-3 font-mono text-[#33ff33]">
                  <div className="w-full flex items-center justify-between text-xs font-bold">
                    <span>📟 VDU_STREAM.SYS</span>
                    <span>{loadProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-[#05170a] rounded overflow-hidden border border-[#33ff33]/60 p-0.5">
                    <div className="pdf-loader-fill h-full bg-[#33ff33] transition-all duration-150" style={{ width: `${loadProgress}%`, display: 'block' }} />
                  </div>
                  <p className="pdf-loader-sub text-[11px] text-center text-[#33ff33]/80">{getPdfLoadingText(activeTheme, loadProgress)}</p>
                </div>
              ) : isKawaii ? (
                <div className="pdf-loader-box w-full max-w-[400px] bg-white border-2 border-purple-200 rounded-[24px] p-5 shadow-xl flex flex-col gap-3 text-slate-800">
                  <div className="w-full flex items-center justify-between text-xs font-bold">
                    <span className="text-purple-700">☁️ Loading Study Cloud</span>
                    <span className="text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-200">{loadProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-purple-50 rounded-full overflow-hidden border border-purple-100 p-0.5">
                    <div className="pdf-loader-fill h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-150" style={{ width: `${loadProgress}%`, display: 'block' }} />
                  </div>
                  <p className="pdf-loader-sub text-[11px] text-center text-slate-500 font-medium">{getPdfLoadingText(activeTheme, loadProgress)}</p>
                </div>
              ) : (
                <div className="pdf-loader-box w-full max-w-sm bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black p-4 shadow-2xl flex flex-col items-center gap-3 font-mono text-black">
                  <div className="w-full bg-gradient-to-r from-[#000080] to-[#1084d0] text-white px-2 py-0.5 text-[11px] font-bold flex items-center justify-between">
                    <span>PDF_STREAM.EXE</span>
                    <span>{loadProgress}%</span>
                  </div>
                  <div className="w-full h-5 bg-white border-2 border-t-black border-l-black border-b-white border-r-white p-0.5">
                    <div
                      className="pdf-loader-fill bg-[#000080] transition-all duration-150"
                      style={{
                        width: `${loadProgress}%`,
                        height: '100%',
                        minHeight: '14px',
                        display: 'block',
                      }}
                    />
                  </div>
                  <p className="pdf-loader-sub text-[11px] font-mono text-center font-bold opacity-90 text-black">
                    {getPdfLoadingText(activeTheme, loadProgress)}
                  </p>
                </div>
              )}
            </div>
          )}

          {!isLoading && loadError && (
            <div className="my-auto py-16 px-4 w-full flex items-center justify-center select-none">
              {isNeo ? (
                <div className="w-full max-w-xs bg-[#fecaca] border-[3px] border-black rounded-2xl p-5 shadow-[6px_6px_0px_#000] text-center flex flex-col items-center gap-3">
                  <span className="bg-black text-[#fef08a] font-mono text-[10px] font-black px-2.5 py-0.5 rounded-md">
                    STREAM INTERRUPTED
                  </span>
                  <p className="text-xs font-mono font-black !text-black">
                    Document failed to load. Check connection or archive link.
                  </p>
                  <button
                    type="button"
                    onClick={() => setRetryTick((c) => c + 1)}
                    className="bg-[#fef08a] hover:bg-[#fde047] !text-black font-mono font-black text-xs px-4 py-2 rounded-xl border-[2.5px] border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                  >
                    ↻ RETRY STREAM
                  </button>
                </div>
              ) : (
                <div className="w-full max-w-xs bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black p-4 text-center font-mono text-black shadow-xl">
                  <p className="text-xs font-bold mb-3">Document failed to load.</p>
                  <button
                    type="button"
                    onClick={() => setRetryTick((c) => c + 1)}
                    className="text-xs bg-[#000080] text-white px-4 py-1.5 font-bold border border-black cursor-pointer active:scale-95"
                  >
                    ↻ Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              className={
                isCompleteScreen
                  ? 'pdf-page-wrapper flex flex-col items-center w-full max-w-[99vw] sm:max-w-[995px] shrink-0 mb-1.5'
                  : isNeo
                  ? 'pdf-page-wrapper flex flex-col items-center w-full border-[1.5px] border-black bg-[#bdbdbd] shrink-0 mb-1.5'
                  : 'pdf-page-wrapper flex flex-col items-center w-full max-w-[99vw] sm:max-w-[995px] shrink-0 mb-1.5'
              }
              style={{ transform: 'translateZ(0)', willChange: 'transform' }}
            >
              <div className={`w-full overflow-hidden ${trimMargins ? 'border border-black shadow-xl bg-white' : ''}`}>
                <canvas
                  onDragStart={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  ref={(el) => {
                    canvasRefs.current[pageNum] = el;
                  }}
                  style={
                    (readMode !== 'light')
                      ? { filter: 'invert(1) hue-rotate(180deg)', transform: trimMargins ? 'scale(1.24)' : undefined, transformOrigin: 'center center' }
                      : trimMargins ? { transform: 'scale(1.24)', transformOrigin: 'center center' } : undefined
                  }
                  className={`w-full h-auto bg-white block transition-transform duration-150 ${trimMargins ? '' : 'border border-black shadow-xl'}`}
                />
              </div>
              <div
                className={
                  isNeo && !isCompleteScreen
                    ? 'w-full py-1 text-center text-[9px] font-mono font-bold tracking-widest text-zinc-800 bg-[#bdbdbd] border-t border-zinc-400 select-none'
                    : 'text-[9px] text-yellow-400/80 font-mono tracking-widest mt-0.5 mb-1 select-none'
                }
              >
                --- PAGE {pageNum} ---
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}