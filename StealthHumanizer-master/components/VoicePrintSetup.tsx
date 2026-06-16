// 🧙 NOOB EXPLAINER: VoicePrint Setup Wizard
// This is a step-by-step guide that helps users create their
// VoicePrint profile. It's like setting up a new phone — we
// walk you through it one step at a time.

'use client';

import { useState } from 'react';
import { extractVoicePrint, saveProfile, MIN_SAMPLES } from '@/lib/voiceprint';
import type { VoicePrintProfile } from '@/lib/voiceprint';

export function VoicePrintSetup({ onComplete }: { onComplete: (profile: VoicePrintProfile) => void }) {
  // 🎯 NOOB EXPLAINER: Multi-step wizard state
  // Step 1: Enter your name and paste writing samples
  // Step 2: Review the extracted VoicePrint profile
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [samples, setSamples] = useState<string[]>(['', '', '']);
  const [profile, setProfile] = useState<VoicePrintProfile | null>(null);
  const [error, setError] = useState('');

  // ➕ NOOB EXPLAINER: Add a new writing sample slot
  // Users start with 3 sample slots (the minimum). They can add up to 10.
  const addSample = () => {
    if (samples.length < 10) setSamples([...samples, '']);
  };

  // ➖ NOOB EXPLAINER: Remove a writing sample slot
  // Can't go below 3 (MIN_SAMPLES) because we need at least that
  // many to create a reliable style profile.
  const removeSample = (idx: number) => {
    if (samples.length > MIN_SAMPLES) {
      setSamples(samples.filter((_, i) => i !== idx));
    }
  };

  // ✏️ NOOB EXPLAINER: Update a specific sample's text
  const updateSample = (idx: number, text: string) => {
    const updated = [...samples];
    updated[idx] = text;
    setSamples(updated);
  };

  // 🔬 NOOB EXPLAINER: Extract the VoicePrint profile
  // This calls the extractor which measures all the style features
  // from the user's writing samples. If successful, we move to step 2
  // where the user can review their profile before saving.
  const extract = () => {
    try {
      const validSamples = samples.filter(s => s.trim().length > 50);
      if (validSamples.length < MIN_SAMPLES) {
        setError(`Please provide at least ${MIN_SAMPLES} writing samples (50+ words each)`);
        return;
      }
      const p = extractVoicePrint(name || 'My Style', validSamples, description);
      setProfile(p);
      setStep(2);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Extraction failed');
    }
  };

  // 💾 NOOB EXPLAINER: Save the profile to localStorage
  const save = () => {
    if (profile) {
      saveProfile(profile);
      onComplete(profile);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold">🎤 Create Your VoicePrint</h2>
      <p className="text-gray-600 dark:text-gray-400">
        Upload 3-10 writing samples and we&apos;ll create a profile of YOUR unique writing style.
        The humanizer will then match your voice instead of generic &quot;human-like&quot; text.
      </p>

      {step === 1 && (
        <div className="space-y-4">
          {/* 📝 NOOB EXPLAINER: Profile name input */}
          {/* This is just a friendly name for the profile so the user
              can identify it later. Like naming a Wi-Fi network. */}
          <div>
            <label className="block text-sm font-medium mb-1">Profile Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., My Academic Style"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
            />
          </div>

          {/* 📝 NOOB EXPLAINER: Description input */}
          {/* Optional description so the user can remember what this
              profile is for — e.g., "My blog writing style" or "Academic papers". */}
          <div>
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g., Academic papers and research notes"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
            />
          </div>

          {/* 📝 NOOB EXPLAINER: Writing samples input */}
          {/* Each sample is a textarea where the user pastes their own writing.
              We need at least 3 samples with 50+ words each for reliable extraction. */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Writing Samples ({samples.length}/{10})
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Paste text you&apos;ve written — emails, essays, blog posts, etc.
              Each sample should be at least 50 words.
            </p>
            {samples.map((sample, idx) => (
              <div key={idx} className="mb-2 flex gap-2">
                <textarea
                  value={sample}
                  onChange={e => updateSample(idx, e.target.value)}
                  placeholder={`Sample ${idx + 1} — paste your writing here...`}
                  className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-sm min-h-[80px]"
                />
                {samples.length > MIN_SAMPLES && (
                  <button
                    onClick={() => removeSample(idx)}
                    className="px-2 text-red-500 hover:bg-red-50 rounded"
                  >✕</button>
                )}
              </div>
            ))}
            {samples.length < 10 && (
              <button onClick={addSample} className="text-sm text-emerald-600 hover:underline">
                + Add another sample
              </button>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={extract}
            className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
          >
            Analyze My Writing Style →
          </button>
        </div>
      )}

      {/* 📊 NOOB EXPLAINER: Profile review step */}
      {/* After extraction, we show the user their measured style features
          so they can see what we detected. If something looks wrong, they
          can go back and adjust their samples. */}
      {step === 2 && profile && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Your VoicePrint</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Avg Sentence Length" value={`${profile.avgSentenceLength.toFixed(1)} words`} />
            <StatCard label="Sentence Variation" value={profile.sentenceLengthStdDev.toFixed(1)} />
            <StatCard label="Vocabulary Richness" value={`${(profile.typeTokenRatio * 100).toFixed(0)}%`} />
            <StatCard label="Contraction Rate" value={`${profile.contractionRate.toFixed(1)}/100 words`} />
            <StatCard label="Passive Voice" value={`${(profile.passiveVoiceRatio * 100).toFixed(0)}%`} />
            <StatCard label="First Person" value={`${profile.firstPersonRate.toFixed(1)}/1000 words`} />
          </div>

          {/* 📊 NOOB EXPLAINER: Additional details */}
          {/* These are extra stats that might be interesting for curious users
              but aren't the primary style features. */}
          <div className="text-xs text-gray-500 mt-2">
            <p>Top sentence starters: {profile.topSentenceStarters.slice(0, 5).join(', ') || 'N/A'}</p>
            <p>Paragraph length: {profile.paragraphLengthMean.toFixed(1)} sentences avg</p>
            <p>Conjunction starts: {(profile.conjunctionStartRate * 100).toFixed(0)}%</p>
          </div>

          <button
            onClick={save}
            className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
          >
            Save VoicePrint Profile ✓
          </button>

          {/* ↩️ NOOB EXPLAINER: Go back to adjust samples */}
          <button
            onClick={() => setStep(1)}
            className="w-full px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
          >
            ← Go back and adjust samples
          </button>
        </div>
      )}
    </div>
  );
}

// 📊 NOOB EXPLAINER: Stat card component
// A simple display card showing one measured style feature.
// Like the stat blocks in a video game character sheet.
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
