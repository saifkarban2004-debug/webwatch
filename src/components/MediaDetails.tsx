'use client';

import React, { useState, useEffect } from 'react';
import { toggleBookmark, isBookmarked } from '@/lib/bookmarks';

interface MediaDetailsProps {
  metadata: {
    tmdbId: number;
    title: string;
    overview: string;
    posterPath: string;
    backdropPath: string;
    releaseDate?: string;
    firstAirDate?: string;
    runtime?: number;
    voteAverage: number;
    genres: string[];
    cast: { name: string; character: string; profilePath: string }[];
    type: 'movie' | 'tv';
    tagline?: string;
  };
}

export default function MediaDetails({ metadata }: MediaDetailsProps) {
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    const checkBookmark = async () => {
      const status = await isBookmarked(metadata.tmdbId, metadata.type);
      setBookmarked(status);
    };
    checkBookmark();
  }, [metadata.tmdbId, metadata.type]);

  const handleBookmarkToggle = async () => {
    const newStatus = await toggleBookmark({
      tmdbId: metadata.tmdbId,
      type: metadata.type,
      title: metadata.title,
      posterPath: metadata.posterPath
    });
    setBookmarked(newStatus);
  };

  const year = metadata.type === 'movie' 
    ? metadata.releaseDate?.substring(0, 4) 
    : metadata.firstAirDate?.substring(0, 4);

  const formatRuntime = (mins?: number) => {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ 
        display: 'flex', 
        gap: '2rem',
        flexDirection: 'row',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '0 0 250px', maxWidth: '100%' }}>
          {metadata.posterPath ? (
            <img 
              src={`https://image.tmdb.org/t/p/w500${metadata.posterPath}`} 
              alt={metadata.title}
              style={{ width: '100%', borderRadius: '0.5rem', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}
            />
          ) : (
            <div style={{ 
              width: '100%', aspectRatio: '2/3', backgroundColor: 'var(--surface)',
              borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              No Poster
            </div>
          )}
        </div>

        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '2rem' }}>
                {metadata.title}
              </h1>
              {metadata.tagline && (
                <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  {metadata.tagline}
                </div>
              )}
            </div>
            <button 
              onClick={handleBookmarkToggle}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: bookmarked ? 'var(--accent)' : 'var(--text-secondary)',
                padding: '0.5rem'
              }}
              title={bookmarked ? "Remove Bookmark" : "Add Bookmark"}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {year && <span>{year}</span>}
            {metadata.runtime && <span>{formatRuntime(metadata.runtime)}</span>}
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              {metadata.voteAverage.toFixed(1)}
            </span>
            <span style={{ 
              backgroundColor: 'var(--surface)', padding: '0.1rem 0.5rem', 
              borderRadius: '0.25rem', textTransform: 'uppercase', fontSize: '0.8rem'
            }}>
              {metadata.type}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {metadata.genres.map(g => (
              <span key={g} style={{
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--accent)',
                padding: '0.25rem 0.75rem',
                borderRadius: '1rem',
                fontSize: '0.85rem'
              }}>
                {g}
              </span>
            ))}
          </div>

          <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
            {metadata.overview}
          </p>
        </div>
      </div>

      {metadata.cast && metadata.cast.length > 0 && (
        <div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Cast</h3>
          <div style={{ 
            display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem',
            scrollbarWidth: 'thin', scrollbarColor: 'var(--accent) var(--surface)'
          }}>
            {metadata.cast.map((c, idx) => (
              <div key={`${c.name}-${idx}`} style={{ 
                flex: '0 0 120px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
              }}>
                {c.profilePath ? (
                  <img 
                    src={`https://image.tmdb.org/t/p/w185${c.profilePath}`} 
                    alt={c.name}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', backgroundColor: 'var(--surface)' }}
                  />
                ) : (
                  <div style={{ 
                    width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '1.2rem'
                  }}>
                    {c.name.charAt(0)}
                  </div>
                )}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 'bold' }}>{c.name}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{c.character}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
