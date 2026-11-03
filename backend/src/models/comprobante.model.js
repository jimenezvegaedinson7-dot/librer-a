const pool = require('../config/database');
const { calcularTributos } = require('../utils/impuestos');
const ventaModel = require('./venta.model');
const empresaModel = require('./empresa.model');
const { esVentaHistorica } = require('../utils/transiciones');

const TIPOS_VALIDOS = ['boleta', 'factura'];

const esTipoValido = (tipo) => {
    return TIPOS_VALIDOS.includes(tipo);
};

const DOCUMENTOS_VALIDOS = ['DNI', 'RUC', 'CE', 'PASAPORTE'];

const esClienteDniRucValido = (cliente_dni_ruc) => {
    if (cliente_dni_ruc === undefined || cliente_dni_ruc === null || typeof cliente_dni_ruc !== 'string') {
        return false;
    }

    const texto = cliente_dni_ruc.trim();

    if (texto.length < 8 || texto.length > 20) {
        return false;
    }

    return /^[A-Za-z0-9]+$/.test(texto);
};

const normalizarTipoDocumentoCliente = (tipoComprobante, cliente_tipo_documento) => {
    const tipo = typeof cliente_tipo_documento === 'string' ? cliente_tipo_documento.trim().toUpperCase() : '';

    if (tipoComprobante === 'factura') {
        return DOCUMENTOS_VALIDOS.includes(tipo) ? tipo : 'RUC';
    }

    return DOCUMENTOS_VALIDOS.includes(tipo) ? tipo : null;
};

const validarDatosClienteFactura = (tipoComprobante, cliente_dni_ruc) => {
    if (tipoComprobante !== 'factura') {
        return { ok: true };
    }

    if (typeof cliente_dni_ruc !== 'string' || !/^\d{11}$/.test(cliente_dni_ruc.trim())) {
        return { ok: false, mensaje: 'La factura requiere el RUC del cliente (11 dígitos numéricos)' };
    }

    return { ok: true };
};

const serieSegunTipo = (tipo) => {
    return tipo === 'boleta' ? 'B001' : 'F001';
};

const crearError = (mensaje, status) => {
    const error = new Error(mensaje);
    error.status = status;
    return error;
};

const obtenerDetalleVenta = async (id_venta) => {
    const [filas] = await pool.query(
        `SELECT d.id_detalle, d.id_libro, COALESCE(d.titulo_snapshot, l.titulo) AS titulo, d.cantidad, d.precio_unitario, d.subtotal FROM detalle_venta d INNER JOIN libros l ON d.id_libro = l.id_libro WHERE d.id_venta = ? ORDER BY d.id_detalle ASC`,
        [id_venta]
    );

    return filas.map((fila) => ({
        id_libro: fila.id_libro,
        titulo: fila.titulo,
        cantidad: Number(fila.cantidad),
        precio_unitario: Number(fila.precio_unitario),
        subtotal: Number(fila.subtotal)
    }));
};

