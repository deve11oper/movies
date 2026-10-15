<?php

namespace Tests\Unit;

use App\Services\TasteIndex;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TasteIndexTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_empty_catalog_has_no_viewers(): void
    {
        $index = TasteIndex::fromDatabase();

        $this->assertSame(0, $index->viewerCount);
        $this->assertSame(0, $index->fanCount(1));
        $this->assertSame(0, $index->shared(1, 2));
    }

    public function test_it_counts_fans_and_pairs_once_per_viewer(): void
    {
        DB::table('likes')->insert([
            ['user_id' => 1, 'movie_id' => 2],
            ['user_id' => 1, 'movie_id' => 4],
            ['user_id' => 2, 'movie_id' => 4],
            ['user_id' => 3, 'movie_id' => 9],
        ]);

        $index = TasteIndex::fromDatabase();

        $this->assertSame(3, $index->viewerCount);
        $this->assertSame(1, $index->fanCount(2));
        $this->assertSame(2, $index->fanCount(4));
        $this->assertSame(1, $index->shared(4, 2));
        $this->assertSame(1, $index->shared(2, 4));
        $this->assertSame(2, $index->shared(4, 4));
        $this->assertSame(0, $index->shared(2, 9));
        $this->assertSame(0, $index->fanCount(404));
    }
}
