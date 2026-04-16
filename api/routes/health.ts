import { Request, Response } from 'express';
import { getFirebaseConfig, getApiKey } from '../services/firebase.js';
import { AI_PROVIDER } from '../services/ai.js';

export async function healthCheck(_req: Request, res: Response) {
  const config = getFirebaseConfig();
  const gmailUser = (process.env.GMAIL_USER || '').trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || '').trim();
  const openrouterKeyEnv = process.env.OPENROUTER_API_KEY || '';
  const openrouterKey = await getApiKey();

  res.json({
    status: "ok",
    env: process.env.NODE_ENV,
    firebase: !!config.apiKey,
    smtp: !!gmailUser && !!gmailPass,
    openrouter: !!openrouterKey,
    openrouterEnvSet: !!openrouterKeyEnv,
    aiProvider: AI_PROVIDER,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}

