import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getPopularTV, getTMDBImageUrl } from '@/lib/tmdb';
import TVGrid from './TVGrid';

export const metadata: Metadata = {
  title: 'TV Shows — WebWatch',
  description: 'Explore our collection of popular TV shows.',
};

export const dynamic = 'force-dynamic';

const GENRE_MAP: Record<string, string> = {
  '10759': 'Action & Adventure',
  '16': 'Animation',
  '35': 'Comedy',
  '80': 'Crime',
  '99': 'Documentary',
  '18': 'Drama',
  '10751': 'Family',
  '10762': 'Kids',
  '9648': 'Mystery',
  '10763': 'News',
  '10764': 'Reality',
  '10765': 'Sci-Fi & Fantasy',
  '10766': 'Soap',
  '10767': 'Talk',
  '10768': 'War & Politics',
  '37': 'Western',
  'Action & Adventure': 'Action & Adventure',
  'Sci-Fi & Fantasy': 'Sci-Fi & Fantasy'
};

export default async function TVShowsPage() {
  let tvShows: any[] = [];

  // Try DB first
  try {
    const dbShows = await prisma.tVShow.findMany({
      orderBy: { popularity: 'desc' },
      take: 20,
      include: {
        genres: {
          include: { genre: true }
        }
      }
    });

    if (dbShows.length > 0) {
      tvShows = dbShows.map(s => ({
        id: s.tmdbId,
        title: s.name,
        posterPath: s.posterPath,
        voteAverage: s.voteAverage,
        releaseDate: s.firstAirDate ? s.firstAirDate.toISOString() : null,
        genres: s.genres.map((g: any) => GENRE_MAP[g.genre.name] || g.genre.name),
        type: 'tv'
      }));
    }
  } catch (error) {
    console.error('DB fetch failed for TV shows:', error);
  }

  // Fallback to TMDB if DB returned nothing
  if (tvShows.length === 0) {
    try {
      const tmdbData = await getPopularTV(1);
      if (tmdbData?.results) {
        tvShows = tmdbData.results.map((s: any) => ({
          id: s.id,
          title: s.name,
          posterPath: s.poster_path,
          voteAverage: s.vote_average,
          releaseDate: s.first_air_date,
          genres: s.genre_ids ? s.genre_ids.map((id: number) => GENRE_MAP[id.toString()] || id.toString()) : [],
          type: 'tv'
        }));
      }
    } catch (apiError) {
      console.error('TMDB API fallback failed:', apiError);
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: 'bold',
          background: 'linear-gradient(to right, var(--accent, #6366f1), var(--accent-secondary, #8b5cf6))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: '0 0 0.5rem 0'
        }}>
          TV Shows
        </h1>
        <p style={{ color: '#a1a1aa', margin: 0, fontSize: '1.2rem' }}>Explore our collection</p>
      </header>

      <TVGrid initialShows={tvShows} />
    </div>
  );
}
