import { reorder } from '@/actions/App/Http/Controllers/QuestionController';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { show } from '@/routes/questions';
import { show as testShow, index as testsIndex } from '@/routes/tests';
import { create } from '@/routes/tests/questions';
import { type BreadcrumbItem, type Question, type Test } from '@/types';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    test: Test;
    questions: Question[];
}

function SortableItem({
    question,
    index,
}: {
    question: Question;
    index: number;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } =
        useSortable({ id: question.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <li
            ref={setNodeRef}
            style={style}
            className='rounded-md border p-4 text-sm'
        >
            <div className='flex items-start gap-2'>
                <span
                    {...attributes}
                    {...listeners}
                    aria-label='ドラッグして並び替え'
                    className='mt-0.5 cursor-grab text-muted-foreground select-none'
                >
                    <span aria-hidden='true'>⠿</span>
                </span>
                <div>
                    <Link
                        href={show(question).url}
                        className='font-medium hover:underline'
                    >
                        Q{index + 1}. {question.question_text}
                    </Link>
                    <p className='mt-1 text-muted-foreground'>
                        {question.question_type}・難易度:{' '}
                        {question.difficulty ?? '—'}
                    </p>
                </div>
            </div>
        </li>
    );
}

export default function Index({ test, questions }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'テスト一覧', href: testsIndex().url },
        { title: test.title, href: testShow(test).url },
        { title: '問題一覧', href: '' },
    ];

    const [items, setItems] = useState(questions);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        setItems((prev) => {
            const oldIndex = prev.findIndex((q) => q.id === active.id);
            const newIndex = prev.findIndex((q) => q.id === over.id);
            return arrayMove(prev, oldIndex, newIndex);
        });
        setIsDirty(true);
    };

    const handleReorder = () => {
        setIsSaving(true);
        router.patch(
            reorder(test).url,
            { ids: items.map((q) => q.id) },
            {
                onSuccess: () => setIsDirty(false),
                onFinish: () => setIsSaving(false),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title='問題一覧' />
            <div className='max-w-2xl p-6'>
                <div className='mb-6 flex items-center justify-between'>
                    <h1 className='text-2xl font-bold'>問題一覧</h1>
                    <div className='flex gap-2'>
                        {isDirty && (
                            <Button size='sm' onClick={handleReorder} disabled={isSaving}>
                                {isSaving ? '保存中…' : '順番を保存'}
                            </Button>
                        )}
                        <Link
                            href={create(test).url}
                            className='inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-muted'
                        >
                            問題を追加
                        </Link>
                    </div>
                </div>
                {items.length === 0 ? (
                    <p className='text-sm text-muted-foreground'>
                        問題がまだありません
                    </p>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={items.map((q) => q.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <ul className='space-y-2'>
                                {items.map((question, index) => (
                                    <SortableItem
                                        key={question.id}
                                        question={question}
                                        index={index}
                                    />
                                ))}
                            </ul>
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </AppLayout>
    );
}
