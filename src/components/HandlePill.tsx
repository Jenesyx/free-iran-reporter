import { formatHandle } from '@/lib/instagram';

interface HandlePillProps {
    handle: string;
}

export default function HandlePill({ handle }: HandlePillProps) {
    return (
        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-purple-900/60 to-pink-900/60 text-purple-200 border border-purple-700/30 hover:from-purple-800/70 hover:to-pink-800/70 transition-colors cursor-default select-all">
            {formatHandle(handle)}
        </span>
    );
}
