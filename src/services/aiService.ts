import { GoogleGenAI, Type } from "@google/genai";
import { FastRecord, MealRecord, WorkoutRecord, SleepRecord } from "../types";

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
  sleep: SleepRecord[],
  userLocalTime: string,
  height?: number,
  weight?: number
) {
  if (history.length === 0 && meals.length === 0 && workouts.length === 0 && sleep.length === 0) {
    return [];
  }

  const ai = getAIInstance();
  const now = new Date();
  const fourDaysAgo = now.getTime() - (4 * 24 * 60 * 60 * 1000);
  
  const formatLocalTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const historyData = history
    .filter(h => h.startTime >= fourDaysAgo)
    .slice(0, 10)
    .map(h => ({
      localTime: formatLocalTime(h.startTime),
      endTime: h.endTime ? formatLocalTime(h.endTime) : null,
      durationHours: (h.duration / 3600).toFixed(1),
      targetHours: (h.targetDuration / 3600).toFixed(1),
      completed: h.completed,
      relativeTime: `${Math.round((now.getTime() - h.startTime) / 3600000)} hours ago`
    }));

  const mealData = meals
    .filter(m => m.time >= fourDaysAgo)
    .slice(0, 15)
    .map(m => ({
      localTime: formatLocalTime(m.time),
      scale: m.scale,
      description: m.description || 'No description provided',
      relativeTime: `${Math.round((now.getTime() - m.time) / 60000)} minutes ago`
    }));

  const workoutData = workouts
    .filter(w => w.time >= fourDaysAgo)
    .slice(0, 10)
    .map(w => ({
      localTime: formatLocalTime(w.time),
      durationMins: w.duration,
      intensity: w.intensity,
      relativeTime: `${Math.round((now.getTime() - w.time) / 60000)} minutes ago`
    }));

  const sleepData = sleep
    .filter(s => s.time >= fourDaysAgo)
    .slice(0, 7)
    .map(s => ({
      localTime: formatLocalTime(s.time),
      durationHours: s.duration,
      quality: s.quality,
      relativeTime: `${Math.round((now.getTime() - s.time) / 3600000)} hours ago`
    }));

  const prompt = `
    User's Current Local Time: ${userLocalTime}
    Current UTC Time: ${now.toISOString()}
    Timezone Offset: ${now.getTimezoneOffset()} minutes
    User Profile: ${height ? `Height: ${height}cm` : 'Height: Not provided'}, ${weight ? `Weight: ${weight}kg` : 'Weight: Not provided'}
    
    Analyze this user's health data and provide 3-4 concise, personalized insights.
    Focus on:
    1. The relationship between fasting windows, sleep quality, and energy levels.
    2. Specific recommendations for the BEST TIME and INTENSITY for their next workout based on their most recent meal(s), current fasting state, and sleep quality.
    3. How their sleep patterns (duration and quality) are affecting their fasting performance and metabolic health.
    4. How their meal choices (descriptions) affect their metabolic health and potentially their sleep.
    
    CRITICAL: 
    1. Use "User's Current Local Time" as the primary reference for "morning", "night", etc.
    2. Use "localTime" fields for each record to understand exactly when they happened in the user's day.
    3. Use "relativeTime" fields to understand how long ago events happened relative to "now".
    4. Only use the data provided in the lists below. Do NOT infer or assume meal times.
    5. ALWAYS use 12-hour format (e.g., "10:00 am") when mentioning specific times in your response.
    
    Fasting History: ${JSON.stringify(historyData)}
    Recent Meals: ${JSON.stringify(mealData)}
    Recent Workouts: ${JSON.stringify(workoutData)}
    Recent Sleep: ${JSON.stringify(sleepData)}
    
    Structure the response as a list of insights.
  `;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert fasting and fitness coach. Provide data-driven, structured insights based on the user's history and physical profile (height/weight if provided). Be precise about timing relationships. Specifically, recommend the optimal workout time and intensity based on the user's last meal, current fasting state, and body metrics. IMPORTANT: Never hallucinate or infer meal or workout data that is not explicitly provided in the user's logs. ALWAYS use 12-hour time format (e.g., 10:00 am) in your responses.",
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

export async function chatWithCoach(
  insight: { title: string; content: string; category: string },
  userMessage: string,
  chatHistory: { role: 'user' | 'model'; text: string }[]
) {
  const ai = getAIInstance();
  
  const historyParts = chatHistory.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  const now = new Date();
  const userLocalTime = now.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });

  const contents = [
    {
      role: 'user',
      parts: [{ text: `User's Current Local Time: ${userLocalTime}
Context Insight:
Category: ${insight.category}
Title: ${insight.title}
Content: ${insight.content}

User Question: ${userMessage}` }]
    },
    ...historyParts
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents,
      config: {
        systemInstruction: "You are an expert fasting and fitness coach. A user is asking you a question about a specific insight you previously provided. Answer their question concisely and accurately based on the context of that insight. Be supportive and data-driven. Keep responses under 3 sentences if possible."
      }
    });

    return response.text || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("AI Chat Error:", error);
    throw error;
  }
}
