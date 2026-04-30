import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { destroy, edit, index as testsIndex } from '@/routes/tests';
import { index as questionsIndex } from '@/routes/tests/questions';
import { type BreadcrumbItem, type Question, type Test } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

interface Props {
    test: Test & { questions: Question[] };
}

export default function Show({ test }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'テスト一覧', href: testsIndex().url },
        { title: test.title, href: '' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={test.title} />
            <div className='max-w-2xl p-6'>
                <div className='mb-6 flex items-center justify-between'>
                    <h1 className='text-2xl font-bold'>{test.title}</h1>
                    <div className='flex gap-2'>
                        <Link
                            href={edit(test).url}
                            className='inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-muted'
                        >
                            編集
                        </Link>
                        <Button
                            variant='destructive'
                            size='sm'
                            onClick={() => {
                                if (confirm('このテストを削除しますか？')) {
                                    router.delete(destroy(test).url);
                                }
                            }}
                        >
                            削除
                        </Button>
                    </div>
                </div>

                <dl className='mb-8 space-y-2 text-sm'>
                    <div className='flex gap-2'>
                        <dt className='w-24 text-muted-foreground'>説明</dt>
                        <dd>{test.description ?? '—'}</dd>
                    </div>
                    <div className='flex gap-2'>
                        <dt className='w-24 text-muted-foreground'>科目</dt>
                        <dd>{test.subject ?? '—'}</dd>
                    </div>
                    <div className='flex gap-2'>
                        <dt className='w-24 text-muted-foreground'>難易度</dt>
                        <dd>{test.difficulty}</dd>
                    </div>
                    <div className='flex gap-2'>
                        <dt className='w-24 text-muted-foreground'>
                            ステータス
                        </dt>
                        <dd>{test.status}</dd>
                    </div>
                    <div className='flex gap-2'>
                        <dt className='w-24 text-muted-foreground'>出力言語</dt>
                        <dd>{test.output_language}</dd>
                    </div>
                </dl>
                <div className='mb-3 flex items-center justify-between'>
                    <h2 className='text-lg font-semibold'>質問一覧</h2>
                    <Link
                        href={questionsIndex(test).url}
                        className='text-sm hover:underline'
                    >
                        問題を管理する
                    </Link>
                </div>
                {test.questions.length === 0 ? (
                    <p className='text-sm text-muted-foreground'>
                        質問がまだありません。
                    </p>
                ) : (
                    <ul className='space-y-2'>
                        {test.questions.map((question, index) => (
                            <li
                                key={question.id}
                                className='rounded-md border p-4 text-sm'
                            >
                                <p className='font-medium'>
                                    Q{index + 1}. {question.question_text}
                                </p>
                                <p className='mt-1 text-muted-foreground'>
                                    {question.question_type}・難易度:{' '}
                                    {question.difficulty ?? '—'}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </AppLayout>
    );
}
