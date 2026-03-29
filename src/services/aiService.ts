import { GoogleGenAI } from "@google/genai";
import { FastRecord, MealRecord, WorkoutRecord } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getFastingInsights(history: FastRecord[], meals: MealRecord[], workouts: WorkoutRecord[]) {
  if (history.length === 0 && meals.length === 0 && workouts.length === 0) {
    return "Start logging your fasts, meals, and workouts to get personalized insights!";
  }

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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert fasting coach. Provide data-driven insights based on the user's history."
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Insights Error:", error);
    return "Unable to generate insights at this time. Keep up the great work!";
  }
}

export async function getSmartMotivation(hoursPassed: number, targetHours: number) {
  const prompt = `
    The user is ${hoursPassed.toFixed(1)} hours into a ${targetHours} hour fast.
    Provide a short, motivating message (max 2 sentences).
    Explain what biological stage they are likely in (e.g., blood sugar drop, ketosis, autophagy) and why it's good.
    Make it feel like a supportive coach.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are an encouraging fasting coach. Provide short, scientifically-backed motivational tips."
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Motivation Error:", error);
    return "You're doing great! Every hour counts toward your health goals.";
  }
}
