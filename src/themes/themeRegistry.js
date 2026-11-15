import NeoBrutalEngine from './NeoBrutal/NeoBrutalEngine';
import Win98Engine from './Win98/Win98Engine';
import ModernDarkEngine from './ModernDark/ModernDarkEngine';
import CrtGlowEngine from './CrtGlow/CrtGlowEngine';
import DarkAcademiaEngine from './DarkAcademia/DarkAcademiaEngine';
import KawaiiBentoEngine from './KawaiiBento/KawaiiBentoEngine';

export const THEMES_REGISTRY = [
  {
    id: 'neo-brutal',
    name: 'Neo-Brutalism',
    tag: 'Pastel & Bold Cards',
    icon: '🧸',
    status: 'active'
  },
  {
    id: 'win98',
    name: 'Windows 98',
    tag: 'Classic Retro UI',
    icon: '🖥️',
    status: 'active'
  },
  {
    id: 'modern-dark',
    name: 'Modern Dark',
    tag: 'Sleek & Minimalist',
    icon: '⚡',
    status: 'active'
  },
  {
    id: 'crt-glow',
    name: 'CRT Glow',
    tag: 'Terminal & Scanlines',
    icon: '📺',
    status: 'active'
  },
  {
    id: 'dark-academia',
    name: 'Dark Academia',
    tag: 'Classic Paper & Serif',
    icon: '✒️',
    status: 'active'
  },
  {
    id: 'kawaii-bento',
    name: 'Kawaii Bento',
    tag: 'Cute & Aesthetic',
    icon: '🍱',
    status: 'active'
  }
];

export const THEME_REGISTRY = {
  'neo-brutal': {
    name: 'Neo-Brutalism',
    component: NeoBrutalEngine
  },
  'win98': {
    name: 'Windows 98',
    component: Win98Engine
  },
  'modern-dark': {
    name: 'Modern Dark',
    component: ModernDarkEngine
  },
  'crt-glow': {
    name: 'CRT Glow',
    component: CrtGlowEngine
  },
  'dark-academia': {
    name: 'Dark Academia',
    component: DarkAcademiaEngine
  },
  'kawaii-bento': {
    name: 'Kawaii Bento',
    component: KawaiiBentoEngine
  }
};

export function getThemeModalStyle(activeTheme) {
  return {
    bg: 'bg-white',
    border: 'border-black border-[3px]',
    shadow: 'shadow-[5px_5px_0px_#000]',
    text: 'text-black',
    accent: 'bg-[#bae6fd]'
  };
}