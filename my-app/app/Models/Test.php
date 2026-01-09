<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Test extends Model
{
    /** @use HasFactory<\Database\Factories\TestFactory> */
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'subject',
        'difficulty',
        'status',
        'output_language',
    ];

    public function user(): BelongsTo
    {
        // belongsTo = 所属
        return $this->belongsTo(User::class);
    }
}
