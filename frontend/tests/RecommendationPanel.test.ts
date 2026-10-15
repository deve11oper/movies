import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RecommendationPanel from '../src/components/RecommendationPanel.vue'
import { movie, recommendation } from './fixtures'

const picks = [
  movie({ id: 1, name: 'Beta', title: 'Beta raw', year: 1990, fanCount: 5 }),
  movie({ id: 2, name: 'Alpha', title: 'Alpha raw', year: 1990, fanCount: 5 }),
  movie({
    id: 3,
    name: 'Zebra',
    title: 'Hidden zebra title',
    year: null,
    fanCount: undefined as unknown as number,
  }),
  movie({
    id: 4,
    name: 'Yarn',
    title: 'Yarn',
    year: null,
    fanCount: undefined as unknown as number,
  }),
]

const cards = [
  recommendation({
    id: 10,
    name: 'Leader',
    year: 1977,
    match: 85,
    reasons: [
      {
        movieId: 1,
        name: 'Beta',
        sharedViewers: 12,
        alsoLikedPercent: 40,
        score: 2,
      },
      {
        movieId: 2,
        name: 'Alpha',
        sharedViewers: 1,
        alsoLikedPercent: 10,
        score: 1,
      },
    ],
  }),
  recommendation({ id: 11, name: 'Middle', year: null, match: 60, reasons: [] }),
  recommendation({
    id: 12,
    name: 'Tail',
    match: 59,
    reasons: [
      {
        movieId: 3,
        name: 'Zebra',
        sharedViewers: 1,
        alsoLikedPercent: 5,
        score: 0.2,
      },
      {
        movieId: 4,
        name: 'Yarn',
        sharedViewers: 2,
        alsoLikedPercent: 8,
        score: 0.1,
      },
    ],
  }),
]

/**
 * @param wrapper Panel under test.
 * @param label Visible button label.
 */
function button(wrapper: VueWrapper, label: string) {
  const match = wrapper.findAll('button').find((node) => {
    const text = node.text().replace(/\s+/g, ' ').trim()

    return text === label || text.startsWith(`${label} `)
  })

  if (match == null) {
    throw new Error(`Missing button ${label}`)
  }

  return match
}

/**
 * @param wrapper Mine list, one film per page until the box is measured.
 */
async function allNames(wrapper: VueWrapper): Promise<string[]> {
  const names: string[] = []
  const pages = wrapper.findAll('button[aria-label^="Page"]')

  if (pages.length === 0) {
    return wrapper.findAll('.truncate').map((node) => node.text())
  }

  for (const page of pages) {
    await page.trigger('click')
    names.push(...wrapper.findAll('.truncate').map((node) => node.text()))
  }

  return names
}

describe('RecommendationPanel', () => {
  it('explains an empty selection and a failed request', () => {
    const empty = mount(RecommendationPanel, {
      props: { selectedMovies: [], recommendations: [], viewerCount: 806 },
    })

    expect(empty.text()).toContain('No picks yet')
    expect(empty.text()).toContain('806')

    const failed = mount(RecommendationPanel, {
      props: {
        selectedMovies: picks,
        recommendations: [],
        error: 'Could not load recommendations.',
      },
    })

    expect(failed.get('[role="alert"]').text()).toContain('Could not load recommendations.')
  })

  it('labels matches and lets a viewer keep a suggestion', async () => {
    const wrapper = mount(RecommendationPanel, {
      props: { selectedMovies: picks, recommendations: cards, loading: true, viewerCount: 806 },
    })

    expect(wrapper.text()).toContain('Updating…')
    expect(wrapper.text()).toContain('Strong match')
    expect(wrapper.text()).toContain('Good match')
    expect(wrapper.text()).toContain('Nearby taste')
    expect(wrapper.text()).toContain('12 viewers in common')
    expect(wrapper.text()).toContain('1 viewer in common')
    expect(wrapper.get('ol').classes()).toContain('opacity-60')
    expect(wrapper.findAll('li')[0]?.classes()).toContain('bg-ink')
    expect(wrapper.findAll('ol > li')[1]?.classes()).toContain('bg-card')

    await button(wrapper, 'I like this too').trigger('click')
    expect(wrapper.emitted('like')?.[0]).toEqual([10])
  })

  it('shows a quiet empty result once loading finishes', () => {
    const wrapper = mount(RecommendationPanel, {
      props: { selectedMovies: picks, recommendations: [], loading: false },
    })

    expect(wrapper.text()).toContain('Nothing else in the catalog')
  })

  it('searches, sorts, and removes picked films', async () => {
    const wrapper = mount(RecommendationPanel, {
      props: { selectedMovies: picks, recommendations: [] },
    })

    await button(wrapper, 'Mine').trigger('click')
    expect(await allNames(wrapper)).toEqual(['Beta', 'Alpha', 'Zebra', 'Yarn'])

    await button(wrapper, 'A–Z').trigger('click')
    expect(await allNames(wrapper)).toEqual(['Alpha', 'Beta', 'Yarn', 'Zebra'])

    await button(wrapper, 'Popular').trigger('click')
    const byPopular = await allNames(wrapper)
    expect(byPopular.indexOf('Alpha')).toBeLessThan(byPopular.indexOf('Beta'))
    expect(byPopular.indexOf('Yarn')).toBeLessThan(byPopular.indexOf('Zebra'))

    await button(wrapper, 'Year').trigger('click')
    const byYear = await allNames(wrapper)
    expect(byYear[0]).toBe('Yarn')
    expect(byYear[1]).toBe('Zebra')
    expect(byYear.indexOf('Alpha')).toBeLessThan(byYear.indexOf('Beta'))

    await button(wrapper, 'Picked').trigger('click')
    await wrapper.get('input').setValue('hidden')
    expect(wrapper.text()).toContain('Zebra')
    expect(wrapper.text()).toContain('—')

    await wrapper.get('input').setValue('nope')
    expect(wrapper.text()).toContain('No films match that search.')

    await wrapper.get('input').setValue('')
    await wrapper.get('button[aria-label="Remove Beta"]').trigger('click')
    expect(wrapper.emitted('like')?.[0]).toEqual([1])

    await button(wrapper, 'Clear').trigger('click')
    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('follows the section chosen by a narrow screen', async () => {
    const wrapper = mount(RecommendationPanel, {
      props: {
        selectedMovies: [],
        recommendations: [],
        showTabs: false,
        tab: 'mine',
      },
    })

    expect(wrapper.text()).toContain('Choose a film in the catalog')
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)

    await wrapper.setProps({ tab: 'recommendations', viewerCount: 0 })
    expect(wrapper.text()).toContain('0 other viewers')

    await wrapper.setProps({ tab: null, showTabs: true, selectedMovies: picks })
    await button(wrapper, 'Recommendations').trigger('click')
    expect(wrapper.text()).toContain('Nothing else in the catalog')
  })
})
