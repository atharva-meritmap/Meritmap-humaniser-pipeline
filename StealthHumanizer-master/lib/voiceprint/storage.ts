// 💾 NOOB EXPLAINER: Where are profiles saved?
// For now, profiles are saved in the browser's localStorage.
// This means they persist across page refreshes but are lost if
// the user clears their browser data. In the future, we could
// add server-side storage for cross-device syncing.

import type { VoicePrintProfile } from './types';

// 🔐 NOOB EXPLAINER: Storage key
// We use a single key in localStorage to store ALL profiles as
// a JSON array. This is simpler than having one key per profile
// and avoids polluting the localStorage namespace.
const STORAGE_KEY = 'stealthhumanizer_voiceprint_profiles';

// 💾 NOOB EXPLAINER: Save a profile
// If a profile with the same ID already exists, we update it.
// If not, we add it as a new profile. This is called "upsert"
// (update + insert) and it's a common pattern.
export function saveProfile(profile: VoicePrintProfile): void {
  const profiles = loadAllProfiles();
  const existingIdx = profiles.findIndex(p => p.id === profile.id);
  if (existingIdx >= 0) {
    // 🔄 NOOB EXPLAINER: Update existing profile
    // We merge the new profile data with an updated timestamp.
    // This ensures we know when the profile was last modified.
    profiles[existingIdx] = { ...profile, updatedAt: Date.now() };
  } else {
    // ✨ NOOB EXPLAINER: Add new profile
    profiles.push(profile);
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  }
}

// 📖 NOOB EXPLAINER: Load all profiles
// Returns an empty array if no profiles exist or if we're running
// on the server (where localStorage isn't available).
export function loadAllProfiles(): VoicePrintProfile[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    // 🛡️ NOOB EXPLAINER: Graceful error handling
    // If the stored data is corrupted, we return an empty array
    // rather than crashing the whole app. Data loss is bad, but
    // a broken app is worse.
    return [];
  }
}

// 🔍 NOOB EXPLAINER: Load a single profile by ID
// Returns null if the profile doesn't exist. The "null" return
// is a common TypeScript pattern for "not found" — it forces
// the caller to handle the missing case.
export function loadProfile(id: string): VoicePrintProfile | null {
  return loadAllProfiles().find(p => p.id === id) || null;
}

// 🗑️ NOOB EXPLAINER: Delete a profile
// We filter out the profile with the matching ID and save the
// remaining profiles. Simple and safe.
export function deleteProfile(id: string): void {
  const profiles = loadAllProfiles().filter(p => p.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  }
}
