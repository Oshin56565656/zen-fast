import React, { FC } from 'react';
import { cn } from '../lib/utils';

interface SettingsProps {
  targetHours: number;
  onHoursChange: (hours: number) => void;
}

export const Settings: FC<SettingsProps> = ({ targetHours, onHoursChange }) => {
  return (
    <div className="p-6 space-y-8">
      <h2 className="text-xl font-bold">Settings</h2>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-widest">Fasting Goal</h3>
        <div className="bg-card p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="text-center">
            <p className="text-5xl font-bold text-primary">{targetHours}h</p>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">Target Duration</p>
          </div>
          
          <input
            type="range"
            min="1"
            max="48"
            step="1"
            value={targetHours}
            onChange={(e) => onHoursChange(parseInt(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
          />
          
          <div className="flex justify-between text-[10px] text-white/20 uppercase font-bold">
            <span>1 Hour</span>
            <span>24 Hours</span>
            <span>48 Hours</span>
          </div>
        </div>
      </div>

      <div className="bg-card p-6 rounded-2xl border border-white/5 space-y-4">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-widest">About FastTrack</h3>
        <p className="text-sm text-white/60 leading-relaxed">
          Intermittent fasting is an eating pattern where you cycle between periods of eating and fasting. 
          Simply set your target hours and start your fast.
        </p>
        <div className="pt-4 border-t border-white/5">
          <p className="text-xs text-white/20">Version 1.1.0</p>
        </div>
      </div>
    </div>
  );
};
