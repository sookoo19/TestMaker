<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuestionChoice extends Model
{
    /** @use HasFactory<\Database\Factories\QuestionChoiceFactory> */
    use HasFactory;

    protected $fillable = [
        'choice_text',
        'is_correct',
        'sort_order',
    ];

    public function question(): BelongsTo
    {
        // belongsTo = 所属
        return $this->belongsTo(Question::class);
    }
}
