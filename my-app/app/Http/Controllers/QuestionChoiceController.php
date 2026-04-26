<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreQuestionChoiceRequest;
use App\Http\Requests\UpdateQuestionChoiceRequest;
use App\Models\Question;
use App\Models\QuestionChoice;
use Illuminate\Http\Request;
use Inertia\Inertia;

class QuestionChoiceController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request, Question $question)
    {
        abort_if(
            $request->user()->cannot('view', $question),
            404
        );

        $choices = $question->questionChoices()->orderBy('sort_order')->get();

        return Inertia::render('QuestionChoices/Index', [
            'question' => $question,
            'choices' => $choices,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreQuestionChoiceRequest $request, Question $question)
    {
        abort_if(
            $request->user()->cannot('view', $question),
            404
        );

        $choice = $question->questionChoices()->create($request->validated());

        return redirect()->route('question_choices.show', $choice);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, QuestionChoice $questionChoice)
    {
        abort_if(
            $request->user()->cannot('view', $questionChoice),
            404
        );

        return Inertia::render('QuestionChoices/Show', [
            'choice' => $questionChoice->load('question'),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateQuestionChoiceRequest $request, QuestionChoice $questionChoice)
    {
        abort_if(
            $request->user()->cannot('update', $questionChoice),
            404
        );

        $questionChoice->update($request->validated());

        return redirect()->route('question_choices.show', $questionChoice);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, QuestionChoice $questionChoice)
    {
        abort_if(
            $request->user()->cannot('delete', $questionChoice),
            404
        );

        $question = $questionChoice->question;
        $questionChoice->delete();

        return redirect()->route('questions.question_choices.index', $question);
    }
}
