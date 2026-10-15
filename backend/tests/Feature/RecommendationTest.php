<?php

namespace Tests\Feature;

use App\Models\Movie;
use App\Services\TasteIndex;
use Database\Seeders\MovieCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecommendationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MovieCatalogSeeder::class);
    }

    public function test_catalog_lists_every_movie(): void
    {
        $response = $this->getJson('/api/movies');

        $response->assertOk()
            ->assertJsonPath('viewer_count', 806)
            ->assertJsonPath('max_picks', 69)
            ->assertJsonCount(70, 'movies')
            ->assertJsonPath('movies.0.name', 'A Clockwork Orange');

        $usualSuspects = collect($response->json('movies'))->firstWhere('id', 6);
        $postino = collect($response->json('movies'))->firstWhere('id', 7);

        $this->assertSame('The Usual Suspects', $usualSuspects['name']);
        $this->assertSame(1995, $usualSuspects['year']);
        $this->assertSame('Il Postino', $postino['name']);
    }

    public function test_star_wars_fans_are_pointed_to_raiders(): void
    {
        $response = $this->postJson('/api/recommendations', [
            'movie_ids' => [20, 59, 66],
        ]);

        $response->assertOk()
            ->assertJsonPath('recommendations.0.id', 60)
            ->assertJsonPath('recommendations.0.match', 100);

        $ids = collect($response->json('recommendations'))->pluck('id');

        $this->assertFalse($ids->contains(20));
        $this->assertFalse($ids->contains(59));
        $this->assertFalse($ids->contains(66));
        $this->assertContains(36, $ids->all());
    }

    public function test_crime_picks_surface_related_crime_films(): void
    {
        $response = $this->postJson('/api/recommendations', [
            'movie_ids' => [23, 24, 6],
            'limit' => 5,
        ]);

        $response->assertOk()->assertJsonCount(5, 'recommendations');

        $topIds = collect($response->json('recommendations'))->pluck('id')->take(3)->all();

        $this->assertContains(5, $topIds);
        $this->assertContains(52, $topIds);

        $leadReason = $response->json('recommendations.0.reasons.0');
        $this->assertContains($leadReason['movie_id'], [23, 24, 6]);
        $this->assertGreaterThan(0, $leadReason['also_liked_percent']);
    }

    public function test_match_is_each_score_as_a_percentage_of_the_leader(): void
    {
        $index = TasteIndex::fromDatabase();
        $ids = Movie::query()->get()
            ->sortByDesc(fn (Movie $movie): int => $index->fanCount($movie->id))
            ->take(20)
            ->pluck('id')
            ->map(fn (mixed $id): int => (int) $id)
            ->values()
            ->all();

        $recommendations = collect($this->postJson('/api/recommendations', [
            'movie_ids' => $ids,
            'limit' => 5,
        ])->assertOk()->json('recommendations'));

        $topScore = $recommendations->first()['score'];

        $this->assertSame(100, $recommendations->first()['match']);

        foreach ($recommendations->skip(1) as $recommendation) {
            $this->assertSame((int) round(100 * $recommendation['score'] / $topScore), $recommendation['match']);
        }
    }

    public function test_a_suggestion_names_only_the_five_strongest_picks(): void
    {
        $response = $this->postJson('/api/recommendations', [
            'movie_ids' => range(1, 30),
            'limit' => 1,
        ]);

        $response->assertOk();

        $reasons = $response->json('recommendations.0.reasons');

        $this->assertCount(5, $reasons);

        $scores = array_column($reasons, 'score');
        $sorted = $scores;
        rsort($sorted);

        $this->assertSame($sorted, $scores);
    }

    public function test_monty_python_fans_are_pointed_to_a_fish_called_wanda(): void
    {
        $this->postJson('/api/recommendations', [
            'movie_ids' => [50, 57],
        ])->assertOk()->assertJsonPath('recommendations.0.id', 49);
    }

    public function test_unknown_movies_are_rejected(): void
    {
        $this->postJson('/api/recommendations', [
            'movie_ids' => [20, 999],
        ])->assertStatus(422);
    }

    public function test_empty_selection_is_rejected(): void
    {
        $this->postJson('/api/recommendations', [
            'movie_ids' => [],
        ])->assertStatus(422);
    }
}
