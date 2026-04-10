import React, { FC } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { ShieldCheck } from 'lucide-react';
import { FASTING_STAGES } from '../constants/fastingStages';

interface FastingStagesProps {
  elapsedSeconds: number;
  isFasting: boolean;
}

export const FastingStages: FC<FastingStagesProps> = ({ elapsedSeconds, isFasting }) => {
  const elapsedHours = elapsedSeconds / 3600;
  
  const currentStageIndex = FASTING_STAGES.findIndex(
    stage => elapsedHours >= stage.startHour && elapsedHours < stage.endHour
  );

  if (!isFasting) return null;

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Biological Stages</h3>
        <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full">
          Live Analysis
        </span>
      </div>

      <div className="space-y-3">
        {FASTING_STAGES.map((stage, index) => {
          const isCompleted = elapsedHours >= stage.endHour;
          const isStarted = elapsedHours >= stage.startHour;
          const isActive = isStarted && !isCompleted;
          const Icon = stage.icon;
          
          // Calculate progress percentage
          let progress = 0;
          if (isCompleted) {
            progress = 100;
          } else if (isActive) {
            progress = ((elapsedHours - stage.startHour) / (stage.endHour - stage.startHour)) * 100;
          }

          return (
            <motion.div
              key={stage.id}
              initial={false}
              animate={{ 
                opacity: isStarted ? 1 : 0.4,
                scale: isActive ? 1.02 : 1
              }}
              className={cn(
                "relative p-4 rounded-2xl border transition-all duration-500",
                isActive ? cn(stage.bgColor, stage.borderColor) : "bg-white/5 border-transparent",
                isCompleted && "border-green-500/20 bg-green-500/5"
              )}
            >
              <div className="flex items-start space-x-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  isStarted ? stage.bgColor : "bg-white/5",
                  isStarted ? stage.color : "text-white/20"
                )}>
                  <Icon size={20} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "font-bold text-sm transition-colors",
                      isStarted ? "text-white" : "text-white/40"
                    )}>
                      {stage.label}
                    </p>
                    {isCompleted ? (
                      <ShieldCheck size={14} className="text-green-500" />
                    ) : (
                      <p className="text-[10px] font-mono text-white/20">
                        {stage.startHour}h+
                      </p>
                    )}
                  </div>
                  
                  <p className="text-xs text-white/60 mt-1 leading-relaxed">
                    {stage.description}
                  </p>

                  {isStarted && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">
                          {isCompleted ? 'Completed' : 'In Progress'}
                        </span>
                        <span className="text-[10px] font-mono text-white/40">
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full"
                          style={{ backgroundColor: stage.hex }}
                          initial={false}
                          animate={{ width: `${Math.min(progress, 100)}%` }}
                          transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
