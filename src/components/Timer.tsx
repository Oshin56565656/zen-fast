import React, { useState, useEffect, FC } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, Square, Utensils, Zap } from 'lucide-react';
import { CurrentFastState, FASTING_MODES } from '../types';
import { formatDuration, cn } from '../lib/utils';

interface TimerProps {
  state: CurrentFastState;
  onStart: (modeId: string) => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onReset: () => void;
}

export const Timer: FC<TimerProps> = ({ state, onStart, onPause, onResume, onEnd, onReset }) => {
  const [elapsed, setElapsed] = useState(0);
  const mode = FASTING_MODES.find(m => m.id === state.modeId) || FASTING_MODES[0];
  const targetSeconds = state.status === 'fasting' ? mode.fastHours * 3600 : mode.eatHours * 3600;

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
  const displayTime = isEating ? formatDuration(timeRemaining) : formatDuration(elapsed);

  const motivationalMessages = [
    "Your body is healing itself.",
    "Stay hydrated, keep going!",
    "Autophagy is kicking in.",
    "You are stronger than your cravings.",
    "Focus on your goals, not your hunger.",
    "Almost there, stay focused!",
  ];

  const [messageIndex, setMessageIndex] = useState(0);
  useEffect(() => {
    if (isFasting) {
      const interval = setInterval(() => {
        setMessageIndex(prev => (prev + 1) % motivationalMessages.length);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isFasting]);

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
            {isFasting ? 'Fasting Time' : isEating ? 'Eating Window Left' : 'Ready to start?'}
          </p>
          <h2 className="text-5xl font-bold font-mono tabular-nums">
            {displayTime}
          </h2>
          <p className="text-sm text-white/40 mt-2">
            Goal: {isFasting ? mode.fastHours : mode.eatHours}h
          </p>
        </div>
      </div>

      {isFasting && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key={messageIndex}
          className="text-center text-primary/80 italic text-sm font-medium h-4"
        >
          "{motivationalMessages[messageIndex]}"
        </motion.p>
      )}

      <div className="flex items-center space-x-4">
        {isIdle && (
          <button
            onClick={() => onStart(state.modeId)}
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
        <div className="bg-card p-4 rounded-2xl border border-white/5">
          <p className="text-xs text-white/40 mb-1">Mode</p>
          <p className="font-bold text-lg">{mode.name}</p>
        </div>
        <div className="bg-card p-4 rounded-2xl border border-white/5">
          <p className="text-xs text-white/40 mb-1">Status</p>
          <p className={cn(
            "font-bold text-lg capitalize",
            isFasting ? "text-primary" : isEating ? "text-accent" : "text-white/60"
          )}>
            {state.status}
          </p>
        </div>
      </div>
    </div>
  );
};
