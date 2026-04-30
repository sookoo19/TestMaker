import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { show as questionShow, update } from '@/routes/questions';
import { show as testShow, index as testsIndex } from '@/routes/tests';
import { type BreadcrumbItem, type Question } from '@/types';
import { Form, Head } from '@inertiajs/react';

interface Props {
    question: Question & { test: { id: number; title: string } };
}

export default function Edit({ question }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'テスト一覧', href: testsIndex().url },
        { title: question.test.title, href: testShow(question.test).url },
        { title: question.question_text, href: questionShow(question).url },
        { title: '編集', href: '' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title='質問編集' />
            <div className='max-w-xl p-6'>
                <h1 className='mb-6 text-2xl font-bold'>質問編集</h1>
                <Form {...update.form(question)} className='space-y-4'>
                    {({ processing, errors }) => (
                        <>
                            <div>
                                <Label htmlFor='question_type'>問題形式</Label>
                                <select
                                    id='question_type'
                                    name='question_type'
                                    defaultValue={question.question_type}
                                    className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                                >
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
                                    name='question_text'
                                    rows={3}
                                    defaultValue={question.question_text}
                                    className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                                />
                                {errors.question_text && (
                                    <p className='mt-1 text-sm text-destructive'>
                                        {errors.question_text}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor='correct_answer'>答え</Label>
                                <textarea
                                    id='correct_answer'
                                    name='correct_answer'
                                    rows={2}
                                    defaultValue={question.correct_answer}
                                    className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                                />
                                {errors.correct_answer && (
                                    <p className='mt-1 text-sm text-destructive'>
                                        {errors.correct_answer}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor='explanation'>解説</Label>
                                <textarea
                                    id='explanation'
                                    name='explanation'
                                    rows={2}
                                    defaultValue={question.explanation ?? ''}
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
                                    name='difficulty'
                                    defaultValue={question.difficulty ?? ''}
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
                            <input
                                type='hidden'
                                name='sort_order'
                                value={question.sort_order}
                            />
                            <Button type='submit' disabled={processing}>
                                更新
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </AppLayout>
    );
}
