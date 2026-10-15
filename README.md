# Also Liked

A movie desk in the spirit of “people who liked this also liked.” Pick films from a fixed catalog. The app suggests other films from that same catalog, using what about 800 other viewers liked.

The interface is a Vue app. The catalog and the suggestions come from a Laravel API. Both sides read one dataset, `movies.json`, at the root of this repository.

## Layout

| Path | What it is |
| --- | --- |
| `movies.json` | 70 films and the viewers who liked them |
| `frontend/` | Vue 3 interface. See [frontend/README.md](frontend/README.md) |
| `backend/` | Laravel API. See [backend/README.md](backend/README.md) |

## Run it

Use two terminals. The API must be up before the page can load the catalog.

```bash
# API
cd backend
composer install
cp -n .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan db:seed
php artisan serve --host=127.0.0.1 --port=8000
```

```bash
# Interface
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/). Vite proxies `/api` to `http://127.0.0.1:8000`.

Picks are stored in this browser under `also-liked-selection`. The server does not keep a visitor’s list.

## How a suggestion is chosen

Each pair of films gets a score from three signals: cosine similarity of their fans, lift against chance, and `ln(1 + shared fans)` so a handful of overlapping viewers cannot outrank a stable pattern. A visitor’s list is the sum of those pair scores. Films they already picked are left out.

The card’s percentage is that film’s score as a share of the best suggestion. The leader is 100. A card names at most five picks, the ones that pulled the hardest. The score still adds every pick.

If nothing passes the stricter shared-viewer filter, the API falls back to cosine similarity with at least one viewer in common. A film nobody liked can be picked, and it will not be suggested.
