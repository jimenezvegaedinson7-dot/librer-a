const express = require('express');

const router = express.Router();

const {
    registrar,
    listar,
    resumen,
    obtener,
    responder
} = require('../controllers/reclamacion.controller');

const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');
const { reclamacionLimiter } = require('../middlewares/rateLimit');

// ========================================
// LIBRO DE RECLAMACIONES
// ========================================

// Público: cualquier consumidor puede registrar una hoja (con o sin cuenta).
router.post('/', reclamacionLimiter, registrar);

// Administrador
router.get('/', verificarToken, verificarRol('administrador'), listar);
router.get('/resumen', verificarToken, verificarRol('administrador'), resumen);
router.get('/:id', verificarToken, verificarRol('administrador'), obtener);
router.put('/:id/respuesta', verificarToken, verificarRol('administrador'), responder);

module.exports = router;
