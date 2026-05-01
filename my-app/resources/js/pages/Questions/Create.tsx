import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { show as testShow } from '@/routes/tests';
import { index as questionsIndex, store } from '@/routes/tests/questions';
import { type BreadcrumbItem, type Test } from '@/types';
import { Head, useForm } from '@inertiajs/react';

interface Choice {
    choice_text: string;
    is_correct: boolean;
}

interface Props {
    test: Test;
}

export default function Create({ test }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'テスト一覧', href: testShow(test).url },
        { title: test.title, href: testShow(test).url },
        { title: '質問一覧', href: questionsIndex(test).url },
        { title: '質問作成', href: '' },
    ];

    const { data, setData, transform, post, processing, errors } = useForm({
        question_type: '',
        question_text: '',
        correct_answer: '',
        explanation: '',
        difficulty: '',
        sort_order: 1,
        choices: [] as Choice[],
    });

    const addChoice = () => {
        setData('choices', [
            ...data.choices,
            { choice_text: '', is_correct: false },
        ]);
    };

    const removeChoice = (index: number) => {
        setData(
            'choices',
            data.choices.filter((_, i) => i !== index),
        );
    };

    const toggleCorrect = (index: number) => {
        setData(
            'choices',
            data.choices.map((c, i) => ({ ...c, is_correct: i === index })),
        );
    };

    const updateChoiceText = (index: number, text: string) => {
        setData(
            'choices',
            data.choices.map((c, i) =>
                i === index ? { ...c, choice_text: text } : c,
            ),
        );
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        transform((d) => ({
            ...d,
            correct_answer:
                d.question_type === 'choice'
                    ? (d.choices.find((c) => c.is_correct)?.choice_text ?? '')
                    : d.correct_answer,
        }));
        post(store(test).url);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title='質問作成' />
            <div className='max-w-xl p-6'>
                <h1 className='mb-6 text-2xl font-bold'>質問作成</h1>
                <form onSubmit={submit} className='space-y-4'>
                    <div>
                        <Label htmlFor='question_type'>問題形式</Label>
                        <select
                            id='question_type'
                            value={data.question_type}
                            onChange={(e) =>
                                setData('question_type', e.target.value)
                            }
                            className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                        >
                            <option value='' disabled>
                                選択してください
                            </option>
                            <option value='descriptive'>記述式</option>
                            <option value='choice'>選択式</option>
                            <option value='fill_blank'>穴埋め</option>
                            <option value='ordering'>並び替え</option>
                        </select>
                        {errors.question_type && (
                            <p className='mt-1 text-sm text-destructive'>
                                {errors.question_type}
                            </p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor='question_text'>問題文</Label>
                        <textarea
                            id='question_text'
                            value={data.question_text}
                            onChange={(e) =>
                                setData('question_text', e.target.value)
                            }
                            rows={3}
                            className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                        />
                        {errors.question_text && (
                            <p className='mt-1 text-sm text-destructive'>
                                {errors.question_text}
                            </p>
                        )}
                    </div>
                    {data.question_type !== 'choice' && (
                        <div>
                            <Label htmlFor='correct_answer'>答え</Label>
                            <textarea
                                id='correct_answer'
                                value={data.correct_answer}
                                onChange={(e) =>
                                    setData('correct_answer', e.target.value)
                                }
                                rows={2}
                                className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                            />
                            {errors.correct_answer && (
                                <p className='mt-1 text-sm text-destructive'>
                                    {errors.correct_answer}
                                </p>
                            )}
                        </div>
                    )}
                    <div>
                        <Label htmlFor='explanation'>解説</Label>
                        <textarea
                            id='explanation'
                            value={data.explanation}
                            onChange={(e) =>
                                setData('explanation', e.target.value)
                            }
                            rows={2}
                            className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                        />
                        {errors.explanation && (
                            <p className='mt-1 text-sm text-destructive'>
                                {errors.explanation}
                            </p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor='difficulty'>難易度</Label>
                        <select
                            id='difficulty'
                            value={data.difficulty}
                            onChange={(e) =>
                                setData('difficulty', e.target.value)
                            }
                            className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                        >
                            <option value='' disabled>
                                選択してください
                            </option>
                            <option value='easy'>Easy</option>
                            <option value='medium'>Medium</option>
                            <option value='hard'>Hard</option>
                        </select>
                        {errors.difficulty && (
                            <p className='mt-1 text-sm text-destructive'>
                                {errors.difficulty}
                            </p>
                        )}
                    </div>

                    {data.question_type === 'choice' && (
                        <div>
                            <Label>選択肢</Label>
                            <ul className='mt-2 space-y-2'>
                                {data.choices.map((choice, index) => (
                                    <li
                                        key={index}
                                        className='flex items-center gap-2'
                                    >
                                        <input
                                            type='text'
                                            value={choice.choice_text}
                                            onChange={(e) =>
                                                updateChoiceText(
                                                    index,
                                                    e.target.value,
                                                )
                                            }
                                            placeholder={`選択肢 ${index + 1}`}
                                            className='flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm'
                                        />
                                        <Button
                                            type='button'
                                            variant={
                                                choice.is_correct
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            size='sm'
                                            onClick={() => toggleCorrect(index)}
                                        >
                                            正解
                                        </Button>
                                        <Button
                                            type='button'
                                            variant='ghost'
                                            size='sm'
                                            onClick={() => removeChoice(index)}
                                        >
                                            削除
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                className='mt-2'
                                onClick={addChoice}
                            >
                                + 選択肢を追加
                            </Button>
                        </div>
                    )}

                    <Button type='submit' disabled={processing}>
                        作成
                    </Button>
                </form>
            </div>
        </AppLayout>
    );
}
