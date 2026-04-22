import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Utensils, Dumbbell, Plus, Trash2, Clock, Scale, Moon, Camera, Scan, Droplets, LineChart, Mic, MicOff, Sparkles, MapPin, Play, X, RefreshCw, Pill, Heart, Zap, Smile, Frown, Meh, Sun, CloudRain, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatTime, formatDate, formatDurationShort } from '../lib/utils';
import { format, subHours, addMinutes, isSameDay } from 'date-fns';
import { AnimatePresence } from 'motion/react';
import BarcodeScanner from './BarcodeScanner';
import { Supplements } from './Supplements';
import { parseWorkoutText, estimateMealCalories } from '../services/aiService';
import { GoogleGenAI } from "@google/genai";
import { Supplement, SupplementLog, MealRecord, WorkoutRecord, SleepRecord, WaterRecord, WeightRecord, WorkoutType, WorkoutIntensity, FastRecord, MoodRecord, MoodScore, EnergyLevel } from '../types';

interface LogActivityProps {
  history: FastRecord[];
  meals: MealRecord[];
  workouts: WorkoutRecord[];
  sleep: SleepRecord[];
  water: WaterRecord[];
  weights: WeightRecord[];
  supplements: Supplement[];
  supplementLogs: SupplementLog[];
  moods: MoodRecord[];
  waterGoal: number;
  waterPresets?: number[];
  onLogMeal: (time: number, scale: 'light' | 'normal' | 'large', description?: string, barcode?: string) => void;
  onLogWorkout: (startTime: number, endTime: number, intensity: WorkoutIntensity, type: WorkoutType, description?: string, calorieBurn?: number, parsedExercises?: string[]) => void;
  onLogSleep: (bedtime: number, wakeUpTime: number, quality: 'poor' | 'fair' | 'good' | 'excellent') => void;
  onLogWater: (time: number, amount: number) => void;
  onLogWeight: (time: number, weight: number, note?: string) => void;
  onLogMood: (mood: MoodScore, energy: EnergyLevel, time: number, note?: string, tags?: string[]) => void;
  onAddSupplement: (s: Omit<Supplement, 'id' | 'createdAt'>) => void;
  onUpdateSupplement: (id: string, s: Partial<Supplement>) => void;
  onDeleteSupplement: (id: string) => void;
  onLogSupplement: (supplementId: string, time: number, taken: boolean) => void;
  onDeleteSupplementLog: (id: string) => void;
  onDeleteMeal: (id: string) => void;
  onDeleteWorkout: (id: string) => void;
  onDeleteSleep: (id: string) => void;
  onDeleteWater: (id: string) => void;
  onDeleteWeight: (id: string) => void;
  onDeleteMood: (id: string) => void;
  onUpdateMeal: (id: string, updates: Partial<MealRecord>) => void;
  onUpdateWorkout: (id: string, updates: Partial<WorkoutRecord>) => void;
  onUpdateSleep: (id: string, updates: Partial<SleepRecord>) => void;
  onUpdateWater: (id: string, updates: Partial<WaterRecord>) => void;
  onUpdateWeight: (id: string, updates: Partial<WeightRecord>) => void;
  onUpdateSupplementLog: (id: string, updates: Partial<SupplementLog>) => void;
  onUpdateMood: (id: string, updates: Partial<MoodRecord>) => void;
}

