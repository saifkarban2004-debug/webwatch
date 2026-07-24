'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toggleBookmark, isBookmarked } from '@/lib/bookmarks';

interface CastMember {
  id?: number;
  name: string;
  character: string;
  profilePath: string;
}

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
    cast: CastMember[];
    type: 'movie' | 'tv';
    tagline?: string;
  };
}

interface PersonCredit {
  tmdbId: number;
  title: string;
  type: 'movie' | 'tv';
  character: string;
  posterPath: string;
  year: string;
  voteAverage: number;
}

interface PersonData {
  id: number;
  name: string;
  profilePath: string;
  biography: string;
  birthday: string | null;
  knownForDepartment: string;
  credits: PersonCredit[];
}

export default function MediaDetails({ metadata }: MediaDetailsProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<PersonData | null>(null);
  const [loadingPerson, setLoadingPerson] = useState(false);
  const [showModal, setShowModal] = useState(false);

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

  const handleCastClick = async (castMember: CastMember) => {
    if (!castMember.id) return;
    
    setLoadingPerson(true);
    setShowModal(true);
    setSelectedPerson(null);

    try {
      const res = await fetch(`/api/person/${castMember.id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSelectedPerson(data);
    } catch (error) {
      console.error('Error fetching person data:', error);
    } finally {
      setLoadingPerson(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPerson(null);
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

      {/* Cast Section */}
      {metadata.cast && metadata.cast.length > 0 && (
        <div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Cast</h3>
          <div style={{ 
            display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem',
            scrollbarWidth: 'thin', scrollbarColor: 'var(--accent) var(--surface)'
          }}>
            {metadata.cast.map((c, idx) => (
              <div 
                key={`${c.name}-${idx}`} 
                onClick={() => handleCastClick(c)}
                style={{ 
                  flex: '0 0 120px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  cursor: c.id ? 'pointer' : 'default',
                  transition: 'transform 0.2s ease',
                  padding: '0.5rem',
                  borderRadius: '0.75rem',
                }}
                onMouseEnter={(e) => {
                  if (c.id) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {c.profilePath ? (
                  <img 
                    src={`https://image.tmdb.org/t/p/w185${c.profilePath}`} 
                    alt={c.name}
                    style={{ 
                      width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', 
                      backgroundColor: 'var(--surface)',
                      border: c.id ? '2px solid transparent' : 'none',
                      transition: 'border-color 0.2s',
                    }}
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

      {/* ─── Actor Filmography Modal ─── */}
      {showModal && (
        <div 
          onClick={closeModal}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '1rem',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideUp 0.3s ease',
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {selectedPerson?.profilePath && (
                  <img 
                    src={selectedPerson.profilePath.startsWith('http') ? selectedPerson.profilePath : `https://image.tmdb.org/t/p/w185${selectedPerson.profilePath}`}
                    alt={selectedPerson.name}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                )}
                <div>
                  <h2 style={{ margin: 0, color: '#fff', fontSize: '1.25rem' }}>
                    {loadingPerson ? 'Loading...' : selectedPerson?.name}
                  </h2>
                  {selectedPerson?.knownForDepartment && (
                    <span style={{ color: 'var(--accent, #6366f1)', fontSize: '0.85rem' }}>
                      {selectedPerson.knownForDepartment}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                  width: '36px', height: '36px', borderRadius: '50%',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ overflow: 'auto', padding: '1.5rem', flex: 1 }}>
              {loadingPerson ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <div style={{
                    width: '40px', height: '40px',
                    border: '3px solid rgba(99, 102, 241, 0.2)',
                    borderTopColor: 'var(--accent, #6366f1)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                </div>
              ) : selectedPerson ? (
                <>
                  {/* Biography */}
                  {selectedPerson.biography && (
                    <p style={{ 
                      color: 'var(--text-secondary, #a1a1aa)', 
                      fontSize: '0.9rem', 
                      lineHeight: 1.6, 
                      margin: '0 0 1.5rem 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {selectedPerson.biography}
                    </p>
                  )}

                  {/* Credits Header */}
                  <h3 style={{ color: '#fff', margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
                    Known For ({selectedPerson.credits.length} credits)
                  </h3>

                  {/* Credits Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: '1rem',
                  }}>
                    {selectedPerson.credits.map((credit, idx) => (
                      <Link
                        key={`${credit.tmdbId}-${idx}`}
                        href={`/watch/${credit.type}/${credit.tmdbId}`}
                        onClick={closeModal}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                      >
                        <div style={{
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: '0.75rem',
                          overflow: 'hidden',
                          transition: 'all 0.3s ease',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        >
                          <div style={{ aspectRatio: '2/3', background: '#1a1a2e', position: 'relative' }}>
                            {credit.posterPath ? (
                              <img
                                src={credit.posterPath.startsWith('http') ? credit.posterPath : `https://image.tmdb.org/t/p/w300${credit.posterPath}`}
                                alt={credit.title}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                loading="lazy"
                              />
                            ) : (
                              <div style={{ 
                                width: '100%', height: '100%', display: 'flex', 
                                alignItems: 'center', justifyContent: 'center',
                                color: '#555', fontSize: '0.8rem'
                              }}>
                                No Poster
                              </div>
                            )}
                            {credit.voteAverage > 0 && (
                              <div style={{
                                position: 'absolute', top: '6px', right: '6px',
                                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
                                padding: '2px 6px', borderRadius: '4px',
                                fontSize: '0.7rem', fontWeight: '600', color: '#fbbf24',
                              }}>
                                ★ {credit.voteAverage.toFixed(1)}
                              </div>
                            )}
                            <div style={{
                              position: 'absolute', top: '6px', left: '6px',
                              background: credit.type === 'movie' ? 'rgba(99, 102, 241, 0.8)' : 'rgba(139, 92, 246, 0.8)',
                              padding: '2px 6px', borderRadius: '4px',
                              fontSize: '0.65rem', fontWeight: '700', color: '#fff',
                              textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}>
                              {credit.type}
                            </div>
                          </div>
                          <div style={{ padding: '0.6rem' }}>
                            <div style={{
                              fontSize: '0.8rem', fontWeight: '600', color: '#fff',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              marginBottom: '2px',
                            }}>
                              {credit.title}
                            </div>
                            {credit.character && (
                              <div style={{
                                fontSize: '0.7rem', color: '#71717a',
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              }}>
                                as {credit.character}
                              </div>
                            )}
                            {credit.year && (
                              <div style={{ fontSize: '0.7rem', color: '#52525b', marginTop: '2px' }}>
                                {credit.year}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '2rem' }}>
                  Could not load filmography.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
