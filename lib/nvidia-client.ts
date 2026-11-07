import OpenAI from 'openai';

const nvidiaApiKey = process.env.NVIDIA_API_KEY || '';

export const nvidiaClient = new OpenAI({
  baseURL: 'https://integrate.api.nvidia.com/v1',
  apiKey: nvidiaApiKey,
});

// Priority list of models confirmed available in NVIDIA API Catalog for this key
export const MODEL_PRIORITY = [
  'nvidia/llama-3.1-nemotron-70b-instruct',
  'nvidia/llama-3.1-nemotron-51b-instruct',
  'mistralai/mistral-large-2-instruct',
  'mistralai/mistral-7b-instruct-v0.3',
  'nv-mistralai/mistral-nemo-12b-instruct',
  'google/gemma-3-12b-it',
];

let _resolvedModel: string | null = null;

export async function getModel(): Promise<string> {
  if (_resolvedModel) return _resolvedModel;

  try {
    const response = await nvidiaClient.models.list();
    const available = new Set(response.data.map((m) => m.id));
    const match = MODEL_PRIORITY.find((m) => available.has(m));
    if (match) {
      _resolvedModel = match;
      console.log(`[NVIDIA NIM] Resolved active model: ${_resolvedModel}`);
      return _resolvedModel;
    }
  } catch (err) {
    console.warn('[NVIDIA NIM] Could not fetch models list, using default priority model.', err);
  }

  _resolvedModel = MODEL_PRIORITY[0];
  return _resolvedModel;
}

export interface ChatOptions {
  max_tokens?: number;
  temperature?: number;
}

/**
 * Executes a chat completion against NVIDIA NIM with automatic model fallback.
 */
export async function chatWithFallback(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  options: ChatOptions = {}
): Promise<{ content: string; modelUsed: string }> {
  const preferredModel = await getModel();
  const candidates = [
    preferredModel,
    ...MODEL_PRIORITY.filter((m) => m !== preferredModel),
  ];

  let lastError: Error | null = null;

  for (const model of candidates) {
    try {
      console.log(`[NVIDIA NIM] Invoking model: ${model}`);
      const completion = await nvidiaClient.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.1,
        max_tokens: options.max_tokens ?? 400,
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? '';
      if (raw) {
        return { content: raw, modelUsed: model };
      }
    } catch (err: unknown) {
      const errorObj = err as { status?: number; response?: { status?: number }; message?: string };
      const status = errorObj?.status ?? errorObj?.response?.status;
      console.warn(
        `[NVIDIA NIM] Model "${model}" failed (HTTP ${status || 'unknown'}: ${errorObj?.message}). Attempting fallback...`
      );
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new Error(
    `All NVIDIA NIM models in the fallback chain were exhausted. Last error: ${lastError?.message || 'unknown'}`
  );
}

/**
 * Utility to safely parse JSON from LLM responses even if wrapped in markdown codeblocks.
 */
export function extractJsonFromResponse<T = unknown>(rawText: string): T {
  let cleaned = rawText.trim();

  // Strip markdown code fences if present (e.g. ```json ... ``` or ``` ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  // Find the first '{' and last '}'
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    cleaned = cleaned.substring(start, end + 1);
  }

  return JSON.parse(cleaned) as T;
}

