const express = require('express');

const router = express.Router();

const {
    listarProvincias,
    listarDistritos,
    actualizarTarifaDistrito
} = require('../controllers/ubicacion.controller');

const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

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

// ========================================
// TARIFA DE ENVÍO DE UN DISTRITO (SOLO ADMINISTRADOR)
// ========================================
router.put(
    '/distritos/:id',
    verificarRol('administrador'),
    actualizarTarifaDistrito
);

module.exports = router;