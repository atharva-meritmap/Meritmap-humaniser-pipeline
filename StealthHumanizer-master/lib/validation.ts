/**
 * Input validation helpers for API routes.
 */

export function validateString(value: unknown, fieldName: string, maxLength?: number): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `${fieldName} must be a non-empty string`;
  }
  if (maxLength && value.length > maxLength) {
    return `${fieldName} exceeds maximum length of ${maxLength} characters`;
  }
  return null;
}

export function validateModel(model: unknown): string | null {
  const validModels = [
    'gemini', 'openai', 'claude', 'groq', 'mistral', 'cohere',
    'together', 'openrouter', 'cerebras', 'deepinfra', 'huggingface',
    'cloudflare', 'zai', 'codebuff', 'command-code',
    'opencode-zen', 'opencode-go', 'crof', 'ocenza',
    'mimo', 'nvidia-nim', 'kilo-gateway', 'nous-research',
    'perplexity', 'fireworks', 'openadapter', 'zai-coding',
    'google-gemini-oauth', 'ollama', 'lm-studio',
    'vllm', 'opencode-zen-anthropic', 'opencode-go-anthropic',
  ];
  if (typeof model !== 'string' || !validModels.includes(model)) {
    return 'Invalid model provider';
  }
  return null;
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
