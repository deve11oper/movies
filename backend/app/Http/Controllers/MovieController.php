<?php

namespace App\Http\Controllers;

use App\Data\CatalogListing;
use App\Data\CatalogMovie;
use App\Models\Movie;
use App\Support\CatalogLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class MovieController extends Controller
{
    /**
     * List every film in the catalog, with how many viewers liked each one.
     */
    public function index(): JsonResponse
    {
        $fanCounts = DB::table('likes')
            ->selectRaw('movie_id, COUNT(*) as fan_count')
            ->groupBy('movie_id')
            ->pluck('fan_count', 'movie_id');

        $movies = Movie::query()
            ->orderBy('name')
            ->get()
            ->map(fn (Movie $movie) => new CatalogMovie(
                $movie->id,
                $movie->title,
                $movie->name,
                $movie->year,
                (int) ($fanCounts[$movie->id] ?? 0),
            ))
            ->values()
            ->all();

        return response()->json(new CatalogListing(
            (int) DB::table('likes')->distinct()->count('user_id'),
            CatalogLimits::MAX_PICKS,
            $movies,
        ));
    }
}
