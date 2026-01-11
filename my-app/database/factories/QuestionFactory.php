<?php

namespace Database\Factories;

use App\Models\Test;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Question>
 */
class QuestionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'question_type' => fake()->randomElement(['descriptive', 'choice', 'fill_blank', 'ordering']),
            'question_text' => fake()->sentence() . '?',
            'correct_answer' => fake()->sentence(),
            'explanation' => fake()->optional()->paragraph(),
            'difficulty' => fake()->randomElement(['easy', 'medium', 'hard']),
            'sort_order' => fake()->numberBetween(1, 100),
            'test_id' => Test::factory(),
        ];
    }
}
