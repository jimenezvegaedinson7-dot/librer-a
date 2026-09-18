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
            {requerido && <span className="ml-0.5 text-red-500">*</span>}
        </label>
    );
}

function CampoAnimado({ children }) {
    return <div className="form-field-group">{children}</div>;
}

function MensajeError({ error }) {
    if (!error) return null;
    return (
        <p className="field-error">
            <FaCircleExclamation className="mt-px shrink-0" />
            <span>{error}</span>
        </p>
    );
}

export function Input({ label, error, requerido = false, icono = null, className = '', ...props }) {
    const id = props.id || idDeLabel(label);
    return (
        <CampoAnimado>
            <Etiqueta label={label} requerido={requerido} htmlFor={id} />
            <div className="relative">
                {icono && (
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {icono}
                    </span>
                )}
                <input
                    id={id}
                    className={`field ${icono ? 'pl-9' : ''} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''} ${className}`}
                    {...props}
                />
            </div>
            <MensajeError error={error} />
        </CampoAnimado>
    );
}

export function Select({ label, error, requerido = false, children, className = '', ...props }) {
    const id = props.id || idDeLabel(label);
    return (
        <CampoAnimado>
            <Etiqueta label={label} requerido={requerido} htmlFor={id} />
            <select
                id={id}
                className={`field ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''} ${className}`}
                {...props}
            >
                {children}
            </select>
            <MensajeError error={error} />
        </CampoAnimado>
    );
}

export function Textarea({ label, error, requerido = false, className = '', ...props }) {
    const id = props.id || idDeLabel(label);
    return (
        <CampoAnimado>
            <Etiqueta label={label} requerido={requerido} htmlFor={id} />
            <textarea
                id={id}
                className={`field resize-none ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''} ${className}`}
                {...props}
            />
            <MensajeError error={error} />
        </CampoAnimado>
    );
}
