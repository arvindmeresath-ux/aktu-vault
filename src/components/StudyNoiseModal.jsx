import { pushModalBack, popModalBack } from '../utils/modalHistory';
import React, { useEffect, useRef } from 'react';
import { getThemeModalStyle } from '../themes/themeRegistry';

const NOISE_PRESETS = [
  {
    id: 'brown',
    icon: '🌊',
    title: 'Deep Brown Noise',
    desc: 'Deep warm rumble (Best for heavy focus & loud rooms)',
  },
  {
    id: 'pink',
    icon: '🌧️',
    title: 'Soft Pink Noise',
    desc: 'Gentle rainfall cadence (Balanced study tone)',
  },
  {
    id: 'tape',
    icon: '📼',
    title: '90s Tape Hiss',
    desc: 'Vintage magnetic cassette room atmosphere',
  },
];

function createBrownNoiseBuffer(ctx) {
  const sampleRate = ctx.sampleRate || 44100;
  const length = sampleRate * 4;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5;
  }
  return buffer;
}

function createPinkNoiseBuffer(ctx) {
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
  let a = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    a = 0.7 * a + 0.3 * white;
    data[i] = white * 0.08 + a * 0.12;
  }
  return buffer;
}

export function useStudyAmbienceAudio(preset, volume) {
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);
  const sourceNodeRef = useRef(null);

  useEffect(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }

    if (!preset || preset === 'off') {
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    let buffer = null;
    if (preset === 'brown') buffer = createBrownNoiseBuffer(ctx);
    else if (preset === 'pink') buffer = createPinkNoiseBuffer(ctx);
    else if (preset === 'tape') buffer = createTapeHissBuffer(ctx);

    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    if (!gainNodeRef.current) {
      gainNodeRef.current = ctx.createGain();
      gainNodeRef.current.connect(ctx.destination);
    }

    const normalizedVol = Math.max(0, Math.min(1, volume / 100));
    gainNodeRef.current.gain.setValueAtTime(normalizedVol, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = preset === 'brown' ? 750 : preset === 'pink' ? 2200 : 4200;

    source.connect(filter);
    filter.connect(gainNodeRef.current);
    source.start(0);

    sourceNodeRef.current = source;

    return () => {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    };
  }, [preset]);

  useEffect(() => {
    const normalizedVol = Math.max(0, Math.min(1, volume / 100));
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(normalizedVol, audioCtxRef.current.currentTime);
    }
    try {
      localStorage.setItem('aktu_noise_vol', normalizedVol.toString());
    } catch {}
  }, [volume]);
}

