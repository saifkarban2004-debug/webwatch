import { NextRequest, NextResponse } from 'next/server';
import { getPersonCredits, getPersonDetails, getTMDBImageUrl } from '@/lib/tmdb';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const personId = parseInt(params.id, 10);
    if (isNaN(personId)) {
      return NextResponse.json({ error: 'Invalid person ID' }, { status: 400 });
    }

    const [person, credits] = await Promise.all([
      getPersonDetails(personId),
      getPersonCredits(personId),
    ]);

    // Combine and deduplicate cast credits, sorted by popularity
    const castCredits = (credits.cast || [])
      .filter((c: any) => c.media_type === 'movie' || c.media_type === 'tv')
      .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 50)
      .map((c: any) => ({
        tmdbId: c.id,
        title: c.title || c.name,
        type: c.media_type,
        character: c.character || '',
        posterPath: c.poster_path ? getTMDBImageUrl(c.poster_path, 'poster') : '',
        year: (c.release_date || c.first_air_date || '').split('-')[0],
        voteAverage: c.vote_average || 0,
      }));

    return NextResponse.json({
      id: person.id,
      name: person.name,
      profilePath: person.profile_path ? getTMDBImageUrl(person.profile_path, 'profile') : '',
      biography: person.biography || '',
      birthday: person.birthday || null,
      knownForDepartment: person.known_for_department || '',
      credits: castCredits,
    });
  } catch (error) {
    console.error('Person API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch person data' },
      { status: 500 }
    );
  }
}
