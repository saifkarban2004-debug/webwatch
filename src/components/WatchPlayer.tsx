'use client';

import React, { useState, useEffect, useRef } from 'react';
import { addToHistory } from '@/lib/watch-history';

interface ServerInfo {
  name: string;
  key: string;
  url: string;
}

interface WatchPlayerProps {
  servers: ServerInfo[];
  title: string;
  type: 'movie' | 'tv';
  tmdbId: number;
  season?: number;
  episode?: number;
  episodeName?: string;
  posterPath?: string;
  backdropPath?: string;
  year?: string;
}

export default function WatchPlayer({
  servers,
  title,
  type,
  tmdbId,
  season,
  episode,
  episodeName,
  posterPath,
  backdropPath,
  year,
}: WatchPlayerProps) {
  const [activeServerIndex, setActiveServerIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [failedServers, setFailedServers] = useState<Set<number>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Record history on mount
    addToHistory({
      tmdbId,
      type,
      title,
      posterPath: posterPath || null,
      season,
      episode
    });
  }, [tmdbId, type, title, posterPath, season, episode]);

  const handleServerSwitch = (index: number) => {
    if (failedServers.has(index)) return;
    setActiveServerIndex(index);
    setIsLoading(true);
    setLoadError(false);
  };

  const markServerFailedAndSwitch = () => {
    setFailedServers(prev => {
      const next = new Set(prev);
      next.add(activeServerIndex);
      return next;
    });
    
    // Find next available server
    let nextIndex = -1;
    for (let i = 0; i < servers.length; i++) {
      if (i !== activeServerIndex && !failedServers.has(i)) {
        nextIndex = i;
        break;
      }
    }
    
    if (nextIndex !== -1) {
      setActiveServerIndex(nextIndex);
      setIsLoading(true);
      setLoadError(false);
    } else {
      // All servers failed
      setLoadError(true);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    if (isLoading && !loadError) {
      timerRef.current = setTimeout(() => {
        if (isLoading) {
          markServerFailedAndSwitch();
        }
      }, 8000);
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeServerIndex, isLoading, loadError]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleRetry = () => {
    setFailedServers(new Set());
    setActiveServerIndex(0);
    setIsLoading(true);
    setLoadError(false);
  };

  const currentServer = servers[activeServerIndex];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div 
        style={{ 
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: '#000',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
        }}
      >
        {loadError ? (
          <div style={{ 
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)',
            backgroundColor: 'var(--surface)'
          }}>
            <p style={{ marginBottom: '1rem' }}>All servers failed to load.</p>
            <button 
              onClick={handleRetry}
              style={{ 
                padding: '0.5rem 1rem', background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: '0.25rem', cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {isLoading && (
              <div style={{ 
                position: 'absolute', inset: 0, backgroundColor: 'var(--surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
              }}>
                <div style={{ 
                  width: '50px', height: '50px', border: '3px solid var(--accent)', 
                  borderTopColor: 'transparent', borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}>
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                </div>
              </div>
            )}
            {currentServer && (
              <iframe
                key={`server-${activeServerIndex}`}
                src={currentServer.url}
                style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', inset: 0 }}
                allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
                referrerPolicy="no-referrer"
                loading="lazy"
                allowFullScreen
                onLoad={handleIframeLoad}
                onError={markServerFailedAndSwitch}
              />
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginRight: '0.5rem' }}>
          Servers:
        </span>
        {servers.map((server, idx) => {
          const isFailed = failedServers.has(idx);
          const isActive = activeServerIndex === idx;
          
          return (
            <button
              key={server.key}
              onClick={() => handleServerSwitch(idx)}
              disabled={isFailed}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                border: '1px solid',
                borderColor: isActive ? 'var(--accent)' : 'var(--surface)',
                backgroundColor: isActive ? 'var(--accent)' : 'var(--surface)',
                color: isFailed ? 'gray' : '#fff',
                textDecoration: isFailed ? 'line-through' : 'none',
                cursor: isFailed ? 'not-allowed' : 'pointer',
                opacity: isFailed ? 0.5 : 1,
                boxShadow: isActive ? '0 0 10px var(--accent)' : 'none',
                transition: 'all 0.2s'
              }}
            >
              {isActive && <span style={{ fontSize: '0.8rem' }}>✓</span>}
              {isFailed && <span style={{ fontSize: '0.8rem' }}>✗</span>}
              {!isActive && !isFailed && <span style={{ fontSize: '0.8rem' }}>○</span>}
              {server.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
