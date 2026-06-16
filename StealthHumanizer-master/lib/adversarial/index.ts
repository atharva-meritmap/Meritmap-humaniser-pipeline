// 🧠 NOOB EXPLAINER: What is the Adversarial Engine?
// The Adversarial Engine is like a smart editor that knows exactly
// how AI detectors work and uses that knowledge to beat them.
//
// Before this: Humanizer → Rewrite once → Hope it passes
// After this:  Humanizer → Attack with 4 different strategies →
//              Check result → Feed problems back to LLM →
//              Target ONLY the problems → Check again → Repeat
//
// It's "adversarial" because it's actively fighting against the
// detector's specific weaknesses, like a chess player exploiting
// their opponent's blind spots.

export { PERSONA_POOL, getRandomPersona, getPersonaPrompt } from './persona-pool';
export type { Persona } from './persona-pool';
export { AXIS_PROMPTS, getAxisForPass, getAxisPrompt } from './axes';
export type { Axis } from './axes';
export {
  analyzeFeedback,
  buildFeedbackPrompt,
  generateLengthTargets,
  shouldEscalateParagraph,
} from './feedback-loop';
export type { FeedbackResult, FlaggedSentence } from './feedback-loop';
