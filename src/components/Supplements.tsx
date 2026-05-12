import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pill, Plus, Trash2, Edit2, CheckCircle2, Circle, Clock, Info, AlertCircle, X, Save, Calendar, Play, Pause } from 'lucide-react';
import { Supplement, SupplementLog } from '../types';
import { cn } from '../lib/utils';
import { format, isSameDay, startOfDay } from 'date-fns';

interface SupplementsProps {
  supplements: Supplement[];
  logs: SupplementLog[];
  onAdd: (s: Omit<Supplement, 'id' | 'createdAt'>) => void;
  onUpdate: (id: string, s: Partial<Supplement>) => void;
  onDelete: (id: string) => void;
  onLog: (supplementId: string, time: number, taken: boolean) => void;
  onDeleteLog: (id: string) => void;
}

export function Supplements({
  supplements,
  logs,
  onAdd,
  onUpdate,
  onDelete,
  onLog,
  onDeleteLog
}: SupplementsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showManager, setShowManager] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [preferredTime, setPreferredTime] = useState<'any' | 'morning' | 'evening' | 'with-meal' | 'before-bed'>('any');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [fiber, setFiber] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  const todayLogs = useMemo(() => {
    const today = startOfDay(new Date());
    return logs.filter(l => isSameDay(new Date(l.time), today));
  }, [logs]);

  const handleSave = () => {
    if (!name.trim()) return;

    const data = {
      name,
      dosage,
      frequency,
      preferredTime,
      reminderEnabled,
      reminderTime: reminderEnabled ? reminderTime : undefined,
      calories: calories ? Number(calories) : undefined,
      protein: protein ? Number(protein) : undefined,
      carbs: carbs ? Number(carbs) : undefined,
      fats: fats ? Number(fats) : undefined,
      fiber: fiber ? Number(fiber) : undefined,
      isPaused
    };

    if (editingId) {
      onUpdate(editingId, data);
      setEditingId(null);
    } else {
      onAdd(data);
    }

    resetForm();
    setIsAdding(false);
  };

  const resetForm = () => {
    setName('');
    setDosage('');
    setFrequency('daily');
    setPreferredTime('any');
    setReminderEnabled(false);
    setReminderTime('08:00');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFats('');
    setFiber('');
    setIsPaused(false);
  };

  const startEdit = (s: Supplement) => {
    setName(s.name);
    setDosage(s.dosage);
    setFrequency(s.frequency);
    setPreferredTime(s.preferredTime);
    setReminderEnabled(s.reminderEnabled);
    setReminderTime(s.reminderTime || '08:00');
    setCalories(s.calories?.toString() || '');
    setProtein(s.protein?.toString() || '');
    setCarbs(s.carbs?.toString() || '');
    setFats(s.fats?.toString() || '');
    setFiber(s.fiber?.toString() || '');
    setIsPaused(s.isPaused || false);
    setEditingId(s.id);
    setIsAdding(true);
  };

  const toggleSupplement = (supplementId: string) => {
    const existingLog = todayLogs.find(l => l.supplementId === supplementId);
    if (existingLog) {
      onDeleteLog(existingLog.id);
    } else {
      onLog(supplementId, Date.now(), true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Pill className="text-primary h-5 w-5" />
          <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest">Daily Supplements</h2>
        </div>
        <button 
          onClick={() => setShowManager(!showManager)}
          className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-all"
        >
          {showManager ? 'Back to Tracker' : 'Manage List'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!showManager ? (
          <motion.div 
            key="tracker"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 gap-2"
          >
            {supplements.length === 0 || supplements.every(s => s.isPaused) ? (
              <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-6 text-center">
                <Pill className="mx-auto h-8 w-8 text-white/10 mb-2" />
                <p className="text-xs text-white/40 mb-3">
                  {supplements.length === 0 ? "No supplements added yet" : "All supplements currently paused"}
                </p>
                <button 
                  onClick={() => setShowManager(true)}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  {supplements.length === 0 ? "Create your list →" : "Manage list →"}
                </button>
              </div>
            ) : (
              supplements
                .filter(s => !s.isPaused)
                .map(s => {
                const isTaken = todayLogs.some(l => l.supplementId === s.id);
                return (
                  <motion.button
                    key={s.id}
                    onClick={() => toggleSupplement(s.id)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                      isTaken 
                        ? "bg-primary/10 border-primary/30 text-primary" 
                        : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center space-x-3 text-left">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all",
                        isTaken ? "bg-primary border-primary" : "border-white/10"
                      )}>
                        {isTaken && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      <div>
                        <p className={cn("text-xs font-bold", isTaken && "text-primary")}>{s.name}</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-[10px] opacity-40">{s.dosage}</p>
                          {(s.calories || s.protein || s.carbs || s.fats) && (
                            <>
                              <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                              <p className="text-[9px] font-medium opacity-30 italic">
                                {[
                                  s.calories ? `${s.calories}kcal` : null,
                                  s.protein ? `${s.protein}g P` : null,
                                  s.fiber ? `${s.fiber}g Fib` : null
                                ].filter(Boolean).join(' • ')}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="flex items-center space-x-1 opacity-40">
                        <Clock size={10} />
                        <span className="text-[9px] font-medium uppercase truncate max-w-[80px]">
                          {s.preferredTime.replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
            {supplements.length > 0 && (
              <div className="mt-2 p-3 bg-white/5 rounded-2xl border border-white/5 flex items-start space-x-3">
                <Info size={14} className="text-primary shrink-0 mt-0.5" />
                <p className="text-[9px] text-white/40 leading-relaxed italic">
                  Vitamins labeled "with meal" are best taken as you eat. 
                  Consistency is key for optimal results.
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="manager"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {isAdding ? (
              <div className="bg-card p-4 rounded-3xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {editingId ? 'Edit Supplement' : 'New Supplement'}
                  </h3>
                  <button onClick={() => { setIsAdding(false); resetForm(); setEditingId(null); }} className="text-white/40 p-1">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/30 uppercase">Name</label>
                    <input 
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Creatine, Magnesium..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/30 uppercase">Dosage</label>
                    <input 
                      value={dosage}
                      onChange={e => setDosage(e.target.value)}
                      placeholder="e.g. 5g, 1 capsule..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/30 uppercase">Macros (Optional per Dosage)</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      <div className="space-y-1">
                        <label className="text-[8px] text-white/20 uppercase text-center block">Kcal</label>
                        <input 
                          type="number"
                          value={calories}
                          onChange={e => setCalories(e.target.value)}
                          placeholder="0"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-1 py-1.5 text-[10px] text-white text-center focus:border-primary outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-white/20 uppercase text-center block">P (g)</label>
                        <input 
                          type="number"
                          value={protein}
                          onChange={e => setProtein(e.target.value)}
                          placeholder="0"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-1 py-1.5 text-[10px] text-white text-center focus:border-primary outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-white/20 uppercase text-center block">C (g)</label>
                        <input 
                          type="number"
                          value={carbs}
                          onChange={e => setCarbs(e.target.value)}
                          placeholder="0"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-1 py-1.5 text-[10px] text-white text-center focus:border-primary outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-white/20 uppercase text-center block">F (g)</label>
                        <input 
                          type="number"
                          value={fats}
                          onChange={e => setFats(e.target.value)}
                          placeholder="0"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-1 py-1.5 text-[10px] text-white text-center focus:border-primary outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] text-white/20 uppercase text-center block">Fib (g)</label>
                        <input 
                          type="number"
                          value={fiber}
                          onChange={e => setFiber(e.target.value)}
                          placeholder="0"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-1 py-1.5 text-[10px] text-white text-center focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/30 uppercase">Frequency</label>
                      <select 
                        value={frequency}
                        onChange={e => setFrequency(e.target.value as any)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/30 uppercase">Best Time</label>
                      <select 
                        value={preferredTime}
                        onChange={e => setPreferredTime(e.target.value as any)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none"
                      >
                        <option value="any">Anytime</option>
                        <option value="morning">Morning</option>
                        <option value="with-meal">With Meal</option>
                        <option value="evening">Evening</option>
                        <option value="before-bed">Before Bed</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setIsPaused(!isPaused)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                        isPaused ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : "bg-white/5 border-white/10 text-white/40"
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        {isPaused ? <Play size={14} /> : <Pause size={14} />}
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {isPaused ? 'Resume Tracking' : 'Pause Tracking'}
                        </span>
                      </div>
                      <div className={cn("w-10 h-5 rounded-full relative transition-all", isPaused ? "bg-amber-500" : "bg-white/10")}>
                        <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", isPaused ? "left-6" : "left-1")} />
                      </div>
                    </button>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setReminderEnabled(!reminderEnabled)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                        reminderEnabled ? "bg-primary/10 border-primary/30 text-primary" : "bg-white/5 border-white/5 text-white/40"
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        <Clock size={14} />
                        <span className="text-xs font-bold uppercase tracking-wider">Reminders</span>
                      </div>
                      <div className={cn("w-10 h-5 rounded-full relative transition-all", reminderEnabled ? "bg-primary" : "bg-white/10")}>
                        <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", reminderEnabled ? "left-6" : "left-1")} />
                      </div>
                    </button>
                  </div>

                  {reminderEnabled && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="space-y-1"
                    >
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Time</label>
                      <input 
                        type="time"
                        value={reminderTime}
                        onChange={e => setReminderTime(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary outline-none"
                      />
                    </motion.div>
                  )}
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleSave}
                    className="w-full bg-primary text-white py-3 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 active:scale-95 transition-all"
                  >
                    <Save size={14} />
                    <span>{editingId ? 'Update Supplement' : 'Add to List'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button 
                  onClick={() => setIsAdding(true)}
                  className="w-full border border-dashed border-white/20 rounded-2xl p-4 flex items-center justify-center space-x-2 text-white/40 hover:text-white/60 hover:bg-white/5 transition-all"
                >
                  <Plus size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Add Supplement</span>
                </button>

                <div className="grid grid-cols-1 gap-2">
                  {supplements.map(s => (
                    <div key={s.id} className={cn(
                      "bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between transition-all",
                      s.isPaused && "opacity-50 grayscale-[0.5]"
                    )}>
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          s.isPaused ? "bg-amber-500/10 text-amber-500" : "bg-white/5 text-violet-500"
                        )}>
                          {s.isPaused ? <Pause size={18} /> : <Pill size={18} />}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="text-xs font-bold text-white">{s.name}</p>
                            {s.isPaused && (
                              <span className="text-[8px] font-black uppercase tracking-tighter bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded">
                                Paused
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-white/30">{s.dosage}</span>
                            <span className="w-1 h-1 rounded-full bg-white/10" />
                            <span className="text-[10px] text-white/30 uppercase tracking-widest">{s.frequency}</span>
                            {(s.calories || s.protein) && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                <span className="text-[9px] text-primary/50 font-bold italic truncate max-w-[80px]">
                                  {[
                                    s.calories ? `${s.calories}kcal` : null,
                                    s.protein ? `${s.protein}g P` : null,
                                    s.fiber ? `${s.fiber}g Fib` : null
                                  ].filter(Boolean).join(' • ')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button onClick={() => startEdit(s)} className="p-2 text-white/20 hover:text-primary transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => onDelete(s.id)} className="p-2 text-white/20 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
