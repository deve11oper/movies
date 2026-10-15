<?php

namespace App\Support;

/**
 * Turns catalog titles such as "Usual Suspects, The (1995)" into a display name and year.
 */
class MovieTitle
{
    /**
     * Split a raw catalog title into a readable name and a release year.
     *
     * @return array{name: string, year: int|null}
     */
    public static function parse(string $title): array
    {
        $year = null;
        $name = trim($title);

        if (preg_match('/\((\d{4})\)\s*$/', $name, $yearMatch) === 1) {
            $year = (int) $yearMatch[1];
            $name = trim((string) preg_replace('/\s*\(\d{4}\)\s*$/', '', $name));
        }

        if (preg_match('/^(.*),\s+(The|A|An|Il|La|Le|Les)$/', $name, $articleMatch) === 1) {
            $name = $articleMatch[2].' '.$articleMatch[1];
        }

        return [
            'name' => $name,
            'year' => $year,
        ];
    }
}
