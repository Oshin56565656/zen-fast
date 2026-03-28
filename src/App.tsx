import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer as TimerIcon, History as HistoryIcon, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import { Timer } from './components/Timer';
import { History } from './components/History';
import { Stats } from './components/Stats';
import { Settings } from './components/Settings';
import { useFasting } from './hooks/useFasting';
import { cn } from './lib/utils';

type Tab = 'timer' | 'history' | 'stats' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('timer');
  const { 
    state, 
    history, 
    startFast, 
    pauseFast, 
    resumeFast, 
    endFast, 
    resetToIdle, 
    deleteRecord,
    setMode 
  } = useFasting();

  const renderContent = () => {
    switch (activeTab) {
      case 'timer':
        return (
          <Timer 
            state={state} 
            onStart={startFast} 
            onPause={pauseFast} 
            onResume={resumeFast} 
            onEnd={endFast}
            onReset={resetToIdle}
          />
        );
      case 'history':
        return <History history={history} onDelete={deleteRecord} />;
      case 'stats':
        return <Stats history={history} />;
      case 'settings':
        return <Settings currentModeId={state.modeId} onModeChange={setMode} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative overflow-hidden">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <TimerIcon size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">FastTrack</h1>
        </div>
        {state.status === 'fasting' && (
          <div className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded-full uppercase tracking-widest animate-pulse">
            Fasting
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card/80 backdrop-blur-xl border-t border-white/5 px-6 py-4 flex items-center justify-between z-50">
        <NavButton 
          active={activeTab === 'timer'} 
          onClick={() => setActiveTab('timer')} 
          icon={<TimerIcon size={24} />} 
          label="Timer" 
        />
        <NavButton 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')} 
          icon={<HistoryIcon size={24} />} 
          label="History" 
        />
        <NavButton 
          active={activeTab === 'stats'} 
          onClick={() => setActiveTab('stats')} 
          icon={<BarChart3 size={24} />} 
          label="Stats" 
        />
        <NavButton 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')} 
          icon={<SettingsIcon size={24} />} 
          label="Settings" 
        />
      </nav>
    </div>
  );
}

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}

function NavButton({ active, onClick, icon, label }: NavButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center space-y-1 transition-all",
        active ? "text-primary scale-110" : "text-white/40 hover:text-white/60"
      )}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-indicator"
          className="w-1 h-1 bg-primary rounded-full absolute -bottom-1"
        />
      )}
    </button>
  );
}
