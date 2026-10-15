<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Co-like counts for the catalog: how many viewers liked each film, and each pair of films.
 */
class TasteIndex
{
    /**
     * @param  array<int, int>  $fanCounts
     * @param  array<string, int>  $sharedCounts  Keys are "lowerId:higherId".
     */
    public function __construct(
        public readonly int $viewerCount,
        private array $fanCounts,
        private array $sharedCounts,
    ) {}

    /**
     * Build the index from stored likes. The catalog is small enough to do this per request.
     */
    public static function fromDatabase(): self
    {
        $moviesByViewer = [];

        foreach (DB::table('likes')->select(['user_id', 'movie_id'])->get() as $like) {
            $moviesByViewer[(int) $like->user_id][] = (int) $like->movie_id;
        }

        $fanCounts = [];
        $sharedCounts = [];

        foreach ($moviesByViewer as $movieIds) {
            $movieIds = array_values(array_unique($movieIds));
            sort($movieIds);
            $count = count($movieIds);

            for ($left = 0; $left < $count; $left++) {
                $leftId = $movieIds[$left];
                $fanCounts[$leftId] = ($fanCounts[$leftId] ?? 0) + 1;

                for ($right = $left + 1; $right < $count; $right++) {
                    $key = $leftId.':'.$movieIds[$right];
                    $sharedCounts[$key] = ($sharedCounts[$key] ?? 0) + 1;
                }
            }
        }

        return new self(count($moviesByViewer), $fanCounts, $sharedCounts);
    }

    /**
     * Viewers who liked this film.
     */
    public function fanCount(int $movieId): int
    {
        return $this->fanCounts[$movieId] ?? 0;
    }

    /**
     * Viewers who liked both films.
     */
    public function shared(int $leftId, int $rightId): int
    {
        if ($leftId === $rightId) {
            return $this->fanCount($leftId);
        }

        $key = min($leftId, $rightId).':'.max($leftId, $rightId);

        return $this->sharedCounts[$key] ?? 0;
    }
}
