import Show from '@/pages/Tests/Show';
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

vi.mock('@/routes/tests', () => ({
    index: () => ({ url: '/tests' }),
    edit: (test: { id: number }) => ({ url: `/tests/${test.id}/edit` }),
    destroy: (test: { id: number }) => ({ url: `/tests/${test.id}` }),
}));

vi.mock('@/routes/tests/questions', () => ({
    index: (test: { id: number }) => ({ url: `/tests/${test.id}/questions` }),
}));

const baseTest = {
    id: 1,
    title: 'サンプルテスト',
    status: 'draft',
    subject: '数学',
    difficulty: 'easy',
    description: 'テストの説明',
    output_language: 'ja',
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
    questions: [],
};

describe('Tests/Show', () => {
    it('テストのタイトルを表示する', () => {
        render(<Show test={baseTest} />);
        expect(screen.getByText('サンプルテスト')).toBeInTheDocument();
    });

    it('問題がないとき案内文を表示する', () => {
        render(<Show test={baseTest} />);
        expect(screen.getByText('質問がまだありません。')).toBeInTheDocument();
    });

    it('問題一覧を表示する', () => {
        const test = {
            ...baseTest,
            questions: [
                {
                    id: 1,
                    question_text: '1+1は？',
                    question_type: 'multiple_choice',
                    correct_answer: '2',
                    explanation: null,
                    difficulty: 'easy',
                    sort_order: 1,
                    created_at: '2024-01-15T00:00:00Z',
                    updated_at: '2024-01-15T00:00:00Z',
                },
            ],
        };
        render(<Show test={test} />);
        expect(screen.getByText(/1\+1は？/)).toBeInTheDocument();
    });

    it('削除確認で OK すると router.delete を呼ぶ', async () => {
        const { router } = await import('@inertiajs/react');
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<Show test={baseTest} />);
        await userEvent.click(screen.getByText('削除'));
        expect(router.delete).toHaveBeenCalledWith('/tests/1');
    });
});
