<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Movie, Recommendation } from '../api'
import PaginationBar from './PaginationBar.vue'
import { useFittedPage } from '../useFittedPage'

type PanelTab = 'mine' | 'recommendations'

const props = withDefaults(
  defineProps<{
    selectedMovies: Movie[]
    recommendations: Recommendation[]
    loading?: boolean
    error?: string
    viewerCount?: number
    /** Parent-selected section. When set, this panel hides its own tab bar. */
    tab?: PanelTab | null
    showTabs?: boolean
  }>(),
  {
    loading: false,
    error: '',
    viewerCount: 0,
    tab: null,
    showTabs: true,
  },
)

const emit = defineEmits<{
  like: [id: number]
  clear: []
}>()

const localTab = ref<PanelTab>('recommendations')

const activeTab = computed(() => props.tab ?? localTab.value)

const mineSorts = [
  { id: 'picked', label: 'Picked' },
  { id: 'name', label: 'A–Z' },
  { id: 'popular', label: 'Popular' },
  { id: 'year', label: 'Year' },
] as const

type MineSort = (typeof mineSorts)[number]['id']

const mineQuery = ref('')
const mineSort = ref<MineSort>('picked')
const mineBox = ref<HTMLElement | null>(null)

const visiblePicks = computed(() => {
  const needle = mineQuery.value.trim().toLowerCase()
  const filtered = props.selectedMovies.filter((movie) => {
    if (needle === '') {
      return true
    }

    return movie.name.toLowerCase().includes(needle) || movie.title.toLowerCase().includes(needle)
  })

  if (mineSort.value === 'picked') {
    return filtered
  }

  return [...filtered].sort((left, right) => comparePicks(left, right, mineSort.value))
})

const {
  rowRef: mineRowRef,
  pageCount: minePageCount,
  currentPage: minePage,
  pageItems: mineMovies,
  pageStart: mineStart,
  pageEnd: mineEnd,
  goToPage: goToMinePage,
  resetPage: resetMinePage,
} = useFittedPage(visiblePicks, mineBox)

watch([mineQuery, mineSort], () => {
  resetMinePage()
})

/**
 * @param left First picked film.
 * @param right Second picked film.
 * @param sortKey Active sort, other than the original pick order.
 */
function comparePicks(left: Movie, right: Movie, sortKey: MineSort): number {
  if (sortKey === 'popular') {
    return (right.fanCount ?? 0) - (left.fanCount ?? 0) || left.name.localeCompare(right.name)
  }

  if (sortKey === 'year') {
    return (left.year ?? 0) - (right.year ?? 0) || left.name.localeCompare(right.name)
  }

  return left.name.localeCompare(right.name)
}

/**
 * @param count Viewers who liked both the pick and this suggestion.
 */
function viewerPhrase(count: number): string {
  if (count === 1) {
    return '1 viewer in common'
  }

  return `${count.toLocaleString()} viewers in common`
}

/**
 * @param match Score relative to the top suggestion, from 0 to 100.
 */
function matchLabel(match: number): string {
  if (match >= 85) {
    return 'Strong match'
  }

  if (match >= 60) {
    return 'Good match'
  }

  return 'Nearby taste'
}
</script>

