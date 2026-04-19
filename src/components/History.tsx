import React, { FC, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Trash2, Calendar, Plus, X } from 'lucide-react';
import { FastRecord } from '../types';
import { formatDurationShort, formatTime, formatDate } from '../lib/utils';
import { format, subHours } from 'date-fns';

interface HistoryProps {
  history: FastRecord[];
  onDelete: (id: string) => void;
  onManualLog: (startTime: number, endTime: number, targetHours: number) => void;
}

export const History: FC<HistoryProps> = ({ history, onDelete, onManualLog }) => {
  const [isLogging, setIsLogging] = useState(false);
  const [startTime, setStartTime] = useState(format(subHours(new Date(), 16), "yyyy-MM-dd'T'HH:mm"));
  const [endTime, setEndTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [targetHours, setTargetHours] = useState(16);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const handleManualLog = (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (start >= end) {
      alert("Start time must be before end time");
      return;
    }
    onManualLog(start, end, targetHours);
    setIsLogging(false);
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
                <button onClick={() => setIsLogging(false)} className="text-white/40 hover:text-white">
                  <X size={24} />
                </button>
              </div>

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
                  className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 mt-4"
                >
                  Save Fast
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
        filteredHistory.map((record) => (
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
        ))
      )}
    </div>
  );
};
