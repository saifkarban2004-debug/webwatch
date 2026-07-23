/**
 * Media Sync Background Worker
 * Processes BullMQ jobs to sync TMDB metadata into the database.
 * Run as a separate process: npx ts-node src/workers/media-sync.worker.ts
 */

import { Worker, Job } from 'bullmq';
import {
  getTrendingMovies,
  getTrendingTV,
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
  getTopRatedTV,
  getMovieDetails,
  getTVShowDetails,
  getSeasonDetails,
  type TMDBMovie,
  type TMDBTVShow,
  type TMDBCastMember,
} from '../lib/tmdb';
import { createRedisConnection } from '../lib/queue';
import prisma from '../lib/prisma';

// ─── Job Processor ───────────────────────────────────────────────────────────

async function processJob(job: Job): Promise<void> {
  const { name, data } = job;
  console.log(`[Worker] Processing: ${name} (ID: ${job.id})`);

  switch (name) {
    case 'sync-trending':
      await syncTrending(data.pages || 3);
      break;

    case 'sync-popular':
      await syncPopular(data.pages || 5);
      break;

    case 'sync-toprated':
      await syncTopRated(data.pages || 3);
      break;

    case 'sync-full':
      await syncTrending(data.pages || 5);
      await syncPopular(data.pages || 5);
      await syncTopRated(data.pages || 3);
      break;

    case 'sync-movie-details':
      await syncMovieDetails(data.tmdbId);
      break;

    case 'sync-tv-details':
      await syncTVDetails(data.tmdbId);
      break;

    default:
      console.warn(`[Worker] Unknown job name: ${name}`);
  }
}

// ─── Sync Functions ──────────────────────────────────────────────────────────

async function syncTrending(pages: number): Promise<void> {
  console.log(`[Sync] Fetching ${pages} pages of trending content...`);

  for (let page = 1; page <= pages; page++) {
    // Sync trending movies
    const movieResult = await getTrendingMovies(page);
    for (const movie of movieResult.results) {
      await upsertMovie(movie);
    }
    console.log(`[Sync] Trending movies page ${page}: ${movieResult.results.length} items`);

    // Sync trending TV shows
    const tvResult = await getTrendingTV(page);
    for (const show of tvResult.results) {
      await upsertTVShow(show);
    }
    console.log(`[Sync] Trending TV page ${page}: ${tvResult.results.length} items`);

    // Rate limit courtesy: small delay between pages
    await sleep(250);
  }
}

async function syncPopular(pages: number): Promise<void> {
  console.log(`[Sync] Fetching ${pages} pages of popular content...`);

  for (let page = 1; page <= pages; page++) {
    const movieResult = await getPopularMovies(page);
    for (const movie of movieResult.results) {
      await upsertMovie(movie);
    }

    const tvResult = await getPopularTV(page);
    for (const show of tvResult.results) {
      await upsertTVShow(show);
    }

    await sleep(250);
  }
}

async function syncTopRated(pages: number): Promise<void> {
  console.log(`[Sync] Fetching ${pages} pages of top rated content...`);

  for (let page = 1; page <= pages; page++) {
    const movieResult = await getTopRatedMovies(page);
    for (const movie of movieResult.results) {
      await upsertMovie(movie);
    }

    const tvResult = await getTopRatedTV(page);
    for (const show of tvResult.results) {
      await upsertTVShow(show);
    }

    await sleep(250);
  }
}

async function syncMovieDetails(tmdbId: number): Promise<void> {
  console.log(`[Sync] Fetching movie details for TMDB ID: ${tmdbId}`);
  const movie = await getMovieDetails(tmdbId);
  await upsertMovie(movie, true);
}

