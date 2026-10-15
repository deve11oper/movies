<?php

namespace Tests\Unit;

use App\Support\MovieTitle;
use PHPUnit\Framework\TestCase;

class MovieTitleTest extends TestCase
{
    public function test_it_moves_a_trailing_article_and_reads_the_year(): void
    {
        $this->assertSame(
            ['name' => 'The Usual Suspects', 'year' => 1995],
            MovieTitle::parse('Usual Suspects, The (1995)'),
        );
        $this->assertSame(
            ['name' => 'Il Postino', 'year' => 1994],
            MovieTitle::parse('Postino, Il (1994)'),
        );
    }

    public function test_it_keeps_a_title_that_has_no_article(): void
    {
        $this->assertSame(
            ['name' => 'Star Wars', 'year' => 1977],
            MovieTitle::parse('  Star Wars (1977)  '),
        );
    }

    public function test_it_parses_an_article_when_the_year_is_missing(): void
    {
        $this->assertSame(
            ['name' => 'The Lion King', 'year' => null],
            MovieTitle::parse('Lion King, The'),
        );
    }

    public function test_it_leaves_a_plain_title_unchanged(): void
    {
        $this->assertSame(
            ['name' => 'Fargo', 'year' => null],
            MovieTitle::parse('Fargo'),
        );
    }
}
