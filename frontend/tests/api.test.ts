import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchCatalog, fetchRecommendations } from '../src/api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchCatalog', () => {
  it('maps the catalog into camel case', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          viewer_count: 806,
          max_picks: 69,
          movies: [
            {
              id: 6,
              title: 'Usual Suspects, The (1995)',
              name: 'The Usual Suspects',
              year: 1995,
              fan_count: 201,
            },
          ],
        }),
      }),
    )

    await expect(fetchCatalog()).resolves.toEqual({
      viewerCount: 806,
      maxPicks: 69,
      movies: [
        {
          id: 6,
          title: 'Usual Suspects, The (1995)',
          name: 'The Usual Suspects',
          year: 1995,
          fanCount: 201,
        },
      ],
    })
  })

  it('rejects when the catalog request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    await expect(fetchCatalog()).rejects.toThrow('Could not load the movie catalog.')
  })
})

describe('fetchRecommendations', () => {
  it('maps reasons and forwards the abort signal', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        recommendations: [
          {
            id: 60,
            title: 'Raiders',
            name: 'Raiders',
            year: null,
            score: 1.2,
            match: 100,
            reasons: [
              {
                movie_id: 20,
                name: 'Star Wars',
                shared_viewers: 1,
                also_liked_percent: 10,
                score: 0.4,
              },
            ],
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await expect(fetchRecommendations([20], controller.signal)).resolves.toEqual([
      {
        id: 60,
        title: 'Raiders',
        name: 'Raiders',
        year: null,
        score: 1.2,
        match: 100,
        reasons: [
          {
            movieId: 20,
            name: 'Star Wars',
            sharedViewers: 1,
            alsoLikedPercent: 10,
            score: 0.4,
          },
        ],
      },
    ])

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/recommendations',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ movie_ids: [20], limit: 3 }),
        signal: controller.signal,
      }),
    )
  })

  it('rejects when the suggestion request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    await expect(fetchRecommendations([1])).rejects.toThrow('Could not load recommendations.')
  })
})
