import React, { FC, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Sparkles, CheckCircle2, AlertCircle, Bell, BellOff, Info, Download } from 'lucide-react';
import { FastRecord, MealRecord, WorkoutRecord, SleepRecord } from '../types';

interface SettingsProps {
  targetHours: number;
  onHoursChange: (hours: number) => void;
  targetEndTime?: number | null;
  onTargetEndTimeChange: (time: number | null) => void;
  height?: number;
  weight?: number;
  age?: number;
  sex?: 'male' | 'female' | 'other';
  onHeightChange: (height: number) => void;
  onWeightChange: (weight: number) => void;
  onAgeChange: (age: number) => void;
  onSexChange: (sex: 'male' | 'female' | 'other') => void;
  waterGoal?: number;
  onWaterGoalChange: (goal: number) => void;
  accentColor?: string;
  onAccentColorChange: (color: string) => void;
  onTestNotification?: () => void;
  history: FastRecord[];
  meals: MealRecord[];
  workouts: WorkoutRecord[];
  sleep: SleepRecord[];
}

export const Settings: FC<SettingsProps> = ({ 
  targetHours, 
  onHoursChange, 
  targetEndTime,
  onTargetEndTimeChange,
  height, 
  weight, 
  age,
  sex,
  onHeightChange, 
  onWeightChange, 
  onAgeChange,
  onSexChange,
  waterGoal = 2000,
  onWaterGoalChange,
  accentColor = '#f97316',
  onAccentColorChange,
  onTestNotification,
  history,
  meals,
  workouts,
  sleep
}) => {
  const [hasKey, setHasKey] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'unsupported'>('default');

  const bmi = height && weight ? (weight / ((height / 100) ** 2)) : null;
  
  const getBMICategory = (val: number) => {
    if (val < 18.5) return { label: 'Underweight', color: 'text-blue-400', bg: 'bg-blue-400', position: (val / 40) * 100 };
    if (val < 25) return { label: 'Normal', color: 'text-green-400', bg: 'bg-green-400', position: (val / 40) * 100 };
    if (val < 30) return { label: 'Overweight', color: 'text-yellow-400', bg: 'bg-yellow-400', position: (val / 40) * 100 };
    return { label: 'Obese', color: 'text-red-400', bg: 'bg-red-400', position: Math.min((val / 40) * 100, 100) };
  };

  const bmiInfo = bmi ? getBMICategory(bmi) : null;

  const accentColors = [
    { name: 'Orange', value: '#f97316' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Yellow', value: '#eab308' },
  ];

  useEffect(() => {
    if (!("Notification" in window)) {
      setNotificationStatus('unsupported');
    } else {
      setNotificationStatus(Notification.permission);
    }
  }, []);
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

  const handleTimeChange = (timeStr: string) => {
    if (!timeStr) {
      onTargetEndTimeChange(null);
      return;
    }
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    
    // If target time is earlier than now, assume it's for tomorrow
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    
    onTargetEndTimeChange(target.getTime());
  };

  const handleTestNotification = async () => {
    if (onTestNotification) {
      await onTestNotification();
      if ("Notification" in window) {
        setNotificationStatus(Notification.permission);
      }
    }
  };

  const downloadCSV = (type: 'all' | 'fasting' | 'meals' | 'workouts' | 'sleep') => {
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      const cleaned = str.replace(/"/g, '""');
      return `"${cleaned}"`;
    };

    const formatDateTime = (ts: number) => {
      const d = new Date(ts);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      return { date, time };
    };
    
    const triggerDownload = (content: string, filename: string) => {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    let csvContent = "";
    const dateStr = new Date().toISOString().split('T')[0];

    if (type === 'all' || type === 'fasting') {
      csvContent += escapeCSV("FASTING HISTORY") + "\n";
      csvContent += `${escapeCSV("Start Date")},${escapeCSV("Start Time")},${escapeCSV("End Date")},${escapeCSV("End Time")},${escapeCSV("Duration (h)")},${escapeCSV("Target (h)")},${escapeCSV("Goal Met")}\n`;
      history.forEach(record => {
        const start = formatDateTime(record.startTime);
        const end = formatDateTime(record.endTime);
        csvContent += `${escapeCSV(start.date)},${escapeCSV(start.time)},${escapeCSV(end.date)},${escapeCSV(end.time)},${escapeCSV((record.duration / 3600).toFixed(2))},${escapeCSV((record.targetDuration / 3600).toFixed(2))},${escapeCSV(record.completed ? 'Yes' : 'No')}\n`;
      });
      csvContent += "\n";
    }

    if (type === 'all' || type === 'meals') {
      csvContent += escapeCSV("MEAL LOGS") + "\n";
      csvContent += `${escapeCSV("Date")},${escapeCSV("Time")},${escapeCSV("Portion Size")},${escapeCSV("Description")}\n`;
      meals.forEach(record => {
        const dt = formatDateTime(record.time);
        csvContent += `${escapeCSV(dt.date)},${escapeCSV(dt.time)},${escapeCSV(record.scale)},${escapeCSV(record.description || '')}\n`;
      });
      csvContent += "\n";
    }

    if (type === 'all' || type === 'workouts') {
      csvContent += escapeCSV("WORKOUT LOGS") + "\n";
      csvContent += `${escapeCSV("Start Date")},${escapeCSV("Start Time")},${escapeCSV("End Date")},${escapeCSV("End Time")},${escapeCSV("Duration (m)")},${escapeCSV("Intensity")}\n`;
      const sortedWorkouts = [...workouts].sort((a, b) => b.startTime - a.startTime);
      sortedWorkouts.forEach(record => {
        const start = formatDateTime(record.startTime);
        const end = formatDateTime(record.endTime);
        csvContent += `${escapeCSV(start.date)},${escapeCSV(start.time)},${escapeCSV(end.date)},${escapeCSV(end.time)},${escapeCSV(record.duration)},${escapeCSV(record.intensity)}\n`;
      });
      csvContent += "\n";
    }

    if (type === 'all' || type === 'sleep') {
      csvContent += escapeCSV("SLEEP LOGS") + "\n";
      csvContent += `${escapeCSV("Bedtime Date")},${escapeCSV("Bedtime Time")},${escapeCSV("Wake Date")},${escapeCSV("Wake Time")},${escapeCSV("Duration (h)")},${escapeCSV("Quality")}\n`;
      sleep.forEach(record => {
        const start = formatDateTime(record.bedtime);
        const end = formatDateTime(record.wakeUpTime);
        csvContent += `${escapeCSV(start.date)},${escapeCSV(start.time)},${escapeCSV(end.date)},${escapeCSV(end.time)},${escapeCSV(record.duration.toFixed(2))},${escapeCSV(record.quality)}\n`;
      });
    }

    const filename = type === 'all' ? `fasttrack_full_export_${dateStr}.csv` : `fasttrack_${type}_export_${dateStr}.csv`;
    triggerDownload(csvContent, filename);
  };

  const formatTimeForInput = (timestamp: number | null | undefined) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <div className="p-6 space-y-8">
      <h2 className="text-xl font-bold">Settings</h2>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-widest">Fasting Goal</h3>
        <div className="bg-card p-6 rounded-2xl border border-white/5 space-y-8">
          {/* Duration Goal */}
          <div className="space-y-6">
            <div className="text-center">
              <p className={cn("text-5xl font-bold transition-colors", !targetEndTime ? "text-primary" : "text-white/20")}>
                {targetHours}h
              </p>
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

          <div className="flex items-center space-x-4">
            <div className="h-px bg-white/5 flex-1" />
            <span className="text-[10px] font-bold text-white/20 uppercase">OR</span>
            <div className="h-px bg-white/5 flex-1" />
          </div>

          {/* End Time Goal */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Target End Time</label>
              {targetEndTime && (
                <button 
                  onClick={() => onTargetEndTimeChange(null)}
                  className="text-[10px] text-primary font-bold uppercase hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            
            <div className="relative">
              <input
                type="time"
                value={formatTimeForInput(targetEndTime)}
                onChange={(e) => handleTimeChange(e.target.value)}
                className={cn(
                  "w-full bg-white/5 border rounded-xl px-4 py-4 text-xl font-bold text-center transition-all focus:outline-none",
                  targetEndTime ? "border-primary text-primary" : "border-white/10 text-white/40"
                )}
              />
              {!targetEndTime && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <span className="text-white/20 text-sm font-medium">Set a specific time to finish</span>
                </div>
              )}
            </div>
            
            {targetEndTime && (
              <p className="text-[10px] text-center text-white/40 font-medium">
                Fast will end at {new Date(targetEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {new Date(targetEndTime).getDate() !== new Date().getDate() ? ' tomorrow' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-widest">Personal Profile</h3>
        <div className="bg-card p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Age</label>
              <input
                type="number"
                value={age || ''}
                onChange={(e) => onAgeChange(parseInt(e.target.value))}
                placeholder="25"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Sex</label>
              <select
                value={sex || ''}
                onChange={(e) => onSexChange(e.target.value as 'male' | 'female' | 'other')}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
              >
                <option value="" disabled className="bg-background">Select</option>
                <option value="male" className="bg-background">Male</option>
                <option value="female" className="bg-background">Female</option>
                <option value="other" className="bg-background">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Height (cm)</label>
              <input
                type="number"
                value={height || ''}
                onChange={(e) => onHeightChange(parseFloat(e.target.value))}
                placeholder="175"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Weight (kg)</label>
              <input
                type="number"
                value={weight || ''}
                onChange={(e) => onWeightChange(parseFloat(e.target.value))}
                placeholder="70"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Water Goal (ml)</label>
              <input
                type="number"
                value={waterGoal}
                onChange={(e) => onWaterGoalChange(parseInt(e.target.value))}
                placeholder="2000"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {bmi && bmiInfo && (
            <div className="pt-4 border-t border-white/5 space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Your BMI</p>
                  <p className="text-3xl font-bold text-white">{bmi.toFixed(1)}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-bold", bmiInfo.color)}>{bmiInfo.label}</p>
                  <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Category</p>
                </div>
              </div>

              <div className="relative h-2 bg-white/5 rounded-full overflow-hidden flex">
                <div className="h-full bg-blue-400/40" style={{ width: '46.25%' }} /> {/* 18.5 / 40 */}
                <div className="h-full bg-green-400/40" style={{ width: '16.25%' }} /> {/* (25-18.5) / 40 */}
                <div className="h-full bg-yellow-400/40" style={{ width: '12.5%' }} /> {/* (30-25) / 40 */}
                <div className="h-full bg-red-400/40 flex-1" />
                
                <motion.div 
                  initial={{ left: 0 }}
                  animate={{ left: `${bmiInfo.position}%` }}
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] z-10"
                  style={{ transform: 'translateX(-50%)' }}
                />
              </div>

              <div className="flex justify-between text-[8px] text-white/20 font-bold uppercase tracking-tighter">
                <span>15</span>
                <span>18.5</span>
                <span>25</span>
                <span>30</span>
                <span>40+</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-widest">Appearance</h3>
        <div className="bg-card p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Accent Color</label>
            <div className="grid grid-cols-4 gap-3">
              {accentColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => onAccentColorChange(color.value)}
                  className={cn(
                    "group relative aspect-square rounded-xl transition-all active:scale-90",
                    accentColor === color.value ? "ring-2 ring-white ring-offset-2 ring-offset-background" : "hover:scale-105"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {accentColor === color.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CheckCircle2 className="text-white drop-shadow-md" size={16} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Custom Hex Color</label>
            <div className="flex space-x-2">
              <div 
                className="w-12 h-12 rounded-xl border border-white/10 shrink-0"
                style={{ backgroundColor: accentColor }}
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => onAccentColorChange(e.target.value)}
                placeholder="#f97316"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-widest">Notifications</h3>
        <div className="bg-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                notificationStatus === 'granted' ? "bg-green-500/10 text-green-500" : "bg-white/5 text-white/40"
              )}>
                {notificationStatus === 'granted' ? <Bell size={20} /> : <BellOff size={20} />}
              </div>
              <div>
                <p className="font-bold text-sm">Push Notifications</p>
                <p className="text-xs text-white/40 capitalize">
                  {notificationStatus === 'unsupported' ? "Not supported on this browser" : notificationStatus}
                </p>
              </div>
            </div>
            {notificationStatus === 'granted' ? (
              <CheckCircle2 className="text-green-500" size={20} />
            ) : (
              <AlertCircle className="text-white/20" size={20} />
            )}
          </div>

          {notificationStatus === 'unsupported' ? (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={14} />
              <p className="text-[10px] text-red-500/80 leading-relaxed">
                Your browser doesn't support web notifications. Try using Chrome or Safari.
              </p>
            </div>
          ) : notificationStatus !== 'granted' ? (
            <div className="space-y-3">
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-start space-x-3">
                <Info className="text-primary shrink-0 mt-0.5" size={14} />
                <div className="space-y-1">
                  <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Mobile Users</p>
                  <p className="text-[10px] text-primary/80 leading-relaxed">
                    <strong>iOS:</strong> Add to Home Screen first.<br />
                    <strong>Android:</strong> Ensure notifications are enabled in Chrome settings.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-xl flex items-start space-x-3">
              <Info className="text-green-500 shrink-0 mt-0.5" size={14} />
              <div className="space-y-1">
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">Android Troubleshooting</p>
                <p className="text-[10px] text-green-500/80 leading-relaxed">
                  If notifications still don't appear: <br />
                  1. Check <strong>Android Settings &gt; Apps &gt; Chrome &gt; Notifications</strong>.<br />
                  2. Disable <strong>Battery Optimization</strong> for Chrome.<br />
                  3. Ensure you are <strong>not</strong> in Incognito/Private mode.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleTestNotification}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <Bell size={16} />
            <span>Send Test Notification</span>
          </button>
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

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-widest">Data Management</h3>
        <div className="bg-card p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="space-y-2">
            <p className="text-xs text-white/60 leading-relaxed">
              Export your logs to structured CSV files. You can download everything at once or choose specific categories.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => downloadCSV('all')}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold flex items-center justify-center space-x-3 transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              <Download size={20} />
              <span>Download All Data</span>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => downloadCSV('fasting')}
                className="py-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 border border-white/5"
              >
                <Download size={14} className="text-primary" />
                <span>Fasting</span>
              </button>
              <button
                onClick={() => downloadCSV('meals')}
                className="py-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 border border-white/5"
              >
                <Download size={14} className="text-primary" />
                <span>Meals</span>
              </button>
              <button
                onClick={() => downloadCSV('workouts')}
                className="py-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 border border-white/5"
              >
                <Download size={14} className="text-primary" />
                <span>Workouts</span>
              </button>
              <button
                onClick={() => downloadCSV('sleep')}
                className="py-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 border border-white/5"
              >
                <Download size={14} className="text-primary" />
                <span>Sleep</span>
              </button>
            </div>
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
