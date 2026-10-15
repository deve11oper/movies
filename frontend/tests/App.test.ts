import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App.vue'
import { fetchCatalog, fetchRecommendations } from '../src/api'
import { movie } from './fixtures'

vi.mock('../src/api', () => ({
  fetchCatalog: vi.fn(),
  fetchRecommendations: vi.fn(),
}))

const catalog = [movie({ id: 1, name: 'Alpha' }), movie({ id: 2, name: 'Bravo' })]

interface MediaQuery {
  matches: boolean
  addEventListener: (type: string, listener: () => void) => void
  removeEventListener: (type: string, listener: () => void) => void
  listener: (() => void) | null
}

let media: MediaQuery

beforeEach(() => {
  localStorage.clear()
  vi.mocked(fetchCatalog).mockReset()
  vi.mocked(fetchRecommendations).mockReset()
  vi.mocked(fetchRecommendations).mockResolvedValue([])
  media = {
    matches: false,
    listener: null,
    addEventListener(_type, listener) {
      this.listener = listener
    },
    removeEventListener() {
      this.listener = null
    },
  }
  vi.stubGlobal('matchMedia', () => media)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('App', () => {
  it('shows a catalog error from a thrown value', async () => {
    vi.mocked(fetchCatalog).mockRejectedValue('offline')

    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.text()).toContain('Could not load the movie catalog.')
  })

  it('shows the message from an Error and ignores broken storage', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.mocked(fetchCatalog).mockRejectedValue(new Error('Catalog down'))

    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.text()).toContain('Catalog down')
  })

  it('keeps a saved selection, drops unknown ids, and loads suggestions', async () => {
    localStorage.setItem('also-liked-selection', JSON.stringify([1, 1.5, 'nope', 99]))
    vi.useFakeTimers()
    vi.mocked(fetchCatalog).mockResolvedValue({ viewerCount: 12, maxPicks: 69, movies: catalog })
    vi.mocked(fetchRecommendations).mockResolvedValue([
      {
        id: 8,
        title: 'Other',
        name: 'Other',
        year: 1991,
        score: 1,
        match: 100,
        reasons: [],
      },
    ])

    const wrapper = mount(App)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(160)

    expect(wrapper.text()).toContain('2 films')
    expect(wrapper.text()).toContain('12 viewers')
    expect(fetchRecommendations).toHaveBeenCalledWith([1], expect.any(AbortSignal))
    expect(wrapper.text()).toContain('Other')

    await wrapper.get('button[aria-label^="Remove Alpha"]').trigger('click')
    await vi.advanceTimersByTimeAsync(160)
    expect(fetchRecommendations).toHaveBeenCalledTimes(1)

    await wrapper.get('input').setValue('Bravo')
    await wrapper.get('button[aria-label^="Add Bravo"]').trigger('click')
    await vi.advanceTimersByTimeAsync(160)
    expect(fetchRecommendations).toHaveBeenLastCalledWith([2], expect.any(AbortSignal))
  })

  it('ignores storage that is not a list and a full selection', async () => {
    localStorage.setItem('also-liked-selection', '{"a":1}')
    vi.mocked(fetchCatalog).mockResolvedValue({ viewerCount: 0, maxPicks: 69, movies: catalog })

    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.text()).not.toContain('films ·')

    localStorage.setItem(
      'also-liked-selection',
      JSON.stringify(Array.from({ length: 70 }, (_item, index) => index + 1)),
    )
    const many = Array.from({ length: 70 }, (_item, index) =>
      movie({ id: index + 1, name: index === 69 ? 'ZZZ' : `Film ${index + 1}` }),
    )
    vi.mocked(fetchCatalog).mockResolvedValue({ viewerCount: 3, maxPicks: 69, movies: many })
    const full = mount(App)
    await flushPromises()

    await full.get('input').setValue('ZZZ')
    await full.get('button[aria-label^="Add ZZZ"]').trigger('click')
    expect(full.get('#tab-mine').text()).toContain('69')
  })

  it('rejects invalid json and a blocked write', async () => {
    localStorage.setItem('also-liked-selection', '{')
    vi.mocked(fetchCatalog).mockResolvedValue({ viewerCount: 4, maxPicks: 69, movies: catalog })
    const wrapper = mount(App)
    await flushPromises()

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    await wrapper.get('button[aria-label^="Add Alpha"]').trigger('click')
    expect(wrapper.text()).toContain('Alpha')
  })

  it('clears a selection and ignores an aborted suggestion request', async () => {
    vi.useFakeTimers()
    vi.mocked(fetchCatalog).mockResolvedValue({ viewerCount: 4, maxPicks: 69, movies: catalog })
    vi.mocked(fetchRecommendations).mockImplementation((_ids, signal) => {
      return new Promise((resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
        if (_ids.length > 1) {
          resolve([])
        }
      })
    })

    const wrapper = mount(App)
    await flushPromises()
    await wrapper.get('button[aria-label^="Add Alpha"]').trigger('click')
    await vi.advanceTimersByTimeAsync(160)
    await wrapper.get('input').setValue('Bravo')
    await wrapper.get('button[aria-label^="Add Bravo"]').trigger('click')
    await vi.advanceTimersByTimeAsync(160)
    await flushPromises()

    expect(wrapper.text()).toContain('Nothing else in the catalog')

    media.matches = true
    media.listener?.()
    await flushPromises()
    await wrapper.get('#tab-mine').trigger('click')
    const clear = wrapper.findAll('button').find((node) => node.text() === 'Clear')
    await clear?.trigger('click')
    expect(wrapper.text()).toContain('No picks yet')
  })

  it('reports a suggestion failure that is not an Error', async () => {
    vi.useFakeTimers()
    vi.mocked(fetchCatalog).mockResolvedValue({ viewerCount: 4, maxPicks: 69, movies: catalog })
    vi.mocked(fetchRecommendations).mockRejectedValue('nope')

    const wrapper = mount(App)
    await flushPromises()
    await wrapper.get('button[aria-label^="Add Alpha"]').trigger('click')
    await vi.advanceTimersByTimeAsync(160)
    await flushPromises()

    expect(wrapper.text()).toContain('Could not load recommendations.')

    vi.mocked(fetchRecommendations).mockRejectedValue(new Error('Suggestions down'))
    await wrapper.get('button[aria-label^="Remove Alpha"]').trigger('click')
    await wrapper.get('button[aria-label^="Add Alpha"]').trigger('click')
    await vi.advanceTimersByTimeAsync(160)
    await flushPromises()
    expect(wrapper.text()).toContain('Suggestions down')
  })

  it('shows the narrow updating state, then clears the saved films', async () => {
    media.matches = true
    vi.useFakeTimers()
    let resolveSuggestions: (
      films: Awaited<ReturnType<typeof fetchRecommendations>>,
    ) => void = () => {}
    vi.mocked(fetchCatalog).mockResolvedValue({ viewerCount: 4, maxPicks: 69, movies: catalog })
    vi.mocked(fetchRecommendations).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSuggestions = resolve
        }),
    )

    const wrapper = mount(App)
    await flushPromises()
    await wrapper.get('button[aria-label^="Add Alpha"]').trigger('click')
    await vi.advanceTimersByTimeAsync(160)
    await wrapper.get('#tab-recommendations').trigger('click')
    expect(wrapper.text()).toContain('Updating…')

    resolveSuggestions([])
    await flushPromises()
    await wrapper.get('#tab-mine').trigger('click')
    await wrapper
      .findAll('button')
      .find((node) => node.text() === 'Clear')
      ?.trigger('click')
    expect(wrapper.text()).toContain('No picks yet')
  })

  it('switches sections on a narrow screen and stops listening after unmount', async () => {
    media.matches = true
    vi.mocked(fetchCatalog).mockResolvedValue({ viewerCount: 4, maxPicks: 69, movies: catalog })
    const wrapper = mount(App)
    await flushPromises()

    expect(wrapper.text()).toContain('Catalog')
    await wrapper.get('#tab-recommendations').trigger('click')
    expect(wrapper.text()).toContain('No picks yet')
    await wrapper.get('#tab-catalog').trigger('click')
    expect(wrapper.get('#tab-catalog').attributes('aria-selected')).toBe('true')

    wrapper.unmount()
    expect(media.listener).toBeNull()
  })
})
