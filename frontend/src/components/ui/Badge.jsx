import { cn } from '@/lib/utils';

export function Badge({
    children,
    color = 'soft',
    size = 'sm',
    ...props
}) {
    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-3 py-1 text-sm',
        lg: 'px-4 py-1.5 text-base',
    };

    const colors = {
        primary: 'bg-primary-100 text-primary-600',
        success: 'bg-success-100 text-success-700',
        warning: 'bg-warning-100 text-warning-700',
        error: 'bg-error-100 text-error-700',
        soft: 'bg-border text-primary-500/20',
    };

    return (
        <span className={cn(
            `inline-flex items-center rounded-full`,
            sizes[size],
            colors[color],
            'gap-1.5 align-baseline',
            ...props
        )}>
            {children}
        </span>
    );
}