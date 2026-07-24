import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getPopularMovies, getTMDBImageUrl } from '@/lib/tmdb';
import MoviesGrid from './MoviesGrid';

export const metadata: Metadata = {
  title: 'Movies — WebWatch',
  description: 'Explore our collection of popular movies.',
};

export const dynamic = 'force-dynamic';

const GENRE_MAP: Record<string, string> = {
  '28': 'Action',
  '12': 'Adventure',
  '16': 'Animation',
  '35': 'Comedy',
  '80': 'Crime',
  '99': 'Documentary',
  '18': 'Drama',
  '10751': 'Family',
  '14': 'Fantasy',
  '36': 'History',
  '27': 'Horror',
  '10402': 'Music',
  '9648': 'Mystery',
  '10749': 'Romance',
  '878': 'Sci-Fi',
  '10770': 'TV Movie',
  '53': 'Thriller',
  '10752': 'War',
  '37': 'Western',
  'Science Fiction': 'Sci-Fi'
};

export default async function MoviesPage() {
  let movies: any[] = [];

  // Try DB first
  try {
    const dbMovies = await prisma.movie.findMany({
      orderBy: { popularity: 'desc' },
      take: 20,
      include: {
        genres: {
          include: { genre: true }
        }
      }
    });

    if (dbMovies.length > 0) {
      movies = dbMovies.map(m => ({
        id: m.tmdbId,
        title: m.title,
        posterPath: m.posterPath,
        voteAverage: m.voteAverage,
        releaseDate: m.releaseDate ? m.releaseDate.toISOString() : null,
        genres: m.genres.map((g: any) => GENRE_MAP[g.genre.name] || g.genre.name),
        type: 'movie'
      }));
    }
  } catch (error) {
    console.error('DB fetch failed for movies:', error);
  }

  // Fallback to TMDB if DB returned nothing
  if (movies.length === 0) {
    try {
      const tmdbData = await getPopularMovies(1);
      if (tmdbData?.results) {
        movies = tmdbData.results.map((m: any) => ({
          id: m.id,
          title: m.title,
          posterPath: m.poster_path,
          voteAverage: m.vote_average,
          releaseDate: m.release_date,
          genres: m.genre_ids ? m.genre_ids.map((id: number) => GENRE_MAP[id.toString()] || id.toString()) : [],
          type: 'movie'
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
          Movies
        </h1>
        <p style={{ color: '#a1a1aa', margin: 0, fontSize: '1.2rem' }}>Explore our collection</p>
      </header>

      <MoviesGrid initialMovies={movies} />
    </div>
  );
}
