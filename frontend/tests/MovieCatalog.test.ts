import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MovieCatalog from '../src/components/MovieCatalog.vue'
import { movie } from './fixtures'

const films = [
  movie({ id: 1, name: 'Beta', title: 'Beta (1959)', year: 1959, fanCount: 5 }),
  movie({ id: 2, name: 'Cameo', title: 'Cameo (1960)', year: 1960, fanCount: 4 }),
  movie({ id: 3, name: 'Delta', title: 'Delta (1969)', year: 1969, fanCount: 3 }),
  movie({ id: 4, name: 'Echo', title: 'Echo (1970)', year: 1970, fanCount: 5 }),
  movie({ id: 5, name: 'Foxtrot', title: 'Foxtrot (1979)', year: 1979, fanCount: 2 }),
  movie({ id: 6, name: 'Golf', title: 'Golf (1980)', year: 1980, fanCount: 9 }),
  movie({ id: 7, name: 'Hotel', title: 'Hotel (1989)', year: 1989, fanCount: 8 }),
  movie({ id: 8, name: 'India', title: 'India (1990)', year: 1990, fanCount: 1 }),
  movie({ id: 9, name: 'Juliet', title: 'Hidden original title', year: null, fanCount: 7 }),
  movie({
    id: 10,
    name: 'Alpha',
    title: 'Alpha',
    year: 1970,
    fanCount: undefined as unknown as number,
  }),
  movie({
    id: 11,
    name: 'Aaron',
    title: 'Aaron',
    year: null,
    fanCount: undefined as unknown as number,
  }),
]

/**
 * @param wrapper Catalog mounted with a fitted page size of one row.
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
 * @param wrapper Catalog whose pages each show one film.
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

describe('MovieCatalog', () => {
  it('filters by era and search, sorts, and toggles a film', async () => {
    const wrapper = mount(MovieCatalog, {
      props: { movies: films, selectedIds: [2] },
    })

    await wrapper.get('input').setValue('hidden')
    expect(wrapper.text()).toContain('Juliet')
    expect(wrapper.text()).toContain('—')

    await wrapper.get('input').setValue('Cameo')
    expect(wrapper.get('button[aria-pressed="true"]').attributes('aria-label')).toContain(
      'Remove Cameo',
    )

    await wrapper.get('input').setValue('   ')
    expect(await allNames(wrapper)).toEqual([
      'Aaron',
      'Alpha',
      'Beta',
      'Cameo',
      'Delta',
      'Echo',
      'Foxtrot',
      'Golf',
      'Hotel',
      'India',
      'Juliet',
    ])

    await button(wrapper, 'Popular').trigger('click')
    const byPopular = await allNames(wrapper)
    expect(byPopular[0]).toBe('Golf')
    expect(byPopular.indexOf('Beta')).toBeLessThan(byPopular.indexOf('Echo'))
    expect(byPopular.at(-1)).toBe('Alpha')
    expect(byPopular.indexOf('Aaron')).toBeLessThan(byPopular.indexOf('Alpha'))

    await button(wrapper, 'Year').trigger('click')
    const byYear = await allNames(wrapper)
    expect(byYear[0]).toBe('Aaron')
    expect(byYear[1]).toBe('Juliet')
    expect(byYear[2]).toBe('Beta')
    expect(byYear.indexOf('Alpha')).toBeLessThan(byYear.indexOf('Echo'))

    await button(wrapper, '1960s').trigger('click')
    expect(await allNames(wrapper)).toEqual(['Cameo', 'Delta'])

    await button(wrapper, '1970s').trigger('click')
    expect(new Set(await allNames(wrapper))).toEqual(new Set(['Alpha', 'Echo', 'Foxtrot']))

    await button(wrapper, '1980s').trigger('click')
    expect(await allNames(wrapper)).toEqual(['Golf', 'Hotel'])

    await button(wrapper, '1990s').trigger('click')
    expect(await allNames(wrapper)).toEqual(['India'])

    await wrapper.get('input').setValue('missing')
    expect(wrapper.text()).toContain('No films match that search.')

    await wrapper.get('input').setValue('Juliet')
    await button(wrapper, 'All').trigger('click')
    await wrapper.get('button[aria-label^="Add Juliet"]').trigger('click')
    expect(wrapper.emitted('toggle')?.[0]).toEqual([9])
  })
})
