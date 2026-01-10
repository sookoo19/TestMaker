<?php

namespace App\Policies;

use App\Models\Test;
use App\Models\User;

class TestPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        // ログインしていれば自分のテスト一覧は見れる
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Test $test): bool
    {
        // 自分のテストのみ閲覧可能
        return $user->id === $test->user_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        // ログインしていれば作成可能
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Test $test): bool
    {
        // 自分のテストのみ更新可能
        return $user->id === $test->user_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Test $test): bool
    {
        // 自分のテストのみ削除可能
        return $user->id === $test->user_id;
    }
}
