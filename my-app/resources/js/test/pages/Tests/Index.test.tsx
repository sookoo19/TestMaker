import Index from '@/pages/Tests/Index';
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
    create: () => ({ url: '/tests/create' }),
    show: (test: { id: number }) => ({ url: `/tests/${test.id}` }),
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

describe('Tests/Index', () => {
    it('テスト一覧を表示する', () => {
        render(<Index tests={[baseTest]} />);
        expect(screen.getByText('サンプルテスト')).toBeInTheDocument();
    });

    it('テストが空のとき案内文を表示する', () => {
        render(<Index tests={[]} />);
        expect(screen.getByText(/テストがまだありません/)).toBeInTheDocument();
    });
});
