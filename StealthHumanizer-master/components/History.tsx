'use client';

import { useState, useEffect } from 'react';
import { Clock, Trash2, Copy, PenTool, ArrowRight } from 'lucide-react';
import { HistoryEntry } from '@/lib/types';
import { getHistory, deleteHistoryEntry, clearHistory, formatDate } from '@/lib/storage';

interface HistoryProps {
  showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  setActiveTab: (tab: 'humanizer' | 'detector' | 'history' | 'settings') => void;
}

export default function History({ showToast, setActiveTab }: HistoryProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setEntries(getHistory());
  }, []);

  const handleDelete = (id: string) => {
    deleteHistoryEntry(id);
    setEntries(getHistory());
    showToast('info', 'Entry deleted');
  };

  const handleClearAll = () => {
    if (entries.length === 0) return;
    clearHistory();
    setEntries([]);
    showToast('info', 'All history cleared');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('success', 'Copied to clipboard!');
  };

  const handleReuse = (entry: HistoryEntry) => {
    // Store in sessionStorage for the humanizer to pick up
    sessionStorage.setItem('stealthhumanizer_reuse_text', entry.originalText);
    setActiveTab('humanizer');
    showToast('info', 'Text loaded in Humanizer!');
  };

  if (entries.length === 0) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
          <Clock className="w-6 h-6 text-accent-400" />
          History
        </h2>
        <div className="bg-dark-800/30 border border-dark-700/30 rounded-xl p-12 text-center">
          <Clock className="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-dark-300 mb-2">No history yet</h3>
          <p className="text-dark-500 text-sm">Your humanized texts will appear here</p>
          <button
            onClick={() => setActiveTab('humanizer')}
            className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-accent-500/20 text-accent-400 hover:bg-accent-500/30 transition-colors text-sm"
          >
            <PenTool className="w-4 h-4" />
            Start Humanizing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock className="w-6 h-6 text-accent-400" />
          History
          <span className="text-sm font-normal text-dark-400">({entries.length})</span>
        </h2>
        <button
          onClick={handleClearAll}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Clear All
        </button>
      </div>

      <div className="space-y-3">
        {entries.map(entry => (
          <div
            key={entry.id}
            className="bg-dark-800/50 border border-dark-700/50 rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div
              className="p-4 cursor-pointer hover:bg-dark-700/30 transition-colors"
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-200 truncate">{entry.originalText.slice(0, 100)}...</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-dark-500">
                    <span>{formatDate(entry.timestamp)}</span>
                    <span>{entry.wordCount?.input} → {entry.wordCount?.output} words</span>
                    <span className="capitalize">{entry.options.level} / {entry.options.style}</span>
                    <span className="text-accent-400">{entry.model}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={e => { e.stopPropagation(); handleReuse(entry); }}
                    className="p-2 rounded-lg hover:bg-dark-700/50 text-dark-400 hover:text-accent-400 transition-colors"
                    title="Reuse in Humanizer"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleCopy(entry.humanizedText); }}
                    className="p-2 rounded-lg hover:bg-dark-700/50 text-dark-400 hover:text-white transition-colors"
                    title="Copy humanized text"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(entry.id); }}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded content */}
            {expandedId === entry.id && (
              <div className="px-4 pb-4 border-t border-dark-700/50 pt-3">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-medium text-dark-400 mb-2">Original</h4>
                    <div className="p-3 bg-dark-900/50 rounded-lg text-sm text-dark-300 max-h-40 overflow-y-auto">
                      {entry.originalText}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-dark-400 mb-2">Humanized</h4>
                    <div className="p-3 bg-dark-900/50 rounded-lg text-sm text-dark-200 max-h-40 overflow-y-auto">
                      {entry.humanizedText}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
