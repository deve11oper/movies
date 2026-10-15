<?php

namespace App\Data;

use JsonSerializable;

/**
 * Catalog payload. max_picks is the selection cap the client must follow.
 */
final class CatalogListing implements JsonSerializable
{
    /**
     * @param  list<CatalogMovie>  $movies
     */
    public function __construct(
        public readonly int $viewerCount,
        public readonly int $maxPicks,
        public readonly array $movies,
    ) {}

    /**
     * @return array{viewer_count: int, max_picks: int, movies: list<CatalogMovie>}
     */
    public function jsonSerialize(): array
    {
        return [
            'viewer_count' => $this->viewerCount,
            'max_picks' => $this->maxPicks,
            'movies' => $this->movies,
        ];
    }
}
