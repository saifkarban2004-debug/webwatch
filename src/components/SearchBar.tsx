'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type SearchResult = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  type: 'movie' | 'tv';
  year?: string;
  voteAverage?: number;
};

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchResults = async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error('Search error', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(value);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    router.push(`/watch/${result.type}/${result.tmdbId}`);
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }} ref={dropdownRef}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder="Search movies, TV shows..."
          style={{
            width: '100%',
            padding: '10px 40px 10px 15px',
            borderRadius: 'var(--radius-full, 999px)',
            border: '1px solid var(--border, #333)',
            backgroundColor: 'var(--bg-tertiary, #1f1f2e)',
            color: 'var(--text-primary, #fff)',
            outline: 'none',
            fontSize: '16px',
            transition: 'var(--transition-normal, all 0.2s)'
          }}
        />
        <span style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary, #aaa)' }}>
          🔍
        </span>
      </div>

      {isOpen && query && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '8px',
          backgroundColor: 'var(--surface, #13131a)',
          borderRadius: 'var(--radius-md, 8px)',
          border: '1px solid var(--border, #333)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 100,
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {isLoading ? (
            <div style={{ padding: '15px', textAlign: 'center', color: 'var(--text-secondary, #aaa)' }}>
              Loading...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '15px', textAlign: 'center', color: 'var(--text-secondary, #aaa)' }}>
              No results found
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {results.map((result, index) => (
                <li
                  key={`${result.type}-${result.tmdbId}`}
                  onClick={() => handleSelect(result)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px',
                    gap: '10px',
                    cursor: 'pointer',
                    backgroundColor: index === selectedIndex ? 'var(--bg-tertiary, #1f1f2e)' : 'transparent',
                    borderBottom: '1px solid var(--border, #333)',
                    transition: 'var(--transition-fast, all 0.1s)'
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {result.posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${result.posterPath}`}
                      alt={result.title}
                      width={40}
                      height={60}
                      style={{ borderRadius: 'var(--radius-sm, 4px)', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: 40, height: 60, backgroundColor: 'var(--bg-secondary, #2a2a35)', borderRadius: 'var(--radius-sm, 4px)' }} />
                  )}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: 'var(--text-primary, #fff)', fontWeight: 500, fontSize: '14px' }}>{result.title}</span>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-secondary, #aaa)' }}>
                      <span>{result.year}</span>
                      <span style={{ 
                        backgroundColor: 'var(--accent, #6366f1)', 
                        color: '#fff', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        fontSize: '10px',
                        textTransform: 'uppercase'
                      }}>
                        {result.type}
                      </span>
                      {result.voteAverage != null && <span>⭐ {result.voteAverage.toFixed(1)}</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
