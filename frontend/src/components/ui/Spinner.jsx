import { cn } from '@/lib/utils';

export function Spinner({
    size = 24,
    className,
    ...props
}) {
    return (
        <svg
            className={cn(
                'size-full rounded-full border-2 border-border-primary-300 border-t-primary-600 animate-spin',
                size > 24 && `size-${size}`
            )}
            viewBox="0 0 24 24"
            {...props}
        >
            <path
                className="size-full rotate-90"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15l2-2m0 0l-2-2m2 2l2-2m2 2l2-2m-2 2l-2-2"
            />
        </svg>
    );
}