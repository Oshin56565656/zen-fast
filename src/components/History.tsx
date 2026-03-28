import React, { FC } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Trash2, Calendar } from 'lucide-react';
import { FastRecord } from '../types';
import { formatDurationShort } from '../lib/utils';
import { format } from 'date-fns';

interface HistoryProps {
  history: FastRecord[];
  onDelete: (id: string) => void;
}

export const History: FC<HistoryProps> = ({ history, onDelete }) => {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/20">
        <Calendar size={64} strokeWidth={1} />
        <p className="mt-4 font-medium">No fasting history yet</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold mb-6">Fasting History</h2>
      {history.map((record) => (
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
              <p className="font-bold">{record.modeName} Fast</p>
              <p className="text-xs text-white/40">
                {format(record.startTime, 'MMM d, h:mm a')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="font-mono font-bold">{formatDurationShort(record.duration)}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-tighter">
                Goal: {record.targetDuration / 3600}h
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
  );
};
