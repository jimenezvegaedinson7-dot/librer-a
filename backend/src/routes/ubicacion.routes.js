const express = require('express');

const router = express.Router();

const { listarProvincias, listarDistritos, actualizarTarifaDistrito } = require('../controllers/ubicacion.controller');
const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

router.use(verificarToken);
router.get('/provincias', listarProvincias);
router.get('/provincias/:id_provincia/distritos', listarDistritos);
router.put('/distritos/:id', verificarRol('administrador'), actualizarTarifaDistrito);

module.exports = router;
