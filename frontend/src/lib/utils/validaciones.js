// ============================================================
// VALIDACIONES REUTILIZABLES (frontend)
// Funciones puras que validan un valor y devuelven un mensaje
// de error, o una cadena vacía si es correcto.
// ============================================================

export const requerido = (valor, nombre = 'Este campo') => {
    const v = String(valor ?? '').trim();
    if (!v) return `${nombre} es obligatorio`;
    return '';
};

export const minimoCaracteres = (valor, minimo, nombre = 'Este campo') => {
    const v = String(valor ?? '').trim();
    if (v.length > 0 && v.length < minimo) {
        return `${nombre} debe tener al menos ${minimo} caracteres`;
    }
    return '';
};

export const emailValido = (valor) => {
    const v = String(valor ?? '').trim();
    if (!v) return '';
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(v)) return 'Ingresa un correo electrónico válido';
    return '';
};

export const numeroValido = (valor, nombre = 'Este campo') => {
    const v = String(valor ?? '').trim();
    if (!v) return '';
    const num = Number(v);
    if (Number.isNaN(num)) return `${nombre} debe ser un número`;
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

export const cantidadPositiva = (valor, nombre = 'La cantidad') => {
    const v = String(valor ?? '').trim();
    if (!v) return `${nombre} es obligatoria`;
    const num = Number(v);
    if (!Number.isInteger(num) || num <= 0) {
        return `${nombre} debe ser un entero mayor a 0`;
    }
    return '';
};

export const seleccionRequerida = (valor, nombre = 'Selecciona una opción') => {
    const v = String(valor ?? '');
    if (!v || v === '0' || v === '') return `${nombre}`;
    return '';
};

// ============================================================
// REVISA UN GRUPO DE REGLAS SOBRE UN FORMULARIO
// `reglas` = { campo: [ (valor, formulario) => mensaje | '' ] }
// Devuelve { errores, valido }
// ============================================================
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

// ============================================================
// MANTENER SOLO LAS REGLAS ENTREGADAS
// ============================================================
export function soloErrores(errores, campos) {
    if (!campos || campos.length === 0) return errores;
    const filtrado = {};
    for (const campo of campos) {
        if (errores[campo]) filtrado[campo] = errores[campo];
    }
    return filtrado;
}
