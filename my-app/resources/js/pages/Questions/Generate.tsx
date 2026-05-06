import {
    batchStore,
    generate,
} from '@/actions/App/Http/Controllers/QuestionController';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { index as testsIndex, show as testShow } from '@/routes/tests';
import { index as questionsIndex } from '@/routes/tests/questions';
import { type BreadcrumbItem, type Test } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface Choice {
    choice_text: string;
    is_correct: boolean;
}

interface GeneratedQuestion {
    question_type: string;
    question_text: string;
    correct_answer: string;
    explanation: string;
    difficulty: string;
    sort_order: number;
    choices?: Choice[];
}

interface Props {
    test: Test;
}

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export default function Generate({ test }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'テスト一覧', href: testsIndex().url },
        { title: test.title, href: testShow(test).url },
        { title: '問題一覧', href: questionsIndex(test).url },
        { title: 'AI問題生成', href: '' },
    ];

    const [phase, setPhase] = useState<'form' | 'preview'>('form');
    const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [inputType, setInputType] = useState<'text' | 'image'>('text');
    const [topic, setTopic] = useState('');
    const [images, setImages] = useState<File[]>([]);
    const [count, setCount] = useState(3);
    const [difficulty, setDifficulty] = useState('medium');
    const [questionType, setQuestionType] = useState('choice');

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (inputType === 'text' && !topic.trim()) {
            setError('テーマを入力してください');
            return;
        }
        if (inputType === 'image' && images.length === 0) {
            setError('画像を1枚以上選択してください');
            return;
        }

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('input_type', inputType);
        if (inputType === 'text') {
            formData.append('topic', topic);
        } else {
            images.forEach((img) => formData.append('images[]', img));
        }
        formData.append('count', String(count));
        formData.append('difficulty', difficulty);
        formData.append('question_type', questionType);

        try {
            const res = await fetch(generate(test).url, {
                method: 'POST',
                headers: { 'X-XSRF-TOKEN': getCsrfToken() },
                body: formData,
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? json.message ?? 'エラーが発生しました');
            setQuestions(json.questions);
            setPhase('preview');
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'エラーが発生しました',
            );
        } finally {
            setLoading(false);
        }
    };

    const handleBatchStore = () => {
        // Inertia の型制約（FormDataConvertible）を回避するためプレーンオブジェクト化
        router.post(batchStore(test).url, JSON.parse(JSON.stringify({ questions })));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title='AI問題生成' />
            <div className='max-w-xl p-6'>
                <h1 className='mb-6 text-2xl font-bold'>AI問題生成</h1>

                {phase === 'form' && (
                    <form onSubmit={handleGenerate} className='space-y-4'>
                        <div>
                            <Label htmlFor='input_type'>入力方法</Label>
                            <select
                                id='input_type'
                                value={inputType}
                                onChange={(e) =>
                                    setInputType(
                                        e.target.value as 'text' | 'image',
                                    )
                                }
                                className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                            >
                                <option value='text'>テキスト</option>
                                <option value='image'>画像</option>
                            </select>
                        </div>

                        {inputType === 'text' ? (
                            <div>
                                <Label htmlFor='topic'>テーマ</Label>
                                <input
                                    id='topic'
                                    type='text'
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                                />
                            </div>
                        ) : (
                            <div>
                                <Label htmlFor='images'>画像</Label>
                                <input
                                    id='images'
                                    type='file'
                                    accept='image/jpeg,image/png'
                                    multiple
                                    onChange={(e) =>
                                        setImages(
                                            Array.from(e.target.files ?? []),
                                        )
                                    }
                                    className='mt-1 w-full text-sm'
                                />
                            </div>
                        )}

                        <div>
                            <Label htmlFor='count'>問題数</Label>
                            <input
                                id='count'
                                type='number'
                                inputMode='numeric'
                                min={1}
                                max={10}
                                value={count}
                                onChange={(e) =>
                                    setCount(Number(e.target.value))
                                }
                                className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                            />
                        </div>

                        <div>
                            <Label htmlFor='difficulty'>難易度</Label>
                            <select
                                id='difficulty'
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                                className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                            >
                                <option value='easy'>Easy</option>
                                <option value='medium'>Medium</option>
                                <option value='hard'>Hard</option>
                            </select>
                        </div>

                        <div>
                            <Label htmlFor='question_type'>問題形式</Label>
                            <select
                                id='question_type'
                                value={questionType}
                                onChange={(e) =>
                                    setQuestionType(e.target.value)
                                }
                                className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                            >
                                <option value='descriptive'>記述式</option>
                                <option value='choice'>選択式</option>
                                <option value='fill_blank'>穴埋め</option>
                                <option value='ordering'>並び替え</option>
                            </select>
                        </div>

                        {error && (
                            <p aria-live='polite' className='text-sm text-destructive'>{error}</p>
                        )}

                        <Button type='submit' disabled={loading}>
                            {loading ? '生成中…' : '生成する'}
                        </Button>
                    </form>
                )}
                {phase === 'preview' && (
                    <div className='space-y-4'>
                        <h2 className='text-lg font-semibold'>
                            生成結果（{questions.length}問）
                        </h2>

                        <ul className='space-y-4'>
                            {questions.map((q, i) => (
                                <li
                                    key={i}
                                    className='rounded-md border border-input p-4 text-sm'
                                >
                                    <p className='font-medium'>
                                        {i + 1}. {q.question_text}
                                    </p>
                                    <p className='mt-1 text-muted-foreground'>
                                        答え: {q.correct_answer}
                                    </p>
                                    {q.explanation && (
                                        <p className='mt-1 text-muted-foreground'>
                                            解説: {q.explanation}
                                        </p>
                                    )}
                                    {q.choices && q.choices.length > 0 && (
                                        <ul className='mt-2 space-y-1'>
                                            {q.choices.map((c, j) => (
                                                <li
                                                    key={j}
                                                    className={
                                                        c.is_correct
                                                            ? 'font-semibold'
                                                            : ''
                                                    }
                                                >
                                                    {c.choice_text}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </li>
                            ))}
                        </ul>

                        <div className='flex gap-2'>
                            <Button
                                variant='outline'
                                onClick={() => setPhase('form')}
                            >
                                やり直す
                            </Button>
                            <Button onClick={handleBatchStore}>保存する</Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
