import { useState, useEffect, useCallback } from 'react';
import { CurrentFastState, FastRecord, MealRecord, WorkoutRecord, SleepRecord } from '../types';
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
  const [state, setState] = useState<CurrentFastState>({
    startTime: null,
    endTime: null,
    status: 'idle',
    targetHours: 16,
    targetEndTime: null,
    pausedAt: null,
    totalPausedTime: 0
  });

  const [history, setHistory] = useState<FastRecord[]>([]);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [sleep, setSleep] = useState<SleepRecord[]>([]);
  const [hasNotifiedTarget, setHasNotifiedTarget] = useState(false);

  // Monitor fasting progress for target reached notification
  useEffect(() => {
    if (state.status !== 'fasting' || !state.startTime || hasNotifiedTarget) return;

    const checkTarget = () => {
      const effectiveStartTime = state.startTime! + state.totalPausedTime;
      const elapsedMs = Date.now() - effectiveStartTime;
      
      let isTargetReached = false;
      let targetLabel = "";

      if (state.targetEndTime) {
        // If specific end time is set, check against it
        // We don't adjust for pauses here because it's a "wall clock" target
        isTargetReached = Date.now() >= state.targetEndTime;
        targetLabel = "your target time";
      } else {
        // Otherwise use duration
        const targetMs = state.targetHours * 3600 * 1000;
        isTargetReached = elapsedMs >= targetMs;
        targetLabel = `${state.targetHours}h`;
      }

      if (isTargetReached && !hasNotifiedTarget) {
        sendNotification("Fast Goal Reached! 🎉", {
          body: `You've reached ${targetLabel}. Great job!`,
          icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png"
        });
        setHasNotifiedTarget(true);
      }
    };

    const interval = setInterval(checkTarget, 60000); // Check every minute
    checkTarget(); // Check immediately

    return () => clearInterval(interval);
  }, [state.status, state.startTime, state.totalPausedTime, state.targetHours, hasNotifiedTarget]);

  // Reset notification flag when fast ends or status changes
  useEffect(() => {
    if (state.status !== 'fasting') {
      setHasNotifiedTarget(false);
      // Clear target end time when fast ends if it was a one-time thing
      // Actually, let's keep it until the user resets it or starts a new one
    }
  }, [state.status]);

  const sendNotification = async (title: string, options?: NotificationOptions) => {
    try {
      if (!("Notification" in window)) return;
      
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
        setState(snapshot.data() as CurrentFastState);
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
      await updateDoc(stateDocRef, updates);
    } catch (error) {
      handleFirestoreError(error, 'update', `users/${user.uid}/settings/currentFast`);
    }
  }, [user]);

  const startFast = async () => {
    console.log("Starting fast...");
    if ("vibrate" in navigator) navigator.vibrate(50);
    await requestPermission();
    sendNotification("Fast Started! ⏱️", {
      body: `Your ${state.targetHours}h fast has begun. Good luck!`,
      icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png"
    });
    updateState({
      startTime: Date.now(),
      endTime: null,
      status: 'fasting',
      pausedAt: null,
      totalPausedTime: 0
    });
  };

  const pauseFast = () => {
    if (state.status !== 'fasting' || state.pausedAt) return;
    if ("vibrate" in navigator) navigator.vibrate(30);
    sendNotification("Fast Paused ⏸️", {
      body: "Your timer has been paused.",
      icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png"
    });
    updateState({ pausedAt: Date.now() });
  };

  const resumeFast = () => {
    if (state.status !== 'fasting' || !state.pausedAt) return;
    if ("vibrate" in navigator) navigator.vibrate(30);
    sendNotification("Fast Resumed ▶️", {
      body: "Your timer is running again.",
      icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png"
    });
    const pauseDuration = Date.now() - state.pausedAt;
    updateState({
      pausedAt: null,
      totalPausedTime: state.totalPausedTime + pauseDuration
    });
  };

  const endFast = async () => {
    if (state.status !== 'fasting' || !state.startTime || !user) return;
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
      
      sendNotification("Fast Ended! 🥗", {
        body: `You fasted for ${Math.floor(durationSec / 3600)}h ${Math.floor((durationSec % 3600) / 60)}m. Time to refuel!`,
        icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png"
      });

      await updateState({
        startTime: null,
        endTime: now,
        status: 'idle',
        pausedAt: null,
        totalPausedTime: 0
      });
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/history`);
    }
  };

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
    updateState({ targetEndTime: time });
  };

  const logMeal = async (time: number, scale: 'snack' | 'normal' | 'large', description?: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'meals'), {
        time,
        scale,
        description: description || '',
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/meals`);
    }
  };

  const logWorkout = async (startTime: number, endTime: number, intensity: 'low' | 'moderate' | 'high') => {
    if (!user) return;
    const duration = Math.floor((endTime - startTime) / (1000 * 60));
    try {
      await addDoc(collection(db, 'users', user.uid, 'workouts'), {
        startTime,
        endTime,
        duration,
        intensity,
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

  const testNotification = async () => {
    await requestPermission();
    await sendNotification("Test Notification! 🔔", {
      body: "If you see this, notifications are working correctly.",
      icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png"
    });
    // Add a small alert for feedback on mobile
    alert("Test notification triggered! If you don't see it, please check your Android notification settings for Chrome.");
  };

  return {
    user,
    isAuthReady,
    state,
    history,
    meals,
    workouts,
    sleep,
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
    deleteMeal,
    deleteWorkout,
    deleteSleep,
    setHeight: (height: number) => updateState({ height }),
    setWeight: (weight: number) => updateState({ weight }),
    testNotification
  };
}
