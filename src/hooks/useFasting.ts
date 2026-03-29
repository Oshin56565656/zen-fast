import { useState, useEffect, useCallback } from 'react';
import { CurrentFastState, FastRecord, MealRecord, WorkoutRecord } from '../types';
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
    pausedAt: null,
    totalPausedTime: 0
  });

  const [history, setHistory] = useState<FastRecord[]>([]);
  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);

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
      setWorkouts(records.sort((a, b) => b.time - a.time));
    }, (error) => {
      handleFirestoreError(error, 'list', `users/${user.uid}/workouts`);
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

  const startFast = () => {
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
    updateState({ pausedAt: Date.now() });
  };

  const resumeFast = () => {
    if (state.status !== 'fasting' || !state.pausedAt) return;
    const pauseDuration = Date.now() - state.pausedAt;
    updateState({
      pausedAt: null,
      totalPausedTime: state.totalPausedTime + pauseDuration
    });
  };

  const endFast = async () => {
    if (state.status !== 'fasting' || !state.startTime || !user) return;
    
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
      
      await updateState({
        startTime: null,
        endTime: now,
        status: 'eating',
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
    updateState({ targetHours: hours });
  };

  const logMeal = async (time: number, scale: 'snack' | 'normal' | 'large') => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'meals'), {
        time,
        scale,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, 'write', `users/${user.uid}/meals`);
    }
  };

  const logWorkout = async (time: number, duration: number, intensity: 'low' | 'moderate' | 'high') => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'workouts'), {
        time,
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

  return {
    user,
    isAuthReady,
    state,
    history,
    meals,
    workouts,
    startFast,
    pauseFast,
    resumeFast,
    endFast,
    resetToIdle,
    deleteRecord,
    manualLogFast,
    setTargetHours,
    logMeal,
    logWorkout,
    deleteMeal,
    deleteWorkout
  };
}
