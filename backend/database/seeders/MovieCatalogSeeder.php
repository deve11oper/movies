<?php

namespace Database\Seeders;

use App\Support\MovieTitle;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class MovieCatalogSeeder extends Seeder
{
    /**
     * Load movies.json into the catalog and like tables.
     */
    public function run(): void
    {
        $payload = json_decode($this->catalogContents(), true, 512, JSON_THROW_ON_ERROR);

        if (! isset($payload['movies'], $payload['users']) || ! is_array($payload['movies']) || ! is_array($payload['users'])) {
            throw new RuntimeException('movies.json must contain movies and users.');
        }

        $now = now();
        $movieRows = [];
        $knownIds = [];

        foreach ($payload['movies'] as $id => $title) {
            $movieId = (int) $id;
            $parsed = MovieTitle::parse((string) $title);
            $knownIds[$movieId] = true;
            $movieRows[] = [
                'id' => $movieId,
                'title' => (string) $title,
                'name' => $parsed['name'],
                'year' => $parsed['year'],
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        $likeRows = [];
        $seenPairs = [];

        foreach ($payload['users'] as $user) {
            $userId = (int) ($user['user_id'] ?? 0);
            $movieIds = is_array($user['movies'] ?? null) ? $user['movies'] : [];

            foreach ($movieIds as $movieId) {
                $movieId = (int) $movieId;
                $pairKey = $userId.':'.$movieId;

                if ($userId === 0 || ! isset($knownIds[$movieId]) || isset($seenPairs[$pairKey])) {
                    continue;
                }

                $seenPairs[$pairKey] = true;
                $likeRows[] = [
                    'user_id' => $userId,
                    'movie_id' => $movieId,
                ];
            }
        }

        DB::table('likes')->delete();
        DB::table('movies')->delete();
        DB::table('movies')->insert($movieRows);

        foreach (array_chunk($likeRows, 500) as $chunk) {
            DB::table('likes')->insert($chunk);
        }
    }

    /**
     * Read the shared dataset that lives next to the Laravel app.
     */
    private function catalogContents(): string
    {
        $candidates = [
            dirname(base_path()).'/movies.json',
            database_path('data/movies.json'),
        ];

        foreach ($candidates as $path) {
            if (is_file($path)) {
                $contents = file_get_contents($path);

                if ($contents === false) {
                    throw new RuntimeException('Could not read '.$path);
                }

                return $contents;
            }
        }

        throw new RuntimeException('movies.json was not found.');
    }
}
