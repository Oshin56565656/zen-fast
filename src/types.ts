export type FastStatus = 'fasting' | 'eating' | 'idle';

export interface FastingMode {
  id: string;
  name: string;
  fastHours: number;
  eatHours: number;
  description: string;
}

export interface FastRecord {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
  targetDuration: number; // in seconds
  modeId: string;
  modeName: string;
  completed: boolean;
}

export interface CurrentFastState {
  startTime: number | null;
  endTime: number | null;
  status: FastStatus;
  modeId: string;
  pausedAt: number | null;
  totalPausedTime: number; // in milliseconds
}

export const FASTING_MODES: FastingMode[] = [
  { id: '16-8', name: '16:8', fastHours: 16, eatHours: 8, description: 'Leangains - Most popular' },
  { id: '18-6', name: '18:6', fastHours: 18, eatHours: 6, description: 'The Warrior Diet lite' },
  { id: '20-4', name: '20:4', fastHours: 20, eatHours: 4, description: 'The Warrior Diet' },
  { id: '23-1', name: 'OMAD', fastHours: 23, eatHours: 1, description: 'One Meal A Day' },
  { id: '24-0', name: '24h', fastHours: 24, eatHours: 0, description: 'Full day fast' },
];
