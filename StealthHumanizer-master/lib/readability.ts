// StealthHumanizer v2 - Readability Metrics

import { ReadabilityScores } from './types';

function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function countSentences(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  return Math.max(sentences.length, 1);
}

function getWords(text: string): string[] {
  return text.split(/\s+/).filter(w => w.length > 0);
}

export function calculateReadability(text: string): ReadabilityScores {
  const words = getWords(text);
  const sentences = countSentences(text);
  const totalWords = Math.max(words.length, 1);
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const avgWordsPerSentence = totalWords / sentences;
  const avgSyllablesPerWord = totalSyllables / totalWords;

  // Flesch Reading Ease (higher = easier to read, 0-100)
  const fleschReadingEase = Math.max(0, Math.min(100,
    206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
  ));

  // Flesch-Kincaid Grade Level
  const fleschKincaidGrade = Math.max(0,
    (0.39 * avgWordsPerSentence) + (11.8 * avgSyllablesPerWord) - 15.59
  );

  // Coleman-Liau Index
  const charCount = words.join('').length;
  const avgCharsPerWord = charCount / totalWords;
  const L = avgCharsPerWord * 100;
  const S = (sentences / totalWords) * 100;
  const colemanLiauIndex = (0.0588 * L) - (0.296 * S) - 15.8;

  // Reading time (avg adult reads ~200-250 words per minute)
  const readingTimeMinutes = totalWords / 225;

  return {
    fleschReadingEase: Math.round(fleschReadingEase * 10) / 10,
    fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
    colemanLiauIndex: Math.round(colemanLiauIndex * 10) / 10,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 10) / 10,
    readingTimeMinutes: Math.round(readingTimeMinutes * 10) / 10,
    totalSentences: sentences,
    totalWords: words.length,
    totalSyllables: totalSyllables,
  };
}

export function getReadabilityLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Very Easy', color: 'text-green-400' };
  if (score >= 80) return { label: 'Easy', color: 'text-green-300' };
  if (score >= 70) return { label: 'Fairly Easy', color: 'text-yellow-300' };
  if (score >= 60) return { label: 'Standard', color: 'text-yellow-400' };
  if (score >= 50) return { label: 'Fairly Difficult', color: 'text-orange-400' };
  if (score >= 30) return { label: 'Difficult', color: 'text-red-400' };
  return { label: 'Very Difficult', color: 'text-red-500' };
}

export function getGradeLevelDescription(grade: number): string {
  if (grade <= 5) return 'Elementary school level';
  if (grade <= 8) return 'Middle school level';
  if (grade <= 12) return 'High school level';
  if (grade <= 16) return 'College level';
  return 'Graduate level';
}
