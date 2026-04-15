import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { FastRecord, MealRecord, WorkoutRecord, SleepRecord, WaterRecord } from "../types";

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

interface InsightResponse {
  insights: {
    category: string;
    title: string;
    content: string;
    impact: 'positive' | 'neutral' | 'improvement';
  }[];
  calorieGuess?: {
    amount: number;
    reasoning: string;
    macros?: {
      protein: number;
      carbs: number;
      fats: number;
    };
  };
  caloriesBurned?: {
    amount: number;
    reasoning: string;
  };
}

export async function getFastingInsights(
  history: FastRecord[], 
  meals: MealRecord[], 
  workouts: WorkoutRecord[],
  sleep: SleepRecord[],
  water: WaterRecord[],
  userLocalTime: string,
  height?: number,
  weight?: number,
  sex?: string,
  age?: number
): Promise<InsightResponse | []> {
  if (history.length === 0 && meals.length === 0 && workouts.length === 0 && sleep.length === 0 && water.length === 0) {
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
    .filter(w => w.startTime >= fourDaysAgo)
    .slice(0, 10)
    .map(w => ({
      localTime: formatLocalTime(w.startTime),
      localEndTime: formatLocalTime(w.endTime),
      durationMins: w.duration,
      intensity: w.intensity,
      type: w.type || 'custom',
      description: w.description || '',
      relativeTime: `${Math.round((now.getTime() - w.startTime) / 60000)} minutes ago`
    }));

  const sleepData = sleep
    .filter(s => s.wakeUpTime >= fourDaysAgo)
    .slice(0, 7)
    .map(s => {
      return {
        bedtime: formatLocalTime(s.bedtime),
        wakeUpTime: formatLocalTime(s.wakeUpTime),
        durationHours: s.duration.toFixed(1),
        quality: s.quality,
        relativeTime: `${Math.round((now.getTime() - s.wakeUpTime) / 3600000)} hours ago`
      };
    });

  const waterData = water
    .filter(w => w.time >= fourDaysAgo)
    .slice(0, 20)
    .map(w => ({
      localTime: formatLocalTime(w.time),
      amountMl: w.amount,
      relativeTime: `${Math.round((now.getTime() - w.time) / 60000)} minutes ago`
    }));

  const prompt = `
    User's Current Local Time: ${userLocalTime}
    Current UTC Time: ${now.toISOString()}
    Timezone Offset: ${now.getTimezoneOffset()} minutes
    User Profile: 
    - Sex: ${sex || 'Not provided'}
    - Age: ${age || 'Not provided'}
    - Height: ${height ? `${height}cm` : 'Not provided'}
    - Weight: ${weight ? `${weight}kg` : 'Not provided'}
    
    Analyze this user's health data and provide 3-4 concise, personalized insights.
    Focus on:
    1. The relationship between fasting windows, sleep quality, and energy levels.
    2. Specific recommendations for the BEST TIME and INTENSITY for their next workout based on their most recent meal(s), current fasting state, and sleep quality. Consider the impact of different workout types (cardio vs strength vs hiit, etc.) on their metabolic state.
    3. How their sleep patterns (bedtime, wake-up time, duration, and quality) are affecting their fasting performance and metabolic health.
    4. How their meal choices (descriptions) affect their metabolic health and potentially their sleep.
    5. Hydration: Analyze their water intake patterns and suggest an optimal daily water goal (in ml) based on their physical profile, activity level, and current hydration habits.
    6. Calorie & Macro Estimation: Based on the descriptions and scales of the meals logged TODAY (using userLocalTime as reference), provide a rough estimate of their total calorie intake and macro breakdown (Protein, Carbs, Fats in grams) for the current day. If no meals are logged today, provide a general estimate based on their typical patterns or skip if no data.
    7. Calories Burned: Based on the workouts logged TODAY (duration, intensity, and type) and their physical profile (BMR estimate), provide a rough estimate of their total calories burned for the current day.
    
    CRITICAL: 
    1. Use "User's Current Local Time" as the primary reference for "morning", "night", etc.
    2. Use "localTime" fields for each record to understand exactly when they happened in the user's day.
    3. For Sleep: The user logs their "bedtime" and "wakeUpTime". Use these to understand their sleep schedule and consistency.
    4. Use "relativeTime" fields to understand how long ago events happened relative to "now".
    5. Only use the data provided in the lists below. Do NOT infer or assume meal times.
    6. ALWAYS use 12-hour format (e.g., "10:00 am") when mentioning specific times in your response.
    
    Fasting History: ${JSON.stringify(historyData)}
    Recent Meals: ${JSON.stringify(mealData)}
    Recent Workouts: ${JSON.stringify(workoutData)}
    Recent Sleep: ${JSON.stringify(sleepData)}
    Recent Water Intake: ${JSON.stringify(waterData)}
    
    Structure the response as a JSON object with the following structure:
    {
      "insights": [
        { "category": "string", "title": "string", "content": "string", "impact": "positive" | "neutral" | "improvement" }
      ],
      "calorieGuess": { 
        "amount": number, 
        "reasoning": "string", 
        "macros": { "protein": number, "carbs": number, "fats": number } 
      },
      "caloriesBurned": { 
        "amount": number, 
        "reasoning": "string" 
      }
    }
  `;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert fasting and fitness coach. Provide data-driven, structured insights based on the user's history and physical profile (age, sex, height, and weight if provided). Be precise about timing relationships. Specifically, recommend the optimal workout time and intensity based on the user's last meal, current fasting state, and body metrics. IMPORTANT: Never hallucinate or infer meal or workout data that is not explicitly provided in the user's logs. ALWAYS use 12-hour time format (e.g., 10:00 am) in your responses.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              insights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING, description: "Category (e.g., Timing, Nutrition, Performance)" },
                    title: { type: Type.STRING, description: "Short title" },
                    content: { type: Type.STRING, description: "Detailed insight" },
                    impact: { type: Type.STRING, description: "Impact level: positive, neutral, or improvement" }
                  },
                  required: ["category", "title", "content", "impact"]
                }
              },
              calorieGuess: {
                type: Type.OBJECT,
                properties: {
                  amount: { type: Type.NUMBER, description: "Estimated calories consumed today" },
                  reasoning: { type: Type.STRING, description: "Brief explanation of how this was calculated" },
                  macros: {
                    type: Type.OBJECT,
                    properties: {
                      protein: { type: Type.NUMBER, description: "Estimated protein in grams" },
                      carbs: { type: Type.NUMBER, description: "Estimated carbohydrates in grams" },
                      fats: { type: Type.NUMBER, description: "Estimated fats in grams" }
                    },
                    required: ["protein", "carbs", "fats"]
                  }
                },
                required: ["amount", "reasoning", "macros"]
              },
              caloriesBurned: {
                type: Type.OBJECT,
                properties: {
                  amount: { type: Type.NUMBER, description: "Estimated calories burned today (BMR + Activity)" },
                  reasoning: { type: Type.STRING, description: "Brief explanation of how this was calculated" }
                },
                required: ["amount", "reasoning"]
              }
            },
            required: ["insights", "calorieGuess", "caloriesBurned"]
          }
        }
      }),
      45000, // Increase to 45 seconds
      "The AI analysis is taking longer than expected. Please try again in a moment."
    ) as GenerateContentResponse;
    
    const responseText = response.text;
    if (!responseText) {
      throw new Error("The AI returned an empty response. Please try again.");
    }

    try {
      return JSON.parse(responseText);
    } catch (e) {
      console.error("JSON Parse Error:", responseText);
      throw new Error("The AI response was not in the expected format. Please try again.");
    }
  } catch (error) {
    console.error("AI Insights Error:", error);
    throw error; // Re-throw to let the UI handle the error state
  }
}

