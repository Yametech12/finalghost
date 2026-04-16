export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const config = {
      nodeEnv: process.env.NODE_ENV,
      hasFirebaseKey: !!process.env.VITE_FIREBASE_API_KEY || !!process.env.FIREBASE_API_KEY,
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      aiProvider: process.env.AI_PROVIDER || 'openrouter',
      defaultModel: 'anthropic/claude-3.5-sonnet',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    res.json({
      status: 'ok',
      message: 'Epimetheus API is running',
      config: config
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
}