import { GoogleGenAI, Type } from "@google/genai";
import { FastRecord, MealRecord, WorkoutRecord } from "../types";

const getAIInstance = () => {
  let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  // Fallback to localStorage for manual entry
  if (!apiKey && typeof window !== 'undefined') {
    apiKey = localStorage.getItem('FT_GEMINI_API_KEY') || '';
  }

  if (!apiKey) {
    console.warn("No API Key found. AI features will not work.");
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

export async function getFastingInsights(
  history: FastRecord[], 
  meals: MealRecord[], 
  workouts: WorkoutRecord[],
  userLocalTime: string
) {
  if (history.length === 0 && meals.length === 0 && workouts.length === 0) {
    return [];
  }

  const ai = getAIInstance();
  const now = new Date();
  
  const historyData = history.slice(0, 10).map(h => ({
    startTime: new Date(h.startTime).toISOString(),
    endTime: h.endTime ? new Date(h.endTime).toISOString() : null,
    durationHours: (h.duration / 3600).toFixed(1),
    targetHours: (h.targetDuration / 3600).toFixed(1),
    completed: h.completed,
    relativeTime: `${Math.round((now.getTime() - h.startTime) / 3600000)} hours ago`
  }));

  const mealData = meals.slice(0, 10).map(m => ({
    time: new Date(m.time).toISOString(),
    scale: m.scale,
    description: m.description || 'No description provided',
    relativeTime: `${Math.round((now.getTime() - m.time) / 60000)} minutes ago`
  }));

  const workoutData = workouts.slice(0, 10).map(w => ({
    time: new Date(w.time).toISOString(),
    durationMins: w.duration,
    intensity: w.intensity,
    relativeTime: `${Math.round((now.getTime() - w.time) / 60000)} minutes ago`
  }));

  const prompt = `
    User's Current Local Time: ${userLocalTime}
    Current UTC Time: ${now.toISOString()}
    
    Analyze this user's health data and provide 3-4 concise, personalized insights.
    Focus on the relationship between fasting windows, meal timing/size, and workout timing/intensity.
    
    CRITICAL: 
    1. Use "User's Current Local Time" as the primary reference for "morning", "night", etc.
    2. Use "relativeTime" fields to understand how long ago events happened.
    3. Only use the data provided in the lists below. Do NOT infer or assume meal times.
    4. ALWAYS use 12-hour format (e.g., "10:00 am") when mentioning specific times in your response.
    
    Fasting History: ${JSON.stringify(historyData)}
    Recent Meals: ${JSON.stringify(mealData)}
    Recent Workouts: ${JSON.stringify(workoutData)}
    
    Structure the response as a list of insights.
  `;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert fasting coach. Provide data-driven, structured insights based on the user's history. Be precise about timing relationships. IMPORTANT: Never hallucinate or infer meal or workout data that is not explicitly provided in the user's logs. ALWAYS use 12-hour time format (e.g., 10:00 am) in your responses.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING, description: "Category (e.g., Timing, Nutrition, Performance)" },
                title: { type: Type.STRING, description: "Short title" },
                content: { type: Type.STRING, description: "Detailed insight" },
                impact: { type: Type.STRING, enum: ["positive", "neutral", "improvement"] }
              },
              required: ["category", "title", "content", "impact"]
            }
          }
        }
      }),
      45000, // Increase to 45 seconds
      "The AI analysis is taking longer than expected. Please try again in a moment."
    );
    
    if (!response.text) {
      throw new Error("The AI returned an empty response. Please try again.");
    }

    try {
      return JSON.parse(response.text);
    } catch (e) {
      console.error("JSON Parse Error:", response.text);
      throw new Error("The AI response was not in the expected format. Please try again.");
    }
  } catch (error) {
    console.error("AI Insights Error:", error);
    throw error; // Re-throw to let the UI handle the error state
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
      15000, // 15 second timeout
      "Motivation is taking a moment..."
    );
    return response.text || "You're doing great! Every hour counts toward your health goals.";
  } catch (error) {
    console.error("AI Motivation Error:", error);
    return "You're doing great! Every hour counts toward your health goals.";
  }
}
