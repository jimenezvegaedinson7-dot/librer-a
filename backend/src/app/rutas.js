const sistemaRoutes = require('../routes/sistema.routes');
const libroRoutes = require('../routes/libro.routes');
const autorRoutes = require('../routes/autor.routes');
const categoriaRoutes = require('../routes/categoria.routes');
const inventarioRoutes = require('../routes/inventario.routes');
const ventaRoutes = require('../routes/venta.routes');
const authRoutes = require('../routes/auth.routes');
const historialRoutes = require('../routes/historial.routes');
const reporteRoutes = require('../routes/reporte.routes');
const usuarioRoutes = require('../routes/usuario.routes');
const favoritoRoutes = require('../routes/favorito.routes');
const pagoRoutes = require('../routes/pago.routes');
const pedidoRoutes = require('../routes/pedido.routes');
const ubicacionRoutes = require('../routes/ubicacion.routes');
const zonaDeliveryRoutes = require('../routes/zonaDelivery.routes');
const agenciaRoutes = require('../routes/agencia.routes');
const empresaRoutes = require('../routes/empresa.routes');
const comprobanteRoutes = require('../routes/comprobante.routes');
const clienteRoutes = require('../routes/cliente.routes');
const appRoutes = require('../routes/app.routes');
const reclamacionRoutes = require('../routes/reclamacion.routes');
const anuncioRoutes = require('../routes/anuncio.routes');
const asistenteRoutes = require('../routes/asistente.routes');
const verificarToken = require('../middlewares/auth.middleware');

function montarRutas(app) {
    app.use('/', sistemaRoutes);
    app.use('/api/libros', libroRoutes);
    app.use('/api/autores', autorRoutes);
    app.use('/api/categorias', categoriaRoutes);
    app.use('/api/inventario', inventarioRoutes);
    app.use('/api/pedidos', pedidoRoutes);
    app.use('/api/reservas', verificarToken, (_req, res) =>
        res.status(410).json({ success: false, mensaje: 'El módulo de reservas fue eliminado. Compra desde la web o la app con PayU.' })
    );
    app.use('/api/ventas', ventaRoutes);
    app.use('/api/auth', authRoutes);
    app.use('/api/historial', historialRoutes);
    app.use('/api/reportes', reporteRoutes);
    app.use('/api/usuarios', usuarioRoutes);
    app.use('/api/pagos', pagoRoutes);
    app.use('/api/ubicaciones', ubicacionRoutes);
    app.use('/api/agencias', agenciaRoutes);
    app.use('/api/empresa', empresaRoutes);
    app.use('/api/app', appRoutes);
    app.use('/api/zonas-delivery', zonaDeliveryRoutes);
    app.use('/api/asistente', asistenteRoutes);
    app.use('/api/comprobantes', comprobanteRoutes);
    app.use('/api/clientes', clienteRoutes);
    app.use('/api/reclamaciones', reclamacionRoutes);
    app.use('/api/anuncios', anuncioRoutes);
    app.use('/api/favoritos', favoritoRoutes);
}

module.exports = { montarRutas };
