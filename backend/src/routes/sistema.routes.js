const router = require('express').Router();
const { saludServidor, saludApi, probarBaseDeDatos } = require('../controllers/sistema.controller');
const verificarToken = require('../middlewares/auth.middleware');
const verificarRol = require('../middlewares/rol.middleware');

router.get('/', saludServidor);
router.get('/api', saludApi);
router.get('/api/test-db', verificarToken, verificarRol('administrador'), probarBaseDeDatos);

module.exports = router;
