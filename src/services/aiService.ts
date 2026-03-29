import { GoogleGenAI } from "@google/genai";
import { FastRecord, MealRecord, WorkoutRecord } from "../types";

const getAIInstance = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined in the environment.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

export async function getFastingInsights(history: FastRecord[], meals: MealRecord[], workouts: WorkoutRecord[]) {
  if (history.length === 0 && meals.length === 0 && workouts.length === 0) {
    return "Start logging your fasts, meals, and workouts to get personalized insights!";
  }

  const ai = getAIInstance();
  const historyData = history.slice(0, 10).map(h => ({
    startTime: new Date(h.startTime).toLocaleString(),
    duration: (h.duration / 3600).toFixed(1) + " hours",
    target: (h.targetDuration / 3600).toFixed(1) + " hours",
    completed: h.completed
  }));

  const mealData = meals.slice(0, 10).map(m => ({
    time: new Date(m.time).toLocaleString(),
    scale: m.scale
  }));

  const workoutData = workouts.slice(0, 10).map(w => ({
    time: new Date(w.time).toLocaleString(),
    duration: w.duration + " mins",
    intensity: w.intensity
  }));

  const prompt = `
    Analyze this user's health data and provide 3-4 concise, personalized insights.
    Focus on the relationship between fasting, meal sizes, and workout intensity.
    
    Fasting History: ${JSON.stringify(historyData)}
    Recent Meals: ${JSON.stringify(mealData)}
    Recent Workouts: ${JSON.stringify(workoutData)}
    
    Keep it encouraging, professional, and scientifically grounded.
  `;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert fasting coach. Provide data-driven insights based on the user's history."
        }
      }),
      15000, // 15 second timeout
      "AI Coach is taking a bit longer than usual. Please try again in a moment."
    );
    return response.text;
  } catch (error) {
    console.error("AI Insights Error:", error);
    if (error instanceof Error && error.message.includes("timeout")) {
      return "The connection timed out. Your mobile network might be slow, please try refreshing.";
    }
    return "Unable to generate insights at this time. Keep up the great work!";
  }
}

export async function getSmartMotivation(hoursPassed: number, targetHours: number) {
  const ai = getAIInstance();
  const prompt = `
    The user is ${hoursPassed.toFixed(1)} hours into a ${targetHours} hour fast.
    Provide a short, motivating message (max 2 sentences).
    Explain what biological stage they are likely in (e.g., blood sugar drop, ketosis, autophagy) and why it's good.
    Make it feel like a supportive coach.
  `;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are an encouraging fasting coach. Provide short, scientifically-backed motivational tips."
        }
      }),
      10000, // 10 second timeout
      "Motivation is on the way..."
    );
    return response.text;
  } catch (error) {
    console.error("AI Motivation Error:", error);
    return "You're doing great! Every hour counts toward your health goals.";
  }
}
