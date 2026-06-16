// 📦 NOOB EXPLAINER: Barrel file (index.ts)
// This is called a "barrel" file — it re-exports everything from
// the other files in this directory. This way, other code can just
// import from '@/lib/voiceprint' instead of remembering the exact
// file path for each function.

export type { VoicePrintProfile, VoicePrintComparison } from './types';
export { MIN_SAMPLES, MAX_SAMPLES } from './types';
export { extractVoicePrint } from './extractor';
export { injectVoicePrintPrompt } from './prompt-injector';
export { saveProfile, loadAllProfiles, loadProfile, deleteProfile } from './storage';
