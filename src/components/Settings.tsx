import React, { FC, useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface SettingsProps {
  targetHours: number;
  onHoursChange: (hours: number) => void;
}

export const Settings: FC<SettingsProps> = ({ targetHours, onHoursChange }) => {
  const [hasKey, setHasKey] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      // Check localStorage first
      const local = localStorage.getItem('FT_GEMINI_API_KEY');
      if (local) {
        setHasKey(true);
        setManualKey(local);
        return;
      }

      // @ts-ignore
      if (typeof window !== 'undefined' && window.aistudio) {
        // @ts-ignore
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected || !!process.env.GEMINI_API_KEY || !!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleSaveManualKey = () => {
    if (!manualKey.trim()) return;
    setIsSaving(true);
    localStorage.setItem('FT_GEMINI_API_KEY', manualKey.trim());
    setHasKey(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowManual(false);
    }, 800);
  };

  const handleSelectKey = async () => {
    try {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.aistudio) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        setHasKey(true);
      } else {
        // Fallback to showing manual input if platform selector is missing
        setShowManual(true);
      }
    } catch (error) {
      console.error('Error selecting API key:', error);
      setShowManual(true);
    }
  };

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

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-widest">AI Integration</h3>
        <div className="bg-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                hasKey ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"
              )}>
                <Sparkles size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">Gemini AI Coach</p>
                <p className="text-xs text-white/40">
                  {hasKey ? "Connected and ready" : "Not connected"}
                </p>
              </div>
            </div>
            {hasKey ? (
              <CheckCircle2 className="text-green-500" size={20} />
            ) : (
              <AlertCircle className="text-primary" size={20} />
            )}
          </div>

          <p className="text-xs text-white/60 leading-relaxed">
            Connect your Gemini API key to get personalized insights, biological stage analysis, and smart motivation.
          </p>

          <button
            onClick={handleSelectKey}
            className={cn(
              "w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center space-x-2",
              hasKey 
                ? "bg-white/5 text-white/60 hover:bg-white/10" 
                : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
            )}
          >
            <Sparkles size={16} />
            <span>{hasKey ? "Change API Key" : "Connect AI Coach"}</span>
          </button>

          {showManual && (
            <div className="space-y-3 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Paste API Key Manually</p>
              <div className="flex space-x-2">
                <input
                  type="password"
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  onClick={handleSaveManualKey}
                  disabled={isSaving}
                  className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-primary/90 disabled:opacity-50 transition-all"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] text-white/20 hover:text-white/40 underline underline-offset-4"
            >
              How to get a free API key?
            </a>
            {!showManual && (
              <button 
                onClick={() => setShowManual(true)}
                className="text-[10px] text-white/20 hover:text-white/40"
              >
                Enter manually
              </button>
            )}
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
