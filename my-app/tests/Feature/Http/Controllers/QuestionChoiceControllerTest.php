<?php

use App\Models\Question;
use App\Models\QuestionChoice;
use App\Models\Test;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// beforeEach テスト実行前に毎回走るセットアップ処理。
beforeEach(function () {
    $this->user = User::factory()->create();
    $this->test = Test::factory()->create(['user_id' => $this->user->id]);
    $this->question = Question::factory()->create(['test_id' => $this->test->id]);
    $this->withoutVite();
});

describe('index', function () {
    test('ログインユーザーは選択肢を取得できる', function () {
        QuestionChoice::factory()->count(3)->create(['question_id' => $this->question->id]);

        $response = $this->actingAs($this->user)->get(
            route('questions.question_choices.index', $this->question)
        );

        $response->assertOk();
    });

    test('未認証ユーザーはログインページにリダイレクトされる', function () {
        $response = $this->get(
            route('questions.question_choices.index', $this->question)
        );

        $response->assertRedirect(route('login'));
    });

    test('他人の問題の選択肢一覧は取得できない', function () {
        $otherUser = User::factory()->create();
        $otherTest = Test::factory()->create(['user_id' => $otherUser->id]);
        $otherQuestion = Question::factory()->create(['test_id' => $otherTest->id]);

        $response = $this->actingAs($this->user)->get(
            route('questions.question_choices.index', $otherQuestion)
        );

        $response->assertNotFound();
    });
});

describe('store', function () {
    test('ログインユーザーは選択肢を作成できる', function () {
        $choiceData = [
            'choice_text' => '選択肢A',
            'is_correct' => true,
            'sort_order' => 0,
        ];

        $response = $this->actingAs($this->user)->post(
            route('questions.question_choices.store', $this->question),
            $choiceData
        );

        $response->assertRedirect();
        $this->assertDatabaseHas('question_choices', [
            'choice_text' => '選択肢A',
            'question_id' => $this->question->id,
        ]);
    });

    test('未認証ユーザーはログインページにリダイレクトされる', function () {
        $response = $this->post(
            route('questions.question_choices.store', $this->question),
            []
        );

        $response->assertRedirect(route('login'));
    });

    test('他人の問題に選択肢を作成できない', function () {
        $otherUser = User::factory()->create();
        $otherTest = Test::factory()->create(['user_id' => $otherUser->id]);
        $otherQuestion = Question::factory()->create(['test_id' => $otherTest->id]);
        $choiceData = [
            'choice_text' => '選択肢A',
            'is_correct' => true,
            'sort_order' => 0,
        ];

        $response = $this->actingAs($this->user)->post(
            route('questions.question_choices.store', $otherQuestion),
            $choiceData
        );

        $response->assertNotFound();
    });
});

describe('show', function () {
    test('ログインユーザーは選択肢を取得できる', function () {
        $choice = QuestionChoice::factory()->create(['question_id' => $this->question->id]);

        $response = $this->actingAs($this->user)->get(
            route('question_choices.show', $choice)
        );

        $response->assertOk();
    });

    test('未認証ユーザーはログインページにリダイレクトされる', function () {
        $choice = QuestionChoice::factory()->create(['question_id' => $this->question->id]);

        $response = $this->get(route('question_choices.show', $choice));

        $response->assertRedirect(route('login'));
    });

    test('他人の選択肢は取得できない', function () {
        $otherUser = User::factory()->create();
        $otherTest = Test::factory()->create(['user_id' => $otherUser->id]);
        $otherQuestion = Question::factory()->create(['test_id' => $otherTest->id]);
        $otherChoice = QuestionChoice::factory()->create(['question_id' => $otherQuestion->id]);

        $response = $this->actingAs($this->user)->get(
            route('question_choices.show', $otherChoice)
        );

        $response->assertNotFound();
    });
});

describe('update', function () {
    test('ログインユーザーは選択肢を更新できる', function () {
        $choice = QuestionChoice::factory()->create(['question_id' => $this->question->id]);

        $response = $this->actingAs($this->user)->put(
            route('question_choices.update', $choice),
            [
                'choice_text' => '更新後テキスト',
                'is_correct' => false,
                'sort_order' => 1,
            ]
        );

        $response->assertRedirect();
        $this->assertDatabaseHas('question_choices', [
            'id' => $choice->id,
            'choice_text' => '更新後テキスト',
        ]);
    });

    test('未認証ユーザーはログインページにリダイレクトされる', function () {
        $choice = QuestionChoice::factory()->create(['question_id' => $this->question->id]);

        $response = $this->put(route('question_choices.update', $choice), []);

        $response->assertRedirect(route('login'));
    });

    test('他人の選択肢は更新できない', function () {
        $otherUser = User::factory()->create();
        $otherTest = Test::factory()->create(['user_id' => $otherUser->id]);
        $otherQuestion = Question::factory()->create(['test_id' => $otherTest->id]);
        $otherChoice = QuestionChoice::factory()->create(['question_id' => $otherQuestion->id]);

        $response = $this->actingAs($this->user)->put(
            route('question_choices.update', $otherChoice),
            [
                'choice_text' => '更新後テキスト',
                'is_correct' => false,
                'sort_order' => 1,
            ]
        );

        $response->assertNotFound();
    });
});

describe('destroy', function () {
    test('ログインユーザーは選択肢を削除できる', function () {
        $choice = QuestionChoice::factory()->create(['question_id' => $this->question->id]);

        $response = $this->actingAs($this->user)->delete(
            route('question_choices.destroy', $choice)
        );

        $response->assertRedirect();
        $this->assertDatabaseMissing('question_choices', ['id' => $choice->id]);
    });

    test('未認証ユーザーはログインページにリダイレクトされる', function () {
        $choice = QuestionChoice::factory()->create(['question_id' => $this->question->id]);

        $response = $this->delete(route('question_choices.destroy', $choice));

        $response->assertRedirect(route('login'));
    });

    test('他人の選択肢は削除できない', function () {
        $otherUser = User::factory()->create();
        $otherTest = Test::factory()->create(['user_id' => $otherUser->id]);
        $otherQuestion = Question::factory()->create(['test_id' => $otherTest->id]);
        $otherChoice = QuestionChoice::factory()->create(['question_id' => $otherQuestion->id]);

        $response = $this->actingAs($this->user)->delete(
            route('question_choices.destroy', $otherChoice)
        );

        $response->assertNotFound();
    });
});
