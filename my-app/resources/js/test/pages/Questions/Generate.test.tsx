import Generate from '@/pages/Questions/Generate';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: { post: vi.fn() },
}));

vi.mock('@/layouts/app-layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/routes/tests', () => ({
    index: () => ({ url: '/tests' }),
    show: (test: { id: number }) => ({ url: `/tests/${test.id}` }),
}));

vi.mock('@/routes/tests/questions', () => ({
    index: (test: { id: number }) => ({ url: `/tests/${test.id}/questions` }),
}));

vi.mock('@/actions/App/Http/Controllers/QuestionController', () => ({
    generate: (test: { id: number }) => ({
        url: `/tests/${test.id}/questions/generate`,
    }),
    batchStore: (test: { id: number }) => ({
        url: `/tests/${test.id}/questions/batch`,
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

const mockQuestions = [
    {
        question_type: 'descriptive',
        question_text: '1+1は？',
        correct_answer: '2',
        explanation: '足し算の基本',
        difficulty: 'easy',
        sort_order: 1,
    },
];

describe('Questions/Generate', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    it('フォームフィールドを表示する', () => {
        render(<Generate test={baseTest} />);
        expect(screen.getByLabelText('入力方法')).toBeInTheDocument();
        expect(screen.getByLabelText('テーマ')).toBeInTheDocument();
        expect(screen.getByLabelText('問題数')).toBeInTheDocument();
        expect(screen.getByLabelText('難易度')).toBeInTheDocument();
        expect(screen.getByLabelText('問題形式')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: '生成する' }),
        ).toBeInTheDocument();
    });

    it('テーマ未入力で送信するとエラーを表示する', async () => {
        render(<Generate test={baseTest} />);
        await userEvent.click(screen.getByRole('button', { name: '生成する' }));

        expect(
            screen.getByText('テーマを入力してください'),
        ).toBeInTheDocument();
    });

    it('生成成功後にプレビューフェーズに切り替わる', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ questions: mockQuestions }),
        } as Response);

        render(<Generate test={baseTest} />);
        await userEvent.type(screen.getByLabelText('テーマ'), '算数');
        await userEvent.click(screen.getByRole('button', { name: '生成する' }));

        await waitFor(() => {
            expect(screen.getByText(/1\+1は？/)).toBeInTheDocument();
        });
        expect(
            screen.getByRole('button', { name: '保存する' }),
        ).toBeInTheDocument();
    });

    it('「やり直す」でフォームに戻る', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ questions: mockQuestions }),
        } as Response);

        render(<Generate test={baseTest} />);
        await userEvent.type(screen.getByLabelText('テーマ'), '算数');
        await userEvent.click(screen.getByRole('button', { name: '生成する' }));
        await waitFor(() => screen.getByRole('button', { name: 'やり直す' }));

        await userEvent.click(screen.getByRole('button', { name: 'やり直す' }));
        expect(
            screen.getByRole('button', { name: '生成する' }),
        ).toBeInTheDocument();
    });

    it('APIエラー時にエラーメッセージを表示する', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'AI APIの呼び出しに失敗しました' }),
        } as Response);

        render(<Generate test={baseTest} />);
        await userEvent.type(screen.getByLabelText('テーマ'), '算数');
        await userEvent.click(screen.getByRole('button', { name: '生成する' }));

        await waitFor(() => {
            expect(
                screen.getByText('AI APIの呼び出しに失敗しました'),
            ).toBeInTheDocument();
        });
    });
});
