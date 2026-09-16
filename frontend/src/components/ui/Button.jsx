import { cn } from '@/lib/utils';

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    asChild = false,
    className,
    type = 'button',
    disabled,
    loading,
    ...props
}) {
    const CompoundComponent = asChild ? Slot : 'button';

    return (
        <CompoundComponent
            type={type}
            disabled={disabled}
            loading={loading}
            className={cn(
                // Base styles
                'inline-flex items-center justify-rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500/40',
                // Variants
                variant === 'primary' &&
                    'bg-primary-600 text-white hover:bg-primary-500 hover:shadow-primary-600/25 active:scale-[0.99] focus-visible:bg-primary-500 focus-visible:text-white',
                variant === 'secondary' &&
                    'bg-white text-primary-600 border border-primary-300 hover:bg-primary-50 hover:text-primary-700 focus-visible:bg-primary-100 focus-visible:text-primary-800',
                variant === 'outline' &&
                    'border-2 border-primary-400 text-primary-600 hover:bg-primary-50 hover:text-primary-700 focus-visible:bg-primary-100 focus-visible:text-primary-800',
                variant === 'danger' &&
                    'bg-red-100 text-red-600 hover:bg-red-200 focus-visible:bg-red-200 hover:text-red-700',
                variant === 'ghost' &&
                    'bg-transparent text-primary-500 hover:bg-primary-50 hover:text-primary-700 focus-visible:bg-primary-100 focus-visible:text-primary-800',
                // Sizes
                size === 'sm' && 'px-3 py-1.5 text-sm',
                size === 'md' && 'px-4 py-2.5 text-sm',
                size === 'lg' && 'px-6 py-3 text-base',
                // Additional classes
                className
            )}
        >
            {loading ? (
                <>
                    <svg
                        className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        fill="none"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 15l2-2m0 0l-2-2m2 2l2-2m2 2l2-2m-2 2l-2-2"
                        />
                    </svg>
                    {children === undefined ? 'Cargando...' : children}
                </>
            ) : (
                children
            )}
        </CompoundComponent>
    );
}