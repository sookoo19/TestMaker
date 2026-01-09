<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\User;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tests', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('subject')->nullable();
            $table->enum('difficulty', ['easy', 'medium', 'hard'])->default('easy');
            $table->enum('status', ['draft', 'generating', 'completed', 'failed'])->default('draft');
            $table->string('output_language')->default('ja');
            $table->timestamps();

            // Userモデルのidを外部キーとして持つ: カラム名は自動的に `user_id` となる
            $table->foreignIdFor(User::class)
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
        Schema::dropIfExists('tests');
    }
};
