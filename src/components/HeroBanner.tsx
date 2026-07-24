'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export type HeroItem = {
  tmdbId: number;
  title: string;
  overview: string;
  backdropPath: string | null;
  voteAverage: number;
  type: 'movie' | 'tv';
  year?: string;
  genres?: string[];
};

type HeroBannerProps = {
  items: HeroItem[];
};

export default function HeroBanner({ items }: HeroBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!items || items.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [items]);

  if (!items || items.length === 0) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '70vh', minHeight: '50vh', overflow: 'hidden', backgroundColor: 'var(--bg-primary, #0a0a0f)' }}>
      {items.map((item, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={`${item.type}-${item.tmdbId}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: isActive ? 1 : 0,
              transition: 'opacity 1s ease-in-out',
              zIndex: isActive ? 1 : 0,
              backgroundImage: item.backdropPath ? `url(https://image.tmdb.org/t/p/original${item.backdropPath})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(to right, rgba(10, 10, 15, 0.9) 0%, rgba(10, 10, 15, 0.4) 50%, transparent 100%), linear-gradient(to top, var(--bg-primary, #0a0a0f) 0%, transparent 30%)'
            }} />
            
            <div style={{
              position: 'absolute',
              bottom: '10%',
              left: '5%',
              maxWidth: '600px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              color: 'var(--text-primary, #fff)',
              zIndex: 2,
              padding: '20px'
            }}>
              <h1 style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', margin: 0, fontWeight: 'bold', lineHeight: 1.1 }}>{item.title}</h1>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '14px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24', fontWeight: 'bold' }}>
                  ⭐ {item.voteAverage.toFixed(1)}
                </span>
                {item.year && <span style={{ color: 'var(--text-secondary, #aaa)' }}>{item.year}</span>}
                <span style={{ 
                  backgroundColor: 'var(--accent, #6366f1)', 
                  padding: '2px 8px', 
                  borderRadius: 'var(--radius-sm, 4px)', 
                  textTransform: 'uppercase',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {item.type}
                </span>
                {item.genres && (
                  <span style={{ color: 'var(--text-secondary, #aaa)' }}>
                    {item.genres.slice(0, 3).join(', ')}
                  </span>
                )}
              </div>
              
              <p style={{
                margin: 0,
                fontSize: '16px',
                color: 'var(--text-secondary, #aaa)',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                lineHeight: 1.5
              }}>
                {item.overview}
              </p>
              
              <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                <Link href={`/watch/${item.type}/${item.tmdbId}`} style={{
                  backgroundColor: 'var(--accent, #6366f1)',
                  color: '#fff',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md, 8px)',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s'
                }}>
                  ▶ Watch Now
                </Link>
                <Link href={`/watch/${item.type}/${item.tmdbId}`} style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md, 8px)',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  transition: 'background-color 0.2s',
                  backdropFilter: 'blur(4px)'
                }}>
                  ℹ More Info
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        zIndex: 10
      }}>
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            style={{
              width: idx === currentIndex ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              backgroundColor: idx === currentIndex ? 'var(--accent, #6366f1)' : 'rgba(255,255,255,0.5)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              padding: 0
            }}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
