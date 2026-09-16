import { cn } from '@/lib/utils';

export function PageHeader({
    title,
    subtitle,
    className,
    ...props
}) {
    return (
        <header className={cn(
            'mb-6',
            className
        )}>
            <h1 className="text-2xl font-bold text-foreground mb-1">{title}</h1>
            {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
        </header>
    );
}