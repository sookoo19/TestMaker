import Edit from '@/pages/Tests/Edit';
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
    show: (test: { id: number }) => ({ url: `/tests/${test.id}` }),
    update: {
        form: (test: { id: number }) => ({
            action: `/tests/${test.id}`,
            method: 'put',
        }),
    },
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
};

describe('Tests/Edit', () => {
    it('既存値がフォームに表示される', () => {
        render(<Edit test={baseTest} />);
        expect(screen.getByDisplayValue('サンプルテスト')).toBeInTheDocument();
        expect(screen.getByDisplayValue('テストの説明')).toBeInTheDocument();
        expect(screen.getByDisplayValue('数学')).toBeInTheDocument();
    });

    it('フォームフィールドを表示する', () => {
        render(<Edit test={baseTest} />);
        expect(screen.getByLabelText('タイトル')).toBeInTheDocument();
        expect(screen.getByLabelText('難易度')).toBeInTheDocument();
        expect(screen.getByLabelText('出力言語')).toBeInTheDocument();
    });
});
