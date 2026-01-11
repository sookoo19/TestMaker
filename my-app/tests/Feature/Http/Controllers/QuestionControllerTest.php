<?php
use App\Models\Test;
use App\Models\User;
use App\Models\Question;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->test = Test::factory()->create(['user_id' => $this->user->id]);
    $this->withoutVite();
});

describe('show', function () {
    test('ログインユーザーはtestのquestionが存在する', function () {
        $question = Question::factory()->create(['test_id' => $this->test->id]);

        $response = $this->actingAs($this->user)->get(route('questions.show', $question));

        $response->assertOk();
    });
});

describe('destroy', function () {
    test('ログインユーザーはあるテストの問題を削除できる', function () {
        $question = Question::factory()->create(['test_id' => $this->test->id]);

        $response = $this->actingAs($this->user)->delete(route('questions.destroy', $question));

        $response->assertRedirect(route('tests.show', $this->test));
        $this->assertDatabaseMissing('questions', ['id' => $question->id]); //指定したデータが存在しないことを確認する。
    });
});