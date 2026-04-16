import express from "express";

const router = express.Router();

router.get('/health', (_req, res) => {
  const config = {
    nodeEnv: process.env.NODE_ENV,
    hasFirebaseKey: !!process.env.VITE_FIREBASE_API_KEY || !!process.env.FIREBASE_API_KEY,
    hasGroqKey: !!process.env.GROQ_API_KEY,
    aiProvider: process.env.AI_PROVIDER || 'groq',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };

  res.json({
    status: 'ok',
    message: 'Epimetheus API is running',
    config: config
  });
});

export default router;