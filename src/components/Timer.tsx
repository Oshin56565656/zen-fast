import React, { useState, useEffect, FC } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer as TimerIcon, Play, Pause, Square, Zap, Sparkles, Wind, Info } from 'lucide-react';
import { CurrentFastState, MealRecord } from '../types';
import { formatDuration, cn, formatTime, formatDurationShort } from '../lib/utils';
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

interface BreathingTechnique {
  name: string;
  description: string;
  phases: { phase: 'inhale' | 'hold' | 'exhale' | 'hold2'; duration: number; label: string }[];
}

const BREATHING_TECHNIQUES: Record<string, BreathingTechnique> = {
  box: {
    name: 'Box Breathing',
    description: 'Perfect for focus and mental clarity.',
    phases: [
      { phase: 'inhale', duration: 4000, label: 'Inhale' },
      { phase: 'hold', duration: 4000, label: 'Hold' },
      { phase: 'exhale', duration: 4000, label: 'Exhale' },
      { phase: 'hold2', duration: 4000, label: 'Hold' },
    ]
  },
  relax: {
    name: '4-7-8 Sleep',
    description: 'Natural tranquilizer for the nervous system.',
    phases: [
      { phase: 'inhale', duration: 4000, label: 'Inhale' },
      { phase: 'hold', duration: 7000, label: 'Hold' },
      { phase: 'exhale', duration: 8000, label: 'Exhale' },
    ]
  },
  calm: {
    name: 'Stress Relief',
    description: 'Longer exhales to activate the vagus nerve.',
    phases: [
      { phase: 'inhale', duration: 4000, label: 'Inhale' },
      { phase: 'exhale', duration: 6000, label: 'Exhale' },
    ]
  }
};

