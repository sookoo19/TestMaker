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

            $table->foreignIdFor(Question::class)
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
        Schema::dropIfExists('question_choices');
    }
};
