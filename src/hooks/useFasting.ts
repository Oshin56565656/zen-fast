import { useState, useEffect } from 'react';
import { CurrentFastState, FastRecord, FASTING_MODES } from '../types';

const STORAGE_KEY_STATE = 'fasttrack_state';
const STORAGE_KEY_HISTORY = 'fasttrack_history';

export function useFasting() {
  const [state, setState] = useState<CurrentFastState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_STATE);
    return saved ? JSON.parse(saved) : {
      startTime: null,
      endTime: null,
      status: 'idle',
      modeId: '16-8',
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

  const startFast = (modeId: string) => {
    setState({
      startTime: Date.now(),
      endTime: null,
      status: 'fasting',
      modeId,
      pausedAt: null,
      totalPausedTime: 0
    });
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
    
    const mode = FASTING_MODES.find(m => m.id === state.modeId) || FASTING_MODES[0];
    const targetSec = mode.fastHours * 3600;

    const newRecord: FastRecord = {
      id: crypto.randomUUID(),
      startTime: state.startTime,
      endTime: now,
      duration: durationSec,
      targetDuration: targetSec,
      modeId: state.modeId,
      modeName: mode.name,
      completed: durationSec >= targetSec
    };

    setHistory(prev => [newRecord, ...prev]);
    
    // Switch to eating mode
    setState({
      startTime: null,
      endTime: now,
      status: 'eating',
      modeId: state.modeId,
      pausedAt: null,
      totalPausedTime: 0
    });
  };

  const startEating = () => {
    setState(prev => ({ ...prev, status: 'eating', endTime: Date.now() }));
  };

  const resetToIdle = () => {
    setState({
      startTime: null,
      endTime: null,
      status: 'idle',
      modeId: state.modeId,
      pausedAt: null,
      totalPausedTime: 0
    });
  };

  const deleteRecord = (id: string) => {
    setHistory(prev => prev.filter(r => r.id !== id));
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
    setMode: (modeId: string) => setState(prev => ({ ...prev, modeId }))
  };
}