const generarComprobante = async ({ id_venta, tipo, cliente_dni_ruc, cliente_tipo_documento, cliente_nombre, cliente_email }) => {
    const tipoComprobante = tipo || 'boleta';

    if (!esTipoValido(tipoComprobante)) {
        throw crearError('Tipo de comprobante no válido. Usa "boleta" o "factura"', 400);
    }

    const venta = await ventaModel.obtenerPorId(id_venta);

    if (!venta) {
        throw crearError('Venta no encontrada', 404);
    }

    if (!['pagada', 'entregada'].includes(venta.estado)) {
        throw crearError('La venta debe estar pagada o entregada para emitir un comprobante', 400);
    }

    let tipoDocumentoCliente = normalizarTipoDocumentoCliente(tipoComprobante, cliente_tipo_documento || venta.cliente_tipo_documento || null);

    if (tipoComprobante === 'factura' && tipoDocumentoCliente !== 'RUC') {
        throw crearError('La factura requiere tipo de documento RUC', 400);
    }

    if (esVentaHistorica(venta)) {
        throw crearError('Las ventas históricas son de solo lectura', 409);
    }

    const empresa = await empresaModel.obtenerEmpresa();

    const esMostrador = venta.origen === 'panel';

    const nombreDeLaCuenta = esMostrador ? '' : `${venta.nombre_usuario || ''} ${venta.apellido_usuario || ''}`.trim();

    const clienteNombre =
        cliente_nombre !== undefined && cliente_nombre !== null && String(cliente_nombre).trim() !== ''
            ? String(cliente_nombre).trim()
            : venta.cliente_nombre || nombreDeLaCuenta || null;

    const clienteEmail =
        cliente_email !== undefined && cliente_email !== null && String(cliente_email).trim() !== ''
            ? String(cliente_email).trim()
            : venta.correo_compra || (esMostrador ? null : venta.correo_usuario) || null;

    const dniRucFinal =
        (cliente_dni_ruc !== undefined && cliente_dni_ruc !== null && String(cliente_dni_ruc).trim() !== '' ? String(cliente_dni_ruc).trim() : null) ||
        venta.cliente_documento ||
        '';

    const validacionCliente = validarDatosClienteFactura(tipoComprobante, dniRucFinal);
    if (!validacionCliente.ok) throw crearError(validacionCliente.mensaje, 400);
    if (tipoComprobante === 'factura' && !clienteNombre) {
        throw crearError('La factura requiere el nombre o razón social del cliente', 400);
    }
    if (dniRucFinal) {
        if (!tipoDocumentoCliente) {
            tipoDocumentoCliente = /^\d{8}$/.test(dniRucFinal) ? 'DNI' : /^\d{11}$/.test(dniRucFinal) ? 'RUC' : null;
        }
        const patron = { DNI: /^\d{8}$/, RUC: /^\d{11}$/, CE: /^[A-Za-z0-9]{8,20}$/, PASAPORTE: /^[A-Za-z0-9]{8,20}$/ }[tipoDocumentoCliente];
        if (!patron || !patron.test(dniRucFinal)) throw crearError('El documento del cliente no coincide con el tipo seleccionado', 400);
    }

    const detalle = (venta.detalles || []).map((item) => ({
        id_libro: item.id_libro,
        titulo: item.titulo,
        cantidad: Number(item.cantidad),
        precio_unitario: Number(item.precio_unitario),
        subtotal: Number(item.subtotal)
    }));

    const subtotalVenta = Number(detalle.reduce((suma, item) => suma + item.subtotal, 0).toFixed(2));

    const costoEnvio = Number(venta.costo_envio || 0);

    const totalVenta = Number(venta.total || 0);

    const tributos = calcularTributos({ subtotalLibros: subtotalVenta, costoEnvio, empresa });

    const totalComprobante = totalVenta;
    const igv = tributos.igv;

    if (tipoComprobante === 'boleta' && totalComprobante > 700 && (!dniRucFinal || !clienteNombre)) {
        throw crearError('Las boletas de más de S/ 700 deben indicar el nombre y el DNI (o documento) del cliente', 400);
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [ventasBloqueadas] = await connection.query(`SELECT id_venta, estado FROM ventas WHERE id_venta = ? FOR UPDATE`, [id_venta]);

        if (ventasBloqueadas.length === 0 || !['pagada', 'entregada'].includes(ventasBloqueadas[0].estado)) {
            throw crearError('La venta debe estar pagada o entregada para emitir un comprobante', 400);
        }

        const [existentes] = await connection.query(`SELECT id_comprobante FROM comprobantes WHERE id_venta = ? AND estado = 'emitido' LIMIT 1`, [id_venta]);

        if (existentes.length > 0) {
            throw crearError('Ya existe un comprobante para esta venta', 409);
        }

        const serie = serieSegunTipo(tipoComprobante);

        await connection.query('SELECT pg_advisory_xact_lock(hashtext(?))', [`comprobantes:${serie}`]);

        const [ultimos] = await connection.query(`SELECT MAX(numero) AS maximo FROM comprobantes WHERE serie = ?`, [serie]);

        const numero = Number(ultimos[0]?.maximo || 0) + 1;

        const [resultado] = await connection.query(
            `INSERT INTO comprobantes (id_venta, tipo, serie, numero, ruc, razon_social, cliente_nombre, cliente_email, cliente_dni_ruc, cliente_tipo_documento, subtotal, costo_envio, igv, total, op_gravada, op_exonerada, empresa_snapshot, detalle_snapshot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::jsonb)`,
            [
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
                tributos.op_exonerada,
                JSON.stringify({
                    ruc: empresa.ruc ?? null,
                    razon_social: empresa.razon_social ?? null,
                    nombre_comercial: empresa.nombre_comercial ?? null,
                    direccion: empresa.direccion ?? null
                }),
                JSON.stringify(detalle)
            ]
        );

        await connection.commit();

        const comprobante = await obtenerComprobante(resultado.insertId);

        return comprobante;
    } catch (error) {
        await connection.rollback();

        if (error?.code === '23505' || error?.errno === 1062 || error?.code === 'ER_DUP_ENTRY') {
            throw crearError('Ya existe un comprobante para esta venta', 409);
        }

        throw error;
    } finally {
        connection.release();
    }
};

