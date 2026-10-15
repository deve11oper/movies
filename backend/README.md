# Also Liked API

Laravel 13 on PHP 8.3. It serves the movie catalog and the item-to-item suggestions. The dataset is `movies.json`, one directory above this app.

Setup and the suggestion formula are in the [repository README](../README.md).

```bash
composer install
cp -n .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan db:seed
php artisan serve --host=127.0.0.1 --port=8000
```

`php artisan db:seed` loads `MovieCatalogSeeder`, which replaces the `movies` and `likes` tables from `movies.json`.

The default database is SQLite (`database/database.sqlite`). Tests use an in-memory SQLite database and do not touch that file.

## HTTP

| Method | Path | Body |
| --- | --- | --- |
| `GET` | `/api/movies` | — |
| `POST` | `/api/recommendations` | `movie_ids` (1–69 distinct catalog ids), optional `limit` (1–20, default 8) |

`GET /api/movies` returns `viewer_count`, `max_picks`, and every film with `fan_count`. The wire types live in `app/Data`. The Vue client renames those fields in `frontend/src/api.ts`.

Unknown ids, an empty list, duplicates, and a `limit` outside 1–20 answer `422`.

## Tests

`composer test` runs PHPUnit and fails unless line coverage of `app/` is 100%. The script loads PCOV, downloading the `php8.3-pcov` package into `/tmp` when the extension is not already installed.

```bash
composer test
```

Pint formats PHP: `vendor/bin/pint`.
