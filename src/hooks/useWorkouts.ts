import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  doc, 
  setDoc, 
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { WorkoutIntensity } from '../types';

export interface Workout {
  id?: string;
  uid: string;
  source: 'strava' | 'manual';
  externalId?: string;
  name?: string;
  type?: string;
  startDate: string;
  startTime: number;
  endTime: number;
  duration?: number;
  distance?: number;
  calories?: number;
  elevation?: number;
  intensity?: 'low' | 'moderate' | 'high';
  data?: any;
}

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Fetch user profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        } else {
          // Create initial profile
          const initialProfile = {
            uid: user.uid,
            email: user.email,
            stravaConnected: false
          };
          await setDoc(doc(db, 'users', user.uid), initialProfile);
          setUserProfile(initialProfile);
        }

        // Listen to workouts
        const workoutsRef = collection(db, 'users', user.uid, 'workouts');
        const q = query(
          workoutsRef,
          orderBy('startDate', 'desc'),
          limit(50)
        );

        const unsubscribeWorkouts = onSnapshot(q, (snapshot) => {
          const workoutData: Workout[] = [];
          snapshot.forEach((doc) => {
            workoutData.push({ id: doc.id, ...doc.data() } as Workout);
          });
          setWorkouts(workoutData);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching workouts:", error);
          setLoading(false);
        });

        return () => unsubscribeWorkouts();
      } else {
        setWorkouts([]);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const connectStrava = async () => {
    try {
      const response = await fetch('/api/auth/strava/url');
      const { url } = await response.json();
      
      const authWindow = window.open(url, 'strava_oauth', 'width=600,height=700');
      
      const handleMessage = async (event: MessageEvent) => {
        if (event.data?.type === 'STRAVA_AUTH_SUCCESS') {
          const { access_token, refresh_token, expires_at, athleteId } = event.data.data;
          
          if (auth.currentUser) {
            const stravaData = {
              stravaConnected: true,
              stravaAccessToken: access_token,
              stravaRefreshToken: refresh_token,
              stravaTokenExpiresAt: expires_at,
              stravaAthleteId: athleteId.toString()
            };
            
            await setDoc(doc(db, 'users', auth.currentUser.uid), stravaData, { merge: true });
            
            setUserProfile((prev: any) => ({ ...prev, ...stravaData }));
          }
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error("Strava connection error:", error);
    }
  };

  const syncStrava = async () => {
    if (!userProfile?.stravaAccessToken || !auth.currentUser) {
      console.warn("Strava sync skipped: Missing token or user", { 
        hasToken: !!userProfile?.stravaAccessToken, 
        hasUser: !!auth.currentUser 
      });
      return;
    }

    try {
      let token = userProfile.stravaAccessToken;

      // Check if token is expired (with 5 min buffer)
      const now = Math.floor(Date.now() / 1000);
      if (userProfile.stravaTokenExpiresAt && now > (userProfile.stravaTokenExpiresAt - 300)) {
        console.log("Strava token expired, refreshing...");
        const refreshResponse = await fetch(`/api/auth/strava/refresh?refreshToken=${userProfile.stravaRefreshToken}`);
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          token = refreshData.access_token;
          
          // Update Firestore and state
          const updatedData = {
            stravaAccessToken: refreshData.access_token,
            stravaRefreshToken: refreshData.refresh_token,
            stravaTokenExpiresAt: refreshData.expires_at
          };
          
          await setDoc(doc(db, 'users', auth.currentUser.uid), updatedData, { merge: true });
          setUserProfile((prev: any) => ({ ...prev, ...updatedData }));
          console.log("Strava token refreshed successfully");
        } else {
          throw new Error("Failed to refresh Strava token");
        }
      }

      console.log("Fetching Strava activities...");
      const response = await fetch(`/api/strava/activities?accessToken=${token}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch activities");
      }
      
      const activities = await response.json();
      console.log(`Fetched ${activities.length} activities from Strava`);
      
      const workoutsRef = collection(db, 'users', auth.currentUser.uid, 'workouts');
      let addedCount = 0;
      
      for (const summaryActivity of activities) {
        // Check if activity already exists (using externalId)
        const existing = workouts.find(w => w.externalId === summaryActivity.id.toString());
        if (existing) continue;

        console.log(`Fetching details for activity ${summaryActivity.id}...`);
        const detailResponse = await fetch(`/api/strava/activities/${summaryActivity.id}?accessToken=${token}`);
        if (!detailResponse.ok) {
          console.warn(`Failed to fetch details for activity ${summaryActivity.id}, using summary data.`);
        }
        
        const activity = detailResponse.ok ? await detailResponse.json() : summaryActivity;

        const startTime = new Date(activity.start_date).getTime();
        const durationMins = Math.round(activity.moving_time / 60);
        const endTime = startTime + (activity.moving_time * 1000);
        
        // Map Strava effort to intensity
        // Suffer score is the most accurate, but only for HR activities
        let intensity: WorkoutIntensity = 'moderate';
        if (activity.suffer_score) {
          intensity = activity.suffer_score > 100 ? 'high' : activity.suffer_score > 50 ? 'moderate' : 'low';
        } else {
          // Fallback heuristics for non-HR activities
          // If moving time is long or it's a known high-intensity type, default to moderate
          if (activity.type === 'Run' || activity.type === 'Ride' || activity.type === 'HIIT') {
            intensity = 'moderate';
          } else {
            intensity = 'low';
          }
        }

        await addDoc(workoutsRef, {
          uid: auth.currentUser.uid,
          source: 'strava',
          externalId: activity.id.toString(),
          name: activity.name,
          type: activity.type,
          startDate: activity.start_date,
          startTime: startTime,
          endTime: endTime,
          duration: durationMins,
          distance: activity.distance,
          calories: activity.calories || 0,
          elevation: activity.total_elevation_gain || 0,
          intensity: intensity,
          data: activity
        });
        addedCount++;
      }
      console.log(`Strava sync complete. Added ${addedCount} new workouts.`);
    } catch (error) {
      console.error("Strava sync error:", error);
    }
  };

  return {
    workouts,
    loading,
    userProfile,
    connectStrava,
    syncStrava
  };
}