const listarComprobantes = async ({ idVenta, tipo, q, envio, estado, pagina, porPagina } = {}) => {
    const paginaNum = Math.max(1, parseInt(pagina, 10) || 1);

    const porPaginaNum = Math.min(100, Math.max(1, parseInt(porPagina, 10) || 20));

    const offset = (paginaNum - 1) * porPaginaNum;

    const condiciones = [];
    const valores = [];

    if (idVenta !== undefined) {
        condiciones.push('c.id_venta = ?');
        valores.push(idVenta);
    }

    if (tipo && esTipoValido(tipo)) {
        condiciones.push('c.tipo = ?');
        valores.push(tipo);
    }

    if (q && String(q).trim()) {
        const busqueda = `%${String(q).trim()}%`;

        condiciones.push(`(
            c.serie ILIKE ? OR
            CAST(c.numero AS TEXT) LIKE ? OR
            c.cliente_nombre ILIKE ? OR
            c.cliente_dni_ruc LIKE ?
        )`);

        valores.push(busqueda, busqueda, busqueda, busqueda);
    }

    if (estado === 'emitido' || estado === 'anulado') {
        condiciones.push('c.estado = ?');
        valores.push(estado);
    }

    if (envio === 'enviado') {
        condiciones.push('c.enviado_por_email = TRUE');
    } else if (envio === 'pendiente') {
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

    const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [conteo] = await pool.query(
        `SELECT COUNT(*) AS total FROM comprobantes c INNER JOIN ventas v ON c.id_venta = v.id_venta LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario ${where}`,
        valores
    );

    const total = Number(conteo[0]?.total || 0);

    const [filas] = await pool.query(
        `SELECT c.id_comprobante, c.id_venta, c.tipo, c.serie, c.numero, c.ruc, c.razon_social, c.cliente_nombre, c.cliente_email, c.cliente_dni_ruc, c.cliente_tipo_documento, c.enviado_por_email, c.fecha_envio_email, COALESCE(NULLIF(c.cliente_email, ''), NULLIF(v.correo_compra, ''), CASE WHEN v.origen = 'panel' THEN NULL ELSE u.email END) AS email_destino, c.subtotal, c.costo_envio, c.igv, c.total, c.op_gravada, c.op_exonerada, c.estado, c.numero_sunat, c.nota_credito_sunat, c.motivo_anulacion, c.fecha_anulacion, c.fecha_emision, c.empresa_snapshot, c.detalle_snapshot, v.estado AS estado_venta FROM comprobantes c INNER JOIN ventas v ON c.id_venta = v.id_venta LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario ${where} ORDER BY c.id_comprobante DESC LIMIT ? OFFSET ?`,
        [...valores, porPaginaNum, offset]
    );

    return {
        comprobantes: filas.map((fila) => ({
            id_comprobante: fila.id_comprobante,
            id_venta: fila.id_venta,
            tipo: fila.tipo,
            serie: fila.serie,
            numero: fila.numero,
            ruc: fila.ruc,
            razon_social: fila.razon_social,
            cliente_nombre: fila.cliente_nombre,
            cliente_email: fila.cliente_email,
            cliente_dni_ruc: fila.cliente_dni_ruc,
            cliente_tipo_documento: fila.cliente_tipo_documento,
            subtotal: Number(fila.subtotal),
            costo_envio: Number(fila.costo_envio),
            igv: Number(fila.igv),
            total: Number(fila.total),
            op_gravada: Number(fila.op_gravada || 0),
            op_exonerada: Number(fila.op_exonerada || 0),
            estado: fila.estado || 'emitido',
            numero_sunat: fila.numero_sunat || null,
            nota_credito_sunat: fila.nota_credito_sunat || null,
            motivo_anulacion: fila.motivo_anulacion || null,
            fecha_anulacion: fila.fecha_anulacion || null,
            fecha_emision: fila.fecha_emision,
            estado_venta: fila.estado_venta,
            enviado_por_email: Boolean(fila.enviado_por_email),
            fecha_envio_email: fila.fecha_envio_email || null,
            email_destino: fila.email_destino || null
        })),
        total,
        paginas: porPaginaNum > 0 ? Math.ceil(total / porPaginaNum) : 0
    };
};

const listarResumen = async () => {
    const [filas] = await pool.query(
        `SELECT COALESCE(SUM(CASE WHEN tipo = 'boleta' AND estado = 'emitido' THEN 1 ELSE 0 END), 0) AS boletas, COALESCE(SUM(CASE WHEN tipo = 'factura' AND estado = 'emitido' THEN 1 ELSE 0 END), 0) AS facturas, COALESCE(SUM(CASE WHEN estado = 'emitido' THEN total ELSE 0 END), 0) AS ingresos, COALESCE(SUM(CASE WHEN estado = 'anulado' THEN 1 ELSE 0 END), 0) AS anulados FROM comprobantes`
    );

    const fila = filas[0] || {};

    return { boletas: Number(fila.boletas || 0), facturas: Number(fila.facturas || 0), ingresos: Number(fila.ingresos || 0), anulados: Number(fila.anulados || 0) };
};

const anular = async (id, { motivo }) => {
    const [filas] = await pool.query(
        `UPDATE comprobantes SET estado = 'anulado', motivo_anulacion = ?, fecha_anulacion = NOW() WHERE id_comprobante = ? AND estado = 'emitido' RETURNING id_comprobante`,
        [motivo, id]
    );

    if (filas.length === 0) {
        const actual = await obtenerComprobante(id);
        if (!actual) {
            return null;
        }
        throw crearError('El comprobante ya está anulado', 400);
    }

    return obtenerComprobante(id);
};

const obtenerComprobante = async (id) => {
    const [cabeceras] = await pool.query(
        `SELECT c.empresa_snapshot, c.detalle_snapshot, c.id_comprobante, c.id_venta, c.tipo, c.serie, c.numero, c.ruc, c.razon_social, c.cliente_nombre, c.cliente_email, c.cliente_dni_ruc, c.cliente_tipo_documento, c.enviado_por_email, c.fecha_envio_email, c.subtotal, c.costo_envio, c.igv, c.total, c.op_gravada, c.op_exonerada, c.estado, c.numero_sunat, c.nota_credito_sunat, c.motivo_anulacion, c.fecha_anulacion, c.fecha_emision, v.id_usuario, v.origen, v.cliente_nombre AS cliente_nombre_venta, v.estado AS estado_venta, v.tipo_entrega, v.correo_compra, v.external_reference, u.nombre AS nombre_usuario, u.apellido AS apellido_usuario, u.email AS correo_usuario FROM comprobantes c INNER JOIN ventas v ON c.id_venta = v.id_venta LEFT JOIN usuarios u ON v.id_usuario = u.id_usuario WHERE c.id_comprobante = ? LIMIT 1`,
        [id]
    );

    if (cabeceras.length === 0) {
        return null;
    }

    const cabecera = cabeceras[0];
    const detalle = Array.isArray(cabecera.detalle_snapshot) ? cabecera.detalle_snapshot : await obtenerDetalleVenta(cabecera.id_venta);

    return {
        ...cabeceras[0],
        ...(cabecera.empresa_snapshot ? { emisor_nombre_comercial: cabecera.empresa_snapshot.nombre_comercial, emisor_direccion: cabecera.empresa_snapshot.direccion } : {}),
        subtotal: Number(cabeceras[0].subtotal),
        costo_envio: Number(cabeceras[0].costo_envio),
        igv: Number(cabeceras[0].igv),
        total: Number(cabeceras[0].total),
        op_gravada: Number(cabeceras[0].op_gravada || 0),
        op_exonerada: Number(cabeceras[0].op_exonerada || 0),
        detalle
    };
};

module.exports = {
    generarComprobante,
    listarComprobantes,
    listarResumen,
    obtenerComprobante,
    anular,
    esClienteDniRucValido,
    normalizarTipoDocumentoCliente,
    validarDatosClienteFactura
};