async function syncTVDetails(tmdbId: number): Promise<void> {
  console.log(`[Sync] Fetching TV details for TMDB ID: ${tmdbId}`);
  const show = await getTVShowDetails(tmdbId);
  await upsertTVShow(show, true);

  // Sync all seasons and episodes
  if (show.number_of_seasons) {
    for (let s = 1; s <= show.number_of_seasons; s++) {
      try {
        const seasonData = await getSeasonDetails(tmdbId, s);
        const dbShow = await prisma.tVShow.findUnique({
          where: { tmdbId: tmdbId },
        });

        if (dbShow) {
          const dbSeason = await prisma.season.upsert({
            where: {
              tvShowId_seasonNumber: {
                tvShowId: dbShow.id,
                seasonNumber: s,
              },
            },
            create: {
              tmdbId: seasonData.id,
              seasonNumber: s,
              name: seasonData.name || `Season ${s}`,
              overview: seasonData.overview || null,
              posterPath: seasonData.poster_path,
              airDate: seasonData.air_date ? new Date(seasonData.air_date) : null,
              episodeCount: seasonData.episode_count,
              tvShowId: dbShow.id,
            },
            update: {
              name: seasonData.name || `Season ${s}`,
              overview: seasonData.overview || null,
              posterPath: seasonData.poster_path,
              airDate: seasonData.air_date ? new Date(seasonData.air_date) : null,
              episodeCount: seasonData.episode_count,
            },
          });

          // Sync episodes for this season
          if (seasonData.episodes) {
            for (const ep of seasonData.episodes) {
              await prisma.episode.upsert({
                where: {
                  seasonId_episodeNumber: {
                    seasonId: dbSeason.id,
                    episodeNumber: ep.episode_number,
                  },
                },
                create: {
                  tmdbId: ep.id,
                  episodeNumber: ep.episode_number,
                  name: ep.name || `Episode ${ep.episode_number}`,
                  overview: ep.overview || null,
                  stillPath: ep.still_path,
                  airDate: ep.air_date ? new Date(ep.air_date) : null,
                  runtime: ep.runtime,
                  voteAverage: ep.vote_average || 0,
                  voteCount: ep.vote_count || 0,
                  seasonId: dbSeason.id,
                },
                update: {
                  name: ep.name || `Episode ${ep.episode_number}`,
                  overview: ep.overview || null,
                  stillPath: ep.still_path,
                  airDate: ep.air_date ? new Date(ep.air_date) : null,
                  runtime: ep.runtime,
                  voteAverage: ep.vote_average || 0,
                  voteCount: ep.vote_count || 0,
                },
              });
            }
          }
        }

        await sleep(300); // Rate limit courtesy between season fetches
      } catch (error) {
        console.error(`[Sync] Error syncing season ${s}:`, error);
      }
    }
  }
}

// ─── Database Upsert Helpers ─────────────────────────────────────────────────

async function upsertMovie(movie: TMDBMovie, withCredits = false): Promise<void> {
  try {
    const dbMovie = await prisma.movie.upsert({
      where: { tmdbId: movie.id },
      create: {
        tmdbId: movie.id,
        imdbId: movie.imdb_id || null,
        title: movie.title,
        originalTitle: movie.original_title,
        overview: movie.overview || null,
        tagline: movie.tagline || null,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        releaseDate: movie.release_date ? new Date(movie.release_date) : null,
        runtime: movie.runtime,
        voteAverage: movie.vote_average || 0,
        voteCount: movie.vote_count || 0,
        popularity: movie.popularity || 0,
        status: movie.status || null,
        language: movie.original_language || 'en',
        adult: movie.adult || false,
        budget: movie.budget ? BigInt(movie.budget) : null,
        revenue: movie.revenue ? BigInt(movie.revenue) : null,
      },
      update: {
        title: movie.title,
        overview: movie.overview || null,
        tagline: movie.tagline || null,
        posterPath: movie.poster_path,
        backdropPath: movie.backdrop_path,
        releaseDate: movie.release_date ? new Date(movie.release_date) : null,
        runtime: movie.runtime,
        voteAverage: movie.vote_average || 0,
        voteCount: movie.vote_count || 0,
        popularity: movie.popularity || 0,
        status: movie.status || null,
      },
    });

    const GENRE_MAP: Record<number, string> = {
      28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
      99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
      27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
      10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
      10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
      10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics'
    };

    // Sync genres
    const genresToSync = movie.genres ? movie.genres : 
      (movie.genre_ids ? movie.genre_ids.map(id => ({ id, name: GENRE_MAP[id] || id.toString() })) : []);

    if (genresToSync.length > 0) {
      await syncGenres(genresToSync);
      // Clear old genre links and create new ones
      await prisma.movieGenre.deleteMany({ where: { movieId: dbMovie.id } });
      for (const genre of genresToSync) {
        const dbGenre = await prisma.genre.findUnique({ where: { tmdbId: genre.id } });
        if (dbGenre) {
          await prisma.movieGenre.create({
            data: { movieId: dbMovie.id, genreId: dbGenre.id },
          });
        }
      }
    }

    // Sync cast if available
    if (withCredits && movie.credits?.cast) {
      await syncMovieCast(dbMovie.id, movie.credits.cast.slice(0, 20));
    }
  } catch (error) {
    console.error(`[Sync] Error upserting movie ${movie.title}:`, error);
  }
}

