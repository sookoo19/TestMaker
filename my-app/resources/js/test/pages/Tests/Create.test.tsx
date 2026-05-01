import Create from '@/pages/Tests/Create';
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
    index: () => ({ url: '/tests' }),
    store: { form: () => ({ action: '/tests', method: 'post' }) },
}));

describe('Tests/Create', () => {
    it('フォームフィールドを表示する', () => {
        render(<Create />);
        expect(screen.getByLabelText('タイトル')).toBeInTheDocument();
        expect(screen.getByLabelText('説明')).toBeInTheDocument();
        expect(screen.getByLabelText('科目')).toBeInTheDocument();
        expect(screen.getByLabelText('難易度')).toBeInTheDocument();
        expect(screen.getByLabelText('出力言語')).toBeInTheDocument();
    });

    it('タイトルを入力できる', async () => {
        render(<Create />);
        await userEvent.type(screen.getByLabelText('タイトル'), 'テスト入力');
        expect(screen.getByDisplayValue('テスト入力')).toBeInTheDocument();
    });

    it('バリデーションエラーを表示する', async () => {
        const { Form } = await import('@inertiajs/react');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Form as any).mockImplementationOnce(({ children }: any) => (
            <form>{children({ processing: false, errors: { title: 'タイトルは必須です' } })}</form>
        ));
        render(<Create />);
        expect(screen.getByText('タイトルは必須です')).toBeInTheDocument();
    });

    it('送信中はボタンが disabled になる', async () => {
        const { Form } = await import('@inertiajs/react');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (Form as any).mockImplementationOnce(({ children }: any) => (
            <form>{children({ processing: true, errors: {} })}</form>
        ));
        render(<Create />);
        expect(screen.getByRole('button', { name: '作成' })).toBeDisabled();
    });
});
