// OpenRouter model configuration - using reliable models
export const DEFAULT_MODEL = "microsoft/wizardlm-2-8x22b";
// Fallback models in order of preference
export const FALLBACK_MODELS = [
  "microsoft/wizardlm-2-8x22b",
  "meta-llama/llama-3.1-8b-instruct:free",
  "anthropic/claude-3-haiku",
  "openai/gpt-3.5-turbo",
  "google/gemma-2-9b-it:free"
];
// Vision support enabled with OpenRouter
export const VISION_MODEL = "openai/gpt-4o-mini";

export async function chatCompletion(
  messages: any[],
  model: string = DEFAULT_MODEL,
  options: any = {}
): Promise<any> {
  const modelsToTry = model === DEFAULT_MODEL ? [DEFAULT_MODEL, ...FALLBACK_MODELS] : [model];

  let lastError: Error | null = null;

  for (const modelToTry of modelsToTry) {
    try {
      const requestBody: any = {
        model: modelToTry,
        messages: messages,
        temperature: options.temperature || 0.7,
        top_p: options.top_p || 1.0,
        stream: options.stream || false,
      };

      const maxTokens = options.max_tokens || options.config?.maxOutputTokens || 4096;
      if (maxTokens) {
        requestBody.max_tokens = maxTokens;
      }

      if (options.response_format) {
        requestBody.response_format = { type: "json_object" };
      }

      const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
      const response = await fetch(
        `${apiBase}/ai/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        let errorData: { error?: { message?: string }; details?: string } = {};
        try {
          errorData = await response.json();
        } catch {}

        const errorMessage =
          errorData?.error?.message ||
          errorData?.details ||
          errorData?.error ||
          response.statusText ||
          "Unknown error";

        // If it's a 404 (model not found), try next model
        if (response.status === 404 || errorMessage.includes('endpoints found')) {
          console.warn(`Model ${modelToTry} not available, trying next model...`);
          lastError = new Error(`AI API error: ${response.status} - ${errorMessage}`);
          continue;
        }

        // For other errors, throw immediately
        throw new Error(`AI API error: ${response.status} - ${errorMessage}`);
      }

      console.log(`Successfully using model: ${modelToTry}`);

      if (options.stream) {
        return (async function* () {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder("utf-8");
          if (!reader) return;

          let buffer = "";
          while (true) {
            try {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";
              for (const line of lines) {
                if (line.startsWith("data: ") && line !== "data: [DONE]") {
                  try {
                    const data = JSON.parse(line.slice(6));
                    yield data;
                  } catch (e) {
                    console.error("Error parsing stream chunk", e);
                  }
                }
              }
            } catch (e) {
              console.error("Error reading stream chunk", e);
              break;
            }
          }
        })();
      } else {
        return await response.json();
      }
    } catch (error) {
      lastError = error as Error;
      console.warn(`Failed with model ${modelToTry}:`, error);

      // If it's a network error or 5xx, don't try other models
      if (error instanceof Error &&
          (error.message.includes('fetch') ||
           error.message.includes('network') ||
           error.message.includes('500') ||
           error.message.includes('502') ||
           error.message.includes('503'))) {
        throw error;
      }

      // Continue to next model for 4xx errors (likely model-specific)
      continue;
    }
  }

  // If all models failed, throw the last error
  throw lastError || new Error("All AI models failed");
}