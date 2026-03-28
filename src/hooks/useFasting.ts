import { useState, useEffect } from 'react';
import { CurrentFastState, FastRecord } from '../types';

const STORAGE_KEY_STATE = 'fasttrack_state';
const STORAGE_KEY_HISTORY = 'fasttrack_history';

export function useFasting() {
  const [state, setState] = useState<CurrentFastState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_STATE);
    return saved ? JSON.parse(saved) : {
      startTime: null,
      endTime: null,
      status: 'idle',
      targetHours: 16,
      pausedAt: null,
      totalPausedTime: 0
    };
  });

  const [history, setHistory] = useState<FastRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  }, [history]);

  const startFast = () => {
    setState(prev => ({
      ...prev,
      startTime: Date.now(),
      endTime: null,
      status: 'fasting',
      pausedAt: null,
      totalPausedTime: 0
    }));
  };

  const pauseFast = () => {
    if (state.status !== 'fasting' || state.pausedAt) return;
    setState(prev => ({ ...prev, pausedAt: Date.now() }));
  };

  const resumeFast = () => {
    if (state.status !== 'fasting' || !state.pausedAt) return;
    const pauseDuration = Date.now() - state.pausedAt;
    setState(prev => ({
      ...prev,
      pausedAt: null,
      totalPausedTime: prev.totalPausedTime + pauseDuration
    }));
  };

  const endFast = () => {
    if (state.status !== 'fasting' || !state.startTime) return;
    
    const now = Date.now();
    const effectiveStartTime = state.startTime + state.totalPausedTime;
    const durationMs = now - effectiveStartTime;
    const durationSec = Math.floor(durationMs / 1000);
    
    const targetSec = state.targetHours * 3600;

    const newRecord: FastRecord = {
      id: crypto.randomUUID(),
      startTime: state.startTime,
      endTime: now,
      duration: durationSec,
      targetDuration: targetSec,
      completed: durationSec >= targetSec
    };

    setHistory(prev => [newRecord, ...prev]);
    
    // Switch to eating mode
    setState(prev => ({
      ...prev,
      startTime: null,
      endTime: now,
      status: 'eating',
      pausedAt: null,
      totalPausedTime: 0
    }));
  };

  const startEating = () => {
    setState(prev => ({ ...prev, status: 'eating', endTime: Date.now() }));
  };

  const resetToIdle = () => {
    setState(prev => ({
      ...prev,
      startTime: null,
      endTime: null,
      status: 'idle',
      pausedAt: null,
      totalPausedTime: 0
    }));
  };

  const deleteRecord = (id: string) => {
    setHistory(prev => prev.filter(r => r.id !== id));
  };

  const manualLogFast = (startTime: number, endTime: number, targetHours: number) => {
    const durationSec = Math.floor((endTime - startTime) / 1000);
    const targetSec = targetHours * 3600;

    const newRecord: FastRecord = {
      id: crypto.randomUUID(),
      startTime,
      endTime,
      duration: durationSec,
      targetDuration: targetSec,
      completed: durationSec >= targetSec
    };

    setHistory(prev => [newRecord, ...prev]);
  };

  const setTargetHours = (hours: number) => {
    setState(prev => ({ ...prev, targetHours: hours }));
  };

  return {
    state,
    history,
    startFast,
    pauseFast,
    resumeFast,
    endFast,
    startEating,
    resetToIdle,
    deleteRecord,
    manualLogFast,
    setTargetHours
  };
}
