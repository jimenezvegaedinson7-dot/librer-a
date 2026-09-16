import { cn } from '@/lib/utils';

export default function Card({
    className,
    header,
    ...props
}) {
    return (
        <div
            className={cn(
                'rounded-lg border border-border bg-card shadow-sm',
                className
            )}
            {...props}
        >
            {header &&
                <div className="card-header">
                    {header}
                </div>
            }
        </div>
    );
}