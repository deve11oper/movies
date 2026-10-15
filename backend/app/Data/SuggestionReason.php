<?php

namespace App\Data;

use JsonSerializable;

/**
 * One selected film's contribution to a suggestion.
 */
final class SuggestionReason implements JsonSerializable
{
    public function __construct(
        public readonly int $movieId,
        public readonly string $name,
        public readonly int $sharedViewers,
        public readonly int $alsoLikedPercent,
        public readonly float $score,
    ) {}

    /**
     * @return array{movie_id: int, name: string, shared_viewers: int, also_liked_percent: int, score: float}
     */
    public function jsonSerialize(): array
    {
        return [
            'movie_id' => $this->movieId,
            'name' => $this->name,
            'shared_viewers' => $this->sharedViewers,
            'also_liked_percent' => $this->alsoLikedPercent,
            'score' => $this->score,
        ];
    }
}
