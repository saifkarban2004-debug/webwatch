import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import { searchMulti, getTMDBImageUrl } from '@/lib/tmdb';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters long' }, { status: 400 });
    }

    const searchQ = query.trim();

    // 1. Search local DB first
    const [dbMovies, dbTV] = await Promise.all([
      prisma.movie.findMany({
        where: { title: { contains: searchQ, mode: 'insensitive' } },
        take: 10
      }),
      prisma.tVShow.findMany({
        where: { name: { contains: searchQ, mode: 'insensitive' } },
        take: 10
      })
    ]);

    const results: any[] = [];
    const seenIds = new Set<string>();

    for (const m of dbMovies) {
      seenIds.add(`movie-${m.tmdbId}`);
      results.push({
        tmdbId: m.tmdbId,
        title: m.title,
        type: 'movie',
        posterPath: getTMDBImageUrl(m.posterPath, 'poster'),
        year: m.releaseDate ? m.releaseDate.toISOString().split('-')[0] : '',
        voteAverage: m.voteAverage,
        overview: m.overview
      });
    }

    for (const tv of dbTV) {
      seenIds.add(`tv-${tv.tmdbId}`);
      results.push({
        tmdbId: tv.tmdbId,
        title: tv.name,
        type: 'tv',
        posterPath: getTMDBImageUrl(tv.posterPath, 'poster'),
        year: tv.firstAirDate ? tv.firstAirDate.toISOString().split('-')[0] : '',
        voteAverage: tv.voteAverage,
        overview: tv.overview
      });
    }

    // 2. If < 5 results, fetch from TMDB
    if (results.length < 5) {
      const tmdbResults = await searchMulti(searchQ);
      if (tmdbResults && tmdbResults.results) {
        for (const item of tmdbResults.results) {
          if (item.media_type !== 'movie' && item.media_type !== 'tv') continue;
          
          const key = `${item.media_type}-${item.id}`;
          if (!seenIds.has(key)) {
            seenIds.add(key);
            results.push({
              tmdbId: item.id,
              title: item.media_type === 'movie' ? item.title : item.name,
              type: item.media_type,
              posterPath: getTMDBImageUrl(item.poster_path, 'poster'),
              year: item.media_type === 'movie' 
                ? (item.release_date?.split('-')[0] || '') 
                : (item.first_air_date?.split('-')[0] || ''),
              voteAverage: item.vote_average,
              overview: item.overview
            });
          }
        }
      }
    }

    const finalResults = results.slice(0, 20);

    return NextResponse.json({ results: finalResults });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
