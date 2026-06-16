// 🧠 NOOB EXPLAINER: How semantic caching works
// 1. User submits text for humanization
// 2. We check: "Have we seen SIMILAR text before with the same settings?"
// 3. If YES (cache hit): Return the cached result instantly — no API call needed
// 4. If NO (cache miss): Process normally, then store the result for next time
//
// "Similar" is measured by comparing the mathematical "embedding" of the text.
// An embedding is a list of numbers that captures meaning. Similar text = similar numbers.
// We compare these numbers using "cosine similarity" (0 = totally different, 1 = identical).

import type { CacheEntry, CacheKeyOptions, SemanticCacheConfig } from './types';
import { DEFAULT_CACHE_CONFIG } from './types';

const CACHE_STORAGE_KEY = 'stealthhumanizer_semantic_cache';

// 🧮 NOOB EXPLAINER: Cosine similarity
// This measures how "aligned" two vectors are. Think of it as measuring
// the angle between two arrows: same direction = 1.0, perpendicular = 0.0,
// opposite direction = -1.0. For text similarity, we want scores > 0.9.
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 0 ? dotProduct / denominator : 0;
}

// Simple hash function for text
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// 🏠 NOOB EXPLAINER: Text fingerprinting
// Instead of using a full embedding model (which requires an API call),
// we create a simple "fingerprint" from the text. This is faster but
// less accurate than real embeddings. Good enough for cache lookups!
function textFingerprint(text: string): number[] {
  // Create a simple 64-dim fingerprint from character n-gram frequencies
  const dim = 64;
  const vector = new Array(dim).fill(0);
  const normalized = text.toLowerCase().trim();
  
  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.slice(i, i + 3);
    let hash = 0;
    for (let j = 0; j < trigram.length; j++) {
      hash = ((hash << 5) - hash) + trigram.charCodeAt(j);
      hash = hash & hash;
    }
    const idx = Math.abs(hash) % dim;
    vector[idx] += 1;
  }
  
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return magnitude > 0 ? vector.map(v => v / magnitude) : vector;
}

function optionsMatch(a: CacheKeyOptions, b: CacheKeyOptions): boolean {
  return a.level === b.level && a.style === b.style && a.tone === b.tone
    && (a.language || 'en') === (b.language || 'en');
}

function isExpired(entry: CacheEntry, ttlMs: number): boolean {
  return Date.now() - entry.timestamp > ttlMs;
}

export class SemanticCache {
  private entries: CacheEntry[] = [];
  private config: SemanticCacheConfig;

  constructor(config: Partial<SemanticCacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.loadFromStorage();
  }

  // 🔍 Look up a similar text in the cache
  async get(inputText: string, options: CacheKeyOptions): Promise<CacheEntry | null> {
    if (!this.config.enabled) return null;

    const inputFingerprint = textFingerprint(inputText);
    const inputHash = simpleHash(inputText);

    // First: exact hash match (fastest)
    const exactMatch = this.entries.find(
      e => e.inputHash === inputHash && optionsMatch(e.options, options) && !isExpired(e, this.config.ttlMs)
    );
    if (exactMatch) {
      exactMatch.hitCount++;
      this.saveToStorage();
      return exactMatch;
    }

    // Second: semantic similarity match (slower but catches paraphrases)
    let bestMatch: CacheEntry | null = null;
    let bestSimilarity = 0;

    for (const entry of this.entries) {
      if (isExpired(entry, this.config.ttlMs)) continue;
      if (!optionsMatch(entry.options, options)) continue;

      const similarity = entry.inputEmbedding
        ? cosineSimilarity(inputFingerprint, entry.inputEmbedding)
        : 0;

      if (similarity > bestSimilarity && similarity >= this.config.similarityThreshold) {
        bestSimilarity = similarity;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      bestMatch.hitCount++;
      this.saveToStorage();
      return bestMatch;
    }

    return null;
  }

  // 💾 Store a new result in the cache
  async set(inputText: string, result: Omit<CacheEntry, 'id' | 'inputHash' | 'inputEmbedding' | 'hitCount'>): Promise<void> {
    if (!this.config.enabled) return;

    const entry: CacheEntry = {
      ...result,
      id: `cache-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      inputHash: simpleHash(inputText),
      inputText: inputText.slice(0, 200), // Store first 200 chars for debugging
      inputEmbedding: textFingerprint(inputText),
      hitCount: 0,
    };

    this.entries.push(entry);

    // Evict oldest entries if over max
    while (this.entries.length > this.config.maxEntries) {
      this.entries.shift();
    }

    this.saveToStorage();
  }

  // 🗑️ Clear the entire cache
  clear(): void {
    this.entries = [];
    this.saveToStorage();
  }

  // 📊 Get cache statistics
  getStats(): { totalEntries: number; totalHits: number; estimatedSavings: number } {
    const totalHits = this.entries.reduce((sum, e) => sum + e.hitCount, 0);
    const estimatedSavings = this.entries.reduce((sum, e) => sum + e.tokenCost * e.hitCount, 0);
    return {
      totalEntries: this.entries.length,
      totalHits,
      estimatedSavings,
    };
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const data = localStorage.getItem(CACHE_STORAGE_KEY);
      if (data) this.entries = JSON.parse(data);
    } catch {
      this.entries = [];
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      // Storage full — evict oldest
      this.entries.splice(0, Math.floor(this.entries.length / 2));
      try {
        localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(this.entries));
      } catch {
        // Give up
      }
    }
  }
}

// Singleton instance
let cacheInstance: SemanticCache | null = null;

export function getSemanticCache(): SemanticCache {
  if (!cacheInstance) {
    cacheInstance = new SemanticCache();
  }
  return cacheInstance;
}
