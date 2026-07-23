import React from 'react';
import prisma from '@/lib/prisma';
import { 
  getTrendingMovies, 
  getTrendingTV, 
  getPopularMovies, 
  getTopRatedMovies, 
  getTopRatedTV 
} from '@/lib/tmdb';
import HeroBanner, { HeroItem } from '@/components/HeroBanner';
import MediaRail from '@/components/MediaRail';
import WatchHistory from '@/components/WatchHistory';

export const metadata = {
  title: 'WebWatch | Your Ultimate VOD Aggregator',
  description: 'Watch your favorite movies and TV shows online for free.',
};

export default async function HomePage() {
  let trendingMovies: any[] = [];
  let trendingTV: any[] = [];
  let popularMovies: any[] = [];
  let topRatedMovies: any[] = [];
  let topRatedTV: any[] = [];
  let useTMDB = false;

  try {
    const dbMovies = await prisma.movie.findMany({
      orderBy: { popularity: 'desc' },
      take: 20,
    });
    const dbTVShows = await prisma.tVShow.findMany({
      orderBy: { popularity: 'desc' },
      take: 20,
    });

    if (dbMovies.length === 0 && dbTVShows.length === 0) {
      useTMDB = true;
    } else {
      trendingMovies = dbMovies.map(m => ({
        tmdbId: m.tmdbId,
        title: m.title,
        posterPath: m.posterPath,
        backdropPath: m.backdropPath,
        type: 'movie',
        voteAverage: m.voteAverage,
        year: m.releaseDate ? new Date(m.releaseDate).getFullYear().toString() : undefined,
        overview: m.overview
      }));
      trendingTV = dbTVShows.map(t => ({
        tmdbId: t.tmdbId,
        title: t.name,
        posterPath: t.posterPath,
        backdropPath: t.backdropPath,
        type: 'tv',
        voteAverage: t.voteAverage,
        year: t.firstAirDate ? new Date(t.firstAirDate).getFullYear().toString() : undefined,
        overview: t.overview
      }));
      popularMovies = [...trendingMovies].slice(0, 10);
      topRatedMovies = [...trendingMovies].sort((a,b) => (b.voteAverage || 0) - (a.voteAverage || 0));
      topRatedTV = [...trendingTV].sort((a,b) => (b.voteAverage || 0) - (a.voteAverage || 0));
    }
  } catch (error) {
    console.error('Database connection failed, falling back to TMDB API:', error);
    useTMDB = true;
  }

  if (useTMDB) {
    try {
      const [tmdbTrendingMovies, tmdbTrendingTV, tmdbPopularMovies, tmdbTopRatedMovies, tmdbTopRatedTV] = await Promise.all([
        getTrendingMovies(),
        getTrendingTV(),
        getPopularMovies(),
        getTopRatedMovies(),
        getTopRatedTV()
      ]);

      const mapTMDB = (item: any, type: 'movie'|'tv') => ({
        tmdbId: item.id,
        title: item.title || item.name,
        posterPath: item.poster_path,
        backdropPath: item.backdrop_path,
        type,
        voteAverage: item.vote_average,
        year: item.release_date ? item.release_date.substring(0,4) : (item.first_air_date ? item.first_air_date.substring(0,4) : undefined),
        overview: item.overview
      });

      trendingMovies = (tmdbTrendingMovies?.results || []).map((m: any) => mapTMDB(m, 'movie'));
      trendingTV = (tmdbTrendingTV?.results || []).map((t: any) => mapTMDB(t, 'tv'));
      popularMovies = (tmdbPopularMovies?.results || []).map((m: any) => mapTMDB(m, 'movie'));
      topRatedMovies = (tmdbTopRatedMovies?.results || []).map((m: any) => mapTMDB(m, 'movie'));
      topRatedTV = (tmdbTopRatedTV?.results || []).map((t: any) => mapTMDB(t, 'tv'));
    } catch (apiError) {
      console.error('TMDB API fallback failed:', apiError);
    }
  }

  const allTrending = [...trendingMovies, ...trendingTV].filter(item => item.backdropPath);
  allTrending.sort((a, b) => (b.popularity || 0) - (a.popularity || 0)); 
  const heroItems: HeroItem[] = allTrending.slice(0, 5) as HeroItem[];

  return (
    <div style={{ backgroundColor: 'var(--bg-primary, #0a0a0f)', minHeight: '100vh', color: 'var(--text-primary, #fff)', paddingBottom: '40px' }}>
      <HeroBanner items={heroItems} />
      
      <div style={{ marginTop: '-40px', position: 'relative', zIndex: 10 }}>
        {WatchHistory && <WatchHistory />}

        <MediaRail title="Trending Movies" items={trendingMovies} viewAllHref="/movies/trending" />
        <MediaRail title="Trending TV Shows" items={trendingTV} viewAllHref="/tv/trending" />
        <MediaRail title="Popular Movies" items={popularMovies} viewAllHref="/movies/popular" />
        <MediaRail title="Top Rated Movies" items={topRatedMovies} viewAllHref="/movies/top-rated" />
        <MediaRail title="Top Rated TV Shows" items={topRatedTV} viewAllHref="/tv/top-rated" />
      </div>
    </div>
  );
}
