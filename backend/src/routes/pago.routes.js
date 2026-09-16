const express = require('express');

const router = express.Router();

const {
    crearOrden,
    obtenerOrden,
    webhookPago,
    renderCheckoutPage,
    renderRespuestaPage,
    listarPagosAdmin
} = require('../controllers/pago.controller');

const pagoModel = require('../models/pago.model');

const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');
const { webhookLimit } = require('../middlewares/rateLimit');

// ========================================
// PÁGINAS PÚBLICAS DEL CHECKOUT (se abren en el navegador)
// GET /checkout/:externalReference -> auto-envía el form WebCheckout a PayU
// GET /respuesta/:externalReference -> página de retorno (responseUrl)
// ========================================
router.get(
    '/checkout/:externalReference',
    renderCheckoutPage
);

router.get(
    '/respuesta/:externalReference',
    renderRespuestaPage
);

// ========================================
// WEBHOOK DE PAYU (PÚBLICO, CON RATE LIMIT)
// PayU envía el confirmation URL como application/x-www-form-urlencoded.
// ========================================
router.post(
    '/webhook',
    webhookLimit,
    express.urlencoded({ extended: false }),
    express.json(),
    webhookPago
);

// ========================================
// RUTAS REQUIEREN JWT
// ========================================
router.use(verificarToken);

// ========================================
// LISTAR PAGOS (SOLO ADMIN)
// ========================================
router.get(
    '/',
    verificarRol('administrador'),
    listarPagosAdmin
);

// ========================================
// RESUMEN GLOBAL DE PAGOS (SOLO ADMIN)
// Declarado ANTES de /:orderId para que "resumen"
// no sea interpretado como un orderId.
// ========================================
router.get(
    '/resumen',
    verificarRol('administrador'),
    async (req, res) => {
        try {
            const resumen =
                await pagoModel.listarResumen();

            return res.json({
                success: true,
                pagado: resumen.pagado,
                pendiente: resumen.pendiente,
                cancelado: resumen.cancelado,
                ingresos: resumen.ingresos
            });

        } catch (error) {
            console.error(
                'Error al obtener el resumen de pagos:',
                error
            );

            return res.status(500).json({
                success: false,
                mensaje:
                    'Error al obtener el resumen de pagos'
            });
        }
    }
);

// ========================================
// CREAR ORDEN DE PAGO
// ========================================
router.post(
    '/crear-orden',
    crearOrden
);

// ========================================
// OBTENER ESTADO DE UNA ORDEN
// ========================================
router.get(
    '/:orderId',
    obtenerOrden
);

module.exports = router;
