const pool = require('../config/database');
const ventaModel = require('./venta.model');
const empresaModel = require('./empresa.model');

// ========================================
// TIPOS DE COMPROBANTE VÁLIDOS
// ========================================
const TIPOS_VALIDOS = ['boleta', 'factura'];

const esTipoValido = (tipo) => {
    return TIPOS_VALIDOS.includes(tipo);
};

// ========================================
// TIPOS DE DOCUMENTO DE IDENTIDAD DEL CLIENTE
// ========================================
const DOCUMENTOS_VALIDOS = [
    'DNI',
    'RUC',
    'CE',
    'PASAPORTE'
];

// ========================================
// ¿EL DNI/RUC DEL CLIENTE ES VÁLIDO?
// (función pura, testeable sin BD)
// Regla (factura): >= 8 caracteres, solo alfanumérico
// (DNI: 8 dígitos, RUC: 11 dígitos, CE/Pasaporte alfanumérico).
// ========================================
const esClienteDniRucValido = (cliente_dni_ruc) => {
    if (
        cliente_dni_ruc === undefined ||
        cliente_dni_ruc === null ||
        typeof cliente_dni_ruc !== 'string'
    ) {
        return false;
    }

    const texto = cliente_dni_ruc.trim();

    if (texto.length < 8) {
        return false;
    }

    return /^[A-Za-z0-9]+$/.test(texto);
};

// ========================================
// NORMALIZAR TIPO DE DOCUMENTO DEL CLIENTE
// (función pura, testeable sin BD)
// Para factura: default 'RUC'. Solo acepta DNI/RUC/CE/PASAPORTE.
// Para boleta: null (no aplica).
// ========================================
const normalizarTipoDocumentoCliente = (
    tipoComprobante,
    cliente_tipo_documento
) => {
    const tipo =
        typeof cliente_tipo_documento === 'string'
            ? cliente_tipo_documento.trim().toUpperCase()
            : '';

    if (tipoComprobante === 'factura') {
        return DOCUMENTOS_VALIDOS.includes(tipo)
            ? tipo
            : 'RUC';
    }

    return DOCUMENTOS_VALIDOS.includes(tipo)
        ? tipo
        : null;
};

// ========================================
// VALIDAR DATOS DEL CLIENTE PARA FACTURA
// (función pura, testeable sin BD)
// Devuelve { ok: true } o { ok: false, mensaje }.
// ========================================
const validarDatosClienteFactura = (
    tipoComprobante,
    cliente_dni_ruc
) => {
    if (tipoComprobante !== 'factura') {
        return { ok: true };
    }

    if (!esClienteDniRucValido(cliente_dni_ruc)) {
        return {
            ok: false,
            mensaje:
                'La factura requiere el RUC o DNI del cliente'
        };
    }

    return { ok: true };
};

const serieSegunTipo = (tipo) => {
    return tipo === 'boleta' ? 'B001' : 'F001';
};

// ========================================
// CREAR ERROR CON CÓDIGO HTTP
// ========================================
const crearError = (mensaje, status) => {
    const error = new Error(mensaje);
    error.status = status;
    return error;
};

// ========================================
// OBTENER DETALLE DE LA VENTA
// (JOIN detalle_venta + libros)
// ========================================
const obtenerDetalleVenta = async (id_venta) => {
    const [filas] = await pool.query(`
        SELECT
            d.id_detalle,
            d.id_libro,
            l.titulo,
            d.cantidad,
            d.precio_unitario,
            d.subtotal
        FROM detalle_venta d
        INNER JOIN libros l
            ON d.id_libro = l.id_libro
        WHERE d.id_venta = ?
        ORDER BY d.id_detalle ASC
    `, [id_venta]);

    return filas.map((fila) => ({
        id_libro: fila.id_libro,
        titulo: fila.titulo,
        cantidad: Number(fila.cantidad),
        precio_unitario: Number(
            fila.precio_unitario
        ),
        subtotal: Number(fila.subtotal)
    }));
};

