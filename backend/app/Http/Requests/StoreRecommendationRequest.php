<?php

namespace App\Http\Requests;

use App\Support\CatalogLimits;
use Illuminate\Foundation\Http\FormRequest;

class StoreRecommendationRequest extends FormRequest
{
    /**
     * The catalog is public; anyone can ask for suggestions.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'movie_ids' => ['required', 'array', 'min:1', 'max:'.CatalogLimits::MAX_PICKS],
            'movie_ids.*' => ['integer', 'distinct'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:20'],
        ];
    }
}
