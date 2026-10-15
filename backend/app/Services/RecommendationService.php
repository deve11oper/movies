<?php

namespace App\Services;

use App\Data\Suggestion;
use App\Data\SuggestionListing;
use App\Data\SuggestionReason;
use App\Models\Movie;
use Illuminate\Support\Collection;

/**
 * Item-to-item recommendations, in the spirit of "people who liked this also liked".
 *
 * Each pair of films gets an association score from three signals:
 * cosine similarity (shared fans, scaled by how popular each film is),
 * lift (whether they are liked together more often than chance),
 * and log(1 + shared fans) so a handful of overlapping viewers cannot outrank a stable pattern.
 *
 * A visitor's list is scored by summing those pair scores. Films they already picked are left out.
 */
class RecommendationService
{
    /**
     * How many selected films a card may name. The score still adds every pick;
     * the card names only the five pair scores that pulled the hardest.
     */
    private const DISPLAYED_REASONS = 5;

    /**
     * Recommend catalog films for the movies a visitor says they like.
     *
     * @param  list<int>  $movieIds
     */
    public function recommend(array $movieIds, int $limit = 8): SuggestionListing
    {
        $seedIds = array_values(array_unique(array_map(intval(...), $movieIds)));
        $index = TasteIndex::fromDatabase();
        $movies = Movie::query()->get()->keyBy('id');

        $ranked = $this->rank($seedIds, $movies, $index, strict: true);

        if ($ranked === []) {
            $ranked = $this->rank($seedIds, $movies, $index, strict: false);
        }

        $shown = array_slice($ranked, 0, $limit);

        if ($shown === []) {
            return new SuggestionListing($index->viewerCount, []);
        }

        $topScore = $shown[0]['score'];
        $suggestions = [];

        foreach ($shown as $candidate) {
            $suggestions[] = new Suggestion(
                $candidate['id'],
                $candidate['title'],
                $candidate['name'],
                $candidate['year'],
                round($candidate['score'], 4),
                MatchScore::percent($candidate['score'], $topScore),
                $this->reasons($candidate['reasons']),
            );
        }

        return new SuggestionListing($index->viewerCount, $suggestions);
    }

    /**
     * @param  list<int>  $seedIds
     * @param  Collection<int, Movie>  $movies
     * @return list<array{id: int, title: string, name: string, year: int|null, score: float, reasons: list<array<string, mixed>>}>
     */
    private function rank(array $seedIds, $movies, TasteIndex $index, bool $strict): array
    {
        $seedLookup = array_fill_keys($seedIds, true);
        $ranked = [];

        foreach ($movies as $movie) {
            $candidateId = (int) $movie->id;

            if (isset($seedLookup[$candidateId])) {
                continue;
            }

            $scored = $this->scoreCandidate($candidateId, $seedIds, $movies, $index, $strict);

            if ($scored['score'] <= 0) {
                continue;
            }

            $ranked[] = [
                'id' => $candidateId,
                'title' => $movie->title,
                'name' => $movie->name,
                'year' => $movie->year,
                'score' => $scored['score'],
                'reasons' => $scored['reasons'],
            ];
        }

        usort($ranked, function (array $left, array $right): int {
            $byScore = $right['score'] <=> $left['score'];

            if ($byScore !== 0) {
                return $byScore;
            }

            return strcasecmp($left['name'], $right['name']);
        });

        return $ranked;
    }

    /**
     * @param  list<array{movie_id: int, name: string, shared_viewers: int, also_liked_percent: int, score: float}>  $reasons
     * @return list<SuggestionReason>
     */
    private function reasons(array $reasons): array
    {
        return array_map(
            fn (array $reason): SuggestionReason => new SuggestionReason(
                $reason['movie_id'],
                $reason['name'],
                $reason['shared_viewers'],
                $reason['also_liked_percent'],
                $reason['score'],
            ),
            $reasons,
        );
    }

    /**
     * @param  list<int>  $seedIds
     * @param  Collection<int, Movie>  $movies
     * @return array{score: float, reasons: list<array{movie_id: int, name: string, shared_viewers: int, also_liked_percent: int, score: float}>}
     */
    private function scoreCandidate(int $candidateId, array $seedIds, $movies, TasteIndex $index, bool $strict): array
    {
        $reasons = [];
        $total = 0.0;
        $candidateFans = $index->fanCount($candidateId);

        if ($candidateFans === 0 || $index->viewerCount === 0) {
            return ['score' => 0.0, 'reasons' => []];
        }

        foreach ($seedIds as $seedId) {
            $seedFans = $index->fanCount($seedId);
            $shared = $index->shared($seedId, $candidateId);

            if ($seedFans === 0 || $shared === 0) {
                continue;
            }

            $minimumShared = $strict ? min(8, max(2, intdiv($seedFans, 2))) : 1;

            if ($shared < $minimumShared) {
                continue;
            }

            $cosine = $shared / sqrt($seedFans * $candidateFans);
            $lift = ($shared * $index->viewerCount) / ($seedFans * $candidateFans);

            if ($strict && $lift <= 1) {
                continue;
            }

            $score = $strict
                ? $cosine * log($lift) * log(1 + $shared)
                : $cosine;

            if ($score <= 0 || ! isset($movies[$seedId])) {
                continue;
            }

            $total += $score;
            $reasons[] = [
                'movie_id' => $seedId,
                'name' => $movies[$seedId]->name,
                'shared_viewers' => $shared,
                'also_liked_percent' => (int) round(100 * $shared / $seedFans),
                'score' => round($score, 4),
            ];
        }

        usort($reasons, fn (array $left, array $right): int => $right['score'] <=> $left['score']);

        return [
            'score' => $total,
            'reasons' => array_slice($reasons, 0, self::DISPLAYED_REASONS),
        ];
    }
}
