import React, { FC, ReactNode } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { FastRecord, SleepRecord, WaterRecord, WeightRecord, WorkoutRecord, DailySummary } from '../types';
import { format, subDays, isSameDay, startOfDay, eachDayOfInterval } from 'date-fns';
import { Trophy, Clock, Flame, Target, Moon, Zap, Star, Droplets, Scale, TrendingDown, TrendingUp, Minus, Calendar, Award, CheckCircle2, XCircle } from 'lucide-react';
import { Milestones } from './Milestones';
import { Review } from './Review';

interface StatsProps {
  history: FastRecord[];
  sleep: SleepRecord[];
  water: WaterRecord[];
  weights: WeightRecord[];
  workouts: WorkoutRecord[];
  waterGoal?: number;
  dailySummaries?: DailySummary[];
}

export const Stats: FC<StatsProps> = ({ history, sleep, water, weights, workouts, waterGoal = 2000, dailySummaries = [] }) => {
  const [activeTab, setActiveTab] = React.useState<'fasting' | 'sleep' | 'water' | 'weight' | 'milestones' | 'review' | 'consistency'>('fasting');

  // Fasting Stats
  const totalFasts = history.length;
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
  const avgWaterPerDay = totalWaterLogs > 0 ? totalWaterAmount / 7 : 0; // Rough avg over 7 days
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
      ) : activeTab === 'consistency' ? (
        <div className="space-y-8">
          <div className="bg-card p-6 rounded-3xl border border-white/5">
            <h3 className="text-lg font-bold mb-6">Daily Goals Consistency</h3>
            <div className="space-y-6">
              {Array.from({ length: 14 }).map((_, i) => {
                const date = subDays(new Date(), i);
                const dateStr = format(date, 'yyyy-MM-dd');
                
                // Water check
                const dayWater = water
                  .filter(w => isSameDay(new Date(w.time), date))
                  .reduce((acc, curr) => acc + curr.amount, 0);
                const waterMet = dayWater >= waterGoal;

                // Calorie check (from dailySummaries)
                const summary = dailySummaries.find(s => s.date === dateStr);
                const deficitMet = summary ? summary.isDeficit : null;

                return (
                  <div key={dateStr} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{format(date, 'EEEE')}</span>
                      <span className="text-[10px] text-white/40 uppercase tracking-widest">{format(date, 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col items-center space-y-1">
                        <Droplets size={16} className={waterMet ? "text-blue-400" : "text-white/10"} />
                        <span className={`text-[8px] font-bold uppercase ${waterMet ? "text-blue-400" : "text-white/20"}`}>Water</span>
                        {waterMet ? <CheckCircle2 size={12} className="text-green-500" /> : <XCircle size={12} className="text-white/10" />}
                      </div>
                      <div className="flex flex-col items-center space-y-1">
                        <Flame size={16} className={deficitMet === true ? "text-orange-500" : "text-white/10"} />
                        <span className={`text-[8px] font-bold uppercase ${deficitMet === true ? "text-orange-500" : "text-white/20"}`}>Deficit</span>
                        {deficitMet === true ? (
                          <CheckCircle2 size={12} className="text-green-500" />
                        ) : deficitMet === false ? (
                          <XCircle size={12} className="text-red-500/50" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-white/10" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-6 text-[10px] text-white/20 text-center italic">
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