// ========================================
// GENERAR COMPROBANTE (BOLETA / FACTURA)
// ========================================
// Pasos:
//   1. Valida tipo y venta (404 si no existe,
//      400 si no está pagada/entregada).
//   2. Rechaza duplicado (409) de la misma venta+tipo.
//   3. Calcula subtotal (detalle), costo_envio y total
//      REALES de la venta; IGV según empresa.aplica_igv.
//   4. Transacción: serie + numero (MAX+1 con FOR UPDATE)
//      + inserción con snapshots de la empresa.
// ========================================
const generarComprobante = async ({
    id_venta,
    tipo,
    cliente_dni_ruc,
    cliente_tipo_documento,
    cliente_nombre,
    cliente_email
}) => {
    const tipoComprobante =
        tipo || 'boleta';

    if (!esTipoValido(tipoComprobante)) {
        throw crearError(
            'Tipo de comprobante no válido. Usa "boleta" o "factura"',
            400
        );
    }

    // ========================================
    // VALIDAR DNI/RUC DEL CLIENTE PARA FACTURA
    // ========================================
    const validacionCliente =
        validarDatosClienteFactura(
            tipoComprobante,
            cliente_dni_ruc
        );

    if (!validacionCliente.ok) {
        throw crearError(
            validacionCliente.mensaje,
            400
        );
    }

    if (
        tipoComprobante === 'factura' &&
        (
            typeof cliente_nombre !== 'string' ||
            !cliente_nombre.trim()
        )
    ) {
        throw crearError(
            'La factura requiere el nombre o razón social del cliente',
            400
        );
    }

    const tipoDocumentoCliente =
        normalizarTipoDocumentoCliente(
            tipoComprobante,
            cliente_tipo_documento || venta.cliente_tipo_documento || null
        );

    // ========================================
    // LEER VENTA (cabecera + detalles)
    // ========================================
    const venta =
        await ventaModel.obtenerPorId(id_venta);

    if (!venta) {
        throw crearError(
            'Venta no encontrada',
            404
        );
    }

    if (
        !['pagada', 'entregada'].includes(
            venta.estado
        )
    ) {
        throw crearError(
            'La venta debe estar pagada o entregada para emitir un comprobante',
            400
        );
    }

    // ========================================
    // EMPRESA EMISORA (snapshots)
    // ========================================
    const empresa =
        await empresaModel.obtenerEmpresa();

    // ========================================
    // CLIENTE (usuarios vía JOIN de la venta)
    // Si el admin no envía el DNI/RUC, se toma de la venta
    // (guardado automáticamente desde Flutter al momento de la compra).
    // ========================================
    const clienteNombre =
        cliente_nombre !== undefined &&
        cliente_nombre !== null &&
        String(cliente_nombre).trim() !== ''
            ? String(cliente_nombre).trim()
            : `${venta.nombre_usuario || ''} ${venta.apellido_usuario || ''}`
                  .trim() || null;

    const clienteEmail =
        cliente_email !== undefined &&
        cliente_email !== null &&
        String(cliente_email).trim() !== ''
            ? String(cliente_email).trim()
            : (venta.correo_compra || venta.correo_usuario || null);

    // Default: DNI/RUC de la venta (Flutter checkout).
    // Solo se sobreescribe si el admin envia un valor diferente.
    const dniRucFinal =
        (cliente_dni_ruc !== undefined &&
         cliente_dni_ruc !== null &&
         String(cliente_dni_ruc).trim() !== ''
            ? String(cliente_dni_ruc).trim()
            : null) || venta.cliente_documento || '';

    // ========================================
    // IMPORTES REALES DE LA VENTA
    // ========================================
    const detalle = (venta.detalles || []).map(
        (item) => ({
            id_libro: item.id_libro,
            titulo: item.titulo,
            cantidad: Number(item.cantidad),
            precio_unitario: Number(
                item.precio_unitario
            ),
            subtotal: Number(item.subtotal)
        })
    );

    const subtotalVenta = Number(
        detalle
            .reduce(
                (suma, item) =>
                    suma + item.subtotal,
                0
            )
            .toFixed(2)
    );

    const costoEnvio = Number(
        venta.costo_envio || 0
    );

    const totalVenta = Number(
        venta.total || 0
    );

    // ========================================
    // Los precios de venta ya incluyen IGV. El comprobante nunca
    // debe superar el total efectivamente pagado; en factura se
    // informa la porción de IGV incluida en ese total.
// ========================================
    let igv = 0;
    const totalComprobante = totalVenta;

    if (
        tipoComprobante === 'factura' &&
        Number(empresa.aplica_igv) === 1 &&
        totalVenta > 0
    ) {
        igv = Number(
            (totalVenta - totalVenta / 1.18).toFixed(2)
        );
    }

    // ========================================
    // TRANSACCIÓN: SERIE + NÚMERO + INSERT
    // El SELECT ... FOR UPDATE sobre MAX(numero)
    // serializa la emisión dentro de cada serie.
    // ========================================
    const connection =
        await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Serializa cualquier emisión para la misma venta. De esta forma dos
        // solicitudes concurrentes no pueden superar juntas el chequeo, aun
        // si una base histórica todavía no pudo aplicar el índice UNIQUE.
        const [ventasBloqueadas] = await connection.query(`
            SELECT id_venta, estado
            FROM ventas
            WHERE id_venta = ?
            FOR UPDATE
        `, [id_venta]);

        if (
            ventasBloqueadas.length === 0 ||
            !['pagada', 'entregada'].includes(
                ventasBloqueadas[0].estado
            )
        ) {
            throw crearError(
                'La venta debe estar pagada o entregada para emitir un comprobante',
                400
            );
        }

        // ========================================
        // RECHAZAR DUPLICADO (un comprobante por venta)
        // ========================================
        const [existentes] =
            await connection.query(`
                SELECT id_comprobante
                FROM comprobantes
                WHERE id_venta = ?
                LIMIT 1
            `, [id_venta]);

        if (existentes.length > 0) {
            await connection.rollback();

            throw crearError(
                'Ya existe un comprobante para esta venta',
                409
            );
        }

        // ========================================
        // NÚMERO CORRELATIVO DE LA SERIE
        // ========================================
        const serie =
            serieSegunTipo(tipoComprobante);

        const [ultimos] =
            await connection.query(`
                SELECT MAX(numero) AS maximo
                FROM comprobantes
                WHERE serie = ?
            `, [serie]);

        const numero =
            Number(
                ultimos[0]?.maximo || 0
            ) + 1;

        // ========================================
        // INSERTAR COMPROBANTE
        // ========================================
        const [resultado] =
            await connection.query(`
                INSERT INTO comprobantes
                (
                    id_venta,
                    tipo,
                    serie,
                    numero,
                    ruc,
                    razon_social,
                    cliente_nombre,
                    cliente_email,
                    cliente_dni_ruc,
                    cliente_tipo_documento,
                    subtotal,
                    costo_envio,
                    igv,
                    total
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                id_venta,
                tipoComprobante,
                serie,
                numero,
                empresa.ruc || null,
                empresa.razon_social || null,
                clienteNombre,
                clienteEmail,
                dniRucFinal,
                tipoDocumentoCliente,
                subtotalVenta,
                costoEnvio,
                igv,
                totalComprobante
            ]);

        await connection.commit();

        // ========================================
        // DEVOLVER COMPROBANTE COMPLETO
        // ========================================
        const comprobante =
            await obtenerComprobante(
                resultado.insertId
            );

        return comprobante;

    } catch (error) {
        await connection.rollback();

        // ========================================
        // DOBLE EMISIÓN (carrera): el UNIQUE
        // uq_comprobante_venta (id_venta)
        // captura la duplicidad -> 409.
        // PostgreSQL: code 23505 = unique_violation
        // MySQL: errno 1062 = ER_DUP_ENTRY
        // ========================================
        if (
            error?.code === '23505' ||
            error?.errno === 1062 ||
            error?.code === 'ER_DUP_ENTRY'
        ) {
            throw crearError(
                'Ya existe un comprobante para esta venta',
                409
            );
        }

        throw error;

    } finally {
        connection.release();
    }
};

// ========================================
// LISTAR COMPROBANTES (CON PAGINACIÓN)
// Filtros: tipo, q (serie/número/cliente), pagina/porPagina.
// ========================================
const listarComprobantes = async ({
    tipo,
    q,
    pagina,
    porPagina
} = {}) => {
    const paginaNum =
        Math.max(
            1,
            parseInt(pagina, 10) || 1
        );

    const porPaginaNum =
        Math.min(
            100,
            Math.max(
                1,
                parseInt(porPagina, 10) || 20
            )
        );

    const offset =
        (paginaNum - 1) *
        porPaginaNum;

    const condiciones = [];
    const valores = [];

    if (
        tipo &&
        esTipoValido(tipo)
    ) {
        condiciones.push('c.tipo = ?');
        valores.push(tipo);
    }

    if (
        q &&
        String(q).trim()
    ) {
        const busqueda =
            `%${String(q).trim()}%`;

        condiciones.push(`(
            c.serie LIKE ? OR
            CAST(c.numero AS TEXT) LIKE ? OR
            c.cliente_nombre LIKE ?
        )`);

        valores.push(
            busqueda,
            busqueda,
            busqueda
        );
    }

    const where =
        condiciones.length > 0
            ? `WHERE ${condiciones.join(' AND ')}`
            : '';

    // ========================================
    // TOTAL (PARA PAGINACIÓN)
    // ========================================
    const [conteo] = await pool.query(`
        SELECT COUNT(*) AS total
        FROM comprobantes c
        INNER JOIN ventas v
            ON c.id_venta = v.id_venta
        ${where}
    `, valores);

    const total =
        Number(conteo[0]?.total || 0);

    // ========================================
    // COMPROBANTES
    // ========================================
    const [filas] = await pool.query(`
        SELECT
            c.id_comprobante,
            c.id_venta,
            c.tipo,
            c.serie,
            c.numero,
            c.ruc,
            c.razon_social,
            c.cliente_nombre,
            c.cliente_email,
            c.cliente_dni_ruc,
            c.cliente_tipo_documento,
            c.enviado_por_email,
            c.subtotal,
            c.costo_envio,
            c.igv,
            c.total,
            c.fecha_emision,
            v.estado AS estado_venta
        FROM comprobantes c
        INNER JOIN ventas v
            ON c.id_venta = v.id_venta
        ${where}
        ORDER BY c.id_comprobante DESC
        LIMIT ? OFFSET ?
    `, [...valores, porPaginaNum, offset]);

    return {
        comprobantes: filas.map((fila) => ({
            id_comprobante:
                fila.id_comprobante,
            id_venta: fila.id_venta,
            tipo: fila.tipo,
            serie: fila.serie,
            numero: fila.numero,
            ruc: fila.ruc,
            razon_social:
                fila.razon_social,
            cliente_nombre:
                fila.cliente_nombre,
            cliente_email:
                fila.cliente_email,
            cliente_dni_ruc:
                fila.cliente_dni_ruc,
            cliente_tipo_documento:
                fila.cliente_tipo_documento,
            subtotal: Number(
                fila.subtotal
            ),
            costo_envio: Number(
                fila.costo_envio
            ),
            igv: Number(fila.igv),
            total: Number(fila.total),
            fecha_emision:
                fila.fecha_emision,
            estado_venta:
                fila.estado_venta
        })),
        total,
        paginas:
            porPaginaNum > 0
                ? Math.ceil(
                    total / porPaginaNum
                )
                : 0
    };
};

// ========================================
// RESUMEN GLOBAL DE COMPROBANTES (ADMIN)
// GET /comprobantes/resumen
// Devuelve { boletas, facturas, ingresos } sobre TODOS
// los comprobantes emitidos (sin paginación).
// ========================================
const listarResumen = async () => {
    const [filas] = await pool.query(`
        SELECT
            COALESCE(
                SUM(
                    CASE
                        WHEN tipo = 'boleta' THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS boletas,
            COALESCE(
                SUM(
                    CASE
                        WHEN tipo = 'factura' THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS facturas,
            COALESCE(SUM(total), 0) AS ingresos
        FROM comprobantes
    `);

    const fila = filas[0] || {};

    return {
        boletas: Number(fila.boletas || 0),
        facturas: Number(fila.facturas || 0),
        ingresos: Number(fila.ingresos || 0)
    };
};

// ========================================
// OBTENER COMPROBANTE POR ID
// Cabecera + detalle (detalle_venta + libros).
// ========================================
const obtenerComprobante = async (id) => {
    const [cabeceras] = await pool.query(`
        SELECT
            c.id_comprobante,
            c.id_venta,
            c.tipo,
            c.serie,
            c.numero,
            c.ruc,
            c.razon_social,
            c.cliente_nombre,
            c.cliente_email,
            c.cliente_dni_ruc,
            c.cliente_tipo_documento,
            c.enviado_por_email,
            c.fecha_envio_email,
            c.subtotal,
            c.costo_envio,
            c.igv,
            c.total,
            c.fecha_emision,
            v.id_usuario,
            v.estado AS estado_venta,
            v.tipo_entrega,
            v.correo_compra,
            v.external_reference,
            u.nombre AS nombre_usuario,
            u.apellido AS apellido_usuario,
            u.email AS correo_usuario
        FROM comprobantes c
        INNER JOIN ventas v
            ON c.id_venta = v.id_venta
        LEFT JOIN usuarios u
            ON v.id_usuario = u.id_usuario
        WHERE c.id_comprobante = ?
        LIMIT 1
    `, [id]);

    if (cabeceras.length === 0) {
        return null;
    }

    const detalle =
        await obtenerDetalleVenta(
            cabeceras[0].id_venta
        );

    return {
        ...cabeceras[0],
        subtotal: Number(
            cabeceras[0].subtotal
        ),
        costo_envio: Number(
            cabeceras[0].costo_envio
        ),
        igv: Number(cabeceras[0].igv),
        total: Number(
            cabeceras[0].total
        ),
        detalle
    };
};

// ========================================
// EXPORTAR MODELO
// ========================================
module.exports = {
    generarComprobante,
    listarComprobantes,
    listarResumen,
    obtenerComprobante,
    esClienteDniRucValido,
    normalizarTipoDocumentoCliente,
    validarDatosClienteFactura
};
