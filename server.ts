import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Import AI service functions
import { 
  getFastingInsights, 
  chatWithCoach, 
  getPeriodicReview, 
  analyzeNutritionLabel, 
  estimateMealFromImage, 
  estimateMealCalories, 
  estimateWorkoutCalories, 
  parseWorkoutText 
} from "./src/services/aiService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to support large JSON payloads (e.g. Base64 nutrition labels or meal photos)
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI Insights Route
  app.post("/api/ai/getFastingInsights", async (req, res) => {
    try {
      const { 
        history, 
        meals, 
        workouts, 
        sleep, 
        water, 
        userLocalTime, 
        height, 
        weight, 
        sex, 
        age, 
        supplements, 
        supplementLogs, 
        moods, 
        muscularity, 
        activityLevel 
      } = req.body;
      
      const result = await getFastingInsights(
        history, 
        meals, 
        workouts, 
        sleep, 
        water, 
        userLocalTime, 
        height, 
        weight, 
        sex, 
        age, 
        supplements, 
        supplementLogs, 
        moods, 
        muscularity, 
        activityLevel
      );
      res.json(result);
    } catch (error: any) {
      console.error("Express App Error (getFastingInsights):", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // Chat Coach Route
  app.post("/api/ai/chatWithCoach", async (req, res) => {
    try {
      const { 
        insight, 
        userMessage, 
        chatHistory, 
        height, 
        weight, 
        sex, 
        age, 
        muscularity, 
        activityLevel 
      } = req.body;

      const responseText = await chatWithCoach(
        insight, 
        userMessage, 
        chatHistory, 
        height, 
        weight, 
        sex, 
        age, 
        muscularity, 
        activityLevel
      );
      res.json(responseText);
    } catch (error: any) {
      console.error("Express App Error (chatWithCoach):", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // Periodic Review Route
  app.post("/api/ai/getPeriodicReview", async (req, res) => {
    try {
      const { data, type } = req.body;
      const result = await getPeriodicReview(data, type);
      res.json(result);
    } catch (error: any) {
      console.error("Express App Error (getPeriodicReview):", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // Analyze Nutrition Label from Image Route
  app.post("/api/ai/analyzeNutritionLabel", async (req, res) => {
    try {
      const { base64Image, mimeType, consumedAmount } = req.body;
      const result = await analyzeNutritionLabel(base64Image, mimeType, consumedAmount);
      res.json(result);
    } catch (error: any) {
      console.error("Express App Error (analyzeNutritionLabel):", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // Estimate Meal nutritional content from Image Route
  app.post("/api/ai/estimateMealFromImage", async (req, res) => {
    try {
      const { base64Image, mimeType } = req.body;
      const result = await estimateMealFromImage(base64Image, mimeType);
      res.json(result);
    } catch (error: any) {
      console.error("Express App Error (estimateMealFromImage):", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // Estimate Meal calories from description Route
  app.post("/api/ai/estimateMealCalories", async (req, res) => {
    try {
      const { description, scale } = req.body;
      const result = await estimateMealCalories(description, scale);
      res.json(result);
    } catch (error: any) {
      console.error("Express App Error (estimateMealCalories):", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // Estimate Workout logs calories burned Route
  app.post("/api/ai/estimateWorkoutCalories", async (req, res) => {
    try {
      const { type, intensity, durationMinutes, description } = req.body;
      const result = await estimateWorkoutCalories(type, intensity, durationMinutes, description);
      res.json(result);
    } catch (error: any) {
      console.error("Express App Error (estimateWorkoutCalories):", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // Parse Workout text helper Route
  app.post("/api/ai/parseWorkoutText", async (req, res) => {
    try {
      const { text } = req.body;
      const result = await parseWorkoutText(text);
      res.json(result);
    } catch (error: any) {
      console.error("Express App Error (parseWorkoutText):", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