<template>
  <aside id="results" class="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
    <div v-if="showTabs" class="mb-2 flex shrink-0 items-center justify-between gap-2">
      <div
        class="flex min-w-0 gap-1 rounded-full bg-paper-deep p-1"
        role="tablist"
        aria-label="Your films and suggestions"
      >
        <button
          id="tab-mine"
          type="button"
          role="tab"
          class="rounded-full px-2.5 py-1 text-sm"
          :class="activeTab === 'mine' ? 'bg-ink text-paper' : 'text-muted'"
          :aria-selected="activeTab === 'mine'"
          aria-controls="panel-mine"
          @click="localTab = 'mine'"
        >
          Mine
          <span class="tabular-nums" :class="activeTab === 'mine' ? 'text-paper/70' : ''">
            {{ selectedMovies.length }}
          </span>
        </button>
        <button
          id="tab-recommendations"
          type="button"
          role="tab"
          class="rounded-full px-2.5 py-1 text-sm"
          :class="activeTab === 'recommendations' ? 'bg-ink text-paper' : 'text-muted'"
          :aria-selected="activeTab === 'recommendations'"
          aria-controls="panel-recommendations"
          @click="localTab = 'recommendations'"
        >
          Recommendations
        </button>
      </div>
      <button
        v-if="activeTab === 'mine' && selectedMovies.length"
        type="button"
        class="shrink-0 text-sm text-brand hover:underline"
        @click="emit('clear')"
      >
        Clear
      </button>
      <p
        v-else-if="activeTab === 'recommendations' && loading"
        class="m-0 shrink-0 text-sm text-muted"
      >
        Updating…
      </p>
    </div>

    <div
      v-if="activeTab === 'mine'"
      id="panel-mine"
      role="tabpanel"
      aria-labelledby="tab-mine"
      class="flex min-h-0 flex-1 flex-col overflow-hidden border border-line bg-card px-3 pt-3 pb-2 shadow-card sm:px-4"
    >
      <div v-if="selectedMovies.length === 0" class="px-1 py-6">
        <p class="m-0 font-display text-2xl font-[560] tracking-[-0.03em]">No picks yet</p>
        <p class="mt-2 mb-0 text-muted">Choose a film in the catalog. It will stay in this list.</p>
      </div>

      <template v-else>
        <div class="flex shrink-0 items-baseline justify-between gap-3">
          <h3 class="m-0 text-2xl">Your films</h3>
          <p v-if="visiblePicks.length" class="m-0 text-sm text-muted tabular-nums">
            {{ mineStart }}–{{ mineEnd }} of {{ visiblePicks.length }}
          </p>
        </div>

        <label class="mt-2 mb-2 block shrink-0">
          <span class="sr-only">Search your films</span>
          <input
            v-model="mineQuery"
            class="w-full rounded-lg border border-line bg-white px-3 py-2"
            type="search"
            placeholder="Search your films"
          />
        </label>

        <div
          class="mb-1 flex shrink-0 flex-wrap gap-1 rounded-full bg-paper-deep p-1"
          role="group"
          aria-label="Sort your films"
        >
          <button
            v-for="option in mineSorts"
            :key="option.id"
            type="button"
            class="rounded-full px-2.5 py-1 text-sm"
            :class="mineSort === option.id ? 'bg-ink text-paper' : 'text-muted'"
            @click="mineSort = option.id"
          >
            {{ option.label }}
          </button>
        </div>

        <div
          ref="mineBox"
          class="film-scroll mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          <p v-if="visiblePicks.length === 0" class="py-6 text-muted">
            No films match that search.
          </p>
          <ul v-else class="m-0 list-none p-0">
            <li v-for="(movie, index) in mineMovies" :key="movie.id" :ref="mineRowRef(index)">
              <div
                class="grid w-full grid-cols-[2.6rem_minmax(0,1fr)_1.75rem] items-center gap-2 border-t border-line px-1 py-2 sm:grid-cols-[3rem_minmax(0,1fr)_auto_1.75rem] sm:gap-3"
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
                <button
                  type="button"
                  class="grid size-7 shrink-0 place-items-center rounded-full border border-line text-sm text-muted hover:border-ink hover:text-ink"
                  :aria-label="`Remove ${movie.name}`"
                  @click="emit('like', movie.id)"
                >
                  ×
                </button>
              </div>
            </li>
          </ul>
        </div>

        <PaginationBar
          v-if="minePageCount > 1"
          :current-page="minePage"
          :page-count="minePageCount"
          label="Your films pages"
          @change="goToMinePage"
        />
      </template>
    </div>

    <div
      v-else
      id="panel-recommendations"
      role="tabpanel"
      aria-labelledby="tab-recommendations"
      class="film-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain"
      aria-live="polite"
    >
      <p v-if="error" class="rounded-lg bg-[#fde8e4] px-3 py-2.5 text-brand-deep" role="alert">
        {{ error }}
      </p>

      <div
        v-else-if="selectedMovies.length === 0"
        class="border border-line bg-card px-4 py-6 shadow-card"
      >
        <p class="m-0 font-display text-2xl font-[560] tracking-[-0.03em]">No picks yet</p>
        <p class="mt-2 mb-0 text-muted">
          Select a film in the catalog. Suggestions use
          {{ viewerCount.toLocaleString() }} other viewers who liked the same titles.
        </p>
      </div>

      <p
        v-else-if="!loading && recommendations.length === 0"
        class="border border-line bg-card px-4 py-5 text-muted shadow-card"
      >
        Nothing else in the catalog stands out for this combination. Try removing a pick.
      </p>

      <ol v-else class="m-0 grid list-none gap-2 p-0" :class="loading ? 'opacity-60' : ''">
        <li
          v-for="(recommendation, index) in recommendations"
          :key="recommendation.id"
          class="min-w-0 px-3 py-2.5 shadow-card"
          :class="index === 0 ? 'bg-ink text-paper' : 'border border-line bg-card'"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p
                class="m-0 text-[0.65rem] tracking-[0.14em] uppercase"
                :class="index === 0 ? 'text-paper/70' : 'text-brand'"
              >
                {{ index + 1 }} · {{ matchLabel(recommendation.match) }}
              </p>
              <h3 class="m-0 mt-0.5 text-lg leading-tight wrap-break-word">
                {{ recommendation.name }}
                <span
                  class="font-sans text-xs font-normal tracking-normal"
                  :class="index === 0 ? 'text-paper/70' : 'text-muted'"
                >
                  {{ recommendation.year }}
                </span>
              </h3>
            </div>
            <p class="m-0 shrink-0 font-display text-2xl leading-none tabular-nums">
              {{ recommendation.match }}
            </p>
          </div>

          <div
            class="mt-2 h-0.5 overflow-hidden rounded-full"
            :class="index === 0 ? 'bg-paper/20' : 'bg-paper-deep'"
            aria-hidden="true"
          >
            <span class="block h-full bg-brand" :style="{ width: `${recommendation.match}%` }" />
          </div>

          <p
            v-for="reason in recommendation.reasons.slice(0, 1)"
            :key="reason.movieId"
            class="mt-2 mb-0 text-xs"
          >
            {{ reason.alsoLikedPercent }}% of people who liked {{ reason.name }} also liked this.
            <span :class="index === 0 ? 'text-paper/70' : 'text-muted'">
              {{ viewerPhrase(reason.sharedViewers) }}.
            </span>
          </p>

          <ul
            v-if="recommendation.reasons.length > 1"
            class="mt-1.5 mb-0 grid list-none gap-0.5 p-0 text-xs"
          >
            <li
              v-for="reason in recommendation.reasons.slice(1)"
              :key="reason.movieId"
              class="flex min-w-0 items-baseline justify-between gap-3"
              :class="index === 0 ? 'text-paper/80' : 'text-muted'"
            >
              <span class="min-w-0 truncate">{{ reason.name }}</span>
              <span class="shrink-0 tabular-nums">{{ reason.alsoLikedPercent }}%</span>
            </li>
          </ul>

          <button
            type="button"
            class="mt-2 rounded-full px-2.5 py-1 text-xs"
            :class="
              index === 0
                ? 'bg-paper text-ink'
                : 'border border-line bg-white text-ink hover:border-ink'
            "
            @click="emit('like', recommendation.id)"
          >
            I like this too
          </button>
        </li>
      </ol>
    </div>
  </aside>
</template>
