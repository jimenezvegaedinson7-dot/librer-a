const express = require('express');

const router = express.Router();

const {
    listarProvincias,
    listarDistritos
} = require('../controllers/ubicacion.controller');

const verificarToken = require('../middlewares/auth.middleware');

// ========================================
// REQUIEREN JWT (datos de envío)
// ========================================
router.use(verificarToken);

// ========================================
// PROVINCIAS DE LIMA
// ========================================
router.get(
    '/provincias',
    listarProvincias
);

// ========================================
// DISTRITOS DE UNA PROVINCIA
// ========================================
router.get(
    '/provincias/:id_provincia/distritos',
    listarDistritos
);

module.exports = router;