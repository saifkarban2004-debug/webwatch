import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getTMDBImageUrl,
  getTrendingMovies,
  getTrendingTV,
  getPopularMovies,
  getPopularTV,
  getTopRatedMovies,
  getTopRatedTV,
} from '@/lib/tmdb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || 'trending';
    const type = searchParams.get('type') || 'movie';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 20;
    const skip = (page - 1) * limit;

    if (type !== 'movie' && type !== 'tv') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    let results: any[] = [];
    let totalResults = 0;

    const orderObj =
      category === 'top_rated'
        ? { voteAverage: 'desc' as const }
        : { popularity: 'desc' as const };

    try {
      if (type === 'movie') {
        const [movies, count] = await Promise.all([
          prisma.movie.findMany({
            orderBy: orderObj,
            skip,
            take: limit,
            include: { genres: { include: { genre: true } } },
          }),
          prisma.movie.count(),
        ]);

        results = movies.map((m) => ({
          tmdbId: m.tmdbId,
          title: m.title,
          type: 'movie' as const,
          posterPath: getTMDBImageUrl(m.posterPath, 'poster'),
          year: m.releaseDate ? m.releaseDate.toISOString().split('-')[0] : '',
          voteAverage: m.voteAverage,
          overview: m.overview,
          genres: m.genres.map((g) => g.genre.name),
        }));
        totalResults = count;
      } else {
        const [tvShows, count] = await Promise.all([
          prisma.tVShow.findMany({
            orderBy: orderObj,
            skip,
            take: limit,
            include: { genres: { include: { genre: true } } },
          }),
          prisma.tVShow.count(),
        ]);

        results = tvShows.map((tv) => ({
          tmdbId: tv.tmdbId,
          title: tv.name,
          type: 'tv' as const,
          posterPath: getTMDBImageUrl(tv.posterPath, 'poster'),
          year: tv.firstAirDate
            ? tv.firstAirDate.toISOString().split('-')[0]
            : '',
          voteAverage: tv.voteAverage,
          overview: tv.overview,
          genres: tv.genres.map((g) => g.genre.name),
        }));
        totalResults = count;
      }
    } catch {
      // DB not available, will fall through to TMDB fallback
    }

    // Fallback to TMDB if DB returned empty
    if (results.length === 0) {
      try {
        let tmdbData: any = null;

        if (type === 'movie') {
          if (category === 'top_rated') tmdbData = await getTopRatedMovies(page);
          else if (category === 'popular') tmdbData = await getPopularMovies(page);
          else tmdbData = await getTrendingMovies(page);
        } else {
          if (category === 'top_rated') tmdbData = await getTopRatedTV(page);
          else if (category === 'popular') tmdbData = await getPopularTV(page);
          else tmdbData = await getTrendingTV(page);
        }

        if (tmdbData?.results) {
          results = tmdbData.results.map((item: any) => ({
            tmdbId: item.id,
            title: item.title || item.name,
            type,
            posterPath: getTMDBImageUrl(item.poster_path, 'poster'),
            year: (item.release_date || item.first_air_date || '').split('-')[0],
            voteAverage: item.vote_average,
            overview: item.overview,
            genres: [],
          }));
          totalResults = tmdbData.total_results || results.length;
        }
      } catch (err) {
        console.warn('TMDB fallback failed:', err);
      }
    }

    return NextResponse.json({
      results,
      page,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    });
  } catch (error) {
    console.error('Browse error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
