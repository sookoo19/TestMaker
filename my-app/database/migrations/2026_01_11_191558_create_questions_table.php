<?php

use App\Models\Test;
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
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->enum('question_type', ['descriptive', 'choice', 'fill_blank', 'ordering'])->default('fill_blank');
            $table->text('question_text');
            $table->text('correct_answer');
            $table->text('explanation')->nullable();
            $table->enum('difficulty', ['easy', 'medium', 'hard'])->default('easy');
            $table->integer('sort_order');
            $table->foreignIdFor(Test::class)
                // 外部キーには必ずインデックスを付与
                ->index()
                // 外部キー制約を定義
                ->constrained()
                // 親が（所属元User）が削除されたら子（所有するTodo）を自動的に削除
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
