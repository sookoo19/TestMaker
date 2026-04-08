# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TestMaker is a Laravel 12 + React (Inertia.js) application for creating and managing tests/quizzes. The app lives in `my-app/`. All commands below should be run from `my-app/`.

## Commands

### Development

```bash
# Start all services (Laravel server, queue, logs, Vite)
composer dev

# First-time setup
composer setup
```

The app runs in Docker via Laravel Sail (PostgreSQL, Redis, Mailpit).

### Testing

```bash
# Run all tests
composer test

# Run tests with watch mode (auto-reruns on file changes)
composer watch

# Run a single test file
php artisan test --filter=TestControllerTest

# Run via Pest directly
vendor/bin/pest tests/Feature/Http/Controllers/TestControllerTest.php
```

Tests use a real PostgreSQL database (`testing` DB). `RefreshDatabase` is used in feature tests.

### Code Style

```bash
# Fix code style (Laravel Pint)
vendor/bin/pint
```

## Architecture

### Data Model

Three core models with a clear ownership hierarchy:

- `User` → has many `Test`s
- `Test` → has many `Question`s
- `Question` → has many `QuestionChoice`s

### Authorization (Policies)

All resource access is owner-only via Laravel Policies (`TestPolicy`, `QuestionPolicy`, `QuestionChoicePolicy`). Controllers use `abort_if($user->cannot(...), 404)` — note it returns 404 (not 403) to avoid leaking resource existence.

### Routing

```
tests.*              → TestController (auth + verified middleware)
tests.questions.*    → QuestionController (shallow nested resource)
questions.*          → QuestionController (shallow routes — no test_id in URL)
```

The `QuestionChoiceController` exists but is not yet wired into routes.

### Frontend (Inertia + React + TypeScript)

Pages live in `resources/js/pages/` and map to Inertia render calls:
- `Tests/Index`, `Tests/Create`, `Tests/Show`, `Tests/Edit`
- `Questions/Index`, `Questions/Create`, `Questions/Show`, `Questions/Edit`

Routes are type-safe via `laravel/wayfinder` (generated into `resources/js/wayfinder/`).

### API Resources

`TestResource` and `QuestionResource` shape API responses. `TestResource` does not include questions by default — the controller loads them explicitly with `$test->load('questions')` when needed.

### Note on `Quesiton_choices.php`

There is a typo file `app/Models/Quesiton_choices.php` (misspelling of "Question"). This appears to be a leftover stub — the correct model is `QuestionChoice.php`.
