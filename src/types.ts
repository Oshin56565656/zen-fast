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
  pausedAt: number | null;
  totalPausedTime: number; // in milliseconds
}

export interface MealRecord {
  id: string;
  time: number;
  scale: 'snack' | 'normal' | 'large';
  createdAt?: any;
}

export interface WorkoutRecord {
  id: string;
  time: number;
  duration: number; // in minutes
  intensity: 'low' | 'moderate' | 'high';
  createdAt?: any;
}
