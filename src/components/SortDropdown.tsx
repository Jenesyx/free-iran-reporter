'use client';

import type { SortOption } from '@/lib/types';

interface SortDropdownProps {
    value: SortOption;
    onChange: (value: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'a-z', label: 'A–Z' },
    { value: 'z-a', label: 'Z–A' },
];

export default function SortDropdown({ value, onChange }: SortDropdownProps) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value as SortOption)}
            className="px-3 py-1.5 text-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer hover:border-purple-500/50 transition-colors"
        >
            {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
