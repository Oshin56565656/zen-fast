import React, { FC, useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, CheckCircle2, X } from 'lucide-react';
import { WaterRecord, WeightRecord, SleepRecord, WorkoutRecord, Milestone, DailySummary } from '../types';
import { cn } from '../lib/utils';

interface MilestoneNotifierProps {
  water: WaterRecord[];
  weights: WeightRecord[];
  sleep: SleepRecord[];
  workouts: WorkoutRecord[];
  dailySummaries: DailySummary[];
  isLoaded: boolean;
}

export const MilestoneNotifier: FC<MilestoneNotifierProps> = ({ water, weights, sleep, workouts, dailySummaries, isLoaded }) => {
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);
  const notifiedIds = useRef<Set<string>>(new Set());
  const isInitialized = useRef(false);

  // Helper to calculate milestone status - keeping it in sync with Milestones.tsx
  const getMilestones = (): Milestone[] => {
    const totalWater = water.reduce((acc, curr) => acc + curr.amount, 0);
    const waterGoalMetDays = dailySummaries.filter(s => s.isWaterGoalMet).length;
    const deficitDays = dailySummaries.filter(s => s.isDeficit).length;
    const sortedWeights = [...weights].sort((a, b) => a.time - b.time);
    const weightLoss = sortedWeights.length > 1 ? sortedWeights[0].weight - sortedWeights[sortedWeights.length - 1].weight : 0;
    const weightLogs = weights.length;
    const sleepLogs = sleep.length;
    const workoutLogs = workouts.length;
    const perfectSleeps = sleep.filter(s => s.quality === 'excellent').length;
    const highIntensityWorkouts = workouts.filter(w => w.intensity === 'high').length;

    const milestones: Milestone[] = [
      // Water
      { id: 'water-1', title: 'Hydration Hero', description: 'Log 10L of water total', category: 'water', threshold: 10000, icon: '💧', achieved: totalWater >= 10000, progress: 0 },
      { id: 'water-2', title: 'Aquarius', description: 'Log 50L of water total', category: 'water', threshold: 50000, icon: '🌊', achieved: totalWater >= 50000, progress: 0 },
      { id: 'water-3', title: 'Water God', description: 'Log 100L of water total', category: 'water', threshold: 100000, icon: '🔱', achieved: totalWater >= 100000, progress: 0 },
      { id: 'water-goal-1', title: 'Consistent Hydrator', description: 'Achieve water goal 3 times', category: 'water', threshold: 3, icon: '🥤', achieved: waterGoalMetDays >= 3, progress: 0 },
      { id: 'water-goal-2', title: 'Water Habit', description: 'Achieve water goal 7 times', category: 'water', threshold: 7, icon: '💧', achieved: waterGoalMetDays >= 7, progress: 0 },
      
      // Weight
      { id: 'weight-1', title: 'First Step', description: 'Log your weight for the first time', category: 'weight', threshold: 1, icon: '⚖️', achieved: weightLogs >= 1, progress: 0 },
      { id: 'weight-2', title: 'Steady Progress', description: 'Log your weight 5 times', category: 'weight', threshold: 5, icon: '📈', achieved: weightLogs >= 5, progress: 0 },
      { id: 'weight-3', title: 'Commitment', description: 'Log your weight 30 times', category: 'weight', threshold: 30, icon: '🔥', achieved: weightLogs >= 30, progress: 0 },
      { id: 'weight-4', title: 'Downwards Trend', description: 'Lose 1kg total', category: 'weight', threshold: 1, icon: '📉', achieved: weightLoss >= 1, progress: 0 },
      { id: 'weight-5', title: 'Transformation', description: 'Lose 5kg total', category: 'weight', threshold: 5, icon: '🌟', achieved: weightLoss >= 5, progress: 0 },
      { id: 'deficit-1', title: 'Calorie Conscious', description: 'Achieve your first calorie deficit day', category: 'weight', threshold: 1, icon: '🥗', achieved: deficitDays >= 1, progress: 0 },
      { id: 'deficit-2', title: 'Fat Burner', description: 'Achieve 7 days of calorie deficit', category: 'weight', threshold: 7, icon: '🔥', achieved: deficitDays >= 7, progress: 0 },
      { id: 'deficit-3', title: 'Metabolic Master', description: 'Achieve 30 days of calorie deficit', category: 'weight', threshold: 30, icon: '⚡', achieved: deficitDays >= 30, progress: 0 },
      { id: 'deficit-4', title: 'Weight Loss Legend', description: 'Achieve 100 days of calorie deficit', category: 'weight', threshold: 100, icon: '👑', achieved: deficitDays >= 100, progress: 0 },
      
      // Sleep
      { id: 'sleep-1', title: 'Early Bird', description: 'Log 7 sleep entries', category: 'sleep', threshold: 7, icon: '🌅', achieved: sleepLogs >= 7, progress: 0 },
      { id: 'sleep-2', title: 'Perfect Rest', description: 'Log a 5-star quality sleep', category: 'sleep', threshold: 1, icon: '✨', achieved: perfectSleeps >= 1, progress: 0 },
      { id: 'sleep-3', title: 'Dreamer', description: 'Log 30 sleep entries', category: 'sleep', threshold: 30, icon: '🌙', achieved: sleepLogs >= 30, progress: 0 },
      { id: 'sleep-4', title: 'Sleep Master', description: 'Log 100 sleep entries', category: 'sleep', threshold: 100, icon: '🦉', achieved: sleepLogs >= 100, progress: 0 },
      { id: 'sleep-5', title: 'Zen Master', description: 'Log 10 perfect quality sleeps', category: 'sleep', threshold: 10, icon: '🧘', achieved: perfectSleeps >= 10, progress: 0 },
      
      // Workout
      { id: 'workout-1', title: 'Getting Started', description: 'Log your first workout', category: 'workout', threshold: 1, icon: '💪', achieved: workoutLogs >= 1, progress: 0 },
      { id: 'workout-2', title: 'Athlete', description: 'Log 10 workouts', category: 'workout', threshold: 10, icon: '🏃', achieved: workoutLogs >= 10, progress: 0 },
      { id: 'workout-3', title: 'High Intensity', description: 'Complete a high intensity workout', category: 'workout', threshold: 1, icon: '⚡', achieved: highIntensityWorkouts >= 1, progress: 0 },
      { id: 'workout-4', title: 'Fitness Legend', description: 'Log 50 workouts', category: 'workout', threshold: 50, icon: '👑', achieved: workoutLogs >= 50, progress: 0 },
      { id: 'workout-5', title: 'Pro Athlete', description: 'Log 100 workouts', category: 'workout', threshold: 100, icon: '🏅', achieved: workoutLogs >= 100, progress: 0 },
      { id: 'workout-6', title: 'Beast Mode', description: 'Log 25 high intensity workouts', category: 'workout', threshold: 25, icon: '🦁', achieved: highIntensityWorkouts >= 25, progress: 0 },
    ];

    return milestones;
  };

  useEffect(() => {
    // Load already notified milestones from localStorage to prevent re-notifying
    const saved = localStorage.getItem('fasttrack_notified_milestones');
    if (saved) {
      try {
        const ids = JSON.parse(saved);
        notifiedIds.current = new Set(ids);
      } catch (e) {
        console.error('Failed to load notified milestones:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const milestones = getMilestones();
    const newlyAchieved = milestones.find(m => m.achieved && !notifiedIds.current.has(m.id));

    if (newlyAchieved) {
      // Don't notify on first run (prevents popups when loading existing data)
      if (isInitialized.current) {
        setActiveMilestone(newlyAchieved);
        
        // Auto-close after 5 seconds
        const timer = setTimeout(() => {
          setActiveMilestone(null);
        }, 5000);

        // Mark as notified
        notifiedIds.current.add(newlyAchieved.id);
        localStorage.setItem('fasttrack_notified_milestones', JSON.stringify([...notifiedIds.current]));

        return () => clearTimeout(timer);
      } else {
        // Just mark existing achieved milestones as notified on first run
        milestones.forEach(m => {
          if (m.achieved) notifiedIds.current.add(m.id);
        });
        localStorage.setItem('fasttrack_notified_milestones', JSON.stringify([...notifiedIds.current]));
        isInitialized.current = true;
      }
    } else if (!isInitialized.current) {
        isInitialized.current = true;
    }
  }, [water, weights, sleep, workouts, dailySummaries, isLoaded]);

  return (
    <AnimatePresence>
      {activeMilestone && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-3rem)] max-w-sm"
        >
          <div className="bg-card/95 backdrop-blur-xl border border-yellow-500/30 rounded-3xl p-5 shadow-2xl shadow-yellow-500/10 flex items-center space-x-4 relative overflow-hidden group">
            {/* Background sparkle effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none" />
            
            <div className="relative">
              <div className="w-14 h-14 bg-yellow-500/20 rounded-2xl flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                {activeMilestone.icon}
              </div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1 shadow-lg"
              >
                <Trophy size={12} className="text-black" />
              </motion.div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-0.5">
                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Milestone Earned!</span>
                <CheckCircle2 size={12} className="text-yellow-500" />
              </div>
              <h4 className="text-white font-black text-lg leading-tight truncate">{activeMilestone.title}</h4>
              <p className="text-white/40 text-[10px] leading-tight mt-1">{activeMilestone.description}</p>
            </div>

            <button 
              onClick={() => setActiveMilestone(null)}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/20 hover:text-white"
            >
              <X size={18} />
            </button>
            
            {/* Progress line at bottom */}
            <motion.div 
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
              className="absolute bottom-0 left-0 h-1 bg-yellow-500/50"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
