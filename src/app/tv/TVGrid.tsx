'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const GENRES = ['All', 'Action & Adventure', 'Comedy', 'Drama', 'Sci-Fi & Fantasy', 'Mystery', 'Crime', 'Animation', 'Documentary'];

export default function TVGrid({ initialShows }: { initialShows: any[] }) {
  const [activeGenre, setActiveGenre] = useState('All');

  const filteredShows = activeGenre === 'All' 
    ? initialShows 
    : initialShows.filter(s => s.genres.includes(activeGenre));

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
        marginBottom: '2rem',
        justifyContent: 'center'
      }}>
        {GENRES.map(genre => (
          <button
            key={genre}
            onClick={() => setActiveGenre(genre)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '9999px',
              border: 'none',
              background: activeGenre === genre ? 'var(--accent, #6366f1)' : 'var(--surface, #13131a)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'background 0.2s'
            }}
          >
            {genre}
          </button>
        ))}
      </div>

      {filteredShows.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '3rem' }}>
          No TV shows found
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1.5rem'
        }}>
          {filteredShows.map(show => (
            <Link 
              key={show.id} 
              href={`/watch/tv/${show.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                background: 'var(--surface, #13131a)',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                transition: 'transform 0.2s',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}>
                <div style={{ aspectRatio: '2/3', background: '#27272a', position: 'relative' }}>
                  {show.posterPath && (
                    <img
                      src={`https://image.tmdb.org/t/p/w500${show.posterPath}`}
                      alt={show.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  )}
                </div>
                <div style={{ padding: '1rem' }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {show.title}
                  </h3>
                  {show.releaseDate && (
                    <span style={{ color: '#a1a1aa', fontSize: '0.875rem' }}>
                      {new Date(show.releaseDate).getFullYear()}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
