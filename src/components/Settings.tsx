import React, { FC } from 'react';
import { FASTING_MODES } from '../types';
import { Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface SettingsProps {
  currentModeId: string;
  onModeChange: (id: string) => void;
}

export const Settings: FC<SettingsProps> = ({ currentModeId, onModeChange }) => {
  return (
    <div className="p-6 space-y-8">
      <h2 className="text-xl font-bold">Settings</h2>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-widest">Fasting Goal</h3>
        <div className="space-y-3">
          {FASTING_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={cn(
                "w-full p-4 rounded-2xl border transition-all flex items-center justify-between text-left",
                currentModeId === mode.id 
                  ? "bg-primary/10 border-primary text-primary" 
                  : "bg-card border-white/5 text-white/60 hover:border-white/20"
              )}
            >
              <div>
                <p className="font-bold text-lg">{mode.name}</p>
                <p className="text-xs opacity-70">{mode.description}</p>
              </div>
              {currentModeId === mode.id && <Check size={20} />}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card p-6 rounded-2xl border border-white/5 space-y-4">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-widest">About FastTrack</h3>
        <p className="text-sm text-white/60 leading-relaxed">
          Intermittent fasting is an eating pattern where you cycle between periods of eating and fasting. 
          It doesn't specify which foods you should eat but rather when you should eat them.
        </p>
        <div className="pt-4 border-t border-white/5">
          <p className="text-xs text-white/20">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
};
