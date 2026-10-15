<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the movie catalog used by the recommendation desk.
     */
    public function run(): void
    {
        $this->call(MovieCatalogSeeder::class);
    }
}
