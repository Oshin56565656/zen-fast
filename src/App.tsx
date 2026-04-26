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
  const [activeTab, setActiveTab] = useState<Tab>('log');
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
    setMuscularity,
    setAge,
    setSex,
    setWaterGoal,
    setWaterPresets,
    setAccentColor,
    setNotificationsEnabled,
    setWaterReminderEnabled,
    setWaterReminderInterval,
    setWaterReminderStartHour,
    setWaterReminderEndHour,
    lastWaterReminder,
    testNotification,
    aiInsights,
    saveAIInsights,
    parseWorkoutText,
    dailySummaries,
    saveDailySummary,
    firestoreError,
    updateMeal,
    updateWorkout,
    updateSleep,
    updateWater,
    updateWeight,
    moods,
    logMood,
    deleteMood,
    updateMood,
    supplements,
    supplementLogs,
    addSupplement,
    updateSupplement,
    deleteSupplement,
    logSupplementIntake,
    deleteSupplementLog,
    updateSupplementLog,
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
            meals={meals}
            onStart={startFast} 
            onPause={pauseFast} 
            onResume={resumeFast} 
            onEnd={endFast}
            onReset={resetToIdle}
          />
        );
      case 'history':
        return <History history={history} meals={meals} onDelete={deleteRecord} onManualLog={manualLogFast} />;
      case 'stats':
        return (
          <Stats 
            history={history} 
            meals={meals}
            sleep={sleep} 
            water={water} 
            weights={weights} 
            workouts={workouts} 
            moods={moods}
            waterGoal={state.waterGoal} 
            dailySummaries={dailySummaries}
          />
        );
      case 'coach':
        return (
            <AICoach 
              history={history} 
              meals={meals} 
              workouts={workouts} 
              sleep={sleep}
              water={water}
              moods={moods}
              height={state.height}
              weight={state.weight}
              muscularity={state.muscularity}
              age={state.age}
              sex={state.sex}
            waterGoal={state.waterGoal}
            saveDailySummary={saveDailySummary}
            aiInsights={aiInsights}
            saveAIInsights={saveAIInsights}
            supplements={supplements}
            supplementLogs={supplementLogs}
          />
        );
      case 'log':
        return (
          <LogActivity 
            history={history}
            meals={meals} 
            workouts={workouts} 
            sleep={sleep}
            water={water}
            weights={weights}
            supplements={supplements}
            supplementLogs={supplementLogs}
            moods={moods}
            waterGoal={state.waterGoal}
            waterPresets={state.waterPresets}
            onLogMeal={logMeal} 
            onLogWorkout={logWorkout} 
            onLogSleep={logSleep}
            onLogWater={logWater}
            onLogWeight={logWeight}
            onLogMood={logMood}
            onAddSupplement={addSupplement}
            onUpdateSupplement={updateSupplement}
            onDeleteSupplement={deleteSupplement}
            onLogSupplement={logSupplementIntake}
            onDeleteSupplementLog={deleteSupplementLog}
            onDeleteMeal={deleteMeal}
            onDeleteWorkout={deleteWorkout}
            onDeleteSleep={deleteSleep}
            onDeleteWater={deleteWater}
            onDeleteWeight={deleteWeight}
            onDeleteMood={deleteMood}
            onUpdateMeal={updateMeal}
            onUpdateWorkout={updateWorkout}
            onUpdateSleep={updateSleep}
            onUpdateWater={updateWater}
            onUpdateWeight={updateWeight}
            onUpdateSupplementLog={updateSupplementLog}
            onUpdateMood={updateMood}
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
              muscularity={state.muscularity}
              age={state.age}
              sex={state.sex}
              onHeightChange={setHeight}
              onWeightChange={setWeight}
              onMuscularityChange={setMuscularity}
              onAgeChange={setAge}
              onSexChange={setSex}
              waterGoal={state.waterGoal}
              onWaterGoalChange={setWaterGoal}
              waterPresets={state.waterPresets}
              onWaterPresetsChange={setWaterPresets}
              accentColor={state.accentColor}
              onAccentColorChange={setAccentColor}
              notificationsEnabled={state.notificationsEnabled}
              onNotificationsEnabledChange={setNotificationsEnabled}
              waterReminderEnabled={state.waterReminderEnabled}
              onWaterReminderEnabledChange={setWaterReminderEnabled}
              waterReminderInterval={state.waterReminderInterval}
              onWaterReminderIntervalChange={setWaterReminderInterval}
              waterReminderStartHour={state.waterReminderStartHour}
              onWaterReminderStartHourChange={setWaterReminderStartHour}
              waterReminderEndHour={state.waterReminderEndHour}
              onWaterReminderEndHourChange={setWaterReminderEndHour}
              lastWaterReminder={lastWaterReminder}
              onTestNotification={testNotification}
              history={history}
              meals={meals}
              workouts={workouts}
              sleep={sleep}
              dailySummaries={dailySummaries}
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
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-20 lg:w-64 bg-card/30 border-r border-white/5 h-screen sticky top-0 shrink-0 z-50">
        <div className="p-6 lg:p-8 flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <TimerIcon size={24} className="text-white fill-white/20" />
          </div>
          <h1 className="text-xl font-bold tracking-tight hidden lg:block whitespace-nowrap">AllRound <span className="text-primary">AI</span></h1>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <SidebarNavButton 
            active={activeTab === 'log'} 
            onClick={() => setActiveTab('log')} 
            icon={<PlusCircle size={22} />} 
            label="Log Activity" 
          />
          <SidebarNavButton 
            active={activeTab === 'timer'} 
            onClick={() => setActiveTab('timer')} 
            icon={<TimerIcon size={22} />} 
            label="Fasting Timer" 
          />
          <SidebarNavButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<HistoryIcon size={22} />} 
            label="History" 
          />
          <SidebarNavButton 
            active={activeTab === 'stats'} 
            onClick={() => setActiveTab('stats')} 
            icon={<BarChart3 size={22} />} 
            label="Insights & Stats" 
          />
          <SidebarNavButton 
            active={activeTab === 'coach'} 
            onClick={() => setActiveTab('coach')} 
            icon={<Sparkles size={22} />} 
            label="AI Health Coach" 
          />
          <SidebarNavButton 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
            icon={<SettingsIcon size={22} />} 
            label="Settings" 
          />
        </nav>

        <div className="p-4 border-t border-white/5">
           <button
            onClick={handleSignOut}
            className="w-full flex items-center lg:space-x-3 justify-center lg:justify-start px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all group"
          >
            <LogOut size={20} className="shrink-0" />
            <span className="text-sm font-bold hidden lg:block">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <div className="w-full max-w-md md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto flex flex-col h-full relative">
          {/* Header (Sticky behavior on mobile restored via container overflow) */}
          <header className="p-6 md:px-8 md:py-6 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2 md:hidden">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <TimerIcon size={20} className="text-white fill-white/20" />
              </div>
              <h1 className="text-xl font-bold tracking-tight">AllRound <span className="text-primary">AI</span></h1>
            </div>
            
            <div className="hidden md:block">
              <h2 className="text-lg font-bold capitalize">{activeTab.replace('-', ' ')}</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-bold">Health Dashboard</p>
            </div>

            {state.status === 'fasting' && (
              <div className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded-full uppercase tracking-widest animate-pulse">
                Fasting
              </div>
            )}
          </header>

          {/* Error Banner */}
          <AnimatePresence>
            {firestoreError && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-6 md:px-8 pb-4"
              >
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start space-x-3">
                  <div className="bg-red-500 rounded-full p-1 mt-0.5 shadow-lg shadow-red-500/20">
                    <Zap size={12} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-red-500">Connection Issue</p>
                    <p className="text-[10px] text-red-400/80 leading-tight mt-0.5">{firestoreError}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Content - Restoring overflow-y-auto for sticky header feel */}
          <main className="flex-1 overflow-y-auto pb-24 md:pb-8 md:px-4 no-scrollbar">
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

          {/* Mobile Bottom Navigation */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-white/5 px-6 py-4 flex items-center justify-between z-50">
            <NavButton 
              active={activeTab === 'log'} 
              onClick={() => setActiveTab('log')} 
              icon={<PlusCircle size={24} />} 
              label="Log" 
            />
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
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')} 
              icon={<SettingsIcon size={24} />} 
              label="Settings" 
            />
          </nav>
        </div>
      </div>
    </div>
  );
}

interface SidebarNavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}

function SidebarNavButton({ active, onClick, icon, label }: SidebarNavButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center lg:space-x-3 justify-center lg:justify-start px-4 py-3 rounded-xl transition-all relative overflow-hidden group",
        active 
          ? "bg-primary text-white shadow-lg shadow-primary/20" 
          : "text-white/40 hover:text-white/60 hover:bg-white/5"
      )}
    >
      <div className={cn("shrink-0 transition-transform group-hover:scale-110", active ? "scale-110" : "")}>
        {icon}
      </div>
      <span className="text-sm font-bold hidden lg:block whitespace-nowrap">{label}</span>
    </button>
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
        "flex flex-col items-center space-y-1 transition-all relative",
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
