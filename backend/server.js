require('dotenv').config();

// ===============================
// VALIDAR CLAVE DE CIFRADO 2FA
// (fail-secure: no arrancar sin ella)
// ===============================
const clave2FA =
    process.env.TWO_FACTOR_ENCRYPTION_KEY;

if (
    !clave2FA ||
    String(clave2FA).length < 16
) {
    throw new Error(
        'TWO_FACTOR_ENCRYPTION_KEY debe existir y tener al menos 16 caracteres'
    );
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const pool = require('./src/config/database');
const manejarErrores = require('./src/middlewares/error.middleware');
const { baseLimiter } = require('./src/middlewares/rateLimit');
const verificarToken = require('./src/middlewares/auth.middleware');
const verificarRol = require('./src/middlewares/rol.middleware');
const { iniciarJobs } = require('./src/jobs/limpieza');

// ===============================
// IMPORTAR RUTAS
// ===============================
const libroRoutes = require('./src/routes/libro.routes');
const autorRoutes = require('./src/routes/autor.routes');
const categoriaRoutes = require('./src/routes/categoria.routes');
const inventarioRoutes = require('./src/routes/inventario.routes');
const reservaRoutes = require('./src/routes/reserva.routes');
const ventaRoutes = require('./src/routes/venta.routes');
const authRoutes = require('./src/routes/auth.routes');
const historialRoutes = require('./src/routes/historial.routes');
const reporteRoutes = require('./src/routes/reporte.routes');
const usuarioRoutes = require('./src/routes/usuario.routes');
const favoritoRoutes = require('./src/routes/favorito.routes');
const pagoRoutes = require('./src/routes/pago.routes');
const ubicacionRoutes = require('./src/routes/ubicacion.routes');
const agenciaRoutes = require('./src/routes/agencia.routes');
const empresaRoutes = require('./src/routes/empresa.routes');
const comprobanteRoutes = require('./src/routes/comprobante.routes');
const clienteRoutes = require('./src/routes/cliente.routes');
const appRoutes = require('./src/routes/app.routes');

// ===============================
// CONFIGURACIÓN DE EXPRESS
// ===============================
const app = express();

// ===============================
// TRUST PROXY
// ===============================
// Solo confiar en el primer hop cuando el despliegue realmente
// usa un reverse proxy que sobrescribe X-Forwarded-For.
// ===============================
app.set(
    'trust proxy',
    ['1', 'true'].includes(
        String(process.env.TRUST_PROXY || '').toLowerCase()
    )
        ? 1
        : false
);

// ===============================
// SEGURIDAD (helmet)
// - Sin CSP para no interferir con el panel (imágenes servidas
//   desde el backend en otro puerto).
// - crossOriginResourcePolicy: 'cross-origin' permite que el panel
//   (React en :5173) cargue portadas desde /uploads.
// - helmet elimina el header X-Powered-By de Express.
// ===============================
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: {
        policy: 'cross-origin'
    }
}));

const PORT = process.env.PORT || 3000;

// ===============================
// MIDDLEWARE
// ===============================
const origenesPermitidos = process.env.FRONTEND_ORIGINS
    ? process.env.FRONTEND_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origenesPermitidos.includes(origin)) {
            return callback(null, true);
        }

        return callback(
            new Error('Origen no permitido por CORS'),
            false
        );
    }
}));

app.use(express.json({ limit: '1mb' }));

// ===============================
// RATE LIMITING GLOBAL
// ===============================
app.use(baseLimiter);

// ===============================
// ARCHIVOS ESTÁTICOS - PORTADAS
// ===============================
app.use(
    '/uploads',
    express.static(
        path.join(__dirname, 'uploads')
    )
);

// ===============================
// RUTA PRINCIPAL
// ===============================
app.get('/', (req, res) => {
    res.json({
        mensaje: 'Servidor de Librería funcionando'
    });
});

// ===============================
// API PRINCIPAL
// ===============================
app.get('/api', (req, res) => {
    res.json({
        mensaje: 'API de Librería funcionando correctamente'
    });
});

// ===============================
// PRUEBA DE CONEXIÓN MYSQL
// (SOLO ADMIN: requiere JWT + rol administrador)
// ===============================
app.get(
    '/api/test-db',
    verificarToken,
    verificarRol('administrador'),
    async (req, res) => {
        try {
            const [rows] = await pool.query(
                'SELECT 1 AS resultado'
            );

            res.json({
                mensaje: 'Conexión con MySQL exitosa',
                resultado: rows[0].resultado
            });

        } catch (error) {
            console.error(
                'Error de MySQL:',
                error
            );

            res.status(500).json({
                mensaje: 'Error al conectar con MySQL'
            });
        }
    }
);

// ===============================
// DIAGNÓSTICO TEMPORAL DE EGRESS (quitar tras resolver el SMTP)
// ===============================
app.get(
    '/api/debug-egress',
    async (req, res) => {
        const net = require('net');
        const { resolve4 } = require('dns').promises;
        const info = {};
        try {
            info.ipv4 = await resolve4('smtp.gmail.com');
        } catch (e) { info.dnsError = e.message; }
        for (const puerto of [465, 587, 25]) {
            const host = (info.ipv4 && info.ipv4[0]) || 'smtp.gmail.com';
            info['tcp:' + puerto] = await new Promise(r => {
                const s = net.connect({ host, port: puerto });
                s.setTimeout(8000, () => { s.destroy(); r('timeout'); });
                s.on('connect', () => { s.destroy(); r('ok'); });
                s.on('error', e => { s.destroy(); r(e.code || e.message); });
            });
        }
        try {
            const t0 = Date.now();
            const f = await fetch('https://api.ipify.org?format=json');
            info.https443 = (await f.text()).slice(0, 60) + ' ms=' + (Date.now() - t0);
        } catch (e) { info.https443 = 'error: ' + e.message; }
        res.json(info);
    }
);

