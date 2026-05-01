import Create from '@/pages/Questions/Create';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Form: vi.fn(({
        children,
    }: {
        children: (props: {
            processing: boolean;
            errors: Record<string, string>;
        }) => React.ReactNode;
    }) => <form>{children({ processing: false, errors: {} })}</form>),
}));

vi.mock('@/layouts/app-layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/routes/tests', () => ({
    show: (test: { id: number }) => ({ url: `/tests/${test.id}` }),
}));

vi.mock('@/routes/tests/questions', () => ({
    index: (test: { id: number }) => ({ url: `/tests/${test.id}/questions` }),
    store: { form: (test: { id: number }) => ({ action: `/tests/${test.id}/questions`, method: 'post' }) },
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

describe('Questions/Create', () => {
    it('フォームフィールドを表示する', () => {
        render(<Create test={baseTest} />);
        expect(screen.getByLabelText('問題形式')).toBeInTheDocument();
        expect(screen.getByLabelText('問題文')).toBeInTheDocument();
        expect(screen.getByLabelText('答え')).toBeInTheDocument();
        expect(screen.getByLabelText('解説')).toBeInTheDocument();
        expect(screen.getByLabelText('難易度')).toBeInTheDocument();
    });

    it('問題文を入力できる', async () => {
        render(<Create test={baseTest} />);
        await userEvent.type(screen.getByLabelText('問題文'), '1+1は？');
        expect(screen.getByDisplayValue('1+1は？')).toBeInTheDocument();
    });

    it('バリデーションエラーを表示する', async () => {
        const { Form } = await import('@inertiajs/react');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Form as any).mockImplementationOnce(({ children }: any) => (
            <form>{children({ processing: false, errors: { question_text: '問題文は必須です' } })}</form>
        ));
        render(<Create test={baseTest} />);
        expect(screen.getByText('問題文は必須です')).toBeInTheDocument();
    });
});
