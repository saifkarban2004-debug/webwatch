'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';

const GENRES = ['All', 'Action', 'Comedy', 'Drama', 'Thriller', 'Sci-Fi', 'Horror', 'Romance', 'Animation'];

export default function MoviesGrid({ initialMovies }: { initialMovies: any[] }) {
  const [movies, setMovies] = useState<any[]>(initialMovies);
  const [activeGenre, setActiveGenre] = useState('All');
  const [page, setPage] = useState(2); // Next page to fetch (initial data is page 1)
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const filteredMovies = activeGenre === 'All'
    ? movies
    : movies.filter(m => m.genres?.includes(activeGenre));

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/browse?type=movie&category=popular&page=${page}`);
      if (!res.ok) throw new Error('Failed to fetch');
      
      const data = await res.json();
      
      if (data.results && data.results.length > 0) {
        const newMovies = data.results.map((m: any) => ({
          id: m.tmdbId,
          title: m.title,
          posterPath: m.posterPath?.includes('image.tmdb.org') 
            ? m.posterPath.replace('https://image.tmdb.org/t/p/w500', '')
            : m.posterPath,
          voteAverage: m.voteAverage,
          releaseDate: m.year ? `${m.year}-01-01` : null,
          genres: m.genres || [],
          type: 'movie'
        }));

        setMovies(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const unique = newMovies.filter((m: any) => !existingIds.has(m.id));
          return [...prev, ...unique];
        });
        setPage(prev => prev + 1);
        setHasMore(data.page < data.totalPages);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more movies:', error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore]);

  return (
    <div>
      {/* Genre Filter Pills */}
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
              transition: 'all 0.2s ease',
              ...(activeGenre === genre ? { boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)' } : {})
            }}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filteredMovies.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '3rem' }}>
          No movies found
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '1.5rem'
        }}>
          {filteredMovies.map(movie => (
            <Link
              key={movie.id}
              href={`/watch/movie/${movie.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="media-card-hover" style={{
                background: 'var(--surface, #13131a)',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ aspectRatio: '2/3', background: '#27272a', position: 'relative', overflow: 'hidden' }}>
                  {movie.posterPath && (
                    <img
                      src={movie.posterPath.startsWith('http') ? movie.posterPath : `https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                      alt={movie.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                      loading="lazy"
                    />
                  )}
                  {movie.voteAverage > 0 && (
                    <div style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
                      padding: '4px 8px', borderRadius: '6px',
                      fontSize: '0.75rem', fontWeight: '600', color: '#fbbf24',
                      display: 'flex', alignItems: 'center', gap: '3px'
                    }}>
                      ★ {movie.voteAverage?.toFixed(1)}
                    </div>
                  )}
                </div>
                <div style={{ padding: '0.75rem 0.75rem 1rem' }}>
                  <h3 style={{
                    margin: '0 0 0.25rem 0', fontSize: '0.9rem', fontWeight: '600',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}>
                    {movie.title}
                  </h3>
                  {movie.releaseDate && (
                    <span style={{ color: '#71717a', fontSize: '0.8rem' }}>
                      {new Date(movie.releaseDate).getFullYear()}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && filteredMovies.length > 0 && activeGenre === 'All' && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem', marginBottom: '1rem' }}>
          <button
            onClick={loadMore}
            disabled={loading}
            style={{
              padding: '14px 48px',
              borderRadius: '12px',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              background: loading
                ? 'rgba(99, 102, 241, 0.15)'
                : 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))',
              color: '#c7c7ff',
              cursor: loading ? 'wait' : 'pointer',
              fontWeight: '600',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backdropFilter: 'blur(8px)',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.3))';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.6)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.25)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15))';
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {loading ? (
              <>
                <span style={{
                  display: 'inline-block', width: '16px', height: '16px',
                  border: '2px solid rgba(199, 199, 255, 0.3)',
                  borderTopColor: '#c7c7ff', borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                Loading...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                Load More Movies
              </>
            )}
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .media-card-hover:hover {
          transform: translateY(-6px) !important;
          box-shadow: 0 12px 28px rgba(0,0,0,0.5), 0 0 20px rgba(99, 102, 241, 0.15) !important;
        }
        .media-card-hover:hover img {
          transform: scale(1.05);
        }
      `}</style>
    </div>
  );
}
