import React, { FC, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { cn, formatDurationShort } from '../lib/utils';
import { Sparkles, CheckCircle2, AlertCircle, Bell, BellOff, Info, Download, ChevronDown, User, Target, Settings as SettingsIcon, Database, Brain, Plus, Clock, RefreshCw } from 'lucide-react';
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
  onHeightChange: (height: number) => Promise<void>;
  onWeightChange: (weight: number) => Promise<void>;
  onAgeChange: (age: number) => Promise<void>;
  onSexChange: (sex: 'male' | 'female' | 'other') => Promise<void>;
  waterGoal?: number;
  onWaterGoalChange: (goal: number) => Promise<void>;
  accentColor?: string;
  onAccentColorChange: (color: string) => Promise<void>;
  notificationsEnabled?: boolean;
  onNotificationsEnabledChange: (enabled: boolean) => Promise<void>;
  waterReminderEnabled?: boolean;
  onWaterReminderEnabledChange?: (enabled: boolean) => Promise<void>;
  waterReminderInterval?: number;
  onWaterReminderIntervalChange?: (interval: number) => Promise<void>;
  waterReminderStartHour?: number;
  onWaterReminderStartHourChange?: (hour: number) => Promise<void>;
  waterReminderEndHour?: number;
  onWaterReminderEndHourChange?: (hour: number) => Promise<void>;
  lastWaterReminder?: number | null;
  waterPresets?: number[];
  onWaterPresetsChange?: (presets: number[]) => void;
  onTestNotification?: () => void;
  history: FastRecord[];
  meals: MealRecord[];
  workouts: WorkoutRecord[];
  sleep: SleepRecord[];
  dailySummaries?: any[];
}

interface CollapsibleSectionProps {
  id: string;
  title: string;
  icon: any;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
}

