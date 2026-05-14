import AppLayout from '@/layouts/app-layout';
import { show } from '@/routes/tests';
import { type BreadcrumbItem, type Test } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { useState, useTransition } from 'react';

interface Layout {
    columns: number;
    question_spacing: string;
    answer_line_height: string;
    margin: string;
}

interface Props {
    test: Test;
    layout: Layout;
}

const LAYOUT_LABELS: Record<string, Record<string, string>> = {
    columns: { '1': '1段組', '2': '2段組' },
    question_spacing: { narrow: '狭い', normal: '普通', wide: '広い' },
    answer_line_height: { single: '1行', triple: '3行' },
    margin: { normal: '普通', wide: '広め' },
};

const LAYOUT_NAMES: Record<string, string> = {
    columns: '段組',
    question_spacing: '問題間隔',
    answer_line_height: '解答欄の高さ',
    margin: '余白',
};

type Section = 'exam' | 'answer_key';

const TABS: { id: Section; label: string }[] = [
    { id: 'exam', label: '問題用紙（解答欄付き）' },
    { id: 'answer_key', label: '解答' },
];

export default function ExcelPreview({ test, layout }: Props) {
    const [activeSection, setActiveSection] = useState<Section>('exam');
    const [isPending, startTransition] = useTransition();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'テスト一覧', href: '/tests' },
        { title: test.title, href: show(test).url },
        { title: 'Excel出力プレビュー', href: '' },
    ];

    const downloadUrl = `/tests/${test.id}/excel`;
    const imageUrl = `/tests/${test.id}/excel/image`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Excel出力プレビュー — ${test.title}`} />
            <div className='max-w-3xl p-6'>
                <h1 className='mb-1 text-2xl font-bold'>Excel出力プレビュー</h1>
                <p className='mb-6 text-sm text-muted-foreground'>{test.title}</p>

                <div className='mb-6 flex gap-6'>
                    {/* 左: レイアウト設定 */}
                    <div className='w-48 shrink-0 rounded-md border p-4'>
                        <h2 className='mb-3 text-xs font-semibold text-muted-foreground'>
                            AIが推薦したレイアウト
                        </h2>
                        <dl className='space-y-2 text-xs'>
                            {Object.entries(layout).map(([key, value]) => (
                                <div key={key}>
                                    <dt className='text-muted-foreground'>
                                        {LAYOUT_NAMES[key] ?? key}
                                    </dt>
                                    <dd className='font-medium'>
                                        {LAYOUT_LABELS[key]?.[String(value)] ?? String(value)}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>

                    {/* 右: 実際のページプレビュー */}
                    <div className='flex-1'>
                        <p className='mb-2 text-xs text-muted-foreground'>1ページ目プレビュー</p>
                        <div className='rounded border shadow-sm overflow-hidden'>
                            <div className='flex border-b bg-muted/40' role='tablist'>
                                {TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        role='tab'
                                        aria-selected={activeSection === tab.id}
                                        onClick={() => startTransition(() => setActiveSection(tab.id))}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                                            activeSection === tab.id
                                                ? 'border-primary text-primary bg-background'
                                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <iframe
                                src={`${imageUrl}?section=${activeSection}`}
                                title='Excel プレビュー'
                                className={`w-full h-[600px] border-0 motion-safe:transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}
                            />
                        </div>
                    </div>
                </div>

                <div className='flex gap-2'>
                    <a
                        href={downloadUrl}
                        className='inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
                    >
                        このレイアウトでダウンロード
                    </a>
                    <Link
                        href={show(test).url}
                        className='inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-muted'
                    >
                        戻る
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
}
