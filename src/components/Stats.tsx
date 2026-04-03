import React, { FC, ReactNode } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FastRecord, SleepRecord, WaterRecord } from '../types';
import { format, subDays, isSameDay } from 'date-fns';
import { Trophy, Clock, Flame, Target, Moon, Zap, Star, Droplets } from 'lucide-react';

interface StatsProps {
  history: FastRecord[];
  sleep: SleepRecord[];
  water: WaterRecord[];
  waterGoal?: number;
}

export const Stats: FC<StatsProps> = ({ history, sleep, water, waterGoal = 2000 }) => {
  const [activeTab, setActiveTab] = React.useState<'fasting' | 'sleep' | 'water'>('fasting');

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
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Statistics</h2>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('fasting')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'fasting' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
            }`}
          >
            Fasting
          </button>
          <button
            onClick={() => setActiveTab('sleep')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'sleep' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
            }`}
          >
            Sleep
          </button>
          <button
            onClick={() => setActiveTab('water')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'water' ? 'bg-primary text-white shadow-lg' : 'text-white/40'
            }`}
          >
            Water
          </button>
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
      ) : (
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
