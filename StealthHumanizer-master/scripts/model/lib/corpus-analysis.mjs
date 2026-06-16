/**
 * Reusable corpus analysis functions for extracting writing style statistics
 * from academic paper corpora.
 */

// ==================== TEXT HELPERS ====================

export function splitSentences(text) {
  const sentences = [];
  let current = '';
  let i = 0;
  const abbreviations = ['Mr.', 'Mrs.', 'Dr.', 'Prof.', 'Inc.', 'Ltd.', 'etc.', 'e.g.', 'i.e.', 'vs.', 'al.'];
  while (i < text.length) {
    current += text[i];
    if (['.', '!', '?'].includes(text[i])) {
      const before = text.slice(Math.max(0, i - 5), i + 1);
      if (!abbreviations.some(abbr => before.endsWith(abbr))) {
        if (text[i + 1] === '"' || text[i + 1] === "'") { current += text[i + 1]; i++; }
        const trimmed = current.trim();
        if (trimmed.length > 0) sentences.push(trimmed);
        current = '';
      }
    }
    i++;
  }
  const trimmed = current.trim();
  if (trimmed.length > 0) sentences.push(trimmed);
  return sentences;
}

export function splitParagraphs(text) {
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
}

export function getWords(text) {
  return text.toLowerCase().replace(/[^\w\s'-]/g, '').split(/\s+/).filter(w => w.length > 0);
}

// ==================== STATISTICAL HELPERS ====================

export function mean(arr) {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

export function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const low = Math.floor(idx);
  const high = Math.ceil(idx);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (idx - low);
}

export function frequencyMap(words) {
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return freq;
}

// ==================== CORE ANALYSIS FUNCTIONS ====================

export function analyzeSentenceLengths(sentences) {
  const lengths = sentences.map(s => getWords(s).length);
  if (lengths.length === 0) return { mean: 0, median: 0, stddev: 0, min: 0, max: 0, p10: 0, p25: 0, p75: 0, p90: 0 };
  return {
    mean: +mean(lengths).toFixed(1),
    median: +percentile(lengths, 50).toFixed(1),
    stddev: +stddev(lengths).toFixed(1),
    min: Math.min(...lengths),
    max: Math.max(...lengths),
    p10: +percentile(lengths, 10).toFixed(1),
    p25: +percentile(lengths, 25).toFixed(1),
    p75: +percentile(lengths, 75).toFixed(1),
    p90: +percentile(lengths, 90).toFixed(1),
  };
}

export function calculateBurstiness(sentences) {
  const lengths = sentences.map(s => getWords(s).length);
  if (lengths.length < 3) return 0;
  const m = mean(lengths);
  if (m === 0) return 0;
  return stddev(lengths) / m;
}

export function calculateVocabularyDiversity(text) {
  const words = getWords(text).filter(w => w.length > 2);
  if (words.length < 10) return 0;
  return new Set(words).size / words.length;
}

const TRANSITION_WORDS = [
  'however', 'therefore', 'moreover', 'furthermore', 'additionally',
  'consequently', 'nevertheless', 'meanwhile', 'subsequently', 'thus',
  'hence', 'accordingly', 'similarly', 'likewise', 'conversely',
  'otherwise', 'instead', 'rather', 'yet', 'still',
];

export function countTransitions(text, wordCount) {
  const lower = text.toLowerCase();
  const freq = {};
  for (const w of TRANSITION_WORDS) {
    const regex = new RegExp(`\\b${w}\\b`, 'gi');
    const matches = lower.match(regex);
    if (matches) freq[w] = matches.length;
  }
  // Normalize per 1000 words
  const per1000 = {};
  for (const [word, count] of Object.entries(freq)) {
    per1000[word] = +((count / Math.max(wordCount, 1)) * 1000).toFixed(2);
  }
  return per1000;
}

const AI_PHRASES = [
  'it is important to note', 'it is worth mentioning', 'delve into', 'tapestry of',
  'navigating the landscape', 'it is crucial', 'it is essential', 'in conclusion',
  'a myriad of', 'multifaceted', 'robust', 'seamless', 'synergy', 'paradigm shift',
  'groundbreaking', 'transformative', 'unprecedented', 'embark on a journey',
  'sheds light on', 'brings to the forefront', 'plays a crucial role',
  'plays a pivotal role', 'has the potential to', 'in the contemporary landscape',
  'in the current landscape', 'holistic', 'cutting-edge', 'state-of-the-art',
  'it is evident that', 'it is clear that', 'underscore', 'streamline',
];

export function countAIPhrases(text, wordCount) {
  const lower = text.toLowerCase();
  const freq = {};
  for (const phrase of AI_PHRASES) {
    const regex = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = lower.match(regex);
    if (matches) freq[phrase] = matches.length;
  }
  const per1000 = {};
  for (const [phrase, count] of Object.entries(freq)) {
    per1000[phrase] = +((count / Math.max(wordCount, 1)) * 1000).toFixed(3);
  }
  return per1000;
}

export function analyzeSentenceStarters(sentences) {
  const starters = {};
  for (const s of sentences) {
    const firstWord = s.split(/\s+/)[0].toLowerCase().replace(/[^a-z'-]/g, '');
    if (firstWord.length > 0) starters[firstWord] = (starters[firstWord] || 0) + 1;
  }
  return starters;
}

export function countContractions(text, wordCount) {
  const matches = text.match(/\w+'(?:t|s|re|ve|ll|d|m)\b/gi);
  return +((matches ? matches.length : 0) / Math.max(wordCount, 1) * 1000).toFixed(2);
}

export function calculatePassiveRatio(sentences) {
  if (sentences.length === 0) return 0;
  const patterns = [
    /\b(is|are|was|were|been|being)\s+\w+ed\b/gi,
    /\b(is|are|was|were|been|being)\s+\w+en\b/gi,
  ];
  let passiveCount = 0;
  for (const s of sentences) {
    for (const p of patterns) {
      const m = s.match(p);
      if (m) passiveCount += m.length;
    }
  }
  return +((passiveCount / sentences.length) * 100).toFixed(1);
}

export function analyzeParagraphs(paragraphs) {
  const wordsPerParagraph = paragraphs.map(p => getWords(p).length);
  return {
    avgWordsPerParagraph: +mean(wordsPerParagraph).toFixed(1),
    paragraphCount: paragraphs.length,
    paragraphLengthStddev: +stddev(wordsPerParagraph).toFixed(1),
  };
}

export function analyzePunctuation(text, wordCount) {
  const emDash = (text.match(/—|–/g) || []).length;
  const semicolons = (text.match(/;/g) || []).length;
  const exclamations = (text.match(/!/g) || []).length;
  return {
    emDashPer1000: +((emDash / Math.max(wordCount, 1)) * 1000).toFixed(2),
    semicolonPer1000: +((semicolons / Math.max(wordCount, 1)) * 1000).toFixed(2),
    exclamationPer1000: +((exclamations / Math.max(wordCount, 1)) * 1000).toFixed(2),
  };
}

export function countFirstPersonPronouns(text, wordCount) {
  const matches = text.match(/\b(I|me|my|we|us|our|mine|ours)\b/gi);
  return +((matches ? matches.length : 0) / Math.max(wordCount, 1) * 1000).toFixed(2);
}

const HEDGING_PHRASES = [
  'it could be argued', 'one might consider', 'it is possible that',
  'it would seem', 'this suggests that', 'this may indicate',
  'it appears that', 'this could potentially', 'one could argue',
  'may', 'might', 'could', 'perhaps', 'possibly', 'arguably',
];

export function countHedging(text, wordCount) {
  const lower = text.toLowerCase();
  let count = 0;
  for (const phrase of HEDGING_PHRASES) {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    const m = lower.match(regex);
    if (m) count += m.length;
  }
  return +((count / Math.max(wordCount, 1)) * 1000).toFixed(2);
}

// ==================== FULL PAPER ANALYSIS ====================

export function analyzePaper(text) {
  const sentences = splitSentences(text);
  const paragraphs = splitParagraphs(text);
  const words = getWords(text);
  const wordCount = words.length;

  return {
    sentenceLengths: analyzeSentenceLengths(sentences),
    burstiness: +calculateBurstiness(sentences).toFixed(3),
    vocabularyDiversity: +calculateVocabularyDiversity(text).toFixed(3),
    transitionFrequency: countTransitions(text, wordCount),
    aiPhraseFrequency: countAIPhrases(text, wordCount),
    sentenceStarterDiversity: sentences.length > 0
      ? +(new Set(Object.keys(analyzeSentenceStarters(sentences))).size / sentences.length).toFixed(3)
      : 0,
    contractionFrequency: countContractions(text, wordCount),
    passiveVoiceRatio: calculatePassiveRatio(sentences),
    paragraphs: analyzeParagraphs(paragraphs),
    punctuation: analyzePunctuation(text, wordCount),
    firstPersonPronouns: countFirstPersonPronouns(text, wordCount),
    hedgingFrequency: countHedging(text, wordCount),
    wordCount,
    sentenceCount: sentences.length,
  };
}

// ==================== AGGREGATION ====================

export function aggregateStats(paperStats) {
  const sentenceLengths = paperStats.map(p => p.sentenceLengths.mean);
  const burstiness = paperStats.map(p => p.burstiness);
  const vocabDiv = paperStats.map(p => p.vocabularyDiversity);
  const contractions = paperStats.map(p => p.contractionFrequency);
  const passive = paperStats.map(p => p.passiveVoiceRatio);
  const firstPerson = paperStats.map(p => p.firstPersonPronouns);
  const hedging = paperStats.map(p => p.hedgingFrequency);

  // Aggregate transition words
  const allTransitions = {};
  for (const p of paperStats) {
    for (const [word, freq] of Object.entries(p.transitionFrequency)) {
      allTransitions[word] = (allTransitions[word] || 0) + freq;
    }
  }
  // Average them
  for (const word of Object.keys(allTransitions)) {
    allTransitions[word] = +(allTransitions[word] / paperStats.length).toFixed(2);
  }

  // Aggregate AI phrases
  const allAIPhrases = {};
  for (const p of paperStats) {
    for (const [phrase, freq] of Object.entries(p.aiPhraseFrequency)) {
      allAIPhrases[phrase] = (allAIPhrases[phrase] || 0) + freq;
    }
  }
  for (const phrase of Object.keys(allAIPhrases)) {
    allAIPhrases[phrase] = +(allAIPhrases[phrase] / paperStats.length).toFixed(3);
  }

  // Aggregate sentence starters
  const allStarters = {};
  for (const p of paperStats) {
    const starters = analyzeSentenceStarters(splitSentences(/* we don't have raw text here, use paper-level */ ''));
  }
  // Better: collect from all papers
  const starterFreq = {};
  let totalSentences = 0;
  // We need the raw text for starters, so we'll handle this in the extractor

  // Paragraph stats
  const avgParaWords = paperStats.map(p => p.paragraphs.avgWordsPerParagraph);
  const paraCount = paperStats.map(p => p.paragraphs.paragraphCount);

  // Punctuation
  const emDash = paperStats.map(p => p.punctuation.emDashPer1000);
  const semicolon = paperStats.map(p => p.punctuation.semicolonPer1000);
  const exclamation = paperStats.map(p => p.punctuation.exclamationPer1000);

  return {
    sentenceLengthDistribution: {
      mean: +mean(sentenceLengths).toFixed(1),
      stddev: +stddev(sentenceLengths).toFixed(1),
    },
    burstinessProfile: {
      mean: +mean(burstiness).toFixed(3),
      stddev: +stddev(burstiness).toFixed(3),
    },
    vocabularyDiversityRange: {
      min: +Math.min(...vocabDiv).toFixed(3),
      max: +Math.max(...vocabDiv).toFixed(3),
      mean: +mean(vocabDiv).toFixed(3),
    },
    transitionWordFrequency: allTransitions,
    aiPhraseFrequency: allAIPhrases,
    contractionFrequency: {
      mean: +mean(contractions).toFixed(2),
      stddev: +stddev(contractions).toFixed(2),
    },
    passiveVoiceRatio: {
      mean: +mean(passive).toFixed(1),
      stddev: +stddev(passive).toFixed(1),
    },
    firstPersonPronouns: {
      mean: +mean(firstPerson).toFixed(2),
      stddev: +stddev(firstPerson).toFixed(2),
    },
    hedgingFrequency: {
      mean: +mean(hedging).toFixed(2),
      stddev: +stddev(hedging).toFixed(2),
    },
    avgWordsPerParagraph: +mean(avgParaWords).toFixed(1),
    avgParagraphCount: +mean(paraCount).toFixed(1),
    punctuation: {
      emDashPer1000: { mean: +mean(emDash).toFixed(2), stddev: +stddev(emDash).toFixed(2) },
      semicolonPer1000: { mean: +mean(semicolon).toFixed(2), stddev: +stddev(semicolon).toFixed(2) },
      exclamationPer1000: { mean: +mean(exclamation).toFixed(2), stddev: +stddev(exclamation).toFixed(2) },
    },
  };
}
