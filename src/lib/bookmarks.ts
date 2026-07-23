/**
 * Bookmarks — LocalStorage-based bookmark system
 * Allows users to save media items for later
 */

export interface BookmarkEntry {
  tmdbId: number;
  type: 'movie' | 'tv';
  title: string;
  posterPath: string | null;
  year?: string;
  voteAverage?: number;
  addedAt: number;
}

const STORAGE_KEY = 'webwatch_bookmarks';

function getStoredBookmarks(): BookmarkEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(entries: BookmarkEntry[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/** Toggle bookmark — add if not exists, remove if exists */
export function toggleBookmark(entry: Omit<BookmarkEntry, 'addedAt'>): boolean {
  const bookmarks = getStoredBookmarks();
  const existingIndex = bookmarks.findIndex(
    (b) => b.tmdbId === entry.tmdbId && b.type === entry.type
  );

  if (existingIndex >= 0) {
    // Remove
    bookmarks.splice(existingIndex, 1);
    saveBookmarks(bookmarks);
    return false; // Not bookmarked anymore
  } else {
    // Add
    bookmarks.unshift({ ...entry, addedAt: Date.now() });
    saveBookmarks(bookmarks);
    return true; // Now bookmarked
  }
}

/** Check if item is bookmarked */
export function isBookmarked(tmdbId: number, type: 'movie' | 'tv'): boolean {
  return getStoredBookmarks().some(
    (b) => b.tmdbId === tmdbId && b.type === type
  );
}

/** Get all bookmarks */
export function getBookmarks(): BookmarkEntry[] {
  return getStoredBookmarks();
}

/** Remove a bookmark */
export function removeBookmark(tmdbId: number, type: 'movie' | 'tv'): void {
  const bookmarks = getStoredBookmarks();
  saveBookmarks(bookmarks.filter((b) => !(b.tmdbId === tmdbId && b.type === type)));
}

/** Clear all bookmarks */
export function clearBookmarks(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/** Export bookmarks as JSON string */
export function exportBookmarks(): string {
  return JSON.stringify(getStoredBookmarks(), null, 2);
}

/** Import bookmarks from JSON string */
export function importBookmarks(json: string): number {
  try {
    const imported: BookmarkEntry[] = JSON.parse(json);
    const existing = getStoredBookmarks();

    let added = 0;
    for (const item of imported) {
      const exists = existing.some(
        (b) => b.tmdbId === item.tmdbId && b.type === item.type
      );
      if (!exists) {
        existing.push(item);
        added++;
      }
    }

    saveBookmarks(existing);
    return added;
  } catch {
    return 0;
  }
}
