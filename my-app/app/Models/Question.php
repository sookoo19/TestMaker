<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Question extends Model
{
    /** @use HasFactory<\Database\Factories\QuestionFactory> */
    use HasFactory;

    protected $fillable = [
        'question_type',
        'question_text',
        'correct_answer',
        'explanation',
        'difficulty',
        'sort_order',
    ];

    public function test(): BelongsTo
    {
        // belongsTo = 所属
        return $this->belongsTo(Test::class);
    }
}
