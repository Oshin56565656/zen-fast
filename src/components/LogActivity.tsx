import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Utensils, Dumbbell, Plus, Trash2, Clock, Scale, Moon, Camera, Scan, Droplets, LineChart, Mic, MicOff, Sparkles, MapPin, Play } from 'lucide-react';
import { MealRecord, WorkoutRecord, SleepRecord, WaterRecord, WeightRecord, WorkoutType, WorkoutIntensity } from '../types';
import { cn } from '../lib/utils';
import { formatTime, formatDate } from '../lib/utils';
import { format, subHours } from 'date-fns';
import BarcodeScanner from './BarcodeScanner';

interface LogActivityProps {
  meals: MealRecord[];
  workouts: WorkoutRecord[];
  sleep: SleepRecord[];
  water: WaterRecord[];
  weights: WeightRecord[];
  waterGoal: number;
  waterPresets?: number[];
  onLogMeal: (time: number, scale: 'light' | 'normal' | 'large', description?: string, barcode?: string) => void;
  onLogWorkout: (startTime: number, endTime: number, intensity: WorkoutIntensity, type: WorkoutType) => void;
  onLogSleep: (bedtime: number, wakeUpTime: number, quality: 'poor' | 'fair' | 'good' | 'excellent') => void;
  onLogWater: (time: number, amount: number) => void;
  onLogWeight: (time: number, weight: number, note?: string) => void;
  onDeleteMeal: (id: string) => void;
  onDeleteWorkout: (id: string) => void;
  onDeleteSleep: (id: string) => void;
  onDeleteWater: (id: string) => void;
  onDeleteWeight: (id: string) => void;
}

const LogActivity: React.FC<LogActivityProps> = ({
  meals,
  workouts,
  sleep,
  water,
  weights,
  waterGoal,
  waterPresets = [100, 150, 250, 300],
  onLogMeal,
  onLogWorkout,
  onLogSleep,
  onLogWater,
  onLogWeight,
  onDeleteMeal,
  onDeleteWorkout,
  onDeleteSleep,
  onDeleteWater,
  onDeleteWeight
}) => {
  const [activeType, setActiveType] = useState<'water' | 'meal' | 'workout' | 'sleep' | 'weight'>('water');
  const [searchDate, setSearchDate] = useState<string>('');
  const [tilt, setTilt] = useState(0);

  // Handle tilt for realism
  React.useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma !== null) {
        // Gamma is left-to-right tilt in degrees [-90, 90]
        setTilt(e.gamma / 3);
      }
    };
    
    // Fallback animation if no orientation data
    let frame: number;
    let angle = 0;
    const animate = () => {
      angle += 0.02;
      if (window.self === window.top) { // Only fallback if not in iframe or if we want subtle movement
        // We'll just use a very subtle oscillation as a base
      }
      frame = requestAnimationFrame(animate);
    };

    window.addEventListener('deviceorientation', handleOrientation);
    animate();
    
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      cancelAnimationFrame(frame);
    };
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
    }, 1000);
    return () => clearInterval(interval);
  }, [isMealTimeDirty, isWorkoutStartTimeDirty, isWorkoutEndTimeDirty, isBedtimeDirty, isWakeUpTimeDirty, isWeightTimeDirty]);

  const handleLogMeal = (e: React.FormEvent) => {
    e.preventDefault();
    onLogMeal(new Date(mealTime).getTime(), mealScale, mealDescription, mealBarcode);
    setMealDescription('');
    setMealBarcode('');
    setIsMealTimeDirty(false);
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
    onLogWorkout(new Date(workoutStartTime).getTime(), new Date(workoutEndTime).getTime(), workoutIntensity, workoutType);
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

  const filterByDate = <T extends { time?: number; startTime?: number; bedtime?: number; wakeUpTime?: number }>(logs: T[]) => {
    if (!searchDate) return logs.slice(0, 6);
    
    const targetDate = new Date(searchDate);
    return logs.filter(log => {
      const logDate = new Date(log.time || log.startTime || log.bedtime || log.wakeUpTime || 0);
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

  return (
    <div className="space-y-8 p-6 pb-24">
      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
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
      </div>

      {activeType === 'water' ? (
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
                    rotate: tilt,
                    y: [0, -2, 0]
                  }}
                  transition={{
                    rotate: { type: "spring", stiffness: 100, damping: 10 },
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
                  animate={{ rotate: tilt }}
                  transition={{ type: "spring", stiffness: 100, damping: 10 }}
                />

                {/* Soft Wavy Reflection */}
                <motion.div 
                  className="absolute inset-0 opacity-20 z-10"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
                  }}
                  animate={{ skewX: tilt / 2 }}
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
                      animate={{ x: tilt / 4 }}
                      transition={{ type: "spring", stiffness: 100, damping: 10 }}
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

          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-3">
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

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block text-center">Custom Amount</label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={customWater}
                  onChange={(e) => setCustomWater(e.target.value)}
                  placeholder="e.g. 330"
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors text-center font-bold"
                />
                <button
                  onClick={handleLogWater}
                  disabled={!customWater}
                  className="bg-primary text-white px-6 rounded-2xl font-bold disabled:opacity-50 transition-all active:scale-95"
                >
                  Log
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
                  className={`py-3 rounded-xl border transition-all capitalize font-medium ${
                    mealScale === s 
                      ? 'bg-primary/20 border-primary text-primary' 
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                  }`}
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

          <button
            type="submit"
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>Log Meal</span>
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
                  {(['cardio', 'strength', 'hiit', 'yoga', 'walking', 'swimming', 'cycling', 'sports', 'home', 'other'] as WorkoutType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setWorkoutType(t)}
                      className={`py-2 px-3 rounded-xl border transition-all capitalize text-[10px] font-bold tracking-wider ${
                        workoutType === t 
                          ? 'bg-primary/20 border-primary text-primary' 
                          : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {t.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

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
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all active:scale-95"
            >
              <Plus size={20} />
              <span>Log Workout</span>
            </button>
          </motion.form>
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
        
        <div className="space-y-3">
          {activeType === 'meal' ? (
            filteredMeals.length > 0 ? (
              filteredMeals.map((meal) => (
                <div key={meal.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500">
                      <Utensils size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-white capitalize">{meal.scale} Meal</p>
                      {meal.description && (
                        <p className="text-sm text-white/60 line-clamp-1">{meal.description}</p>
                      )}
                      <p className="text-xs text-white/40">{formatDate(meal.time)}, {formatTime(meal.time)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onDeleteMeal(meal.id)}
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
                <div key={workout.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500">
                      <Dumbbell size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-white capitalize">
                        {workout.type || 'Workout'} • {workout.intensity}
                      </p>
                      <p className="text-xs text-white/40">
                        {formatDate(workout.startTime)}, {workout.duration} mins • {formatTime(workout.startTime)} - {formatTime(workout.endTime)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onDeleteWorkout(workout.id)}
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
                <div key={s.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
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
                    onClick={() => onDeleteSleep(s.id)}
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
                <div key={w.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
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
                    onClick={() => onDeleteWater(w.id)}
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
                <div key={w.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
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
                    onClick={() => onDeleteWeight(w.id)}
                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center text-white/20 py-8 italic">No weight logs found</p>
            )
          ) : null}
        </div>
      </div>

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
