import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { store, index as testsIndex } from '@/routes/tests';
import { type BreadcrumbItem } from '@/types';
import { Form, Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'テスト一覧', href: testsIndex().url },
    { title: 'テスト作成', href: '' },
];

export default function Create() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="テスト作成" />
            <div className="max-w-xl p-6">
                <h1 className="mb-6 text-2xl font-bold">テスト作成</h1>
                <Form {...store.form()} className="space-y-4">
                    {({ processing, errors }) => (
                        <>
                            <div>
                                <Label htmlFor="title">タイトル</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    type="text"
                                    className="mt-1"
                                />
                                {errors.title && (
                                    <p className="mt-1 text-sm text-destructive">
                                        {errors.title}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="description">説明</Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={3}
                                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                />
                                {errors.description && (
                                    <p className="mt-1 text-sm text-destructive">
                                        {errors.description}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="subject">科目</Label>
                                <Input
                                    id="subject"
                                    name="subject"
                                    type="text"
                                    className="mt-1"
                                />
                                {errors.subject && (
                                    <p className="mt-1 text-sm text-destructive">
                                        {errors.subject}
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="difficulty">難易度</Label>
                                <select
                                    id="difficulty"
                                    name="difficulty"
                                    defaultValue=""
                                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="" disabled>
                                        選択してください
                                    </option>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                                {errors.difficulty && (
                                    <p className="mt-1 text-sm text-destructive">
                                        {errors.difficulty}
                                    </p>
                                )}
                            </div>
                            <input type="hidden" name="status" value="draft" />
                            <div>
                                <Label htmlFor="output_language">
                                    出力言語
                                </Label>
                                <select
                                    id="output_language"
                                    name="output_language"
                                    defaultValue="ja"
                                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                >
                                    <option value="ja">日本語</option>
                                    <option value="en">English</option>
                                </select>
                                {errors.output_language && (
                                    <p className="mt-1 text-sm text-destructive">
                                        {errors.output_language}
                                    </p>
                                )}
                            </div>
                            <Button type="submit" disabled={processing}>
                                作成
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </AppLayout>
    );
}