// ===============================
// API DE LIBROS
// ===============================
app.use(
    '/api/libros',
    libroRoutes
);

// ===============================
// API DE AUTORES
// ===============================
app.use(
    '/api/autores',
    autorRoutes
);

// ===============================
// API DE CATEGORÍAS
// ===============================
app.use(
    '/api/categorias',
    categoriaRoutes
);

// ===============================
// API DE INVENTARIO
// ===============================
app.use(
    '/api/inventario',
    inventarioRoutes
);

// ===============================
// API DE RESERVAS
// ===============================
app.use(
    '/api/reservas',
    reservaRoutes
);

// ===============================
// API DE VENTAS
// ===============================
app.use(
    '/api/ventas',
    ventaRoutes
);

// ===============================
// API DE AUTENTICACIÓN
// ===============================
app.use(
    '/api/auth',
    authRoutes
);

// ===============================
// API DE HISTORIAL
// ===============================
app.use(
    '/api/historial',
    historialRoutes
);

// ===============================
// API DE REPORTES
// ===============================
app.use(
    '/api/reportes',
    reporteRoutes
);

// ===============================
// API DE USUARIOS
// ===============================
app.use(
    '/api/usuarios',
    usuarioRoutes
);

// ===============================
// API DE PAGOS (PayU)
// ===============================
app.use(
    '/api/pagos',
    pagoRoutes
);

// ===============================
// API DE UBICACIONES (LIMA)
// ===============================
app.use(
    '/api/ubicaciones',
    ubicacionRoutes
);

// ===============================
// API DE AGENCIAS COURIER
// ===============================
app.use(
    '/api/agencias',
    agenciaRoutes
);

// ===============================
// API DE EMPRESA (EMISOR)
// ===============================
app.use(
    '/api/empresa',
    empresaRoutes
);

// ===============================
// API DE LA APP ANDROID (VERSIÓN PUBLICADA, PÚBLICA)
// ===============================
app.use(
    '/api/app',
    appRoutes
);

// ===============================
// API DE COMPROBANTES DE PAGO
// ===============================
app.use(
    '/api/comprobantes',
    comprobanteRoutes
);

app.use(
    '/api/clientes',
    clienteRoutes
);

// ===============================
// API DE FAVORITOS (LISTA DE DESEOS)
// ===============================
app.use(
    '/api/favoritos',
    favoritoRoutes
);

// ===============================
// RUTA NO ENCONTRADA
// ===============================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        mensaje: 'Ruta no encontrada'
    });
});

// ===============================
// MIDDLEWARE GLOBAL DE ERRORES
// (después del 404)
// ===============================
app.use(manejarErrores);

// ===============================
// JOBS DE LIMPIEZA
// ===============================
iniciarJobs();

// ===============================
// MIGRACIÓN: tabla favoritos
// ===============================
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS favoritos (
                id_usuario INT NOT NULL,
                id_libro   INT NOT NULL,
                fecha      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id_usuario, id_libro),
                CONSTRAINT fk_favoritos_usuario
                    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
                    ON DELETE CASCADE,
                CONSTRAINT fk_favoritos_libro
                    FOREIGN KEY (id_libro) REFERENCES libros(id_libro)
                    ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_favoritos_usuario ON favoritos (id_usuario);
            CREATE INDEX IF NOT EXISTS idx_favoritos_libro ON favoritos (id_libro);
        `);
        console.log('[migracion] Tabla favoritos verificada.');
    } catch (e) {
        console.error('[migracion] Error al crear favoritos:', e.message);
    }
})();

// ===============================
// MIGRACIÓN: cliente_documento en ventas
// ===============================
(async () => {
    try {
        await pool.query(`
            ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_documento VARCHAR(20) NULL;
            ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cliente_tipo_documento VARCHAR(10) NULL;
        `);
        console.log('[migracion] Columnas cliente_documento y cliente_tipo_documento verificadas en ventas.');
    } catch (e) {
        console.error('[migracion] Error al migrar ventas:', e.message);
    }
})();

// ===============================
// MIGRACIÓN: enviado_por_email en comprobantes
// ===============================
(async () => {
    try {
        await pool.query(`
            ALTER TABLE comprobantes ADD COLUMN IF NOT EXISTS enviado_por_email BOOLEAN DEFAULT FALSE;
            ALTER TABLE comprobantes ADD COLUMN IF NOT EXISTS fecha_envio_email TIMESTAMP NULL;
        `);
        console.log('[migracion] Columnas enviado_por_email y fecha_envio_email verificadas en comprobantes.');
    } catch (e) {
        console.error('[migracion] Error al migrar comprobantes email:', e.message);
    }
})();

// ===============================
// INICIAR SERVIDOR
// ===============================
app.listen(PORT, () => {
    console.log(
        `Servidor ejecutándose en http://localhost:${PORT}`
    );
});