export async function chatWithCoach(
  insight: { title: string; content: string; category: string },
  userMessage: string,
  chatHistory: { role: 'user' | 'model'; text: string }[],
  height?: number,
  weight?: number,
  sex?: string,
  age?: number
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
User Profile:
- Sex: ${sex || 'Not provided'}
- Age: ${age || 'Not provided'}
- Height: ${height ? `${height}cm` : 'Not provided'}
- Weight: ${weight ? `${weight}kg` : 'Not provided'}

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
      model: "gemini-flash-latest",
      contents: contents,
      config: {
        systemInstruction: "You are an expert fasting and fitness coach. A user is asking you a question about a specific insight you previously provided. Answer their question concisely and accurately based on the context of that insight and their physical profile. Be supportive and data-driven. Keep responses under 3 sentences if possible."
      }
    });

    return response.text || "I'm sorry, I couldn't generate a response. Please try again.";
  } catch (error) {
    console.error("AI Chat Error:", error);
    throw error;
  }
}

export async function getPeriodicReview(
  data: any[],
  type: 'monthly' | 'yearly'
) {
  const ai = getAIInstance();
  const prompt = `
    Analyze the following ${type} health data and provide a concise, motivating summary of the user's progress.
    Data: ${JSON.stringify(data)}
    
    Focus on:
    1. Overall trends in weight, hydration, and activity.
    2. One specific area of improvement or success.
    3. A motivating closing statement for the next ${type === 'monthly' ? 'month' : 'year'}.
    
    Keep the response under 150 words. Use a supportive and professional tone.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert health and fitness coach providing a high-level periodic review. Be concise, data-driven, and motivating."
      }
    });

    return response.text || "I couldn't generate a review at this time. Keep up the great work!";
  } catch (error) {
    console.error("Periodic Review Error:", error);
    throw error;
  }
}
