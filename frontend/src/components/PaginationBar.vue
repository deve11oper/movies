<script setup lang="ts">
defineProps<{
  currentPage: number
  pageCount: number
  label: string
}>()

const emit = defineEmits<{
  change: [page: number]
}>()
</script>

<template>
  <nav
    class="mt-1 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line px-1 py-2"
    :aria-label="label"
  >
    <button
      type="button"
      class="rounded-full px-2.5 py-1 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-40"
      :disabled="currentPage === 1"
      @click="emit('change', currentPage - 1)"
    >
      Previous
    </button>
    <p class="m-0 text-sm text-muted tabular-nums sm:hidden">{{ currentPage }} / {{ pageCount }}</p>
    <div class="hidden min-w-0 flex-1 justify-center gap-1 overflow-x-auto sm:flex">
      <button
        v-for="number in pageCount"
        :key="number"
        type="button"
        class="grid size-8 shrink-0 place-items-center rounded-full text-sm tabular-nums"
        :class="number === currentPage ? 'bg-ink text-paper' : 'text-muted hover:bg-hover'"
        :aria-current="number === currentPage ? 'page' : undefined"
        :aria-label="`Page ${number}`"
        @click="emit('change', number)"
      >
        {{ number }}
      </button>
    </div>
    <button
      type="button"
      class="rounded-full px-2.5 py-1 text-sm text-ink disabled:cursor-not-allowed disabled:opacity-40"
      :disabled="currentPage === pageCount"
      @click="emit('change', currentPage + 1)"
    >
      Next
    </button>
  </nav>
</template>
