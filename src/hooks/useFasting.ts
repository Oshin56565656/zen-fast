import { useState, useEffect, useCallback, useRef } from 'react';
import { CurrentFastState, FastRecord, MealRecord, WorkoutRecord, SleepRecord, WaterRecord, WeightRecord, WorkoutType, WorkoutIntensity, DailySummary } from '../types';
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
      weatherData: undefined,
      suggestedWaterGoal: 2000
    };
  });

  const [history, setHistory] = useState<FastRecord[]>([]);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [sleep, setSleep] = useState<SleepRecord[]>([]);
  const [water, setWater] = useState<WaterRecord[]>([]);
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [hasNotifiedTarget, setHasNotifiedTarget] = useState(false);
  const [lastWaterReminder, setLastWaterReminder] = useState<number>(Date.now());
  const [isWaterLoaded, setIsWaterLoaded] = useState(false);
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
      if (!("Notification" in window)) return;
      if (state.notificationsEnabled === false) return;
      
      if (Notification.permission === "granted") {
        // Try Service Worker first (required for Android Chrome)
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          if (registration) {
            registration.showNotification(title, options);
            return;
          }
        }
        // Fallback to standard Notification
        new Notification(title, options);
      }
    } catch (e) {
      console.warn("Notification failed:", e);
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

  const saveDailySummary = async (summary: Omit<DailySummary, 'id' | 'createdAt'>) => {
    if (!user) return;
    try {
      const summariesRef = collection(db, 'users', user.uid, 'dailySummaries');
      const q = query(summariesRef, where('date', '==', summary.date));
      const snapshot = await getDoc(doc(summariesRef, summary.date)).catch(() => null);
      
      // Use date as ID for easy lookup/update
      await setDoc(doc(db, 'users', user.uid, 'dailySummaries', summary.date), {
        ...summary,
        createdAt: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/dailySummaries/${summary.date}`);
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
    // We don't throw here to avoid crashing the whole app, 
    // but we log it clearly for the agent to see.
  };

  const updateState = useCallback(async (updates: Partial<CurrentFastState>) => {
    if (!user) return;
    const stateDocRef = doc(db, 'users', user.uid, 'settings', 'currentFast');
    try {
      const newState = { ...state, ...updates };
      setState(newState);
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(newState));
      
      // Filter out undefined values for Firestore
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, v]) => v !== undefined)
      );
      
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
    
    sendNotification("Fast Started!", {
      body: `Your ${state.targetHours}h fast has begun. Good luck!`,
      icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png"
    });
    
    updateState({
      startTime,
      endTime: null,
      status: 'fasting',
      pausedAt: null,
      totalPausedTime: 0
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
      const hours = Math.round(durationMs / 3600000);
      updateState({ targetEndTime: time, targetHours: hours });
    } else if (time) {
      // If not fasting yet, calculate from "now" as a preview/default
      const durationMs = time - Date.now();
      const hours = Math.max(1, Math.round(durationMs / 3600000));
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
        if (state.targetEndTime && now >= state.targetEndTime) {
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

    const checkWater = () => {
      const now = new Date();
      const hour = now.getHours();
      
      // Only remind between 8 AM and 10 PM
      if (hour < 8 || hour > 22) return;

      // Calculate today's total water
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTotal = water
        .filter(w => w.time >= today.getTime())
        .reduce((acc, curr) => acc + curr.amount, 0);

      const goal = state.waterGoal || 2000;
      if (todayTotal >= goal) return;

      // Check last log time
      const lastLog = water.length > 0 ? Math.max(...water.map(w => w.time)) : 0;
      const timeSinceLastLog = Date.now() - lastLog;
      const timeSinceLastReminder = Date.now() - lastWaterReminder;

      // Remind if no log for 3 hours AND no reminder for 3 hours
      if (timeSinceLastLog > 3 * 3600 * 1000 && timeSinceLastReminder > 3 * 3600 * 1000) {
        sendNotification("Time to Hydrate!", {
          body: `You've drank ${todayTotal}ml today. Aim for ${goal}ml!`,
          icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png"
        });
        setLastWaterReminder(Date.now());
      }
    };

    const interval = setInterval(checkWater, 3600000); // Check every hour
    checkWater(); // Check immediately

    return () => clearInterval(interval);
  }, [water, state.waterGoal, lastWaterReminder, isAuthReady, isWaterLoaded]);

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
    type: WorkoutType
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
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/workouts`);
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

  const deleteWorkout = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'workouts', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/workouts/${id}`);
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

  const deleteWeight = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'weights', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', `users/${user.uid}/weights/${id}`);
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

  // Weather and Hydration Logic
  const refreshWeather = useCallback(async () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        // Fetch Weather
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
        );
        const weatherData = await weatherRes.json();
        
        // Fetch City Name (Reverse Geocoding)
        let city = null;
        try {
          // Try Nominatim first
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            city = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.suburb || geoData.address.county;
          }
          
          // Fallback to BigDataCloud if Nominatim fails
          if (!city) {
            const bdcRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            if (bdcRes.ok) {
              const bdcData = await bdcRes.json();
              city = bdcData.city || bdcData.locality || bdcData.principalSubdivision;
            }
          }
        } catch (e) {
          console.warn('Reverse geocoding failed:', e);
        }

        if (weatherData.current_weather) {
          const temp = weatherData.current_weather.temperature;
          const code = weatherData.current_weather.weathercode;
          
          const conditionMap: Record<number, string> = {
            0: 'Clear',
            1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Depositing Rime Fog',
            51: 'Light Drizzle', 53: 'Moderate Drizzle', 55: 'Dense Drizzle',
            61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
            71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow',
            80: 'Slight Rain Showers', 81: 'Moderate Rain Showers', 82: 'Violent Rain Showers',
            95: 'Thunderstorm',
          };
          
          const condition = conditionMap[code] || 'Unknown';
          
          // Calculate suggested water goal with more factors
          // Base: 2000ml for women/other, 2500ml for men
          let suggested = state.sex === 'male' ? 2500 : 2000;
          
          // Age adjustment (slight increase for younger, decrease for elderly)
          if (state.age) {
            if (state.age < 30) suggested += 200;
            if (state.age > 60) suggested -= 200;
          }

          // Weather adjustment: +250ml for every 5 degrees above 25°C
          if (temp > 25) {
            suggested += Math.floor((temp - 25) / 5) * 250;
          } else if (temp < 10) {
            suggested -= 250;
          }

          // Workout adjustment: +500ml for high, +250ml for moderate today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todayWorkouts = workouts.filter(w => w.startTime >= today.getTime());
          todayWorkouts.forEach(w => {
            if (w.intensity === 'high') suggested += 500;
            else if (w.intensity === 'moderate') suggested += 250;
          });

          // Ensure minimum 1500ml
          suggested = Math.max(1500, suggested);

          updateState({
            weatherData: {
              ...state.weatherData,
              temp,
              condition,
              city: city || state.weatherData?.city || undefined,
              lastUpdated: Date.now()
            },
            suggestedWaterGoal: suggested
          });
        }
      } catch (error) {
        console.error('Failed to fetch weather:', error);
      }
    }, (error) => {
      console.warn('Geolocation failed:', error);
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 3600000 });
  }, [updateState, state.sex, state.age, state.weatherData, workouts]);

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
    setHeight: (height: number) => updateState({ height }),
    setWeight: (weight: number) => updateState({ weight }),
    setAge: (age: number) => updateState({ age }),
    setSex: (sex: 'male' | 'female' | 'other') => updateState({ sex }),
    setWaterGoal: (goal: number) => updateState({ waterGoal: goal }),
    setWaterPresets: (presets: number[]) => updateState({ waterPresets: presets }),
    setAccentColor: (color: string) => updateState({ accentColor: color }),
    setNotificationsEnabled: (enabled: boolean) => updateState({ notificationsEnabled: enabled }),
    refreshWeather,
    testNotification,
    dailySummaries,
    saveDailySummary
  };
}
