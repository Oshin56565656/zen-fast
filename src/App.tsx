import { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer as TimerIcon, History as HistoryIcon, BarChart3, Settings as SettingsIcon, LogOut, Sparkles, PlusCircle, Zap } from 'lucide-react';
import { Timer } from './components/Timer';
import { History } from './components/History';
import { Stats } from './components/Stats';
import { Settings } from './components/Settings';
import { Auth } from './components/Auth';
import AICoach from './components/AICoach';
import LogActivity from './components/LogActivity';
import { useFasting } from './hooks/useFasting';
import { auth, signOut } from './firebase';
import { cn } from './lib/utils';

type Tab = 'timer' | 'history' | 'stats' | 'coach' | 'log' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('timer');
  const { 
    user,
    isAuthReady,
    state, 
    history, 
    meals,
    workouts,
    sleep,
    water,
    weights,
    startFast, 
    pauseFast, 
    resumeFast, 
    endFast, 
    resetToIdle, 
    deleteRecord,
    manualLogFast,
    setTargetHours,
    setTargetEndTime,
    logMeal,
    logWorkout,
    logSleep,
    logWater,
    logWeight,
    deleteMeal,
    deleteWorkout,
    deleteSleep,
    deleteWater,
    deleteWeight,
    setHeight,
    setWeight,
    setAge,
    setSex,
    setWaterGoal,
    setAccentColor,
    setNotificationsEnabled,
    refreshWeather,
    testNotification
  } = useFasting();

  useEffect(() => {
    if (state.accentColor) {
      document.documentElement.style.setProperty('--accent-color', state.accentColor);
    }
  }, [state.accentColor]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('fasttrack_insights');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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
        return <History history={history} onDelete={deleteRecord} onManualLog={manualLogFast} />;
      case 'stats':
        return <Stats history={history} sleep={sleep} water={water} weights={weights} workouts={workouts} waterGoal={state.waterGoal} />;
      case 'coach':
        return (
          <AICoach 
            history={history} 
            meals={meals} 
            workouts={workouts} 
            sleep={sleep}
            water={water}
            height={state.height}
            weight={state.weight}
            age={state.age}
            sex={state.sex}
          />
        );
      case 'log':
        return (
          <LogActivity 
            meals={meals} 
            workouts={workouts} 
            sleep={sleep}
            water={water}
            weights={weights}
            onLogMeal={logMeal} 
            onLogWorkout={logWorkout} 
            onLogSleep={logSleep}
            onLogWater={logWater}
            onLogWeight={logWeight}
            onDeleteMeal={deleteMeal}
            onDeleteWorkout={deleteWorkout}
            onDeleteSleep={deleteSleep}
            onDeleteWater={deleteWater}
            onDeleteWeight={deleteWeight}
          />
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <Settings 
              targetHours={state.targetHours} 
              onHoursChange={setTargetHours} 
              targetEndTime={state.targetEndTime}
              onTargetEndTimeChange={setTargetEndTime}
              height={state.height}
              weight={state.weight}
              age={state.age}
              sex={state.sex}
              onHeightChange={setHeight}
              onWeightChange={setWeight}
              onAgeChange={setAge}
              onSexChange={setSex}
              waterGoal={state.waterGoal}
              onWaterGoalChange={setWaterGoal}
              accentColor={state.accentColor}
              onAccentColorChange={setAccentColor}
              notificationsEnabled={state.notificationsEnabled}
              onNotificationsEnabledChange={setNotificationsEnabled}
              weatherData={state.weatherData}
              suggestedWaterGoal={state.suggestedWaterGoal}
              onRefreshWeather={refreshWeather}
              onTestNotification={testNotification}
              history={history}
              meals={meals}
              workouts={workouts}
              sleep={sleep}
            />
            <div className="px-6">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center space-x-2 bg-red-500/10 text-red-500 py-4 rounded-2xl font-bold hover:bg-red-500/20 transition-all active:scale-95"
              >
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative overflow-hidden">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <TimerIcon size={20} className="text-white fill-white/20" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">FastTrack <span className="text-primary">AI</span></h1>
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
          active={activeTab === 'coach'} 
          onClick={() => setActiveTab('coach')} 
          icon={<Sparkles size={24} />} 
          label="Coach" 
        />
        <NavButton 
          active={activeTab === 'log'} 
          onClick={() => setActiveTab('log')} 
          icon={<PlusCircle size={24} />} 
          label="Log" 
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
