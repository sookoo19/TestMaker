import Create from '@/pages/Questions/Create';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const { mockSetData, mockUseForm } = vi.hoisted(() => {
    const mockSetData = vi.fn();
    const mockUseForm = vi.fn(() => ({
        data: {
            question_type: '',
            question_text: '',
            correct_answer: '',
            explanation: '',
            difficulty: '',
            sort_order: 1,
            choices: [],
        },
        setData: mockSetData,
        transform: vi.fn(),
        post: vi.fn(),
        processing: false,
        errors: {},
    }));
    return { mockSetData, mockUseForm };
});

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    useForm: mockUseForm,
}));

vi.mock('@/layouts/app-layout', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/routes/tests', () => ({
    show: (test: { id: number }) => ({ url: `/tests/${test.id}` }),
}));

vi.mock('@/routes/tests/questions', () => ({
    index: (test: { id: number }) => ({ url: `/tests/${test.id}/questions` }),
    store: (test: { id: number }) => ({ url: `/tests/${test.id}/questions` }),
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
        expect(mockSetData).toHaveBeenCalledWith('question_text', expect.any(String));
    });

    it('バリデーションエラーを表示する', () => {
        mockUseForm.mockReturnValueOnce({
            data: {
                question_type: '',
                question_text: '',
                correct_answer: '',
                explanation: '',
                difficulty: '',
                sort_order: 1,
                choices: [],
            },
            setData: vi.fn(),
            transform: vi.fn(),
            post: vi.fn(),
            processing: false,
            errors: { question_text: '問題文は必須です' },
        });
        render(<Create test={baseTest} />);
        expect(screen.getByText('問題文は必須です')).toBeInTheDocument();
    });
});
