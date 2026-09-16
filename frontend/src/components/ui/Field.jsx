import { cn } from '@/lib/utils';

export function Field({
    label,
    children,
    error,
    className,
    ...props
}) {
    return (
        <div className={cn('space-y-1.5', className)}>
            <label className="block text-sm font-medium text-foreground mb-1">
                {label}
            </label>
            <div className="relative">
                {children}
                {error && (
                    <p className="mt-1 text-xs text-error font-medium">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}

export function FormInput({
    type = 'text',
    placeholder,
    value,
    onChange,
    error,
    icon,
    ...props
}) {
    return (
        <Field label={label}>
            <div className="relative">
                {icon && (
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                        aria-hidden="true"
                    >
                        <use href={`#icon-${icon}`} />
                    </svg>
                )}
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className="block w-full rounded-none outline-none bg-none py-1.5 px-2.5 text-sm font-medium text-foreground placeholder-subtle transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    {...props}
                />
            </div>
            {error && (
                <p className="mt-1 text-xs text-error font-medium">
                    {error}
                </p>
            )}
        </Field>
    );
}

export function FormSelect({
    placeholder,
    value,
    onChange,
    options,
    error,
    ...props
}) {
    return (
        <Field label="Seleccionar">
            <div className="relative">
                <select
                    value={value}
                    onChange={onChange}
                    className="rounded-none outline-none bg-none w-full py-1.5 px-0 text-sm font-medium text-foreground placeholder-subtle cursor-pointer appearance-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground appearance-none"
                    {...props}
                >
                    <option value="" disabled>
                        {placeholder || 'Selecciona una opción'}
                    </option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {error && (
                    <p className="mt-1 text-xs text-error font-medium">
                        {error}
                    </p>
                )}
            </div>
        </Field>
    );
}

export function FormTextarea({
    rows = 3,
    placeholder,
    value,
    onChange,
    error,
    ...props
}) {
    return (
        <Field label="Descripción">
            <div className="relative">
                <textarea
                    rows={rows}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className="rounded-none outline-none bg-none w-full py-1.5 px-2.5 text-sm font-medium text-foreground placeholder-subtle resize-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    {...props}
                />
                {error && (
                    <p className="mt-1 text-xs text-error font-medium">
                        {error}
                    </p>
                )}
            </div>
        </Field>
    );
}