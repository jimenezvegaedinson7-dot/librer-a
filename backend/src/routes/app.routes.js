const express = require('express');

const router = express.Router();

const { obtenerVersion } = require('../controllers/app.controller');

// ========================================
// VERSIÓN DE LA APP ANDROID (PÚBLICA)
// La app la consulta al iniciar, incluso antes de iniciar sesión.
// ========================================
router.get(
    '/version',
    obtenerVersion
);

module.exports = router;
