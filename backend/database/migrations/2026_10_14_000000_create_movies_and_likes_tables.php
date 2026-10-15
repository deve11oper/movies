<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create the catalog and the viewer-like facts used for recommendations.
     */
    public function up(): void
    {
        Schema::create('movies', function (Blueprint $table) {
            $table->unsignedInteger('id')->primary();
            $table->string('title');
            $table->string('name');
            $table->unsignedSmallInteger('year')->nullable();
            $table->timestamps();
        });

        Schema::create('likes', function (Blueprint $table) {
            $table->unsignedInteger('user_id');
            $table->unsignedInteger('movie_id');
            $table->primary(['user_id', 'movie_id']);
            $table->index('movie_id');
        });
    }

    /**
     * Drop the recommendation tables.
     */
    public function down(): void
    {
        Schema::dropIfExists('likes');
        Schema::dropIfExists('movies');
    }
};
