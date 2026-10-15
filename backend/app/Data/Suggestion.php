<?php

namespace App\Data;

use JsonSerializable;

/**
 * A catalog film suggested from the current likes.
 */
final class Suggestion implements JsonSerializable
{
    /**
     * @param  list<SuggestionReason>  $reasons
     */
    public function __construct(
        public readonly int $id,
        public readonly string $title,
        public readonly string $name,
        public readonly ?int $year,
        public readonly float $score,
        public readonly int $match,
        public readonly array $reasons,
    ) {}

    /**
     * @return array{id: int, title: string, name: string, year: int|null, score: float, match: int, reasons: list<SuggestionReason>}
     */
    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'name' => $this->name,
            'year' => $this->year,
            'score' => $this->score,
            'match' => $this->match,
            'reasons' => $this->reasons,
        ];
    }
}
