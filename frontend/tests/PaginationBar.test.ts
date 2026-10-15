import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PaginationBar from '../src/components/PaginationBar.vue'

describe('PaginationBar', () => {
  it('moves between pages and stops at the ends', async () => {
    const wrapper = mount(PaginationBar, {
      props: { currentPage: 1, pageCount: 3, label: 'Catalog pages' },
    })

    expect(wrapper.get('nav').attributes('aria-label')).toBe('Catalog pages')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()

    await wrapper.findAll('button').at(-1)?.trigger('click')
    expect(wrapper.emitted('change')?.[0]).toEqual([2])

    await wrapper.get('button[aria-label="Page 2"]').trigger('click')
    expect(wrapper.emitted('change')?.[1]).toEqual([2])

    await wrapper.setProps({ currentPage: 3 })
    const buttons = wrapper.findAll('button')
    expect(buttons.at(-1)?.attributes('disabled')).toBeDefined()
    await buttons.at(-1)?.trigger('click')
    expect(wrapper.emitted('change')).toHaveLength(2)

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('change')?.[2]).toEqual([2])
  })
})
