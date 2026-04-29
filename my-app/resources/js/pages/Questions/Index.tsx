import AppLayout from '@/layouts/app-layout';
import { show } from '@/routes/questions';
import { show as testShow } from '@/routes/tests';
import { create } from '@/routes/tests/questions';
import { type BreadcrumbItem, type Question, type Test } from '@/types';
import { Head, Link } from '@inertiajs/react';

interface Props {
    test: Test;
    questions: Question[];
}

export default function Index({ test, questions }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'テスト一覧', href: testShow(test).url },
        { title: test.title, href: testShow(test).url },
        { title: '問題一覧', href: '' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title='問題一覧' />
            <div className='max-w-2xl p-6'>
                <div className='mb-6 flex items-center justify-between'>
                    <h1 className='text-2xl font-bold'>問題一覧</h1>
                    <Link
                        href={create(test).url}
                        className='inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-muted'
                    >
                        問題を追加
                    </Link>
                </div>
                {questions.length === 0 ? (
                    <p className='text-muted-foregruond text-sm'>
                        問題がまだありません
                    </p>
                ) : (
                    <ul className='space-y-2'>
                        {questions.map((question, index) => (
                            <li
                                key={question.id}
                                className='rounded-md border p-4 text-sm'
                            >
                                <Link
                                    href={show(question).url}
                                    className='font-medium hover:underline'
                                >
                                    Q{index + 1}. {question.question_text}
                                </Link>
                                <p className='mt-1 text-muted-foreground'>
                                    {question.question_type}・難易度:
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
