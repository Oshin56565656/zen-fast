import React, { useState, useEffect, FC } from 'react';
import { motion } from 'motion/react';
import { Timer as TimerIcon, Play, Pause, Square, Zap, Sparkles } from 'lucide-react';
import { CurrentFastState, MealRecord } from '../types';
import { formatDuration, cn, formatTime } from '../lib/utils';
import { FastingStages } from './FastingStages';

import { FASTING_STAGES } from '../constants/fastingStages';

interface TimerProps {
  state: CurrentFastState;
  meals: MealRecord[];
  onStart: (startTime?: number) => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onReset: () => void;
}

export const Timer: FC<TimerProps> = ({ state, meals, onStart, onPause, onResume, onEnd, onReset }) => {
  const [elapsed, setElapsed] = useState(0);
  const [displayMode, setDisplayMode] = useState<'elapsed' | 'remaining'>('elapsed');
  
  const targetSeconds = state.targetEndTime && state.startTime 
    ? Math.max(Math.floor((state.targetEndTime - (state.startTime + state.totalPausedTime)) / 1000), 1)
    : state.targetHours * 3600;

  useEffect(() => {
    let interval: number;
    if (state.status === 'fasting' && state.startTime && !state.pausedAt) {
      interval = window.setInterval(() => {
        const now = Date.now();
        const effectiveStart = state.startTime! + state.totalPausedTime;
        setElapsed(Math.floor((now - effectiveStart) / 1000));
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
  const isIdle = state.status === 'idle';

  const lastMeal = meals.length > 0 ? meals[0] : null;

  const currentStage = FASTING_STAGES.find(
    stage => (elapsed / 3600) >= stage.startHour && (elapsed / 3600) < stage.endHour
  );
  const ringColor = isFasting ? (currentStage?.hex || "#f97316") : "#3f3f46";

  const timeRemaining = Math.max(targetSeconds - elapsed, 0);
  const displayTime = displayMode === 'elapsed' 
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
            stroke={ringColor}
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
              : 'Ready to start?'}
          </p>
          <button 
            onClick={() => setDisplayMode(prev => prev === 'elapsed' ? 'remaining' : 'elapsed')}
            className="text-5xl font-bold font-mono tabular-nums hover:text-primary transition-colors"
          >
            {displayTime}
          </button>
          <p className="text-sm text-white/40 mt-2">
            Goal: {state.targetEndTime 
              ? new Date(state.targetEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
              : `${state.targetHours}h`}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {isIdle && (
          <div className="flex flex-col items-center space-y-4">
            <button
              onClick={() => onStart()}
              className="bg-primary hover:bg-primary/90 text-white p-6 rounded-full shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              <Play size={32} fill="currentColor" />
            </button>
            
            {lastMeal && (
              <button
                onClick={() => onStart(lastMeal.time)}
                className="flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold text-white/60 hover:bg-white/10 transition-all active:scale-95"
              >
                <Zap size={14} className="text-yellow-500" />
                <span>Start from last meal ({formatTime(lastMeal.time)})</span>
              </button>
            )}
          </div>
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
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        <div className="bg-card p-4 rounded-2xl border border-white/5 text-center">
          <p className="text-xs text-white/40 mb-1">Target</p>
          <p className="font-bold text-lg">
            {state.targetEndTime 
              ? new Date(state.targetEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
              : `${state.targetHours}h`}
          </p>
        </div>
        <div className="bg-card p-4 rounded-2xl border border-white/5 text-center">
          <p className="text-xs text-white/40 mb-1">Status</p>
          <p className={cn(
            "font-bold text-lg capitalize",
            isFasting ? "text-primary" : "text-white/60"
          )}>
            {state.status}
          </p>
        </div>
      </div>

      <FastingStages elapsedSeconds={elapsed} isFasting={isFasting} />
    </div>
  );
};
