import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { noiseEngine } from './noiseEngine';

export default function NoiseDialog({ isOpen, onClose }) {
  const [activePreset, setActivePreset] = useState(() => noiseEngine.getPreset());
  const [volume, setVolume] = useState(() => noiseEngine.getVolume());

  useEffect(() => {
    const onUpdate = (e) => {
      setActivePreset(e.detail.preset);
      setVolume(e.detail.volume);
    };
    window.addEventListener('aktu_noise_update', onUpdate);
    return () => window.removeEventListener('aktu_noise_update', onUpdate);
  }, []);

  if (!isOpen) return null;

  const handleSelect = (preset, url = null) => {
    if (activePreset === preset) {
      noiseEngine.stop();
    } else {
      noiseEngine.play(preset, url);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    noiseEngine.setVolume(val);
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[100001] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 select-none"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#c0c0c0] border-2 border-t-white border-l-white border-b-black border-r-black shadow-2xl flex flex-col font-mono text-black animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="bg-gradient-to-r from-[#000080] to-[#1084d0] text-white px-2 py-1 flex items-center justify-between font-bold text-xs">
          <div className="flex items-center gap-1.5">
            <span>🎧</span>
            <span>NOISE.EXE - Study Ambience & Music</span>
          </div>
          <button 
            onClick={onClose}
            className="w-4 h-4 bg-[#c0c0c0] text-black border border-t-white border-l-white border-b-black border-r-black flex items-center justify-center font-bold text-[9px] cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-3 flex flex-col gap-3">
          <div className="bg-white border-2 border-t-black border-l-black border-b-white border-r-white p-2 text-[11px] leading-relaxed text-gray-800">
            <p className="font-bold text-black">Acoustic Shield & Music Pipeline</p>
            <p className="text-[10px] text-gray-600">Mask hostel noise with synthetic ambience or stream live study music.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            {[
              { id: 'brown', title: '🌊 Deep Brown Noise', desc: 'Deep warm rumble for heavy focus' },
              { id: 'pink',  title: '🌧️ Soft Pink Noise',  desc: 'Gentle rainfall cadence tone' },
              { id: 'tape',  title: '📼 90s Tape Hiss',    desc: 'Vintage cassette room atmosphere' },
              { id: 'music', title: '🎵 Lofi Study Radio', desc: 'Continuous ambient music stream pipeline', url: 'https://stream.zeno.fm/f3wvbbqmdg8uv' },
            ].map(p => {
              const isSelected = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id, p.url)}
                  className={`p-2 text-left border-2 cursor-pointer transition-all flex flex-col ${
                    isSelected
                      ? 'bg-[#000080] text-white border-t-black border-l-black border-b-white border-r-white shadow-inner'
                      : 'bg-[#d4d0c8] text-black border-t-white border-l-white border-b-black border-r-black hover:bg-white active:border-t-black active:border-l-black'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{p.title}</span>
                    <span>{isSelected ? '● ACTIVE' : '○ SELECT'}</span>
                  </div>
                  <span className={`text-[9px] mt-0.5 ${isSelected ? 'text-gray-300' : 'text-gray-600'}`}>
                    {p.desc}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bg-[#dcdcdc] border border-gray-400 p-2 flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="flex items-center gap-1">
                {activePreset === 'off' ? <VolumeX size={13} /> : <Volume2 size={13} />}
                <span>Volume</span>
              </span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input 
              type="range" 
              min="0.05" 
              max="1.0" 
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-full cursor-pointer accent-[#000080]"
            />
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-gray-400">
            <button
              onClick={() => noiseEngine.stop()}
              disabled={activePreset === 'off'}
              className="px-3 py-1 bg-[#c0c0c0] text-xs font-bold border-2 border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black disabled:opacity-50 cursor-pointer"
            >
              ⏹ Mute Audio
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1 bg-[#000080] text-white text-xs font-bold border-2 border-t-white border-l-white border-b-black border-r-black active:border-t-black active:border-l-black cursor-pointer shadow-sm"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}[cite: 21]