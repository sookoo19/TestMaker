import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { destroy, edit } from '@/routes/questions';
import { show as testShow, index as testsIndex } from '@/routes/tests';
import { type BreadcrumbItem, type Question, type QuestionChoice } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

interface Props {
    question: Question & { test: { id: number; title: string } };
    choices: QuestionChoice[];
}

export default function Show({ question, choices }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'テスト一覧', href: testsIndex().url },
        { title: question.test.title, href: testShow(question.test).url },
        { title: question.question_text, href: '' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={question.question_text} />
            <div className='max-w-2xl p-6'>
                <div className='mb-6 flex items-center justify-between'>
                    <h1 className='text-2xl font-bold'>
                        {question.question_text}
                    </h1>
                    <div className='flex gap-2'>
                        <Link
                            href={edit(question).url}
                            className='inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-muted'
                        >
                            編集
                        </Link>
                        <Button
                            variant='destructive'
                            size='sm'
                            onClick={() => {
                                if (confirm('この問題を消去しますか？')) {
                                    router.delete(destroy(question).url);
                                }
                            }}
                        >
                            削除
                        </Button>
                    </div>
                </div>
                <dl className='space-y-2 text-sm'>
                    <div className='flex gap-2'>
                        <dt className='w-24 text-muted-foreground'>問題形式</dt>
                        <dd>{question.question_type}</dd>
                    </div>
                    <div className='flex gap-2'>
                        <dt className='w-24 text-muted-foreground'>難易度</dt>
                        <dd>{question.difficulty ?? '—'}</dd>
                    </div>
                    <div className='flex gap-2'>
                        <dt className='w-24 text-muted-foreground'>正解</dt>
                        <dd>{question.correct_answer}</dd>
                    </div>
                    <div className='flex gap-2'>
                        <dt className='w-24 text-muted-foreground'>解説</dt>
                        <dd>{question.explanation ?? '—'}</dd>
                    </div>
                    <div className='flex gap-2'>
                        <dt className='w-24 text-muted-foreground'>順番</dt>
                        <dd>{question.sort_order}</dd>
                    </div>
                </dl>

                {choices.length > 0 && (
                    <div className='mt-6'>
                        <h2 className='mb-2 text-sm font-medium text-muted-foreground'>
                            選択肢
                        </h2>
                        <ul className='space-y-1'>
                            {choices.map((choice) => (
                                <li
                                    key={choice.id}
                                    className='flex items-center gap-2 text-sm'
                                >
                                    <span
                                        className={
                                            choice.is_correct
                                                ? 'font-medium text-green-600'
                                                : ''
                                        }
                                    >
                                        {choice.choice_text}
                                    </span>
                                    {choice.is_correct && (
                                        <span className='text-xs text-green-600'>
                                            ✓ 正解
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
