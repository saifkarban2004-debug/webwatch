'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface EpisodeSelectorProps {
  tmdbId: number;
  seasons: { seasonNumber: number; name: string; episodeCount: number }[];
  episodes: { episodeNumber: number; name: string; overview: string; stillPath: string; airDate: string; runtime: number | null }[];
  currentSeason: number;
  currentEpisode: number;
}

export default function EpisodeSelector({
  tmdbId,
  seasons,
  episodes,
  currentSeason,
  currentEpisode
}: EpisodeSelectorProps) {
  const router = useRouter();

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSeason = e.target.value;
    router.push(`/watch/tv/${tmdbId}?season=${newSeason}&episode=1`);
  };

  const handleEpisodeClick = (episodeNum: number) => {
    router.push(`/watch/tv/${tmdbId}?season=${currentSeason}&episode=${episodeNum}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>Episodes</h3>
        <select 
          value={currentSeason}
          onChange={handleSeasonChange}
          style={{
            padding: '0.5rem',
            backgroundColor: 'var(--surface)',
            color: 'var(--text-primary)',
            border: '1px solid #333',
            borderRadius: '0.25rem',
            cursor: 'pointer'
          }}
        >
          {seasons.map((s) => (
            <option key={s.seasonNumber} value={s.seasonNumber} style={{ color: '#000' }}>
              {s.name} ({s.episodeCount} Episodes)
            </option>
          ))}
        </select>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '1rem'
      }}>
        {episodes.map((ep) => {
          const isCurrent = ep.episodeNumber === currentEpisode;
          
          return (
            <div 
              key={ep.episodeNumber}
              onClick={() => handleEpisodeClick(ep.episodeNumber)}
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: '0.5rem',
                overflow: 'hidden',
                cursor: 'pointer',
                border: isCurrent ? '2px solid var(--accent)' : '2px solid transparent',
                boxShadow: isCurrent ? '0 0 10px var(--accent)' : 'none',
                transition: 'transform 0.2s, border-color 0.2s',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ 
                width: '100%', 
                aspectRatio: '16/9', 
                backgroundColor: '#222',
                position: 'relative' 
              }}>
                {ep.stillPath ? (
                  <img 
                    src={`https://image.tmdb.org/t/p/w300${ep.stillPath}`} 
                    alt={ep.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ 
                    width: '100%', height: '100%', 
                    background: 'linear-gradient(45deg, #111, #333)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#666'
                  }}>
                    No Image
                  </div>
                )}
                <div style={{
                  position: 'absolute',
                  bottom: '0.5rem',
                  right: '0.5rem',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem'
                }}>
                  {ep.runtime ? `${ep.runtime}m` : ''}
                </div>
              </div>
              
              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    backgroundColor: 'var(--accent)', 
                    color: '#fff', 
                    padding: '0.1rem 0.4rem', 
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    E{ep.episodeNumber}
                  </span>
                  <span style={{ 
                    color: 'var(--text-primary)', 
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {ep.name}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {ep.airDate}
                </div>
                <p style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '0.85rem',
                  margin: '0.25rem 0 0 0',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {ep.overview || 'No overview available.'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
