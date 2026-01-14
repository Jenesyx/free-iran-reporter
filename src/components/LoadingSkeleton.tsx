export default function LoadingSkeleton() {
    return (
        <div className="border border-[#2a2a2a] rounded-xl bg-[#1a1a1a]/50 p-4 sm:p-6">
            {/* Header skeleton */}
            <div className="flex justify-between items-center mb-4">
                <div className="h-5 w-24 bg-[#2a2a2a] rounded animate-pulse" />
                <div className="h-9 w-24 bg-[#2a2a2a] rounded-lg animate-pulse" />
            </div>

            {/* Pills skeleton */}
            <div className="flex flex-wrap gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-8 bg-[#2a2a2a] rounded-full animate-pulse"
                        style={{ width: `${Math.random() * 60 + 80}px` }}
                    />
                ))}
            </div>
        </div>
    );
}
