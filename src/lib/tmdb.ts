/**
 * TMDB API Client
 * Handles all interactions with The Movie Database API v3
 * Includes rate-limit-aware fetching with retry logic
 */

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TMDBMovie {
  id: number;
  imdb_id?: string;
  title: string;
  original_title: string;
  overview: string;
  tagline?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  status?: string;
  original_language: string;
  adult: boolean;
  budget?: number;
  revenue?: number;
  genres?: { id: number; name: string }[];
  credits?: {
    cast: TMDBCastMember[];
  };
}

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  tagline?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  status?: string;
  number_of_seasons: number;
  number_of_episodes: number;
  original_language: string;
  in_production: boolean;
  genres?: { id: number; name: string }[];
  seasons?: TMDBSeason[];
  credits?: {
    cast: TMDBCastMember[];
  };
}

export interface TMDBSeason {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string | null;
  episode_count: number;
  episodes?: TMDBEpisode[];
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  profile_path: string | null;
  character: string;
  order: number;
}

export interface TMDBSearchResult {
  id: number;
  media_type: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  overview: string;
}

interface TMDBPaginatedResponse<T> {
  page: number;
  total_pages: number;
  total_results: number;
  results: T[];
}

// ─── Image URL Builder ───────────────────────────────────────────────────────

type ImageSize = 'poster' | 'backdrop' | 'profile' | 'still';

const IMAGE_SIZES: Record<ImageSize, string> = {
  poster: 'w500',
  backdrop: 'w1280',
  profile: 'w185',
  still: 'w300',
};

export function getTMDBImageUrl(
  path: string | null | undefined,
  size: ImageSize = 'poster'
): string {
  if (!path) return '';
  return `${TMDB_IMAGE_BASE}/${IMAGE_SIZES[size]}${path}`;
}

export function getTMDBOriginalImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  return `${TMDB_IMAGE_BASE}/original${path}`;
}

// ─── Rate-Limited Fetcher ────────────────────────────────────────────────────

async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
  retries = 3
): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) {
    throw new Error('TMDB_READ_TOKEN environment variable is not set');
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 3600 }, // Cache for 1 hour in Next.js
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
        console.warn(`[TMDB] Rate limited. Retrying in ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (attempt === retries) throw error;
      const backoff = Math.pow(2, attempt) * 1000;
      console.warn(`[TMDB] Request failed, retrying in ${backoff}ms...`, error);
      await sleep(backoff);
    }
  }

  throw new Error('TMDB fetch exhausted all retries');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── API Endpoints ───────────────────────────────────────────────────────────

/** Fetch trending movies for the day */
export async function getTrendingMovies(page = 1): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>('/trending/movie/day', {
    page: String(page),
    language: 'en-US',
  });
}

/** Fetch trending TV shows for the day */
export async function getTrendingTV(page = 1): Promise<TMDBPaginatedResponse<TMDBTVShow>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBTVShow>>('/trending/tv/day', {
    page: String(page),
    language: 'en-US',
  });
}

/** Fetch popular movies */
export async function getPopularMovies(page = 1): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>('/movie/popular', {
    page: String(page),
    language: 'en-US',
  });
}

/** Fetch popular TV shows */
export async function getPopularTV(page = 1): Promise<TMDBPaginatedResponse<TMDBTVShow>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBTVShow>>('/tv/popular', {
    page: String(page),
    language: 'en-US',
  });
}

/** Fetch top rated movies */
export async function getTopRatedMovies(page = 1): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>('/movie/top_rated', {
    page: String(page),
    language: 'en-US',
  });
}

/** Fetch top rated TV shows */
export async function getTopRatedTV(page = 1): Promise<TMDBPaginatedResponse<TMDBTVShow>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBTVShow>>('/tv/top_rated', {
    page: String(page),
    language: 'en-US',
  });
}

/** Fetch detailed movie info with credits */
export async function getMovieDetails(tmdbId: number): Promise<TMDBMovie> {
  return tmdbFetch<TMDBMovie>(`/movie/${tmdbId}`, {
    append_to_response: 'credits',
    language: 'en-US',
  });
}

/** Fetch detailed TV show info with credits */
export async function getTVShowDetails(tmdbId: number): Promise<TMDBTVShow> {
  return tmdbFetch<TMDBTVShow>(`/tv/${tmdbId}`, {
    append_to_response: 'credits',
    language: 'en-US',
  });
}

/** Fetch season details with all episodes */
export async function getSeasonDetails(
  tvId: number,
  seasonNumber: number
): Promise<TMDBSeason> {
  return tmdbFetch<TMDBSeason>(`/tv/${tvId}/season/${seasonNumber}`, {
    language: 'en-US',
  });
}

/** Multi-search across movies, TV, and people */
export async function searchMulti(
  query: string,
  page = 1
): Promise<TMDBPaginatedResponse<TMDBSearchResult>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBSearchResult>>('/search/multi', {
    query,
    page: String(page),
    include_adult: 'false',
    language: 'en-US',
  });
}

/** Discover movies by genre */
export async function discoverMoviesByGenre(genreId: number, page = 1): Promise<TMDBPaginatedResponse<TMDBMovie>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBMovie>>('/discover/movie', {
    with_genres: String(genreId),
    sort_by: 'popularity.desc',
    page: String(page),
    language: 'en-US',
  });
}

/** Discover TV shows by genre */
export async function discoverTVByGenre(genreId: number, page = 1): Promise<TMDBPaginatedResponse<TMDBTVShow>> {
  return tmdbFetch<TMDBPaginatedResponse<TMDBTVShow>>('/discover/tv', {
    with_genres: String(genreId),
    sort_by: 'popularity.desc',
    page: String(page),
    language: 'en-US',
  });
}

/** Fetch combined movie & TV credits for a person */
export async function getPersonCredits(personId: number): Promise<any> {
  return tmdbFetch<any>(`/person/${personId}/combined_credits`, {
    language: 'en-US',
  });
}

/** Fetch person details */
export async function getPersonDetails(personId: number): Promise<any> {
  return tmdbFetch<any>(`/person/${personId}`, {
    language: 'en-US',
  });
}
