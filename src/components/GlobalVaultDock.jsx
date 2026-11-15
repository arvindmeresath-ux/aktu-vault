import React, { useState, useEffect } from 'react';
import StudyNoiseModal, { useStudyAmbienceAudio } from './StudyNoiseModal';
import PinnedDocsModal, { loadPinnedDocs, savePinnedDocs } from './PinnedDocsModal';
import { usePwaInstall } from '../utils/pwaInstall';

export default function GlobalVaultDock({ activeTheme, onOpenPdf }) {
  const [isNoiseModalOpen, setIsNoiseModalOpen] = useState(false);
  const [noisePreset, setNoisePreset] = useState('off');
  const [noiseVolume, setNoiseVolume] = useState(() => {
    try {
      const saved = localStorage.getItem('aktu_noise_vol');
      if (saved !== null) {
        const num = parseFloat(saved);
        if (!Number.isNaN(num)) return num <= 1 ? Math.round(num * 100) : Math.round(num);
      }
    } catch {}
    return 35;
  });

  const [isPinnedModalOpen, setIsPinnedModalOpen] = useState(false);
  const [pinnedDocs, setPinnedDocs] = useState(() => loadPinnedDocs());
  const [isDockExpanded, setIsDockExpanded] = useState(false);

  const { canPrompt, isInstalled, triggerInstall } = usePwaInstall();

  // Single global audio engine so switching themes never interrupts background study noise
  useStudyAmbienceAudio(noisePreset, noiseVolume);

  // Broadcast noise state so any theme's header/tools button stays in sync
  useEffect(() => {
    window.__aktuNoiseState = { preset: noisePreset, volume: noiseVolume };
    window.dispatchEvent(
      new CustomEvent('aktu_noise_sync', {
        detail: { preset: noisePreset, volume: noiseVolume },
      })
    );
  }, [noisePreset, noiseVolume]);

  // Sync pinned docs across components & tabs
  useEffect(() => {
    const syncPins = () => setPinnedDocs(loadPinnedDocs());
    window.addEventListener('aktu_pinned_update', syncPins);
    window.addEventListener('storage', syncPins);
    return () => {
      window.removeEventListener('aktu_pinned_update', syncPins);
      window.removeEventListener('storage', syncPins);
    };
  }, []);

  // Expose global openers for any theme's TOOLS menu
  useEffect(() => {
    window.__aktuOpenNoiseModal = () => setIsNoiseModalOpen(true);
    window.__aktuOpenPinnedModal = () => setIsPinnedModalOpen(true);
    window.__aktuTriggerPwaInstall = async () => {
      const status = await triggerInstall();
      if (status === 'unavailable') {
        alert(
          "To install AKTUVault as an App:\n\n1. Open this site in a normal (non-Incognito) Google Chrome window.\n2. Click the Install icon in the right side of Chrome's address bar (or Chrome Menu ⋮ → Cast, save, and share → Install AKTUVault)."
        );
      }
    };
    return () => {
      delete window.__aktuOpenNoiseModal;
      delete window.__aktuOpenPinnedModal;
      delete window.__aktuTriggerPwaInstall;
    };
  }, [triggerInstall]);

  const isNeoBrutal = activeTheme === 'neo-brutal';

  return (
    <>
      {/* Global Pinned Docs Modal */}
      <PinnedDocsModal
        activeTheme={activeTheme}
        isOpen={isPinnedModalOpen}
        onClose={() => setIsPinnedModalOpen(false)}
        pinnedDocs={pinnedDocs}
        onOpenPdf={(doc) => {
          if (typeof onOpenPdf === 'function') {
            onOpenPdf(doc);
          }
        }}
        onRemovePin={(url) => {
          const updated = pinnedDocs.filter((d) => d.url !== url);
          savePinnedDocs(updated);
          setPinnedDocs(updated);
        }}
        onClearAll={() => {
          savePinnedDocs([]);
          setPinnedDocs([]);
        }}
      />

      {/* Global Study Ambience Modal + Bottom-Right Pulse Pill */}
      <StudyNoiseModal
        activeTheme={activeTheme}
        isOpen={isNoiseModalOpen}
        onClose={() => setIsNoiseModalOpen(false)}
        preset={noisePreset}
        onSelectPreset={setNoisePreset}
        volume={noiseVolume}
        onChangeVolume={setNoiseVolume}
      />
    </>
  );
}