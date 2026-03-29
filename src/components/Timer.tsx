import React, { useState, useEffect, FC } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, Square, Zap, Sparkles } from 'lucide-react';
import { CurrentFastState } from '../types';
import { formatDuration, cn } from '../lib/utils';
import { getSmartMotivation } from '../services/aiService';

interface TimerProps {
  state: CurrentFastState;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onReset: () => void;
}

export const Timer: FC<TimerProps> = ({ state, onStart, onPause, onResume, onEnd, onReset }) => {
  const [elapsed, setElapsed] = useState(0);
  const [displayMode, setDisplayMode] = useState<'elapsed' | 'remaining'>('elapsed');
  const [motivation, setMotivation] = useState<string>('');
  const [loadingMotivation, setLoadingMotivation] = useState(false);
  const [lastMotivationHour, setLastMotivationHour] = useState(-1);
  
  const targetSeconds = state.targetHours * 3600;

  useEffect(() => {
    const hoursPassed = elapsed / 3600;
    // Fetch motivation every 2 hours or at the start
    if (state.status === 'fasting' && !state.pausedAt && !loadingMotivation && (hoursPassed >= lastMotivationHour + 2 || (hoursPassed > 0 && lastMotivationHour === -1))) {
      const fetchMotivation = async () => {
        setLoadingMotivation(true);
        // Set this immediately to prevent re-triggering while loading
        const currentHour = Math.floor(hoursPassed);
        setLastMotivationHour(currentHour);
        
        try {
          const msg = await getSmartMotivation(hoursPassed, state.targetHours);
          setMotivation(msg);
        } catch (error) {
          console.error('Error fetching motivation:', error);
          // Reset if it failed so it can try again later
          setLastMotivationHour(prev => prev - 1);
        } finally {
          setLoadingMotivation(false);
        }
      };
      fetchMotivation();
    }
  }, [elapsed, state.status, state.pausedAt, state.targetHours, lastMotivationHour, loadingMotivation]);

  useEffect(() => {
    let interval: number;
    if (state.status === 'fasting' && state.startTime && !state.pausedAt) {
      interval = window.setInterval(() => {
        const now = Date.now();
        const effectiveStart = state.startTime! + state.totalPausedTime;
        setElapsed(Math.floor((now - effectiveStart) / 1000));
      }, 1000);
    } else if (state.status === 'eating' && state.endTime) {
      interval = window.setInterval(() => {
        const now = Date.now();
        setElapsed(Math.floor((now - state.endTime!) / 1000));
      }, 1000);
    } else if (state.pausedAt && state.startTime) {
      const effectiveStart = state.startTime! + state.totalPausedTime;
      setElapsed(Math.floor((state.pausedAt - effectiveStart) / 1000));
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [state]);

  const progress = Math.min((elapsed / targetSeconds) * 100, 100);
  const strokeDasharray = 2 * Math.PI * 120;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * progress) / 100;

  const isFasting = state.status === 'fasting';
  const isEating = state.status === 'eating';
  const isIdle = state.status === 'idle';

  const timeRemaining = Math.max(targetSeconds - elapsed, 0);
  const displayTime = isEating 
    ? formatDuration(timeRemaining) 
    : displayMode === 'elapsed' 
      ? formatDuration(elapsed) 
      : formatDuration(timeRemaining);

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-8">
      <div className="relative w-72 h-72 flex items-center justify-center">
        {/* Background Ring */}
        <svg className="absolute w-full h-full -rotate-90">
          <circle
            cx="144"
            cy="144"
            r="120"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
            className="text-white/5"
          />
          {/* Progress Ring */}
          <motion.circle
            cx="144"
            cy="144"
            r="120"
            fill="transparent"
            stroke={isFasting ? "#f97316" : isEating ? "#22c55e" : "#3f3f46"}
            strokeWidth="12"
            strokeDasharray={strokeDasharray}
            initial={{ strokeDashoffset: strokeDasharray }}
            animate={{ strokeDashoffset }}
            strokeLinecap="round"
            className="timer-ring"
          />
        </svg>

        <div className="text-center z-10">
          <p className="text-sm font-medium text-white/40 uppercase tracking-widest mb-1">
            {isFasting 
              ? (displayMode === 'elapsed' ? 'Fasting Time' : 'Time Remaining') 
              : isEating ? 'Eating Window Left' : 'Ready to start?'}
          </p>
          <button 
            onClick={() => setDisplayMode(prev => prev === 'elapsed' ? 'remaining' : 'elapsed')}
            className="text-5xl font-bold font-mono tabular-nums hover:text-primary transition-colors"
          >
            {displayTime}
          </button>
          <p className="text-sm text-white/40 mt-2">
            Goal: {state.targetHours}h
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {isIdle && (
          <button
            onClick={onStart}
            className="bg-primary hover:bg-primary/90 text-white p-6 rounded-full shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            <Play size={32} fill="currentColor" />
          </button>
        )}

        {isFasting && (
          <>
            {!state.pausedAt ? (
              <button
                onClick={onPause}
                className="bg-white/10 hover:bg-white/20 text-white p-5 rounded-full transition-all active:scale-95"
              >
                <Pause size={28} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={onResume}
                className="bg-primary text-white p-5 rounded-full transition-all active:scale-95"
              >
                <Play size={28} fill="currentColor" />
              </button>
            )}
            <button
              onClick={onEnd}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-500 p-5 rounded-full transition-all active:scale-95"
            >
              <Square size={28} fill="currentColor" />
            </button>
          </>
        )}

        {isEating && (
          <button
            onClick={onReset}
            className="bg-accent hover:bg-accent/90 text-white px-8 py-4 rounded-full font-bold flex items-center space-x-2 shadow-lg shadow-accent/20 transition-all active:scale-95"
          >
            <Zap size={20} fill="currentColor" />
            <span>Start New Fast</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        <div className="bg-card p-4 rounded-2xl border border-white/5 text-center">
          <p className="text-xs text-white/40 mb-1">Target</p>
          <p className="font-bold text-lg">{state.targetHours}h</p>
        </div>
        <div className="bg-card p-4 rounded-2xl border border-white/5 text-center">
          <p className="text-xs text-white/40 mb-1">Status</p>
          <p className={cn(
            "font-bold text-lg capitalize",
            isFasting ? "text-primary" : isEating ? "text-accent" : "text-white/60"
          )}>
            {state.status}
          </p>
        </div>
      </div>

      {isFasting && (motivation || loadingMotivation) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm bg-primary/5 border border-primary/10 p-4 rounded-2xl relative overflow-hidden"
        >
          <div className="flex items-start space-x-3">
            <Sparkles className="text-primary shrink-0 mt-1" size={18} />
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Coach Insight</p>
              {loadingMotivation ? (
                <div className="h-4 w-32 bg-primary/10 animate-pulse rounded" />
              ) : (
                <p className="text-xs text-white/70 leading-relaxed italic">
                  {motivation}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
