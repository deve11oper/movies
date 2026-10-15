# Also Liked interface

Vue 3 + TypeScript + Vite + Tailwind CSS 4. The page talks to the Laravel API through Vite’s `/api` proxy (`http://127.0.0.1:8000`).

Start the API first. Setup for both sides is in the [repository README](../README.md).

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

The app is at [http://127.0.0.1:5173/](http://127.0.0.1:5173/).

## What the screen does

- **Catalog** lists every film. Search, era, and sort (A–Z, Popular, Year) filter that list. Each page holds as many rows as fit the panel, so the list itself does not scroll.
- **Mine** is the current selection. It has the same search, sort, and fitted pages, and a control to remove a film.
- **Recommendations** shows up to three suggestions for the current picks.

Below 1024px, one of those three sections fills the screen. At 1024px and wider, the catalog stays in the first column and Mine / Recommendations stay in the second.

The selection cap (`max_picks`) comes from the catalog response. The browser stores the chosen ids in `localStorage` under `also-liked-selection`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Typecheck, then production build |
| `npm run typecheck` | `vue-tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm test` | Vitest with a 100% coverage gate on `src` |

`src/main.ts` is the mount entry and is outside that coverage gate. A pre-commit hook in the repository root runs lint-staged for the frontend.
