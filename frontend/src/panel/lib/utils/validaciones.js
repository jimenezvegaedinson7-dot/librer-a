export const requerido = (valor, nombre = 'Este campo') => {
    const v = String(valor ?? '').trim();

    if (!v) return `${nombre} es ${/^(la|las|una)\s/i.test(nombre) ? 'obligatoria' : 'obligatorio'}`;
    return '';
};

export const emailValido = (valor) => {
    const v = String(valor ?? '').trim();
    if (!v) return '';
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(v)) return 'Ingresa un correo electrónico válido';
    return '';
};

export const numeroNoNegativo = (valor, nombre = 'Este campo') => {
    const v = String(valor ?? '').trim();
    if (!v) return '';
    const num = Number(v);
    if (Number.isNaN(num)) return `${nombre} debe ser un número`;
    if (num < 0) return `${nombre} no puede ser negativo`;
    return '';
};

export const seleccionRequerida = (valor, nombre = 'Selecciona una opción') => {
    const v = String(valor ?? '');
    if (!v || v === '0' || v === '') return `${nombre}`;
    return '';
};

export function validarFormulario(formulario, reglas) {
    const errores = {};
    let valido = true;

    for (const [campo, validadores] of Object.entries(reglas || {})) {
        const valor = formulario?.[campo];
        for (const validador of validadores) {
            const mensaje = validador(valor, formulario);
            if (mensaje) {
                errores[campo] = mensaje;
                valido = false;
                break;
            }
        }
    }

    return { errores, valido };
}
