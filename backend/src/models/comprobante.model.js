const pool = require('../config/database');
const { calcularTributos } = require('../utils/impuestos');
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
// Solo acepta DNI/RUC/CE/PASAPORTE.
// Factura: si el tipo no es válido, default 'RUC'.
// Boleta: guarda el tipo si es válido; si no, null.
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

    // Tipo de documento: el enviado o, si falta, el guardado en la venta.
    const tipoDocumentoCliente =
        normalizarTipoDocumentoCliente(
            tipoComprobante,
            cliente_tipo_documento || venta.cliente_tipo_documento || null
        );

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
    // En una venta de mostrador el usuario de la venta es el
    // administrador que la registró: nunca se usan sus datos como
    // datos del cliente.
    const esMostrador = venta.origen === 'panel';

    const nombreDeLaCuenta = esMostrador
        ? ''
        : `${venta.nombre_usuario || ''} ${venta.apellido_usuario || ''}`.trim();

    const clienteNombre =
        cliente_nombre !== undefined &&
        cliente_nombre !== null &&
        String(cliente_nombre).trim() !== ''
            ? String(cliente_nombre).trim()
            : (venta.cliente_nombre || nombreDeLaCuenta || null);

    const clienteEmail =
        cliente_email !== undefined &&
        cliente_email !== null &&
        String(cliente_email).trim() !== ''
            ? String(cliente_email).trim()
            : (venta.correo_compra || (esMostrador ? null : venta.correo_usuario) || null);

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
    // TRIBUTOS (utils/impuestos): los precios ya incluyen el IGV.
    // Libros exonerados (Ley 31053) mientras rija; envío gravado.
    // El comprobante nunca supera el total efectivamente pagado.
    // ========================================
    const tributos = calcularTributos({
        subtotalLibros: subtotalVenta,
        costoEnvio,
        empresa
    });

    const totalComprobante = totalVenta;
    const igv = tributos.igv;

    // ========================================
    // BOLETAS DE MÁS DE S/ 700: el Reglamento de Comprobantes de
    // Pago exige identificar al adquirente (nombre y documento).
    // ========================================
    if (
        tipoComprobante === 'boleta' &&
        totalComprobante > 700 &&
        (!dniRucFinal || !clienteNombre)
    ) {
        throw crearError(
            'Las boletas de más de S/ 700 deben indicar el nombre y el DNI (o documento) del cliente',
            400
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
                  AND estado = 'emitido'
                LIMIT 1
            `, [id_venta]);

        if (existentes.length > 0) {
            // El catch hace el ROLLBACK.
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

        // Serializa la numeración de la serie: dos ventas distintas
        // emitidas a la vez no pueden tomar el mismo número.
        await connection.query(
            'SELECT pg_advisory_xact_lock(hashtext(?))',
            [`comprobantes:${serie}`]
        );

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
                    total,
                    op_gravada,
                    op_exonerada
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                totalComprobante,
                tributos.op_gravada,
                tributos.op_exonerada
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
// Filtros: tipo, q (serie/número/cliente),
// envio ('enviado' | 'pendiente'), pagina/porPagina.
// ========================================
const listarComprobantes = async ({
    tipo,
    q,
    envio,
    estado,
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
            c.serie ILIKE ? OR
            CAST(c.numero AS TEXT) LIKE ? OR
            c.cliente_nombre ILIKE ? OR
            c.cliente_dni_ruc LIKE ? OR
            c.numero_sunat ILIKE ?
        )`);

        valores.push(
            busqueda,
            busqueda,
            busqueda,
            busqueda,
            busqueda
        );
    }

    if (estado === 'emitido' || estado === 'anulado') {
        condiciones.push('c.estado = ?');
        valores.push(estado);
    } else if (estado === 'sin_sunat') {
        // Emitidos que aún no tienen su comprobante electrónico SUNAT.
        condiciones.push(`(c.estado = 'emitido' AND c.numero_sunat IS NULL)`);
    }

    if (envio === 'enviado') {
        condiciones.push('c.enviado_por_email = TRUE');
    } else if (envio === 'pendiente') {
        // Pendiente = emitido, sin enviar y con algún correo del cliente.
        condiciones.push(`(
            c.estado = 'emitido'
            AND COALESCE(c.enviado_por_email, FALSE) = FALSE
            AND COALESCE(
                NULLIF(c.cliente_email, ''),
                NULLIF(v.correo_compra, ''),
                CASE WHEN v.origen = 'panel' THEN NULL ELSE u.email END
            ) IS NOT NULL
        )`);
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
        LEFT JOIN usuarios u
            ON v.id_usuario = u.id_usuario
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
            c.fecha_envio_email,
            COALESCE(
                NULLIF(c.cliente_email, ''),
                NULLIF(v.correo_compra, ''),
                CASE WHEN v.origen = 'panel' THEN NULL ELSE u.email END
            ) AS email_destino,
            c.subtotal,
            c.costo_envio,
            c.igv,
            c.total,
            c.op_gravada,
            c.op_exonerada,
            c.estado,
            c.numero_sunat,
            c.nota_credito_sunat,
            c.motivo_anulacion,
            c.fecha_anulacion,
            c.fecha_emision,
            v.estado AS estado_venta
        FROM comprobantes c
        INNER JOIN ventas v
            ON c.id_venta = v.id_venta
        LEFT JOIN usuarios u
            ON v.id_usuario = u.id_usuario
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
            op_gravada: Number(fila.op_gravada || 0),
            op_exonerada: Number(fila.op_exonerada || 0),
            estado: fila.estado || 'emitido',
            numero_sunat: fila.numero_sunat || null,
            nota_credito_sunat: fila.nota_credito_sunat || null,
            motivo_anulacion: fila.motivo_anulacion || null,
            fecha_anulacion: fila.fecha_anulacion || null,
            fecha_emision:
                fila.fecha_emision,
            estado_venta:
                fila.estado_venta,
            enviado_por_email:
                Boolean(fila.enviado_por_email),
            fecha_envio_email:
                fila.fecha_envio_email || null,
            email_destino:
                fila.email_destino || null
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
                        WHEN tipo = 'boleta' AND estado = 'emitido' THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS boletas,
            COALESCE(
                SUM(
                    CASE
                        WHEN tipo = 'factura' AND estado = 'emitido' THEN 1
                        ELSE 0
                    END
                ),
                0
            ) AS facturas,
            COALESCE(SUM(CASE WHEN estado = 'emitido' THEN total ELSE 0 END), 0) AS ingresos,
            COALESCE(SUM(CASE WHEN estado = 'anulado' THEN 1 ELSE 0 END), 0) AS anulados
        FROM comprobantes
    `);

    const fila = filas[0] || {};

    return {
        boletas: Number(fila.boletas || 0),
        facturas: Number(fila.facturas || 0),
        ingresos: Number(fila.ingresos || 0),
        anulados: Number(fila.anulados || 0)
    };
};

// ========================================
// NÚMERO DE COMPROBANTE ELECTRÓNICO SUNAT
// ----------------------------------------
// Serie y número del comprobante emitido en SUNAT (p. ej. EB01-125 o
// E001-40): 4 caracteres alfanuméricos, guion y hasta 8 dígitos.
// ========================================
const FORMATO_SUNAT = /^[A-Z0-9]{4}-\d{1,8}$/;

const normalizarNumeroSunat = (valor) => {
    if (valor === undefined || valor === null || String(valor).trim() === '') {
        return null;
    }
    const texto = String(valor).trim().toUpperCase();
    if (!FORMATO_SUNAT.test(texto)) {
        throw crearError(
            'Número SUNAT no válido. Usa la serie y el número, por ejemplo EB01-125 o E001-40',
            400
        );
    }
    const [serie, numero] = texto.split('-');
    return `${serie}-${Number(numero)}`;
};

// Registra el comprobante electrónico SUNAT (y su nota de crédito, si
// el comprobante está anulado).
const registrarSunat = async (id, { numero_sunat, nota_credito_sunat }) => {
    const numero = normalizarNumeroSunat(numero_sunat);
    const nota = normalizarNumeroSunat(nota_credito_sunat);

    const actual = await obtenerComprobante(id);
    if (!actual) {
        return null;
    }
    if (nota && actual.estado !== 'anulado') {
        throw crearError(
            'La nota de crédito solo se registra en un comprobante anulado',
            400
        );
    }

    await pool.query(`
        UPDATE comprobantes
        SET numero_sunat = COALESCE(?, numero_sunat),
            nota_credito_sunat = COALESCE(?, nota_credito_sunat)
        WHERE id_comprobante = ?
    `, [numero, nota, id]);

    return obtenerComprobante(id);
};

// ========================================
// ANULAR COMPROBANTE (datos errados)
// ----------------------------------------
// La venta sigue vigente: tras anular se puede emitir un comprobante
// nuevo con los datos correctos. En SUNAT, la anulación de una boleta o
// factura electrónica se hace con una nota de crédito.
// Para devolver el dinero se usa el reembolso de la venta, que también
// anula su comprobante.
// ========================================
const anular = async (id, { motivo, nota_credito_sunat }) => {
    const nota = normalizarNumeroSunat(nota_credito_sunat);

    const [filas] = await pool.query(`
        UPDATE comprobantes
        SET estado = 'anulado',
            motivo_anulacion = ?,
            fecha_anulacion = NOW(),
            nota_credito_sunat = COALESCE(?, nota_credito_sunat)
        WHERE id_comprobante = ?
          AND estado = 'emitido'
        RETURNING id_comprobante
    `, [motivo, nota, id]);

    if (filas.length === 0) {
        const actual = await obtenerComprobante(id);
        if (!actual) {
            return null;
        }
        throw crearError('El comprobante ya está anulado', 400);
    }

    return obtenerComprobante(id);
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
            c.op_gravada,
            c.op_exonerada,
            c.estado,
            c.numero_sunat,
            c.nota_credito_sunat,
            c.motivo_anulacion,
            c.fecha_anulacion,
            c.fecha_emision,
            v.id_usuario,
            v.origen,
            v.cliente_nombre AS cliente_nombre_venta,
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
        op_gravada: Number(cabeceras[0].op_gravada || 0),
        op_exonerada: Number(cabeceras[0].op_exonerada || 0),
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
    registrarSunat,
    anular,
    normalizarNumeroSunat,
    esClienteDniRucValido,
    normalizarTipoDocumentoCliente,
    validarDatosClienteFactura
};
