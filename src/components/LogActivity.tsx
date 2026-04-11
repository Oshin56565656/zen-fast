import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Utensils, Dumbbell, Plus, Trash2, Clock, Scale, Moon, Camera, Scan, Droplets, LineChart, Mic, MicOff, Sparkles, MapPin, Play, RefreshCw, Cloud, Bike, Footprints } from 'lucide-react';
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
  onUpdateWorkout?: (id: string, updates: any) => void;
  userProfile?: any;
  onSyncStrava?: () => void;
}

const LogActivity: React.FC<LogActivityProps> = ({
  meals,
  workouts,
  sleep,
  water,
  weights,
  onLogMeal,
  onLogWorkout,
  onLogSleep,
  onLogWater,
  onLogWeight,
  onDeleteMeal,
  onDeleteWorkout,
  onDeleteSleep,
  onDeleteWater,
  onDeleteWeight,
  onUpdateWorkout,
  userProfile,
  onSyncStrava
}) => {
  const [activeType, setActiveType] = useState<'meal' | 'workout' | 'sleep' | 'water' | 'weight'>('meal');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [searchDate, setSearchDate] = useState<string>('');
  
  // Meal Form State
  const [mealScale, setMealScale] = useState<'light' | 'normal' | 'large'>('normal');
  const [mealTime, setMealTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [mealDescription, setMealDescription] = useState('');
  const [mealBarcode, setMealBarcode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const recognitionRef = useRef<any>(null);

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

  // Workout Form State
  const [workoutIntensity, setWorkoutIntensity] = useState<WorkoutIntensity>('moderate');
  const [workoutType, setWorkoutType] = useState<WorkoutType>('cardio');
  const [workoutStartTime, setWorkoutStartTime] = useState(format(subHours(new Date(), 0.5), "yyyy-MM-dd'T'HH:mm"));
  const [workoutEndTime, setWorkoutEndTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  // Sleep Form State
  const [sleepQuality, setSleepQuality] = useState<'poor' | 'fair' | 'good' | 'excellent'>('good');
  const [bedtime, setBedtime] = useState(format(subHours(new Date(), 8), "yyyy-MM-dd'T'HH:mm"));
  const [wakeUpTime, setWakeUpTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  // Water Form State
  const [waterAmount, setWaterAmount] = useState(250);
  const [waterTime, setWaterTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  // Weight Form State
  const [weightValue, setWeightValue] = useState<string>('');
  const [weightNote, setWeightNote] = useState('');
  const [weightTime, setWeightTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  const handleLogMeal = (e: React.FormEvent) => {
    e.preventDefault();
    onLogMeal(new Date(mealTime).getTime(), mealScale, mealDescription, mealBarcode);
    setMealDescription('');
    setMealBarcode('');
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
  };

  const handleLogSleep = (e: React.FormEvent) => {
    e.preventDefault();
    onLogSleep(new Date(bedtime).getTime(), new Date(wakeUpTime).getTime(), sleepQuality);
  };

  const handleLogWater = (e: React.FormEvent) => {
    e.preventDefault();
    onLogWater(new Date(waterTime).getTime(), waterAmount);
  };

  const handleLogWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weightValue) return;
    onLogWeight(new Date(weightTime).getTime(), Number(weightValue), weightNote);
    setWeightValue('');
    setWeightNote('');
  };

  const handleStravaSync = async () => {
    if (!onSyncStrava) return;
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      await onSyncStrava();
      setSyncStatus({ type: 'success', message: 'Workouts synced successfully!' });
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (error) {
      setSyncStatus({ type: 'error', message: 'Failed to sync workouts.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const filterByDate = <T extends { time?: number; startTime?: number; bedtime?: number; wakeUpTime?: number; startDate?: string }>(logs: T[]) => {
    if (!searchDate) return logs.slice(0, 6); // Show only 6 most recent logs unless a date is chosen
    
    const targetDate = new Date(searchDate);
    return logs.filter(log => {
      const logTime = log.time || log.startTime || log.bedtime || log.wakeUpTime || (log.startDate ? new Date(log.startDate).getTime() : 0);
      const logDate = new Date(logTime);
      return (
        logDate.getFullYear() === targetDate.getFullYear() &&
        logDate.getMonth() === targetDate.getMonth() &&
        logDate.getDate() === targetDate.getDate()
      );
    });
  };

  const filteredMeals = ([...filterByDate(meals)] as MealRecord[]).sort((a, b) => b.time - a.time);
  const filteredWorkouts = ([...filterByDate(workouts)] as any[]).sort((a, b) => {
    const getT = (w: any) => w.startTime || (w.startDate ? new Date(w.startDate).getTime() : 0);
    return getT(b) - getT(a);
  });
  const filteredSleep = ([...filterByDate(sleep)] as SleepRecord[]).sort((a, b) => b.wakeUpTime - a.wakeUpTime);
  const filteredWater = ([...filterByDate(water)] as WaterRecord[]).sort((a, b) => b.time - a.time);
  const filteredWeights = ([...filterByDate(weights)] as WeightRecord[]).sort((a, b) => b.time - a.time);

  return (
    <div className="space-y-8 p-6 pb-24">
      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveType('meal')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
            activeType === 'meal' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
          }`}
        >
          <Utensils size={18} strokeWidth={3} />
          <span className="font-bold">Meal</span>
        </button>
        <button
          onClick={() => setActiveType('workout')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
            activeType === 'workout' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
          }`}
        >
          <Dumbbell size={18} strokeWidth={2.5} />
          <span className="font-bold">Workout</span>
        </button>
        <button
          onClick={() => setActiveType('sleep')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
            activeType === 'sleep' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
          }`}
        >
          <Moon size={18} strokeWidth={2.5} />
          <span className="font-bold">Sleep</span>
        </button>
        <button
          onClick={() => setActiveType('water')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
            activeType === 'water' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
          }`}
        >
          <Droplets size={18} strokeWidth={2.5} />
          <span className="font-bold">Water</span>
        </button>
        <button
          onClick={() => setActiveType('weight')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
            activeType === 'weight' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
          }`}
        >
          <Scale size={18} strokeWidth={2.5} />
          <span className="font-bold">Weight</span>
        </button>
      </div>

      {activeType === 'workout' && userProfile?.stravaConnected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#FC6100]/10 p-4 rounded-2xl border border-[#FC6100]/20 flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#FC6100] rounded-xl flex items-center justify-center text-white">
              <Cloud size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Strava Integration</p>
              <p className="text-[10px] text-white/60">Sync your latest activities</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStravaSync}
            disabled={isSyncing}
            className="flex items-center space-x-2 bg-[#FC6100] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#FC6100]/90 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Fetch from Strava'}</span>
          </button>
        </motion.div>
      )}

      {syncStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-3 rounded-xl text-xs font-bold text-center",
            syncStatus.type === 'success' ? "bg-green-500/10 text-green-500" :
            syncStatus.type === 'error' ? "bg-red-500/10 text-red-500" :
            "bg-blue-500/10 text-blue-500"
          )}
        >
          {syncStatus.message}
        </motion.div>
      )}

      {activeType === 'meal' ? (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleLogMeal}
          className="bg-card p-6 rounded-3xl border border-white/5 space-y-6"
        >
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Meal Time</label>
            <input
              type="datetime-local"
              value={mealTime}
              onChange={(e) => setMealTime(e.target.value)}
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
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Bedtime</label>
              <input
                type="datetime-local"
                value={bedtime}
                onChange={(e) => setBedtime(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Wake Up Time</label>
              <input
                type="datetime-local"
                value={wakeUpTime}
                onChange={(e) => setWakeUpTime(e.target.value)}
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
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Start Time</label>
                <input
                  type="datetime-local"
                  value={workoutStartTime}
                  onChange={(e) => setWorkoutStartTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">End Time</label>
                <input
                  type="datetime-local"
                  value={workoutEndTime}
                  onChange={(e) => setWorkoutEndTime(e.target.value)}
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
      ) : activeType === 'water' ? (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleLogWater}
          className="bg-card p-6 rounded-3xl border border-white/5 space-y-6"
        >
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Time</label>
            <input
              type="datetime-local"
              value={waterTime}
              onChange={(e) => setWaterTime(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Amount (ml)</label>
              <span className="text-xl font-black text-primary">{waterAmount}ml</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {[250, 500, 750, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setWaterAmount(amt)}
                  className={`py-3 rounded-xl border transition-all font-bold text-xs ${
                    waterAmount === amt 
                      ? 'bg-primary/20 border-primary text-primary' 
                      : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                  }`}
                >
                  {amt}ml
                </button>
              ))}
            </div>

            <div className="space-y-4 pt-2">
              <input
                type="range"
                min="0"
                max="2000"
                step="50"
                value={waterAmount}
                onChange={(e) => setWaterAmount(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] font-bold text-white/20 uppercase tracking-tighter">
                <span>0ml</span>
                <span>500ml</span>
                <span>1000ml</span>
                <span>1500ml</span>
                <span>2000ml</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWaterAmount(prev => Math.max(0, prev - 100))}
                className="flex-1 py-3 bg-white/5 border border-white/5 rounded-xl text-white/60 font-bold text-xs hover:bg-white/10 transition-colors"
              >
                -100ml
              </button>
              <button
                type="button"
                onClick={() => setWaterAmount(prev => prev + 100)}
                className="flex-1 py-3 bg-white/5 border border-white/5 rounded-xl text-white/60 font-bold text-xs hover:bg-white/10 transition-colors"
              >
                +100ml
              </button>
              <button
                type="button"
                onClick={() => setWaterAmount(prev => prev + 250)}
                className="flex-1 py-3 bg-white/5 border border-white/5 rounded-xl text-white/60 font-bold text-xs hover:bg-white/10 transition-colors"
              >
                +250ml
              </button>
            </div>

            <input
              type="number"
              value={waterAmount}
              onChange={(e) => setWaterAmount(Number(e.target.value))}
              placeholder="Custom amount..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors text-center font-bold"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all active:scale-95"
          >
            <Droplets size={20} />
            <span>Log Water</span>
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
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Time</label>
            <input
              type="datetime-local"
              value={weightTime}
              onChange={(e) => setWeightTime(e.target.value)}
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
                      <Utensils size={20} strokeWidth={3} />
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
              filteredWorkouts.map((workout: any) => (
                <div key={workout.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        workout.source === 'strava' ? "bg-[#FC6100]/20 text-[#FC6100]" : 
                        "bg-blue-500/20 text-blue-500"
                      )}>
                        {workout.type?.toLowerCase().includes('bike') || workout.type?.toLowerCase().includes('cycle') ? <Bike size={20} strokeWidth={2.5} /> :
                         workout.type?.toLowerCase().includes('run') || workout.type?.toLowerCase().includes('walk') ? <Footprints size={20} strokeWidth={2.5} /> :
                         <Dumbbell size={20} strokeWidth={2.5} />}
                      </div>
                      <div>
                        <p className="font-bold text-white capitalize">
                          {workout.name || workout.type || 'Workout'}
                        </p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                          {workout.source || 'Manual'} • {workout.intensity || 'moderate'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {onUpdateWorkout && (
                        <select
                          value={workout.intensity || 'moderate'}
                          onChange={(e) => onUpdateWorkout(workout.id, { intensity: e.target.value })}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-white/60 focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer hover:bg-white/10"
                        >
                          <option value="low">Low</option>
                          <option value="moderate">Med</option>
                          <option value="high">High</option>
                        </select>
                      )}
                      <button
                        onClick={() => onDeleteWorkout(workout.id)}
                        className="p-2 text-white/20 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                    <div className="text-center">
                      <p className="text-[10px] text-white/20 font-bold uppercase">Duration</p>
                      <p className="text-xs font-bold text-white">
                        {workout.duration || Math.round((workout.endTime - workout.startTime) / 60000)}m
                      </p>
                    </div>
                    {!!workout.distance && (
                      <div className="text-center">
                        <p className="text-[10px] text-white/20 font-bold uppercase">Distance</p>
                        <p className="text-xs font-bold text-white">{(workout.distance / 1000).toFixed(2)}km</p>
                      </div>
                    )}
                    {!!workout.calories && (
                      <div className="text-center">
                        <p className="text-[10px] text-white/20 font-bold uppercase">Calories</p>
                        <p className="text-xs font-bold text-white">{Math.round(workout.calories)}kcal</p>
                      </div>
                    )}
                    {!!workout.elevation && (
                      <div className="text-center">
                        <p className="text-[10px] text-white/20 font-bold uppercase">Elevation</p>
                        <p className="text-xs font-bold text-white">{Math.round(workout.elevation)}m</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] text-white/20">
                      {formatTime(workout.startTime)} - {formatTime(workout.endTime || (workout.startTime + (workout.duration || 0) * 60000))}
                    </p>
                    <p className="text-[10px] text-white/20">
                      {formatDate(workout.startTime || new Date(workout.startDate).getTime())}
                    </p>
                  </div>
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
                      <Moon size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="font-bold text-white capitalize">{s.quality} Sleep</p>
                      <p className="text-xs text-white/40">
                        {s.duration.toFixed(1)} hours • {formatTime(s.bedtime)} - {formatTime(s.wakeUpTime)}
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
                      <Droplets size={20} strokeWidth={2.5} />
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
                      <Scale size={20} strokeWidth={2.5} />
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
