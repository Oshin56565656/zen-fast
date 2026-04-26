import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, Target, RefreshCw, Utensils, Dumbbell, Send, MessageCircle, Clock } from 'lucide-react';
import { getFastingInsights, chatWithCoach } from '../services/aiService';
import { FastRecord, MealRecord, WorkoutRecord, SleepRecord, WaterRecord, DailySummary, AIInsight, CalorieGuess, CaloriesBurned, AIInsightsSync, Supplement, SupplementLog, MoodRecord, MuscularityLevel } from '../types';
import { cn } from '../lib/utils';
import { formatTime, formatDate } from '../lib/utils';

interface AICoachProps {
  history: FastRecord[];
  meals: MealRecord[];
  workouts: WorkoutRecord[];
  sleep: SleepRecord[];
  water: WaterRecord[];
  moods: MoodRecord[];
  height?: number;
  weight?: number;
  muscularity?: MuscularityLevel;
  sex?: string;
  age?: number;
  waterGoal?: number;
  saveDailySummary: (summary: Omit<DailySummary, 'id' | 'createdAt'>) => Promise<void>;
  aiInsights: AIInsightsSync | null;
  saveAIInsights: (insightsData: AIInsightsSync) => Promise<void>;
  supplements: Supplement[];
  supplementLogs: SupplementLog[];
}

interface AICoachInsight extends AIInsight {}

