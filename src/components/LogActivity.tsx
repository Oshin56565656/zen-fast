import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Utensils, Dumbbell, Plus, Trash2, Clock, Scale, Zap, Moon } from 'lucide-react';
import { MealRecord, WorkoutRecord, SleepRecord } from '../types';
import { formatTime, formatDate } from '../lib/utils';
import { format, subHours } from 'date-fns';

interface LogActivityProps {
  meals: MealRecord[];
  workouts: WorkoutRecord[];
  sleep: SleepRecord[];
  onLogMeal: (time: number, scale: 'light' | 'normal' | 'large', description?: string) => void;
  onLogWorkout: (startTime: number, endTime: number, intensity: 'low' | 'moderate' | 'high') => void;
  onLogSleep: (bedtime: number, wakeUpTime: number, quality: 'poor' | 'fair' | 'good' | 'excellent') => void;
  onDeleteMeal: (id: string) => void;
  onDeleteWorkout: (id: string) => void;
  onDeleteSleep: (id: string) => void;
}

const LogActivity: React.FC<LogActivityProps> = ({
  meals,
  workouts,
  sleep,
  onLogMeal,
  onLogWorkout,
  onLogSleep,
  onDeleteMeal,
  onDeleteWorkout,
  onDeleteSleep
}) => {
  const [activeType, setActiveType] = useState<'meal' | 'workout' | 'sleep'>('meal');
  const [searchDate, setSearchDate] = useState<string>('');
  
  // Meal Form State
  const [mealScale, setMealScale] = useState<'light' | 'normal' | 'large'>('normal');
  const [mealTime, setMealTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [mealDescription, setMealDescription] = useState('');

  // Workout Form State
  const [workoutIntensity, setWorkoutIntensity] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [workoutStartTime, setWorkoutStartTime] = useState(format(subHours(new Date(), 0.5), "yyyy-MM-dd'T'HH:mm"));
  const [workoutEndTime, setWorkoutEndTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  // Sleep Form State
  const [sleepQuality, setSleepQuality] = useState<'poor' | 'fair' | 'good' | 'excellent'>('good');
  const [bedtime, setBedtime] = useState(format(subHours(new Date(), 8), "yyyy-MM-dd'T'HH:mm"));
  const [wakeUpTime, setWakeUpTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  const handleLogMeal = (e: React.FormEvent) => {
    e.preventDefault();
    onLogMeal(new Date(mealTime).getTime(), mealScale, mealDescription);
    setMealDescription('');
  };

  const handleLogWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    onLogWorkout(new Date(workoutStartTime).getTime(), new Date(workoutEndTime).getTime(), workoutIntensity);
  };

  const handleLogSleep = (e: React.FormEvent) => {
    e.preventDefault();
    onLogSleep(new Date(bedtime).getTime(), new Date(wakeUpTime).getTime(), sleepQuality);
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

  const filteredMeals = filterByDate(meals) as MealRecord[];
  const filteredWorkouts = filterByDate(workouts) as WorkoutRecord[];
  const filteredSleep = filterByDate(sleep) as SleepRecord[];

  return (
    <div className="space-y-8 p-6 pb-24">
      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
        <button
          onClick={() => setActiveType('meal')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl transition-all ${
            activeType === 'meal' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
          }`}
        >
          <Utensils size={18} />
          <span className="font-bold">Meal</span>
        </button>
        <button
          onClick={() => setActiveType('workout')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl transition-all ${
            activeType === 'workout' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
          }`}
        >
          <Dumbbell size={18} />
          <span className="font-bold">Workout</span>
        </button>
        <button
          onClick={() => setActiveType('sleep')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl transition-all ${
            activeType === 'sleep' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
          }`}
        >
          <Moon size={18} />
          <span className="font-bold">Sleep</span>
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
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Meal Scale</label>
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
            <textarea
              value={mealDescription}
              onChange={(e) => setMealDescription(e.target.value)}
              placeholder="e.g. Grilled chicken salad with avocado..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors min-h-[100px] resize-none"
            />
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
      ) : (
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

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Intensity</label>
            <select
              value={workoutIntensity}
              onChange={(e) => setWorkoutIntensity(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>Log Workout</span>
          </button>
        </motion.form>
      )}

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
                  <button
                    onClick={() => onDeleteMeal(meal.id)}
                    className="p-2 text-white/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
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
                      <p className="font-bold text-white capitalize">{workout.intensity} Intensity</p>
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
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default LogActivity;
