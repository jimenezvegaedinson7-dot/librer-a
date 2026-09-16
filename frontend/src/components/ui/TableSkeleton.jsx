import { cn } from '@/lib/utils';

export function TableSkeleton({
    rows = 5,
    columns = 3,
    className,
    ...props
}) {
    return (
        <div className={cn(
            'space-y-2',
            className
        )}>
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="skeleton grid grid-cols-3 gap-2 h-6">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div key={colIndex} className="rounded-sm h-full bg-surface/20 animate-shimmer w-full" />
                    ))}
                ))}
            </div>
        </div>
    );
}