const BreathingBubble = () => {
  const [selectedKey, setSelectedKey] = useState<string>('box');
  const [isActive, setIsActive] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  
  const technique = BREATHING_TECHNIQUES[selectedKey];
  const currentPhase = technique.phases[phaseIndex];

  useEffect(() => {
    let timeout: number;
    
    if (isActive) {
      timeout = window.setTimeout(() => {
        setPhaseIndex((prev) => (prev + 1) % technique.phases.length);
      }, currentPhase.duration);
    } else {
      setPhaseIndex(0);
    }
    
    return () => clearTimeout(timeout);
  }, [isActive, phaseIndex, technique]);

  const toggleActive = () => {
    setIsActive(!isActive);
    if ("vibrate" in navigator) navigator.vibrate(50);
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-sm">
      {/* Technique Selector */}
      <div className="grid grid-cols-3 gap-2 w-full p-1 bg-white/5 rounded-2xl border border-white/5">
        {Object.entries(BREATHING_TECHNIQUES).map(([key, t]) => (
          <button
            key={key}
            onClick={() => {
              setSelectedKey(key);
              setIsActive(false);
              setPhaseIndex(0);
            }}
            className={cn(
              "py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              selectedKey === key ? "bg-primary/20 text-white border border-primary/30" : "text-white/40 hover:text-white/60"
            )}
          >
            {t.name.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="text-center h-8">
        <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">{technique.description}</p>
      </div>

      <div className="relative flex items-center justify-center w-64 h-64">
        {/* Glow Effects */}
        <motion.div
          animate={isActive ? {
            scale: currentPhase.phase === 'inhale' || currentPhase.phase === 'hold' ? [1, 1.25, 1.4] : [1.4, 1.1, 1],
            opacity: currentPhase.phase === 'inhale' || currentPhase.phase === 'hold' ? [0.1, 0.25, 0.4] : [0.4, 0.15, 0.1],
          } : { scale: 1, opacity: 0.1 }}
          transition={{ duration: currentPhase.duration / 1000, ease: "easeInOut" }}
          className="absolute inset-0 bg-primary/20 rounded-full blur-3xl"
        />

        {/* The Inner Core */}
        <motion.div
          animate={isActive ? {
            scale: currentPhase.phase === 'inhale' || currentPhase.phase === 'hold' ? 1.2 : 0.6,
            backgroundColor: currentPhase.phase === 'inhale' || currentPhase.phase === 'hold' ? 'rgba(var(--primary), 0.5)' : 'rgba(var(--primary), 0.15)',
          } : { scale: 1, backgroundColor: 'rgba(var(--primary), 0.2)' }}
          transition={{ duration: currentPhase.duration / 1000, ease: "easeInOut" }}
          className="w-40 h-40 rounded-full bg-primary/30 flex items-center justify-center backdrop-blur-md shadow-2xl shadow-primary/20 relative z-10"
        >
          <div className="text-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={isActive ? currentPhase.label : 'ready'}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                className="text-white font-black uppercase tracking-[0.2em] text-xs"
              >
                {isActive ? currentPhase.label : 'Ready'}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Particles (Only when inhaling) */}
        {isActive && currentPhase.phase === 'inhale' && (
          <div className="absolute inset-0 z-0 overflow-hidden rounded-full pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: 20, opacity: 0, x: (i - 4) * 15 }}
                animate={{ y: -100, opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                className="absolute left-1/2 bottom-1/2 w-1 h-1 bg-white/40 rounded-full"
              />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={toggleActive}
        className={cn(
          "px-10 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all shadow-xl active:scale-95",
          isActive 
            ? "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10" 
            : "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
        )}
      >
        {isActive ? 'Stop' : 'Start Session'}
      </button>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center space-x-3 w-full">
        <Info size={14} className="text-primary shrink-0" />
        <p className="text-[10px] text-white/60 leading-tight font-medium">
          Control your breath, control your life. This {technique.name} session helps lower heart rate and stress chemicals immediately.
        </p>
      </div>
    </div>
  );
};

export const Timer: FC<TimerProps> = ({ state, meals, onStart, onPause, onResume, onEnd, onReset }) => {
  const [elapsed, setElapsed] = useState(0);
  const [displayMode, setDisplayMode] = useState<'elapsed' | 'remaining'>('elapsed');
  const [activeTab, setActiveTab] = useState<'fasting' | 'relaxation'>('fasting');
  
  const targetSeconds = state.targetEndTime && state.startTime 
    ? Math.max(Math.floor((state.targetEndTime - (state.startTime + state.totalPausedTime)) / 1000), 1)
    : state.targetHours * 3600;

  useEffect(() => {
    let interval: number;
    if (state.status === 'fasting' && state.startTime && !state.pausedAt) {
      interval = window.setInterval(() => {
        const now = Date.now();
        const effectiveStart = state.startTime! + state.totalPausedTime;
        const currentElapsed = Math.floor((now - effectiveStart) / 1000);
        
        if (state.targetEndTime && now >= state.targetEndTime) {
          setElapsed(targetSeconds);
        } else {
          setElapsed(currentElapsed);
        }
      }, 1000);
    } else if (state.pausedAt && state.startTime) {
      const effectiveStart = state.startTime! + state.totalPausedTime;
      setElapsed(Math.floor((state.pausedAt - effectiveStart) / 1000));
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [state, targetSeconds]);

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
    <div className="flex flex-col items-center justify-center p-8 space-y-8 min-h-[600px]">
      {/* Mode Toggle */}
      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 w-full max-w-[280px]">
        <button
          onClick={() => setActiveTab('fasting')}
          className={cn(
            "flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'fasting' ? "bg-primary text-white shadow-lg" : "text-white/40 hover:text-white/60"
          )}
        >
          <TimerIcon size={14} />
          <span>Fasting</span>
        </button>
        <button
          onClick={() => setActiveTab('relaxation')}
          className={cn(
            "flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition-all",
            activeTab === 'relaxation' ? "bg-primary text-white shadow-lg" : "text-white/40 hover:text-white/60"
          )}
        >
          <Wind size={14} />
          <span>Relaxation</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'fasting' ? (
          <motion.div
            key="fasting-tab"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center space-y-8 w-full"
          >
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
                  className="timer-ring transition-all duration-1000"
                />
              </svg>

              <div className="text-center z-10">
                <p className="text-xs font-black text-white/40 uppercase tracking-[0.2em] mb-1">
                  {isFasting 
                    ? (displayMode === 'elapsed' ? 'Fasting Time' : 'Time Remaining') 
                    : 'Ready to start?'}
                </p>
                <button 
                  onClick={() => setDisplayMode(prev => prev === 'elapsed' ? 'remaining' : 'elapsed')}
                  className="text-4xl font-bold font-mono tabular-nums hover:text-primary transition-colors text-white"
                >
                  {displayTime}
                </button>
                <p className="text-xs font-bold text-white/20 mt-2 tracking-tighter">
                  Goal: {state.targetEndTime 
                    ? new Date(state.targetEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                    : formatDurationShort(state.targetHours * 3600)}
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
                      className="flex items-center space-x-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 transition-all active:scale-95"
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
              <div className="bg-card p-4 rounded-2xl border border-white/5 text-center shadow-lg shadow-black/20">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Target</p>
                <p className="font-bold text-lg text-white">
                  {state.targetEndTime 
                    ? new Date(state.targetEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                    : formatDurationShort(state.targetHours * 3600)}
                </p>
              </div>
              <div className="bg-card p-4 rounded-2xl border border-white/5 text-center shadow-lg shadow-black/20">
                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Status</p>
                <p className={cn(
                  "font-bold text-lg capitalize",
                  isFasting ? "text-primary" : "text-white/60"
                )}>
                  {state.status}
                </p>
              </div>
            </div>

            <FastingStages elapsedSeconds={elapsed} isFasting={isFasting} />
          </motion.div>
        ) : (
          <motion.div
            key="relaxation-tab"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full flex flex-col items-center"
          >
            <BreathingBubble />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

