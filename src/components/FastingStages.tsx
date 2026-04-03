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
          const isActive = index === currentStageIndex;
          const isUpcoming = index > currentStageIndex;
          const Icon = stage.icon;

          return (
            <motion.div
              key={stage.id}
              initial={false}
              animate={{
                opacity: isActive ? 1 : isUpcoming ? 0.4 : 0.6,
                scale: isActive ? 1 : 0.98,
              }}
              className={cn(
                "relative p-4 rounded-2xl border transition-all duration-500",
                isActive ? cn(stage.bgColor, stage.borderColor) : "bg-white/5 border-white/5",
                isCompleted && "border-green-500/20 bg-green-500/5"
              )}
            >
              <div className="flex items-start space-x-4">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  isActive ? stage.color : isCompleted ? "text-green-500" : "text-white/20",
                  isActive ? "bg-white/10" : "bg-white/5"
                )}>
                  <Icon size={20} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "font-bold text-sm transition-colors",
                      isActive ? "text-white" : isCompleted ? "text-green-500/80" : "text-white/40"
                    )}>
                      {stage.label}
                    </p>
                    <p className="text-[10px] font-mono text-white/20">
                      {stage.startHour}h+
                    </p>
                  </div>
                  
                  {isActive && (
                    <motion.p 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-xs text-white/60 mt-1 leading-relaxed"
                    >
                      {stage.description}
                    </motion.p>
                  )}

                  {isActive && (
                    <div className="mt-3 h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        className={cn("h-full", stage.color.replace('text', 'bg'))}
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${Math.min(((elapsedHours - stage.startHour) / (stage.endHour - stage.startHour)) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {isCompleted && (
                <div className="absolute top-2 right-2">
                  <ShieldCheck size={14} className="text-green-500/40" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
