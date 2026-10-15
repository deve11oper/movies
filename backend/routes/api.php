<?php

use App\Http\Controllers\MovieController;
use App\Http\Controllers\RecommendationController;
use Illuminate\Support\Facades\Route;

Route::get('/movies', [MovieController::class, 'index']);
Route::post('/recommendations', [RecommendationController::class, 'store']);
