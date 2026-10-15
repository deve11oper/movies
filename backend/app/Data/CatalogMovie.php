<?php

namespace App\Data;

use JsonSerializable;

/**
 * One catalog row on the wire.
 */
final class CatalogMovie implements JsonSerializable
{
    public function __construct(
        public readonly int $id,
        public readonly string $title,
        public readonly string $name,
        public readonly ?int $year,
        public readonly int $fanCount,
    ) {}

    /**
     * @return array{id: int, title: string, name: string, year: int|null, fan_count: int}
     */
    public function jsonSerialize(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'name' => $this->name,
            'year' => $this->year,
            'fan_count' => $this->fanCount,
        ];
    }
}
