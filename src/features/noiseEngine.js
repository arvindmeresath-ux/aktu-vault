// Pure Web Audio API Noise Generator & Music Stream Pipeline
let audioCtx = null;
let currentSource = null;
let gainNode = null;
let musicAudio = null;
let currentPreset = 'off';
let currentVolume = 0.35;

try {
  const savedVol = localStorage.getItem('aktu_noise_vol');
  if (savedVol !== null) currentVolume = parseFloat(savedVol);
} catch (e) {}

function getContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function createBrownBuffer(ctx) {
  const sampleRate = ctx.sampleRate || 44100;
  const length = sampleRate * 4;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + (0.025 * white)) / 1.025;
    data[i] = lastOut * 3.6;
  }
  return buffer;
}

function createPinkBuffer(ctx) {
  const sampleRate = ctx.sampleRate || 44100;
  const length = sampleRate * 4;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.12;
    b6 = white * 0.115926;
  }
  return buffer;
}

function createTapeHissBuffer(ctx) {
  const sampleRate = ctx.sampleRate || 44100;
  const length = sampleRate * 4;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = 0.7 * last + 0.3 * white;
    data[i] = (white * 0.08 + last * 0.12);
  }
  return buffer;
}

export const noiseEngine = {
  getPreset: () => currentPreset,
  getVolume: () => currentVolume,

  setVolume: (val) => {
    currentVolume = Math.max(0, Math.min(1, val));
    if (gainNode && audioCtx) {
      gainNode.gain.setValueAtTime(currentVolume, audioCtx.currentTime);
    }
    if (musicAudio) {
      musicAudio.volume = currentVolume;
    }
    try {
      localStorage.setItem('aktu_noise_vol', currentVolume.toString());
    } catch(e) {}
    window.dispatchEvent(new CustomEvent('aktu_noise_update', { 
      detail: { preset: currentPreset, volume: currentVolume } 
    }));
  },

  stop: () => {
    if (currentSource) {
      try {
        currentSource.stop();
        currentSource.disconnect();
      } catch (e) {}
      currentSource = null;
    }
    if (musicAudio) {
      musicAudio.pause();
      musicAudio.src = '';
      musicAudio = null;
    }
    currentPreset = 'off';
    window.dispatchEvent(new CustomEvent('aktu_noise_update', { 
      detail: { preset: 'off', volume: currentVolume } 
    }));
  },

  play: (preset, audioUrl = null) => {
    if (preset === 'off') {
      noiseEngine.stop();
      return;
    }

    noiseEngine.stop();

    if (preset === 'music' || audioUrl) {
      window.dispatchEvent(new CustomEvent('aktu_noise_buffering', { detail: { preset } }));

      musicAudio = new Audio(audioUrl || 'https://stream.zeno.fm/f3wvbbqmdg8uv');
      musicAudio.loop = true;
      musicAudio.volume = currentVolume;

      musicAudio.onplaying = () => {
        window.dispatchEvent(new CustomEvent('aktu_noise_update', { 
          detail: { preset, volume: currentVolume } 
        }));
      };

      musicAudio.play().catch((err) => {
        console.log("Stream play error:", err);
        window.dispatchEvent(new CustomEvent('aktu_noise_update', { 
          detail: { preset: 'off', volume: currentVolume } 
        }));
      });

      currentPreset = preset;
      return;
    }

    const ctx = getContext();
    if (!ctx) return;

    let buffer = null;
    if (preset === 'brown') buffer = createBrownBuffer(ctx);
    else if (preset === 'pink') buffer = createPinkBuffer(ctx);
    else if (preset === 'tape' || preset === 'hiss') buffer = createTapeHissBuffer(ctx);

    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    if (!gainNode) {
      gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
    }

    gainNode.gain.setValueAtTime(currentVolume, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = preset === 'brown' ? 750 : preset === 'pink' ? 2200 : 4200;

    source.connect(filter);
    filter.connect(gainNode);

    source.start(0);
    currentSource = source;
    currentPreset = preset;

    window.dispatchEvent(new CustomEvent('aktu_noise_update', { 
      detail: { preset, volume: currentVolume } 
    }));
  }
};