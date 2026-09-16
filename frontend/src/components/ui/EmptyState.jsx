import { cn } from '@/lib/utils';

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
    ...props
}) {
    return (
        <div className={cn(
            'empty-state',
            className
        )}>
            <div className="w-12 h-12 rounded-md flex items-center justify-center mb-3 bg-border opacity-30">
                {icon}
            </div>

            <h3 className="empty-state-title">{title}</h3>

            <p className="empty-state-description">{description}</p>

            {action && (
                <div className="empty-state-action">
                    <span className="icon"><CheckCircle className="h-4 w-4 text-primary" /></span>
                    <span>{action.label}</span>
                </div>
            )}
        </div>
    );
}