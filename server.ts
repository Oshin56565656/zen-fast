import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || "http://localhost:3000";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Gemini Proxy
  app.post(["/api/ai/generate", "*/api/ai/generate"], async (req, res) => {
    const { model, contents, config } = req.body;
    let manualKey = req.headers['x-gemini-api-key'] as string;
    
    // Clean up manual key
    if (manualKey) {
      manualKey = manualKey.trim();
      if (manualKey === 'null' || manualKey === 'undefined' || manualKey === '') {
        manualKey = '';
      }
    }
    
    // Check environment
    const envGeminiKey = (process.env.GEMINI_API_KEY || '').trim();
    const envApiKey = (process.env.API_KEY || '').trim();
    
    // Function to check if a key looks valid
    const isValidKey = (key: string | undefined) => {
      if (!key) return false;
      const k = key.trim();
      if (k === '' || k === 'null' || k === 'undefined') return false;
      if (k.startsWith('MY_') || k === 'GEMINI_API_KEY' || k === 'API_KEY') return false;
      if (k.length < 20) return false;
      return true;
    };

    // Prioritize: Manual > GEMINI_API_KEY > API_KEY > Hardcoded Fallback
    let apiKeyToUse = '';
    if (isValidKey(manualKey)) {
      apiKeyToUse = manualKey;
    } else if (isValidKey(envGeminiKey)) {
      apiKeyToUse = envGeminiKey;
    } else if (isValidKey(envApiKey)) {
      apiKeyToUse = envApiKey;
    }
    
    console.log("AI Proxy Request:", {
      hasManualKey: !!manualKey,
      manualKeyValid: isValidKey(manualKey),
      hasEnvGeminiKey: !!envGeminiKey,
      hasEnvApiKey: !!envApiKey,
      keyUsedPrefix: apiKeyToUse ? `${apiKeyToUse.substring(0, 4)}...` : 'none',
      model: model
    });
    
    if (!apiKeyToUse || apiKeyToUse === 'null' || apiKeyToUse === 'undefined') {
      return res.status(500).json({ 
        error: "Gemini API Key is missing or invalid. Standard Google API keys usually start with 'AIza'. Please check your Settings > AI Integration or server environment variables." 
      });
    }

    try {
      const client = new GoogleGenAI({ apiKey: apiKeyToUse });
      
      // Try gemini-2.0-flash first, then fallback to 1.5-flash
      const modelsToTry = [model, "gemini-2.0-flash", "gemini-1.5-flash"].filter(Boolean);
      let lastError = null;

      for (const modelName of modelsToTry) {
        let retries = 0;
        const maxRetries = 2;
        
        while (retries <= maxRetries) {
          try {
            console.log(`Attempting Gemini API call with model: ${modelName} (Attempt ${retries + 1})`);
            const response = await client.models.generateContent({
              model: modelName as string,
              contents: contents,
              config: {
                systemInstruction: config?.systemInstruction,
                responseMimeType: config?.responseMimeType,
                responseSchema: config?.responseSchema
              }
            });
            
            return res.json({ text: response.text });
          } catch (error: any) {
            lastError = error;
            
            // Handle 429 (Quota Exceeded) with retry
            if (error.status === 429 && retries < maxRetries) {
              const delay = Math.pow(2, retries) * 2000; // 2s, 4s
              console.warn(`Quota exceeded for ${modelName}, retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              retries++;
              continue;
            }

            if (error.status === 404) {
              console.warn(`Model ${modelName} not found, trying next...`);
              break; // Break while, continue for loop to next model
            }
            
            throw error; // Rethrow if it's not a 429 (after retries) or 404
          }
        }
      }
      
      // If we get here, all models failed
      throw lastError;
    } catch (error: any) {
      console.error("Gemini Proxy Error:", error);
      const keyPrefix = apiKeyToUse ? `${apiKeyToUse.substring(0, 4)}...` : 'none';
      
      let errorMessage = error.message || "Internal Server Error";
      if (error.status === 429) {
        errorMessage = "The Gemini API quota has been exceeded. This usually happens on the free tier. Please wait a few minutes and try again, or provide your own Gemini API key in Settings > AI Integration for higher limits.";
      }

      res.status(error.status || 500).json({ 
        error: `Gemini API Error (Key: ${keyPrefix}): ${errorMessage}`,
        details: error.response?.data || error
      });
    }
  });

  // Strava OAuth URL
  app.get(["/api/auth/strava/url", "*/api/auth/strava/url"], (req, res) => {
    if (!STRAVA_CLIENT_ID) {
      return res.status(400).json({ error: "STRAVA_CLIENT_ID is not configured in the environment." });
    }
    
    const clientRedirectUri = req.query.redirectUri as string;
    const redirectUri = clientRedirectUri || `${APP_URL}/auth/strava/callback`;
    
    const params = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "read,activity:read_all",
    });
    const authUrl = `https://www.strava.com/oauth/authorize?${params}`;
    res.json({ url: authUrl });
  });

  // Strava Callback
  app.get("/auth/strava/callback", async (req, res) => {
    const { code } = req.query;
    
    try {
      const response = await axios.post("https://www.strava.com/oauth/token", {
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      });

      const { access_token, refresh_token, expires_at, athlete } = response.data;

      // Send success message to parent window and close popup
      // We pass the tokens back so the client can save them to Firestore
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'STRAVA_AUTH_SUCCESS',
                  data: ${JSON.stringify({ access_token, refresh_token, expires_at, athleteId: athlete.id })}
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Strava OAuth error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  // Strava Token Refresh
  app.get(["/api/auth/strava/refresh", "*/api/auth/strava/refresh"], async (req, res) => {
    const { refreshToken } = req.query;
    if (!refreshToken) return res.status(400).json({ error: "Refresh token required" });

    try {
      const response = await axios.post("https://www.strava.com/api/v3/oauth/token", {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: refreshToken
      });
      res.json(response.data);
    } catch (error) {
      console.error("Strava token refresh error:", error);
      res.status(500).json({ error: "Failed to refresh token" });
    }
  });

  // Strava Activity Sync
  app.get(["/api/strava/activities", "*/api/strava/activities"], async (req, res) => {
    const { accessToken } = req.query;
    if (!accessToken) return res.status(400).json({ error: "Access token required" });

    try {
      const response = await axios.get("https://www.strava.com/api/v3/athlete/activities", {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { per_page: 30 }
      });
      res.json(response.data);
    } catch (error) {
      console.error("Strava activities fetch error:", error);
      res.status(500).json({ error: "Failed to fetch Strava activities" });
    }
  });

  // Strava Detailed Activity
  app.get(["/api/strava/activities/:id", "*/api/strava/activities/:id"], async (req, res) => {
    const { id } = req.params;
    const { accessToken } = req.query;
    if (!accessToken) return res.status(400).json({ error: "Access token required" });

    try {
      const response = await axios.get(`https://www.strava.com/api/v3/activities/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      res.json(response.data);
    } catch (error) {
      console.error("Strava detailed activity fetch error:", error);
      res.status(500).json({ error: "Failed to fetch detailed Strava activity" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite middleware");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // SPA Fallback for development (must be after vite.middlewares)
    app.get('*', async (req, res, next) => {
      // Skip if it looks like a file request
      if (req.path.includes('.') && !req.path.endsWith('.html')) {
        return next();
      }
      
      const url = req.originalUrl;
      try {
        let template = await vite.transformIndexHtml(url, await fs.readFile(path.join(process.cwd(), 'index.html'), 'utf-8'));
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`Starting server in PRODUCTION mode, serving from: ${distPath}`);
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
