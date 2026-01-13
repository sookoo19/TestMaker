<?php

namespace App\Policies;

use App\Models\Question;
use App\Models\User;

class QuestionPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // ログインしていれば自分の問題一覧は見れる
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Question $question): bool
    {
        // 親のテストの所有者のみ閲覧可能
        return $user->id === $question->test->user_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // ログインしていれば作成可能（親テストの所有者チェックはコントローラーで行う）
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Question $question): bool
    {
        // 親のテストの所有者のみ更新可能
        return $user->id === $question->test->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Question $question): bool
    {
        // 親のテストの所有者のみ削除可能
        return $user->id === $question->test->user_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Question $question): bool
    {
        // 親のテストの所有者のみ復元可能
        return $user->id === $question->test->user_id;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Question $question): bool
    {
        // 親のテストの所有者のみ完全削除可能
        return $user->id === $question->test->user_id;
    }
}
