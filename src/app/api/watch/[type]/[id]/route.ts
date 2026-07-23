import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMovieDetails, getTVShowDetails, getSeasonDetails, getTMDBImageUrl } from '@/lib/tmdb';
import { buildEmbedServers } from '@/lib/embed-builder';

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const { type, id } = params;
    const searchParams = request.nextUrl.searchParams;
    const seasonParam = searchParams.get('season');
    const episodeParam = searchParams.get('episode');

    const season = seasonParam ? parseInt(seasonParam, 10) : undefined;
    const episode = episodeParam ? parseInt(episodeParam, 10) : undefined;
    const tmdbId = parseInt(id, 10);

    if (isNaN(tmdbId) || (type !== 'movie' && type !== 'tv')) {
      return NextResponse.json({ error: 'Invalid type or ID' }, { status: 400 });
    }

    let metadata: any = null;
    let seasonsData: any[] = [];
    let episodesData: any[] = [];

    if (type === 'movie') {
      let dbMovie = await prisma.movie.findUnique({
        where: { tmdbId },
        include: {
          genres: { include: { genre: true } },
          cast: { include: { person: true } }
        }
      });

      if (!dbMovie) {
        const tmdbMovie = await getMovieDetails(tmdbId);
        if (!tmdbMovie) return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
        
        metadata = {
          tmdbId: tmdbMovie.id,
          title: tmdbMovie.title,
          overview: tmdbMovie.overview,
          posterPath: getTMDBImageUrl(tmdbMovie.poster_path, 'poster'),
          backdropPath: getTMDBImageUrl(tmdbMovie.backdrop_path, 'backdrop'),
          releaseDate: tmdbMovie.release_date,
          runtime: tmdbMovie.runtime,
          voteAverage: tmdbMovie.vote_average,
          voteCount: tmdbMovie.vote_count,
          genres: tmdbMovie.genres?.map((g: any) => g.name) || [],
          cast: tmdbMovie.credits?.cast?.slice(0, 10).map((c: any) => ({
            name: c.name,
            character: c.character,
            profilePath: getTMDBImageUrl(c.profile_path, 'profile')
          })) || [],
          type: 'movie',
          tagline: tmdbMovie.tagline,
          imdbId: tmdbMovie.imdb_id
        };
      } else {
        metadata = {
          tmdbId: dbMovie.tmdbId,
          title: dbMovie.title,
          overview: dbMovie.overview,
          posterPath: getTMDBImageUrl(dbMovie.posterPath, 'poster'),
          backdropPath: getTMDBImageUrl(dbMovie.backdropPath, 'backdrop'),
          releaseDate: dbMovie.releaseDate?.toISOString().split('T')[0],
          runtime: dbMovie.runtime,
          voteAverage: dbMovie.voteAverage,
          voteCount: dbMovie.voteCount,
          genres: dbMovie.genres.map((g: any) => g.genre.name),
          cast: dbMovie.cast.slice(0, 10).map((c: any) => ({
            name: c.person.name,
            character: c.character,
            profilePath: getTMDBImageUrl(c.person.profilePath, 'profile')
          })),
          type: 'movie',
          tagline: dbMovie.tagline,
          imdbId: dbMovie.imdbId
        };
      }
    } else {
      let dbTV = await prisma.tVShow.findUnique({
        where: { tmdbId },
        include: {
          genres: { include: { genre: true } },
          cast: { include: { person: true } },
          seasons: true
        }
      });

      if (!dbTV) {
        const tmdbTV = await getTVShowDetails(tmdbId);
        if (!tmdbTV) return NextResponse.json({ error: 'TV Show not found' }, { status: 404 });
        
        metadata = {
          tmdbId: tmdbTV.id,
          name: tmdbTV.name,
          title: tmdbTV.name, // for consistency
          overview: tmdbTV.overview,
          posterPath: getTMDBImageUrl(tmdbTV.poster_path, 'poster'),
          backdropPath: getTMDBImageUrl(tmdbTV.backdrop_path, 'backdrop'),
          firstAirDate: tmdbTV.first_air_date,
          voteAverage: tmdbTV.vote_average,
          voteCount: tmdbTV.vote_count,
          genres: tmdbTV.genres?.map((g: any) => g.name) || [],
          cast: tmdbTV.credits?.cast?.slice(0, 10).map((c: any) => ({
            name: c.name,
            character: c.character,
            profilePath: getTMDBImageUrl(c.profile_path, 'profile')
          })) || [],
          type: 'tv',
          tagline: tmdbTV.tagline
        };
        
        seasonsData = tmdbTV.seasons?.map((s: any) => ({
          seasonNumber: s.season_number,
          name: s.name,
          episodeCount: s.episode_count
        })) || [];
        
        if (season !== undefined) {
          const seasonDetails = await getSeasonDetails(tmdbId, season);
          if (seasonDetails && seasonDetails.episodes) {
            episodesData = seasonDetails.episodes.map((ep: any) => ({
              episodeNumber: ep.episode_number,
              name: ep.name,
              overview: ep.overview,
              stillPath: getTMDBImageUrl(ep.still_path, 'still'),
              airDate: ep.air_date,
              runtime: ep.runtime
            }));
          }
        }
      } else {
        metadata = {
          tmdbId: dbTV.tmdbId,
          name: dbTV.name,
          title: dbTV.name,
          overview: dbTV.overview,
          posterPath: getTMDBImageUrl(dbTV.posterPath, 'poster'),
          backdropPath: getTMDBImageUrl(dbTV.backdropPath, 'backdrop'),
          firstAirDate: dbTV.firstAirDate?.toISOString().split('T')[0],
          voteAverage: dbTV.voteAverage,
          voteCount: dbTV.voteCount,
          genres: dbTV.genres.map((g: any) => g.genre.name),
          cast: dbTV.cast.slice(0, 10).map((c: any) => ({
            name: c.person.name,
            character: c.character,
            profilePath: getTMDBImageUrl(c.person.profilePath, 'profile')
          })),
          type: 'tv',
          tagline: dbTV.tagline
        };
        
        seasonsData = dbTV.seasons.map((s: any) => ({
          seasonNumber: s.seasonNumber,
          name: s.name,
          episodeCount: s.episodeCount
        }));
        
        // If the sync script missed seasons, fallback to TMDB
        if (seasonsData.length === 0) {
          const tmdbTV = await getTVShowDetails(tmdbId);
          if (tmdbTV && tmdbTV.seasons) {
            seasonsData = tmdbTV.seasons.map((s: any) => ({
              seasonNumber: s.season_number,
              name: s.name,
              episodeCount: s.episode_count
            }));
          }
        }
        
        if (season !== undefined) {
          const seasonDetails = await getSeasonDetails(tmdbId, season);
          if (seasonDetails && seasonDetails.episodes) {
            episodesData = seasonDetails.episodes.map((ep: any) => ({
              episodeNumber: ep.episode_number,
              name: ep.name,
              overview: ep.overview,
              stillPath: getTMDBImageUrl(ep.still_path, 'still'),
              airDate: ep.air_date,
              runtime: ep.runtime
            }));
          }
        }
      }
    }

    const servers = await buildEmbedServers({ tmdbId: String(tmdbId), type, season, episode });

    const response: any = {
      metadata,
      servers
    };

    if (type === 'tv') {
      response.seasons = seasonsData;
      if (season !== undefined) {
        response.episodes = episodesData;
        response.currentSeason = season;
        response.currentEpisode = episode;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching watch data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
