// 💉 NOOB EXPLAINER: What is Prompt Injection?
// Not the security kind! This means we "inject" (add) your VoicePrint
// profile data into the instructions we give the AI. So instead of
// saying "write like a human," we say "write like THIS specific human
// who uses contractions 4.2 times per 100 words and averages 16-word
// sentences with high variation."

import type { VoicePrintProfile } from './types';

// 🎯 NOOB EXPLAINER: How prompt injection works
// When we send text to the LLM for humanization, we include a "system
// prompt" — instructions that tell the AI how to write. This function
// creates a section of that system prompt based on your VoicePrint.
//
// The LLM then uses these specific numerical targets to match YOUR
// style, rather than just making the text "sound human" generically.
export function injectVoicePrintPrompt(profile: VoicePrintProfile): string {
  return `
=== YOUR VOICEPRINT PROFILE ===
You are writing as a specific person with these measurable style traits:

Sentence rhythm: Average ${profile.avgSentenceLength.toFixed(0)} words per sentence (std dev: ${profile.sentenceLengthStdDev.toFixed(0)}).
${profile.sentenceLengthStdDev > 8 ? 'You vary sentence length A LOT — some very short, some very long.' : 'Your sentences are fairly uniform in length.'}

Vocabulary: ${profile.typeTokenRatio > 0.6 ? 'Rich, diverse vocabulary' : 'You reuse words more than average'}.
Contractions: ${profile.contractionRate > 3 ? 'Heavy contraction user — use them everywhere ("don\'t", "it\'s", "can\'t")' : 'Moderate contraction user'}.
Voice: ${profile.passiveVoiceRatio > 0.3 ? 'You use passive voice frequently' : 'You prefer active voice'}.
${profile.firstPersonRate > 5 ? 'First person comes naturally to you — use "I" and "we" often.' : 'You tend toward impersonal constructions.'}

Paragraph style: ${profile.paragraphLengthMean.toFixed(0)} sentences per paragraph on average.

${profile.conjunctionStartRate > 0.15 ? 'You often start sentences with conjunctions (And, But, So).' : 'You rarely start sentences with conjunctions.'}

${profile.topSentenceStarters.length > 0 ? `Your common sentence starters: ${profile.topSentenceStarters.slice(0, 5).join(', ')}.` : ''}

MATCH THESE EXACT NUMBERS:
- Target average sentence length: ${profile.avgSentenceLength.toFixed(0)} words (±3)
- Target sentence length std dev: ${profile.sentenceLengthStdDev.toFixed(0)} (±2)  
- Contraction rate: ${profile.contractionRate.toFixed(1)} per 100 words
- Passive voice ratio: ${(profile.passiveVoiceRatio * 100).toFixed(0)}%
- First person rate: ${profile.firstPersonRate.toFixed(1)} per 1000 words
=== END VOICEPRINT ===`;
}