async function upsertTVShow(show: TMDBTVShow, withCredits = false): Promise<void> {
  try {
    const dbShow = await prisma.tVShow.upsert({
      where: { tmdbId: show.id },
      create: {
        tmdbId: show.id,
        name: show.name,
        originalName: show.original_name,
        overview: show.overview || null,
        tagline: show.tagline || null,
        posterPath: show.poster_path,
        backdropPath: show.backdrop_path,
        firstAirDate: show.first_air_date ? new Date(show.first_air_date) : null,
        lastAirDate: show.last_air_date ? new Date(show.last_air_date) : null,
        voteAverage: show.vote_average || 0,
        voteCount: show.vote_count || 0,
        popularity: show.popularity || 0,
        status: show.status || null,
        numberOfSeasons: show.number_of_seasons || null,
        numberOfEpisodes: show.number_of_episodes || null,
        language: show.original_language || 'en',
        inProduction: show.in_production || false,
      },
      update: {
        name: show.name,
        overview: show.overview || null,
        tagline: show.tagline || null,
        posterPath: show.poster_path,
        backdropPath: show.backdrop_path,
        firstAirDate: show.first_air_date ? new Date(show.first_air_date) : null,
        lastAirDate: show.last_air_date ? new Date(show.last_air_date) : null,
        voteAverage: show.vote_average || 0,
        voteCount: show.vote_count || 0,
        popularity: show.popularity || 0,
        status: show.status || null,
        numberOfSeasons: show.number_of_seasons || null,
        numberOfEpisodes: show.number_of_episodes || null,
      },
    });

    const GENRE_MAP: Record<number, string> = {
      28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
      99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
      27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
      10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
      10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
      10765: 'Sci-Fi & Fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics'
    };

    // Sync genres
    const genresToSync = show.genres ? show.genres : 
      (show.genre_ids ? show.genre_ids.map(id => ({ id, name: GENRE_MAP[id] || id.toString() })) : []);

    if (genresToSync.length > 0) {
      await syncGenres(genresToSync);
      await prisma.tVShowGenre.deleteMany({ where: { tvShowId: dbShow.id } });
      for (const genre of genresToSync) {
        const dbGenre = await prisma.genre.findUnique({ where: { tmdbId: genre.id } });
        if (dbGenre) {
          await prisma.tVShowGenre.create({
            data: { tvShowId: dbShow.id, genreId: dbGenre.id },
          });
        }
      }
    }

    // Sync basic season info
    if (show.seasons) {
      for (const season of show.seasons) {
        if (season.season_number === 0) continue; // Skip "Specials"
        await prisma.season.upsert({
          where: {
            tvShowId_seasonNumber: {
              tvShowId: dbShow.id,
              seasonNumber: season.season_number,
            },
          },
          create: {
            tmdbId: season.id,
            seasonNumber: season.season_number,
            name: season.name || `Season ${season.season_number}`,
            overview: season.overview || null,
            posterPath: season.poster_path,
            airDate: season.air_date ? new Date(season.air_date) : null,
            episodeCount: season.episode_count,
            tvShowId: dbShow.id,
          },
          update: {
            name: season.name || `Season ${season.season_number}`,
            posterPath: season.poster_path,
            episodeCount: season.episode_count,
          },
        });
      }
    }

    // Sync cast
    if (withCredits && show.credits?.cast) {
      await syncTVCast(dbShow.id, show.credits.cast.slice(0, 20));
    }
  } catch (error) {
    console.error(`[Sync] Error upserting TV show ${show.name}:`, error);
  }
}

async function syncGenres(genres: { id: number; name: string }[]): Promise<void> {
  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { tmdbId: genre.id },
      create: { tmdbId: genre.id, name: genre.name },
      update: { name: genre.name },
    });
  }
}

async function syncMovieCast(movieId: string, cast: TMDBCastMember[]): Promise<void> {
  await prisma.movieCast.deleteMany({ where: { movieId } });

  for (const member of cast) {
    const person = await prisma.person.upsert({
      where: { tmdbId: member.id },
      create: {
        tmdbId: member.id,
        name: member.name,
        profilePath: member.profile_path,
      },
      update: {
        name: member.name,
        profilePath: member.profile_path,
      },
    });

    await prisma.movieCast.create({
      data: {
        movieId,
        personId: person.id,
        character: member.character || null,
        castOrder: member.order,
      },
    });
  }
}

async function syncTVCast(tvShowId: string, cast: TMDBCastMember[]): Promise<void> {
  await prisma.tVShowCast.deleteMany({ where: { tvShowId } });

  for (const member of cast) {
    const person = await prisma.person.upsert({
      where: { tmdbId: member.id },
      create: {
        tmdbId: member.id,
        name: member.name,
        profilePath: member.profile_path,
      },
      update: {
        name: member.name,
        profilePath: member.profile_path,
      },
    });

    await prisma.tVShowCast.create({
      data: {
        tvShowId,
        personId: person.id,
        character: member.character || null,
        castOrder: member.order,
      },
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Worker Instance ─────────────────────────────────────────────────────────

let worker: Worker | null = null;
let connection: ReturnType<typeof createRedisConnection> | null = null;

if (process.env.ENABLE_WORKER === 'true') {
  connection = createRedisConnection();
  worker = new Worker('media-sync', processJob, {
    connection,
    concurrency: 3,
    limiter: {
      max: 10,
      duration: 1000,
    },
  });

  worker.on('completed', (job) => {
    console.log(`[Worker] ✅ Job ${job.id} (${job.name}) completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] ❌ Job ${job?.id} (${job?.name}) failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err);
  });

  console.log('[Worker] Media sync worker started and listening for jobs...');
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

async function shutdown(): Promise<void> {
  console.log('[Worker] Shutting down gracefully...');
  if (worker) await worker.close();
  await prisma.$disconnect();
  if (connection) connection.disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { syncTrending, syncPopular, syncTopRated };
