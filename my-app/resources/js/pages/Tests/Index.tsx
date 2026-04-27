import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { create, show, index as testsIndex } from '@/routes/tests';
import { type BreadcrumbItem, type Test } from '@/types';
import { Head, Link } from '@inertiajs/react';
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'テスト一覧',
        href: testsIndex().url,
    },
];

interface Props {
    tests: Test[];
}

export default function Index({ tests }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title='テスト一覧' />
            <div className='p-6'>
                <div className='mb-6 flex items-center justify-between'>
                    <h1 className='text-2xl font-bold'>テスト一覧</h1>
                    <Link
                        href={create().url}
                        className='inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90'
                    >
                        テスト作成
                    </Link>
                </div>
                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    {tests.map((test) => (
                        <Link key={test.id} href={show(test).url}>
                            <Card className='transition-colors hover:bg-muted/50'>
                                <CardHeader className='pb-2'>
                                    <div className='items-strat flex justify-between'>
                                        <CardTitle className='text-base'>
                                            {test.title}
                                        </CardTitle>
                                        <Badge variant='outline'>
                                            {test.status}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className='text-sm text-muted-foreground'>
                                    <p>
                                        {test.subject}・難易度:{' '}
                                        {test.difficulty}
                                    </p>
                                    <p className='mt-1'>
                                        {test.created_at.slice(0, 10)}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
                {tests.length === 0 && (
                    <p className='text-sm text-muted-foreground'>
                        テストがまだありません。「テスト作成」から作成してください。
                    </p>
                )}
            </div>
        </AppLayout>
    );
}
