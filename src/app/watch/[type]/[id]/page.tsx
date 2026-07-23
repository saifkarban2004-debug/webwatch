import { Metadata } from 'next';
import { getMovieDetails, getTVShowDetails, getTMDBImageUrl, getSeasonDetails } from '@/lib/tmdb';
import { buildEmbedServers } from '@/lib/embed-builder';
import WatchPlayer from '@/components/WatchPlayer';
import MediaDetails from '@/components/MediaDetails';
import EpisodeSelector from '@/components/EpisodeSelector';

interface WatchPageProps {
  params: { type: string; id: string };
  searchParams: { season?: string; episode?: string };
}

interface ServerInfo {
  name: string;
  key: string;
  url: string;
}

interface MediaMetadata {
  tmdbId: number;
  title: string;
  overview: string;
  posterPath: string;
  backdropPath: string;
  releaseDate?: string;
  firstAirDate?: string;
  runtime?: number;
  voteAverage: number;
  voteCount?: number;
  genres: string[];
  cast: { name: string; character: string; profilePath: string }[];
  type: 'movie' | 'tv';
  tagline?: string;
  imdbId?: string;
}

interface SeasonInfo {
  seasonNumber: number;
  name: string;
  episodeCount: number;
}

interface EpisodeInfo {
  episodeNumber: number;
  name: string;
  overview: string;
  stillPath: string;
  airDate: string;
  runtime: number | null;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: WatchPageProps): Promise<Metadata> {
  const { type, id } = params;
  let title = 'Watch on WebWatch';
  let description = 'Watch movies and TV shows online.';
  let image = '';

  try {
    if (type === 'movie') {
      const details = await getMovieDetails(Number(id));
      title = `Watch ${details.title} - WebWatch`;
      description = details.overview || description;
      if (details.backdrop_path) {
        image = getTMDBImageUrl(details.backdrop_path, 'backdrop');
      }
    } else if (type === 'tv') {
      const details = await getTVShowDetails(Number(id));
      title = `Watch ${details.name} - WebWatch`;
      description = details.overview || description;
      if (details.backdrop_path) {
        image = getTMDBImageUrl(details.backdrop_path, 'backdrop');
      }
    }
  } catch (error) {
    // Fallback to defaults
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const { type, id } = params;
  const tmdbId = Number(id);
  const seasonNum = searchParams.season ? Number(searchParams.season) : 1;
  const episodeNum = searchParams.episode ? Number(searchParams.episode) : 1;

  let servers: ServerInfo[] = [];
  let metadata: MediaMetadata | null = null;
  let seasons: SeasonInfo[] = [];
  let episodes: EpisodeInfo[] = [];
  let currentSeason = seasonNum;
  let currentEpisode = episodeNum;

  try {
    // Attempt internal API fetch
    const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/watch/${type}/${id}?season=${seasonNum}&episode=${episodeNum}`;
    const res = await fetch(apiUrl, { cache: 'no-store' });
    
    if (res.ok) {
      const data = await res.json();
      servers = data.servers;
      metadata = data.metadata;
      if (type === 'tv') {
        seasons = data.seasons || [];
        episodes = data.episodes || [];
      }
    } else {
      throw new Error('API fetch failed');
    }
  } catch (err) {
    // FALLBACK: Fetch directly from TMDB
    console.error('API failed, falling back to direct fetch', err);
    
    if (type === 'movie') {
      const details = await getMovieDetails(tmdbId);
      if (details) {
        servers = await buildEmbedServers({ type: 'movie', tmdbId: String(tmdbId) });
        metadata = {
          tmdbId,
          title: details.title,
          overview: details.overview,
          posterPath: details.poster_path ? getTMDBImageUrl(details.poster_path, 'poster') : '',
          backdropPath: details.backdrop_path ? getTMDBImageUrl(details.backdrop_path, 'backdrop') : '',
          releaseDate: details.release_date || undefined,
          runtime: details.runtime || undefined,
          voteAverage: details.vote_average || 0,
          voteCount: details.vote_count || 0,
          genres: details.genres?.map((g: any) => g.name) || [],
          cast: details.credits?.cast?.slice(0, 15).map((c: any) => ({
            name: c.name,
            character: c.character,
            profilePath: c.profile_path ? getTMDBImageUrl(c.profile_path, 'profile') : ''
          })) || [],
          type: 'movie',
          tagline: details.tagline || undefined,
          imdbId: details.imdb_id || undefined,
        };
      }
    } else if (type === 'tv') {
      const details = await getTVShowDetails(tmdbId);
      if (details) {
        servers = await buildEmbedServers({ type: 'tv', tmdbId: String(tmdbId), season: seasonNum, episode: episodeNum });
        metadata = {
          tmdbId,
          title: details.name,
          overview: details.overview,
          posterPath: details.poster_path ? getTMDBImageUrl(details.poster_path, 'poster') : '',
          backdropPath: details.backdrop_path ? getTMDBImageUrl(details.backdrop_path, 'backdrop') : '',
          firstAirDate: details.first_air_date || undefined,
          voteAverage: details.vote_average || 0,
          voteCount: details.vote_count || 0,
          genres: details.genres?.map((g: any) => g.name) || [],
          cast: details.credits?.cast?.slice(0, 15).map((c: any) => ({
            name: c.name,
            character: c.character,
            profilePath: c.profile_path ? getTMDBImageUrl(c.profile_path, 'profile') : ''
          })) || [],
          type: 'tv',
          tagline: details.tagline || undefined,
        };
        
        seasons = details.seasons?.map((s: any) => ({
          seasonNumber: s.season_number,
          name: s.name,
          episodeCount: s.episode_count,
        })) || [];
        
        if (seasonNum) {
           const seasonDetails = await getSeasonDetails(tmdbId, seasonNum);
           if (seasonDetails && seasonDetails.episodes) {
             episodes = seasonDetails.episodes.map((e: any) => ({
               episodeNumber: e.episode_number,
               name: e.name,
               overview: e.overview,
               stillPath: e.still_path ? getTMDBImageUrl(e.still_path, 'still') : '',
               airDate: e.air_date || undefined,
               runtime: e.runtime || undefined,
             }));
           }
        }
      }
    }
  }

  if (!metadata) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>
        <h2>Media not found</h2>
        <p>Could not load details for this media.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <WatchPlayer
        servers={servers}
        title={metadata.title}
        type={metadata.type}
        tmdbId={metadata.tmdbId}
        season={currentSeason}
        episode={currentEpisode}
        posterPath={metadata.posterPath}
        backdropPath={metadata.backdropPath}
        year={metadata.type === 'movie' ? metadata.releaseDate?.substring(0,4) : metadata.firstAirDate?.substring(0,4)}
      />

      <div style={{ marginTop: '2rem' }}>
        <MediaDetails metadata={metadata} />
      </div>

      {metadata.type === 'tv' && seasons.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <EpisodeSelector
            tmdbId={tmdbId}
            seasons={seasons}
            episodes={episodes}
            currentSeason={currentSeason}
            currentEpisode={currentEpisode}
          />
        </div>
      )}
    </div>
  );
}
