// ============================================================
// MONTO EN LETRAS (SOLES)
// Convierte un numero a su representacion en letras.
// Ej: 36.50 -> "TREINTA Y SEIS CON 50/100 SOLES"
// ============================================================

const UNIDADES = [
    '', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO',
    'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ',
    'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE',
    'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'
];

const DECENAS = [
    '', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA',
    'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'
];

const CENTENAS = [
    '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS',
    'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'
];

function convertirCentenas(n) {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    let resultado = CENTENAS[c] || '';
    const resto = n % 100;
    if (resto > 0) {
        if (resultado) resultado += ' ';
        if (resto <= 20) {
            resultado += UNIDADES[resto];
        } else {
            resultado += DECENAS[d];
            if (u > 0) resultado += ' Y ' + UNIDADES[u];
        }
    }
    return resultado;
}

function convertirMiles(n) {
    if (n === 0) return '';
    if (n < 100) return convertirCentenas(n);
    const miles = Math.floor(n / 1000);
    const resto = n % 1000;
    let resultado = '';
    if (miles === 1) {
        resultado = 'MIL';
    } else if (miles > 1) {
        resultado = convertirCentenas(miles) + ' MIL';
    }
    if (resto > 0) {
        if (resultado) resultado += ' ';
        resultado += convertirCentenas(resto);
    }
    return resultado;
}

function convertirMillones(n) {
    if (n === 0) return '';
    if (n < 1000) return convertirCentenas(n);
    const millones = Math.floor(n / 1000000);
    const resto = n % 1000000;
    let resultado = '';
    if (millones === 1) {
        resultado = 'UN MILLON';
    } else if (millones > 1) {
        resultado = convertirMiles(millones) + ' MILLONES';
    }
    if (resto > 0) {
        if (resultado) resultado += ' ';
        resultado += convertirMiles(resto);
    }
    return resultado;
}

export function montoEnLetras(monto) {
    const num = Math.abs(Number(monto) || 0);
    const enteros = Math.floor(num);
    const centavos = Math.round((num - enteros) * 100);
    const enterosLetras = convertirMillones(enteros) || 'CERO';
    return `${enterosLetras} CON ${String(centavos).padStart(2, '0')}/100 SOLES`;
}
