<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\User;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Test>
 */
class TestFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'description' => fake()->optional()->paragraph(),
            'subject' => fake()->optional()->randomElement(['数学', '英語', '国語', '理科', '社会']),
            'difficulty' => fake()->randomElement(['easy', 'medium', 'hard']),
            'status' => fake()->randomElement(['draft', 'generating', 'completed', 'failed']),
            'output_language' => fake()->randomElement(['ja', 'en', 'fr']),
            'user_id' => User::factory(),
        ];
    }
}
