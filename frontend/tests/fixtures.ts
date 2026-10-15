import type { Movie, Recommendation } from '../src/api'

/**
 * @param overrides Fields that differ from a plain catalog row.
 */
export function movie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 1,
    title: 'Fargo (1996)',
    name: 'Fargo',
    year: 1996,
    fanCount: 10,
    ...overrides,
  }
}

/**
 * @param overrides Fields that differ from a plain suggestion.
 */
export function recommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: 60,
    title: 'Raiders of the Lost Ark (1981)',
    name: 'Raiders of the Lost Ark',
    year: 1981,
    score: 1,
    match: 100,
    reasons: [
      {
        movieId: 20,
        name: 'Star Wars',
        sharedViewers: 12,
        alsoLikedPercent: 40,
        score: 1,
      },
    ],
    ...overrides,
  }
}
