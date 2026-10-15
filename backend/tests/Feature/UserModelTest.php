<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_attributes_use_their_casts(): void
    {
        $user = User::factory()->create([
            'password' => 'secret',
        ]);

        $this->assertNotSame('secret', $user->password);
        $this->assertTrue($user->email_verified_at?->isToday());
    }
}
