import { getApiKey } from '../../services/firebase.js';
import { AI_PROVIDER, API_URL } from '../../services/ai.js';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface ChatRequest {
  messages?: Message[];
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}

async function chatWithOpenRouter(body: ChatRequest, apiKeyVal: string, retries = 3, delay = 1000) {
  const url = API_URL;

  const requestBody = {
    model: body.model || "anthropic/claude-3.5-sonnet",
    messages: body.messages || [],
    temperature: body.temperature || 0.7,
    top_p: body.top_p || 1.0,
    max_tokens: body.max_tokens || 4096,
    stream: body.stream || false
  };

  const headers = {
    'Authorization': `Bearer ${apiKeyVal}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://epimetheus.ai',
    'X-Title': process.env.OPENROUTER_TITLE || 'Epimetheus'
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        return response;
      }

      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429 && attempt < retries) {
        const wait = delay * Math.pow(2, attempt - 1);
        console.warn(`Rate limit (429), waiting ${wait}ms before retry ${attempt}/${retries}`);
        await new Promise(resolve => setTimeout(resolve, wait));
        continue;
      }

      const errorMsg = errorData.error?.message || response.statusText || 'Unknown error';
      throw new Error(`HTTP ${response.status}: ${errorMsg}`);
    } catch (error: unknown) {
      if (attempt === retries) throw error;
      console.warn(`Attempt ${attempt} failed, retrying:`, error);
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log("AI chat request received via OpenRouter");

  try {
    const key = await getApiKey();
    if (!key) {
      console.error("OpenRouter API key missing");
      return res.status(500).json({ error: "OpenRouter API key not configured on server." });
    }

    console.log("OpenRouter API key found, provider:", AI_PROVIDER);

    const body: ChatRequest = req.body;

    // Image/vision support - pass through as-is (OpenRouter handles it)
    const hasImages = Array.isArray(body.messages) && body.messages.some((m: any) => {
      if (typeof m.content !== 'object') return false;
      return Array.isArray(m.content) && m.content.some((c: any) => c.type === "image_url");
    });

    console.log("Vision detection:", { hasImages, messagesCount: body.messages?.length || 0 });

    const response = await chatWithOpenRouter(body, key);

    if (body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        res.status(500).json({ error: 'Streaming not supported by response' });
        return;
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              const data = line.slice(6);
              if (data.trim()) res.write(`data: ${data}\n\n`);
            }
          }
        }
        res.write('data: [DONE]\n\n');
      } catch (e) {
        console.error('Stream error:', e);
      } finally {
        reader.releaseLock();
      }
      res.end();
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error: unknown) {
    console.error("OpenRouter proxy error:", error);
    const errorMsg = (error as Error).message;
    res.status(500).json({ error: `AI API error: ${errorMsg}` });
  }
}