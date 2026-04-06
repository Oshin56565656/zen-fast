import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Utensils, Dumbbell, Plus, Trash2, Clock, Scale, Moon, Camera, Scan, Droplets, LineChart } from 'lucide-react';
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
  onDeleteWeight
}) => {
  const [activeType, setActiveType] = useState<'meal' | 'workout' | 'sleep' | 'water' | 'weight'>('meal');
  const [searchDate, setSearchDate] = useState<string>('');
  
  // Meal Form State
  const [mealScale, setMealScale] = useState<'light' | 'normal' | 'large'>('normal');
  const [mealTime, setMealTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [mealDescription, setMealDescription] = useState('');
  const [mealBarcode, setMealBarcode] = useState('');
  const [showScanner, setShowScanner] = useState(false);

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
          onClick={() => setActiveType('water')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all whitespace-nowrap ${
            activeType === 'water' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
          }`}
        >
          <Droplets size={18} />
          <span className="font-bold">Water</span>
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
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors min-h-[100px] resize-none"
              />
              {mealBarcode && (
                <div className="absolute bottom-3 right-3 flex items-center space-x-1 bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded-full border border-primary/30">
                  <Scan size={10} />
                  <span>{mealBarcode}</span>
                </div>
              )}
            </div>
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
                        {workout.duration} mins • {formatTime(workout.startTime)} - {formatTime(workout.endTime)}
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
