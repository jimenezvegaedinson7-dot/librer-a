const sistemaModel = require('../models/sistema.model');

function saludServidor(_req, res) {
    return res.json({ mensaje: 'Servidor de MATIDANA funcionando' });
}

function saludApi(_req, res) {
    return res.json({ mensaje: 'API de MATIDANA funcionando correctamente', capacidades: { descuentos_libros: true, anuncios_video: true, libros_nuevos: true } });
}

async function probarBaseDeDatos(_req, res) {
    try {
        const resultado = await sistemaModel.comprobarConexion();
        return res.json({ mensaje: 'Conexión con PostgreSQL exitosa', resultado });
    } catch (error) {
        console.error('Error de PostgreSQL:', error);
        return res.status(500).json({ mensaje: 'Error al conectar con PostgreSQL' });
    }
}

module.exports = { saludServidor, saludApi, probarBaseDeDatos };