const ChatBox: React.FC<{ 
  insight: AIInsight; 
  onUpdateMessages: (messages: { role: 'user' | 'model'; text: string }[]) => void;
  height?: number;
  weight?: number;
  muscularity?: MuscularityLevel;
  sex?: string;
  age?: number;
}> = ({ insight, onUpdateMessages, height, weight, muscularity, sex, age }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>(insight.messages || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setInput('');
    const newMessages: { role: 'user' | 'model'; text: string }[] = [...messages, { role: 'user', text: userMsg }];
    setMessages(newMessages);
    onUpdateMessages(newMessages);
    setLoading(true);

    try {
      const response = await chatWithCoach(insight, userMsg, messages, height, weight, sex, age, muscularity);
      const finalMessages: { role: 'user' | 'model'; text: string }[] = [...newMessages, { role: 'model', text: response }];
      setMessages(finalMessages);
      onUpdateMessages(finalMessages);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessages: { role: 'user' | 'model'; text: string }[] = [...newMessages, { role: 'model', text: "Sorry, I'm having trouble connecting. Please try again." }];
      setMessages(errorMessages);
      onUpdateMessages(errorMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
      <div className="space-y-3 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
        {messages.length === 0 && (
          <p className="text-[10px] text-white/20 italic">Ask the coach for more details about this insight...</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "p-3 rounded-2xl text-xs leading-relaxed",
            msg.role === 'user' ? "bg-primary/20 text-white ml-auto max-w-[85%]" : "bg-white/10 text-white/70 mr-auto max-w-[85%]"
          )}>
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="bg-white/5 p-3 rounded-2xl text-xs text-white/40 mr-auto max-w-[80%] animate-pulse">
            Coach is thinking...
          </div>
        )}
      </div>
      <div className="flex space-x-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask a question..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors"
        />
        <button 
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-primary text-white p-4 rounded-xl disabled:opacity-50 transition-all active:scale-90"
          aria-label="Send Message"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

const AICoach: React.FC<AICoachProps> = ({ history, meals, workouts, sleep, water, moods, height, weight, muscularity, sex, age, waterGoal, saveDailySummary, aiInsights, saveAIInsights, supplements, supplementLogs }) => {
    const [insights, setInsights] = useState<AIInsight[]>([]);
    const [calorieGuess, setCalorieGuess] = useState<CalorieGuess | null>(null);
    const [caloriesBurned, setCaloriesBurned] = useState<CaloriesBurned | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);

    // Sync local state with firestore insights when they load
    useEffect(() => {
      if (aiInsights) {
        setInsights(aiInsights.insights || []);
        setCalorieGuess(aiInsights.calorieGuess || null);
        setCaloriesBurned(aiInsights.caloriesBurned || null);
        setLastRefreshed(aiInsights.lastRefreshed || null);
      } else {
        // Fallback to local storage if no cloud data yet
        const saved = localStorage.getItem('fasttrack_insights');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setInsights(parsed);
            } else {
              setInsights(parsed.insights || []);
              setCalorieGuess(parsed.calorieGuess || null);
              setCaloriesBurned(parsed.caloriesBurned || null);
              setLastRefreshed(parsed.lastRefreshed || null);
            }
          } catch (e) {
            console.error("Failed to parse local insights", e);
          }
        }
      }
    }, [aiInsights]);
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [hasKey, setHasKey] = useState<boolean>(true);

    const loadingMessages = [
      "Analyzing your fasting patterns...",
      "Calculating calorie intake...",
      "Estimating metabolic burn...",
      "Reviewing sleep quality...",
      "Checking hydration levels...",
      "Checking your mood & energy...",
      "Synthesizing personalized advice...",
      "Finalizing your daily insights..."
    ];

    useEffect(() => {
      let interval: NodeJS.Timeout;
      if (loading) {
        setLoadingMessageIndex(0);
        interval = setInterval(() => {
          setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
        }, 2000);
      }
      return () => clearInterval(interval);
    }, [loading]);
  
    useEffect(() => {
      localStorage.setItem('fasttrack_insights', JSON.stringify({ insights, calorieGuess, caloriesBurned, lastRefreshed }));
    }, [insights, calorieGuess, caloriesBurned, lastRefreshed]);
  
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
        const result = await getFastingInsights(
          history, 
          meals, 
          workouts, 
          sleep, 
          water, 
          userLocalTime, 
          height, 
          weight, 
          sex, 
          age, 
          supplements, 
          supplementLogs, 
          moods,
          muscularity
        );
        
        if (Array.isArray(result)) {
          setInsights(result);
          setCalorieGuess(null);
          setCaloriesBurned(null);
          const timestamp = Date.now();
          setLastRefreshed(timestamp);
          
          saveAIInsights({
            insights: result,
            calorieGuess: null,
            caloriesBurned: null,
            lastRefreshed: timestamp
          });
        } else {
          setInsights(result.insights || []);
          setCalorieGuess(result.calorieGuess || null);
          setCaloriesBurned(result.caloriesBurned || null);
          const timestamp = Date.now();
          setLastRefreshed(timestamp);

          saveAIInsights({
            insights: result.insights || [],
            calorieGuess: result.calorieGuess || null,
            caloriesBurned: result.caloriesBurned || null,
            lastRefreshed: timestamp
          });

          // Save Daily Summary
          if (result.calorieGuess && result.caloriesBurned) {
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            const todayWater = water
              .filter(w => {
                const d = new Date(w.time);
                return d.getFullYear() === today.getFullYear() &&
                       d.getMonth() === today.getMonth() &&
                       d.getDate() === today.getDate();
              })
              .reduce((acc, curr) => acc + curr.amount, 0);
            
            const goal = waterGoal || 2000;
            
            await saveDailySummary({
              date: dateStr,
              intake: result.calorieGuess.amount,
              burn: result.caloriesBurned.amount,
              waterTotal: todayWater,
              waterGoal: goal,
              isDeficit: (result.calorieGuess.amount - result.caloriesBurned.amount) <= 0,
              isWaterGoalMet: todayWater >= goal
            });
          }
        }
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

  // Automatic refresh at 11:55 PM moved to useFasting hook for global reliability

  // Removed automatic fetch on mount to respect user preference
  // Insights are now only fetched via the manual refresh button

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Sparkles className="text-primary" size={24} />
            <h2 className="text-2xl font-bold text-white">AI Coach Insights</h2>
          </div>
          {lastRefreshed && (
            <div className="flex items-center space-x-1.5 text-[10px] font-bold text-white/30 uppercase tracking-widest pl-8">
              <Clock size={10} className="text-primary/40" />
              <span>Last Refreshed: {formatDate(lastRefreshed)} at {formatTime(lastRefreshed)}</span>
            </div>
          )}
        </div>
        <button 
          onClick={fetchInsights}
          disabled={loading}
          className="p-4 hover:bg-white/10 bg-white/5 rounded-full transition-all disabled:opacity-50 active:scale-90"
          aria-label="Refresh Insights"
        >
          <RefreshCw className={`text-white/60 ${loading ? 'animate-spin' : ''}`} size={24} />
        </button>
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
              <div className="h-6 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.p 
                    key={loadingMessageIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-white/40 text-sm font-medium"
                  >
                    {loadingMessages[loadingMessageIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
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
          ) : (insights.length > 0 || calorieGuess || caloriesBurned) ? (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {(calorieGuess && caloriesBurned) && (
                <div className={cn(
                  "p-6 rounded-3xl border relative overflow-hidden group transition-all",
                  (calorieGuess.amount - caloriesBurned.amount) <= 0 
                    ? "bg-green-500/10 border-green-500/20" 
                    : "bg-red-500/10 border-red-500/20"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                        (calorieGuess.amount - caloriesBurned.amount) <= 0 
                          ? "bg-green-500/20 text-green-500" 
                          : "bg-red-500/20 text-red-500"
                      )}>
                        <TrendingUp size={24} className={cn((calorieGuess.amount - caloriesBurned.amount) > 0 && "rotate-180")} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white">Net Balance</h3>
                        <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Daily Calorie Delta</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-3xl font-black",
                        (calorieGuess.amount - caloriesBurned.amount) <= 0 ? "text-green-500" : "text-red-500"
                      )}>
                        {calorieGuess.amount - caloriesBurned.amount > 0 ? '+' : ''}{calorieGuess.amount - caloriesBurned.amount}
                      </p>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">kcal</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center space-x-2 text-xs font-medium">
                    <span className={cn(
                      "px-2 py-1 rounded-lg",
                      (calorieGuess.amount - caloriesBurned.amount) <= 0 ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                    )}>
                      {(calorieGuess.amount - caloriesBurned.amount) <= 0 ? 'Calorie Deficit' : 'Calorie Surplus'}
                    </span>
                    <span className="text-white/40">•</span>
                    <span className="text-white/60">
                      {(calorieGuess.amount - caloriesBurned.amount) <= 0 
                        ? 'Great for weight loss and autophagy' 
                        : 'Fueling for growth or recovery'}
                    </span>
                  </div>
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Target size={60} className={(calorieGuess.amount - caloriesBurned.amount) <= 0 ? "text-green-500" : "text-red-500"} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {calorieGuess && (
                  <div className="bg-orange-500/10 p-6 rounded-3xl border border-orange-500/20 relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500">
                        <Utensils size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Intake Guess</h3>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">AI Estimation</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-orange-500">~{calorieGuess.amount}</p>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">kcal</p>
                    </div>
                  </div>

                    {calorieGuess.macros && (
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Protein</p>
                          <p className="text-sm font-black text-white">{calorieGuess.macros.protein}g</p>
                        </div>
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Carbs</p>
                          <p className="text-sm font-black text-white">{calorieGuess.macros.carbs}g</p>
                        </div>
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">Fats</p>
                          <p className="text-sm font-black text-white">{calorieGuess.macros.fats}g</p>
                        </div>
                      </div>
                    )}

                    {calorieGuess.foods && calorieGuess.foods.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-[10px] font-black text-white/20 uppercase tracking-widest px-1">
                          <span>Food Item & Time</span>
                          <div className="flex space-x-4">
                            <span className="w-8 text-center">P</span>
                            <span className="w-8 text-center">C</span>
                            <span className="w-8 text-center">F</span>
                            <span className="w-10 text-right">Kcal</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {calorieGuess.foods.map((food, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/5">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-white truncate max-w-[100px]">{food.name}</span>
                                {food.time && <span className="text-[8px] text-white/20">{food.time}</span>}
                              </div>
                              <div className="flex space-x-4 text-[10px] font-mono text-white/40">
                                <span className="w-8 text-center">{food.protein}g</span>
                                <span className="w-8 text-center">{food.carbs}g</span>
                                <span className="w-8 text-center">{food.fats}g</span>
                                <span className="w-10 text-right font-bold text-orange-500">{food.calories}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                      <Sparkles size={40} className="text-orange-500" />
                    </div>
                  </div>
                )}

                {caloriesBurned && (
                  <div className="bg-orange-500/10 p-6 rounded-3xl border border-orange-500/20 relative overflow-hidden group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500">
                          <Dumbbell size={20} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">Burned Guess</h3>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">AI Estimation</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-orange-500">~{caloriesBurned.amount}</p>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">kcal</p>
                      </div>
                    </div>

                    {(caloriesBurned.bmr || caloriesBurned.neat) && (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">BMR (24h)</p>
                          <p className="text-sm font-black text-white">{caloriesBurned.bmr} kcal</p>
                        </div>
                        <div className="bg-white/5 p-2 rounded-xl border border-white/5 text-center">
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">NEAT (24h)</p>
                          <p className="text-sm font-black text-white">{caloriesBurned.neat} kcal</p>
                        </div>
                      </div>
                    )}
                    {caloriesBurned.activities && caloriesBurned.activities.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-[10px] font-black text-white/20 uppercase tracking-widest px-1">
                          <span>Activity & Time</span>
                          <div className="flex space-x-6">
                            <span className="w-12 text-center">Duration</span>
                            <span className="w-10 text-right">Kcal</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {caloriesBurned.activities.map((act, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/5">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-white truncate max-w-[100px]">{act.name}</span>
                                {act.time && <span className="text-[8px] text-white/20">{act.time}</span>}
                              </div>
                              <div className="flex space-x-6 text-[10px] font-mono text-white/40">
                                <span className="w-12 text-center">{act.duration ? `${act.duration}m` : '--'}</span>
                                <span className="w-10 text-right font-bold text-orange-500">{act.calories}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                      <Sparkles size={40} className="text-orange-500" />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, index) => (
                  <div 
                    key={`${insight.title}-${index}`} 
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
                    
                    <ChatBox 
                      insight={insight} 
                      height={height}
                      weight={weight}
                      muscularity={muscularity}
                      sex={sex}
                      age={age}
                      onUpdateMessages={(msgs) => {
                        const newInsights = [...insights];
                        newInsights[index] = { ...insight, messages: msgs };
                        setInsights(newInsights);
                        saveAIInsights({
                          insights: newInsights,
                          calorieGuess,
                          caloriesBurned,
                          lastRefreshed
                        });
                      }}
                    />

                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                      <Sparkles size={60} />
                    </div>
                  </div>
                ))}
              </div>
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
    </div>
  );
};

export default AICoach;
