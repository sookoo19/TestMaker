import Index from '@/pages/Questions/Index';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('@/layouts/app-layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/routes/tests', () => ({
    index: () => ({ url: '/tests' }),
    show: (test: { id: number }) => ({ url: `/tests/${test.id}` }),
}));

vi.mock('@/routes/questions', () => ({
    show: (question: { id: number }) => ({ url: `/questions/${question.id}` }),
}));

vi.mock('@/routes/tests/questions', () => ({
    create: (test: { id: number }) => ({
        url: `/tests/${test.id}/questions/create`,
    }),
}));

const baseTest = {
    id: 1,
    title: 'サンプルテスト',
    status: 'draft',
    subject: '数学',
    difficulty: 'easy',
    description: null,
    output_language: null,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
};

const baseQuestion = {
    id: 1,
    question_text: '1+1は？',
    question_type: 'multiple_choice',
    correct_answer: '2',
    explanation: null,
    difficulty: 'easy',
    sort_order: 1,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
};

describe('Questions/Index', () => {
    it('問題一覧を表示する', () => {
        render(<Index test={baseTest} questions={[baseQuestion]} />);
        expect(screen.getByText(/1\+1は？/)).toBeInTheDocument();
    });

    it('問題がないとき案内文を表示する', () => {
        render(<Index test={baseTest} questions={[]} />);
        expect(screen.getByText('問題がまだありません')).toBeInTheDocument();
    });
});