const LogActivity: React.FC<LogActivityProps> = ({
  history,
  meals,
  workouts,
  sleep,
  water,
  weights,
  supplements,
  supplementLogs,
  moods,
  waterGoal,
  waterPresets = [100, 150, 250, 300],
  onLogMeal,
  onLogWorkout,
  onLogSleep,
  onLogWater,
  onLogWeight,
  onLogMood,
  onAddSupplement,
  onUpdateSupplement,
  onDeleteSupplement,
  onLogSupplement,
  onDeleteSupplementLog,
  onDeleteMeal,
  onDeleteWorkout,
  onDeleteSleep,
  onDeleteWater,
  onDeleteWeight,
  onDeleteMood,
  onUpdateMeal,
  onUpdateWorkout,
  onUpdateSleep,
  onUpdateWater,
  onUpdateWeight,
  onUpdateSupplementLog,
  onUpdateMood
}) => {
  const [activeType, setActiveType] = useState<'water' | 'meal' | 'workout' | 'sleep' | 'weight' | 'supplements' | 'mood'>('water');
  const [searchDate, setSearchDate] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<{ type: string; data: any } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<any>(null);

  const tabContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleTabScroll = () => {
    if (tabContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabContainerRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabContainerRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      tabContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  React.useEffect(() => {
    handleTabScroll();
    const container = tabContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleTabScroll);
      window.addEventListener('resize', handleTabScroll);
      return () => {
        container.removeEventListener('scroll', handleTabScroll);
        window.removeEventListener('resize', handleTabScroll);
      };
    }
  }, []);

  // Water Form State
  const [waterAmount, setWaterAmount] = useState(250);
  const [customWater, setCustomWater] = useState('');

  // Calculate today's water for the progress bar
  const todayWater = water
    .filter(w => {
      const d = new Date(w.time);
      const today = new Date();
      return d.getDate() === today.getDate() && 
             d.getMonth() === today.getMonth() && 
             d.getFullYear() === today.getFullYear();
    })
    .reduce((acc, curr) => acc + curr.amount, 0);

  const remainingWater = Math.max(0, waterGoal - todayWater);
  const waterPercentage = (remainingWater / waterGoal) * 100;

  // Meal Form State
  const [mealScale, setMealScale] = useState<'light' | 'normal' | 'large'>('normal');
  const [mealTime, setMealTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [isMealTimeDirty, setIsMealTimeDirty] = useState(false);
  const [mealDescription, setMealDescription] = useState('');
  const [mealCalories, setMealCalories] = useState<string>('');
  const [isEstimatingMealCalories, setIsEstimatingMealCalories] = useState(false);
  const [mealBarcode, setMealBarcode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const recognitionRef = useRef<any>(null);

  // Workout Form State
  const [workoutIntensity, setWorkoutIntensity] = useState<WorkoutIntensity>('moderate');
  const [workoutType, setWorkoutType] = useState<WorkoutType>('cardio');
  const [workoutStartTime, setWorkoutStartTime] = useState(format(subHours(new Date(), 0.5), "yyyy-MM-dd'T'HH:mm"));
  const [isWorkoutStartTimeDirty, setIsWorkoutStartTimeDirty] = useState(false);
  const [workoutEndTime, setWorkoutEndTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [isWorkoutEndTimeDirty, setIsWorkoutEndTimeDirty] = useState(false);
  const [workoutDescription, setWorkoutDescription] = useState('');
  const [workoutCalorieBurn, setWorkoutCalorieBurn] = useState<number | undefined>(undefined);
  const [workoutParsedExercises, setWorkoutParsedExercises] = useState<string[]>([]);
  const [showWorkoutAI, setShowWorkoutAI] = useState(false);
  const [workoutAIInput, setWorkoutAIInput] = useState('');
  const [isParsingWorkout, setIsParsingWorkout] = useState(false);
  const [aiParsedResult, setAiParsedResult] = useState<any>(null);
  const [hasAIKey, setHasAIKey] = useState<boolean>(true);

  React.useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.aistudio) {
        // @ts-ignore
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasAIKey(selected || !!process.env.GEMINI_API_KEY || !!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleAIImport = async () => {
    if (!workoutAIInput.trim() || isParsingWorkout) return;
    setIsParsingWorkout(true);
    try {
      const result = await parseWorkoutText(workoutAIInput);
      if (result) {
        if (result.startTime) {
          const parsedDate = new Date(result.startTime);
          if (!isNaN(parsedDate.getTime())) {
            setWorkoutStartTime(format(parsedDate, "yyyy-MM-dd'T'HH:mm"));
            setIsWorkoutStartTimeDirty(true);
            
            if (result.duration) {
              const endTime = addMinutes(parsedDate, result.duration);
              setWorkoutEndTime(format(endTime, "yyyy-MM-dd'T'HH:mm"));
              setIsWorkoutEndTimeDirty(true);
            }
          }
        }
        
        const normalizedType = result.type ? result.type.toLowerCase() as WorkoutType : workoutType;
        const validTypes: WorkoutType[] = ['cardio', 'strength', 'running', 'walking', 'swimming', 'cycling', 'sports', 'home', 'custom'];
        const finalType = validTypes.includes(normalizedType) ? normalizedType : 'custom';
        
        const normalizedIntensity = result.intensity ? result.intensity.toLowerCase() as WorkoutIntensity : workoutIntensity;
        const validIntensities: WorkoutIntensity[] = ['low', 'moderate', 'high'];
        const finalIntensity = validIntensities.includes(normalizedIntensity) ? normalizedIntensity : 'moderate';

        if (result.type) setWorkoutType(finalType);
        if (result.intensity) setWorkoutIntensity(finalIntensity);
        if (result.calorieBurn) setWorkoutCalorieBurn(result.calorieBurn);
        if (result.exercises) setWorkoutParsedExercises(result.exercises);
        
        let finalStartTime = new Date(workoutStartTime).getTime();
        let finalEndTime = new Date(workoutEndTime).getTime();
        
        if (result.startTime) {
          const parsedDate = new Date(result.startTime);
          if (!isNaN(parsedDate.getTime())) {
            finalStartTime = parsedDate.getTime();
            if (result.duration) {
              finalEndTime = addMinutes(parsedDate, result.duration).getTime();
            }
          }
        }

        const parsedData = {
          startTime: finalStartTime,
          endTime: finalEndTime,
          intensity: finalIntensity,
          type: finalType,
          description: workoutAIInput,
          calorieBurn: result.calorieBurn,
          exercises: result.exercises,
          title: result.title || 'Workout'
        };

        setAiParsedResult(parsedData);
      }
    } catch (error) {
      console.error('AI Import Error:', error);
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-2xl z-[200] animate-in fade-in slide-in-from-top-4';
      toast.innerText = 'Failed to parse workout. Please check your text format.';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    } finally {
      setIsParsingWorkout(false);
    }
  };

  const handleConfirmAiLog = () => {
    if (!aiParsedResult) return;

    // Adjust calories based on intensity change
    let finalCalorieBurn = aiParsedResult.calorieBurn || 0;
    if (workoutIntensity !== aiParsedResult.intensity) {
      const multipliers: Record<WorkoutIntensity, number> = {
        low: 0.7,
        moderate: 1.0,
        high: 1.4
      };
      
      const originalMultiplier = multipliers[aiParsedResult.intensity as WorkoutIntensity] || 1.0;
      const newMultiplier = multipliers[workoutIntensity] || 1.0;
      
      // Calculate adjusted calories: (Original / Original Multiplier) * New Multiplier
      finalCalorieBurn = Math.round((finalCalorieBurn / originalMultiplier) * newMultiplier);
    }

    onLogWorkout(
      aiParsedResult.startTime,
      aiParsedResult.endTime,
      workoutIntensity,
      workoutType,
      aiParsedResult.description,
      finalCalorieBurn,
      aiParsedResult.exercises
    );
    setShowWorkoutAI(false);
    setWorkoutAIInput('');
    setAiParsedResult(null);
    setWorkoutCalorieBurn(undefined);
    setWorkoutParsedExercises([]);

    // Show success toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-24 left-1/2 -translate-x-1/2 bg-primary text-white px-8 py-4 rounded-[2rem] shadow-2xl z-[200] flex flex-col items-center space-y-1 text-center transform transition-all duration-500 ease-out opacity-0 translate-y-4';
    toast.innerHTML = `
      <div class="flex items-center space-x-2">
        <div class="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
          <span class="text-sm">💪</span>
        </div>
        <p class="text-[10px] font-bold uppercase tracking-[0.2em]">Workout Logged</p>
      </div>
      <div class="flex flex-col items-center">
        <p class="text-xs font-black tracking-tight">${workoutIntensity} Intensity Logged</p>
        <p class="text-[10px] opacity-60">Estimated: ${finalCalorieBurn} kcal</p>
      </div>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('opacity-0', 'translate-y-4'));
    setTimeout(() => {
      toast.classList.add('opacity-0', '-translate-y-4');
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  };

  // Sleep Form State
  const [sleepQuality, setSleepQuality] = useState<'poor' | 'fair' | 'good' | 'excellent'>('good');
  const [bedtime, setBedtime] = useState(format(subHours(new Date(), 8), "yyyy-MM-dd'T'HH:mm"));
  const [isBedtimeDirty, setIsBedtimeDirty] = useState(false);
  const [wakeUpTime, setWakeUpTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [isWakeUpTimeDirty, setIsWakeUpTimeDirty] = useState(false);

  // Weight Form State
  const [weightValue, setWeightValue] = useState<string>('');
  const [weightNote, setWeightNote] = useState('');
  const [weightTime, setWeightTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [isWeightTimeDirty, setIsWeightTimeDirty] = useState(false);

  // Mood Form State
  const [moodScore, setMoodScore] = useState<MoodScore>(3);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(3);
  const [moodNote, setMoodNote] = useState('');
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [moodTime, setMoodTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [isMoodTimeDirty, setIsMoodTimeDirty] = useState(false);

  React.useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
    }
  }, []);

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    setRetryCount(0);
    startRecognition(0);
  };

  const startRecognition = (currentRetry: number) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMealDescription(prev => prev ? `${prev} ${transcript}` : transcript);
      setIsListening(false);
      setRetryCount(0);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error === 'network' && currentRetry < 2) {
        setRetryCount(currentRetry + 1);
        const toast = document.createElement('div');
        toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full font-bold text-sm shadow-2xl z-[200] flex items-center space-x-3';
        toast.innerHTML = `<span>Retrying connection... (${currentRetry + 1}/2)</span>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1000);
        
        setTimeout(() => {
          startRecognition(currentRetry + 1);
        }, 1000);
        return;
      }

      let message = 'Voice recognition failed. Please try again.';
      if (event.error === 'network') {
        message = 'Network error. Voice recognition is restricted in some preview environments.';
      } else if (event.error === 'not-allowed') {
        message = 'Microphone access denied. Please check your browser permissions.';
      } else if (event.error === 'no-speech') {
        message = 'No speech detected. Please try speaking again.';
      }

      const toast = document.createElement('div');
      toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-2xl z-[200] flex flex-col items-center space-y-2';
      
      const isIframe = window.self !== window.top;
      
      toast.innerHTML = `
        <div class="flex items-center space-x-3">
          <span>${message}</span>
          ${event.error === 'network' ? '<button onclick="window.location.reload()" class="bg-white/20 px-2 py-1 rounded text-[10px] uppercase font-black">Reload</button>' : ''}
        </div>
        ${isIframe && event.error === 'network' ? `
          <button onclick="window.open(window.location.href, '_blank')" class="bg-white text-red-500 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-white/90 transition-colors">
            Open in New Tab to Fix
          </button>
        ` : ''}
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
        setTimeout(() => toast.remove(), 500);
      }, 6000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error('Recognition start failed:', e);
      setIsListening(false);
    }
  };

  // Live Time Updates
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      if (!isMealTimeDirty) setMealTime(format(now, "yyyy-MM-dd'T'HH:mm"));
      if (!isWorkoutStartTimeDirty) setWorkoutStartTime(format(subHours(now, 0.5), "yyyy-MM-dd'T'HH:mm"));
      if (!isWorkoutEndTimeDirty) setWorkoutEndTime(format(now, "yyyy-MM-dd'T'HH:mm"));
      if (!isBedtimeDirty) setBedtime(format(subHours(now, 8), "yyyy-MM-dd'T'HH:mm"));
      if (!isWakeUpTimeDirty) setWakeUpTime(format(now, "yyyy-MM-dd'T'HH:mm"));
      if (!isWeightTimeDirty) setWeightTime(format(now, "yyyy-MM-dd'T'HH:mm"));
      if (!isMoodTimeDirty) setMoodTime(format(now, "yyyy-MM-dd'T'HH:mm"));
    }, 1000);
    return () => clearInterval(interval);
  }, [isMealTimeDirty, isWorkoutStartTimeDirty, isWorkoutEndTimeDirty, isBedtimeDirty, isWakeUpTimeDirty, isWeightTimeDirty, isMoodTimeDirty]);

  const handleEstimateMealCalories = async () => {
    if (!mealDescription.trim() || isEstimatingMealCalories) return;
    setIsEstimatingMealCalories(true);
    try {
      const estimated = await estimateMealCalories(mealDescription, mealScale);
      if (estimated > 0) {
        setMealCalories(estimated.toString());
      }
    } catch (error) {
      console.error('Failed to estimate calories:', error);
    } finally {
      setIsEstimatingMealCalories(false);
    }
  };

  const handleLogMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalCalories = mealCalories ? parseInt(mealCalories) : 0;
    
    // If no calories entered, and we have a description, try one last auto-guess
    if (!finalCalories && mealDescription.trim()) {
      setIsEstimatingMealCalories(true);
      try {
        finalCalories = await estimateMealCalories(mealDescription, mealScale);
      } catch (err) {
        console.warn('Auto calorie guess failed before save:', err);
      } finally {
        setIsEstimatingMealCalories(false);
      }
    }

    const mealTimestamp = new Date(mealTime).getTime();
    onLogMeal(mealTimestamp, mealScale, mealDescription, mealBarcode, finalCalories);

    // Check for "with meal" supplements
    const hasWithMealSupps = supplements.some(s => s.preferredTime === 'with-meal');
    if (hasWithMealSupps) {
      // Find last fast end time
      const lastFastEnd = history.length > 0 ? history[0].endTime : 0;
      // Are there any meals between lastFastEnd and now (excluding the one we just logged)?
      const mealsSinceFast = meals.filter(m => m.time > lastFastEnd);
      
      if (mealsSinceFast.length === 0) {
        // This is the first meal since the latest fast ended!
        const toast = document.createElement('div');
        toast.className = 'fixed top-24 left-1/2 -translate-x-1/2 bg-primary text-white px-8 py-4 rounded-[2rem] shadow-2xl z-[200] flex flex-col items-center space-y-2 text-center transform transition-all duration-500 ease-out';
        toast.innerHTML = `
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <span class="text-lg">💊</span>
            </div>
            <p class="text-sm font-bold uppercase tracking-widest">Don't Forget!</p>
          </div>
          <p class="text-xs opacity-90">Remember to take your vitamins with this meal.</p>
        `;
        document.body.appendChild(toast);
        
        // Use requestAnimationFrame for entry animation
        requestAnimationFrame(() => {
          toast.classList.add('animate-in', 'fade-in', 'slide-in-from-top-4');
        });

        setTimeout(() => {
          toast.classList.add('opacity-0', '-translate-y-4');
          setTimeout(() => toast.remove(), 500);
        }, 5000);
      }
    }

    setMealDescription('');
    setMealCalories('');
    setIsMealTimeDirty(false);
    setMealBarcode('');
    if ("vibrate" in navigator) navigator.vibrate(100);
  };

  const handleScan = (barcode: string, product: any) => {
    setMealBarcode(barcode);
    if (product) {
      const productName = product.product_name || product.generic_name || product.product_name_en || 'Unknown Product';
      const brand = product.brands ? ` (${product.brands})` : '';
      setMealDescription(`${productName}${brand}`);
      // Optional: If there's nutritional info, we could add it too
    } else {
      setMealDescription('');
      // We'll use a temporary state to show a "not found" message
      const toast = document.createElement('div');
      toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-2xl z-[200] animate-bounce';
      toast.innerText = 'Product not found. Please enter details manually.';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
    setShowScanner(false);
    
    // Focus the description field after a short delay to allow the modal to close
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) textarea.focus();
    }, 300);
  };

  const handleLogWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    onLogWorkout(
      new Date(workoutStartTime).getTime(), 
      new Date(workoutEndTime).getTime(), 
      workoutIntensity, 
      workoutType, 
      workoutDescription,
      workoutCalorieBurn,
      workoutParsedExercises
    );
    setWorkoutDescription('');
    setWorkoutCalorieBurn(undefined);
    setWorkoutParsedExercises([]);
    setIsWorkoutStartTimeDirty(false);
    setIsWorkoutEndTimeDirty(false);
  };

  const handleLogSleep = (e: React.FormEvent) => {
    e.preventDefault();
    onLogSleep(new Date(bedtime).getTime(), new Date(wakeUpTime).getTime(), sleepQuality);
    setIsBedtimeDirty(false);
    setIsWakeUpTimeDirty(false);
  };

  const handleLogWater = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = customWater ? Number(customWater) : waterAmount;
    if (amount <= 0) return;
    onLogWater(Date.now(), amount);
    setCustomWater('');
  };

  const handleLogWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightValue) return;
    onLogWeight(new Date(weightTime).getTime(), Number(weightValue), weightNote);
    setWeightValue('');
    setWeightNote('');
    setIsWeightTimeDirty(false);
  };

  const handleLogMood = (e: React.FormEvent) => {
    e.preventDefault();
    onLogMood(moodScore, energyLevel, new Date(moodTime).getTime(), moodNote, moodTags);
    setMoodNote('');
    setMoodTags([]);
    setMoodScore(3);
    setEnergyLevel(3);
    setIsMoodTimeDirty(false);
  };

  const filterByDate = <T extends { time?: number; startTime?: number; bedtime?: number; wakeUpTime?: number }>(logs: T[]) => {
    // Determine the sorting field for the logs
    const getSortTime = (log: T) => log.time || log.startTime || log.wakeUpTime || log.bedtime || 0;
    
    // Sort all logs by time Descending first so we get the most recent ones
    const sortedLogs = [...logs].sort((a, b) => getSortTime(b) - getSortTime(a));
    
    if (!searchDate) return sortedLogs.slice(0, 6);
    
    const targetDate = new Date(searchDate);
    return sortedLogs.filter(log => {
      const logDate = new Date(getSortTime(log));
      return (
        logDate.getFullYear() === targetDate.getFullYear() &&
        logDate.getMonth() === targetDate.getMonth() &&
        logDate.getDate() === targetDate.getDate()
      );
    });
  };

  const filteredMeals = ([...filterByDate(meals)] as MealRecord[]).sort((a, b) => b.time - a.time);
  const filteredWorkouts = ([...filterByDate(workouts)] as WorkoutRecord[]).sort((a, b) => b.startTime - a.startTime);
  const filteredSleep = ([...filterByDate(sleep)] as SleepRecord[]).sort((a, b) => b.wakeUpTime - a.wakeUpTime);
  const filteredWater = ([...filterByDate(water)] as WaterRecord[]).sort((a, b) => b.time - a.time);
  const filteredWeights = ([...filterByDate(weights)] as WeightRecord[]).sort((a, b) => b.time - a.time);
  const filteredMoods = ([...filterByDate(moods)] as MoodRecord[]).sort((a, b) => b.time - a.time);
  const filteredSupplements = ([...filterByDate(supplementLogs)] as SupplementLog[]).sort((a, b) => b.time - a.time);

  const handleUpdate = () => {
    if (!selectedLog || !editingData) return;
    const { id } = selectedLog.data;
    if (selectedLog.type === 'meal') onUpdateMeal(id, editingData);
    if (selectedLog.type === 'workout') onUpdateWorkout(id, editingData);
    if (selectedLog.type === 'sleep') onUpdateSleep(id, editingData);
    if (selectedLog.type === 'water') onUpdateWater(id, editingData);
    if (selectedLog.type === 'weight') onUpdateWeight(id, editingData);
    if (selectedLog.type === 'supplement') onUpdateSupplementLog(id, editingData);
    if (selectedLog.type === 'mood') onUpdateMood(id, editingData);
    setSelectedLog(null);
    setIsEditing(false);
  };

  return (
    <div className="space-y-8 p-6 pb-24">
      <div className="relative group">
        <AnimatePresence>
          {showLeftArrow && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scrollTabs('left')}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-20 bg-white/5 backdrop-blur-md p-1.5 rounded-full text-green-500/50 hover:text-green-400 transition-all border border-green-500/20"
              aria-label="Scroll Left"
            >
              <ChevronLeft size={16} />
            </motion.button>
          )}
        </AnimatePresence>

        <div 
          ref={tabContainerRef}
          className="flex bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar scroll-smooth relative z-10"
        >
          <button
            onClick={() => setActiveType('water')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
              activeType === 'water' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
            }`}
          >
            <Droplets size={18} />
            <span className="font-bold">Water</span>
          </button>
          <button
            onClick={() => setActiveType('meal')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
              activeType === 'meal' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
            }`}
          >
            <Utensils size={18} />
            <span className="font-bold">Meal</span>
          </button>
          <button
            onClick={() => setActiveType('workout')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
              activeType === 'workout' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
            }`}
          >
            <Dumbbell size={18} />
            <span className="font-bold">Workout</span>
          </button>
          <button
            onClick={() => setActiveType('supplements')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
              activeType === 'supplements' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
            }`}
          >
            <Pill size={18} />
            <span className="font-bold">Supplements</span>
          </button>
          <button
            onClick={() => setActiveType('sleep')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
              activeType === 'sleep' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
            }`}
          >
            <Moon size={18} />
            <span className="font-bold">Sleep</span>
          </button>
          <button
            onClick={() => setActiveType('weight')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
              activeType === 'weight' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
            }`}
          >
            <Scale size={18} />
            <span className="font-bold">Weight</span>
          </button>
          <button
            onClick={() => setActiveType('mood')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
              activeType === 'mood' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
            }`}
          >
            <Heart size={18} />
            <span className="font-bold">Mood</span>
          </button>
        </div>

        <AnimatePresence>
          {showRightArrow && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => scrollTabs('right')}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-20 bg-white/5 backdrop-blur-md p-1.5 rounded-full text-green-500/50 hover:text-green-400 transition-all border border-green-500/20"
              aria-label="Scroll Right"
            >
              <ChevronRight size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {activeType === 'mood' ? (
          <motion.form
            key="mood-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleLogMood}
            className="bg-card p-6 rounded-3xl border border-white/5 space-y-6"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Time</label>
                  <button 
                    type="button"
                    onClick={() => setIsMoodTimeDirty(false)}
                    className={cn(
                      "text-[10px] font-bold uppercase px-2 py-1 rounded-lg transition-all",
                      !isMoodTimeDirty ? "text-primary bg-primary/10" : "text-white/20 hover:text-white/40"
                    )}
                  >
                    Live
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={moodTime}
                  onChange={(e) => {
                    setMoodTime(e.target.value);
                    setIsMoodTimeDirty(true);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block">How do you feel?</label>
                <div className="flex items-center justify-between px-2">
                  {[
                    { val: 1, icon: <Frown className="text-red-400" />, label: 'Sad' },
                    { val: 2, icon: <Meh className="text-orange-400" />, label: 'Meh' },
                    { val: 3, icon: <Smile className="text-yellow-400" />, label: 'Good' },
                    { val: 4, icon: <Sun className="text-green-400" />, label: 'Happy' },
                    { val: 5, icon: <Heart className="text-pink-400" />, label: 'Great' }
                  ].map((m) => (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => setMoodScore(m.val as MoodScore)}
                      className={cn(
                        "flex flex-col items-center space-y-1 transition-all",
                        moodScore === m.val ? "scale-125 translate-y-[-4px]" : "opacity-40 grayscale-[50%] hover:opacity-70"
                      )}
                    >
                      <div className={cn(
                        "p-3 rounded-2xl border transition-all",
                        moodScore === m.val ? "bg-white/10 border-white/20 shadow-lg" : "bg-transparent border-transparent"
                      )}>
                        {React.cloneElement(m.icon as React.ReactElement, { size: 24 })}
                      </div>
                      <span className="text-[10px] font-bold text-white/40">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest block">Energy Level</label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEnergyLevel(e as EnergyLevel)}
                      className={cn(
                        "flex-1 py-3 rounded-xl border transition-all text-sm font-bold flex flex-col items-center justify-center space-y-1",
                        energyLevel === e 
                          ? 'bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10' 
                          : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                      )}
                    >
                      <Zap size={14} className={cn(energyLevel >= e ? "fill-current" : "opacity-20")} />
                      <span>{e}</span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between px-2 mt-1">
                  <span className="text-[9px] text-white/20 font-bold uppercase tracking-tight">Drained</span>
                  <span className="text-[9px] text-white/20 font-bold uppercase tracking-tight">Vibrant</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Notes or Tags</label>
                <textarea
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  placeholder="What's causing this feeling? (Optional)"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors min-h-[80px] resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
              >
                <Heart size={20} className="fill-white/20" />
                <span>Log Mood & Energy</span>
              </button>
            </div>
          </motion.form>
        ) : activeType === 'supplements' ? (
          <motion.div
            key="supplements-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card p-6 rounded-3xl border border-white/5"
          >
            <Supplements 
              supplements={supplements}
              logs={supplementLogs}
              onAdd={onAddSupplement}
              onUpdate={onUpdateSupplement}
              onDelete={onDeleteSupplement}
              onLog={onLogSupplement}
              onDeleteLog={onDeleteSupplementLog}
            />
          </motion.div>
        ) : activeType === 'water' ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card p-6 rounded-3xl border border-white/5 space-y-8"
        >
          {/* Fun Tube Progress Bar */}
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-24 h-64 bg-white/5 border-4 border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
              {/* Glass Reflection */}
              <div className="absolute inset-0 z-30 pointer-events-none">
                <div className="absolute top-0 left-[15%] w-[20%] h-full bg-gradient-to-r from-white/10 to-transparent opacity-50" />
                <div className="absolute top-0 right-[5%] w-[10%] h-full bg-gradient-to-l from-black/20 to-transparent" />
              </div>

              {/* Water Fill Container */}
              <motion.div 
                initial={{ height: 0 }}
                animate={{ height: `${waterPercentage}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 15 }}
                className="absolute bottom-0 left-0 right-0 z-10"
              >
                {/* Deep Liquid Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 via-blue-500 to-blue-800" />
                
                {/* Surface Highlight & Wave */}
                <motion.div 
                  className="absolute top-0 left-[-50%] w-[200%] h-12 z-20"
                  animate={{ 
                    y: [0, -2, 0]
                  }}
                  transition={{
                    y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                  }}
                  style={{
                    top: '-6px',
                    background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%)',
                    borderRadius: '50%'
                  }}
                />

                {/* Crisp Surface Line */}
                <motion.div 
                  className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/60 z-30"
                />

                {/* Soft Wavy Reflection */}
                <motion.div 
                  className="absolute inset-0 opacity-20 z-10"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
                  }}
                />

                {/* Bubbles Effect */}
                <div className="absolute inset-0 overflow-hidden z-20">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ 
                        y: [-20, -120],
                        opacity: [0, 0.8, 0],
                        x: [Math.random() * 10, Math.random() * -10]
                      }}
                      transition={{ 
                        duration: 3 + Math.random() * 3,
                        repeat: Infinity,
                        delay: Math.random() * 5
                      }}
                      className="absolute bottom-0 w-1.5 h-1.5 bg-white/30 rounded-full blur-[0.5px]"
                      style={{ left: `${15 + i * 14}%` }}
                    />
                  ))}
                </div>
              </motion.div>
              
              {/* Measurement Lines - Above Water */}
              <div 
                className="absolute inset-0 flex flex-col justify-between py-8 pointer-events-none z-20"
                style={{ clipPath: `inset(0 0 ${waterPercentage}% 0)` }}
              >
                {[...Array(5)].map((_, i) => {
                  const percentage = 100 - (i * 25);
                  const value = Math.round((waterGoal * percentage) / 100);
                  return (
                    <div key={i} className="flex items-center justify-end pr-2 space-x-1 opacity-20">
                      <span className="text-[8px] font-bold text-white">{value}</span>
                      <div className="w-2 h-0.5 bg-white" />
                    </div>
                  );
                })}
              </div>

              {/* Measurement Lines - Submerged (Refracted) */}
              <div 
                className="absolute inset-0 flex flex-col justify-between py-8 pointer-events-none z-20"
                style={{ clipPath: `inset(${100 - waterPercentage}% 0 0 0)` }}
              >
                {[...Array(5)].map((_, i) => {
                  const percentage = 100 - (i * 25);
                  const value = Math.round((waterGoal * percentage) / 100);
                  return (
                    <motion.div 
                      key={i} 
                      className="flex items-center justify-end pr-2 space-x-1 opacity-40 blur-[0.5px]"
                    >
                      <span className="text-[8px] font-bold text-white">{value}</span>
                      <div className="w-2 h-0.5 bg-white" />
                    </motion.div>
                  );
                })}
              </div>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-white">{remainingWater}ml</p>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Remaining to Goal</p>
              <p className="text-[10px] font-medium text-primary mt-1 uppercase tracking-tighter">Total Drunk: {todayWater}ml</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-6">
            <div className="grid grid-cols-4 gap-3 w-full">
              {waterPresets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => {
                    onLogWater(Date.now(), amt);
                    if ("vibrate" in navigator) navigator.vibrate(50);
                  }}
                  className="group relative flex flex-col items-center space-y-2 p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-primary/10 hover:border-primary/30 transition-all active:scale-90"
                >
                  <Droplets size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black text-white/60">{amt}ml</span>
                </button>
              ))}
            </div>

            <div className="space-y-3 w-full max-w-[280px]">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block text-center">Custom Amount</label>
              <div className="flex flex-col items-center space-y-3">
                <input
                  type="number"
                  value={customWater}
                  onChange={(e) => setCustomWater(e.target.value)}
                  placeholder="e.g. 330"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors text-center font-bold text-xl"
                />
                <button
                  onClick={handleLogWater}
                  disabled={!customWater}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-primary/20"
                >
                  Log Intake
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : activeType === 'meal' ? (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleLogMeal}
          className="bg-card p-6 rounded-3xl border border-white/5 space-y-6"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Meal Time</label>
              <button 
                type="button"
                onClick={() => setIsMealTimeDirty(false)}
                className={cn(
                  "text-[10px] font-bold uppercase px-2 py-1 rounded-lg transition-all",
                  !isMealTimeDirty ? "text-primary bg-primary/10" : "text-white/20 hover:text-white/40"
                )}
              >
                Live Now
              </button>
            </div>
            <input
              type="datetime-local"
              value={mealTime}
              onChange={(e) => {
                setMealTime(e.target.value);
                setIsMealTimeDirty(true);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Meal Scale</label>
              <button 
                type="button"
                onClick={() => setShowScanner(true)}
                className="flex items-center space-x-1 text-primary text-xs font-bold uppercase hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors"
              >
                <Scan size={14} />
                <span>Scan Barcode</span>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'normal', 'large'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setMealScale(s)}
                  className={cn(
                    "py-3 rounded-xl border transition-all capitalize font-medium",
                    mealScale === s 
                      ? 'bg-primary/20 border-primary text-primary' 
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">What did you eat?</label>
            <div className="relative">
              <textarea
                value={mealDescription}
                onChange={(e) => setMealDescription(e.target.value)}
                placeholder="e.g. Grilled chicken salad with avocado..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors min-h-[100px] resize-none pr-12"
              />
              <div className="absolute bottom-3 right-3 flex items-center space-x-2">
                {isSpeechSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      isListening 
                        ? "bg-red-500 text-white animate-pulse" 
                        : "bg-white/5 text-white/40 hover:bg-white/10"
                    )}
                    title={isListening ? "Stop Listening" : "Start Voice Log"}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                )}
                {mealBarcode && (
                  <div className="flex items-center space-x-1 bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded-full border border-primary/30 h-8">
                    <Scan size={10} />
                    <span>{mealBarcode}</span>
                  </div>
                )}
              </div>
            </div>
            {isSpeechSupported && (
              <p className="text-[10px] text-white/20 mt-2 italic flex items-center space-x-1">
                <Sparkles size={10} className="text-primary" />
                <span>Tip: For best voice stability, open the app in a new tab.</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Calories (Optional)</label>
              <button 
                type="button"
                onClick={handleEstimateMealCalories}
                disabled={!mealDescription.trim() || isEstimatingMealCalories}
                className="flex items-center space-x-1 text-primary text-[10px] font-bold uppercase hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors disabled:opacity-30"
              >
                {isEstimatingMealCalories ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <Sparkles size={12} />
                )}
                <span>AI Guess</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                value={mealCalories}
                onChange={(e) => setMealCalories(e.target.value)}
                placeholder="0"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors font-bold text-lg"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 text-xs font-bold uppercase tracking-widest pointer-events-none">
                kcal
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isEstimatingMealCalories}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
          >
            <Plus size={20} />
            <span>{isEstimatingMealCalories ? 'Calculating...' : 'Log Meal'}</span>
          </button>
        </motion.form>
      ) : activeType === 'sleep' ? (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleLogSleep}
          className="bg-card p-6 rounded-3xl border border-white/5 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Bedtime</label>
                <button 
                  type="button"
                  onClick={() => setIsBedtimeDirty(false)}
                  className={cn(
                    "text-[10px] font-bold uppercase px-2 py-1 rounded-lg transition-all",
                    !isBedtimeDirty ? "text-primary bg-primary/10" : "text-white/20 hover:text-white/40"
                  )}
                >
                  Live
                </button>
              </div>
              <input
                type="datetime-local"
                value={bedtime}
                onChange={(e) => {
                  setBedtime(e.target.value);
                  setIsBedtimeDirty(true);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Wake Up Time</label>
                <button 
                  type="button"
                  onClick={() => setIsWakeUpTimeDirty(false)}
                  className={cn(
                    "text-[10px] font-bold uppercase px-2 py-1 rounded-lg transition-all",
                    !isWakeUpTimeDirty ? "text-primary bg-primary/10" : "text-white/20 hover:text-white/40"
                  )}
                >
                  Live
                </button>
              </div>
              <input
                type="datetime-local"
                value={wakeUpTime}
                onChange={(e) => {
                  setWakeUpTime(e.target.value);
                  setIsWakeUpTimeDirty(true);
                }}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Quality</label>
            <select
              value={sleepQuality}
              onChange={(e) => setSleepQuality(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
            >
              <option value="poor">Poor</option>
              <option value="fair">Fair</option>
              <option value="good">Good</option>
              <option value="excellent">Excellent</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>Log Sleep</span>
          </button>
        </motion.form>
      ) : activeType === 'workout' ? (
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-between px-2"
          >
            <div className="flex items-center space-x-2">
              <Sparkles className="text-primary" size={16} />
              <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Smart Import</span>
            </div>
            <button
              onClick={() => setShowWorkoutAI(!showWorkoutAI)}
              className={cn(
                "text-[10px] font-black uppercase px-3 py-1.5 rounded-xl transition-all border shrink-0",
                showWorkoutAI 
                  ? "bg-primary text-white border-primary" 
                  : "bg-white/5 text-primary border-primary/20 hover:bg-primary/10"
              )}
            >
              {showWorkoutAI ? 'Cancel Import' : 'Paste from Strong/Other'}
            </button>
          </motion.div>

          <AnimatePresence>
            {showWorkoutAI && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-primary/5 p-4 rounded-3xl border border-primary/20 space-y-4">
                  {!aiParsedResult ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest block text-center">Paste Workout Text Below</label>
                        <textarea
                          value={workoutAIInput}
                          onChange={(e) => setWorkoutAIInput(e.target.value)}
                          placeholder='Example: "CHEST Friday, April 17... 30m..."'
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors min-h-[120px] text-xs resize-none"
                        />
                      </div>
                      
                      {!hasAIKey ? (
                        <button
                          type="button"
                          onClick={async () => {
                            // @ts-ignore
                            if (window.aistudio) {
                              // @ts-ignore
                              await window.aistudio.openSelectKey();
                              setHasAIKey(true);
                            }
                          }}
                          className="w-full bg-white/5 text-primary py-3 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 hover:bg-primary/10 transition-all border border-primary/20"
                        >
                          <Sparkles size={14} />
                          <span>Select AI Key First</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleAIImport}
                          disabled={!workoutAIInput.trim() || isParsingWorkout}
                          className="w-full bg-primary text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all disabled:opacity-50 active:scale-95"
                        >
                          {isParsingWorkout ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Sparkles size={14} />
                          )}
                          <span>{isParsingWorkout ? 'AI is Parsing...' : 'Process with AI'}</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 size={16} className="text-primary" />
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">AI Parsed Details</span>
                        </div>
                        <button 
                          onClick={() => setAiParsedResult(null)}
                          className="text-[10px] font-bold text-white/40 hover:text-white transition-colors"
                        >
                          Clear
                        </button>
                      </div>

                      <div className="bg-black/20 p-4 rounded-2xl border border-white/5 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="text-xs font-bold text-white">{aiParsedResult.title}</div>
                          <div className="text-[10px] text-white/40">{format(new Date(aiParsedResult.startTime), 'MMM d, h:mm a')}</div>
                        </div>
                        <div className="text-[10px] text-white/60 line-clamp-2 italic">
                          {aiParsedResult.description.substring(0, 100)}...
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-primary uppercase tracking-widest text-center block">Select Intensity</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['low', 'moderate', 'high'] as WorkoutIntensity[]).map((i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setWorkoutIntensity(i)}
                              className={`py-2 rounded-xl border transition-all capitalize text-[10px] font-bold tracking-wider ${
                                workoutIntensity === i 
                                  ? 'bg-primary border-primary text-white' 
                                  : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                              }`}
                            >
                              {i}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmAiLog}
                        className="w-full bg-primary text-white py-3 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                      >
                        <Plus size={16} />
                        <span>Confirm & Log Workout</span>
                      </button>
                    </motion.div>
                  )}
                  
                  <p className="text-[9px] text-white/30 text-center italic">
                    AI extracts timing and exercises. Review and confirm to log.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleLogWorkout}
            className="bg-card p-6 rounded-3xl border border-white/5 space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Start Time</label>
                  <button 
                    type="button"
                    onClick={() => setIsWorkoutStartTimeDirty(false)}
                    className={cn(
                      "text-[10px] font-bold uppercase px-2 py-1 rounded-lg transition-all",
                      !isWorkoutStartTimeDirty ? "text-primary bg-primary/10" : "text-white/20 hover:text-white/40"
                    )}
                  >
                    Live
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={workoutStartTime}
                  onChange={(e) => {
                    setWorkoutStartTime(e.target.value);
                    setIsWorkoutStartTimeDirty(true);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">End Time</label>
                  <button 
                    type="button"
                    onClick={() => setIsWorkoutEndTimeDirty(false)}
                    className={cn(
                      "text-[10px] font-bold uppercase px-2 py-1 rounded-lg transition-all",
                      !isWorkoutEndTimeDirty ? "text-primary bg-primary/10" : "text-white/20 hover:text-white/40"
                    )}
                  >
                    Live
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={workoutEndTime}
                  onChange={(e) => {
                    setWorkoutEndTime(e.target.value);
                    setIsWorkoutEndTimeDirty(true);
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Workout Type</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(['cardio', 'strength', 'running', 'walking', 'swimming', 'cycling', 'sports', 'home', 'custom'] as WorkoutType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setWorkoutType(t)}
                      className={cn(
                        "py-2 px-3 rounded-xl border transition-all capitalize text-[10px] font-bold tracking-wider",
                        workoutType === t 
                          ? 'bg-primary/20 border-primary text-primary' 
                          : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10',
                        t === 'custom' && "col-span-2 sm:col-span-3"
                      )}
                    >
                      {t === 'custom' ? 'Custom Input' : t.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {workoutType === 'custom' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">What did you do?</label>
                  <textarea
                    value={workoutDescription}
                    onChange={(e) => setWorkoutDescription(e.target.value)}
                    placeholder="e.g. 50 pushups, 20 pullups, and 5km run..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors min-h-[80px] resize-none"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Intensity</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['low', 'moderate', 'high'] as WorkoutIntensity[]).map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setWorkoutIntensity(i)}
                      className={`py-3 rounded-xl border transition-all capitalize font-medium ${
                        workoutIntensity === i 
                          ? 'bg-primary/20 border-primary text-primary' 
                          : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Calories Burned (optional)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={workoutCalorieBurn || ''}
                    onChange={(e) => setWorkoutCalorieBurn(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="e.g. 350"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors text-center font-bold"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/20 uppercase">
                    kcal
                  </div>
                </div>
                {workoutCalorieBurn && !isWorkoutStartTimeDirty && (
                  <p className="text-[10px] text-primary/60 text-center font-bold animate-pulse">
                    AI Estimated value. You can adjust it.
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all active:scale-95"
            >
              <Plus size={20} />
              <span>Log Workout</span>
            </button>
          </motion.form>
        </div>
      ) : activeType === 'weight' ? (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleLogWeight}
          className="bg-card p-6 rounded-3xl border border-white/5 space-y-6"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Time</label>
              <button 
                type="button"
                onClick={() => setIsWeightTimeDirty(false)}
                className={cn(
                  "text-[10px] font-bold uppercase px-2 py-1 rounded-lg transition-all",
                  !isWeightTimeDirty ? "text-primary bg-primary/10" : "text-white/20 hover:text-white/40"
                )}
              >
                Live
              </button>
            </div>
            <input
              type="datetime-local"
              value={weightTime}
              onChange={(e) => {
                setWeightTime(e.target.value);
                setIsWeightTimeDirty(true);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={weightValue}
              onChange={(e) => setWeightValue(e.target.value)}
              placeholder="Enter weight..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors text-center font-medium text-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Note (Optional)</label>
            <textarea
              value={weightNote}
              onChange={(e) => setWeightNote(e.target.value)}
              placeholder="How are you feeling today?"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors min-h-[80px] resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>Log Weight</span>
          </button>
        </motion.form>
      ) : null}
      </AnimatePresence>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-bold text-white">Recent Activity</h3>
          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-primary transition-colors"
            />
            {searchDate && (
              <button 
                onClick={() => setSearchDate('')}
                className="text-[10px] text-primary font-bold uppercase"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
          {activeType === 'meal' ? (
            filteredMeals.length > 0 ? (
              filteredMeals.map((meal) => (
                <div 
                  key={meal.id} 
                  onClick={() => setSelectedLog({ type: 'meal', data: meal })}
                  className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500 shrink-0">
                      <Utensils size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-white capitalize">{meal.scale} Meal</p>
                      {meal.description && (
                        <p className="text-sm text-white/60 line-clamp-1">{meal.description}</p>
                      )}
                      <p className="text-xs text-white/40">{formatDate(meal.time)}, {formatTime(meal.time)}</p>
                      {meal.calories && meal.calories > 0 && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Sparkles size={10} className="text-primary" />
                          <span className="text-[10px] font-black text-primary uppercase tracking-wider">{meal.calories} kcal</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteMeal(meal.id);
                      }}
                      className="p-2 text-white/20 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-white/20 py-8 italic">No meals found</p>
            )
          ) : activeType === 'workout' ? (
            filteredWorkouts.length > 0 ? (
              filteredWorkouts.map((workout) => (
                <div 
                  key={workout.id} 
                  onClick={() => setSelectedLog({ type: 'workout', data: workout })}
                  className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500">
                      <Dumbbell size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-white capitalize">
                        {workout.type === 'custom' && workout.description ? workout.description : (workout.type || 'Workout')} • {workout.intensity}
                      </p>
                      <p className="text-xs text-white/40">
                        {formatDate(workout.startTime)}, {workout.duration} mins • {formatTime(workout.startTime)} - {formatTime(workout.endTime)}
                      </p>
                      {workout.calorieBurn && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Sparkles size={10} className="text-primary" />
                          <span className="text-[10px] font-black text-primary uppercase tracking-wider">{workout.calorieBurn} kcal burned</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteWorkout(workout.id);
                    }}
                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center text-white/20 py-8 italic">No workouts found</p>
            )
          ) : activeType === 'sleep' ? (
            filteredSleep.length > 0 ? (
              filteredSleep.map((s) => (
                <div 
                  key={s.id} 
                  onClick={() => setSelectedLog({ type: 'sleep', data: s })}
                  className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-500">
                      <Moon size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-white capitalize">{s.quality} Sleep</p>
                      <p className="text-xs text-white/40">
                        {formatDate(s.wakeUpTime)}, {s.duration.toFixed(1)} hours • {formatTime(s.bedtime)} - {formatTime(s.wakeUpTime)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSleep(s.id);
                    }}
                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center text-white/20 py-8 italic">No sleep logs found</p>
            )
          ) : activeType === 'water' ? (
            filteredWater.length > 0 ? (
              filteredWater.map((w) => (
                <div 
                  key={w.id} 
                  onClick={() => setSelectedLog({ type: 'water', data: w })}
                  className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-400/20 rounded-xl flex items-center justify-center text-blue-400">
                      <Droplets size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-white">{w.amount}ml Water</p>
                      <p className="text-xs text-white/40">{formatDate(w.time)}, {formatTime(w.time)}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteWater(w.id);
                    }}
                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center text-white/20 py-8 italic">No water logs found</p>
            )
          ) : activeType === 'weight' ? (
            filteredWeights.length > 0 ? (
              filteredWeights.map((w) => (
                <div 
                  key={w.id} 
                  onClick={() => setSelectedLog({ type: 'weight', data: w })}
                  className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500">
                      <Scale size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-white">{w.weight} kg</p>
                      {w.note && (
                        <p className="text-sm text-white/60 line-clamp-1">{w.note}</p>
                      )}
                      <p className="text-xs text-white/40">{formatDate(w.time)}, {formatTime(w.time)}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteWeight(w.id);
                    }}
                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center text-white/20 py-8 italic">No weight logs found</p>
            )
          ) : activeType === 'supplements' ? (
            filteredSupplements.length > 0 ? (
              filteredSupplements.map((log) => {
                const supp = supplements.find(s => s.id === log.supplementId);
                return (
                  <div 
                    key={log.id} 
                    onClick={() => setSelectedLog({ type: 'supplement', data: log })}
                    className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                        <Pill size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-white capitalize">{supp?.name || 'Unknown Supplement'}</p>
                        <p className="text-xs text-white/40">{formatDate(log.time)}, {formatTime(log.time)}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSupplementLog(log.id);
                      }}
                      className="p-2 text-white/20 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-white/20 py-8 italic">No supplement history found</p>
            )
          ) : activeType === 'mood' ? (
            filteredMoods.length > 0 ? (
              filteredMoods.map((m) => (
                <div 
                  key={m.id} 
                  onClick={() => setSelectedLog({ type: 'mood', data: m })}
                  className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center text-pink-500">
                      <Heart size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-white">Mood: {m.mood}/5 • Energy: {m.energy}/5</p>
                      {m.note && (
                        <p className="text-sm text-white/60 line-clamp-1">{m.note}</p>
                      )}
                      <p className="text-xs text-white/40">{formatDate(m.time)}, {formatTime(m.time)}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMood(m.id);
                    }}
                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center text-white/20 py-8 italic">No mood logs found</p>
            )
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={() => {
              setSelectedLog(null);
              setIsEditing(false);
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xl z-[150] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card w-full max-w-lg rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl"
            >
              <div className="relative p-8 max-h-[90vh] overflow-y-auto no-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <button 
                    onClick={() => {
                      setSelectedLog(null);
                      setIsEditing(false);
                    }}
                    className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>

                  <button
                    onClick={() => {
                      if (isEditing) {
                        handleUpdate();
                      } else {
                        setIsEditing(true);
                        setEditingData({ ...selectedLog.data });
                      }
                    }}
                    className={cn(
                      "px-6 py-2 rounded-full font-bold text-sm transition-all",
                      isEditing ? "bg-primary text-white" : "bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    {isEditing ? 'Save Changes' : 'Edit Log'}
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="flex items-center space-x-4">
                    <div className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center",
                      selectedLog.type === 'meal' && "bg-orange-500/20 text-orange-500",
                      selectedLog.type === 'workout' && "bg-blue-500/20 text-blue-500",
                      selectedLog.type === 'sleep' && "bg-indigo-500/20 text-indigo-500",
                      selectedLog.type === 'water' && "bg-blue-400/20 text-blue-400",
                      selectedLog.type === 'weight' && "bg-emerald-500/20 text-emerald-500",
                      selectedLog.type === 'supplement' && "bg-primary/20 text-primary",
                      selectedLog.type === 'mood' && "bg-pink-500/20 text-pink-500",
                    )}>
                      {selectedLog.type === 'meal' && <Utensils size={32} />}
                      {selectedLog.type === 'workout' && <Dumbbell size={32} />}
                      {selectedLog.type === 'sleep' && <Moon size={32} />}
                      {selectedLog.type === 'water' && <Droplets size={32} />}
                      {selectedLog.type === 'weight' && <Scale size={32} />}
                      {selectedLog.type === 'supplement' && <Pill size={32} />}
                      {selectedLog.type === 'mood' && <Heart size={32} />}
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-white capitalize">
                        {isEditing ? `Editing ${selectedLog.type}` : (
                          <>
                            {selectedLog.type === 'meal' && `${selectedLog.data.scale} Meal`}
                            {selectedLog.type === 'workout' && selectedLog.data.type.replace('-', ' ')}
                            {selectedLog.type === 'sleep' && `${selectedLog.data.quality} Sleep`}
                            {selectedLog.type === 'water' && 'Hydration'}
                            {selectedLog.type === 'weight' && 'Weight Check'}
                            {selectedLog.type === 'supplement' && (supplements.find(s => s.id === selectedLog.data.supplementId)?.name || 'Supplement')}
                            {selectedLog.type === 'mood' && 'Mood & Energy Log'}
                          </>
                        )}
                      </h4>
                      <p className="text-white/40 font-medium">
                        {formatDate(selectedLog.data.time || selectedLog.data.startTime || selectedLog.data.bedtime)}
                      </p>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      {/* Shared Time Field */}
                      {(selectedLog.data.time || selectedLog.data.startTime || selectedLog.data.bedtime) && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                            {selectedLog.type === 'workout' || selectedLog.type === 'sleep' ? 'Start Time' : 'Time'}
                          </label>
                          <input
                            type="datetime-local"
                            value={format(new Date(editingData.time || editingData.startTime || editingData.bedtime), "yyyy-MM-dd'T'HH:mm")}
                            onChange={(e) => {
                              const ts = new Date(e.target.value).getTime();
                              if (editingData.time) setEditingData({ ...editingData, time: ts });
                              if (editingData.startTime) setEditingData({ ...editingData, startTime: ts });
                              if (editingData.bedtime) setEditingData({ ...editingData, bedtime: ts });
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                          />
                        </div>
                      )}

                      {/* End Time for Workout/Sleep */}
                      {(selectedLog.data.endTime || selectedLog.data.wakeUpTime) && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                            {selectedLog.type === 'workout' ? 'End Time' : 'Wake Up Time'}
                          </label>
                          <input
                            type="datetime-local"
                            value={format(new Date(editingData.endTime || editingData.wakeUpTime), "yyyy-MM-dd'T'HH:mm")}
                            onChange={(e) => {
                              const ts = new Date(e.target.value).getTime();
                              if (editingData.endTime) setEditingData({ ...editingData, endTime: ts });
                              if (editingData.wakeUpTime) setEditingData({ ...editingData, wakeUpTime: ts });
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                          />
                        </div>
                      )}

                      {/* Mood Fields */}
                      {selectedLog.type === 'mood' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Mood Score (1-5)</label>
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={editingData.mood}
                              onChange={(e) => setEditingData({ ...editingData, mood: Number(e.target.value) })}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Energy Level (1-5)</label>
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={editingData.energy}
                              onChange={(e) => setEditingData({ ...editingData, energy: Number(e.target.value) })}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                            />
                          </div>
                        </>
                      )}

                      {/* Amount/Weight Fields */}
                      {(editingData.amount !== undefined || editingData.weight !== undefined) && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                            {editingData.amount !== undefined ? 'Amount (ml)' : 'Weight (kg)'}
                          </label>
                          <input
                            type="number"
                            value={editingData.amount ?? editingData.weight ?? ''}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (editingData.amount !== undefined) setEditingData({ ...editingData, amount: val });
                              if (editingData.weight !== undefined) setEditingData({ ...editingData, weight: val });
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary"
                          />
                        </div>
                      )}

                      {/* Scale / Quality / Intensity / Type Selectors */}
                      {selectedLog.type === 'meal' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Scale</label>
                            <div className="grid grid-cols-3 gap-2">
                              {(['light', 'normal', 'large'] as const).map(s => (
                                <button
                                  key={s}
                                  onClick={() => setEditingData({ ...editingData, scale: s })}
                                  className={cn(
                                    "py-2 rounded-xl border text-xs font-bold transition-all",
                                    editingData.scale === s ? "bg-primary border-primary text-white" : "bg-white/5 border-white/10 text-white/40"
                                  )}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Calories (kcal)</label>
                            <input
                              type="number"
                              value={editingData.calories ?? ''}
                              onChange={(e) => setEditingData({ ...editingData, calories: e.target.value ? Number(e.target.value) : 0 })}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary font-bold text-center"
                              placeholder="e.g. 450"
                            />
                          </div>
                        </>
                      )}

                      {selectedLog.type === 'sleep' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Quality</label>
                          <select
                            value={editingData.quality}
                            onChange={(e) => setEditingData({ ...editingData, quality: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none"
                          >
                            <option value="poor">Poor</option>
                            <option value="fair">Fair</option>
                            <option value="good">Good</option>
                            <option value="excellent">Excellent</option>
                          </select>
                        </div>
                      )}

                      {selectedLog.type === 'workout' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Type</label>
                            <div className="grid grid-cols-3 gap-2">
                              {(['cardio', 'strength', 'hiit', 'running', 'walking', 'swimming', 'cycling', 'sports', 'home', 'custom'] as const).map(t => (
                                <button
                                  key={t}
                                  onClick={() => setEditingData({ ...editingData, type: t })}
                                  className={cn(
                                    "py-2 rounded-xl border text-[10px] font-bold transition-all truncate",
                                    editingData.type === t ? "bg-primary border-primary text-white" : "bg-white/5 border-white/10 text-white/40"
                                  )}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Intensity</label>
                            <div className="grid grid-cols-3 gap-2">
                              {(['low', 'moderate', 'high'] as const).map(i => (
                                <button
                                  key={i}
                                  onClick={() => setEditingData({ ...editingData, intensity: i })}
                                  className={cn(
                                    "py-2 rounded-xl border text-xs font-bold transition-all",
                                    editingData.intensity === i ? "bg-primary border-primary text-white" : "bg-white/5 border-white/10 text-white/40"
                                  )}
                                >
                                  {i}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Calories Burned (kcal)</label>
                            <input
                              type="number"
                              value={editingData.calorieBurn ?? ''}
                              onChange={(e) => setEditingData({ ...editingData, calorieBurn: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary font-bold text-center"
                              placeholder="e.g. 350"
                            />
                          </div>
                        </>
                      )}

                      {/* Description / Note */}
                      {(editingData.description !== undefined || editingData.note !== undefined) && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Details</label>
                          <textarea
                            value={editingData.description ?? editingData.note ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (editingData.description !== undefined) setEditingData({ ...editingData, description: val });
                              if (editingData.note !== undefined) setEditingData({ ...editingData, note: val });
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none min-h-[100px] resize-none"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Time</p>
                          <p className="text-lg font-bold text-white">
                            {formatTime(selectedLog.data.time || selectedLog.data.startTime || selectedLog.data.bedtime)}
                            {(selectedLog.data.endTime || selectedLog.data.wakeUpTime) && (
                              <span className="text-white/40 font-normal ml-1 pr-1">
                                - {formatTime(selectedLog.data.endTime || selectedLog.data.wakeUpTime)}
                              </span>
                            )}
                          </p>
                        </div>
                        {(selectedLog.data.duration !== undefined || selectedLog.data.amount !== undefined || selectedLog.data.weight !== undefined) && (
                          <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">
                              {selectedLog.data.amount ? 'Amount' : selectedLog.data.weight ? 'Weight' : 'Duration'}
                            </p>
                            <p className="text-lg font-bold text-white">
                              {selectedLog.data.amount && `${selectedLog.data.amount}ml`}
                              {selectedLog.data.weight && `${selectedLog.data.weight}kg`}
                              {selectedLog.data.duration !== undefined && (
                                selectedLog.type === 'sleep' 
                                  ? `${selectedLog.data.duration.toFixed(1)}h`
                                  : `${selectedLog.data.duration}m`
                              )}
                            </p>
                          </div>
                        )}
                      </div>

                      {selectedLog.type === 'meal' && selectedLog.data.calories && (
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Calories</p>
                          <p className="text-lg font-black text-primary">{selectedLog.data.calories} kcal</p>
                        </div>
                      )}

                      {selectedLog.type === 'workout' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Intensity</p>
                            <p className="text-lg font-bold text-white capitalize">{selectedLog.data.intensity}</p>
                          </div>
                          {selectedLog.data.calorieBurn && (
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Calories Burned</p>
                              <p className="text-lg font-black text-primary">{selectedLog.data.calorieBurn} kcal</p>
                            </div>
                          )}
                        </div>
                      )}

                      {(selectedLog.data.description || selectedLog.data.note) && (
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5">
                          <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">Description</p>
                          <p className="text-white/70 leading-relaxed italic">
                            "{selectedLog.data.description || selectedLog.data.note}"
                          </p>
                        </div>
                      )}

                      {selectedLog.data.barcode && (
                        <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Barcode</p>
                            <p className="text-lg font-mono font-bold text-white">{selectedLog.data.barcode}</p>
                          </div>
                          <Scan className="text-primary opacity-50" size={32} />
                        </div>
                      )}

                      <button
                        onClick={() => {
                          if (selectedLog.type === 'meal') onDeleteMeal(selectedLog.data.id);
                          if (selectedLog.type === 'workout') onDeleteWorkout(selectedLog.data.id);
                          if (selectedLog.type === 'sleep') onDeleteSleep(selectedLog.data.id);
                          if (selectedLog.type === 'water') onDeleteWater(selectedLog.data.id);
                          if (selectedLog.type === 'weight') onDeleteWeight(selectedLog.data.id);
                          if (selectedLog.type === 'supplement') onDeleteSupplementLog(selectedLog.data.id);
                          setSelectedLog(null);
                        }}
                        className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center space-x-2 border border-red-500/20"
                      >
                        <Trash2 size={18} />
                        <span>Delete Record</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showScanner && (
        <BarcodeScanner 
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default LogActivity;
