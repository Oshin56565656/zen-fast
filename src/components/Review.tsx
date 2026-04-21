import React, { FC, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { FastRecord, SleepRecord, WaterRecord, WeightRecord, WorkoutRecord, DailySummary } from '../types';
import { format, subMonths, subYears, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear, endOfYear, isSameMonth, isSameYear, startOfDay, isWithinInterval } from 'date-fns';
import { TrendingDown, TrendingUp, Minus, Droplets, Scale, Dumbbell, Moon, Clock, ChevronDown, ChevronUp, Sparkles, RefreshCw, Flame, CheckCircle2 } from 'lucide-react';
import { getPeriodicReview } from '../services/aiService';
import { cn } from '../lib/utils';

interface ReviewProps {
  history: FastRecord[];
  sleep: SleepRecord[];
  water: WaterRecord[];
  weights: WeightRecord[];
  workouts: WorkoutRecord[];
  dailySummaries?: DailySummary[];
}

export const Review: FC<ReviewProps> = ({ history, sleep, water, weights, workouts, dailySummaries = [] }) => {
  const [view, setView] = React.useState<'monthly' | 'yearly'>('monthly');
  const [expandedSection, setExpandedSection] = useState<string | null>('weight');
  const [aiReview, setAiReview] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Monthly Data (Last 6 Months)
  const monthlyData = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const monthWater = water.filter(w => new Date(w.time) >= monthStart && new Date(w.time) <= monthEnd);
    const totalWater = monthWater.reduce((acc, curr) => acc + curr.amount, 0) / 1000; // L

    const monthWorkouts = workouts.filter(w => new Date(w.startTime) >= monthStart && new Date(w.startTime) <= monthEnd);
    const totalWorkouts = monthWorkouts.length;

    const monthSleep = sleep.filter(s => new Date(s.wakeUpTime) >= monthStart && new Date(s.wakeUpTime) <= monthEnd);
    const avgSleep = monthSleep.length > 0 ? monthSleep.reduce((acc, curr) => acc + curr.duration, 0) / monthSleep.length : 0;

    const monthWeights = weights.filter(w => new Date(w.time) >= monthStart && new Date(w.time) <= monthEnd).sort((a, b) => b.time - a.time);
    const lastWeight = monthWeights.length > 0 ? monthWeights[0].weight : null;

    const monthSummaries = dailySummaries.filter(s => {
      const d = new Date(s.date);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    });
    const waterGoalsMet = monthSummaries.filter(s => s.isWaterGoalMet).length;
    const deficitDays = monthSummaries.filter(s => s.isDeficit).length;

    return {
      name: format(date, 'MMM'),
      water: parseFloat(totalWater.toFixed(1)),
      workouts: totalWorkouts,
      sleep: parseFloat(avgSleep.toFixed(1)),
      weight: lastWeight,
      waterGoalsMet,
      deficitDays
    };
  });

  // Yearly Data (Current Year)
  const yearlyData = Array.from({ length: 12 }).map((_, i) => {
    const date = new Date(new Date().getFullYear(), i, 1);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const monthWater = water.filter(w => new Date(w.time) >= monthStart && new Date(w.time) <= monthEnd);
    const totalWater = monthWater.reduce((acc, curr) => acc + curr.amount, 0) / 1000;

    const monthWorkouts = workouts.filter(w => new Date(w.startTime) >= monthStart && new Date(w.startTime) <= monthEnd);
    
    const monthSleep = sleep.filter(s => new Date(s.wakeUpTime) >= monthStart && new Date(s.wakeUpTime) <= monthEnd);
    const avgSleep = monthSleep.length > 0 ? monthSleep.reduce((acc, curr) => acc + curr.duration, 0) / monthSleep.length : 0;

    const monthWeights = weights.filter(w => new Date(w.time) >= monthStart && new Date(w.time) <= monthEnd).sort((a, b) => b.time - a.time);
    const lastWeight = monthWeights.length > 0 ? monthWeights[0].weight : null;

    const monthSummaries = dailySummaries.filter(s => {
      const d = new Date(s.date);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    });
    const waterGoalsMet = monthSummaries.filter(s => s.isWaterGoalMet).length;
    const deficitDays = monthSummaries.filter(s => s.isDeficit).length;

    return {
      name: format(date, 'MMM'),
      water: parseFloat(totalWater.toFixed(1)),
      workouts: monthWorkouts.length,
      sleep: parseFloat(avgSleep.toFixed(1)),
      weight: lastWeight,
      waterGoalsMet,
      deficitDays
    };
  });

  const monthWeights = weights.filter(w => isSameMonth(new Date(w.time), new Date())).sort((a, b) => a.time - b.time);
  const monthWeightChange = monthWeights.length > 1 ? monthWeights[monthWeights.length - 1].weight - monthWeights[0].weight : 0;

  const handleAiReview = async () => {
    setLoadingAi(true);
    try {
      const data = view === 'monthly' ? monthlyData : yearlyData;
      const review = await getPeriodicReview(data, view);
      setAiReview(review);
    } catch (error) {
      console.error('AI Review error:', error);
      setAiReview("I'm sorry, I couldn't generate your review right now. Please try again later.");
    } finally {
      setLoadingAi(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Wrapped Stats
  const getWrappedStats = () => {
    const currentData = view === 'monthly' ? monthlyData[monthlyData.length - 1] : {
      workouts: yearlyData.reduce((acc, curr) => acc + curr.workouts, 0),
      water: yearlyData.reduce((acc, curr) => acc + curr.water, 0),
      weight: yearlyData[yearlyData.length - 1].weight,
      startWeight: yearlyData.find(d => d.weight !== null)?.weight || 0,
      sleep: yearlyData.reduce((acc, curr) => acc + curr.sleep, 0) / 12,
      waterGoals: yearlyData.reduce((acc, curr) => acc + curr.waterGoalsMet, 0),
    };

    const periodName = view === 'monthly' ? 'This Month' : 'This Year';
    
    let weightChange = 0;
    if (view === 'monthly') {
      weightChange = monthWeightChange;
    } else {
      const yearly = currentData as any;
      weightChange = yearly.weight && yearly.startWeight ? yearly.weight - yearly.startWeight : 0;
    }

    return [
      {
        label: 'Movement',
        value: `${currentData.workouts} sessions`,
        sub: `${periodName}`,
        icon: <Dumbbell className="text-orange-500" />,
        color: 'from-orange-500/20 to-orange-500/5'
      },
      {
        label: 'Hydration',
        value: `${(currentData.water as any).toFixed(1)}L`,
        sub: `Total intake`,
        icon: <Droplets className="text-blue-500" />,
        color: 'from-blue-500/20 to-blue-500/5'
      },
      {
        label: 'Body',
        value: `${Math.abs(weightChange).toFixed(1)}kg`,
        sub: weightChange < 0 ? 'Lost' : weightChange > 0 ? 'Gained' : 'Stable',
        icon: weightChange < 0 ? <TrendingDown size={18} /> : weightChange > 0 ? <TrendingUp size={18} /> : <Scale size={18} />,
        color: 'from-emerald-500/20 to-emerald-500/5',
        iconColor: weightChange < 0 ? 'text-emerald-500' : weightChange > 0 ? 'text-red-500' : 'text-white/40'
      },
      {
        label: 'Rest',
        value: `${(currentData.sleep as any).toFixed(1)}h`,
        sub: `Avg duration`,
        icon: <Moon className="text-indigo-500" />,
        color: 'from-indigo-500/20 to-indigo-500/5'
      }
    ];
  };

  const wrappedStats = getWrappedStats();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-fit h-[38px]">
          <button
            onClick={() => { setView('monthly'); setAiReview(null); }}
            className={`px-4 rounded-lg text-xs font-bold transition-all h-full ${
              view === 'monthly' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => { setView('yearly'); setAiReview(null); }}
            className={`px-4 rounded-lg text-xs font-bold transition-all h-full ${
              view === 'yearly' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
            }`}
          >
            Yearly
          </button>
        </div>

        <button
          onClick={handleAiReview}
          disabled={loadingAi}
          className="flex items-center space-x-2 bg-primary/10 text-primary px-4 rounded-xl text-xs font-bold hover:bg-primary/20 transition-all active:scale-95 disabled:opacity-50 h-[38px]"
        >
          {loadingAi ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
          <span>AI {view === 'monthly' ? 'Month' : 'Year'} Review</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {wrappedStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative overflow-hidden bg-gradient-to-br ${stat.color} border border-white/5 p-5 rounded-[2rem] flex flex-col justify-between aspect-square`}
          >
            <div className={`p-2 bg-black/20 rounded-xl w-fit ${stat.iconColor || ''}`}>
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight mb-0.5">{stat.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/30">{stat.label}</div>
              <div className="text-[10px] text-white/50 mt-1">{stat.sub}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {aiReview && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-primary/5 p-6 rounded-3xl border border-primary/20 relative overflow-hidden"
          >
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles size={18} className="text-primary" />
              <h3 className="font-bold text-sm text-primary uppercase tracking-widest">AI Coach Analysis</h3>
            </div>
            <p className="text-white/80 text-sm leading-relaxed italic">
              "{aiReview}"
            </p>
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Sparkles size={40} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {/* Weight Trend */}
        <CollapsibleSection
          title="Weight Trend"
          icon={<Scale size={18} className="text-emerald-500" />}
          isExpanded={expandedSection === 'weight'}
          onToggle={() => toggleSection('weight')}
          badge={
            <div className={`flex items-center space-x-1 text-xs font-bold ${monthWeightChange < 0 ? 'text-emerald-500' : monthWeightChange > 0 ? 'text-red-500' : 'text-white/40'}`}>
              {monthWeightChange < 0 ? <TrendingDown size={12} /> : monthWeightChange > 0 ? <TrendingUp size={12} /> : <Minus size={12} />}
              <span>{monthWeightChange === 0 ? 'Stable' : `${monthWeightChange > 0 ? '+' : ''}${monthWeightChange.toFixed(1)}kg`}</span>
            </div>
          }
        >
          <div className="h-48 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={view === 'monthly' ? monthlyData : yearlyData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="weight" stroke="#10b981" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={2} connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CollapsibleSection>

        {/* Hydration Review */}
        <CollapsibleSection
          title="Hydration"
          icon={<Droplets size={18} className="text-blue-400" />}
          isExpanded={expandedSection === 'water'}
          onToggle={() => toggleSection('water')}
        >
          <div className="h-48 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={view === 'monthly' ? monthlyData : yearlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="water" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CollapsibleSection>

        {/* Activity Review */}
        <CollapsibleSection
          title="Workouts"
          icon={<Dumbbell size={18} className="text-orange-500" />}
          isExpanded={expandedSection === 'workouts'}
          onToggle={() => toggleSection('workouts')}
        >
          <div className="h-48 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={view === 'monthly' ? monthlyData : yearlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="workouts" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CollapsibleSection>

        {/* Sleep Review */}
        <CollapsibleSection
          title="Sleep Quality"
          icon={<Moon size={18} className="text-indigo-400" />}
          isExpanded={expandedSection === 'sleep'}
          onToggle={() => toggleSection('sleep')}
        >
          <div className="h-48 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={view === 'monthly' ? monthlyData : yearlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="sleep" stroke="#818cf8" strokeWidth={3} dot={{ fill: '#818cf8' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CollapsibleSection>

        {/* Consistency Review */}
        <CollapsibleSection
          title="Consistency"
          icon={<CheckCircle2 size={18} className="text-primary" />}
          isExpanded={expandedSection === 'consistency'}
          onToggle={() => toggleSection('consistency')}
        >
          <div className="h-48 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={view === 'monthly' ? monthlyData : yearlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="waterGoalsMet" name="Water Goals" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="deficitDays" name="Deficit Days" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
};

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: React.ReactNode;
}

const CollapsibleSection: FC<CollapsibleSectionProps> = ({ title, icon, isExpanded, onToggle, children, badge }) => {
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
          <h3 className="font-bold text-white">{title}</h3>
        </div>
        <div className="flex items-center space-x-4">
          {badge}
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
            <div className="px-6 pb-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
