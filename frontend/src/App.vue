<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { fetchCatalog, fetchRecommendations, type Movie, type Recommendation } from './api'
import MovieCatalog from './components/MovieCatalog.vue'
import RecommendationPanel from './components/RecommendationPanel.vue'
import { picksInCatalog, readSavedSelection, togglePick, writeSavedSelection } from './selection'

const NARROW_SCREEN = '(max-width: 1023px)'
const RECOMMENDATION_DELAY_MS = 160

type MobileScreen = 'catalog' | 'mine' | 'recommendations'

const narrow = ref(window.matchMedia(NARROW_SCREEN).matches)
const screen = ref<MobileScreen>('catalog')

const movies = ref<Movie[]>([])
const maxPicks = ref(0)
const selectedIds = ref<number[]>(readSavedSelection())
const recommendations = ref<Recommendation[]>([])
const viewerCount = ref(0)
const catalogError = ref('')
const recommendationError = ref('')
const loadingCatalog = ref(true)
const loadingRecommendations = ref(false)

let requestController: AbortController | null = null
let requestTimer = 0

const moviesById = computed(() => new Map(movies.value.map((movie) => [movie.id, movie])))

const selectedMovies = computed(() =>
  selectedIds.value
    .map((id) => moviesById.value.get(id))
    .filter((movie): movie is Movie => movie != null),
)

/**
 * Below the desktop columns, one section fills the screen and the others wait in tabs.
 */
function trackScreenWidth(): () => void {
  const query = window.matchMedia(NARROW_SCREEN)

  const sync = () => {
    narrow.value = query.matches
  }

  sync()
  query.addEventListener('change', sync)

  return () => query.removeEventListener('change', sync)
}

onMounted(async () => {
  const stopTrackingScreen = trackScreenWidth()
  onUnmounted(stopTrackingScreen)

  try {
    const catalog = await fetchCatalog()
    movies.value = catalog.movies
    viewerCount.value = catalog.viewerCount
    maxPicks.value = catalog.maxPicks
    commitSelection(picksInCatalog(selectedIds.value, catalog.movies, catalog.maxPicks))
  } catch (error) {
    catalogError.value =
      error instanceof Error ? error.message : 'Could not load the movie catalog.'
  } finally {
    loadingCatalog.value = false
  }
})

/**
 * Remember the picks and ask for suggestions. An empty list clears the cards directly.
 *
 * @param ids Liked film ids, in the order they were picked.
 */
function commitSelection(ids: readonly number[]): void {
  const next = [...ids]
  selectedIds.value = next
  writeSavedSelection(next)
  scheduleRecommendations(next)
}

/**
 * @param ids Liked film ids to score against the catalog.
 */
function scheduleRecommendations(ids: readonly number[]): void {
  window.clearTimeout(requestTimer)
  requestController?.abort()

  if (ids.length === 0) {
    recommendations.value = []
    recommendationError.value = ''
    loadingRecommendations.value = false
    return
  }

  loadingRecommendations.value = true
  requestTimer = window.setTimeout(() => {
    void loadRecommendations(ids)
  }, RECOMMENDATION_DELAY_MS)
}

/**
 * @param ids Liked film ids to score against the catalog.
 */
async function loadRecommendations(ids: readonly number[]): Promise<void> {
  requestController?.abort()
  const controller = new AbortController()
  requestController = controller

  loadingRecommendations.value = true

  try {
    recommendations.value = await fetchRecommendations(ids, controller.signal)
    recommendationError.value = ''
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return
    }

    recommendationError.value =
      error instanceof Error ? error.message : 'Could not load recommendations.'
    recommendations.value = []
  } finally {
    if (requestController === controller && !controller.signal.aborted) {
      loadingRecommendations.value = false
    }
  }
}

/**
 * @param id Catalog film to add or remove.
 */
function toggleMovie(id: number): void {
  const next = togglePick(selectedIds.value, id, maxPicks.value)

  if (next === selectedIds.value) {
    return
  }

  commitSelection(next)
}

function clearSelection(): void {
  commitSelection([])
}
</script>

