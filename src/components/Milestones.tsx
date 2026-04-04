import React, { FC } from 'react';
import { motion } from 'motion/react';
import { Trophy, Droplets, Scale, CheckCircle2, Lock, Star } from 'lucide-react';
import { WaterRecord, WeightRecord, Milestone } from '../types';

interface MilestonesProps {
  water: WaterRecord[];
  weights: WeightRecord[];
}

export const Milestones: FC<MilestonesProps> = ({ water, weights }) => {
  const totalWater = water.reduce((acc, curr) => acc + curr.amount, 0);
  const sortedWeights = [...weights].sort((a, b) => a.time - b.time);
  const weightLoss = sortedWeights.length > 1 ? sortedWeights[0].weight - sortedWeights[sortedWeights.length - 1].weight : 0;
  const weightLogs = weights.length;

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
    }
  ];

  const allMilestones = [...waterMilestones, ...weightMilestones];
  const achievedCount = allMilestones.filter(m => m.achieved).length;

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allMilestones.map((milestone) => (
          <motion.div
            key={milestone.id}
            whileHover={{ scale: 1.02 }}
            className={`p-4 rounded-2xl border transition-all ${
              milestone.achieved 
                ? 'bg-white/5 border-yellow-500/30' 
                : 'bg-white/5 border-white/5 opacity-60'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                milestone.achieved ? 'bg-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-white/5'
              }`}>
                {milestone.achieved ? milestone.icon : <Lock size={20} className="text-white/20" />}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className={`font-bold ${milestone.achieved ? 'text-white' : 'text-white/40'}`}>
                    {milestone.title}
                  </h4>
                  {milestone.achieved && <CheckCircle2 size={16} className="text-yellow-500" />}
                </div>
                <p className="text-xs text-white/40 leading-relaxed">{milestone.description}</p>
                
                {!milestone.achieved && (
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[10px] text-white/40 font-bold uppercase tracking-wider">
                      <span>Progress</span>
                      <span>{Math.round(milestone.progress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
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
          </motion.div>
        ))}
      </div>
    </div>
  );
};
