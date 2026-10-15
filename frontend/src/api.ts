/**
 * Talks to the Laravel recommendation API. Vite proxies `/api` to the backend.
 *
 * Wire fields are owned by App\Data\CatalogListing and App\Data\SuggestionListing.
 * This module only renames them for the Vue components.
 */

/** A film in the catalog, with the article already moved in front of the title. */
export interface Movie {
  id: number
  title: string
  name: string
  year: number | null
  fanCount: number
}

/** One selected film's contribution to a suggestion. */
export interface Reason {
  movieId: number
  name: string
  sharedViewers: number
  alsoLikedPercent: number
  score: number
}

/** A catalog film suggested from the current likes. */
export interface Recommendation {
  id: number
  title: string
  name: string
  year: number | null
  score: number
  match: number
  reasons: Reason[]
}

interface ApiMovie {
  id: number
  title: string
  name: string
  year: number | null
  fan_count: number
}

interface ApiReason {
  movie_id: number
  name: string
  shared_viewers: number
  also_liked_percent: number
  score: number
}

interface ApiRecommendation {
  id: number
  title: string
  name: string
  year: number | null
  score: number
  match: number
  reasons: ApiReason[]
}

interface CatalogPayload {
  viewer_count: number
  max_picks: number
  movies: ApiMovie[]
}

interface RecommendationPayload {
  recommendations: ApiRecommendation[]
}

/** Catalog plus the selection cap the server will accept. */
export interface Catalog {
  viewerCount: number
  maxPicks: number
  movies: Movie[]
}

/**
 * @returns The catalog, with the selection cap the server will accept.
 */
export async function fetchCatalog(): Promise<Catalog> {
  const response = await fetch('/api/movies', {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error('Could not load the movie catalog.')
  }

  const payload = (await response.json()) as CatalogPayload

  return {
    viewerCount: payload.viewer_count,
    maxPicks: payload.max_picks,
    movies: payload.movies.map(mapMovie),
  }
}

/**
 * Ask which other films viewers liked alongside the given picks.
 *
 * @param movieIds Films the viewer already likes.
 * @param signal Cancels a stale request when the selection changes.
 */
export async function fetchRecommendations(
  movieIds: readonly number[],
  signal?: AbortSignal,
): Promise<Recommendation[]> {
  const response = await fetch('/api/recommendations', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ movie_ids: movieIds, limit: 3 }),
    signal,
  })

  if (!response.ok) {
    throw new Error('Could not load recommendations.')
  }

  const payload = (await response.json()) as RecommendationPayload

  return payload.recommendations.map((recommendation) => ({
    id: recommendation.id,
    title: recommendation.title,
    name: recommendation.name,
    year: recommendation.year,
    score: recommendation.score,
    match: recommendation.match,
    reasons: recommendation.reasons.map((reason) => ({
      movieId: reason.movie_id,
      name: reason.name,
      sharedViewers: reason.shared_viewers,
      alsoLikedPercent: reason.also_liked_percent,
      score: reason.score,
    })),
  }))
}

/**
 * @param movie Raw catalog row from the API.
 */
function mapMovie(movie: ApiMovie): Movie {
  return {
    id: movie.id,
    title: movie.title,
    name: movie.name,
    year: movie.year,
    fanCount: movie.fan_count,
  }
}
