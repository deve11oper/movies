import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { fittedRowCount, useFittedPage } from '../src/useFittedPage'
import { FakeResizeObserver } from './setup'

/**
 * Mount the composable so its resize watcher and unmount hook both run.
 */
function mountPage(sourceItems: number[]) {
  const source = ref(sourceItems)
  const box = ref<HTMLElement | null>(null)

  let page!: ReturnType<typeof useFittedPage<number>>
  const Host = defineComponent({
    setup() {
      page = useFittedPage(source, box)
      return () => null
    },
  })
  const wrapper = mount(Host)

  return { source, box, wrapper, page }
}

/**
 * @param element Element whose layout the fitted page will read.
 * @param clientHeight Visible height.
 * @param scrollHeight Content height, including overflow.
 */
function setBox(element: HTMLElement, clientHeight: number, scrollHeight: number): void {
  Object.defineProperty(element, 'clientHeight', { configurable: true, get: () => clientHeight })
  Object.defineProperty(element, 'scrollHeight', { configurable: true, get: () => scrollHeight })
}

beforeEach(() => {
  FakeResizeObserver.instances = []
})

describe('fittedRowCount', () => {
  it('keeps the previous size when the box or the row cannot be measured', () => {
    expect(
      fittedRowCount({
        available: 0,
        rowHeight: 10,
        paintedRows: 4,
        contentHeight: 0,
        boxChanged: true,
      }),
    ).toBe(4)
    expect(
      fittedRowCount({
        available: 20,
        rowHeight: 0,
        paintedRows: 4,
        contentHeight: 0,
        boxChanged: true,
      }),
    ).toBe(4)
  })

  it('uses the box height, then gives one row back when that page overflows', () => {
    expect(
      fittedRowCount({
        available: 100,
        rowHeight: 40,
        paintedRows: 1,
        contentHeight: 40,
        boxChanged: true,
      }),
    ).toBe(2)

    expect(
      fittedRowCount({
        available: 100,
        rowHeight: 40,
        paintedRows: 2,
        contentHeight: 180,
        boxChanged: false,
      }),
    ).toBe(1)

    expect(
      fittedRowCount({
        available: 100,
        rowHeight: 40,
        paintedRows: 1,
        contentHeight: 200,
        boxChanged: false,
      }),
    ).toBe(1)

    expect(
      fittedRowCount({
        available: 100,
        rowHeight: 40,
        paintedRows: 1,
        contentHeight: 40,
        boxChanged: false,
      }),
    ).toBe(1)

    expect(
      fittedRowCount({
        available: 50,
        rowHeight: 40,
        paintedRows: 4,
        contentHeight: 40,
        boxChanged: false,
      }),
    ).toBe(1)
  })
})

describe('useFittedPage', () => {
  it('starts empty and clamps the requested page', async () => {
    const { page, source } = mountPage([])

    expect(page.pageStart.value).toBe(0)
    expect(page.pageEnd.value).toBe(0)
    expect(page.pageCount.value).toBe(1)
    expect(page.pageItems.value).toEqual([])

    source.value = [1, 2, 3]
    await nextTick()
    page.goToPage(0)
    expect(page.currentPage.value).toBe(1)
    page.goToPage(9)
    expect(page.currentPage.value).toBe(3)
    expect(page.pageItems.value).toEqual([3])
    expect(page.pageStart.value).toBe(3)
    expect(page.pageEnd.value).toBe(3)

    source.value = [1]
    await nextTick()
    expect(page.currentPage.value).toBe(1)

    page.goToPage(2)
    page.resetPage()
    expect(page.currentPage.value).toBe(1)
  })

  it('samples only the first element row', async () => {
    const { page } = mountPage([1, 2])
    const row = document.createElement('div')

    page.rowRef(1)(row)
    await nextTick()
    expect(FakeResizeObserver.instances.at(-1)?.observed).not.toContain(row)

    page.rowRef(0)({} as never)
    page.rowRef(0)(null)
    page.rowRef(0)(row)
    await nextTick()
    expect(FakeResizeObserver.instances.at(-1)?.observed).toContain(row)
  })

  it('keeps the previous size when the box or the row cannot be measured', async () => {
    const { page, box } = mountPage([1, 2, 3, 4])
    const hidden = document.createElement('div')
    const row = document.createElement('div')
    setBox(hidden, 0, 0)
    row.getBoundingClientRect = () => ({ height: 10 }) as DOMRect

    box.value = hidden
    page.rowRef(0)(row)
    await nextTick()
    expect(page.pageSize.value).toBe(1)

    setBox(hidden, 20, 0)
    row.getBoundingClientRect = () => ({ height: 0 }) as DOMRect
    box.value = document.createElement('div')
    box.value = hidden
    await nextTick()
    expect(page.pageSize.value).toBe(1)

    box.value = null
    await nextTick()
    expect(page.pageSize.value).toBe(1)
  })

  it('fits rows to the box and drops one when the rows still overflow', async () => {
    const { page, box, wrapper } = mountPage([1, 2, 3, 4, 5, 6])
    const container = document.createElement('div')
    const row = document.createElement('div')

    Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => 100 })
    Object.defineProperty(container, 'scrollHeight', {
      configurable: true,
      get: () => (page.pageSize.value > 1 ? 180 : 40),
    })
    row.getBoundingClientRect = () => ({ height: 40 }) as DOMRect

    box.value = container
    page.rowRef(0)(row)
    await nextTick()
    await nextTick()
    expect(page.pageSize.value).toBe(1)
    expect(page.pageItems.value).toHaveLength(1)

    FakeResizeObserver.instances.at(-1)?.emit()
    wrapper.unmount()
    expect(FakeResizeObserver.instances.at(-1)?.disconnected).toBe(true)
  })

  it('leaves the size alone when the measured page already fits', async () => {
    const { page, box } = mountPage([1, 2, 3, 4])
    const container = document.createElement('div')
    const row = document.createElement('div')
    setBox(container, 100, 40)
    row.getBoundingClientRect = () => ({ height: 40 }) as DOMRect

    box.value = container
    page.rowRef(0)(row)
    await nextTick()
    await nextTick()

    expect(page.pageSize.value).toBe(2)
    expect(page.pageItems.value).toEqual([1, 2])
  })
})
