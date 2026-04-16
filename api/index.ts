import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';

console.log("Server starting...");

import { getFirebaseConfig, getApiKey } from './firebase.js';
import { AI_PROVIDER, API_URL } from './ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// Preflight
app.options('*', (_req, res) => {
  res.status(204).end();
});

// Combined route handlers (single function)
app.get("/api/health", async (_req, res) => {
  const config = getFirebaseConfig();
  const openrouterKey = await getApiKey();
  res.json({
    status: "ok",
    env: process.env.NODE_ENV,
    firebase: !!config.apiKey,
    openrouter: !!openrouterKey,
    aiProvider: AI_PROVIDER,
    timestamp: new Date().toISOString()
  });
});

app.post("/api/auth/send-code", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    
    const codes = new Map();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    codes.set(email, { code, expires: Date.now() + 600000 });
    
    console.log(`Verification code for ${email}: ${code}`);
    res.json({ success: true, message: "Code sent" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send code" });
  }
});

app.post("/api/auth/verify-code", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: "Email and code required" });
    
    res.json({ success: true, user: { email }, message: "Verified" });
  } catch (error) {
    res.status(500).json({ error: "Verification failed" });
  }
});

app.get("/api/ai/test-key", async (_req, res) => {
  try {
    const key = await getApiKey();
    if (!key) return res.json({ configured: false, error: "API key not configured" });
    
    res.json({ configured: true, provider: AI_PROVIDER });
  } catch (error) {
    res.status(500).json({ configured: false, error: "Test failed" });
  }
});

app.post("/api/ai/chat", async (req, res) => {
  try {
    const key = await getApiKey();
    if (!key) return res.status(500).json({ error: "API key not configured" });

    const { messages, model, temperature, max_tokens, stream } = req.body || {};
    
    const requestBody: any = {
      model: model || "openai/gpt-4o-mini",
      messages: messages || [],
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 4096,
      stream: stream || false
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://epimetheus.ai',
        'X-Title': process.env.OPENROUTER_TITLE || 'Epimetheus'
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(500).json({ error: errorData.error?.message || "Request failed" });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Chat request failed" });
  }
});

// Static serving
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Local dev
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;