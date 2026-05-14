export const QUESTION_TYPES = [
    'descriptive',
    'choice',
    'fill_blank',
    'ordering',
    'true_false',
    'multiple_choice',
    'matching',
    'essay',
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
    descriptive: '記述式',
    choice: '選択式',
    fill_blank: '穴埋め',
    ordering: '並び替え',
    true_false: '真偽式',
    multiple_choice: '複数選択式',
    matching: '組合せ式',
    essay: '論述式',
};

export function questionTypeLabel(value: string): string {
    return QUESTION_TYPE_LABELS[value as QuestionType] ?? value;
}
