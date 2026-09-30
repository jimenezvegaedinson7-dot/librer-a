// ========================================
// VALIDACIÓN DE IDs Y ENTRADAS
// ========================================

// ========================================
// VALIDAR ID DE RUTA
// Devuelve: Number válido o null
// ========================================
const validarId = (valor) => {
    if (typeof valor !== 'number' && typeof valor !== 'string') return null;
    if (typeof valor === 'string' && !/^\d+$/.test(valor.trim())) return null;
    const numero = Number(valor);

    if (
        !Number.isInteger(numero) ||
        numero <= 0 || numero > 2147483647
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
    if (typeof estado !== 'number' && typeof estado !== 'string') return false;
    if (typeof estado === 'string' && !/^[01]$/.test(estado.trim())) return false;
    const numero = Number(estado);

    return numero === 0 || numero === 1;
};

// ========================================
// VALIDAR NÚMERO NO NEGATIVO
// ========================================
const esNumeroNoNegativo = (valor) => {
    if (typeof valor !== 'number' && typeof valor !== 'string') return false;
    if (typeof valor === 'string' && valor.trim() === '') return false;
    const numero = Number(valor);

    return (
        !Number.isNaN(numero) &&
        Number.isFinite(numero) &&
        numero >= 0
    );
};

// INTEGER de PostgreSQL. El texto numérico de formularios se normaliza
// explícitamente; null, booleanos, colecciones y blancos no son cantidades.
const normalizarStock = (valor) => {
    if (typeof valor !== 'number' && typeof valor !== 'string') return null;
    if (typeof valor === 'string' && !/^\d+$/.test(valor.trim())) return null;
    const numero = Number(valor);
    return Number.isFinite(numero) && Number.isInteger(numero) &&
        numero >= 0 && numero <= 2147483647 ? numero : null;
};

const esTextoValido = (valor, maximo, permitirVacio = false) =>
    typeof valor === 'string' && valor.trim().length <= maximo &&
    (permitirVacio || valor.trim().length > 0);

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
    normalizarStock,
    esTextoValido,
    esCantidadPositiva
};
