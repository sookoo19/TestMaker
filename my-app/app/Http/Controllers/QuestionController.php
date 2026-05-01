<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreQuestionRequest;
use App\Http\Requests\UpdateQuestionRequest;
use App\Http\Resources\QuestionResource;
use App\Models\Question;
use App\Models\Test;
use Illuminate\Http\Request;
use Inertia\Inertia;

class QuestionController extends Controller
{
    /**
     * Display a listing of the resource.
     * 特定のテストに紐づく質問一覧を表示
     */
    public function index(Request $request, Test $test)
    {
        abort_if(
            $request->user()->cannot('view', $test),
            404
        );

        $questions = $test->questions()->orderBy('sort_order')->get();

        return Inertia::render('Questions/Index', [
            'test' => $test,
            'questions' => QuestionResource::collection($questions),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     * 特定のテストに紐づく質問作成画面を表示
     */
    public function create(Request $request, Test $test)
    {
        abort_if(
            $request->user()->cannot('view', $test),
            404
        );

        return Inertia::render('Questions/Create', [
            'test' => $test,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     * 特定のテストに紐づく質問を作成
     */
    public function store(StoreQuestionRequest $request, Test $test)
    {
        abort_if(
            $request->user()->cannot('view', $test),
            404
        );

        $question = $test->questions()->create($request->safe()->except('choices'));

        foreach ($request->validated()['choices'] ?? [] as $index => $choice) {
            $question->questionChoices()->create([
                'choice_text' => $choice['choice_text'],
                'is_correct' => $choice['is_correct'],
                'sort_order' => $index,
            ]);
        }

        return redirect()->route('questions.show', $question);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Question $question)
    {
        abort_if(
            $request->user()->cannot('view', $question),
            404
        );

        return Inertia::render('Questions/Show', [
            'question' => new QuestionResource(
                $question->load(['test', 'questionChoices' => fn ($q) => $q->orderBy('sort_order')])
            ),
            'choices' => $question->questionChoices,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, Question $question)
    {
        abort_if(
            $request->user()->cannot('update', $question),
            404
        );

        return Inertia::render('Questions/Edit', [
            'question' => new QuestionResource(
                $question->load(['test', 'questionChoices' => fn ($q) => $q->orderBy('sort_order')])
            ),
            'choices' => $question->questionChoices,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateQuestionRequest $request, Question $question)
    {
        abort_if(
            $request->user()->cannot('update', $question),
            404
        );

        $question->update($request->validated());

        return redirect()->route('questions.show', $question);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Question $question)
    {
        $test = $question->test;

        abort_if(
            $request->user()->cannot('delete', $question),
            404
        );

        $question->delete();

        return redirect()->route('tests.show', $test);
    }
}
