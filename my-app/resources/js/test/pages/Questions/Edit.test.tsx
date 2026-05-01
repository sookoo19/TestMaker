import Edit from '@/pages/Questions/Edit';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Form: ({
        children,
    }: {
        children: (props: {
            processing: boolean;
            errors: Record<string, string>;
        }) => React.ReactNode;
    }) => <form>{children({ processing: false, errors: {} })}</form>,
}));

vi.mock('@/layouts/app-layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/routes/questions', () => ({
    show: (question: { id: number }) => ({ url: `/questions/${question.id}` }),
    update: { form: (question: { id: number }) => ({ action: `/questions/${question.id}`, method: 'put' }) },
}));

vi.mock('@/routes/tests', () => ({
    index: () => ({ url: '/tests' }),
    show: (test: { id: number }) => ({ url: `/tests/${test.id}` }),
}));

const baseQuestion = {
    id: 1,
    question_text: '1+1は？',
    question_type: 'descriptive',
    correct_answer: '2',
    explanation: 'たし算の基本',
    difficulty: 'easy',
    sort_order: 1,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    test: { id: 1, title: 'サンプルテスト' },
};

describe('Questions/Edit', () => {
    it('既存値がフォームに表示される', () => {
        render(<Edit question={baseQuestion} />);
        expect(screen.getByDisplayValue('1+1は？')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
        expect(screen.getByDisplayValue('たし算の基本')).toBeInTheDocument();
    });

    it('フォームフィールドを表示する', () => {
        render(<Edit question={baseQuestion} />);
        expect(screen.getByLabelText('問題形式')).toBeInTheDocument();
        expect(screen.getByLabelText('問題文')).toBeInTheDocument();
        expect(screen.getByLabelText('答え')).toBeInTheDocument();
        expect(screen.getByLabelText('解説')).toBeInTheDocument();
        expect(screen.getByLabelText('難易度')).toBeInTheDocument();
    });
});
