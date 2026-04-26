<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\QuestionChoice>
 */
class QuestionChoiceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'choice_text' => $this->faker->sentence(),
            'is_correct' => false,
            'sort_order' => $this->faker->numberBetween(0, 10),
        ];
    }
}
