<?php

namespace App\Services;

/**
 * The number printed on a suggestion card.
 *
 * The best suggestion is 100. Every other card is that film's score as a percentage of the leader.
 */
final class MatchScore
{
    public static function percent(float $score, float $topScore): int
    {
        if ($score >= $topScore) {
            return 100;
        }

        return (int) round(100 * $score / $topScore);
    }
}
