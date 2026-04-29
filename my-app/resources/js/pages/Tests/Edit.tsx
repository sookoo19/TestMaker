import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { show, index as testsIndex, update } from '@/routes/tests';
import { type BreadcrumbItem, type Test } from '@/types';
import { Form, Head } from '@inertiajs/react';

interface Props {
    test: Test;
}

export default function Edit({ test }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'テスト一覧', href: testsIndex().url },
        { title: test.title, href: show(test).url },
        { title: '編集', href: '' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title='テスト編集' />
            <div className='max-w-xl p-6'>
                <h1 className='mb-6 text-2xl font-bold'>テスト編集</h1>
                <Form {...update.form(test)} className='space-y-4'>
                    {({ processing, errors }) => (
                        <>
                            <div>
                                <Label htmlFor='title'>タイトル</Label>
                                <Input
                                    id='title'
                                    name='title'
                                    type='text'
                                    defaultValue={test.title}
                                    className='mt-1'
                                />
                                {errors.title && (
                                    <p className='mt-1 text-sm text-destructive'>
                                        {errors.title}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor='description'>説明</Label>
                                <textarea
                                    id='description'
                                    name='description'
                                    rows={3}
                                    defaultValue={test.description ?? ''}
                                    className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                                />
                                {errors.description && (
                                    <p className='mt-1 text-sm text-destructive'>
                                        {errors.description}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor='subject'>科目</Label>
                                <Input
                                    id='subject'
                                    name='subject'
                                    type='text'
                                    defaultValue={test.subject ?? ''}
                                    className='mt-1'
                                />
                                {errors.subject && (
                                    <p className='mt-1 text-sm text-destructive'>
                                        {errors.subject}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor='difficulty'>難易度</Label>
                                <select
                                    id='difficulty'
                                    name='difficulty'
                                    defaultValue={test.difficulty ?? ''}
                                    className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                                >
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
                            <div>
                                <Label htmlFor='output_language'>
                                    出力言語
                                </Label>
                                <select
                                    id='output_language'
                                    name='output_language'
                                    defaultValue={test.output_language ?? ''}
                                    className='mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                                >
                                    <option value='ja'>日本語</option>
                                    <option value='en'>English</option>
                                </select>
                                {errors.output_language && (
                                    <p className='mt-1 text-sm text-destructive'>
                                        {errors.output_language}
                                    </p>
                                )}
                            </div>
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
