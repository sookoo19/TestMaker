<?php

use App\Http\Controllers\QuestionChoiceController;
use App\Http\Controllers\QuestionController;
use App\Http\Controllers\TestController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::resource('tests', TestController::class);

    Route::post('tests/{test}/questions/generate', [QuestionController::class, 'generate'])->name('tests.questions.generate');
    Route::post('tests/{test}/questions/batch', [QuestionController::class, 'batchStore'])->name('tests.questions.batch');

    // ネストしたルート
    Route::resource('tests.questions', QuestionController::class)->shallow();

    /*
    Laravelの ->shallow() が自動でルートを2種類に分けてくれる:
    - index / store / create → 親ID付き
    URL（questions/{question}/question_choices）
    - show / edit / update / destroy → 子単体
    URL（question_choices/{question_choice}）
    */
    Route::resource('questions.question_choices',
        QuestionChoiceController::class)->shallow();
});

require __DIR__.'/settings.php';
