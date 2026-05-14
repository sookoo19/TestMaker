<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const OLD = ['descriptive', 'choice', 'fill_blank', 'ordering'];

    private const NEW = ['descriptive', 'choice', 'fill_blank', 'ordering', 'true_false', 'multiple_choice', 'matching', 'essay'];

    public function up(): void
    {
        $this->replaceCheck(self::NEW);
    }

    public function down(): void
    {
        $this->replaceCheck(self::OLD);
    }

    private function replaceCheck(array $values): void
    {
        $list = "'".implode("','", $values)."'";

        DB::statement('ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check');
        DB::statement("ALTER TABLE questions ADD CONSTRAINT questions_question_type_check CHECK (question_type IN ({$list}))");
    }
};
