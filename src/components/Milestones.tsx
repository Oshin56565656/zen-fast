import React, { FC, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Droplets, Scale, CheckCircle2, Lock, Star, Moon, Dumbbell, ChevronDown, ChevronUp } from 'lucide-react';
import { WaterRecord, WeightRecord, SleepRecord, WorkoutRecord, Milestone, DailySummary } from '../types';

interface MilestonesProps {
  water: WaterRecord[];
  weights: WeightRecord[];
  sleep: SleepRecord[];
  workouts: WorkoutRecord[];
  dailySummaries?: DailySummary[];
}

export const Milestones: FC<MilestonesProps> = ({ water, weights, sleep, workouts, dailySummaries = [] }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('weight');

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

  const waterMilestones: Milestone[] = [
    {
      id: 'water-1',
      title: 'Hydration Hero',
      description: 'Log 10L of water total',
      category: 'water',
      threshold: 10000,
      icon: '💧',
      achieved: totalWater >= 10000,
      progress: Math.min(100, (totalWater / 10000) * 100)
    },
    {
      id: 'water-2',
      title: 'Aquarius',
      description: 'Log 50L of water total',
      category: 'water',
      threshold: 50000,
      icon: '🌊',
      achieved: totalWater >= 50000,
      progress: Math.min(100, (totalWater / 50000) * 100)
    },
    {
      id: 'water-3',
      title: 'Water God',
      description: 'Log 100L of water total',
      category: 'water',
      threshold: 100000,
      icon: '🔱',
      achieved: totalWater >= 100000,
      progress: Math.min(100, (totalWater / 100000) * 100)
    },
    {
      id: 'water-4',
      title: 'Ocean Explorer',
      description: 'Log 250L of water total',
      category: 'water',
      threshold: 250000,
      icon: '🐳',
      achieved: totalWater >= 250000,
      progress: Math.min(100, (totalWater / 250000) * 100)
    },
    {
      id: 'water-5',
      title: 'Hydration Master',
      description: 'Log 500L of water total',
      category: 'water',
      threshold: 500000,
      icon: '💎',
      achieved: totalWater >= 500000,
      progress: Math.min(100, (totalWater / 500000) * 100)
    },
    {
      id: 'water-6',
      title: 'Water Legend',
      description: 'Log 1000L of water total',
      category: 'water',
      threshold: 1000000,
      icon: '🌌',
      achieved: totalWater >= 1000000,
      progress: Math.min(100, (totalWater / 1000000) * 100)
    },
    {
      id: 'water-goal-1',
      title: 'Consistent Hydrator',
      description: 'Achieve water goal 3 times',
      category: 'water',
      threshold: 3,
      icon: '🥤',
      achieved: waterGoalMetDays >= 3,
      progress: Math.min(100, (waterGoalMetDays / 3) * 100)
    },
    {
      id: 'water-goal-2',
      title: 'Water Habit',
      description: 'Achieve water goal 7 times',
      category: 'water',
      threshold: 7,
      icon: '💧',
      achieved: waterGoalMetDays >= 7,
      progress: Math.min(100, (waterGoalMetDays / 7) * 100)
    },
    {
      id: 'water-goal-3',
      title: 'Hydration Pro',
      description: 'Achieve water goal 30 times',
      category: 'water',
      threshold: 30,
      icon: '🏆',
      achieved: waterGoalMetDays >= 30,
      progress: Math.min(100, (waterGoalMetDays / 30) * 100)
    },
    {
      id: 'water-goal-4',
      title: 'Master of Flow',
      description: 'Achieve water goal 100 times',
      category: 'water',
      threshold: 100,
      icon: '🌊',
      achieved: waterGoalMetDays >= 100,
      progress: Math.min(100, (waterGoalMetDays / 100) * 100)
    }
  ];

  const weightMilestones: Milestone[] = [
    {
      id: 'weight-1',
      title: 'First Step',
      description: 'Log your weight for the first time',
      category: 'weight',
      threshold: 1,
      icon: '⚖️',
      achieved: weightLogs >= 1,
      progress: Math.min(100, (weightLogs / 1) * 100)
    },
    {
      id: 'weight-2',
      title: 'Steady Progress',
      description: 'Log your weight 5 times',
      category: 'weight',
      threshold: 5,
      icon: '📈',
      achieved: weightLogs >= 5,
      progress: Math.min(100, (weightLogs / 5) * 100)
    },
    {
      id: 'weight-3',
      title: 'Commitment',
      description: 'Log your weight 30 times',
      category: 'weight',
      threshold: 30,
      icon: '🔥',
      achieved: weightLogs >= 30,
      progress: Math.min(100, (weightLogs / 30) * 100)
    },
    {
      id: 'weight-4',
      title: 'Downwards Trend',
      description: 'Lose 1kg total',
      category: 'weight',
      threshold: 1,
      icon: '📉',
      achieved: weightLoss >= 1,
      progress: Math.min(100, (weightLoss / 1) * 100)
    },
    {
      id: 'weight-5',
      title: 'Big Milestone',
      description: 'Lose 5kg total',
      category: 'weight',
      threshold: 5,
      icon: '🌟',
      achieved: weightLoss >= 5,
      progress: Math.min(100, (weightLoss / 5) * 100)
    },
    {
      id: 'weight-6',
      title: 'Transformation',
      description: 'Lose 10kg total',
      category: 'weight',
      threshold: 10,
      icon: '🏆',
      achieved: weightLoss >= 10,
      progress: Math.min(100, (weightLoss / 10) * 100)
    },
    {
      id: 'weight-7',
      title: 'Half Century',
      description: 'Log your weight 50 times',
      category: 'weight',
      threshold: 50,
      icon: '🎖️',
      achieved: weightLogs >= 50,
      progress: Math.min(100, (weightLogs / 50) * 100)
    },
    {
      id: 'weight-8',
      title: 'Century Club',
      description: 'Log your weight 100 times',
      category: 'weight',
      threshold: 100,
      icon: '💯',
      achieved: weightLogs >= 100,
      progress: Math.min(100, (weightLogs / 100) * 100)
    },
    {
      id: 'weight-9',
      title: 'Ultimate Goal',
      description: 'Lose 20kg total',
      category: 'weight',
      threshold: 20,
      icon: '💎',
      achieved: weightLoss >= 20,
      progress: Math.min(100, (weightLoss / 20) * 100)
    },
    {
      id: 'deficit-1',
      title: 'Calorie Conscious',
      description: 'Achieve your first calorie deficit day',
      category: 'weight',
      threshold: 1,
      icon: '🥗',
      achieved: deficitDays >= 1,
      progress: Math.min(100, (deficitDays / 1) * 100)
    },
    {
      id: 'deficit-2',
      title: 'Fat Burner',
      description: 'Achieve 7 days of calorie deficit',
      category: 'weight',
      threshold: 7,
      icon: '🔥',
      achieved: deficitDays >= 7,
      progress: Math.min(100, (deficitDays / 7) * 100)
    },
    {
      id: 'deficit-3',
      title: 'Metabolic Master',
      description: 'Achieve 30 days of calorie deficit',
      category: 'weight',
      threshold: 30,
      icon: '⚡',
      achieved: deficitDays >= 30,
      progress: Math.min(100, (deficitDays / 30) * 100)
    },
    {
      id: 'deficit-4',
      title: 'Weight Loss Legend',
      description: 'Achieve 100 days of calorie deficit',
      category: 'weight',
      threshold: 100,
      icon: '👑',
      achieved: deficitDays >= 100,
      progress: Math.min(100, (deficitDays / 100) * 100)
    }
  ];

  const sleepMilestones: Milestone[] = [
    {
      id: 'sleep-1',
      title: 'Early Bird',
      description: 'Log 7 sleep entries',
      category: 'sleep',
      threshold: 7,
      icon: '🌅',
      achieved: sleepLogs >= 7,
      progress: Math.min(100, (sleepLogs / 7) * 100)
    },
    {
      id: 'sleep-2',
      title: 'Perfect Rest',
      description: 'Log a 5-star quality sleep',
      category: 'sleep',
      threshold: 1,
      icon: '✨',
      achieved: perfectSleeps >= 1,
      progress: Math.min(100, (perfectSleeps / 1) * 100)
    },
    {
      id: 'sleep-3',
      title: 'Dreamer',
      description: 'Log 30 sleep entries',
      category: 'sleep',
      threshold: 30,
      icon: '🌙',
      achieved: sleepLogs >= 30,
      progress: Math.min(100, (sleepLogs / 30) * 100)
    },
    {
      id: 'sleep-4',
      title: 'Sleep Master',
      description: 'Log 100 sleep entries',
      category: 'sleep',
      threshold: 100,
      icon: '🦉',
      achieved: sleepLogs >= 100,
      progress: Math.min(100, (sleepLogs / 100) * 100)
    },
    {
      id: 'sleep-5',
      title: 'Zen Master',
      description: 'Log 10 perfect quality sleeps',
      category: 'sleep',
      threshold: 10,
      icon: '🧘',
      achieved: perfectSleeps >= 10,
      progress: Math.min(100, (perfectSleeps / 10) * 100)
    },
    {
      id: 'sleep-6',
      title: 'Rest King',
      description: 'Log 365 sleep entries',
      category: 'sleep',
      threshold: 365,
      icon: '👑',
      achieved: sleepLogs >= 365,
      progress: Math.min(100, (sleepLogs / 365) * 100)
    }
  ];

  const workoutMilestones: Milestone[] = [
    {
      id: 'workout-1',
      title: 'Getting Started',
      description: 'Log your first workout',
      category: 'workout',
      threshold: 1,
      icon: '💪',
      achieved: workoutLogs >= 1,
      progress: Math.min(100, (workoutLogs / 1) * 100)
    },
    {
      id: 'workout-2',
      title: 'Athlete',
      description: 'Log 10 workouts',
      category: 'workout',
      threshold: 10,
      icon: '🏃',
      achieved: workoutLogs >= 10,
      progress: Math.min(100, (workoutLogs / 10) * 100)
    },
    {
      id: 'workout-3',
      title: 'High Intensity',
      description: 'Complete a high intensity workout',
      category: 'workout',
      threshold: 1,
      icon: '⚡',
      achieved: highIntensityWorkouts >= 1,
      progress: Math.min(100, (highIntensityWorkouts / 1) * 100)
    },
    {
      id: 'workout-4',
      title: 'Fitness Legend',
      description: 'Log 50 workouts',
      category: 'workout',
      threshold: 50,
      icon: '👑',
      achieved: workoutLogs >= 50,
      progress: Math.min(100, (workoutLogs / 50) * 100)
    },
    {
      id: 'workout-5',
      title: 'Pro Athlete',
      description: 'Log 100 workouts',
      category: 'workout',
      threshold: 100,
      icon: '🏅',
      achieved: workoutLogs >= 100,
      progress: Math.min(100, (workoutLogs / 100) * 100)
    },
    {
      id: 'workout-6',
      title: 'Beast Mode',
      description: 'Log 25 high intensity workouts',
      category: 'workout',
      threshold: 25,
      icon: '🦁',
      achieved: highIntensityWorkouts >= 25,
      progress: Math.min(100, (highIntensityWorkouts / 25) * 100)
    },
    {
      id: 'workout-7',
      title: 'Olympian',
      description: 'Log 500 workouts',
      category: 'workout',
      threshold: 500,
      icon: '🏛️',
      achieved: workoutLogs >= 500,
      progress: Math.min(100, (workoutLogs / 500) * 100)
    }
  ];

  const allMilestones = [...waterMilestones, ...weightMilestones, ...sleepMilestones, ...workoutMilestones];
  const achievedCount = allMilestones.filter(m => m.achieved).length;

  const toggleCategory = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 p-6 rounded-3xl border border-yellow-500/20 flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-yellow-500 flex items-center space-x-2">
            <Trophy size={20} />
            <span>Milestones</span>
          </h3>
          <p className="text-sm text-white/60">{achievedCount} of {allMilestones.length} awards earned</p>
        </div>
        <div className="text-3xl font-black text-yellow-500/40">
          {Math.round((achievedCount / allMilestones.length) * 100)}%
        </div>
      </div>

      <div className="space-y-4">
        <MilestoneCategory
          title="Weight Journey"
          icon={<Scale size={18} className="text-emerald-500" />}
          milestones={weightMilestones}
          isExpanded={expandedCategory === 'weight'}
          onToggle={() => toggleCategory('weight')}
        />
        <MilestoneCategory
          title="Hydration"
          icon={<Droplets size={18} className="text-blue-400" />}
          milestones={waterMilestones}
          isExpanded={expandedCategory === 'water'}
          onToggle={() => toggleCategory('water')}
        />
        <MilestoneCategory
          title="Sleep Quality"
          icon={<Moon size={18} className="text-indigo-400" />}
          milestones={sleepMilestones}
          isExpanded={expandedCategory === 'sleep'}
          onToggle={() => toggleCategory('sleep')}
        />
        <MilestoneCategory
          title="Workouts"
          icon={<Dumbbell size={18} className="text-orange-500" />}
          milestones={workoutMilestones}
          isExpanded={expandedCategory === 'workout'}
          onToggle={() => toggleCategory('workout')}
        />
      </div>
    </div>
  );
};

