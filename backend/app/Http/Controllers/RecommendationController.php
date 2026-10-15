<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRecommendationRequest;
use App\Models\Movie;
use App\Services\RecommendationService;
use Illuminate\Http\JsonResponse;

class RecommendationController extends Controller
{
    /**
     * Suggest other catalog films from the ones the visitor already likes.
     */
    public function store(StoreRecommendationRequest $request, RecommendationService $recommendations): JsonResponse
    {
        /** @var list<int> $movieIds */
        $movieIds = array_values(array_map(intval(...), $request->validated('movie_ids')));
        $knownIds = Movie::query()->whereIn('id', $movieIds)->pluck('id')->map(intval(...))->all();

        if (count($knownIds) !== count($movieIds)) {
            return response()->json([
                'message' => 'One or more movies are not in the catalog.',
            ], 422);
        }

        $limit = (int) $request->integer('limit', 8);

        return response()->json($recommendations->recommend($movieIds, $limit));
    }
}
