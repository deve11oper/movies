import type { Movie } from './api'

/** Stored picks for this browser. The server's max_picks decides how many of them count. */
export const SELECTION_KEY = 'also-liked-selection'

/**
 * Films this browser already picked, so a refresh keeps the same likes.
 *
 * @param storage Browser storage. Tests pass a substitute.
 */
export function readSavedSelection(storage: Storage = window.localStorage): number[] {
  try {
    const raw = storage.getItem(SELECTION_KEY)

    if (raw == null) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((id): id is number => Number.isInteger(id))
  } catch {
    return []
  }
}

/**
 * @param ids Liked film ids, in the order they were picked.
 * @param storage Browser storage. Tests pass a substitute.
 */
export function writeSavedSelection(
  ids: readonly number[],
  storage: Storage = window.localStorage,
): void {
  try {
    storage.setItem(SELECTION_KEY, JSON.stringify(ids))
  } catch {
    // Private browsing can block storage; the current visit still works.
  }
}

/**
 * Drop stored ids that are no longer in the catalog and keep only as many as the server allows.
 *
 * @param saved Ids read from this browser.
 * @param catalog Films the server just returned.
 * @param maxPicks Selection cap from the catalog payload.
 */
export function picksInCatalog(
  saved: readonly number[],
  catalog: readonly Movie[],
  maxPicks: number,
): number[] {
  const known = new Set(catalog.map((movie) => movie.id))

  return saved.filter((id) => known.has(id)).slice(0, maxPicks)
}

/**
 * Add a film, or remove it if it is already picked. At the cap, the same list comes back.
 *
 * @param ids Current picks, in order.
 * @param id Catalog film to add or remove.
 * @param maxPicks Selection cap from the catalog payload.
 */
export function togglePick(
  ids: readonly number[],
  id: number,
  maxPicks: number,
): readonly number[] {
  if (ids.includes(id)) {
    return ids.filter((selectedId) => selectedId !== id)
  }

  if (ids.length >= maxPicks) {
    return ids
  }

  return [...ids, id]
}
