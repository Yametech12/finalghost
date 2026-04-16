import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';

console.log("Server starting up...");

// Import routes
import { healthCheck } from './routes/health.js';
import { sendVerificationCode, verifyCode } from './routes/auth.js';
import { testAIKey, chatCompletion } from './routes/ai.js'; // No change needed, no hasGroqKey line exists

// Import middleware
import { setupMiddleware } from './middleware/common.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Setup middleware
setupMiddleware(app);

// Routes
app.get("/api/health", healthCheck);
app.post("/api/auth/send-code", sendVerificationCode);
app.post("/api/auth/verify-code", verifyCode);
app.get("/api/ai/test-key", testAIKey);
app.post("/api/ai/chat", chatCompletion);

// Static file serving for production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));

  // Catch all handler: send back React's index.html file for client-side routing
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
}

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// Global error handling for debugging
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// For local development
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

export default app;