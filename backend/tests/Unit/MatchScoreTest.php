<?php

namespace Tests\Unit;

use App\Services\MatchScore;
use PHPUnit\Framework\TestCase;

class MatchScoreTest extends TestCase
{
    public function test_the_leader_is_100(): void
    {
        $this->assertSame(100, MatchScore::percent(10.0, 10.0));
    }

    public function test_other_cards_show_their_share_of_the_leader(): void
    {
        $this->assertSame(90, MatchScore::percent(9.0, 10.0));
        $this->assertSame(40, MatchScore::percent(4.0, 10.0));
    }
}