interface MilestoneCategoryProps {
  title: string;
  icon: React.ReactNode;
  milestones: Milestone[];
  isExpanded: boolean;
  onToggle: () => void;
}

const MilestoneCategory: FC<MilestoneCategoryProps> = ({ title, icon, milestones, isExpanded, onToggle }) => {
  const achievedCount = milestones.filter(m => m.achieved).length;

  return (
    <div className="bg-card rounded-3xl border border-white/5 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white/5 rounded-xl">
            {icon}
          </div>
          <div className="text-left">
            <h3 className="font-bold text-white leading-none mb-1">{title}</h3>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
              {achievedCount} / {milestones.length} Earned
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="h-1.5 w-16 bg-white/5 rounded-full overflow-hidden hidden sm:block">
            <div 
              className="h-full bg-primary/40 rounded-full" 
              style={{ width: `${(achievedCount / milestones.length) * 100}%` }}
            />
          </div>
          {isExpanded ? <ChevronUp size={18} className="text-white/20" /> : <ChevronDown size={18} className="text-white/20" />}
        </div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    milestone.achieved 
                      ? 'bg-white/5 border-yellow-500/30' 
                      : 'bg-white/5 border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xl ${
                      milestone.achieved ? 'bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-white/5'
                    }`}>
                      {milestone.achieved ? milestone.icon : <Lock size={16} className="text-white/20" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className={`font-bold text-sm truncate ${milestone.achieved ? 'text-white' : 'text-white/40'}`}>
                          {milestone.title}
                        </h4>
                        {milestone.achieved && <CheckCircle2 size={14} className="text-yellow-500 flex-shrink-0" />}
                      </div>
                      <p className="text-[10px] text-white/40 leading-tight mb-2">{milestone.description}</p>
                      
                      {!milestone.achieved && (
                        <div className="space-y-1">
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${milestone.progress}%` }}
                              className="h-full bg-primary/40 rounded-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
