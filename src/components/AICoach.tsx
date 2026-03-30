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
  height?: number;
  weight?: number;
}

interface Insight {
  category: string;
  title: string;
  content: string;
  impact: 'positive' | 'neutral' | 'improvement';
}

const AICoach: React.FC<AICoachProps> = ({ history, meals, workouts, height, weight }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(true);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.aistudio) {
        // @ts-ignore
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected || !!process.env.GEMINI_API_KEY || !!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const fetchInsights = async () => {
    setError(null);
    setLoading(true);
    try {
      const userLocalTime = new Date().toLocaleString();
      const result = await getFastingInsights(history, meals, workouts, userLocalTime, height, weight);
      setInsights(Array.isArray(result) ? result : []);
    } catch (error: any) {
      console.error('Error fetching insights:', error);
      if (error.message?.includes("Requested entity was not found")) {
        setHasKey(false);
        setError("API Key error. Please re-select your key.");
      } else {
        setError(error.message || "An unexpected error occurred.");
      }
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  // Removed automatic fetch on mount to respect user preference
  // Insights are now only fetched via the manual refresh button

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
          {!hasKey ? (
            <motion.div
              key="no-key"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-primary/5 p-8 rounded-3xl border border-primary/20 text-center space-y-4"
            >
              <Sparkles className="text-primary mx-auto" size={40} />
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">AI Features Require an API Key</h3>
                <p className="text-white/60 text-sm max-w-xs mx-auto">
                  To use the AI Coach in the shared version, you need to select a Gemini API key.
                </p>
              </div>
              <button
                onClick={handleSelectKey}
                className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all active:scale-95"
              >
                Select API Key
              </button>
              <p className="text-[10px] text-white/20">
                Don't have one? Get it at <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline">ai.google.dev</a>
              </p>
            </motion.div>
          ) : loading ? (
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
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-500/5 p-8 rounded-3xl border border-red-500/20 text-center space-y-3"
            >
              <p className="text-red-500 font-bold">Analysis Failed</p>
              <p className="text-white/60 text-sm">{error}</p>
              <button
                onClick={fetchInsights}
                className="text-primary text-sm font-bold hover:underline"
              >
                Try Again
              </button>
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
