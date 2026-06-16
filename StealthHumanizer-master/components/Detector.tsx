'use client';

import { useState } from 'react';
import { Search, CheckCircle, HelpCircle, BarChart3, Zap, BookOpen } from 'lucide-react';
import { detectAI, getClassificationColor, getScoreColor, getScoreBarColor } from '@/lib/detector';
import { getReadabilityLabel, getGradeLevelDescription } from '@/lib/readability';
import { SAMPLE_AI_TEXT } from '@/lib/prompts';
import { countWords } from '@/lib/storage';

interface DetectorProps {
  showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
}

export default function Detector({ showToast }: DetectorProps) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<ReturnType<typeof detectAI> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDetect = () => {
    if (!text.trim()) { showToast('warning', 'Enter text to analyze.'); return; }
    setLoading(true);
    setTimeout(() => {
      const d = detectAI(text);
      setResult(d);
      setLoading(false);
      showToast('info', `Analysis: ${d.score}% human | Flesch: ${d.readability.fleschReadingEase}`);
    }, 300);
  };

  const scoreColor = result ? getScoreColor(result.score) : 'text-dark-400';
  const readLabel = result ? getReadabilityLabel(result.readability.fleschReadingEase) : null;
  const verdictIcon = result?.overallVerdict === 'human' ? CheckCircle : result?.overallVerdict === 'ai' ? HelpCircle : CheckCircle;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Search className="w-6 h-6 text-accent-400" /> Pattern Analysis
          </h2>
          <p className="text-dark-400 mt-1">Local heuristic analysis — perplexity, burstiness, patterns, readability</p>
        </div>
        <button onClick={() => { setText(SAMPLE_AI_TEXT); showToast('info', 'Sample loaded!'); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-dark-300 text-sm self-start">
          <Zap className="w-4 h-4" /> Load Sample AI Text
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-dark-300">Text to Analyze</label>
          {text && <button onClick={() => { setText(''); setResult(null); }} className="text-xs text-dark-500 hover:text-dark-300">Clear</button>}
        </div>
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="Paste text here to check if it's AI-generated..."
          className="w-full h-48 p-4 bg-dark-800/50 border border-dark-700/50 rounded-xl text-white placeholder-dark-500 resize-none focus:outline-none focus:ring-2 focus:ring-accent-500/50 text-sm" />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-dark-500">{countWords(text)} words</span>
          <button onClick={handleDetect} disabled={loading || !text.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-medium shadow-lg shadow-accent-500/25 disabled:opacity-50">
            {loading ? <><Zap className="w-5 h-5 animate-pulse" /> Analyzing...</> : <><Search className="w-5 h-5" /> Deep Scan</>}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-6 animate-slide-up">
          {/* Score */}
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-6">
            <div className="text-center mb-4">
              <div className={`text-6xl font-bold ${scoreColor} mb-2`}>{result.score}%</div>
              <div className="flex items-center justify-center gap-2">
                {(() => { const Icon = verdictIcon; return <Icon className={`w-5 h-5 ${scoreColor}`} />; })()}
                <span className={`text-lg font-medium ${scoreColor}`}>
                  {result.overallVerdict === 'human' ? 'Likely Human Patterns' : result.overallVerdict === 'ai' ? 'Likely AI Patterns' : 'Mixed — Uncertain'}
                </span>
              </div>
            </div>
            <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full progress-bar ${getScoreBarColor(result.score)}`} style={{ width: `${result.score}%` }} />
            </div>
            <div className="flex justify-between mt-1 text-xs text-dark-500"><span>AI Generated</span><span>Human Written</span></div>
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <p className="text-sm text-yellow-300/80 text-center">
              ⚠️ This is a <strong>local pattern analysis</strong>, not real AI detection. For accurate results, test your text on{' '}
              <a href="https://gptzero.me" target="_blank" rel="noopener" className="underline hover:text-yellow-300">GPTZero</a>,{' '}
              <a href="https://quillbot.com/ai-content-detector" target="_blank" rel="noopener" className="underline hover:text-yellow-300">QuillBot</a>, or{' '}
              <a href="https://originality.ai" target="_blank" rel="noopener" className="underline hover:text-yellow-300">Originality.ai</a>.
            </p>
          </div>

          {/* Detection Metrics */}
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-accent-400" /> Detection Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { label: 'Burstiness', value: result.analysis.burstiness, desc: 'Sentence variation', good: true },
                { label: 'Vocab Diversity', value: result.analysis.vocabularyDiversity, desc: 'Unique words', good: true },
                { label: 'Perplexity', value: result.analysis.perplexity, desc: 'Predictability', good: true },
                { label: 'Sentence Variation', value: result.analysis.sentenceLengthVariation, desc: 'Length diffs', good: true },
                { label: 'Start Diversity', value: result.analysis.sentenceStartDiversity, desc: 'Unique openers', good: true },
                { label: 'Pronoun Usage', value: result.analysis.pronounUsage, desc: 'I/we/you usage', good: true },
                { label: 'Transition Freq.', value: result.analysis.transitionFrequency, desc: 'AI transitions', good: false },
                { label: 'Passive Voice', value: result.analysis.passiveVoiceRatio, desc: 'Passive usage', good: false },
                { label: 'AI Phrases', value: result.analysis.aiPhraseDensity, desc: 'AI patterns', good: false },
                { label: 'Hedging', value: result.analysis.hedgingFrequency, desc: 'Hedging words', good: false },
                { label: 'Quantifiers', value: result.analysis.quantifierOveruse, desc: 'Overuse', good: false },
              ].map(metric => (
                <div key={metric.label} className="bg-dark-700/30 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-dark-400">{metric.label}</span>
                    <span className={`text-sm font-medium ${metric.good ? 'text-green-400' : 'text-red-400'}`}>{metric.value}%</span>
                  </div>
                  <div className="h-1.5 bg-dark-700 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full rounded-full ${metric.good ? 'bg-green-500/60' : 'bg-red-500/60'}`}
                      style={{ width: `${Math.min(100, metric.value)}%` }} />
                  </div>
                  <p className="text-xs text-dark-500 mt-1">{metric.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Readability */}
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-accent-400" /> Readability Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-dark-700/30 rounded-lg p-4 text-center">
                <p className={`text-2xl font-bold ${readLabel?.color}`}>{result.readability.fleschReadingEase}</p>
                <p className="text-xs text-dark-400 mt-1">Flesch Reading Ease</p>
                <p className={`text-xs mt-1 ${readLabel?.color}`}>{readLabel?.label}</p>
              </div>
              <div className="bg-dark-700/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-dark-200">{result.readability.fleschKincaidGrade}</p>
                <p className="text-xs text-dark-400 mt-1">Grade Level</p>
                <p className="text-xs text-dark-500 mt-1">{getGradeLevelDescription(result.readability.fleschKincaidGrade)}</p>
              </div>
              <div className="bg-dark-700/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-dark-200">{result.readability.colemanLiauIndex}</p>
                <p className="text-xs text-dark-400 mt-1">Coleman-Liau</p>
              </div>
              <div className="bg-dark-700/30 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-dark-200">{result.readability.readingTimeMinutes}m</p>
                <p className="text-xs text-dark-400 mt-1">Reading Time</p>
                <p className="text-xs text-dark-500 mt-1">{result.readability.totalWords} words</p>
              </div>
            </div>
          </div>

          {/* Sentences */}
          <div className="bg-dark-800/50 border border-dark-700/50 rounded-xl p-6">
            <h3 className="text-lg font-medium text-white mb-4">Sentence-by-Sentence ({result.sentences.length} sentences)</h3>
            <div className="space-y-2">
              {result.sentences.map((sentence, i) => (
                <div key={i} className={`sentence-highlight p-3 rounded-lg border ${getClassificationColor(sentence.classification)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-dark-200 flex-1">{sentence.text}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      sentence.classification === 'human' ? 'bg-green-500/20 text-green-400' : sentence.classification === 'maybe' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                    }`}>{sentence.score}%</span>
                  </div>
                  {sentence.issues.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {sentence.issues.map((issue, j) => (
                        <span key={j} className="text-xs text-dark-500 bg-dark-700/50 px-2 py-0.5 rounded">{issue}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
