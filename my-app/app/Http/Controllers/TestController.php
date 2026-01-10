<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Requests\StoreTestRequest;
use App\Http\Requests\UpdateTestRequest;
use App\Http\Resources\TestResource;
use App\Models\Test;
use Inertia\Inertia;

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
            'test' => new TestResource($test),
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
}
