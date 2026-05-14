<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTestRequest;
use App\Http\Requests\UpdateTestRequest;
use App\Http\Resources\TestResource;
use App\Models\Test;
use App\Services\LayoutAdvisorService;
use App\Services\TestExcelGenerator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\IOFactory;

class TestController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $tests = $request->user()->tests()->latest()->get();

        return Inertia::render('Tests/Index', [
            'tests' => TestResource::collection($tests),
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Tests/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreTestRequest $request)
    {
        $test = $request->user()->tests()->create($request->validated());

        return redirect()->route('tests.show', $test);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Test $test)
    {
        abort_if(
            $request->user()->cannot('view', $test), // この箇所testpolicy
            404
        );

        return Inertia::render('Tests/Show', [
            'test' => new TestResource($test->load(['questions' => fn ($q) => $q->orderBy('sort_order')])),
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Test $test)
    {
        return Inertia::render('Tests/Edit', [
            'test' => new TestResource($test),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateTestRequest $request, Test $test)
    {
        abort_if(
            $request->user()->cannot('update', $test), // この箇所testpolicy
            404
        );
        $test->update($request->validated());

        return redirect()->route('tests.show', $test);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Test $test)
    {
        abort_if(
            $request->user()->cannot('delete', $test), // この箇所testpolicy
            404
        );
        $test->delete();

        return redirect()->route('tests.index');
    }

    public function excelPreview(Request $request, Test $test)
    {
        abort_if(
            $request->user()->cannot('view', $test),
            404
        );

        $questions = $this->loadQuestions($test);
        $layout = (new LayoutAdvisorService)->recommend($test, $questions);

        return Inertia::render('Tests/ExcelPreview', [
            'test' => new TestResource($test),
            'layout' => $layout,
        ]);
    }

    public function excelImage(Request $request, Test $test)
    {
        abort_if(
            $request->user()->cannot('view', $test),
            404
        );

        $questions = $this->loadQuestions($test);
        $layout = (new LayoutAdvisorService)->recommend($test, $questions);

        $section = in_array($request->query('section'), TestExcelGenerator::VALID_SECTIONS)
            ? $request->query('section')
            : 'exam';
        $spreadsheet = (new TestExcelGenerator)->generate($test, $questions, $layout, $section);

        /** @var \PhpOffice\PhpSpreadsheet\Writer\Html $writer */
        $writer = IOFactory::createWriter($spreadsheet, 'Html');
        ob_start();
        $writer->save('php://output');
        $html = (string) ob_get_clean();

        return response($html, 200)->header('Content-Type', 'text/html; charset=utf-8');
    }

    public function excel(Request $request, Test $test)
    {
        abort_if(
            $request->user()->cannot('view', $test),
            404
        );

        $questions = $this->loadQuestions($test);
        $layout = (new LayoutAdvisorService)->recommend($test, $questions);
        $spreadsheet = (new TestExcelGenerator)->generate($test, $questions, $layout);

        $safeTitle = preg_replace('/[\/\\\:*?"<>|]/', '_', $test->title);
        $filename = $safeTitle.'.xlsx';
        $tempBase = tempnam(sys_get_temp_dir(), 'excel');
        $tempPath = $tempBase.'.xlsx';
        @unlink($tempBase);

        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');

        try {
            $writer->save($tempPath);

            return response()->download($tempPath, $filename)->deleteFileAfterSend(true);
        } catch (\Throwable $e) {
            @unlink($tempPath);
            throw $e;
        }
    }

    private function loadQuestions(Test $test): \Illuminate\Support\Collection
    {
        return $test->questions()->orderBy('sort_order')->with('questionChoices')->get();
    }
}
