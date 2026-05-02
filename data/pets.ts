export type PetAnimation =
  | 'idle'
  | 'running'
  | 'waiting'
  | 'review'
  | 'failed'
  | 'waving'
  | 'jumping'
  | 'completed';

export interface PetColors {
  body: string;
  accent: string;
  eye: string;
  shine: string;
}

export interface Pet {
  id: string;
  name: string;
  emoji: string;
  description: string;
  colors: PetColors;
  spritesheetPath?: string; // path to custom 1536x1872 WebP atlas
}

// 8 built-in pets — pixel-art-style chibi mascots
export const BUILT_IN_PETS: Pet[] = [
  {
    id: 'bit',
    name: 'Bit',
    emoji: '🤖',
    description: 'A dependable blue robot who loves clean code',
    colors: { body: '#3291ff', accent: '#0070f3', eye: '#ffffff', shine: '#7dc4ff' },
  },
  {
    id: 'sparky',
    name: 'Sparky',
    emoji: '⚡',
    description: 'A zippy yellow cat who ships fast',
    colors: { body: '#f5a623', accent: '#e07b00', eye: '#1a1a1a', shine: '#ffd080' },
  },
  {
    id: 'glitch',
    name: 'Glitch',
    emoji: '👾',
    description: 'A green ghost who thrives in edge cases',
    colors: { body: '#00c16a', accent: '#008a4a', eye: '#ffffff', shine: '#80ffb8' },
  },
  {
    id: 'pixel',
    name: 'Pixel',
    emoji: '🐉',
    description: 'A tiny purple dragon who breathes TypeScript',
    colors: { body: '#9b59b6', accent: '#6c3483', eye: '#f0e6ff', shine: '#cc99ff' },
  },
  {
    id: 'nano',
    name: 'Nano',
    emoji: '🔶',
    description: 'A curious orange nanobot always exploring',
    colors: { body: '#e17055', accent: '#b33d24', eye: '#fff8f0', shine: '#ffaa88' },
  },
  {
    id: 'byte',
    name: 'Byte',
    emoji: '🦉',
    description: 'A wise grey owl who reviews every PR',
    colors: { body: '#888888', accent: '#444444', eye: '#f5a623', shine: '#cccccc' },
  },
  {
    id: 'rust',
    name: 'Rustie',
    emoji: '🦀',
    description: 'A sturdy red crab who never panics',
    colors: { body: '#e00000', accent: '#900000', eye: '#ffffff', shine: '#ff6666' },
  },
  {
    id: 'nova',
    name: 'Nova',
    emoji: '✨',
    description: 'A pink star who lights up dark mode',
    colors: { body: '#e91e8c', accent: '#a0125e', eye: '#fff0f8', shine: '#ff80c8' },
  },
];

export const DEFAULT_PET_ID = 'bit';
