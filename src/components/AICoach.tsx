import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, Target, Clock, RefreshCw, Utensils, Dumbbell } from 'lucide-react';
import { getFastingInsights } from '../services/aiService';
import { FastRecord, MealRecord, WorkoutRecord } from '../types';

interface AICoachProps {
  history: FastRecord[];
  meals: MealRecord[];
  workouts: WorkoutRecord[];
}

const AICoach: React.FC<AICoachProps> = ({ history, meals, workouts }) => {
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const result = await getFastingInsights(history, meals, workouts);
      setInsights(result || '');
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((history.length > 0 || meals.length > 0 || workouts.length > 0) && !insights) {
      fetchInsights();
    }
  }, [history, meals, workouts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="text-primary" size={24} />
          <h2 className="text-2xl font-bold text-white">AI Coach Insights</h2>
        </div>
        <button 
          onClick={fetchInsights}
          disabled={loading}
          className="p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`text-white/40 ${loading ? 'animate-spin' : ''}`} size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center space-x-2 text-white/40 mb-2">
            <Target size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Success Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {history.length > 0 
              ? Math.round((history.filter(h => h.completed).length / history.length) * 100) 
              : 0}%
          </p>
        </div>
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center space-x-2 text-white/40 mb-2">
            <Clock size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Avg. Duration</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {history.length > 0 
              ? (history.reduce((acc, h) => acc + h.duration, 0) / history.length / 3600).toFixed(1) 
              : 0}h
          </p>
        </div>
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center space-x-2 text-white/40 mb-2">
            <TrendingUp size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Total Fasts</span>
          </div>
          <p className="text-2xl font-bold text-white">{history.length}</p>
        </div>
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center space-x-2 text-white/40 mb-2">
            <Utensils size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Meals Logged</span>
          </div>
          <p className="text-2xl font-bold text-white">{meals.length}</p>
        </div>
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
          <div className="flex items-center space-x-2 text-white/40 mb-2">
            <Dumbbell size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Workouts</span>
          </div>
          <p className="text-2xl font-bold text-white">{workouts.length}</p>
        </div>
      </div>

      <div className="bg-white/5 p-6 rounded-3xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles size={120} />
        </div>
        
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 space-y-4"
            >
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-white/40 text-sm font-medium animate-pulse">Analyzing your fasting patterns...</p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="prose prose-invert max-w-none"
            >
              <div className="text-white/80 leading-relaxed whitespace-pre-wrap">
                {insights || "Start your fasting journey to see AI-powered insights here!"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20">
        <p className="text-xs text-primary/80 leading-relaxed italic">
          "Fasting is not just about not eating. It's about giving your body the time it needs to heal and regenerate."
        </p>
      </div>
    </div>
  );
};

export default AICoach;
