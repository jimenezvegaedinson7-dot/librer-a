import { cn } from '@/lib/utils';

export function Breadcrumbs({
    items,
    separator = '>',
    className,
    ...props
}) {
    return (
        <nav className={cn('flex space-x-1', className)} {...props}>
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <Fragment key={item.to}>
                        {isLast ? (
                            <span className="text-sm text-secondary">{item.label}</span>
                        ) : (
                            <a
                                href={item.href}
                                className="text-secondary hover:text-primary transition-colors text-sm"
                            >
                                {item.label}
                            </a>
                        )}
                    </Fragment>
                );
            })}
            {items.length > 1 && (
                <span className="text-xs text-muted-foreground/50">{separator}</span>
            )}
        </nav>
    );
}