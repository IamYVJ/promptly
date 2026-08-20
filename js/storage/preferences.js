/**
 * Preference persistence. Setup choices survive a refresh; matches do not.
 */

const STORAGE_KEY = "promptly:preferences:v1";

export const DURATION_PRESETS = [30, 45, 60, 90, 120];
export const ROUND_PRESETS = [1, 2, 3, 5];

export const MAX_TEAM_NAME_LENGTH = 18;
export const ROUND_LIMITS = { min: 1, max: 12 };

const DEFAULT_PREFERENCES = {
  teamNames: ["Team 1", "Team 2"],
  durationSeconds: 60,
  roundsPerTeam: 3,
  categoryId: null,
  foreheadControlMode: "motion",
  haptics: true,
  sound: true,
};

function clampInt(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function sanitizeName(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, MAX_TEAM_NAME_LENGTH);
  return trimmed.length > 0 ? trimmed : fallback;
}

function sanitize(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const names = Array.isArray(source.teamNames) ? source.teamNames : [];

  return {
    teamNames: [
      sanitizeName(names[0], DEFAULT_PREFERENCES.teamNames[0]),
      sanitizeName(names[1], DEFAULT_PREFERENCES.teamNames[1]),
    ],
    durationSeconds: clampInt(source.durationSeconds, 10, 300, DEFAULT_PREFERENCES.durationSeconds),
    roundsPerTeam: clampInt(
      source.roundsPerTeam,
      ROUND_LIMITS.min,
      ROUND_LIMITS.max,
      DEFAULT_PREFERENCES.roundsPerTeam
    ),
    categoryId: typeof source.categoryId === "string" ? source.categoryId : null,
    foreheadControlMode: source.foreheadControlMode === "touch" ? "touch" : "motion",
    haptics: source.haptics !== false,
    sound: source.sound !== false,
  };
}

export function loadPreferences() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return sanitize(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_PREFERENCES, teamNames: [...DEFAULT_PREFERENCES.teamNames] };
  }
}

export function savePreferences(preferences) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitize(preferences)));
  } catch {
    /* Private browsing or a full quota: preferences simply do not persist. */
  }
}

export function clearPreferences() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* Nothing to do. */
  }
  return { ...DEFAULT_PREFERENCES, teamNames: [...DEFAULT_PREFERENCES.teamNames] };
}
