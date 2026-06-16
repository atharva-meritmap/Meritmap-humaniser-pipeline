/**
 * Run an async mapping function over items with limited concurrency.
 */
export async function asyncMapConcurrent<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number = 3,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );

  await Promise.all(workers);
  return results;
}

/**
 * Process batch humanization using concurrency-limited execution.
 */
export async function processBatchHumanization(params: {
  texts: string[];
  level: string;
  style: string;
  tone: string;
  model: string;
  apiKey: string;
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTextLength: number;
  generateFn: (text: string, systemPrompt: string, options: { temperature: number; topP: number }) => Promise<string>;
  postprocessFn: (text: string, options: { light: boolean }) => string;
  detectFn: (text: string) => { score: number };
}): Promise<Array<{ index: number; input: string; output: string | null; finalScore?: number; error: string | null }>> {
  const {
    texts, systemPrompt, temperature, topP, maxTextLength,
    generateFn, postprocessFn, detectFn,
  } = params;

  return asyncMapConcurrent(
    texts,
    async (text: string, index: number) => {
      if (typeof text !== 'string' || text.trim().length === 0) {
        return { index, error: `Item at index ${index} must be a non-empty string`, input: String(text ?? ''), output: null };
      }
      if (text.length > maxTextLength) {
        return { index, error: `Item exceeds ${maxTextLength} character limit`, input: text, output: null };
      }
      try {
        const raw = await generateFn(text.trim(), systemPrompt, { temperature, topP });
        const humanized = postprocessFn(raw, { light: true });
        const detection = detectFn(humanized);
        return { index, input: text, output: humanized, finalScore: detection.score, error: null };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return { index, error: message, input: text, output: null };
      }
    },
    3,
  );
}