export default function StudyNoiseModal({
  isOpen,
  onClose,
  preset,
  onSelectPreset,
  volume,
  onChangeVolume,
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

  const presetShortNames = {
    brown: 'Brown Noise',
    pink: 'Pink Noise',
    tape: 'Tape Hiss',
  };

  const baseSt = getThemeModalStyle(activeTheme);
  const isModernDark = activeTheme === 'modern-dark';
  const st =
    activeTheme === 'win98-hc' || activeTheme === 'win98'
      ? {
          windowBg:
            'bg-[#c0c0c0] text-black border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl rounded-none font-mono',
          noiseHeaderBg:
            'bg-gradient-to-r from-[#000080] to-[#1084d0] text-white border-b border-black',
          bodyBg: 'bg-[#c0c0c0] text-black',
          cardBg:
            'bg-white text-black border-2 border-t-black border-l-black border-b-white border-r-white rounded-none',
          cardHover: 'hover:bg-[#e8eef7]',
          cardActive:
            'bg-[#000080] text-white border-2 border-t-black border-l-black border-b-white border-r-white rounded-none',
          subText: 'text-zinc-700',
          badgeBg:
            'bg-[#c0c0c0] text-black border border-t-white border-l-white border-b-black border-r-black rounded-none',
          accentColor: 'accent-[#000080]',
          dangerBtn:
            'bg-[#c0c0c0] text-black border-2 border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black active:border-b-white active:border-r-white rounded-none',
          primaryBtn:
            'bg-[#c0c0c0] text-black border-2 border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black active:border-b-white active:border-r-white rounded-none font-bold',
        }
      : isModernDark
        ? {
            windowBg:
              'bg-[#0b1220] text-slate-100 border border-[#38bdf844] rounded-2xl shadow-[0_0_40px_rgba(56,189,248,0.16)] font-sans',
            noiseHeaderBg:
              'bg-[#0f1c2e] text-[#38bdf8] border-b border-white/10',
            bodyBg: 'bg-[#0b1220] text-slate-100',
            cardBg:
              'bg-[#111b2e] text-slate-100 border border-white/10 rounded-xl',
            cardHover: 'hover:bg-[#16243d] hover:border-[#38bdf855]',
            cardActive:
              'bg-[#13283c] text-[#facc15] border border-[#38bdf8] rounded-xl shadow-[0_0_18px_rgba(56,189,248,0.22)]',
            subText: 'text-slate-400',
            badgeBg:
              'bg-[#08101d] text-[#38bdf8] border border-[#38bdf855] rounded-lg',
            accentColor: 'accent-[#38bdf8]',
            dangerBtn:
              'bg-[#28131a] hover:bg-[#3f1924] text-[#fda4af] border border-[#f43f5e44] rounded-xl transition-colors',
            primaryBtn:
              'bg-[#0ea5e9] hover:bg-[#38bdf8] text-[#06101d] rounded-xl shadow-[0_0_16px_rgba(56,189,248,0.4)] transition-all',
          }
        : baseSt;

  return (
    <>
      {preset && preset !== 'off' && (
        <div className="fixed bottom-4 right-4 z-[115] flex items-center bg-[#18181b] border-2 border-[#f59e0b] rounded-full shadow-[4px_4px_0px_#000] overflow-hidden select-none animate-pulse hover:[animation:none]">
          <button
            type="button"
            onClick={() => {
              if (typeof window.__aktuOpenNoiseModal === 'function') {
                window.__aktuOpenNoiseModal();
              }
            }}
            className="px-3.5 py-1.5 flex items-center gap-2 font-mono font-bold text-xs !text-[#fde68a] hover:bg-zinc-800 cursor-pointer transition-colors"
            title="Open Study Ambience Settings"
          >
            <span>🎧</span>
            <span>
              {presetShortNames[preset] || 'Noise'} ({volume}%)
            </span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectPreset('off');
            }}
            className="pr-3 pl-1.5 py-1.5 font-mono font-black text-xs !text-zinc-400 hover:!text-white cursor-pointer transition-colors"
            title="Stop Study Ambience"
          >
            ✕
          </button>
        </div>
      )}

      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-[130] bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-[450px] overflow-hidden flex flex-col ${st.windowBg}`}
          >
            <div className={`px-4 py-2.5 flex items-center justify-between ${st.noiseHeaderBg}`}>
              <div className="flex items-center gap-2">
                <span>🎧</span>
                <span className="font-mono font-black text-xs sm:text-sm tracking-wide">
                  {isModernDark ? 'Study Ambience • Acoustic Shield' : 'NOISE.EXE - Study Ambience'}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={`w-6 h-6 flex items-center justify-center font-black text-xs cursor-pointer ${st.dangerBtn}`}
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>

            <div className={`p-3.5 flex flex-col gap-2.5 ${st.bodyBg}`}>
              <div className={`p-2.5 text-center ${st.cardBg}`}>
                <div className="font-mono font-black text-xs sm:text-sm">
                  Acoustic Shield Synthesizer
                </div>
                <div className={`font-mono text-[11px] font-semibold mt-1 leading-snug ${st.subText}`}>
                  Masks hostel noise &amp; deepens focus during exam prep. 100% offline math synthesis (0 bytes network).
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {NOISE_PRESETS.map((item) => {
                  const isSelected = preset === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectPreset(isSelected ? 'off' : item.id)}
                      className={`w-full text-left p-3 transition-all cursor-pointer ${
                        isSelected ? st.cardActive : `${st.cardBg} ${st.cardHover}`
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span>{item.icon}</span>
                          <span className="font-mono font-black text-xs sm:text-sm">
                            {item.title}
                          </span>
                        </div>
                        <span className={`font-mono font-black text-[10px] px-2 py-0.5 ${st.badgeBg}`}>
                          {isSelected ? '● ACTIVE' : '○ SELECT'}
                        </span>
                      </div>
                      <div className={`font-mono text-[11px] font-semibold mt-1 ${isSelected ? 'opacity-90' : st.subText}`}>
                        {item.desc}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className={`p-3 ${st.cardBg}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-black text-xs flex items-center gap-1.5">
                    <span>{preset === 'off' || volume === 0 ? '🔇' : '🔊'}</span>
                    <span>Volume</span>
                  </span>
                  <span className="font-mono font-black text-xs">{volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => onChangeVolume(Number(e.target.value))}
                  className={`w-full cursor-pointer h-2 rounded-lg ${st.accentColor}`}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => onSelectPreset('off')}
                  disabled={preset === 'off'}
                  className={`px-3 py-1.5 font-mono font-black text-xs disabled:opacity-50 cursor-pointer ${st.dangerBtn}`}
                >
                  ■ Mute Noise
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-5 py-1.5 font-mono font-black text-xs cursor-pointer ${st.primaryBtn}`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}