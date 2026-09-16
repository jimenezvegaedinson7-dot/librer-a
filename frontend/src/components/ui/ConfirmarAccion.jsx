import { cn } from '@/lib/utils';

export function ConfirmarAccion({
    titulo = 'Confirmar acción',
    descripcion,
    onConfirm,
    onCancel,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'destructive',
    ...props
}) {
    return (
        <div className="space-y-4">
            <p className="text-sm text-secondary">{descripcion}</p>

            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className={cn(
                        'flex-1 rounded-lg px-4 py-2 text-sm font-medium text-secondary hover:text-primary hover:bg-primary-50 transition-colors'
                    )}
                >
                    {cancelText}
                </button>

                <button
                    onClick={onConfirm}
                    className={cn(
                        'flex-1 rounded-lg px-4 py-2 text-sm font-medium',
                        variant === 'destructive' && 'bg-red-100 text-red-600 hover:bg-red-200',
                        variant === 'primary' && 'bg-primary-600 text-white hover:bg-primary-500'
                    )}
                >
                    {confirmText}
                </button>
            </div>
        </div>
    );
}