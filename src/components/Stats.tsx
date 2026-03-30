import React, { FC, ReactNode } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FastRecord } from '../types';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { Trophy, Clock, Flame, Target } from 'lucide-react';

interface StatsProps {
  history: FastRecord[];
}

export const Stats: FC<StatsProps> = ({ history }) => {
  const totalFasts = history.length;
  const avgDuration = totalFasts > 0 
    ? history.reduce((acc, curr) => acc + curr.duration, 0) / totalFasts 
    : 0;
  const longestFast = totalFasts > 0 
    ? Math.max(...history.map(h => h.duration)) 
    : 0;

  const successRate = totalFasts > 0 
    ? Math.round((history.filter(h => h.completed).length / totalFasts) * 100) 
    : 0;

  // Chart data for last 7 days
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayFasts = history.filter(h => isSameDay(new Date(h.startTime), date));
    const totalHours = dayFasts.reduce((acc, curr) => acc + curr.duration, 0) / 3600;
    return {
      name: format(date, 'EEE'),
      hours: parseFloat(totalHours.toFixed(1)),
    };
  });

  return (
    <div className="p-6 space-y-8 pb-24">
      <h2 className="text-xl font-bold">Statistics</h2>

      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={<Target className="text-primary" />} label="Success Rate" value={`${successRate}%`} />
        <StatCard icon={<Trophy className="text-yellow-500" />} label="Longest" value={`${(longestFast / 3600).toFixed(1)}h`} />
        <StatCard icon={<Clock className="text-secondary" />} label="Average" value={`${(avgDuration / 3600).toFixed(1)}h`} />
        <StatCard icon={<Flame className="text-orange-500" />} label="Total" value={totalFasts.toString()} />
      </div>

      <div className="bg-card p-6 rounded-3xl border border-white/5">
        <h3 className="text-sm font-medium text-white/40 mb-6">Last 7 Days (Hours)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7Days}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {last7Days.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.hours >= 16 ? '#f97316' : '#3f3f46'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
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
