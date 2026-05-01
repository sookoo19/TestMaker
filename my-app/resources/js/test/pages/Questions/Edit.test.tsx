import Edit from '@/pages/Questions/Edit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Form: vi.fn(
        ({
            children,
        }: {
            children: (props: {
                processing: boolean;
                errors: Record<string, string>;
            }) => React.ReactNode;
        }) => <form>{children({ processing: false, errors: {} })}</form>,
    ),
    router: { post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/layouts/app-layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/routes/questions', () => ({
    show: (question: { id: number }) => ({ url: `/questions/${question.id}` }),
    update: {
        form: (question: { id: number }) => ({
            action: `/questions/${question.id}`,
            method: 'put',
        }),
    },
}));

vi.mock('@/routes/question_choices', () => ({
    update: (id: number) => ({ url: `/question_choices/${id}` }),
    destroy: (id: number) => ({ url: `/question_choices/${id}` }),
}));

vi.mock('@/routes/questions/question_choices', () => ({
    store: (question: { id: number }) => ({
        url: `/questions/${question.id}/question_choices`,
    }),
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
        render(<Edit question={baseQuestion} choices={[]} />);
        expect(screen.getByDisplayValue('1+1は？')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2')).toBeInTheDocument();
        expect(screen.getByDisplayValue('たし算の基本')).toBeInTheDocument();
    });

    it('フォームフィールドを表示する', () => {
        render(<Edit question={baseQuestion} choices={[]} />);
        expect(screen.getByLabelText('問題形式')).toBeInTheDocument();
        expect(screen.getByLabelText('問題文')).toBeInTheDocument();
        expect(screen.getByLabelText('答え')).toBeInTheDocument();
        expect(screen.getByLabelText('解説')).toBeInTheDocument();
        expect(screen.getByLabelText('難易度')).toBeInTheDocument();
    });

    it('問題文を変更できる', async () => {
        render(<Edit question={baseQuestion} choices={[]} />);
        const textarea = screen.getByLabelText('問題文');
        await userEvent.clear(textarea);
        await userEvent.type(textarea, '2+2は？');
        expect(screen.getByDisplayValue('2+2は？')).toBeInTheDocument();
    });

    it('バリデーションエラーを表示する', async () => {
        const { Form } = await import('@inertiajs/react');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Form as any).mockImplementationOnce(({ children }: any) => (
            <form>
                {children({
                    processing: false,
                    errors: { question_text: '問題文は必須です' },
                })}
            </form>
        ));
        render(<Edit question={baseQuestion} choices={[]} />);
        expect(screen.getByText('問題文は必須です')).toBeInTheDocument();
    });
});
