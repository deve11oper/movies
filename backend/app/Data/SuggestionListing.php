<?php

namespace App\Data;

use JsonSerializable;

/**
 * Suggestion payload.
 */
final class SuggestionListing implements JsonSerializable
{
    /**
     * @param  list<Suggestion>  $suggestions
     */
    public function __construct(
        public readonly int $viewerCount,
        public readonly array $suggestions,
    ) {}

    /**
     * @return array{viewer_count: int, recommendations: list<Suggestion>}
     */
    public function jsonSerialize(): array
    {
        return [
            'viewer_count' => $this->viewerCount,
            'recommendations' => $this->suggestions,
        ];
    }
}
