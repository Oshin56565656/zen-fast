import { FC, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Undo2, X } from 'lucide-react';
import { UndoItem } from '../types';

interface UndoPopupProps {
  undoItem: UndoItem | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export const UndoPopup: FC<UndoPopupProps> = ({ undoItem, onUndo, onDismiss }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!undoItem) return;

    setProgress(100);
    const duration = 6000; // 6 seconds
    const intervalTime = 50; // every 50ms (responsive bar)
    const step = (intervalTime / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [undoItem]);

  return (
    <AnimatePresence>
      {undoItem && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm"
          id="undo-toast-container"
        >
          <div className="bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between space-x-3">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-white/35 uppercase tracking-widest font-black font-sans">Action Deleted</p>
                <p className="text-xs font-semibold text-white truncate mt-1">{undoItem.message}</p>
              </div>
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  id="undo-toast-btn"
                  onClick={onUndo}
                  className="flex items-center space-x-1 bg-primary hover:bg-primary/95 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 shadow-md shadow-primary/20"
                >
                  <Undo2 size={12} />
                  <span>Undo</span>
                </button>
                <button
                  id="undo-dismiss-btn"
                  onClick={onDismiss}
                  className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            {/* Visual countdown progress bar */}
            <div className="w-full h-1 bg-white/5">
              <div 
                className="h-full bg-primary transition-all duration-75 ease-linear" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
