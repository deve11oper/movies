<?php

namespace Tests\Feature;

use App\Data\Suggestion;
use App\Models\Movie;
use App\Services\RecommendationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class RecommendationEdgeTest extends TestCase
{
    use RefreshDatabase;

    public function test_equal_scores_are_broken_by_name(): void
    {
        $this->movie(1, 'Seed');
        $this->movie(2, 'Zebra');
        $this->movie(3, 'Alpha');
        $this->movie(4, 'Extra');

        foreach (range(1, 5) as $userId) {
            $this->like($userId, 1);
            $this->like($userId, 2);
        }

        foreach (range(6, 10) as $userId) {
            $this->like($userId, 1);
            $this->like($userId, 3);
        }

        $this->like(11, 4);

        $ids = collect($this->postJson('/api/recommendations', [
            'movie_ids' => [1],
            'limit' => 2,
        ])->assertOk()->json('recommendations'))->pluck('id')->all();

        $this->assertSame([3, 2], $ids);
    }

    public function test_a_weak_overlap_uses_the_looser_fallback(): void
    {
        $this->movie(1, 'Seed');
        $this->movie(2, 'Only');
        $this->movie(3, 'Unliked', null);

        foreach (range(1, 2) as $userId) {
            $this->like($userId, 1);
            $this->like($userId, 2);
        }

        $this->like(3, 1);
        $this->like(4, 1);

        foreach (range(5, 52) as $userId) {
            $this->like($userId, 2);
        }

        $response = $this->postJson('/api/recommendations', [
            'movie_ids' => [1],
        ]);

        $ids = collect($response->assertOk()->json('recommendations'))->pluck('id')->all();

        $this->assertSame([2], $ids);
        $this->assertSame(1995, $response->json('recommendations.0.year'));
        $this->assertSame(0.1414, $response->json('recommendations.0.score'));
        $this->assertCount(1, $response->json('recommendations.0.reasons'));
    }

    public function test_duplicate_seed_ids_are_collapsed_by_the_service(): void
    {
        $this->movie(1, 'Seed');
        $this->movie(2, 'Other');
        $this->like(1, 1);
        $this->like(1, 2);

        $direct = app(RecommendationService::class)->recommend([1, 1], 5);

        $this->assertSame([2], array_map(fn (Suggestion $item): int => $item->id, $direct->suggestions));
    }

    public function test_a_seed_missing_from_the_catalog_adds_no_reason(): void
    {
        $this->movie(1, 'Seed');
        $this->like(1, 1);
        $this->like(1, 99);

        $result = app(RecommendationService::class)->recommend([99]);

        $this->assertSame([], $result->suggestions);
    }

    public function test_selecting_the_only_film_leaves_nothing_to_suggest(): void
    {
        $this->movie(1, 'Only');
        $this->like(1, 1);

        $this->postJson('/api/recommendations', [
            'movie_ids' => [1],
        ])->assertOk()->assertJsonPath('recommendations', []);
    }

    public function test_a_film_nobody_liked_is_listed_with_zero_fans(): void
    {
        $this->movie(1, 'Lonely', null);

        $this->getJson('/api/movies')
            ->assertOk()
            ->assertJsonPath('viewer_count', 0)
            ->assertJsonPath('max_picks', 69)
            ->assertJsonPath('movies.0.year', null)
            ->assertJsonPath('movies.0.fan_count', 0);
    }

    public function test_validation_rejects_a_bad_request(): void
    {
        $this->postJson('/api/recommendations', [])->assertStatus(422);
        $this->postJson('/api/recommendations', [
            'movie_ids' => '20',
        ])->assertStatus(422);
        $this->postJson('/api/recommendations', [
            'movie_ids' => [1, 1],
        ])->assertStatus(422);
        $this->postJson('/api/recommendations', [
            'movie_ids' => ['nope'],
        ])->assertStatus(422);
        $this->postJson('/api/recommendations', [
            'movie_ids' => range(1, 70),
        ])->assertStatus(422);
        $this->postJson('/api/recommendations', [
            'movie_ids' => [1],
            'limit' => 0,
        ])->assertStatus(422);
        $this->postJson('/api/recommendations', [
            'movie_ids' => [1],
            'limit' => 21,
        ])->assertStatus(422);
    }

    private function movie(int $id, string $name, ?int $year = 1995): void
    {
        Movie::query()->create([
            'id' => $id,
            'title' => $name,
            'name' => $name,
            'year' => $year,
        ]);
    }

    private function like(int $userId, int $movieId): void
    {
        DB::table('likes')->insert([
            'user_id' => $userId,
            'movie_id' => $movieId,
        ]);
    }
}
