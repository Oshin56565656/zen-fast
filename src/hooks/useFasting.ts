import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { formatDurationShort } from '../lib/utils';
import { CurrentFastState, FastRecord, MealRecord, WorkoutRecord, SleepRecord, WaterRecord, WeightRecord, WorkoutType, WorkoutIntensity, DailySummary, AIInsightsSync, Supplement, SupplementLog } from '../types';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  User, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  Timestamp 
} from '../firebase';

const STORAGE_KEY_STATE = 'fasttrack_state';
const STORAGE_KEY_HISTORY = 'fasttrack_history';

export function useFasting() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [state, setState] = useState<CurrentFastState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_STATE);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved state:', e);
        }
      }
    }
    return {
      startTime: null,
      endTime: null,
      status: 'idle',
      targetHours: 16,
      targetEndTime: null,
      pausedAt: null,
      totalPausedTime: 0,
      waterGoal: 2000, // Default 2L
      accentColor: '#3b82f6', // Default blue
      notificationsEnabled: true,
      waterReminderEnabled: true,
      waterReminderInterval: 1,
      waterReminderStartHour: 0,
      waterReminderEndHour: 23,
    };
  });

  const [history, setHistory] = useState<FastRecord[]>([]);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [sleep, setSleep] = useState<SleepRecord[]>([]);
  const [water, setWater] = useState<WaterRecord[]>([]);
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [supplementLogs, setSupplementLogs] = useState<SupplementLog[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsightsSync | null>(null);
  const [hasNotifiedTarget, setHasNotifiedTarget] = useState(false);
  const [lastWaterReminder, setLastWaterReminder] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fasttrack_last_water_reminder');
      return saved ? parseInt(saved) : 0;
    }
    return 0;
  });

  // Track if we've already reminded for the current interval to prevent double-firing
  const isRemindingRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('fasttrack_last_water_reminder', lastWaterReminder.toString());
  }, [lastWaterReminder]);
  const [isWaterLoaded, setIsWaterLoaded] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const isEndingRef = useRef(false);

  // Apply theme color to CSS variable
  useEffect(() => {
    if (state.accentColor) {
      document.documentElement.style.setProperty('--accent-color', state.accentColor);
      // Update meta theme-color for mobile browser chrome
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', state.accentColor);
    }
  }, [state.accentColor]);

  const sendNotification = async (title: string, options?: NotificationOptions) => {
    try {
      if (!("Notification" in window)) {
        console.warn("Notifications not supported in this browser");
        return;
      }
      if (state.notificationsEnabled === false) {
        console.log("Notifications are disabled in app settings");
        return;
      }
      
      const permission = Notification.permission;
      if (permission === "granted") {
        // Try Service Worker registration first (required for Android Chrome)
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
              await registration.showNotification(title, {
                ...options,
                badge: 'https://cdn-icons-png.flaticon.com/192/3242/3242257.png',
                icon: options?.icon || 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
              });
              console.log("Notification sent via Service Worker");
              return;
            }
          } catch (swErr) {
            console.warn("SW notification failed, falling back to window.Notification:", swErr);
          }
        }
        
        // Fallback to standard Notification
        new Notification(title, options);
        console.log("Notification sent via window.Notification");
      } else {
        console.warn(`Notification skipped: permission is ${permission}`);
      }
    } catch (e) {
      console.error("Notification failed:", e);
    }
  };

  const requestPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.warn("Permission request failed:", e);
      }
    }
  };

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Sync state with Firestore
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const stateDocRef = doc(db, 'users', user.uid, 'settings', 'currentFast');
    
    // Ensure user document exists for security rules
    setDoc(userDocRef, { 
      email: user.email, 
      lastLogin: Timestamp.now(),
      role: 'client' // Default role
    }, { merge: true }).catch(err => handleFirestoreError(err, 'write', `users/${user.uid}`));

    const unsubscribe = onSnapshot(stateDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const newState = snapshot.data() as CurrentFastState;
        setState(newState);
        localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(newState));
      } else {
        // Initialize state in Firestore if it doesn't exist
        const localState = localStorage.getItem(STORAGE_KEY_STATE);
        const initialState = localState ? JSON.parse(localState) : {
          startTime: null,
          endTime: null,
          status: 'idle',
          targetHours: 16,
          pausedAt: null,
          totalPausedTime: 0
        };
        setDoc(stateDocRef, initialState).catch(err => handleFirestoreError(err, 'write', `users/${user.uid}/settings/currentFast`));
        setState(initialState);
      }
    }, (error) => {
      handleFirestoreError(error, 'get', `users/${user.uid}/settings/currentFast`);
    });

    return () => unsubscribe();
  }, [user]);

  // Sync history with Firestore
  useEffect(() => {
    if (!user) return;

    const historyRef = collection(db, 'users', user.uid, 'history');
    const q = query(historyRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: FastRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as FastRecord);
      });
      // Sort by startTime descending
      setHistory(records.sort((a, b) => b.startTime - a.startTime));

      // Migration from localStorage if history is empty in Firestore
      if (records.length === 0) {
        const localHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
        if (localHistory) {
          try {
            const parsedHistory = JSON.parse(localHistory) as FastRecord[];
            parsedHistory.forEach(async (record) => {
              const { id, ...data } = record;
              // Ensure createdAt exists for rules
              const migrationData = {
                ...data,
                createdAt: data.createdAt || Timestamp.now()
              };
              const docRef = id ? doc(historyRef, id) : doc(historyRef);
              await setDoc(docRef, migrationData).catch(err => 
                handleFirestoreError(err, 'write', `users/${user.uid}/history/${id || 'new'}`)
              );
            });
            localStorage.removeItem(STORAGE_KEY_HISTORY);
          } catch (e) {
            console.error('Migration failed:', e);
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, 'list', `users/${user.uid}/history`);
    });

    return () => unsubscribe();
  }, [user]);

  // Sync meals with Firestore
  useEffect(() => {
    if (!user) return;
    const mealsRef = collection(db, 'users', user.uid, 'meals');
    const q = query(mealsRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: MealRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as MealRecord);
      });
      setMeals(records.sort((a, b) => b.time - a.time));
    }, (error) => {
      handleFirestoreError(error, 'list', `users/${user.uid}/meals`);
    });
    return () => unsubscribe();
  }, [user]);

  // Sync workouts with Firestore
  useEffect(() => {
    if (!user) return;
    const workoutsRef = collection(db, 'users', user.uid, 'workouts');
    const q = query(workoutsRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: WorkoutRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as WorkoutRecord);
      });
      setWorkouts(records.sort((a, b) => b.startTime - a.startTime));
    }, (error) => {
      handleFirestoreError(error, 'list', `users/${user.uid}/workouts`);
    });
    return () => unsubscribe();
  }, [user]);

  // Sync sleep with Firestore
  useEffect(() => {
    if (!user) return;
    const sleepRef = collection(db, 'users', user.uid, 'sleep');
    const q = query(sleepRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: SleepRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as SleepRecord);
      });
      setSleep(records.sort((a, b) => b.wakeUpTime - a.wakeUpTime));
    }, (error) => {
      handleFirestoreError(error, 'list', `users/${user.uid}/sleep`);
    });
    return () => unsubscribe();
  }, [user]);

  // Sync water with Firestore
  useEffect(() => {
    if (!user) return;
    const waterRef = collection(db, 'users', user.uid, 'water');
    const q = query(waterRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: WaterRecord[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        records.push({ 
          id: doc.id, 
          amount: Number(data.amount) || 0,
          time: typeof data.time === 'number' ? data.time : (data.time?.toMillis?.() || Date.now())
        } as WaterRecord);
      });
      setWater(records.sort((a, b) => b.time - a.time));
      setIsWaterLoaded(true);
    }, (error) => {
      handleFirestoreError(error, 'list', `users/${user.uid}/water`);
    });
    return () => unsubscribe();
  }, [user]);

  // Sync weights with Firestore
  useEffect(() => {
    if (!user) return;
    const weightsRef = collection(db, 'users', user.uid, 'weights');
    const q = query(weightsRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: WeightRecord[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as WeightRecord);
      });
      setWeights(records.sort((a, b) => b.time - a.time));
    }, (error) => {
      handleFirestoreError(error, 'list', `users/${user.uid}/weights`);
    });

    return () => unsubscribe();
  }, [user]);

  // Sync daily summaries with Firestore
  useEffect(() => {
    if (!user) return;
    const summariesRef = collection(db, 'users', user.uid, 'dailySummaries');
    const q = query(summariesRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: DailySummary[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as DailySummary);
      });
      setDailySummaries(records.sort((a, b) => b.date.localeCompare(a.date)));
    }, (error) => {
      handleFirestoreError(error, 'list', `users/${user.uid}/dailySummaries`);
    });
    return () => unsubscribe();
  }, [user]);

  // Sync supplements with Firestore
  useEffect(() => {
    if (!user) return;
    const supplementsRef = collection(db, 'users', user.uid, 'supplements');
    const q = query(supplementsRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: Supplement[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as Supplement);
      });
      setSupplements(records.sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => {
      handleFirestoreError(error, 'list', `users/${user.uid}/supplements`);
    });
    return () => unsubscribe();
  }, [user]);

  // Sync supplement logs with Firestore
  useEffect(() => {
    if (!user) return;
    const logsRef = collection(db, 'users', user.uid, 'supplementLogs');
    // Limit to recent logs to keep performance good (e.g. last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const q = query(logsRef, where('time', '>=', thirtyDaysAgo));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records: SupplementLog[] = [];
      snapshot.forEach((doc) => {
        records.push({ id: doc.id, ...doc.data() } as SupplementLog);
      });
      setSupplementLogs(records.sort((a, b) => b.time - a.time));
    }, (error) => {
      handleFirestoreError(error, 'list', `users/${user.uid}/supplementLogs`);
    });
    return () => unsubscribe();
  }, [user]);

  // Sync AI Insights with Firestore
  useEffect(() => {
    if (!user) {
      setAiInsights(null);
      return;
    }
    const aiInsightsRef = doc(db, 'users', user.uid, 'settings', 'aiInsights');
    const unsubscribe = onSnapshot(aiInsightsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setAiInsights({
          insights: data.insights || [],
          calorieGuess: data.calorieGuess || null,
          caloriesBurned: data.caloriesBurned || null,
          lastRefreshed: data.lastRefreshed || null
        });
      }
    }, (error) => {
      handleFirestoreError(error, 'get', `users/${user.uid}/settings/aiInsights`);
    });
    return () => unsubscribe();
  }, [user]);

  const saveDailySummary = async (summary: Omit<DailySummary, 'id' | 'createdAt'>) => {
    if (!user) return;
    try {
      const summariesRef = collection(db, 'users', user.uid, 'dailySummaries');
      // Use date as ID for easy lookup/update
      await setDoc(doc(db, 'users', user.uid, 'dailySummaries', summary.date), {
        ...summary,
        createdAt: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/dailySummaries/${summary.date}`);
    }
  };

  const saveAIInsights = async (insightsData: AIInsightsSync) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'aiInsights'), {
        ...insightsData,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/settings/aiInsights`);
    }
  };
  const handleFirestoreError = (error: any, operationType: string, path: string) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    
    if (errInfo.error.includes('unavailable') || errInfo.error.includes('offline')) {
      setFirestoreError("Could not reach Firestore. Please check your internet connection or Firebase configuration.");
    }
    
    // We don't throw here to avoid crashing the whole app, 
    // but we log it clearly for the agent to see.
  };

  const cleanObj = (obj: any) => {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
  };

  const updateState = useCallback(async (updates: Partial<CurrentFastState>) => {
    if (!user) return;
    const stateDocRef = doc(db, 'users', user.uid, 'settings', 'currentFast');
    try {
      const newState = { ...state, ...updates };
      setState(newState);
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(newState));
      
      const cleanUpdates = cleanObj(updates);
      
      if (Object.keys(cleanUpdates).length > 0) {
        await updateDoc(stateDocRef, cleanUpdates);
      }
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}/settings/currentFast`);
    }
  }, [user, state]);

  const startFast = async (customStartTime?: number) => {
    console.log("Starting fast...");
    if ("vibrate" in navigator) navigator.vibrate(50);
    await requestPermission();
    
    const startTime = customStartTime || Date.now();
    
    // If we have a target end time, recalculate target hours based on the actual start time
    let updatedTargetHours = state.targetHours;
    if (state.targetEndTime) {
      const durationMs = state.targetEndTime - startTime;
      // If the target end time is in the past relative to start, it's invalid or for next day
      // But usually targetEndTime is set for "today/tomorrow" relative to when it was set.
      // We'll trust the timestamp but ensure it's at least 1h.
      updatedTargetHours = Math.max(1, durationMs / 3600000);
    }
    
    sendNotification("Fast Started!", {
      body: `Your ${formatDurationShort(updatedTargetHours * 3600)} fast has begun. Good luck!`,
      icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png"
    });
    
    updateState({
      startTime,
      endTime: null,
      status: 'fasting',
      pausedAt: null,
      totalPausedTime: 0,
      targetHours: updatedTargetHours
    });
  };

  const pauseFast = () => {
    if (state.status !== 'fasting' || state.pausedAt) return;
    if ("vibrate" in navigator) navigator.vibrate(30);
    sendNotification("Fast Paused", {
      body: "Your timer has been paused.",
      icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png"
    });
    updateState({ pausedAt: Date.now() });
  };

  const resumeFast = () => {
    if (state.status !== 'fasting' || !state.pausedAt) return;
    if ("vibrate" in navigator) navigator.vibrate(30);
    sendNotification("Fast Resumed", {
      body: "Your timer is running again.",
      icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png"
    });
    const pauseDuration = Date.now() - state.pausedAt;
    updateState({
      pausedAt: null,
      totalPausedTime: state.totalPausedTime + pauseDuration
    });
  };

  const endFast = useCallback(async () => {
    if (state.status !== 'fasting' || !state.startTime || !user || isEndingRef.current) return;
    isEndingRef.current = true;
    
    if ("vibrate" in navigator) navigator.vibrate([50, 30, 50]);
    
    const now = Date.now();
    const effectiveStartTime = state.startTime + state.totalPausedTime;
    const durationMs = now - effectiveStartTime;
    const durationSec = Math.floor(durationMs / 1000);
    
    const targetSec = state.targetHours * 3600;

    const newRecord = {
      startTime: state.startTime,
      endTime: now,
      duration: durationSec,
      targetDuration: targetSec,
      completed: durationSec >= targetSec,
      createdAt: Timestamp.now()
    };

    try {
      await addDoc(collection(db, 'users', user.uid, 'history'), newRecord);
      
      sendNotification("Fast Ended!", {
        body: `You fasted for ${Math.floor(durationSec / 3600)}h ${Math.floor((durationSec % 3600) / 60)}m. Time to refuel!`,
        icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png"
      });

      await updateState({
        startTime: null,
        endTime: now,
        status: 'idle',
        pausedAt: null,
        totalPausedTime: 0,
        targetEndTime: null // Clear specific end time once reached
      });
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/history`);
    } finally {
      isEndingRef.current = false;
    }
  }, [state.status, state.startTime, state.totalPausedTime, state.targetHours, user, updateState]);

  const resetToIdle = () => {
    updateState({
      startTime: null,
      endTime: null,
      status: 'idle',
      pausedAt: null,
      totalPausedTime: 0
    });
  };

  const deleteRecord = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'history', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/history/${id}`);
    }
  };

  const manualLogFast = async (startTime: number, endTime: number, targetHours: number) => {
    if (!user) return;
    const durationSec = Math.floor((endTime - startTime) / 1000);
    const targetSec = targetHours * 3600;

    const newRecord = {
      startTime,
      endTime,
      duration: durationSec,
      targetDuration: targetSec,
      completed: durationSec >= targetSec,
      createdAt: Timestamp.now()
    };

    try {
      await addDoc(collection(db, 'users', user.uid, 'history'), newRecord);
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/history`);
    }
  };

  const setTargetHours = (hours: number) => {
    updateState({ targetHours: hours, targetEndTime: null });
  };

  const setTargetEndTime = (time: number | null) => {
    if (time && state.startTime) {
      // Calculate hours based on current fast start time
      const durationMs = time - state.startTime;
      const hours = durationMs / 3600000;
      updateState({ targetEndTime: time, targetHours: hours });
    } else if (time) {
      // If not fasting yet, calculate from "now" as a preview/default
      const durationMs = time - Date.now();
      const hours = Math.max(1, durationMs / 3600000);
      updateState({ targetEndTime: time, targetHours: hours });
    } else {
      updateState({ targetEndTime: time });
    }
  };

  // Reset notification flag when fast ends or status changes
  useEffect(() => {
    if (state.status !== 'fasting') {
      setHasNotifiedTarget(false);
    }
  }, [state.status]);

  // Monitor fasting progress for target reached notification and auto-end
  useEffect(() => {
    if (state.status !== 'fasting' || !state.startTime) return;

    const checkTarget = () => {
      const now = Date.now();
      const effectiveStartTime = state.startTime! + state.totalPausedTime;
      const elapsedMs = now - effectiveStartTime;
      
      let isTargetReached = false;
      let targetLabel = "";

      if (state.targetEndTime) {
        // If specific end time is set, check against it
        isTargetReached = now >= state.targetEndTime;
        targetLabel = "your target time";
      } else {
        // Otherwise use duration
        const targetMs = state.targetHours * 3600 * 1000;
        isTargetReached = elapsedMs >= targetMs;
        targetLabel = `${state.targetHours}h`;
      }

      if (isTargetReached) {
        if (!hasNotifiedTarget) {
          sendNotification("Fast Goal Reached!", {
            body: `You've reached ${targetLabel}. Great job!`,
            icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png"
          });
          setHasNotifiedTarget(true);
        }
        
        // Auto-end if targetEndTime was explicitly set and reached
        // Added a check for isEndingRef to prevent double execution from interval
        if (state.targetEndTime && now >= state.targetEndTime && !isEndingRef.current) {
          endFast();
        }
      }
    };

    const interval = setInterval(checkTarget, 1000); // Check every second for precision
    checkTarget(); // Check immediately

    return () => clearInterval(interval);
  }, [state.status, state.startTime, state.totalPausedTime, state.targetHours, state.targetEndTime, hasNotifiedTarget, endFast]);

  // Water reminder logic
  useEffect(() => {
    if (!isAuthReady || !isWaterLoaded) return;

    const checkWater = async () => {
      if (!state.notificationsEnabled || !state.waterReminderEnabled || isRemindingRef.current) return;
      
      const now = new Date();
      const currentTimestamp = now.getTime();
      const hour = now.getHours();
      
      const startHour = state.waterReminderStartHour !== undefined ? state.waterReminderStartHour : 8;
      const endHour = state.waterReminderEndHour !== undefined ? state.waterReminderEndHour : 23;

      // Only remind between start and end hours (inclusive)
      if (hour < startHour || hour > endHour) {
        return;
      }

      // Calculate today's total water
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const todayTimestamp = startOfToday.getTime();
      
      const todayTotal = water
        .filter(w => w.time >= todayTimestamp)
        .reduce((acc, curr) => acc + curr.amount, 0);

      const goal = state.waterGoal || 2000;
      if (todayTotal >= goal) return;

      // Check last log time (ever)
      const lastLog = water.length > 0 ? Math.max(...water.map(w => w.time)) : 0;
      
      // Calculate interval in ms
      const intervalMs = Math.max(60000, (state.waterReminderInterval || 1) * 3600 * 1000); 

      const timeSinceLastReminder = currentTimestamp - lastWaterReminder;

      // We should remind if:
      // 1. It's been long enough since the last water log AND
      // 2. It's been long enough since the last reminder
      // AND we handle the "never logged" case by referencing today's start
      const effectiveLastActivity = lastLog < todayTimestamp ? todayTimestamp : lastLog;
      const activityGap = currentTimestamp - effectiveLastActivity;

      if (activityGap >= intervalMs && timeSinceLastReminder >= intervalMs) {
        isRemindingRef.current = true;
        try {
          await sendNotification("Stay Hydrated! 💧", {
            body: `It's been over ${state.waterReminderInterval || 1} hour${state.waterReminderInterval !== 1 ? 's' : ''} since your last drink. You've had ${todayTotal}ml today!`,
            icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png",
            silent: false,
            tag: 'hydration-reminder'
          } as any);
          setLastWaterReminder(Date.now());
        } catch (e) {
          console.error("Hydration reminder primary path failed:", e);
        } finally {
          setTimeout(() => { isRemindingRef.current = false; }, 5000); // Small cooldown
        }
      }
    };

    const interval = setInterval(checkWater, 60000); // Check every minute for precision
    checkWater(); // Check immediately

    return () => clearInterval(interval);
  }, [
    water, 
    state.waterGoal, 
    state.notificationsEnabled, 
    state.waterReminderEnabled, 
    state.waterReminderInterval, 
    state.waterReminderStartHour, 
    state.waterReminderEndHour, 
    lastWaterReminder, 
    isAuthReady, 
    isWaterLoaded
  ]);

  const logMeal = async (time: number, scale: 'light' | 'normal' | 'large', description?: string, barcode?: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'meals'), {
        time,
        scale,
        description: description || '',
        barcode: barcode || '',
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/meals`);
    }
  };

  const logWorkout = async (
    startTime: number, 
    endTime: number, 
    intensity: WorkoutIntensity, 
    type: WorkoutType,
    description?: string,
    calorieBurn?: number,
    parsedExercises?: string[]
  ) => {
    if (!user) return;
    const duration = Math.floor((endTime - startTime) / (1000 * 60));
    try {
      await addDoc(collection(db, 'users', user.uid, 'workouts'), {
        startTime,
        endTime,
        duration,
        intensity,
        type,
        description: description || '',
        calorieBurn: calorieBurn || 0,
        parsedExercises: parsedExercises || [],
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/workouts`);
    }
  };

  const parseWorkoutText = async (text: string) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || localStorage.getItem('FT_GEMINI_API_KEY');
      if (!apiKey) throw new Error('Gemini API key is required for parsing');

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Parse the following workout text and extract structured information. 
        Identify the exercise names, the total duration in minutes (look for patterns like "30m" at the end), 
        and estimate the total calories burned based on the volume (sets, reps, weights) and duration.
        
        Workout Text:
        ${text}
        
        Response Format:
        JSON object with fields:
        "duration": number (minutes),
        "intensity": "low" | "moderate" | "high",
        "type": "strength" | "cardio" | "hiit" | ... (select best fit),
        "calorieBurn": number,
        "exercises": string[] (just the names),
        "startTime": string (ISO format if found, otherwise null)
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              duration: { type: Type.NUMBER },
              intensity: { type: Type.STRING, enum: ["low", "moderate", "high"] },
              type: { type: Type.STRING },
              calorieBurn: { type: Type.NUMBER },
              exercises: { type: Type.ARRAY, items: { type: Type.STRING } },
              startTime: { type: Type.STRING, nullable: true }
            },
            required: ["duration", "intensity", "type", "calorieBurn", "exercises"]
          }
        }
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('Failed to parse workout text:', error);
      throw error;
    }
  };

  const deleteMeal = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'meals', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/meals/${id}`);
    }
  };

  const updateMeal = async (id: string, updates: Partial<MealRecord>) => {
    if (!user) return;
    try {
      const mealRef = doc(db, 'users', user.uid, 'meals', id);
      await updateDoc(mealRef, updates);
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}/meals/${id}`);
    }
  };

  const deleteWorkout = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'workouts', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/workouts/${id}`);
    }
  };

  const updateWorkout = async (id: string, updates: Partial<WorkoutRecord>) => {
    if (!user) return;
    try {
      const workoutRef = doc(db, 'users', user.uid, 'workouts', id);
      const data = { ...updates };
      if (updates.startTime && updates.endTime) {
        data.duration = Math.floor((updates.endTime - updates.startTime) / (1000 * 60));
      } else if (updates.startTime || updates.endTime) {
        // We'd need current values if only one is updated, but simpler to provide both or calculate if both present
        // Handle this in the component side or fetch doc here. 
        // For simplicity, let's assume component sends what's needed.
      }
      await updateDoc(workoutRef, data);
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}/workouts/${id}`);
    }
  };

  const logSleep = async (bedtime: number, wakeUpTime: number, quality: 'poor' | 'fair' | 'good' | 'excellent') => {
    if (!user) return;
    const duration = (wakeUpTime - bedtime) / (1000 * 60 * 60);
    try {
      await addDoc(collection(db, 'users', user.uid, 'sleep'), {
        bedtime,
        wakeUpTime,
        duration,
        quality,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/sleep`);
    }
  };

  const deleteSleep = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'sleep', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/sleep/${id}`);
    }
  };

  const updateSleep = async (id: string, updates: Partial<SleepRecord>) => {
    if (!user) return;
    try {
      const sleepRef = doc(db, 'users', user.uid, 'sleep', id);
      const data = { ...updates };
      if (updates.bedtime && updates.wakeUpTime) {
        data.duration = (updates.wakeUpTime - updates.bedtime) / (1000 * 60 * 60);
      }
      await updateDoc(sleepRef, data);
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}/sleep/${id}`);
    }
  };

  const logWater = async (time: number, amount: number) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'water'), {
        time,
        amount,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/water`);
    }
  };

  const updateWater = async (id: string, updates: Partial<WaterRecord>) => {
    if (!user) return;
    try {
      const waterRef = doc(db, 'users', user.uid, 'water', id);
      await updateDoc(waterRef, updates);
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}/water/${id}`);
    }
  };

  const deleteWater = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'water', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/water/${id}`);
    }
  };

  const logWeight = async (time: number, weight: number, note?: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'weights'), {
        time,
        weight,
        note: note || '',
        createdAt: Timestamp.now()
      });
      // Also update current weight in settings
      updateState({ weight });
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/weights`);
    }
  };

  const updateWeight = async (id: string, updates: Partial<WeightRecord>) => {
    if (!user) return;
    try {
      const weightRef = doc(db, 'users', user.uid, 'weights', id);
      await updateDoc(weightRef, updates);
      if (updates.weight) {
        updateState({ weight: updates.weight });
      }
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}/weights/${id}`);
    }
  };

  const deleteWeight = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'weights', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/weights/${id}`);
    }
  };

  const addSupplement = async (supplement: Omit<Supplement, 'id' | 'createdAt'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'supplements'), {
        ...cleanObj(supplement),
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/supplements`);
    }
  };

  const updateSupplement = async (id: string, updates: Partial<Supplement>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'supplements', id), cleanObj(updates));
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}/supplements/${id}`);
    }
  };

  const deleteSupplement = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'supplements', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/supplements/${id}`);
    }
  };

  const logSupplementIntake = async (supplementId: string, time: number, taken: boolean) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'supplementLogs'), {
        supplementId,
        time,
        taken,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/supplementLogs`);
    }
  };

  const deleteSupplementLog = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'supplementLogs', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/supplementLogs/${id}`);
    }
  };

  const updateSupplementLog = async (id: string, updates: Partial<SupplementLog>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'supplementLogs', id), cleanObj(updates));
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}/supplementLogs/${id}`);
    }
  };

  const testNotification = async () => {
    await requestPermission();
    await sendNotification("Test Notification!", {
      body: "If you see this, notifications are working correctly.",
      icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png"
    });
    // Add a small alert for feedback on mobile
    alert("Test notification triggered! If you don't see it, please check your Android notification settings for Chrome.");
  };

  // Weather and Hydration Logic removed

  // Weather is only refreshed manually via refreshWeather button as requested

  return {
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
    updateMeal,
    updateWorkout,
    updateSleep,
    updateWater,
    updateWeight,
    parseWorkoutText,
    setHeight: (height: number) => updateState({ height }),
    setWeight: (weight: number) => updateState({ weight }),
    setAge: (age: number) => updateState({ age }),
    setSex: (sex: 'male' | 'female' | 'other') => updateState({ sex }),
    setWaterGoal: (goal: number) => updateState({ waterGoal: goal }),
    setWaterPresets: (presets: number[]) => updateState({ waterPresets: presets }),
    setAccentColor: (color: string) => updateState({ accentColor: color }),
    setNotificationsEnabled: (enabled: boolean) => {
      if (enabled) requestPermission();
      return updateState({ notificationsEnabled: enabled });
    },
    setWaterReminderEnabled: (enabled: boolean) => {
      if (enabled) {
        requestPermission();
        setLastWaterReminder(0); // Reset last reminder time to enable immediate notifications if needed
      }
      return updateState({ waterReminderEnabled: enabled });
    },
    setWaterReminderInterval: (interval: number) => updateState({ waterReminderInterval: interval }),
    setWaterReminderStartHour: (hour: number) => updateState({ waterReminderStartHour: hour }),
    setWaterReminderEndHour: (hour: number) => updateState({ waterReminderEndHour: hour }),
    lastWaterReminder,
    setLastWaterReminder,
    testNotification,
    aiInsights,
    saveAIInsights,
    dailySummaries,
    saveDailySummary,
    supplements,
    supplementLogs,
    addSupplement,
    updateSupplement,
    deleteSupplement,
    logSupplementIntake,
    deleteSupplementLog,
    updateSupplementLog,
    firestoreError
  };
}
