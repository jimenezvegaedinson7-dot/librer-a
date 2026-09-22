import { FaCircleExclamation } from 'react-icons/fa6';

function idDeLabel(label) {
    if (!label) return undefined;
    const base = String(label)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return base ? `campo-${base}` : undefined;
}

function Etiqueta({ label, requerido, htmlFor }) {
    if (!label) return null;
    return (
        <label htmlFor={htmlFor} className="field-label">
            {label}
            {requerido && <span className="ml-0.5 text-crimson-500" aria-hidden="true">*</span>}
        </label>
    );
}

function CampoAnimado({ children }) {
    return <div className="form-field-group">{children}</div>;
}

function MensajeError({ error, id }) {
    if (!error) return null;
    return (
        <p id={id} className="field-error" role="alert">
            <FaCircleExclamation className="mt-px shrink-0 text-xs" aria-hidden="true" />
            <span>{error}</span>
        </p>
    );
}

export function Input({ label, error, requerido = false, icono = null, className = '', ...props }) {
    const id = props.id || idDeLabel(label);
    const idError = error && id ? `${id}-error` : undefined;
    return (
        <CampoAnimado>
            <Etiqueta label={label} requerido={requerido} htmlFor={id} />
            <div className="relative">
                {icono && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500" aria-hidden="true">
                        {icono}
                    </span>
                )}
                <input
                    id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={idError}
                aria-required={requerido || undefined}
                    className={`field ${icono ? 'pl-9' : ''} ${error ? 'border-crimson-400 focus:border-crimson-500 focus:ring-crimson-500/10' : ''} ${className}`}
                    {...props}
                />
            </div>
            <MensajeError error={error} id={idError} />
        </CampoAnimado>
    );
}

export function Select({ label, error, requerido = false, children, className = '', ...props }) {
    const id = props.id || idDeLabel(label);
    const idError = error && id ? `${id}-error` : undefined;
    return (
        <CampoAnimado>
            <Etiqueta label={label} requerido={requerido} htmlFor={id} />
            <select
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={idError}
                aria-required={requerido || undefined}
                className={`field ${error ? 'border-crimson-400 focus:border-crimson-500 focus:ring-crimson-500/10' : ''} ${className}`}
                {...props}
            >
                {children}
            </select>
            <MensajeError error={error} id={idError} />
        </CampoAnimado>
    );
}

export function Textarea({ label, error, requerido = false, className = '', ...props }) {
    const id = props.id || idDeLabel(label);
    const idError = error && id ? `${id}-error` : undefined;
    return (
        <CampoAnimado>
            <Etiqueta label={label} requerido={requerido} htmlFor={id} />
            <textarea
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={idError}
                aria-required={requerido || undefined}
                className={`field resize-none ${error ? 'border-crimson-400 focus:border-crimson-500 focus:ring-crimson-500/10' : ''} ${className}`}
                {...props}
            />
            <MensajeError error={error} id={idError} />
        </CampoAnimado>
    );
}
