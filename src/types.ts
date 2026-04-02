export type FastStatus = 'fasting' | 'eating' | 'idle';

export interface FastRecord {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
  targetDuration: number; // in seconds
  completed: boolean;
  createdAt?: any; // Firestore timestamp
}

export interface CurrentFastState {
  startTime: number | null;
  endTime: number | null;
  status: FastStatus;
  targetHours: number;
  targetEndTime?: number | null; // Specific time to end the fast
  pausedAt: number | null;
  totalPausedTime: number; // in milliseconds
  height?: number; // in cm
  weight?: number; // in kg
  accentColor?: string;
}

export interface MealRecord {
  id: string;
  time: number;
  scale: 'light' | 'normal' | 'large';
  description?: string;
  barcode?: string;
  createdAt?: any;
}

export interface WorkoutRecord {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // calculated in minutes
  intensity: 'low' | 'moderate' | 'high';
  createdAt?: any;
}

export interface SleepRecord {
  id: string;
  bedtime: number;
  wakeUpTime: number;
  duration: number; // calculated in hours
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  createdAt?: any;
}
