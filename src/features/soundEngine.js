let audioCtx = null;
let soundEnabled = true;
let lastSpecificSoundAt = 0;

try {
  const saved = localStorage.getItem('aktu_sound_enabled');
  if (saved !== null) {
    soundEnabled = saved === 'true';
  }
} catch {}

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  return audioCtx;
}

const unlockAudio = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
};

export const soundEngine = {
  isEnabled: () => soundEnabled,

  toggle: () => {
    soundEnabled = !soundEnabled;
    try {
      localStorage.setItem('aktu_sound_enabled', soundEnabled.toString());
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('aktu_sfx_sync', { detail: soundEnabled }));
    } catch {}
    if (soundEnabled) {
      lastSpecificSoundAt = performance.now();
      soundEngine.playDegauss();
    }
    return soundEnabled;
  },

  // 1. Rapid micro-tick for arrow keys (560Hz -> 320Hz sine, 0.02s)
  playNav: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(560, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.02);
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(1e-4, t + 0.02);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.02);
    } catch {}
  },

  // 2. CRT Degauss thump on SFX ON / Theme switch (110Hz -> 45Hz triangle + 180Hz lowpass, 0.038s)
  playDegauss: () => {
    if (!soundEnabled) return;
    lastSpecificSoundAt = performance.now();
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.038);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, t);
      gain.gain.setValueAtTime(0.22, t);
      gain.gain.exponentialRampToValueAtTime(1e-4, t + 0.038);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.038);
    } catch {}
  },

  // 3. Crisp UI button / card / tab click (800Hz -> 200Hz triangle, 0.04s)
  playTick: () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.04);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(1e-4, t + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch {}
  },

  // 4. Branch / Year / Subject select chirp (440Hz -> 880Hz square, 0.09s)
  playOpen: () => {
    if (!soundEnabled) return;
    lastSpecificSoundAt = performance.now();
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.setValueAtTime(880, t + 0.04);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(1e-4, t + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } catch {}
  },

  // 5. PDF open / Back navigation / Modal close flip (520Hz -> 260Hz triangle, 0.05s)
  playFlip: () => {
    if (!soundEnabled) return;
    lastSpecificSoundAt = performance.now();
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(260, t + 0.05);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(1e-4, t + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    } catch {}
  },

  playClick: () => soundEngine.playTick(),
  startLoadingSound: () => {},
  stopLoadingSound: () => {},
};

if (typeof window !== 'undefined') {
  ['touchstart', 'keydown'].forEach((ev) => {
    window.addEventListener(ev, unlockAudio, { passive: true });
  });

  // Global button click listener: triggers crisp original playTick() on all UI buttons
  // unless a specific sound (playOpen / playFlip / playDegauss) just played for that click
  window.addEventListener(
    'click',
    (e) => {
      unlockAudio();
      if (!soundEnabled) return;
      const btn = e.target && e.target.closest ? e.target.closest('button, [role="button"]') : null;
      if (!btn || btn.disabled) return;
      setTimeout(() => {
        if (performance.now() - lastSpecificSoundAt > 30) {
          soundEngine.playTick();
        }
      }, 0);
    },
    true
  );
}