<template>
  <div
    class="mx-auto flex h-full w-full max-w-[76rem] flex-col overflow-hidden px-4 py-3 sm:px-6 lg:px-8"
  >
    <header class="shrink-0 border-b border-ink pb-3">
      <div
        class="flex flex-col items-center gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4"
      >
        <h1 class="m-0 text-center text-3xl leading-none sm:text-left sm:text-4xl">Also Liked</h1>
        <p v-if="viewerCount" class="m-0 text-center text-xs text-muted sm:text-left sm:text-sm">
          {{ movies.length }} films · {{ viewerCount.toLocaleString() }} viewers
        </p>
      </div>
      <p class="mt-1 mb-0 text-center text-xs text-muted sm:text-left sm:text-sm">
        Choose films you like. We’ll suggest others that the same viewers watched.
      </p>
    </header>

    <p v-if="loadingCatalog" class="mt-4 text-muted">Loading the catalog…</p>
    <p
      v-else-if="catalogError"
      class="mt-4 rounded-lg bg-[#fde8e4] px-3 py-2.5 text-brand-deep"
      role="alert"
    >
      {{ catalogError }}
    </p>

    <template v-else>
      <div v-if="narrow" class="mt-3 flex shrink-0 items-center justify-between gap-2">
        <div
          class="film-scroll flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-full bg-paper-deep p-1"
          role="tablist"
          aria-label="Catalog, your films, and suggestions"
        >
          <button
            id="tab-catalog"
            type="button"
            role="tab"
            class="shrink-0 rounded-full px-2.5 py-1 text-sm whitespace-nowrap"
            :class="screen === 'catalog' ? 'bg-ink text-paper' : 'text-muted'"
            :aria-selected="screen === 'catalog'"
            aria-controls="panel-catalog"
            @click="screen = 'catalog'"
          >
            Catalog
          </button>
          <button
            id="tab-mine"
            type="button"
            role="tab"
            class="shrink-0 rounded-full px-2.5 py-1 text-sm whitespace-nowrap"
            :class="screen === 'mine' ? 'bg-ink text-paper' : 'text-muted'"
            :aria-selected="screen === 'mine'"
            aria-controls="panel-mine"
            @click="screen = 'mine'"
          >
            Mine
            <span class="tabular-nums" :class="screen === 'mine' ? 'text-paper/70' : ''">
              {{ selectedMovies.length }}
            </span>
          </button>
          <button
            id="tab-recommendations"
            type="button"
            role="tab"
            class="shrink-0 rounded-full px-2.5 py-1 text-sm whitespace-nowrap"
            :class="screen === 'recommendations' ? 'bg-ink text-paper' : 'text-muted'"
            :aria-selected="screen === 'recommendations'"
            aria-controls="panel-recommendations"
            @click="screen = 'recommendations'"
          >
            Recommendations
          </button>
        </div>
        <button
          v-if="screen === 'mine' && selectedMovies.length"
          type="button"
          class="shrink-0 text-sm text-brand hover:underline"
          @click="clearSelection"
        >
          Clear
        </button>
        <p
          v-else-if="screen === 'recommendations' && loadingRecommendations"
          class="m-0 shrink-0 text-sm text-muted"
        >
          Updating…
        </p>
      </div>

      <main
        class="mt-3 grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.9fr)] lg:gap-4"
      >
        <div
          id="panel-catalog"
          class="h-full min-h-0"
          :class="narrow && screen !== 'catalog' ? 'hidden' : 'block'"
          :role="narrow ? 'tabpanel' : undefined"
          :aria-labelledby="narrow ? 'tab-catalog' : undefined"
        >
          <MovieCatalog
            class="h-full"
            :movies="movies"
            :selected-ids="selectedIds"
            @toggle="toggleMovie"
          />
        </div>
        <RecommendationPanel
          class="h-full min-h-0"
          :class="narrow && screen === 'catalog' ? 'hidden' : 'block'"
          :selected-movies="selectedMovies"
          :recommendations="recommendations"
          :loading="loadingRecommendations"
          :error="recommendationError"
          :viewer-count="viewerCount"
          :show-tabs="!narrow"
          :tab="narrow && screen !== 'catalog' ? screen : undefined"
          @like="toggleMovie"
          @clear="clearSelection"
        />
      </main>
    </template>
  </div>
</template>
