require('dotenv').config();

const clave2FA = process.env.TWO_FACTOR_ENCRYPTION_KEY;

if (!clave2FA || String(clave2FA).length < 16) {
    throw new Error('TWO_FACTOR_ENCRYPTION_KEY debe existir y tener al menos 16 caracteres');
}

const express = require('express');
const crearCors = require('./src/config/cors');
const helmet = require('helmet');
const path = require('path');

const pool = require('./src/config/database');
const manejarErrores = require('./src/middlewares/error.middleware');
const { baseLimiter } = require('./src/middlewares/rateLimit');
const verificarToken = require('./src/middlewares/auth.middleware');
const verificarRol = require('./src/middlewares/rol.middleware');
const { iniciarJobs } = require('./src/jobs/limpieza');
const libroRoutes = require('./src/routes/libro.routes');
const autorRoutes = require('./src/routes/autor.routes');
const categoriaRoutes = require('./src/routes/categoria.routes');
const inventarioRoutes = require('./src/routes/inventario.routes');
const ventaRoutes = require('./src/routes/venta.routes');
const authRoutes = require('./src/routes/auth.routes');
const historialRoutes = require('./src/routes/historial.routes');
const reporteRoutes = require('./src/routes/reporte.routes');
const usuarioRoutes = require('./src/routes/usuario.routes');
const favoritoRoutes = require('./src/routes/favorito.routes');
const pagoRoutes = require('./src/routes/pago.routes');
const pedidoRoutes = require('./src/routes/pedido.routes');
const ubicacionRoutes = require('./src/routes/ubicacion.routes');
const zonaDeliveryRoutes = require('./src/routes/zonaDelivery.routes');
const agenciaRoutes = require('./src/routes/agencia.routes');
const empresaRoutes = require('./src/routes/empresa.routes');
const comprobanteRoutes = require('./src/routes/comprobante.routes');
const clienteRoutes = require('./src/routes/cliente.routes');
const appRoutes = require('./src/routes/app.routes');
const reclamacionRoutes = require('./src/routes/reclamacion.routes');
const anuncioRoutes = require('./src/routes/anuncio.routes');
const asistenteRoutes = require('./src/routes/asistente.routes');

const app = express();

app.set('trust proxy', ['1', 'true'].includes(String(process.env.TRUST_PROXY || '').toLowerCase()) ? 1 : false);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const PORT = process.env.PORT || 3000;

app.use(crearCors());
app.use(express.json({ limit: '1mb' }));
app.use(baseLimiter);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.json({ mensaje: 'Servidor de MATIDANA funcionando' });
});

app.get('/api', (req, res) => {
    res.json({ mensaje: 'API de MATIDANA funcionando correctamente', capacidades: { descuentos_libros: true, anuncios_video: true, libros_nuevos: true } });
});

app.get('/api/test-db', verificarToken, verificarRol('administrador'), async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT 1 AS resultado');

        res.json({ mensaje: 'Conexión con PostgreSQL exitosa', resultado: rows[0].resultado });
    } catch (error) {
        console.error('Error de PostgreSQL:', error);

        res.status(500).json({ mensaje: 'Error al conectar con PostgreSQL' });
    }
});

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

app.use((req, res) => {
    res.status(404).json({ success: false, mensaje: 'Ruta no encontrada' });
});

app.use(manejarErrores);

iniciarJobs();

const { aplicarMigraciones, aplicarMigracionesDatos } = require('./src/config/migraciones');

async function iniciar() {
    if (process.env.NODE_ENV !== 'test') {
        await aplicarMigraciones(pool);

        await aplicarMigracionesDatos(pool);
    }

    app.listen(PORT, () => {
        console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    });
}

iniciar().catch((error) => {
    console.error('[bootstrap] Arranque abortado:', error.message);
    process.exit(1);
});