const CollapsibleSection: FC<CollapsibleSectionProps> = ({ 
  title, 
  icon: Icon, 
  children,
  isExpanded,
  onToggle
}) => {
  return (
    <div className="space-y-4">
      <button 
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between py-2 group focus:outline-none"
      >
        <div className="flex items-center space-x-3">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            isExpanded ? "bg-primary/20 text-primary" : "bg-white/5 text-white/40 group-hover:text-white/60"
          )}>
            <Icon size={18} />
          </div>
          <h3 className={cn(
            "text-sm font-medium uppercase tracking-widest transition-colors",
            isExpanded ? "text-white" : "text-white/40 group-hover:text-white/60"
          )}>
            {title}
          </h3>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white/20 group-hover:text-white/40"
        >
          <ChevronDown size={20} />
        </motion.div>
      </button>

      <motion.div
        initial={false}
        animate={{ 
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0,
          marginBottom: isExpanded ? 24 : 0
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <div className="pt-2">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

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
  notificationsEnabled = true,
  onNotificationsEnabledChange,
  waterReminderEnabled = true,
  onWaterReminderEnabledChange,
  waterReminderInterval = 1,
  onWaterReminderIntervalChange,
  waterReminderStartHour = 8,
  onWaterReminderStartHourChange,
  waterReminderEndHour = 23,
  onWaterReminderEndHourChange,
  lastWaterReminder,
  waterPresets = [100, 150, 250, 300],
  onWaterPresetsChange,
  onTestNotification,
  history,
  meals,
  workouts,
  sleep,
  dailySummaries = []
}) => {
  const [hasKey, setHasKey] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    profile: false,
    goals: false,
    appearance: false,
    hydration: false,
    notifications: false,
    data: false,
    ai: false,
    about: false
  });

  const [newPreset, setNewPreset] = useState<string>('');

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

  const handleAddPreset = () => {
    if (!newPreset || !onWaterPresetsChange) return;
    const val = parseInt(newPreset);
    if (isNaN(val) || val <= 0) return;
    if (waterPresets.includes(val)) return;
    if (waterPresets.length >= 8) return;
    
    const updated = [...waterPresets, val].sort((a, b) => a - b);
    onWaterPresetsChange(updated);
    setNewPreset('');
  };

  const handleRemovePreset = (preset: number) => {
    if (!onWaterPresetsChange) return;
    const updated = waterPresets.filter(p => p !== preset);
    onWaterPresetsChange(updated);
  };

  const downloadCSV = (type: 'all' | 'fasting' | 'meals' | 'workouts' | 'sleep' | 'consistency') => {
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
      csvContent += "\n";
    }

    if (type === 'all' || type === 'consistency') {
      csvContent += escapeCSV("DAILY GOALS CONSISTENCY") + "\n";
      csvContent += `${escapeCSV("Date")},${escapeCSV("Calories Consumed")},${escapeCSV("Calories Burned")},${escapeCSV("Water Intake (ml)")},${escapeCSV("Water Goal (ml)")},${escapeCSV("Calorie Deficit Met")},${escapeCSV("Water Goal Met")}\n`;
      dailySummaries.forEach(record => {
        csvContent += `${escapeCSV(record.date)},${escapeCSV(record.intake)},${escapeCSV(record.burn)},${escapeCSV(record.waterTotal)},${escapeCSV(record.waterGoal)},${escapeCSV(record.isDeficit ? 'Yes' : 'No')},${escapeCSV(record.isWaterGoalMet ? 'Yes' : 'No')}\n`;
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

      <CollapsibleSection 
        id="goals" 
        title="Fasting Goal" 
        icon={Target}
        isExpanded={expandedSections.goals}
        onToggle={() => toggleSection('goals')}
      >
        <div className="bg-card p-6 rounded-2xl border border-white/5 space-y-8">
          {/* Duration Goal */}
          <div className="space-y-6">
            <div className="text-center">
              <p className={cn("text-5xl font-bold transition-colors", !targetEndTime ? "text-primary" : "text-white/20")}>
                {formatDurationShort(targetHours * 3600)}
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
      </CollapsibleSection>

      <CollapsibleSection 
        id="profile" 
        title="Personal Profile" 
        icon={User}
        isExpanded={expandedSections.profile}
        onToggle={() => toggleSection('profile')}
      >
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
      </CollapsibleSection>

      <CollapsibleSection 
        id="appearance" 
        title="Appearance" 
        icon={Target}
        isExpanded={expandedSections.appearance}
        onToggle={() => toggleSection('appearance')}
      >
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
      </CollapsibleSection>

      <CollapsibleSection 
        id="hydration" 
        title="Hydration Presets" 
        icon={Target}
        isExpanded={expandedSections.hydration}
        onToggle={() => toggleSection('hydration')}
      >
        <div className="bg-card p-6 rounded-2xl border border-white/5 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                Quick Log Presets (ml)
              </label>
              <span className="text-[10px] font-medium text-white/20">
                {waterPresets.length}/8 active
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {waterPresets.map((preset) => (
                <div 
                  key={preset}
                  className="group flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-primary/50 transition-all"
                >
                  <span className="pl-3 pr-2 py-2 text-xs font-bold text-white">
                    {preset}ml
                  </span>
                  <button
                    onClick={() => handleRemovePreset(preset)}
                    className="p-2 bg-white/5 text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-colors border-l border-white/10"
                  >
                    <Plus size={14} className="rotate-45" />
                  </button>
                </div>
              ))}
              
              {waterPresets.length < 8 && (
                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl focus-within:border-primary/50 transition-all">
                  <input
                    type="number"
                    value={newPreset}
                    onChange={(e) => setNewPreset(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPreset()}
                    placeholder="Value..."
                    className="w-20 pl-3 pr-1 py-2 bg-transparent text-xs text-white focus:outline-none placeholder:text-white/10"
                  />
                  <button
                    onClick={handleAddPreset}
                    disabled={!newPreset}
                    className="p-2 text-primary hover:bg-primary/10 transition-colors disabled:opacity-0"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>
            
            {waterPresets.length === 0 && (
              <p className="text-[10px] text-white/20 italic text-center py-2 bg-white/2 rounded-xl">
                Add presets to log water quickly from the main screen.
              </p>
            )}

            <p className="text-[8px] text-white/20 font-medium italic">
              Values like 100, 250, 500 work best. Your top {waterPresets.length} are visible on the dashboard.
            </p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection 
        id="notifications" 
        title="Notifications" 
        icon={Bell}
        isExpanded={expandedSections.notifications}
        onToggle={() => toggleSection('notifications')}
      >
        <div className="bg-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                notificationStatus === 'granted' && notificationsEnabled ? "bg-green-500/10 text-green-500" : "bg-white/5 text-white/40"
              )}>
                {notificationStatus === 'granted' && notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
              </div>
              <div>
                <p className="font-bold text-sm">Push Notifications</p>
                <p className="text-xs text-white/40 capitalize">
                  {notificationStatus === 'unsupported' ? "Not supported on this browser" : 
                   !notificationsEnabled ? "Disabled in settings" : notificationStatus}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => onNotificationsEnabledChange(!notificationsEnabled)}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  notificationsEnabled ? "bg-primary" : "bg-white/10"
                )}
              >
                <motion.div 
                  animate={{ x: notificationsEnabled ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </button>
              {notificationStatus === 'granted' ? (
                <CheckCircle2 className="text-green-500" size={20} />
              ) : (
                <AlertCircle className="text-white/20" size={20} />
              )}
            </div>
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

          {/* Water Reminders Sub-section */}
          <div className="pt-4 border-t border-white/5 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-bold text-sm">Water Reminders</p>
                <p className="text-[10px] text-white/40">Notify if you forget to log water</p>
              </div>
              <button
                onClick={() => onWaterReminderEnabledChange?.(!waterReminderEnabled)}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  waterReminderEnabled ? "bg-primary" : "bg-white/10"
                )}
              >
                <motion.div 
                  animate={{ x: waterReminderEnabled ? 24 : 4 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>

            {waterReminderEnabled && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-6 pt-2"
              >
                {/* Frequency & Times */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-6">
                  {/* Frequency */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Interval</label>
                      <span className="text-sm font-bold text-primary">Every {waterReminderInterval} hour{waterReminderInterval !== 1 ? 's' : ''}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="6"
                      step="1"
                      value={waterReminderInterval}
                      onChange={(e) => onWaterReminderIntervalChange?.(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">From</label>
                      <select
                        value={waterReminderStartHour}
                        onChange={(e) => onWaterReminderStartHourChange?.(parseInt(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-primary appearance-none"
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i} className="bg-background">
                            {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i-12} PM`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">To</label>
                      <select
                        value={waterReminderEndHour}
                        onChange={(e) => onWaterReminderEndHourChange?.(parseInt(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-primary appearance-none"
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <option key={i} value={i} className="bg-background">
                            {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i-12} PM`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {waterReminderStartHour !== undefined && waterReminderEndHour !== undefined && waterReminderStartHour >= waterReminderEndHour && (
                    <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center space-x-2">
                      <AlertCircle className="text-yellow-500 shrink-0" size={12} />
                      <p className="text-[9px] text-yellow-500/80">Reminders will only fire during the day.</p>
                    </div>
                  )}

                  {lastWaterReminder !== undefined && lastWaterReminder !== 0 && (
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center space-x-2">
                      <Clock size={12} className="text-blue-500 shrink-0" />
                      <p className="text-[9px] text-blue-500/80">
                        Last reminder sent at {new Date(lastWaterReminder!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
                      </p>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={() => onWaterReminderEnabledChange?.(false).then(() => onWaterReminderEnabledChange?.(true))}
                      className="text-[10px] text-primary/60 hover:text-primary font-bold uppercase tracking-widest flex items-center space-x-1"
                    >
                      <RefreshCw size={10} />
                      <span>Reset Reminder Timer</span>
                    </button>
                  </div>
                  
                  {lastWaterReminder === 0 && waterReminderEnabled && (
                    <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg flex items-center space-x-2">
                      <Sparkles size={12} className="text-primary shrink-0" />
                      <p className="text-[9px] text-primary/80">Reminder system is active and ready.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          <button
            onClick={handleTestNotification}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <Bell size={16} />
            <span>Send Test Notification</span>
          </button>
        </div>
      </CollapsibleSection>

      <CollapsibleSection 
        id="ai" 
        title="AI Integration" 
        icon={Brain}
        isExpanded={expandedSections.ai}
        onToggle={() => toggleSection('ai')}
      >
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
      </CollapsibleSection>

      <CollapsibleSection 
        id="data" 
        title="Data Management" 
        icon={Database}
        isExpanded={expandedSections.data}
        onToggle={() => toggleSection('data')}
      >
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
              <button
                onClick={() => downloadCSV('consistency')}
                className="py-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 border border-white/5"
              >
                <Download size={14} className="text-primary" />
                <span>Consistency</span>
              </button>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection 
        id="about" 
        title="About AllRound" 
        icon={Info}
        isExpanded={expandedSections.about}
        onToggle={() => toggleSection('about')}
      >
        <div className="bg-card p-6 rounded-2xl border border-white/5 space-y-4">
          <p className="text-sm text-white/60 leading-relaxed">
            Your ultimate wellness companion for fasting, hydration, and activity. 
            Now featuring an AI Coach, water reminders, and detailed consistency tracking to help you reach your goals.
          </p>
          <div className="pt-4 border-t border-white/5">
            <p className="text-xs text-white/20">Version 1.2.4</p>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
};
