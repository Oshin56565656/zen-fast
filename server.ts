import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

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

  // Strava OAuth URL
  app.get("/api/auth/strava/url", (req, res) => {
    const clientRedirectUri = req.query.redirectUri as string;
    const redirectUri = clientRedirectUri || `${APP_URL}/auth/strava/callback`;
    
    const params = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID!,
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
  app.get("/api/auth/strava/refresh", async (req, res) => {
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
  app.get("/api/strava/activities", async (req, res) => {
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
  app.get("/api/strava/activities/:id", async (req, res) => {
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
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
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
