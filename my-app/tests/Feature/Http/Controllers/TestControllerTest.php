<?php

use App\Models\Test;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->withoutVite(); // Viteを無効化
});

describe('index', function () {
    test('ログインユーザーはテスト一覧を取得できる', function () {
        Test::factory()->count(3)->create(['user_id' => $this->user->id]);

        $response = $this->actingAs($this->user)->get(route('tests.index'));

        $response->assertOk();
    });

    test('未認証ユーザーはログインページにリダイレクトされる', function () {
        $response = $this->get(route('tests.index'));

        $response->assertRedirect(route('login'));
    });
});

describe('create', function () {
    test('ログインユーザーはテスト作成画面にアクセスできる', function () {
        $response = $this->actingAs($this->user)->get(route('tests.create'));

        $response->assertOk();
    });
});

describe('store', function () {
    test('ログインユーザーはテストを作成できる', function () {
        $testData = [
            'title' => 'テストタイトル',
            'description' => 'テストの説明',
            'subject' => '数学',
            'difficulty' => 'medium',
            'status' => 'draft',
            'output_language' => 'ja',
        ];

        $response = $this->actingAs($this->user)->post(route('tests.store'), $testData);

        $response->assertRedirect();
        $this->assertDatabaseHas('tests', [
            'title' => 'テストタイトル',
            'user_id' => $this->user->id,
        ]);
    });

    test('タイトルがない場合はバリデーションエラーになる', function () {
        $testData = [
            'description' => 'テストの説明',
            'difficulty' => 'medium',
            'status' => 'draft',
            'output_language' => 'ja',
        ];

        $response = $this->actingAs($this->user)->post(route('tests.store'), $testData);

        $response->assertSessionHasErrors('title');
    });
});

describe('show', function () {
    test('ログインユーザーはテスト詳細を取得できる', function () {
        $test = Test::factory()->create(['user_id' => $this->user->id]);

        $response = $this->actingAs($this->user)->get(route('tests.show', $test));

        $response->assertOk();
    });
});

describe('edit', function () {
    test('ログインユーザーはテスト編集画面にアクセスできる', function () {
        $test = Test::factory()->create(['user_id' => $this->user->id]);

        $response = $this->actingAs($this->user)->get(route('tests.edit', $test));

        $response->assertOk();
    });
});

describe('update', function () {
    test('ログインユーザーはテストを更新できる', function () {
        $test = Test::factory()->create(['user_id' => $this->user->id]);

        $response = $this->actingAs($this->user)->put(route('tests.update', $test), [
            'title' => '更新されたタイトル',
            'description' => '更新された説明',
            'subject' => '英語',
            'difficulty' => 'hard',
            'status' => 'completed',
            'output_language' => 'en',
        ]);

        $response->assertRedirect(route('tests.show', $test));
        $this->assertDatabaseHas('tests', [
            'id' => $test->id,
            'title' => '更新されたタイトル',
        ]);
    });
});

describe('destroy', function () {
    test('ログインユーザーはテストを削除できる', function () {
        $test = Test::factory()->create(['user_id' => $this->user->id]);

        $response = $this->actingAs($this->user)->delete(route('tests.destroy', $test));

        $response->assertRedirect(route('tests.index'));
        $this->assertDatabaseMissing('tests', ['id' => $test->id]);
    });
});