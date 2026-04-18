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
  sex?: 'male' | 'female' | 'other';
  age?: number;
  waterGoal?: number; // in ml
  accentColor?: string;
  notificationsEnabled?: boolean;
  waterReminderEnabled?: boolean;
  waterReminderInterval?: number; // in hours
  waterReminderStartHour?: number; // 0-23
  waterReminderEndHour?: number; // 0-23
  waterPresets?: number[];
}

export interface MealRecord {
  id: string;
  time: number;
  scale: 'light' | 'normal' | 'large';
  description?: string;
  barcode?: string;
  createdAt?: any;
}

export type WorkoutIntensity = 'low' | 'moderate' | 'high';
export type WorkoutType = 'cardio' | 'strength' | 'running' | 'walking' | 'swimming' | 'cycling' | 'sports' | 'home' | 'custom';

export interface WorkoutRecord {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // calculated in minutes
  intensity: WorkoutIntensity;
  type: WorkoutType;
  description?: string;
  calorieBurn?: number;
  parsedExercises?: string[];
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

export interface WaterRecord {
  id: string;
  time: number;
  amount: number; // in ml
  createdAt?: any;
}

export interface WeightRecord {
  id: string;
  time: number;
  weight: number; // in kg
  note?: string;
  createdAt?: any;
}

export interface Supplement {
  id: string;
  name: string;
  dosage: string;
  frequency: 'daily' | 'weekly' | 'custom';
  preferredTime: 'any' | 'morning' | 'evening' | 'with-meal' | 'before-bed';
  reminderEnabled: boolean;
  reminderTime?: string; // HH:mm
  createdAt?: any;
}

export interface SupplementLog {
  id: string;
  supplementId: string;
  time: number;
  taken: boolean;
  createdAt?: any;
}

export interface DailySummary {
  id?: string;
  date: string; // YYYY-MM-DD
  intake: number;
  burn: number;
  waterTotal: number;
  waterGoal: number;
  isDeficit: boolean;
  isWaterGoalMet: boolean;
  createdAt: any;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  category: 'water' | 'weight' | 'sleep' | 'workout';
  threshold: number;
  icon: string;
  achieved: boolean;
  progress: number;
}

export interface AIInsight {
  category: string;
  title: string;
  content: string;
  impact: 'positive' | 'neutral' | 'improvement';
  messages?: { role: 'user' | 'model'; text: string }[];
}

export interface CalorieGuess {
  amount: number;
  reasoning: string;
  macros?: {
    protein: number;
    carbs: number;
    fats: number;
  };
}

export interface CaloriesBurned {
  amount: number;
  reasoning: string;
}

export interface AIInsightsSync {
  insights: AIInsight[];
  calorieGuess: CalorieGuess | null;
  caloriesBurned: CaloriesBurned | null;
  lastRefreshed: number | null;
}
