/**
 * Watch History — LocalStorage-based tracking
 * Records what the user has watched with timestamps
 */

export interface WatchHistoryEntry {
  tmdbId: number;
  type: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  season?: number;
  episode?: number;
  episodeName?: string;
  timestamp: number;
  backdropPath?: string | null;
  year?: string;
}

const STORAGE_KEY = 'webwatch_history';
const MAX_ENTRIES = 100;

function getStoredHistory(): WatchHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: WatchHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full — remove oldest entries
    const trimmed = entries.slice(0, Math.floor(MAX_ENTRIES / 2));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

/** Add an entry to watch history (or update if already exists) */
export function addToHistory(entry: Omit<WatchHistoryEntry, 'timestamp'>): void {
  const history = getStoredHistory();

  // Remove existing entry for same media (dedup)
  const filtered = history.filter((item) => {
    if (item.tmdbId !== entry.tmdbId || item.type !== entry.type) return true;
    if (entry.type === 'tv') {
      return item.season !== entry.season || item.episode !== entry.episode;
    }
    return false;
  });

  // Add new entry at the beginning
  filtered.unshift({
    ...entry,
    timestamp: Date.now(),
  });

  // LRU eviction — keep only MAX_ENTRIES
  saveHistory(filtered.slice(0, MAX_ENTRIES));
}

/** Get all watch history entries, newest first */
export function getHistory(): WatchHistoryEntry[] {
  return getStoredHistory();
}

/** Remove a specific entry from history */
export function removeFromHistory(tmdbId: number, type: 'movie' | 'tv'): void {
  const history = getStoredHistory();
  const filtered = history.filter(
    (item) => !(item.tmdbId === tmdbId && item.type === type)
  );
  saveHistory(filtered);
}

/** Clear all watch history */
export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Check if a media item is in history */
export function isInHistory(tmdbId: number, type: 'movie' | 'tv'): boolean {
  return getStoredHistory().some(
    (item) => item.tmdbId === tmdbId && item.type === type
  );
}
