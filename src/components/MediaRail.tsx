'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import MediaCard, { MediaCardProps } from './MediaCard';

type MediaRailProps = {
  title: string;
  items: MediaCardProps[];
  viewAllHref?: string;
};

export default function MediaRail({ title, items, viewAllHref }: MediaRailProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { clientWidth } = scrollContainerRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.8 : clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section style={{ margin: '32px 0', padding: '0 5%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary, #fff)' }}>{title}</h2>
        {viewAllHref && (
          <Link href={viewAllHref} style={{ color: 'var(--accent, #6366f1)', textDecoration: 'none', fontSize: '14px', fontWeight: 500 }}>
            View All →
          </Link>
        )}
      </div>

      {(!items || items.length === 0) ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary, #aaa)', backgroundColor: 'var(--surface, #13131a)', borderRadius: 'var(--radius-md, 8px)' }}>
          No content available
        </div>
      ) : (
        <div style={{ position: 'relative' }} className="media-rail-container">
          <button
            onClick={() => scroll('left')}
            className="rail-nav-btn"
            style={{
              position: 'absolute',
              left: '-20px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '20px',
              backdropFilter: 'blur(4px)'
            }}
            aria-label="Scroll left"
          >
            ←
          </button>

          <div
            ref={scrollContainerRef}
            className="hide-scrollbar"
            style={{
              display: 'flex',
              gap: '16px',
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              scrollSnapType: 'x mandatory',
              paddingBottom: '16px',
              paddingTop: '16px',
            }}
          >
            {items.map((item) => (
              <div key={`${item.type}-${item.tmdbId}`} style={{ width: '200px', flexShrink: 0, scrollSnapAlign: 'start' }}>
                <MediaCard {...item} />
              </div>
            ))}
          </div>

          <button
            onClick={() => scroll('right')}
            className="rail-nav-btn"
            style={{
              position: 'absolute',
              right: '-20px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '20px',
              backdropFilter: 'blur(4px)'
            }}
            aria-label="Scroll right"
          >
            →
          </button>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .media-rail-container .rail-nav-btn {
          opacity: 1;
        }
        @media (min-width: 768px) {
          .media-rail-container .rail-nav-btn {
            opacity: 0;
            transition: opacity 0.2s;
          }
          .media-rail-container:hover .rail-nav-btn {
            opacity: 1;
          }
        }
      `}} />
    </section>
  );
}
