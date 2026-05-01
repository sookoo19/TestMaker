import Create from '@/pages/Tests/Create';
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

    it('バリデーションエラーを表示する', () => {
        vi.mock('@inertiajs/react', () => ({
            Head: () => null,
            Form: ({
                children,
            }: {
                children: (props: {
                    processing: boolean;
                    errors: Record<string, string>;
                }) => React.ReactNode;
            }) => (
                <form>
                    {children({
                        processing: false,
                        errors: { title: 'タイトルは必須です' },
                    })}
                </form>
            ),
        }));
        render(<Create />);
        expect(screen.getByText('タイトルは必須です')).toBeInTheDocument();
    });
});
