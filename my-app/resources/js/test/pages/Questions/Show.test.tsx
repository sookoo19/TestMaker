import Show from '@/pages/Questions/Show';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
        <a href={href}>{children}</a>
    ),
    router: { delete: vi.fn() },
}));

vi.mock('@/layouts/app-layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/routes/questions', () => ({
    edit: (question: { id: number }) => ({ url: `/questions/${question.id}/edit` }),
    destroy: (question: { id: number }) => ({ url: `/questions/${question.id}` }),
}));

vi.mock('@/routes/tests', () => ({
    index: () => ({ url: '/tests' }),
    show: (test: { id: number }) => ({ url: `/tests/${test.id}` }),
}));

const baseQuestion = {
    id: 1,
    question_text: '1+1は？',
    question_type: 'multiple_choice',
    correct_answer: '2',
    explanation: 'たし算の基本',
    difficulty: 'easy',
    sort_order: 1,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    test: { id: 1, title: 'サンプルテスト' },
};

describe('Questions/Show', () => {
    it('問題文を表示する', () => {
        render(<Show question={baseQuestion} />);
        expect(screen.getByText('1+1は？')).toBeInTheDocument();
    });

    it('正解と解説を表示する', () => {
        render(<Show question={baseQuestion} />);
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('たし算の基本')).toBeInTheDocument();
    });

    it('削除確認で OK すると router.delete を呼ぶ', async () => {
        const { router } = await import('@inertiajs/react');
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<Show question={baseQuestion} />);
        await userEvent.click(screen.getByText('削除'));
        expect(router.delete).toHaveBeenCalledWith('/questions/1');
    });
});
