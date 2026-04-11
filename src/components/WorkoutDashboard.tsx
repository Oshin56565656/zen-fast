import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Activity, Upload, Link2, CheckCircle2, AlertCircle, Dumbbell, Bike, Footprints, RefreshCw, Zap, Target } from 'lucide-react';
import { useWorkouts, Workout } from '../hooks/useWorkouts';
import { format } from 'date-fns';

export function WorkoutDashboard() {
  const { workouts, loading, userProfile, connectStrava, syncStrava } = useWorkouts();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncStrava();
    setIsSyncing(false);
  };

  const getIcon = (type: string | undefined) => {
    switch (type?.toLowerCase()) {
      case 'run': return <Footprints className="text-orange-500" />;
      case 'ride': return <Bike className="text-blue-500" />;
      case 'weightlifting': return <Dumbbell className="text-purple-500" />;
      default: return <Activity className="text-primary" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Stats Overview */}
      <section className="grid grid-cols-2 gap-4">
        <div className="glass p-5 rounded-3xl space-y-2">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
            <Zap size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Workouts</p>
            <p className="text-2xl font-black">{workouts.length}</p>
          </div>
        </div>
        <div className="glass p-5 rounded-3xl space-y-2">
          <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500">
            <Target size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Active Days</p>
            <p className="text-2xl font-black">
              {new Set(workouts.map(w => w.startDate.split('T')[0])).size}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Connect Apps</h2>
        <div className="grid grid-cols-1 gap-4">
          {/* Strava Card */}
          <div className="glass p-5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <Activity className="text-orange-500" size={24} />
              </div>
              <div>
                <h3 className="font-bold">Strava</h3>
                <p className="text-xs text-white/40">Sync runs, rides & more</p>
              </div>
            </div>
            {userProfile?.stravaConnected ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-green-500 text-sm font-medium">
                  <CheckCircle2 size={18} />
                  <span>Connected</span>
                </div>
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                </button>
              </div>
            ) : (
              <button 
                onClick={connectStrava}
                className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 hover:bg-orange-600 transition-colors"
              >
                <Link2 size={16} />
                <span>Connect</span>
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Recent Workouts</h2>
          <span className="text-xs font-medium text-white/40">{workouts.length} total</span>
        </div>

        {workouts.length === 0 ? (
          <div className="glass p-12 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
              <AlertCircle className="text-white/20" size={32} />
            </div>
            <div>
              <p className="font-medium text-white/60">No workouts found</p>
              <p className="text-xs text-white/40">Connect Strava to see your data here.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((workout) => (
              <motion.div 
                key={workout.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-4 rounded-2xl flex items-center space-x-4"
              >
                <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                  {getIcon(workout.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold truncate">{workout.name || 'Workout'}</h4>
                  <div className="flex items-center space-x-2 text-[10px] text-white/40 uppercase tracking-wider font-bold">
                    <span>{format(new Date(workout.startDate), 'MMM d, yyyy')}</span>
                    <span>•</span>
                    <span>{workout.source}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm">
                    {workout.duration ? `${Math.floor(workout.duration / 60)}m` : '--'}
                  </div>
                  {workout.distance && (
                    <div className="text-[10px] text-white/40 font-bold">
                      {(workout.distance / 1000).toFixed(2)} km
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
