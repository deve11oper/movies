<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Movie } from '../api'
import PaginationBar from './PaginationBar.vue'
import { useFittedPage } from '../useFittedPage'

const props = defineProps<{
  movies: Movie[]
  selectedIds: number[]
}>()

const emit = defineEmits<{
  toggle: [id: number]
}>()

const eras = [
  { id: 'all', label: 'All' },
  { id: '1960s', label: '1960s' },
  { id: '1970s', label: '1970s' },
  { id: '1980s', label: '1980s' },
  { id: '1990s', label: '1990s' },
] as const

const sorts = [
  { id: 'name', label: 'A–Z' },
  { id: 'popular', label: 'Popular' },
  { id: 'year', label: 'Year' },
] as const

type EraId = (typeof eras)[number]['id']
type SortId = (typeof sorts)[number]['id']

const query = ref('')
const era = ref<EraId>('all')
const sort = ref<SortId>('name')

const selected = computed(() => new Set(props.selectedIds))

const visibleMovies = computed(() => {
  const needle = query.value.trim().toLowerCase()

  const filtered = props.movies.filter((movie) => {
    if (!matchesEra(movie, era.value)) {
      return false
    }

    if (needle === '') {
      return true
    }

    return movie.name.toLowerCase().includes(needle) || movie.title.toLowerCase().includes(needle)
  })

  return filtered.sort((left, right) => compareMovies(left, right, sort.value))
})

const listBox = ref<HTMLElement | null>(null)

const {
  rowRef,
  pageCount,
  currentPage,
  pageItems: pagedMovies,
  pageStart,
  pageEnd,
  goToPage,
  resetPage,
} = useFittedPage(visibleMovies, listBox)

watch([query, era, sort], () => {
  resetPage()
})

/**
 * @param movie Film being tested against the era filter.
 * @param selectedEra Active era, or all decades.
 */
function matchesEra(movie: Movie, selectedEra: EraId): boolean {
  if (selectedEra === 'all') {
    return true
  }

  if (movie.year == null) {
    return false
  }

  if (selectedEra === '1960s') {
    return movie.year >= 1960 && movie.year < 1970
  }

  if (selectedEra === '1970s') {
    return movie.year >= 1970 && movie.year < 1980
  }

  if (selectedEra === '1980s') {
    return movie.year >= 1980 && movie.year < 1990
  }

  return movie.year >= 1990
}

/**
 * @param left First film in the comparison.
 * @param right Second film in the comparison.
 * @param sortKey Active sort.
 */
function compareMovies(left: Movie, right: Movie, sortKey: SortId): number {
  if (sortKey === 'popular') {
    return (right.fanCount ?? 0) - (left.fanCount ?? 0) || left.name.localeCompare(right.name)
  }

  if (sortKey === 'year') {
    return (left.year ?? 0) - (right.year ?? 0) || left.name.localeCompare(right.name)
  }

  return left.name.localeCompare(right.name)
}

/**
 * @param id Catalog film to add or remove.
 */
function onToggle(id: number): void {
  emit('toggle', id)
}
</script>

<template>
  <section
    class="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border border-line bg-card px-3 pt-3 pb-2 shadow-card sm:px-4"
    aria-labelledby="catalog-heading"
  >
    <div class="flex shrink-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 id="catalog-heading" class="m-0 text-2xl">The catalog</h2>
      <p class="m-0 text-sm text-muted tabular-nums">
        {{ pageStart }}–{{ pageEnd }} of {{ visibleMovies.length }}
      </p>
    </div>

    <label class="mt-2 mb-2 block shrink-0">
      <span class="sr-only">Search films</span>
      <input
        v-model="query"
        class="w-full rounded-lg border border-line bg-white px-3 py-2"
        type="search"
        placeholder="Search title"
      />
    </label>

    <div
      class="mb-1 flex shrink-0 flex-col items-center gap-1.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex flex-wrap justify-center gap-1" role="group" aria-label="Filter by era">
        <button
          v-for="option in eras"
          :key="option.id"
          type="button"
          class="rounded-full px-2 py-0.5 text-xs sm:px-2.5 sm:py-1 sm:text-sm"
          :class="era === option.id ? 'bg-ink text-paper' : 'text-muted hover:bg-hover'"
          @click="era = option.id"
        >
          {{ option.label }}
        </button>
      </div>
      <div
        class="flex w-fit gap-1 rounded-full bg-paper-deep p-0.5 sm:ml-auto sm:p-1"
        role="group"
        aria-label="Sort films"
      >
        <button
          v-for="option in sorts"
          :key="option.id"
          type="button"
          class="rounded-full px-2 py-0.5 text-xs sm:px-2.5 sm:py-1 sm:text-sm"
          :class="sort === option.id ? 'bg-ink text-paper' : 'text-muted'"
          @click="sort = option.id"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <div ref="listBox" class="film-scroll mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <p v-if="visibleMovies.length === 0" class="py-6 text-muted">No films match that search.</p>

      <ul v-else class="list-none p-0">
        <li v-for="(movie, index) in pagedMovies" :key="movie.id" :ref="rowRef(index)">
          <button
            type="button"
            class="grid w-full grid-cols-[2.6rem_minmax(0,1fr)_1.75rem] items-center gap-2 border-0 border-t border-line bg-transparent px-1 py-2 text-left hover:bg-hover sm:grid-cols-[3rem_minmax(0,1fr)_auto_1.75rem] sm:gap-3"
            :class="selected.has(movie.id) ? 'bg-blush' : ''"
            :aria-pressed="selected.has(movie.id)"
            :aria-label="`${selected.has(movie.id) ? 'Remove' : 'Add'} ${movie.name}, liked by ${(movie.fanCount ?? 0).toLocaleString()} viewers`"
            @click="onToggle(movie.id)"
          >
            <span class="text-sm text-gold tabular-nums">{{ movie.year ?? '—' }}</span>
            <span class="min-w-0">
              <span
                class="block truncate font-display text-base leading-tight font-[560] tracking-[-0.03em]"
              >
                {{ movie.name }}
              </span>
              <span class="text-xs text-muted tabular-nums sm:hidden">
                {{ (movie.fanCount ?? 0).toLocaleString() }} likes
              </span>
            </span>
            <span class="hidden text-sm whitespace-nowrap text-muted tabular-nums sm:inline">
              {{ (movie.fanCount ?? 0).toLocaleString() }} likes
            </span>
            <span
              class="grid size-7 place-items-center rounded-full text-sm"
              :class="
                selected.has(movie.id) ? 'bg-brand text-paper' : 'border border-line text-muted'
              "
              aria-hidden="true"
            >
              {{ selected.has(movie.id) ? '✓' : '+' }}
            </span>
          </button>
        </li>
      </ul>
    </div>

    <PaginationBar
      v-if="pageCount > 1"
      :current-page="currentPage"
      :page-count="pageCount"
      label="Catalog pages"
      @change="goToPage"
    />
  </section>
</template>
