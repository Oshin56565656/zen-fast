import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, Target, RefreshCw, Utensils, Dumbbell } from 'lucide-react';
import { getFastingInsights } from '../services/aiService';
import { FastRecord, MealRecord, WorkoutRecord } from '../types';
import { cn } from '../lib/utils';

interface AICoachProps {
  history: FastRecord[];
  meals: MealRecord[];
  workouts: WorkoutRecord[];
}

interface Insight {
  category: string;
  title: string;
  content: string;
  impact: 'positive' | 'neutral' | 'improvement';
}

const AICoach: React.FC<AICoachProps> = ({ history, meals, workouts }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const userLocalTime = new Date().toLocaleString();
      const result = await getFastingInsights(history, meals, workouts, userLocalTime);
      setInsights(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('Error fetching insights:', error);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((history.length > 0 || meals.length > 0 || workouts.length > 0) && insights.length === 0 && !loading) {
      fetchInsights();
    }
  }, [history, meals, workouts, insights.length, loading]);

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white/5 p-12 rounded-3xl border border-white/10 flex flex-col items-center justify-center space-y-4"
            >
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-white/40 text-sm font-medium animate-pulse">Analyzing your fasting patterns...</p>
            </motion.div>
          ) : insights.length > 0 ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 gap-4"
            >
              {insights.map((insight, index) => (
                <div 
                  key={index} 
                  className="bg-white/5 p-6 rounded-3xl border border-white/10 relative overflow-hidden group hover:bg-white/[0.07] transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{insight.category}</span>
                      <h3 className="text-lg font-bold text-white">{insight.title}</h3>
                    </div>
                    <div className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      insight.impact === 'positive' ? "bg-green-500/20 text-green-500" :
                      insight.impact === 'improvement' ? "bg-orange-500/20 text-orange-500" :
                      "bg-white/10 text-white/60"
                    )}>
                      {insight.impact}
                    </div>
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {insight.content}
                  </p>
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Sparkles size={60} />
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white/5 p-12 rounded-3xl border border-white/10 text-center"
            >
              <p className="text-white/40 text-sm">Start your fasting journey to see AI-powered insights here!</p>
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
