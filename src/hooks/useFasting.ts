import { useState, useEffect, useCallback } from 'react';
import { CurrentFastState, FastRecord } from '../types';
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

    const stateDocRef = doc(db, 'users', user.uid, 'settings', 'currentFast');
    
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
        setDoc(stateDocRef, initialState);
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
          const parsedHistory = JSON.parse(localHistory) as FastRecord[];
          parsedHistory.forEach(async (record) => {
            const { id, ...data } = record;
            await setDoc(doc(historyRef, id), data);
          });
          localStorage.removeItem(STORAGE_KEY_HISTORY);
        }
      }
    }, (error) => {
      handleFirestoreError(error, 'list', `users/${user.uid}/history`);
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
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
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

  return {
    user,
    isAuthReady,
    state,
    history,
    startFast,
    pauseFast,
    resumeFast,
    endFast,
    resetToIdle,
    deleteRecord,
    manualLogFast,
    setTargetHours
  };
}
