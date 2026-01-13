<?php

use App\Models\Question;
use App\Models\Test;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->test = Test::factory()->create(['user_id' => $this->user->id]);
    $this->withoutVite();
});

describe('index', function () {
    test('ログインユーザーは特定のテストの問題一覧を取得できる', function () {
        Question::factory()->count(3)->create(['test_id' => $this->test->id]);

        $response = $this->actingAs($this->user)->get(route('tests.questions.index', $this->test));

        $response->assertOk();
    });

    test('未認証ユーザーはログインページにリダイレクトされる', function () {
        $response = $this->get(route('tests.questions.index', $this->test));

        $response->assertRedirect(route('login'));
    });

    test('他人のテストの問題一覧は取得できない', function () {
        $otherUser = User::factory()->create();
        $otherTest = Test::factory()->create(['user_id' => $otherUser->id]);

        $response = $this->actingAs($this->user)->get(route('tests.questions.index', $otherTest));

        $response->assertNotFound();
    });
});

describe('create', function () {
    test('ログインユーザーは問題作成画面を表示できる', function () {
        $response = $this->actingAs($this->user)->get(route('tests.questions.create', $this->test));

        $response->assertOk();
    });

    test('未認証ユーザーはログインページにリダイレクトされる', function () {
        $response = $this->get(route('tests.questions.create', $this->test));

        $response->assertRedirect(route('login'));
    });

    test('他人のテストの問題作成画面は表示できない', function () {
        $otherUser = User::factory()->create();
        $otherTest = Test::factory()->create(['user_id' => $otherUser->id]);

        $response = $this->actingAs($this->user)->get(route('tests.questions.create', $otherTest));

        $response->assertNotFound();
    });
});

describe('store', function () {
    test('ログインユーザーはテストに問題を作成できる', function () {
        $questionData = [
            'question_type' => 'choice',
            'question_text' => 'これは質問文です？',
            'correct_answer' => '正解',
            'explanation' => '解説文',
            'difficulty' => 'medium',
            'sort_order' => 1,
        ];

        $response = $this->actingAs($this->user)->post(route('tests.questions.store', $this->test), $questionData);

        $response->assertRedirect();
        $this->assertDatabaseHas('questions', [
            'question_text' => 'これは質問文です？',
            'test_id' => $this->test->id,
        ]);
    });

    test('他人のテストに問題は作成できない', function () {
        $otherUser = User::factory()->create();
        $otherTest = Test::factory()->create(['user_id' => $otherUser->id]);

        $questionData = [
            'question_type' => 'choice',
            'question_text' => 'これは質問文です？',
            'correct_answer' => '正解',
            'difficulty' => 'medium',
            'sort_order' => 1,
        ];

        $response = $this->actingAs($this->user)->post(route('tests.questions.store', $otherTest), $questionData);

        $response->assertNotFound();
    });

    test('バリデーションエラー: question_typeが必須', function () {
        $questionData = [
            'question_text' => 'これは質問文です？',
            'correct_answer' => '正解',
            'difficulty' => 'medium',
            'sort_order' => 1,
        ];

        $response = $this->actingAs($this->user)->post(route('tests.questions.store', $this->test), $questionData);

        $response->assertSessionHasErrors('question_type');
    });
});

describe('show', function () {
    test('ログインユーザーは問題詳細を取得できる', function () {
        $question = Question::factory()->create(['test_id' => $this->test->id]);

        $response = $this->actingAs($this->user)->get(route('questions.show', $question));

        $response->assertOk();
    });

    test('他人の問題詳細は取得できない', function () {
        $otherUser = User::factory()->create();
        $otherTest = Test::factory()->create(['user_id' => $otherUser->id]);
        $otherQuestion = Question::factory()->create(['test_id' => $otherTest->id]);

        $response = $this->actingAs($this->user)->get(route('questions.show', $otherQuestion));

        $response->assertNotFound();
    });
});

describe('edit', function () {
    test('ログインユーザーは問題編集画面を表示できる', function () {
        $question = Question::factory()->create(['test_id' => $this->test->id]);

        $response = $this->actingAs($this->user)->get(route('questions.edit', $question));

        $response->assertOk();
    });

    test('未認証ユーザーはログインページにリダイレクトされる', function () {
        $question = Question::factory()->create(['test_id' => $this->test->id]);

        $response = $this->get(route('questions.edit', $question));

        $response->assertRedirect(route('login'));
    });

    test('他人の問題編集画面は表示できない', function () {
        $otherUser = User::factory()->create();
        $otherTest = Test::factory()->create(['user_id' => $otherUser->id]);
        $otherQuestion = Question::factory()->create(['test_id' => $otherTest->id]);

        $response = $this->actingAs($this->user)->get(route('questions.edit', $otherQuestion));

        $response->assertNotFound();
    });
});

describe('update', function () {
    test('ログインユーザーは問題を更新できる', function () {
        $question = Question::factory()->create(['test_id' => $this->test->id]);

        $response = $this->actingAs($this->user)->put(route('questions.update', $question), [
            'question_text' => '更新された質問文',
            'correct_answer' => '更新された正解',
            'difficulty' => 'hard',
            'sort_order' => 2,
        ]);

        $response->assertRedirect(route('questions.show', $question));
        $this->assertDatabaseHas('questions', [
            'id' => $question->id,
            'question_text' => '更新された質問文',
        ]);
    });

    test('他人の問題は更新できない', function () {
        $otherUser = User::factory()->create();
        $otherTest = Test::factory()->create(['user_id' => $otherUser->id]);
        $otherQuestion = Question::factory()->create(['test_id' => $otherTest->id]);

        $response = $this->actingAs($this->user)->put(route('questions.update', $otherQuestion), [
            'question_text' => '更新された質問文',
        ]);

        $response->assertNotFound();
    });
});

describe('destroy', function () {
    test('ログインユーザーは問題を削除できる', function () {
        $question = Question::factory()->create(['test_id' => $this->test->id]);

        $response = $this->actingAs($this->user)->delete(route('questions.destroy', $question));

        $response->assertRedirect(route('tests.show', $this->test));
        $this->assertDatabaseMissing('questions', ['id' => $question->id]);
    });

    test('他人の問題は削除できない', function () {
        $otherUser = User::factory()->create();
        $otherTest = Test::factory()->create(['user_id' => $otherUser->id]);
        $otherQuestion = Question::factory()->create(['test_id' => $otherTest->id]);

        $response = $this->actingAs($this->user)->delete(route('questions.destroy', $otherQuestion));

        $response->assertNotFound();
        $this->assertDatabaseHas('questions', ['id' => $otherQuestion->id]);
    });
});
