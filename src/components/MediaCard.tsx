'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toggleBookmark, isBookmarked as checkIsBookmarked } from '@/lib/bookmarks';

export type MediaCardProps = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'tv';
  voteAverage?: number;
  year?: string;
  genres?: string[];
};

export default function MediaCard({ tmdbId, title, posterPath, type, voteAverage, year }: MediaCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    const initBookmark = async () => {
      try {
        const status = await checkIsBookmarked(tmdbId, type);
        setBookmarked(!!status);
      } catch(e) {
        // Handle gracefully if bookmark syncs fail
      }
    };
    initBookmark();
  }, [tmdbId, type]);

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    try {
      const newStatus = toggleBookmark({ tmdbId, type, title, posterPath, year, voteAverage });
      setBookmarked(!!newStatus);
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <Link href={`/watch/${type}/${tmdbId}`} style={{ textDecoration: 'none' }}>
      <div 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '2/3',
          borderRadius: 'var(--radius-md, 8px)',
          overflow: 'hidden',
          backgroundColor: 'var(--surface, #13131a)',
          transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          transition: 'var(--transition-normal, transform 0.2s ease-in-out)',
          cursor: 'pointer',
          flexShrink: 0
        }}
      >
        {posterPath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w500${posterPath}`}
            alt={title}
            fill
            sizes="(max-width: 768px) 150px, 200px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '16px', textAlign: 'center', color: 'var(--text-secondary, #aaa)' }}>
            {title}
          </div>
        )}

        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.6)',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ 
              backgroundColor: 'var(--accent, #6366f1)', 
              color: '#fff', 
              padding: '2px 6px', 
              borderRadius: '4px',
              fontSize: '10px',
              textTransform: 'uppercase',
              fontWeight: 'bold'
            }}>
              {type}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              {voteAverage != null && (
                <span style={{ backgroundColor: 'rgba(0,0,0,0.8)', color: '#fbbf24', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                  ⭐ {voteAverage.toFixed(1)}
                </span>
              )}
              <button 
                onClick={handleBookmark}
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: bookmarked ? 'var(--accent, #6366f1)' : '#fff',
                  transition: 'color 0.2s'
                }}
                aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
              >
                {bookmarked ? '🔖' : '📑'}
              </button>
            </div>
          </div>

          <div style={{ alignSelf: 'center', fontSize: '48px', color: '#fff', opacity: 0.8 }}>
            ▶
          </div>

          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#fff', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {title}
            </h3>
            {year && <span style={{ fontSize: '12px', color: '#aaa' }}>{year}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}
