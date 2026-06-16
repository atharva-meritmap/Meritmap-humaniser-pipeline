// 💾 NOOB EXPLAINER: What is "Semantic Caching"?
// Regular caching stores exact matches: "If someone asks THIS EXACT
// question, give them the same answer." But what if someone asks a
// SIMILAR question? Regular caching says "no match" and re-processes.
//
// Semantic caching is smarter: it understands MEANING. If you ask
// "How does photosynthesis work?" and someone else asked "How do
// plants convert sunlight to energy?", semantic caching recognizes
// these are THE SAME QUESTION and returns the cached answer.
//
// This saves money (fewer API calls) and time (instant results for
// similar inputs).

export interface CacheEntry {
  id: string;
  inputHash: string;         // SHA-256 hash of input text
  inputText: string;         // Original input text (for debugging)
  inputEmbedding?: number[]; // Vector representation of meaning
  outputText: string;        // Humanized result
  outputScore: number;       // Detection score
  provider: string;          // Which AI was used
  model: string;             // Which model was used
  options: CacheKeyOptions;  // Settings used
  timestamp: number;         // When cached
  tokenCost: number;         // Tokens saved by cache hit
  hitCount: number;          // How many times this was reused
}

export interface CacheKeyOptions {
  level: string;
  style: string;
  tone: string;
  language?: string;
  domain?: string;
}

export interface SemanticCacheConfig {
  similarityThreshold: number;  // cosine similarity for cache hit (default: 0.95)
  maxEntries: number;           // max cache size (default: 500)
  ttlMs: number;                // time-to-live in ms (default: 24 hours)
  enabled: boolean;             // on/off switch
}

export const DEFAULT_CACHE_CONFIG: SemanticCacheConfig = {
  similarityThreshold: 0.95,
  maxEntries: 500,
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
  enabled: true,
};
