// 🎤 NOOB EXPLAINER: What is VoicePrint?
// Just like your voice has a unique sound (your "voice print"),
// your WRITING has a unique style. VoicePrint analyzes your writing
// and creates a "profile" of your style — how long your sentences
// are, how often you use contractions, whether you write in active
// or passive voice, etc.
//
// Then when we humanize text, instead of making it sound like "a
// generic human," we make it sound like YOU specifically.
// No other humanizer does this — it's StealthHumanizer's superpower!

export interface VoicePrintProfile {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  sampleCount: number;
  sampleHashes: string[];     // SHA-256 hashes of the samples used

  // === LINGUISTIC FEATURES ===
  // 📏 NOOB EXPLAINER: Sentence length stats
  // Humans vary their sentence lengths A LOT. Some write short punchy
  // sentences. Others write long flowing ones. VoicePrint measures
  // YOUR typical sentence length and variation.
  avgSentenceLength: number;       // Average words per sentence
  sentenceLengthStdDev: number;    // How much sentence lengths vary

  // 📚 NOOB EXPLAINER: Vocabulary richness
  // Some people use the same words over and over. Others use a rich
  // vocabulary. "Type-token ratio" measures this: if you use 100
  // words and 70 are unique, your ratio is 0.70.
  typeTokenRatio: number;          // Unique words / total words (0-1)
  avgWordLength: number;           // Average word length in characters

  // === PUNCTUATION PATTERNS ===
  contractionRate: number;         // Contractions per 100 words (e.g., "don't", "it's")
  emDashRate: number;              // Em-dashes per 1000 words
  semicolonRate: number;           // Semicolons per 1000 words
  parentheticalRate: number;       // Parenthetical asides per 1000 words
  exclamationRate: number;         // Exclamation marks per 1000 words

  // === SYNTAX PATTERNS ===
  // 🔄 NOOB EXPLAINER: Passive voice
  // "The ball was thrown by John" = passive voice (thing receives action)
  // "John threw the ball" = active voice (thing does action)
  // AI overuses passive voice. Humans mix both.
  passiveVoiceRatio: number;       // 0-1, fraction of passive sentences
  avgClauseLength: number;         // Average words per clause
  subordinationRate: number;       // Subordinate clauses per sentence

  // === VOICE MARKERS ===
  firstPersonRate: number;         // "I/we" per 1000 words
  secondPersonRate: number;        // "you" per 1000 words
  hedgingRate: number;             // Hedging phrases per 1000 words

  // === SENTENCE STARTERS ===
  topSentenceStarters: string[];   // Top 10 most common first words
  conjunctionStartRate: number;    // Sentences starting with And/But/So (0-1)

  // === VOCABULARY ===
  preferredTransitions: string[];  // Transition words this person uses
  avoidedPhrases: string[];        // AI phrases this person NEVER uses

  // === PARAGRAPH STRUCTURE ===
  paragraphLengthMean: number;     // Average sentences per paragraph
  paragraphLengthStdDev: number;   // How much paragraph lengths vary

  // === SEMANTIC EMBEDDING ===
  // 🧬 NOOB EXPLAINER: Style embedding
  // This is a list of 384 numbers that represents your writing style
  // as a point in "style space." Two writers with similar styles will
  // have embeddings that are close together. This helps us find the
  // closest matching profile for any new text.
  styleEmbedding?: number[];       // 384-dim style centroid vector
}

export interface VoicePrintComparison {
  profileA: string;
  profileB: string;
  overallSimilarity: number;       // 0-1
  dimensionDifferences: {
    dimension: string;
    valueA: number;
    valueB: number;
    difference: number;
  }[];
}

// The minimum number of writing samples needed to create a profile
export const MIN_SAMPLES = 3;
// The maximum number of writing samples a profile can use
export const MAX_SAMPLES = 10;
