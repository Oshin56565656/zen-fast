import React, { FC, ReactNode } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { FastRecord, SleepRecord, WaterRecord, WeightRecord, WorkoutRecord, DailySummary, MoodRecord } from '../types';
import { format, subDays, isSameDay, startOfDay, eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, addMonths, isPast, startOfToday } from 'date-fns';
import { Trophy, Clock, Flame, Target, Moon, Zap, Star, Droplets, Scale, TrendingDown, TrendingUp, Minus, Calendar, Award, CheckCircle2, XCircle, ChevronLeft, ChevronRight, X, Heart } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Milestones } from './Milestones';
import { Review } from './Review';

interface StatsProps {
  history: FastRecord[];
  sleep: SleepRecord[];
  water: WaterRecord[];
  weights: WeightRecord[];
  workouts: WorkoutRecord[];
  moods: MoodRecord[];
  waterGoal?: number;
  dailySummaries?: DailySummary[];
}

export const Stats: FC<StatsProps> = ({ history, sleep, water, weights, workouts, moods, waterGoal = 2000, dailySummaries = [] }) => {
  const [activeTab, setActiveTab] = React.useState<'fasting' | 'sleep' | 'water' | 'weight' | 'mood' | 'milestones' | 'review' | 'consistency'>('fasting');
  const [searchDate, setSearchDate] = React.useState<string>('');
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  
  const totalFasts = history.length;

  // Mood Stats
  const totalMoodLogs = moods.length;
  const avgMood = totalMoodLogs > 0 ? moods.reduce((acc, curr) => acc + curr.mood, 0) / totalMoodLogs : 0;
  const avgEnergy = totalMoodLogs > 0 ? moods.reduce((acc, curr) => acc + curr.energy, 0) / totalMoodLogs : 0;
  
  const moodTrends = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(startOfToday(), 6 - i);
    const dayMoods = moods.filter(m => isSameDay(new Date(m.time), date));
    return {
      name: format(date, 'EEE'),
      mood: dayMoods.length > 0 ? dayMoods.reduce((acc, curr) => acc + curr.mood, 0) / dayMoods.length : null,
      energy: dayMoods.length > 0 ? dayMoods.reduce((acc, curr) => acc + curr.energy, 0) / dayMoods.length : null,
    };
  });

  // Consistency Stats (Total Met vs Total Logged)
  const waterDaysLogged = new Set(water.map(w => format(new Date(w.time), 'yyyy-MM-dd')));
  const waterStats = Array.from(waterDaysLogged).reduce<{ met: number, total: number }>((acc, dateStr) => {
    const summary = dailySummaries.find(s => s.date === dateStr);
    const dayAmount = water
      .filter(w => format(new Date(w.time), 'yyyy-MM-dd') === dateStr)
      .reduce((sum, curr) => sum + curr.amount, 0);
    
    // For today, we favor the current waterGoal setting. 
    // For past days, we favor the goal captured in the summary.
    const isTodayStr = dateStr === format(new Date(), 'yyyy-MM-dd');
    const goal = (summary && !isTodayStr) ? summary.waterGoal : waterGoal;
    
    // Success is sticky: if the summary says it was met, or logs show it's met now.
    const met = (summary?.isWaterGoalMet) || dayAmount >= goal;
    
    return {
      met: acc.met + (met ? 1 : 0),
      total: acc.total + 1
    };
  }, { met: 0, total: 0 });

  const calorieStats = dailySummaries.reduce<{ met: number, total: number }>((acc, curr) => {
    if (typeof curr.isDeficit === 'boolean') {
      return {
        met: acc.met + (curr.isDeficit ? 1 : 0),
        total: acc.total + 1
      };
    }
    return acc;
  }, { met: 0, total: 0 });
  const avgFastDuration = totalFasts > 0 
    ? history.reduce((acc, curr) => acc + curr.duration, 0) / totalFasts 
    : 0;
  const longestFast = totalFasts > 0 
    ? Math.max(...history.map(h => h.duration)) 
    : 0;
  const successRate = totalFasts > 0 
    ? Math.round((history.filter(h => h.completed).length / totalFasts) * 100) 
    : 0;

  // Sleep Stats
  const totalSleepLogs = sleep.length;
  const avgSleepDuration = totalSleepLogs > 0
    ? sleep.reduce((acc, curr) => acc + curr.duration, 0) / totalSleepLogs
    : 0;
  const bestQuality = totalSleepLogs > 0
    ? sleep.filter(s => s.quality === 'excellent').length
    : 0;
  const avgQualityScore = totalSleepLogs > 0
    ? sleep.reduce((acc, curr) => {
        const scores = { poor: 1, fair: 2, good: 3, excellent: 4 };
        return acc + scores[curr.quality];
      }, 0) / totalSleepLogs
    : 0;

  // Water Stats
  const totalWaterLogs = water.length;
  const totalWaterAmount = water.reduce((acc, curr) => acc + curr.amount, 0);
  const todayWaterAmount = water
    .filter(w => isSameDay(new Date(w.time), new Date()))
    .reduce((acc, curr) => acc + curr.amount, 0);
  const remainingWater = Math.max(0, waterGoal - todayWaterAmount);
  
  const waterDays = new Set(water.map(w => format(new Date(w.time), 'yyyy-MM-dd')));
  const avgWaterPerDay = waterDays.size > 0 ? totalWaterAmount / waterDays.size : 0;
  
  const maxWaterDay = Math.max(...Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), i);
    return water
      .filter(w => isSameDay(new Date(w.time), date))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }));

  // Weight Stats
  const sortedWeights = [...weights].sort((a, b) => a.time - b.time);
  const currentWeight = sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1].weight : 0;
  const startWeight = sortedWeights.length > 0 ? sortedWeights[0].weight : 0;
  const weightChange = currentWeight - startWeight;
  const weightChangeLabel = weightChange > 0 ? `+${weightChange.toFixed(1)}` : weightChange.toFixed(1);

  // Chart data for last 30 days (Weight)
  const last30DaysWeight = Array.from({ length: 30 }).map((_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dayWeight = weights
      .filter(w => isSameDay(new Date(w.time), date))
      .sort((a, b) => b.time - a.time)[0];
    
    // If no weight for this day, find the closest previous weight
    let displayWeight = dayWeight?.weight;
    if (!displayWeight) {
      const prevWeights = weights
        .filter(w => new Date(w.time) < startOfDay(date))
        .sort((a, b) => b.time - a.time);
      displayWeight = prevWeights.length > 0 ? prevWeights[0].weight : undefined;
    }

    return {
      name: format(date, 'MMM d'),
      weight: displayWeight,
    };
  }).filter(d => d.weight !== undefined);

  const getQualityLabel = (score: number) => {
    if (score >= 3.5) return 'Excellent';
    if (score >= 2.5) return 'Good';
    if (score >= 1.5) return 'Fair';
    return 'Poor';
  };

  // Chart data for last 7 days (Fasting)
  const last7DaysFast = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayFasts = history.filter(h => isSameDay(new Date(h.startTime), date));
    const totalHours = dayFasts.reduce((acc, curr) => acc + curr.duration, 0) / 3600;
    return {
      name: format(date, 'EEE'),
      hours: parseFloat(totalHours.toFixed(1)),
    };
  });

  // Chart data for last 7 days (Sleep)
  const last7DaysSleep = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const daySleep = sleep.find(s => isSameDay(new Date(s.wakeUpTime), date));
    return {
      name: format(date, 'EEE'),
      hours: daySleep ? parseFloat(daySleep.duration.toFixed(1)) : 0,
    };
  });

  // Chart data for last 7 days (Water)
  const last7DaysWater = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayWater = water.filter(w => isSameDay(new Date(w.time), date));
    const totalAmount = dayWater.reduce((acc, curr) => acc + curr.amount, 0);
    return {
      name: format(date, 'EEE'),
      amount: totalAmount,
    };
  });

  return (
    <div className="p-6 space-y-8 pb-24">
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Statistics</h2>
        <div className="flex justify-center">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar max-w-full touch-pan-x w-fit">
            <button
              onClick={() => setActiveTab('fasting')}
              className={`px-5 py-2 rounded-lg transition-all flex-shrink-0 ${
                activeTab === 'fasting' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
              title="Fasting"
            >
              <Flame size={18} />
            </button>
            <button
              onClick={() => setActiveTab('sleep')}
              className={`px-5 py-2 rounded-lg transition-all flex-shrink-0 ${
                activeTab === 'sleep' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
              title="Sleep"
            >
              <Moon size={18} />
            </button>
            <button
              onClick={() => setActiveTab('water')}
              className={`px-5 py-2 rounded-lg transition-all flex-shrink-0 ${
                activeTab === 'water' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
              title="Water"
            >
              <Droplets size={18} />
            </button>
            <button
              onClick={() => setActiveTab('weight')}
              className={`px-5 py-2 rounded-lg transition-all flex-shrink-0 ${
                activeTab === 'weight' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
              title="Weight"
            >
              <Scale size={18} />
            </button>
            <button
              onClick={() => setActiveTab('mood')}
              className={`px-5 py-2 rounded-lg transition-all flex-shrink-0 ${
                activeTab === 'mood' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
              title="Mood"
            >
              <Heart size={18} />
            </button>
            <button
              onClick={() => setActiveTab('milestones')}
              className={`px-5 py-2 rounded-lg transition-all flex-shrink-0 ${
                activeTab === 'milestones' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
              title="Awards"
            >
              <Award size={18} />
            </button>
            <button
              onClick={() => setActiveTab('review')}
              className={`px-5 py-2 rounded-lg transition-all flex-shrink-0 ${
                activeTab === 'review' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
              title="Review"
            >
              <Calendar size={18} />
            </button>
            <button
              onClick={() => setActiveTab('consistency')}
              className={`px-5 py-2 rounded-lg transition-all flex-shrink-0 ${
                activeTab === 'consistency' ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white/60'
              }`}
              title="Consistency"
            >
              <CheckCircle2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'fasting' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={<Target className="text-primary" />} label="Success Rate" value={`${successRate}%`} />
            <StatCard icon={<Trophy className="text-yellow-500" />} label="Longest" value={`${(longestFast / 3600).toFixed(1)}h`} />
            <StatCard icon={<Clock className="text-secondary" />} label="Average" value={`${(avgFastDuration / 3600).toFixed(1)}h`} />
            <StatCard icon={<Flame className="text-orange-500" />} label="Total Fasts" value={totalFasts.toString()} />
          </div>

          <div className="bg-card p-6 rounded-3xl border border-white/5">
            <h3 className="text-sm font-medium text-white/40 mb-6">Last 7 Days Fasting (Hours)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7DaysFast}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}
                  />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {last7DaysFast.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.hours >= 16 ? '#f97316' : '#3f3f46'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : activeTab === 'sleep' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={<Moon className="text-indigo-400" />} label="Avg Sleep" value={`${avgSleepDuration.toFixed(1)}h`} />
            <StatCard icon={<Star className="text-yellow-400" />} label="Avg Quality" value={getQualityLabel(avgQualityScore)} />
            <StatCard icon={<Zap className="text-blue-400" />} label="Excellent Nights" value={bestQuality.toString()} />
            <StatCard icon={<Clock className="text-white/40" />} label="Total Logs" value={totalSleepLogs.toString()} />
          </div>

          <div className="bg-card p-6 rounded-3xl border border-white/5">
            <h3 className="text-sm font-medium text-white/40 mb-6">Last 7 Days Sleep (Hours)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7DaysSleep}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}
                  />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {last7DaysSleep.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.hours >= 7 ? '#818cf8' : '#3f3f46'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : activeTab === 'weight' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <StatCard 
              icon={<Scale className="text-emerald-500" />} 
              label="Current" 
              value={`${currentWeight.toFixed(1)} kg`} 
            />
            <StatCard 
              icon={weightChange < 0 ? <TrendingDown className="text-emerald-500" /> : weightChange > 0 ? <TrendingUp className="text-red-500" /> : <Minus className="text-white/40" />} 
              label="Total Change" 
              value={`${weightChangeLabel} kg`} 
            />
            <StatCard icon={<Target className="text-primary" />} label="Start" value={`${startWeight.toFixed(1)} kg`} />
            <StatCard icon={<Clock className="text-white/40" />} label="Logs" value={weights.length.toString()} />
          </div>

          <div className="bg-card p-6 rounded-3xl border border-white/5">
            <h3 className="text-sm font-medium text-white/40 mb-6">Weight Journey (kg)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last30DaysWeight}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }}
                    minTickGap={30}
                  />
                  <YAxis 
                    hide 
                    domain={['dataMin - 2', 'dataMax + 2']} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#3b82f6" 
                    strokeWidth={3} 
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4, stroke: '#18181b' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : activeTab === 'water' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={<Droplets className="text-blue-400" />} label="Total Water" value={`${(totalWaterAmount / 1000).toFixed(1)}L`} />
            <StatCard icon={<Target className="text-primary" />} label="Avg Daily" value={`${(avgWaterPerDay / 1000).toFixed(1)}L`} />
            <StatCard icon={<Trophy className="text-yellow-500" />} label="Max Day" value={`${(maxWaterDay / 1000).toFixed(1)}L`} />
            <StatCard icon={<Clock className="text-blue-400" />} label="Remaining" value={`${(remainingWater / 1000).toFixed(1)}L`} />
          </div>

          <div className="bg-card p-6 rounded-3xl border border-white/5">
            <h3 className="text-sm font-medium text-white/40 mb-6">Last 7 Days Hydration (ml)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7DaysWater}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {last7DaysWater.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.amount >= 2000 ? '#60a5fa' : '#3f3f46'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : activeTab === 'mood' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={<Heart className="text-pink-500" />} label="Average Mood" value={`${avgMood.toFixed(1)}/5`} />
            <StatCard icon={<Zap className="text-yellow-500" />} label="Average Energy" value={`${avgEnergy.toFixed(1)}/5`} />
            <StatCard icon={<Star className="text-primary" />} label="Logs" value={totalMoodLogs.toString()} />
            <StatCard icon={<Clock className="text-white/40" />} label="Last Log" value={moods.length > 0 ? format(new Date(moods[moods.length - 1].time), 'MMM d') : 'N/A'} />
          </div>

          <div className="bg-card p-6 rounded-3xl border border-white/5">
            <h3 className="text-sm font-medium text-white/40 mb-6">Recent Mood & Energy Trends</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={moodTrends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                  />
                  <YAxis hide domain={[0, 5]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    itemStyle={{ color: '#fff' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    name="Mood"
                    stroke="#ec4899" 
                    strokeWidth={3} 
                    dot={{ fill: '#ec4899', strokeWidth: 2, r: 4, stroke: '#18181b' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="energy" 
                    name="Energy"
                    stroke="#eab308" 
                    strokeWidth={3} 
                    dot={{ fill: '#eab308', strokeWidth: 2, r: 4, stroke: '#18181b' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : activeTab === 'consistency' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center space-y-1">
              <div className="flex items-center space-x-2">
                <Droplets size={14} className="text-blue-400" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Water Success</span>
              </div>
              <div className="text-xl font-bold">{waterStats.met} <span className="text-sm text-white/20 font-medium">/ {waterStats.total} days</span></div>
            </div>
            <div className="bg-card p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center space-y-1">
              <div className="flex items-center space-x-2">
                <Flame size={14} className="text-orange-500" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Deficit Success</span>
              </div>
              <div className="text-xl font-bold">{calorieStats.met} <span className="text-sm text-white/20 font-medium">/ {calorieStats.total} days</span></div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-3xl border border-white/5 space-y-6">
            <div className="flex flex-col space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <h3 className="text-lg font-bold">Goal Consistency</h3>
                <div className="flex items-center space-x-3 bg-white/5 p-1 rounded-2xl border border-white/10 w-full max-w-[240px] justify-between shadow-inner">
                  <button 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                    className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-primary transition-all active:scale-90"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                  <button 
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-primary transition-all active:scale-90"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={i} className="text-center text-[8px] font-bold text-white/20 uppercase tracking-widest pb-2">
                      {day}
                    </div>
                  ))}
                  {(() => {
                    const monthStart = startOfMonth(currentMonth);
                    const monthEnd = endOfMonth(monthStart);
                    const startDate = startOfWeek(monthStart);
                    const endDate = endOfWeek(monthEnd);
                    
                    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
                    
                    return calendarDays.map((date, i) => {
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const isCurrentMonth = isSameMonth(date, monthStart);
                      const isToday = isSameDay(date, new Date());
                      const isSelected = searchDate === dateStr;
                      
                      const summary = dailySummaries.find(s => s.date === dateStr);
                      const isTodayDate = isSameDay(date, new Date());
                      const dayWaterAmount = water
                        .filter(w => isSameDay(new Date(w.time), date))
                        .reduce((sum, curr) => sum + curr.amount, 0);
                      
                      const relevantWaterGoal = isTodayDate ? waterGoal : (summary?.waterGoal || waterGoal);
                      const waterMet = dayWaterAmount >= relevantWaterGoal;
                      const deficitMet = summary ? summary.isDeficit : null;

                      // A day is considered "past" if it's before today
                      const dayIsPast = isPast(date) && !isToday;

                      return (
                        <button
                          key={i}
                          onClick={() => setSearchDate(isSelected ? '' : dateStr)}
                          className={cn(
                            "aspect-square rounded-xl p-1 flex flex-col items-center justify-between transition-all relative border border-transparent",
                            !isCurrentMonth ? "opacity-10 cursor-default pointer-events-none" : "hover:bg-white/5",
                            isToday && "bg-primary/10 border-primary/20",
                            isSelected && "bg-primary text-white scale-105 z-10 shadow-lg shadow-primary/20"
                          )}
                        >
                          <span className={cn(
                            "text-[10px] font-bold",
                            isSelected ? "text-white" : isToday ? "text-primary" : "text-white/60"
                          )}>
                            {format(date, 'd')}
                          </span>
                          
                          {isCurrentMonth && (
                            <div className="flex space-x-0.5 mb-0.5">
                              {/* Water Dot */}
                              {waterMet ? (
                                <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-blue-400")} />
                              ) : dayIsPast ? (
                                <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white/20" : "bg-white/5")} />
                              ) : null}
                              
                              {/* Deficit Dot */}
                              {deficitMet === true ? (
                                <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white" : "bg-orange-500")} />
                              ) : dayIsPast && deficitMet === false ? (
                                <div className={cn("w-1 h-1 rounded-full", isSelected ? "bg-white/20" : "bg-white/5")} />
                              ) : null}
                            </div>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
                
                {/* Legend */}
                <div className="flex items-center justify-center space-x-4 pt-2 border-t border-white/5">
                  <div className="flex items-center space-x-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Water Met</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Deficit Met</span>
                  </div>
                </div>

                {/* Selected Day Details */}
                <AnimatePresence>
                  {searchDate && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white/60 uppercase tracking-widest">
                            {format(new Date(searchDate), 'MMMM d, yyyy')}
                          </h4>
                          <button onClick={() => setSearchDate('')} className="text-white/20 hover:text-white/40">
                            <X size={14} />
                          </button>
                        </div>
                        
                        {(() => {
                          const date = new Date(searchDate);
                          const summary = dailySummaries.find(s => s.date === searchDate);
                          const isTodayDate = isSameDay(date, new Date());
                          const dayWater = water
                            .filter(w => isSameDay(new Date(w.time), date))
                            .reduce((sum, curr) => sum + curr.amount, 0);
                          const dayGoal = isTodayDate ? waterGoal : (summary?.waterGoal || waterGoal);
                          const isMet = dayWater >= dayGoal;

                          return (
                            <div className="grid grid-cols-2 gap-3">
                              {/* Water Stats */}
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-tighter mb-1">Water Intake</p>
                                <div className="flex items-baseline space-x-1">
                                  <span className={cn("text-lg font-black", isMet ? "text-blue-400" : "text-white/60")}>
                                    {dayWater}
                                  </span>
                                  <span className="text-[10px] text-white/20">/ {dayGoal}ml</span>
                                </div>
                                <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                    className={cn("h-full transition-all duration-500", isMet ? "bg-blue-400" : "bg-white/20")}
                                    style={{ width: `${Math.min(100, (dayWater / dayGoal) * 100)}%` }}
                                  />
                                </div>
                              </div>

                              {/* Calories Stats */}
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-tighter mb-1">Calories (Net)</p>
                                {summary ? (
                                  <>
                                    <div className="flex items-baseline space-x-1">
                                      <span className={cn("text-lg font-black", summary.isDeficit ? "text-orange-500" : "text-red-500")}>
                                        {summary.intake - summary.burn > 0 ? '+' : ''}{summary.intake - summary.burn}
                                      </span>
                                      <span className="text-[10px] text-white/20">kcal</span>
                                    </div>
                                    <div className="flex items-center space-x-2 mt-1 text-[9px] text-white/40">
                                      <span>In: {summary.intake}</span>
                                      <span>•</span>
                                      <span>Out: {summary.burn}</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="h-full flex items-center">
                                    <p className="text-[10px] text-white/20 italic">No AI Insight yet</p>
                                  </div>
                                )}
                              </div>

                              {/* Hydration Status */}
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-tighter mb-1">Hydration</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  {isMet ? (
                                    <>
                                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                                      <span className="text-sm font-bold text-blue-400">PASSED</span>
                                    </>
                                  ) : (
                                    <>
                                      <div className="w-2 h-2 rounded-full bg-white/10" />
                                      <span className="text-sm font-bold text-white/40">NOT MET</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Deficit Status */}
                              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-tighter mb-1">Deficit</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  {summary && typeof summary.isDeficit === 'boolean' ? (
                                    summary.isDeficit ? (
                                      <>
                                        <div className="w-2 h-2 rounded-full bg-orange-500" />
                                        <span className="text-sm font-bold text-orange-500">PASSED</span>
                                      </>
                                    ) : (
                                      <>
                                        <div className="w-2 h-2 rounded-full bg-red-500" />
                                        <span className="text-sm font-bold text-red-500">FAILED</span>
                                      </>
                                    )
                                  ) : (
                                    <>
                                      <div className="w-2 h-2 rounded-full bg-white/10" />
                                      <span className="text-sm font-bold text-white/40">N/A</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-white/20 text-center italic">
              * Calorie deficit data is tracked when you refresh AI Coach insights for that day.
            </p>
          </div>
        </div>
      ) : activeTab === 'milestones' ? (
        <Milestones water={water} weights={weights} sleep={sleep} workouts={workouts} dailySummaries={dailySummaries} />
      ) : (
        <Review history={history} sleep={sleep} water={water} weights={weights} workouts={workouts} dailySummaries={dailySummaries} />
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: ReactNode, label: string, value: string }) => (
  <div className="bg-card p-4 rounded-2xl border border-white/5 space-y-2">
    <div className="p-2 bg-white/5 w-fit rounded-lg">{icon}</div>
    <div>
      <p className="text-xs text-white/40">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  </div>
);
