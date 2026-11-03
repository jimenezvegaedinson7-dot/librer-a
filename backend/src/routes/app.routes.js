const express = require('express');

const router = express.Router();

const { obtenerVersion } = require('../controllers/app.controller');

router.get('/version', obtenerVersion);

module.exports = router;
