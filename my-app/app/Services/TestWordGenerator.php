<?php

namespace App\Services;

use App\Models\Test;
use Illuminate\Support\Collection;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\SimpleType\Jc;

class TestWordGenerator
{
    public const VALID_SECTIONS = ['exam', 'answer_sheet', 'answer_key'];

    private array $layout;

    public function generate(Test $test, Collection $questions, array $layout, string $section = 'all'): PhpWord
    {
        $this->layout = $layout;
        $phpWord = new PhpWord;
        $phpWord->setDefaultFontName('MS明朝');
        $phpWord->setDefaultFontSize(12);

        if ($section === 'exam' || $section === 'all') {
            $this->addExamSection($phpWord, $test, $questions);
        }
        if ($section === 'answer_sheet' || $section === 'all') {
            $this->addAnswerSheetSection($phpWord, $test, $questions);
        }
        if ($section === 'answer_key' || $section === 'all') {
            $this->addAnswerKeySection($phpWord, $test, $questions);
        }

        return $phpWord;
    }

    private function addExamSection(PhpWord $phpWord, Test $test, Collection $questions): void
    {
        $spacing = match ($this->layout['question_spacing'] ?? 'normal') {
            'narrow' => 60,
            'wide' => 240,
            default => 120,
        };

        $section = $phpWord->addSection();

        $section->addText($test->title, ['size' => 16, 'bold' => true], ['alignment' => Jc::CENTER]);

        foreach ($questions as $i => $question) {
            $section->addTextBreak(1);
            $section->addText(
                ($i + 1).'．'.$question->question_text,
                ['size' => 12],
                ['spaceAfter' => $spacing]
            );

            if ($question->question_type === 'choice') {
                foreach ($question->questionChoices as $j => $choice) {
                    $label = ['ア', 'イ', 'ウ', 'エ'][$j] ?? ($j + 1);
                    $section->addText(
                        '　'.$label.'．'.$choice->choice_text,
                        ['size' => 11]
                    );
                }
            }
        }
    }

    private function addAnswerSheetSection(PhpWord $phpWord, Test $test, Collection $questions): void
    {
        $lineHeight = match ($this->layout['answer_line_height'] ?? 'single') {
            'triple' => 3,
            default => 1,
        };

        $section = $phpWord->addSection();

        $section->addText('解答用紙', ['size' => 16, 'bold' => true], ['alignment' => Jc::CENTER]);
        $section->addText($test->title, ['size' => 12], ['alignment' => Jc::CENTER]);

        foreach ($questions as $i => $question) {
            $section->addTextBreak(1);
            $section->addText(
                ($i + 1).'．',
                ['size' => 12]
            );
            $section->addTextBreak($lineHeight);
        }
    }

    private function addAnswerKeySection(PhpWord $phpWord, Test $test, Collection $questions): void
    {
        $section = $phpWord->addSection();

        $section->addText('解答', ['size' => 16, 'bold' => true], ['alignment' => Jc::CENTER]);
        $section->addText($test->title, ['size' => 12], ['alignment' => Jc::CENTER]);

        foreach ($questions as $i => $question) {
            $section->addTextBreak(1);

            if ($question->question_type === 'choice') {
                $correct = $question->questionChoices->firstWhere('is_correct', true);
                $answer = $correct ? $correct->choice_text : '（正解なし）';
            } else {
                $answer = $question->correct_answer ?? '（解答未設定）';
            }

            $section->addText(
                ($i + 1).'．'.$answer,
                ['size' => 12]
            );
        }
    }
}
