// 🗑️ NOOB EXPLAINER: What is "AI Slop"?
// "Slop" is the collective term for words and phrases that AI models
// use WAY more than humans do. Think of it as AI's verbal tic.
// When a detector sees "delve" + "tapestry" + "landscape" + "multifaceted"
// in the same text, it knows an AI wrote it.
//
// This detector counts how many slop words appear and how dense they are.

const SLOP_WORDS: Array<{ word: string; replacement: string; severity: 'low' | 'medium' | 'high' }> = [
  // High severity — almost never used by humans
  { word: 'delve', replacement: 'dig into', severity: 'high' },
  { word: 'tapestry', replacement: 'mix', severity: 'high' },
  { word: 'beacon', replacement: 'signal', severity: 'high' },
  { word: 'landscape', replacement: 'area', severity: 'high' },
  { word: 'realm', replacement: 'area', severity: 'high' },
  { word: 'multifaceted', replacement: 'complex', severity: 'high' },
  { word: 'nuanced', replacement: 'subtle', severity: 'medium' },
  { word: 'holistic', replacement: 'complete', severity: 'medium' },
  { word: 'synergy', replacement: 'cooperation', severity: 'high' },
  { word: 'paradigm', replacement: 'model', severity: 'medium' },
  { word: 'transformative', replacement: 'big', severity: 'medium' },
  { word: 'unprecedented', replacement: 'never before seen', severity: 'medium' },
  { word: 'robust', replacement: 'strong', severity: 'medium' },
  { word: 'seamless', replacement: 'smooth', severity: 'medium' },
  { word: 'streamline', replacement: 'simplify', severity: 'low' },
  { word: 'leverage', replacement: 'use', severity: 'medium' },
  { word: 'facilitate', replacement: 'help', severity: 'medium' },
  { word: 'foster', replacement: 'encourage', severity: 'low' },
  { word: 'cultivate', replacement: 'grow', severity: 'low' },
  { word: 'empower', replacement: 'enable', severity: 'low' },
  { word: 'embark', replacement: 'start', severity: 'medium' },
  { word: 'navigate', replacement: 'deal with', severity: 'medium' },
  { word: 'underscores', replacement: 'shows', severity: 'medium' },
  { word: 'sheds light', replacement: 'shows', severity: 'medium' },
  { word: 'brings to the forefront', replacement: 'highlights', severity: 'high' },
  { word: 'in today\'s world', replacement: 'today', severity: 'high' },
  { word: 'in this day and age', replacement: 'nowadays', severity: 'high' },
  { word: 'cutting-edge', replacement: 'latest', severity: 'medium' },
  { word: 'state-of-the-art', replacement: 'best available', severity: 'medium' },
  { word: 'groundbreaking', replacement: 'major', severity: 'medium' },
  { word: 'comprehensive', replacement: 'thorough', severity: 'low' },
  { word: 'innovative', replacement: 'new', severity: 'medium' },
  { word: 'pivotal', replacement: 'key', severity: 'medium' },
  { word: 'resonate', replacement: 'connect', severity: 'medium' },
  { word: 'underscore', replacement: 'show', severity: 'low' },
];

export interface SlopDetectionResult {
  score: number;            // 0-100 (100 = very human, 0 = very AI)
  slopCount: number;        // Number of slop words found
  slopDensity: number;      // Slop words per 1000 words
  found: Array<{
    word: string;
    replacement: string;
    severity: 'low' | 'medium' | 'high';
    position: number;       // Character position in text
  }>;
}

export function detectSlopWords(text: string): SlopDetectionResult {
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;
  const found: SlopDetectionResult['found'] = [];

  for (const slop of SLOP_WORDS) {
    const regex = new RegExp(`\\b${slop.word}\\b`, 'gi');
    let match;
    while ((match = regex.exec(lower)) !== null) {
      found.push({
        word: slop.word,
        replacement: slop.replacement,
        severity: slop.severity,
        position: match.index,
      });
    }
  }

  const slopDensity = wordCount > 0 ? (found.length / wordCount) * 1000 : 0;
  
  // Score: 0 density = 100 (perfect), 10+ per 1000 words = 0 (very AI)
  const score = Math.max(0, Math.min(100, 100 - slopDensity * 15));

  return {
    score: Math.round(score),
    slopCount: found.length,
    slopDensity: Math.round(slopDensity * 100) / 100,
    found,
  };
}

export function getSlopWords(): typeof SLOP_WORDS {
  return SLOP_WORDS;
}
