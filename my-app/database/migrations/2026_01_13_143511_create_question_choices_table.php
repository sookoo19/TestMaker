<?php

use App\Models\Question;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('question_choices', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->string('choice_text');
            $table->boolean('is_correct')->default(false);
            $table->unsignedInteger('sort_order')->default(0);

            $table->foreignIdFor(Question::class)
                // 外部キーには必ずインデックスを付与
                ->index()
                // 外部キー制約を定義
                ->constrained()
                // 親の Question が削除されたら紐づく QuestionChoice を自動的に削除
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('question_choices');
    }
};
