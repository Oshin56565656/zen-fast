import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { FastRecord, MealRecord, WorkoutRecord, SleepRecord, WaterRecord, Supplement, SupplementLog, MoodRecord } from "../types";

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
  age?: number,
  supplements: Supplement[] = [],
  supplementLogs: SupplementLog[] = [],
  moods: MoodRecord[] = []
): Promise<InsightResponse | []> {
  if (history.length === 0 && meals.length === 0 && workouts.length === 0 && sleep.length === 0 && water.length === 0 && supplements.length === 0 && moods.length === 0) {
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
      calories: m.calories || 0,
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
      calorieBurn: w.calorieBurn || 0,
      exercises: w.parsedExercises || [],
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

  const supplementData = supplements.map(s => ({
    name: s.name,
    dosage: s.dosage,
    preferredTime: s.preferredTime,
    lastTaken: supplementLogs
      .filter(l => l.supplementId === s.id)
      .sort((a, b) => b.time - a.time)[0]?.time ? formatLocalTime(supplementLogs.filter(l => l.supplementId === s.id).sort((a, b) => b.time - a.time)[0].time) : 'Never'
  }));

  const moodData = moods
    .filter(m => m.time >= fourDaysAgo)
    .slice(0, 20)
    .map(m => ({
      localTime: formatLocalTime(m.time),
      moodScore: m.mood,
      energyLevel: m.energy,
      note: m.note,
      tags: m.tags,
      relativeTime: `${Math.round((now.getTime() - m.time) / 60000)} minutes ago`
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
    If any meals or workouts have 'calories' or 'calorieBurn' values listed, treat them as the primary source of truth for your summary calculations. Do not recalculate them unless you are specifically spotting a massive discrepancy that warrants a coaching tip.
    
    Focus on:
    1. The relationship between fasting windows, sleep quality, and energy levels.
    2. Specific recommendations for the BEST TIME and INTENSITY for their next workout based on their most recent meal(s), current fasting state, and sleep quality.
    3. Supplement Timing: Based on their current supplement list and history, provide advice on the OPTIMAL TIMING for each supplement relative to their meals, workouts, and fasting schedule.
    4. How their mood and energy scores correlate with their diet and fasting success.
    5. Calorie & Macro Estimation.
    
    CRITICAL: 
    1. Use "User's Current Local Time" as primary reference.
    2. Suggest specific timing for their existing supplements to maximize efficacy.
    3. Use the Mood & Energy data to identify emotional or physical fatigue patterns.
    
    Fasting History: ${JSON.stringify(historyData)}
    Recent Meals: ${JSON.stringify(mealData)}
    Recent Workouts: ${JSON.stringify(workoutData)}
    Recent Sleep: ${JSON.stringify(sleepData)}
    Recent Water Intake: ${JSON.stringify(waterData)}
    Supplements & Regimen: ${JSON.stringify(supplementData)}
    Mood & Energy Logs: ${JSON.stringify(moodData)}
    
    Structure the response as a JSON object with the following structure:
    {
      "insights": [
        { "category": "string", "title": "string", "content": "string", "impact": "positive" | "neutral" | "improvement" }
      ],
      "calorieGuess": { 
        "amount": number, 
        "reasoning": "string", 
        "asOfTime": "string",
        "foods": [
          { "name": "string", "calories": number, "protein": number, "carbs": number, "fats": number, "time": "string" }
        ],
        "macros": { "protein": number, "carbs": number, "fats": number } 
      },
      "caloriesBurned": { 
        "amount": number, 
        "reasoning": "string",
        "asOfTime": "string",
        "activities": [
          { "name": "string", "calories": number, "duration": number, "time": "string" }
        ]
      }
    }
  `;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert fasting and fitness coach. Provide data-driven, structured insights based on the user's history and physical profile. IMPORTANT: To provide a safe margin for weight loss, you MUST be conservative: 1. Inflate calorie intake (intakeGuess) by approximately 10-15% above your raw calculation. 2. Understate calories burned (burnGuess) by approximately 10-15% below your raw calculation. For 'calorieGuess' (intake), ONLY include calories from meals explicitly logged by the user today. For 'caloriesBurned', provide a FULL 24-HOUR projection (BMR + NEAT + logged workouts). DO NOT pro-rate based on time. NEVER hallucinate data. ALWAYS use 12-hour time format and include 'asOfTime'.",
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
                  reasoning: { type: Type.STRING, description: "Very brief explanation" },
                  asOfTime: { type: Type.STRING, description: "The local time for which this guess is calculated" },
                  foods: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        calories: { type: Type.NUMBER },
                        protein: { type: Type.NUMBER },
                        carbs: { type: Type.NUMBER },
                        fats: { type: Type.NUMBER },
                        time: { type: Type.STRING, description: "e.g. 8:30 am" }
                      },
                      required: ["name", "calories", "protein", "carbs", "fats", "time"]
                    }
                  },
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
                required: ["amount", "reasoning", "macros", "asOfTime"]
              },
              caloriesBurned: {
                type: Type.OBJECT,
                properties: {
                  amount: { type: Type.NUMBER, description: "Estimated calories burned today (BMR + Activity)" },
                  reasoning: { type: Type.STRING, description: "Very brief explanation" },
                  asOfTime: { type: Type.STRING, description: "The local time for which this burn is calculated" },
                  activities: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        calories: { type: Type.NUMBER },
                        duration: { type: Type.NUMBER, description: "Estimated duration in minutes" },
                        time: { type: Type.STRING, description: "e.g. 7:00 am - 12:00 pm" }
                      },
                      required: ["name", "calories", "duration", "time"]
                    }
                  }
                },
                required: ["amount", "reasoning", "activities", "asOfTime"]
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

export async function estimateMealCalories(description: string, scale: string) {
  const ai = getAIInstance();
  
  const prompt = `
    Estimate the calories for the following meal description and size.
    Description: "${description}"
    Size/Scale: "${scale}"
    
    Provide the most accurate estimate possible for total calories.
    Response must be a JSON object with only the field: "calories" (number).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
      config: {
        systemInstruction: "You are a nutrition expert. Estimate calories based on meal descriptions. Return JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            calories: { type: Type.NUMBER }
          },
          required: ["calories"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result.calories || 0;
  } catch (error) {
    console.error("Estimate Meal Calories Error:", error);
    return 0;
  }
}

export async function parseWorkoutText(text: string) {
  const ai = getAIInstance();
  const now = new Date();
  
  const prompt = `
    Analyze the following workout log text and extract structured information.
    Text: """
    ${text}
    """
    
    Current Date/Time reference: ${now.toLocaleString()}
    
    Rules:
    - title: Short descriptive title.
    - startTime: If date/time is mentioned (like "Friday, April 17, 2026, 6:14 PM"), parse it to ISO format. If only time is mentioned, use today's date.
    - duration: Total duration in minutes (look for "30m", "1h", etc.).
    - intensity: "low", "moderate", or "high" based on the volume and type of exercises.
    - type: Choose the best fit from: cardio, strength, running, walking, swimming, cycling, sports, home, custom.
    - summary: A very brief summary of the exercises performed.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a fitness data parser. Extract structured data from workout logs. Be precise with durations and times.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            startTime: { type: Type.STRING, description: "ISO 8601 string" },
            duration: { type: Type.NUMBER, description: "Minutes" },
            intensity: { type: Type.STRING, enum: ["low", "moderate", "high"] },
            type: { type: Type.STRING, enum: ["cardio", "strength", "running", "walking", "swimming", "cycling", "sports", "home", "custom"] },
            calorieBurn: { type: Type.NUMBER, description: "Estimated calories burned (BMR + activity volume)" },
            exercises: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of exercise names" },
            summary: { type: Type.STRING }
          },
          required: ["title", "startTime", "duration", "intensity", "type", "summary", "calorieBurn", "exercises"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Parse Workout Error:", error);
    throw error;
  }
}
