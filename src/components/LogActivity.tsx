import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Utensils, Dumbbell, Plus, Trash2, Clock, Scale, Zap } from 'lucide-react';
import { MealRecord, WorkoutRecord } from '../types';
import { formatTime, formatDate } from '../lib/utils';
import { format } from 'date-fns';

interface LogActivityProps {
  meals: MealRecord[];
  workouts: WorkoutRecord[];
  onLogMeal: (time: number, scale: 'snack' | 'normal' | 'large') => void;
  onLogWorkout: (time: number, duration: number, intensity: 'low' | 'moderate' | 'high') => void;
  onDeleteMeal: (id: string) => void;
  onDeleteWorkout: (id: string) => void;
}

const LogActivity: React.FC<LogActivityProps> = ({
  meals,
  workouts,
  onLogMeal,
  onLogWorkout,
  onDeleteMeal,
  onDeleteWorkout
}) => {
  const [activeType, setActiveType] = useState<'meal' | 'workout'>('meal');
  
  // Meal Form State
  const [mealScale, setMealScale] = useState<'snack' | 'normal' | 'large'>('normal');
  const [mealTime, setMealTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  // Workout Form State
  const [workoutIntensity, setWorkoutIntensity] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [workoutDuration, setWorkoutDuration] = useState(30);
  const [workoutTime, setWorkoutTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  const handleLogMeal = (e: React.FormEvent) => {
    e.preventDefault();
    onLogMeal(new Date(mealTime).getTime(), mealScale);
  };

  const handleLogWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    onLogWorkout(new Date(workoutTime).getTime(), workoutDuration, workoutIntensity);
  };

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
              {(['snack', 'normal', 'large'] as const).map((s) => (
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

          <button
            type="submit"
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-primary/90 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>Log Meal</span>
          </button>
        </motion.form>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleLogWorkout}
          className="bg-card p-6 rounded-3xl border border-white/5 space-y-6"
        >
          <div className="space-y-2">
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Workout Time</label>
            <input
              type="datetime-local"
              value={workoutTime}
              onChange={(e) => setWorkoutTime(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Duration (min)</label>
              <input
                type="number"
                value={workoutDuration}
                onChange={(e) => setWorkoutDuration(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              />
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
        <h3 className="text-lg font-bold text-white px-2">Recent Activity</h3>
        
        <div className="space-y-3">
          {activeType === 'meal' ? (
            meals.length > 0 ? (
              meals.map((meal) => (
                <div key={meal.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500">
                      <Utensils size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-white capitalize">{meal.scale} Meal</p>
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
              <p className="text-center text-white/20 py-8 italic">No meals logged yet</p>
            )
          ) : (
            workouts.length > 0 ? (
              workouts.map((workout) => (
                <div key={workout.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-500">
                      <Dumbbell size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-white capitalize">{workout.intensity} Intensity</p>
                      <p className="text-xs text-white/40">{workout.duration} mins • {formatDate(workout.time)}, {formatTime(workout.time)}</p>
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
              <p className="text-center text-white/20 py-8 italic">No workouts logged yet</p>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default LogActivity;
