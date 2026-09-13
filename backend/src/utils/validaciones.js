// ========================================
// VALIDACIÓN DE IDs Y ENTRADAS
// ========================================

// ========================================
// VALIDAR ID DE RUTA
// Devuelve: Number válido o null
// ========================================
const validarId = (valor) => {
    const numero = Number(valor);

    if (
        !Number.isInteger(numero) ||
        numero <= 0
    ) {
        return null;
    }

    return numero;
};

// ========================================
// VALIDAR EMAIL
// ========================================
const esEmailValido = (email) => {
    if (!email || typeof email !== 'string') {
        return false;
    }

    const regex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return regex.test(email.trim());
};

// ========================================
// VALIDAR ESTADO (0 o 1)
// ========================================
const esEstadoValido = (estado) => {
    const numero = Number(estado);

    return numero === 0 || numero === 1;
};

// ========================================
// VALIDAR NÚMERO NO NEGATIVO
// ========================================
const esNumeroNoNegativo = (valor) => {
    const numero = Number(valor);

    return (
        !Number.isNaN(numero) &&
        Number.isFinite(numero) &&
        numero >= 0
    );
};

// ========================================
// VALIDAR CANTIDAD POSITIVA ENTERA
// ========================================
const esCantidadPositiva = (valor) => {
    const numero = Number(valor);

    return (
        Number.isInteger(numero) &&
        numero > 0
    );
};

module.exports = {
    validarId,
    esEmailValido,
    esEstadoValido,
    esNumeroNoNegativo,
    esCantidadPositiva
};
