import React, { FC, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Trash2, Calendar, Plus, X, Utensils } from 'lucide-react';
import { FastRecord, MealRecord } from '../types';
import { formatDurationShort, formatTime, formatDate } from '../lib/utils';
import { format, subHours, differenceInHours } from 'date-fns';

interface HistoryProps {
  history: FastRecord[];
  meals: MealRecord[];
  onDelete: (id: string) => void;
  onManualLog: (startTime: number, endTime: number, targetHours: number) => void;
}

export const History: FC<HistoryProps> = ({ history, meals, onDelete, onManualLog }) => {
  const [isLogging, setIsLogging] = useState(false);
  const [startTime, setStartTime] = useState(format(subHours(new Date(), 16), "yyyy-MM-dd'T'HH:mm"));
  const [endTime, setEndTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [targetHours, setTargetHours] = useState(16);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [meal1Id, setMeal1Id] = useState<string>('');
  const [meal2Id, setMeal2Id] = useState<string>('');

  const sortedMeals = [...meals].sort((a, b) => b.time - a.time);

  const selectedMeal1 = meals.find(m => m.id === meal1Id);
  const selectedMeal2 = meals.find(m => m.id === meal2Id);

  const updateFastingFromMeals = (id1: string, id2: string) => {
    if (!id1 || !id2) return;
    const m1 = meals.find(m => m.id === id1);
    const m2 = meals.find(m => m.id === id2);
    if (!m1 || !m2 || m1.id === m2.id) return;

    // Sort chronologically
    const [earlier, later] = [m1, m2].sort((a, b) => a.time - b.time);
    
    setStartTime(format(new Date(earlier.time), "yyyy-MM-dd'T'HH:mm"));
    setEndTime(format(new Date(later.time), "yyyy-MM-dd'T'HH:mm"));
    
    const hours = differenceInHours(new Date(later.time), new Date(earlier.time));
    if (hours > 0 && hours <= 48) {
      setTargetHours(hours);
    } else if (hours > 48) {
      setTargetHours(48);
    } else {
      setTargetHours(16);
    }
  };

  const closeLogging = () => {
    setIsLogging(false);
    setMeal1Id('');
    setMeal2Id('');
  };

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (start >= end) {
      alert("Start time must be before end time");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onManualLog(start, end, targetHours);
      closeLogging();
    } catch (error) {
      console.error("Failed to log fast manual:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredHistory = selectedDate 
    ? history.filter(record => format(new Date(record.startTime), 'yyyy-MM-dd') === selectedDate)
    : history.slice(0, 15);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Fasting History</h2>
          <button
            onClick={() => setIsLogging(true)}
            className="flex items-center space-x-2 bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-full text-sm font-bold transition-all"
          >
            <Plus size={16} />
            <span>Log Fast</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
          <Calendar size={16} className="text-white/40" />
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm text-white focus:outline-none w-full"
          />
          {selectedDate && (
            <button onClick={() => setSelectedDate('')} className="text-white/40 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {!selectedDate && history.length > 15 && (
        <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold text-center mb-2">
          Showing last 15 records • Use filter to see more
        </p>
      )}

      <AnimatePresence>
        {isLogging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card w-full max-w-sm rounded-3xl border border-white/10 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Manual Log</h3>
                <button onClick={closeLogging} className="text-white/40 hover:text-white">
                   <X size={24} />
                </button>
              </div>

              {meals.length >= 2 ? (
                <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-2 text-primary font-bold">
                    <Utensils size={18} />
                    <span className="text-xs uppercase tracking-wider">Auto-fill from Selected Meals</span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed font-sans">
                    Select any two meals. We will automatically calculate and fill the fasting interval between them.
                  </p>
                  <div className="grid grid-cols-1 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[9px] text-white/30 uppercase font-black tracking-widest block font-sans">First Meal</label>
                      <select
                        value={meal1Id}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMeal1Id(val);
                          updateFastingFromMeals(val, meal2Id);
                        }}
                        className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                      >
                        <option value="" className="text-white/40 bg-neutral-900">Select first meal...</option>
                        {sortedMeals.map((m) => (
                          <option key={m.id} value={m.id} className="bg-neutral-900">
                            {m.description || `${m.scale.toUpperCase()} Meal`} ({formatTime(m.time)} - {formatDate(m.time)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-white/30 uppercase font-black tracking-widest block font-sans">Second Meal</label>
                      <select
                        value={meal2Id}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMeal2Id(val);
                          updateFastingFromMeals(meal1Id, val);
                        }}
                        className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-colors cursor-pointer"
                      >
                        <option value="" className="text-white/40 bg-neutral-900">Select second meal...</option>
                        {sortedMeals.map((m) => (
                          <option key={m.id} value={m.id} className="bg-neutral-900">
                            {m.description || `${m.scale.toUpperCase()} Meal`} ({formatTime(m.time)} - {formatDate(m.time)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedMeal1 && selectedMeal2 && selectedMeal1.id !== selectedMeal2.id && (
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-medium text-primary">
                      <span>Calculated Gap:</span>
                      <span className="font-bold bg-primary/10 px-2 py-0.5 rounded">
                        {(() => {
                          const [earlier, later] = [selectedMeal1, selectedMeal2].sort((a, b) => a.time - b.time);
                          return differenceInHours(new Date(later.time), new Date(earlier.time));
                        })()}h fast
                      </span>
                    </div>
                  )}
                </div>
              ) : meals.length === 1 ? (
                <div className="mb-6 p-4 bg-white/5 border border-dashed border-white/10 rounded-2xl text-center">
                  <p className="text-[10px] text-white/45 font-sans">You need to log at least 2 meals to use the automatic fast calculator.</p>
                </div>
              ) : null}

              <form onSubmit={handleManualLog} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Start Time</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase font-bold tracking-wider">End Time</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase font-bold tracking-wider">Target Hours</label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="1"
                      max="48"
                      value={targetHours}
                      onChange={(e) => setTargetHours(parseInt(e.target.value))}
                      className="flex-1 accent-primary"
                    />
                    <span className="font-mono font-bold w-16 text-right whitespace-nowrap">{formatDurationShort(targetHours * 3600)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 mt-4 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Fast'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {filteredHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/20">
          <Calendar size={64} strokeWidth={1} />
          <p className="mt-4 font-medium">{selectedDate ? "No history for this date" : "No fasting history yet"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHistory.map((record) => (
          <motion.div
            key={record.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-4 rounded-2xl border border-white/5 flex items-center justify-between group"
          >
            <div className="flex items-center space-x-4">
              <div className={record.completed ? "text-accent" : "text-white/20"}>
                {record.completed ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
              </div>
              <div>
                <p className="font-bold">Fast</p>
                <p className="text-xs text-white/40">
                  {formatDate(record.startTime)} • {formatTime(record.startTime)} - {formatTime(record.endTime)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-mono font-bold">{formatDurationShort(record.duration)}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-tighter">
                  Goal: {formatDurationShort(record.targetDuration)}
                </p>
              </div>
              <button
                onClick={() => onDelete(record.id)}
                className="text-white/10 hover:text-red-500 transition-colors p-2"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
      )}
    </div>
  );
};
