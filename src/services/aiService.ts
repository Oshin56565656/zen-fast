import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { FastRecord, MealRecord, WorkoutRecord, SleepRecord, WaterRecord, Supplement, SupplementLog, MoodRecord, CalorieGuess, CaloriesBurned, AIInsight } from "../types";

const getAIInstance = () => {
  let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  // Fallback to localStorage for manual entry
  if (!apiKey && typeof window !== 'undefined') {
    apiKey = localStorage.getItem('FT_GEMINI_API_KEY') || '';
  }

  if (!apiKey) {
    console.warn("No API Key found. AI features will not work.");
  }
  return new GoogleGenAI({ 
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

interface GeminiCallParams {
  model?: string;
  contents: any;
  config?: any;
}

async function callGeminiAPI(ai: any, params: GeminiCallParams): Promise<GenerateContentResponse> {
  const primaryModel = params.model || "gemini-3.5-flash";
  
  // Set up sequential models to try from permitted models (avoiding deprecated/prohibited ones like gemini-1.5-flash)
  const modelsToTry = [primaryModel];
  if (primaryModel !== "gemini-3.1-flash-lite") {
    modelsToTry.push("gemini-3.1-flash-lite");
  }
  if (primaryModel !== "gemini-flash-latest" && primaryModel !== "gemini-3.1-flash-lite") {
    modelsToTry.push("gemini-flash-latest");
  }

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    // Retry primary model once on transient failure, fail over to fallback models immediately
    const maxRetries = modelName === primaryModel ? 1 : 0;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model: modelName,
        }) as GenerateContentResponse;
        return response;
      } catch (error: any) {
        lastError = error;
        const errMsg = error?.message || "";
        const isTransient = errMsg.includes("503") || 
                            errMsg.includes("504") ||
                            errMsg.includes("UNAVAILABLE") || 
                            errMsg.includes("high demand") ||
                            errMsg.includes("temporary") ||
                            (error?.status && error.status >= 500);
                            
        if (isTransient) {
          if (attempt < maxRetries) {
            const delay = (attempt + 1) * 600;
            console.warn(`Gemini call to ${modelName} has high transient load. Re-trying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            console.warn(`Gemini call to ${modelName} finished matches. Trying next fallback option...`);
          }
        } else {
          // Non-transient errors (like invalid api key or schema matching issue) should fail fast and not proceed
          throw error;
        }
      }
    }
  }

  throw lastError;
}

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;

  // Prevent background promise rejections from causing unhandledRejection crashes on Node.js after the timeout has fired
  promise.catch((err) => {
    console.warn("Background promise rejected after timeout or resolution:", err?.message || err);
  });

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  return Promise.race([
    promise.then((val) => {
      if (timeoutId) clearTimeout(timeoutId);
      return val;
    }),
    timeoutPromise
  ]);
};

interface InsightResponse {
  insights: AIInsight[];
  calorieGuess: CalorieGuess;
  caloriesBurned: CaloriesBurned;
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
  moods: MoodRecord[] = [],
  muscularity?: string,
  activityLevel?: string
): Promise<InsightResponse | []> {
  if (history.length === 0 && meals.length === 0 && workouts.length === 0 && sleep.length === 0 && water.length === 0 && supplements.length === 0 && moods.length === 0) {
    return [];
  }

  // Client-side delegation to avoid leaks and direct browser instantiation of Gemini API Key
  if (typeof window !== 'undefined' && !localStorage.getItem('FT_GEMINI_API_KEY')) {
    const response = await fetch('/api/ai/getFastingInsights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history, meals, workouts, sleep, water, userLocalTime, height, weight, sex, age, supplements, supplementLogs, moods, muscularity, activityLevel
      })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to get fasting insights');
    }
    return response.json();
  }

  const ai = getAIInstance();
  const now = new Date();
  const limitDaysAgo = now.getTime() - (3 * 24 * 60 * 60 * 1000); // Only past 3 days of logs as requested
  
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
    .filter(h => h.startTime >= limitDaysAgo)
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
    .filter(m => m.time >= limitDaysAgo)
    .slice(0, 15)
    .map(m => ({
      localTime: formatLocalTime(m.time),
      scale: m.scale,
      description: m.description || 'No description provided',
      calories: m.calories || 0,
      macros: {
        protein: m.protein || 0,
        carbs: m.carbs || 0,
        fats: m.fats || 0,
        fiber: m.fiber || 0
      },
      relativeTime: `${Math.round((now.getTime() - m.time) / 60000)} minutes ago`
    }));

  const workoutData = workouts
    .filter(w => w.startTime >= limitDaysAgo)
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
    .filter(s => s.wakeUpTime >= limitDaysAgo)
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
    .filter(w => w.time >= limitDaysAgo)
    .slice(0, 20)
    .map(w => ({
      localTime: formatLocalTime(w.time),
      amountMl: w.amount,
      relativeTime: `${Math.round((now.getTime() - w.time) / 60000)} minutes ago`
    }));

  const supplementData = supplements.map(s => ({
    name: s.name,
    dosage: s.dosage,
    macros: {
      calories: s.calories || 0,
      protein: s.protein || 0,
      carbs: s.carbs || 0,
      fats: s.fats || 0,
      fiber: s.fiber || 0
    },
    isPaused: s.isPaused || false,
    preferredTime: s.preferredTime,
    lastTaken: supplementLogs
      .filter(l => l.supplementId === s.id)
      .sort((a, b) => b.time - a.time)[0]?.time ? formatLocalTime(supplementLogs.filter(l => l.supplementId === s.id).sort((a, b) => b.time - a.time)[0].time) : 'Never'
  }));

  const moodData = moods
    .filter(m => m.time >= limitDaysAgo)
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
    - Physique/Muscularity: ${muscularity || 'Average'}
    - Today's Activity Level (non-workout movement): ${activityLevel || 'Average'}
    
    Analyze this user's health data and provide 3-4 concise, personalized insights.
    If any meals, workouts, or supplements (that have been taken today) have 'calories' or macros listed, treat them as the primary source of truth for your summary calculations. Do not recalculate them unless you are specifically spotting a massive discrepancy that warrants a coaching tip.
    
    IMPORTANT: Supplements taken today MUST be included in the total 'calorieGuess' and macro counts. Check the 'Regimen' data for macros and 'Recent History' (implied in supplement logs or regimen timing) to see if they were taken. Paused supplements (isPaused: true) are currently unavailable or stopped; do not recommend taking them if they are paused.
    
    Focus on:
    1. The relationship between fasting windows, sleep quality, and energy levels.
    2. Specific recommendations for the BEST TIME and INTENSITY for their next workout based on their most recent meal(s), current fasting state, and sleep quality.
    3. Supplement Timing: Based on their current supplement list and history, provide advice on the OPTIMAL TIMING for each supplement relative to their meals, workouts, and fasting schedule.
    4. How their mood and energy scores correlate with their diet and fasting success.
    5. Calorie & Macro Estimation (Protein, Carbs, Fats, and Dietary Fiber).
    
    IMPORTANT for Calories Burned:
    - You MUST calculate BMR (Basal Metabolic Rate) and NEAT (Non-Exercise Activity Thermogenesis) SEPARATELY.
    - Use the user's weight, height, age, sex, and muscularity to calculate a realistic yet conservative BMR (Mifflin-St Jeor equation preferred, adjusted for muscularity).
    - NEAT should cover general daily movement not captured in logged workouts and MUST be based on the provided activity level (${activityLevel || 'average'}). 
    - Use these CONSERVATIVE NEAT multipliers (percentage of BMR):
      - 'sedentary': ~10% of BMR.
      - 'lightly_active': ~20% of BMR.
      - 'moderately_active': ~35% of BMR.
      - 'very_active': ~50% of BMR.
      - 'extra_active': ~70% of BMR.
    - FOR LOGGED WORKOUTS/MEALS: If the input data contains a 'burn' or 'calories' value, Use that EXACT value. Do not apply further reductions to it, as it is already considered a final, conservative log.
    - FOR BMR/NEAT: Understate your final raw calculation by exactly 10% (safety margin) as requested.
    - IMPORTANT: Ensure ALL calorie values (BMR, NEAT, total amount, calorieGuess) are whole numbers. If there are decimals, ROUND THEM UP.
    - Total 'amount' = Logged Workout Burn + Adjusted BMR + Adjusted NEAT.
    
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
          { "name": "string", "calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number, "time": "string" }
        ],
        "macros": { "protein": number, "carbs": number, "fats": number, "fiber": number } 
      },
      "caloriesBurned": { 
        "amount": number, 
        "bmr": number,
        "neat": number,
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
      callGeminiAPI(ai, {
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert fasting and fitness coach. Provide data-driven, structured insights based on the user's history and physical profile. IMPORTANT: 1. Use the EXACT calorie values provided in the logs for meals and workouts without any further reduction or inflation. 2. Calculate BMR and NEAT separately and include them in the response. Understate BMR and NEAT by exactly 10% below your raw calculation for a FULL 24-HOUR projection. 3. Total burn amount must be the sum of these adjusted BMR/NEAT and logged workouts. NEVER hallucinate data. ALWAYS use 12-hour time format and include 'asOfTime'.",
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
                        fiber: { type: Type.NUMBER, description: "Estimated fiber in grams" },
                        time: { type: Type.STRING, description: "e.g. 8:30 am" }
                      },
                      required: ["name", "calories", "protein", "carbs", "fats", "fiber", "time"]
                    }
                  },
                  macros: {
                    type: Type.OBJECT,
                    properties: {
                      protein: { type: Type.NUMBER, description: "Estimated protein in grams" },
                      carbs: { type: Type.NUMBER, description: "Estimated carbohydrates in grams" },
                      fats: { type: Type.NUMBER, description: "Estimated fats in grams" },
                      fiber: { type: Type.NUMBER, description: "Estimated dietary fiber in grams" }
                    },
                    required: ["protein", "carbs", "fats", "fiber"]
                  }
                },
                required: ["amount", "reasoning", "macros", "asOfTime"]
              },
              caloriesBurned: {
                type: Type.OBJECT,
                properties: {
                  amount: { type: Type.NUMBER, description: "Total estimated calories burned today (BMR + NEAT + Workouts)" },
                  bmr: { type: Type.NUMBER, description: "Basal Metabolic Rate calculated for 24h" },
                  neat: { type: Type.NUMBER, description: "Non-Exercise Activity Thermogenesis for 24h" },
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
                required: ["amount", "bmr", "neat", "reasoning", "activities", "asOfTime"]
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
  age?: number,
  muscularity?: string,
  activityLevel?: string
) {
  // Client-side delegation
  if (typeof window !== 'undefined' && !localStorage.getItem('FT_GEMINI_API_KEY')) {
    const response = await fetch('/api/ai/chatWithCoach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        insight, userMessage, chatHistory, height, weight, sex, age, muscularity, activityLevel
      })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to chat with coach');
    }
    return response.json();
  }

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
- Physique/Muscularity: ${muscularity || 'Average'}
- Daily Activity Level: ${activityLevel || 'Average'}

Context Insight:
Category: ${insight.category}
Title: ${insight.title}
Content: ${insight.content}

User Question: ${userMessage}` }]
    },
    ...historyParts
  ];

  try {
    const response = await callGeminiAPI(ai, {
      model: "gemini-3.5-flash",
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
  // Client-side delegation
  if (typeof window !== 'undefined' && !localStorage.getItem('FT_GEMINI_API_KEY')) {
    const response = await fetch('/api/ai/getPeriodicReview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, type })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to get periodic review');
    }
    return response.json();
  }

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
    const response = await callGeminiAPI(ai, {
      model: "gemini-3.5-flash",
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

export async function analyzeNutritionLabel(base64Image: string, mimeType: string, consumedAmount: string) {
  // Client-side delegation
  if (typeof window !== 'undefined' && !localStorage.getItem('FT_GEMINI_API_KEY')) {
    const response = await fetch('/api/ai/analyzeNutritionLabel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image, mimeType, consumedAmount })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to analyze nutrition label');
    }
    return response.json();
  }

  const ai = getAIInstance();
  
  const prompt = `
    Analyze this image of a nutrition facts label.
    Extract the "per serving" or "per 100g" values and then calculate the total nutrients based on the additional details provided by the user about their consumption.
    
    Additional Details: "${consumedAmount}"
    
    Return a JSON object with:
    1. name: A short, concise name for the product (3-5 words max). Do NOT include explanation here.
    2. calories: Calculated total calories (round up to nearest integer).
    3. protein: Calculated total protein (number, round up to nearest integer).
    4. carbs: Calculated total carbohydrates (number, round up to nearest integer).
    5. fats: Calculated total fats (number, round up to nearest integer).
    6. fiber: Calculated total dietary fiber (number, round up to nearest integer).
    7. perServingInfo: A brief string explaining the serving size used for calculation.
    8. reasoning: An internal explanation of calculation (will be hidden from main UI).
  `;

  try {
    const response = await callGeminiAPI(ai, {
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: "You are a nutrition label specialist. Extract serving-size data and calculate consumed nutrients accurately. Return JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fats: { type: Type.NUMBER },
            fiber: { type: Type.NUMBER },
            perServingInfo: { type: Type.STRING },
            reasoning: { type: Type.STRING }
          },
          required: ["name", "calories", "protein", "carbs", "fats", "fiber", "perServingInfo", "reasoning"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Analyze Nutrition Label Error:", error);
    throw error;
  }
}

export async function estimateMealFromImage(base64Image: string, mimeType: string) {
  // Client-side delegation
  if (typeof window !== 'undefined' && !localStorage.getItem('FT_GEMINI_API_KEY')) {
    const response = await fetch('/api/ai/estimateMealFromImage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Image, mimeType })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to estimate meal from image');
    }
    return response.json();
  }

  const ai = getAIInstance();
  
  const prompt = `
    Analyze this image of a meal and estimate the calories and macros.
    
    Return a JSON object with:
    1. name: A short, concise name for the meal (3-5 words max).
    2. calories: Total calories (round up to nearest integer).
    3. protein: Grams of protein (number, round up to nearest integer).
    4. carbs: Grams of carbohydrates (number, round up to nearest integer).
    5. fats: Grams of fats (number, round up to nearest integer).
    6. fiber: Grams of dietary fiber (number, round up to nearest integer).
    7. reasoning: Internal identified components.
  `;

  try {
    const response = await callGeminiAPI(ai, {
      model: "gemini-3.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: "You are a nutrition expert capable of analyzing food images. Estimate nutritional values as accurately as possible. Return JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fats: { type: Type.NUMBER },
            fiber: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ["name", "calories", "protein", "carbs", "fats", "fiber", "reasoning"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Estimate Meal From Image Error:", error);
    throw error;
  }
}

export async function estimateMealCalories(description: string, scale: string) {
  // Client-side delegation
  if (typeof window !== 'undefined' && !localStorage.getItem('FT_GEMINI_API_KEY')) {
    const response = await fetch('/api/ai/estimateMealCalories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, scale })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to estimate meal calories');
    }
    return response.json();
  }

  const ai = getAIInstance();
  
  const prompt = `
    Estimate the calories and macronutrients (protein, carbs, fats, fiber) for the following meal description and size.
    Description: "${description}"
    Size/Scale: "${scale}"
    
    Provide the most accurate estimate possible for total calories and macros.
    Always round up any calculated calories or macronutrients to the nearest integer.
    Response must be a JSON object with: 
    - "calories" (number)
    - "protein" (number, grams)
    - "carbs" (number, grams)
    - "fats" (number, grams)
    - "fiber" (number, grams)
  `;

  try {
    const response = await callGeminiAPI(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a nutrition expert. Estimate calories and macros based on meal descriptions. Return JSON.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fats: { type: Type.NUMBER },
            fiber: { type: Type.NUMBER }
          },
          required: ["calories", "protein", "carbs", "fats", "fiber"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Estimate Meal Nutrients Error:", error);
    return { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 };
  }
}

export async function estimateWorkoutCalories(type: string, intensity: string, durationMinutes: number, description?: string) {
  // Client-side delegation
  if (typeof window !== 'undefined' && !localStorage.getItem('FT_GEMINI_API_KEY')) {
    const response = await fetch('/api/ai/estimateWorkoutCalories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, intensity, durationMinutes, description })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to estimate workout calories');
    }
    return response.json();
  }

  const ai = getAIInstance();
  
  const prompt = `
    Estimate the calories burned for the following workout.
    Type: "${type}"
    Intensity: "${intensity}"
    Duration: ${durationMinutes} minutes
    ${description ? `Description: "${description}"` : ''}
    
    Provide the most accurate estimate possible for total calories burned.
    Response must be a JSON object with only the field: "calories" (number).
  `;

  try {
    const response = await callGeminiAPI(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a fitness expert. Estimate calories burned based on workout details. Return JSON.",
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
    // Apply the user's requested conservative bias (underplay burn by 10-15%) everywhere
    return Math.ceil((result.calories || 0) * 0.9);
  } catch (error) {
    console.error("Estimate Workout Calories Error:", error);
    return 0;
  }
}

export async function parseWorkoutText(text: string) {
  // Client-side delegation
  if (typeof window !== 'undefined' && !localStorage.getItem('FT_GEMINI_API_KEY')) {
    const response = await fetch('/api/ai/parseWorkoutText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to parse workout text');
    }
    return response.json();
  }

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
    - startTime: If date/time is mentioned (like "Friday, April 17, 2026, 6:14 PM"), parse it to ISO format. If only time is mentioned, use today's date. If absolutely no date or time information is mentioned in the text, return null.
    - duration: Total duration in minutes (look for "30m", "1h", etc.).
    - intensity: "low", "moderate", or "high" based on the volume and type of exercises.
    - type: Choose the best fit from: cardio, strength, running, walking, swimming, cycling, football, home, custom.
    - summary: A very brief summary of the exercises performed.
  `;

  try {
    const response = await callGeminiAPI(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a fitness data parser. Extract structured data from workout logs. Be precise with durations and times.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            startTime: { type: Type.STRING, nullable: true, description: "ISO 8601 string or null if not mentioned" },
            duration: { type: Type.NUMBER, description: "Minutes" },
            intensity: { type: Type.STRING, enum: ["low", "moderate", "high"] },
            type: { type: Type.STRING, enum: ["cardio", "strength", "running", "walking", "swimming", "cycling", "football", "home", "custom"] },
            calorieBurn: { type: Type.NUMBER, description: "Estimated calories burned (BMR + activity volume)" },
            exercises: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of exercise names" },
            summary: { type: Type.STRING }
          },
          required: ["title", "duration", "intensity", "type", "summary", "calorieBurn", "exercises"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Parse Workout Error:", error);
    throw error;
  }
}
