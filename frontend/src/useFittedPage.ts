import {
  computed,
  nextTick,
  onUnmounted,
  ref,
  watch,
  type ComponentPublicInstance,
  type Ref,
} from 'vue'

/**
 * How many rows fit in the box.
 *
 * A new box height uses as many whole rows as the height allows.
 * If that page still overflows after it paints, one row is given back and kept
 * until the box height changes. A hidden box (another tab) keeps the previous size.
 */
export function fittedRowCount(input: {
  available: number
  rowHeight: number
  paintedRows: number
  contentHeight: number
  boxChanged: boolean
}): number {
  const { available, rowHeight, paintedRows, contentHeight, boxChanged } = input

  if (available <= 0 || rowHeight <= 0) {
    return paintedRows
  }

  const fitted = Math.max(1, Math.floor(available / rowHeight))

  if (boxChanged) {
    return fitted
  }

  if (contentHeight > available + 1) {
    return Math.max(1, paintedRows - 1)
  }

  return Math.min(paintedRows, fitted)
}

/**
 * Split a list into pages that fill the visible box, so the list itself does not scroll.
 *
 * @param source Full list, already filtered and sorted.
 * @param box Element whose height is the space available for rows.
 */
export function useFittedPage<T>(source: Ref<readonly T[]>, box: Ref<HTMLElement | null>) {
  const page = ref(1)
  const pageSize = ref(1)
  const row = ref<HTMLElement | null>(null)
  let measuredHeight = -1

  const pageCount = computed(() => Math.max(1, Math.ceil(source.value.length / pageSize.value)))

  const currentPage = computed(() => Math.min(page.value, pageCount.value))

  const pageItems = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value

    return source.value.slice(start, start + pageSize.value)
  })

  const pageStart = computed(() =>
    source.value.length === 0 ? 0 : (currentPage.value - 1) * pageSize.value + 1,
  )

  const pageEnd = computed(() => Math.min(currentPage.value * pageSize.value, source.value.length))

  /**
   * @param nextPage Page the pager asked for, before clamping.
   */
  function goToPage(nextPage: number): void {
    page.value = Math.min(Math.max(nextPage, 1), pageCount.value)
  }

  function resetPage(): void {
    page.value = 1
  }

  /**
   * Attach the height sample to the first row. Other rows ignore the callback.
   *
   * @param index Position of the row on the current page.
   */
  function rowRef(index: number) {
    return (element: Element | ComponentPublicInstance | null) => {
      if (index !== 0) {
        return
      }

      row.value = element instanceof HTMLElement ? element : null
    }
  }

  /**
   * Read the box once, then once more after the rows paint.
   * fittedRowCount holds a corrected size, so the follow-up does not chase itself.
   */
  function measure(): void {
    const container = box.value
    const sample = row.value

    if (!container || !sample) {
      return
    }

    const available = container.clientHeight
    const rowHeight = sample.getBoundingClientRect().height
    const next = fittedRowCount({
      available,
      rowHeight,
      paintedRows: pageSize.value,
      contentHeight: container.scrollHeight,
      boxChanged: available !== measuredHeight,
    })

    if (available > 0 && rowHeight > 0) {
      measuredHeight = available
    }

    if (next !== pageSize.value) {
      pageSize.value = next
    }
  }

  const observer = new ResizeObserver(() => {
    measure()
  })

  watch([box, row], ([container, sample]) => {
    observer.disconnect()

    if (container) {
      observer.observe(container)
    }

    if (sample) {
      observer.observe(sample)
    }

    measure()
  })

  watch(pageSize, () => {
    void nextTick().then(measure)
  })

  onUnmounted(() => {
    observer.disconnect()
  })

  return {
    rowRef,
    pageSize,
    pageCount,
    currentPage,
    pageItems,
    pageStart,
    pageEnd,
    goToPage,
    resetPage,
  }
}
