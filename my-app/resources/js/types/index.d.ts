import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

export interface Test {
    id: number;
    title: string;
    description: string | null;
    subject: string | null;
    difficulty: string | null;
    status: string;
    output_language: string | null;
    created_at: string;
    updated_at: string;
}

export interface Question {
    id: number;
    question_type: string;
    question_text: string;
    correct_answer: string;
    explanation: string | null;
    difficulty: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}
