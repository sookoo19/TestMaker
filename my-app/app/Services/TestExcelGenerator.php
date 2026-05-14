<?php

namespace App\Services;

use App\Models\Test;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class TestExcelGenerator
{
    public const VALID_SECTIONS = ['exam', 'answer_key'];

    private const COL_NUMBER = 'A';
    private const COL_BODY_START = 'B';
    private const COL_BODY_END = 'F';

    private array $layout;

    public function generate(Test $test, Collection $questions, array $layout, string $section = 'all'): Spreadsheet
    {
        $this->layout = $layout;

        $spreadsheet = new Spreadsheet;
        $spreadsheet->removeSheetByIndex(0);

        if ($section === 'exam' || $section === 'all') {
            $this->addExamSheet($spreadsheet, $test, $questions);
        }
        if ($section === 'answer_key' || $section === 'all') {
            $this->addAnswerKeySheet($spreadsheet, $test, $questions);
        }

        $spreadsheet->setActiveSheetIndex(0);

        return $spreadsheet;
    }

    private function addExamSheet(Spreadsheet $spreadsheet, Test $test, Collection $questions): void
    {
        $sheet = new Worksheet($spreadsheet, '問題');
        $spreadsheet->addSheet($sheet);

        $this->applyPageSetup($sheet);
        $this->setupColumnWidths($sheet);

        $row = 1;
        $row = $this->writeTitle($sheet, $test->title, $row);
        $row++;

        $spacing = match ($this->layout['question_spacing'] ?? 'normal') {
            'narrow' => 0,
            'wide' => 2,
            default => 1,
        };

        foreach ($questions as $i => $question) {
            $row = $this->writeQuestion($sheet, $i + 1, $question, $row);
            $row += $spacing;
        }
    }

    private function addAnswerKeySheet(Spreadsheet $spreadsheet, Test $test, Collection $questions): void
    {
        $sheet = new Worksheet($spreadsheet, '解答');
        $spreadsheet->addSheet($sheet);

        $this->applyPageSetup($sheet);
        $this->setupColumnWidths($sheet);

        $row = 1;
        $row = $this->writeTitle($sheet, '解答', $row);

        $subtitleRange = self::COL_NUMBER.$row.':'.self::COL_BODY_END.$row;
        $sheet->setCellValue(self::COL_NUMBER.$row, $test->title);
        $sheet->mergeCells($subtitleRange);
        $sheet->getStyle($subtitleRange)->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $row += 2;

        foreach ($questions as $i => $question) {
            $answerRange = self::COL_BODY_START.$row.':'.self::COL_BODY_END.$row;
            $sheet->setCellValue(self::COL_NUMBER.$row, ($i + 1).'.');
            $sheet->setCellValue(self::COL_BODY_START.$row, $this->resolveAnswer($question));
            $sheet->mergeCells($answerRange);
            $sheet->getStyle($answerRange)->getAlignment()
                ->setWrapText(true)
                ->setVertical(Alignment::VERTICAL_TOP);
            $row++;
        }
    }

    private function writeTitle(Worksheet $sheet, string $title, int $row): int
    {
        $range = self::COL_NUMBER.$row.':'.self::COL_BODY_END.$row;
        $sheet->setCellValue(self::COL_NUMBER.$row, $title);
        $sheet->mergeCells($range);
        $sheet->getStyle($range)->getFont()->setBold(true)->setSize(16);
        $sheet->getStyle($range)->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getRowDimension($row)->setRowHeight(28);

        return $row + 1;
    }

    private function writeQuestion(Worksheet $sheet, int $number, $question, int $row): int
    {
        $sheet->setCellValue(self::COL_NUMBER.$row, $number.'.');
        $sheet->getStyle(self::COL_NUMBER.$row)->getAlignment()
            ->setVertical(Alignment::VERTICAL_TOP);

        $bodyRange = self::COL_BODY_START.$row.':'.self::COL_BODY_END.$row;
        $sheet->setCellValue(self::COL_BODY_START.$row, $question->question_text);
        $sheet->mergeCells($bodyRange);
        $sheet->getStyle($bodyRange)->getAlignment()
            ->setWrapText(true)
            ->setVertical(Alignment::VERTICAL_TOP);
        $row++;

        if (in_array($question->question_type, ['choice', 'multiple_choice'], true)) {
            $labels = ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ'];
            foreach ($question->questionChoices as $j => $choice) {
                $label = $labels[$j] ?? (string) ($j + 1);
                $range = self::COL_BODY_START.$row.':'.self::COL_BODY_END.$row;
                $sheet->setCellValue(self::COL_BODY_START.$row, '　'.$label.'．'.$choice->choice_text);
                $sheet->mergeCells($range);
                $sheet->getStyle($range)->getAlignment()->setWrapText(true);
                $row++;
            }
        }

        [$lines, $startCol, $endCol] = $this->resolveAnswerBoxSize($question->question_type);
        $rowHeight = ($this->layout['answer_line_height'] ?? 'single') === 'triple' ? 60 : 24;
        $boxStart = $row;
        $boxEnd = $row + $lines - 1;
        for ($r = $boxStart; $r <= $boxEnd; $r++) {
            $sheet->getRowDimension($r)->setRowHeight($rowHeight);
        }
        $range = $startCol.$boxStart.':'.$endCol.$boxEnd;
        if ($startCol !== $endCol || $boxStart !== $boxEnd) {
            $sheet->mergeCells($range);
        }
        $sheet->getStyle($range)->getBorders()->getOutline()
            ->setBorderStyle(Border::BORDER_THIN);

        return $boxEnd + 1;
    }

    private function resolveAnswerBoxSize(string $questionType): array
    {
        return match ($questionType) {
            'choice', 'true_false' => [1, self::COL_BODY_START, 'C'],
            'fill_blank', 'multiple_choice' => [1, self::COL_BODY_START, self::COL_BODY_END],
            'ordering' => [2, self::COL_BODY_START, self::COL_BODY_END],
            'matching' => [3, self::COL_BODY_START, self::COL_BODY_END],
            'essay' => [8, self::COL_BODY_START, self::COL_BODY_END],
            default => [4, self::COL_BODY_START, self::COL_BODY_END],
        };
    }

    private function resolveAnswer($question): string
    {
        if ($question->question_type === 'choice') {
            $correct = $question->questionChoices->firstWhere('is_correct', true);

            return $correct ? $correct->choice_text : '（正解なし）';
        }

        if ($question->question_type === 'multiple_choice') {
            $corrects = $question->questionChoices->where('is_correct', true);
            if ($corrects->isNotEmpty()) {
                return $corrects->pluck('choice_text')->implode('、');
            }

            return $question->correct_answer ?? '（正解なし）';
        }

        return $question->correct_answer ?? '（解答未設定）';
    }

    private function applyPageSetup(Worksheet $sheet): void
    {
        $sheet->getPageSetup()
            ->setOrientation(PageSetup::ORIENTATION_PORTRAIT)
            ->setPaperSize(PageSetup::PAPERSIZE_A4)
            ->setFitToWidth(1)
            ->setFitToHeight(0);

        $marginInch = match ($this->layout['margin'] ?? 'normal') {
            'wide' => 0.9,
            default => 0.6,
        };

        $sheet->getPageMargins()
            ->setTop($marginInch)
            ->setBottom($marginInch)
            ->setLeft($marginInch)
            ->setRight($marginInch);
    }

    private function setupColumnWidths(Worksheet $sheet): void
    {
        $sheet->getColumnDimension('A')->setWidth(5);
        foreach (['B', 'C', 'D', 'E', 'F'] as $col) {
            $sheet->getColumnDimension($col)->setWidth(14);
        }
    }
}
