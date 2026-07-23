'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

// Mock import handling in case lib is not yet populated
let getHistory: () => any[] = () => [];
let removeFromHistory: (id: string) => void = () => {};

try {
  const HistoryLib = require('@/lib/watch-history');
  getHistory = HistoryLib.getHistory || getHistory;
  removeFromHistory = HistoryLib.removeFromHistory || removeFromHistory;
} catch (e) {
  // If module not found, proceed with empty mock
}

function getRelativeTime(timestamp: number) {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 14) return `${diffDays}d ago`;
  return `${diffWeeks}w ago`;
}

export default function WatchHistory() {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  if (history.length === 0) return null;

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromHistory(id);
    setHistory(getHistory());
  };

  return (
    <section style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Continue Watching
      </h2>
      <div style={{
        display: 'flex',
        gap: '1rem',
        overflowX: 'auto',
        paddingBottom: '1rem',
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none', // IE/Edge
      }}>
        {history.map((item) => {
          const urlParams = item.type === 'tv' && item.season && item.episode 
            ? `?season=${item.season}&episode=${item.episode}` 
            : '';
          const watchUrl = `/watch/${item.type}/${item.tmdbId}${urlParams}`;

          return (
            <Link key={item.id} href={watchUrl} style={{ textDecoration: 'none', color: 'inherit', flexShrink: 0 }}>
              <div style={{
                position: 'relative',
                width: '160px',
                background: 'var(--surface, #13131a)',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                transition: 'transform 0.2s',
              }}>
                <button
                  onClick={(e) => handleRemove(e, item.id)}
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 10,
                  }}
                  title="Remove from history"
                >
                  ✕
                </button>
                <div style={{ aspectRatio: '2/3', background: '#27272a', position: 'relative' }}>
                  {item.posterPath && (
                    <img
                      src={`https://image.tmdb.org/t/p/w342${item.posterPath}`}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  )}
                </div>
                <div style={{ padding: '0.75rem' }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                  </h3>
                  {item.type === 'tv' && item.season && item.episode && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent, #6366f1)', marginBottom: '0.25rem' }}>
                      S{item.season} E{item.episode}
                    </div>
                  )}
                  <span style={{ color: '#a1a1aa', fontSize: '0.75rem' }}>
                    Watched {getRelativeTime(item.timestamp)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
