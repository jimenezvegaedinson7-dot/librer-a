const {
    obtenerTodos,
    obtenerActivo,
    obtenerPorId,
    crear,
    actualizar,
    eliminar
} = require('../models/anuncio.model');

const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const usuarioModel = require('../models/usuario.model');

const {
    publicIdDesdeUrl,
    tipoDesdeUrl,
    eliminarRecurso
} = require('../utils/cloudinary');

const {
    validarId,
    esEstadoValido
} = require('../utils/validaciones');

const { carpetaVideos } = require('../middlewares/uploadVideo.middleware');

// Título, textos y estado: el video llega siempre como archivo subido.
// Aceptar una URL de video en el body permitía publicar cualquier enlace.
const CAMPOS_PERMITIDOS = new Set([
    'titulo',
    'etiqueta',
    'descripcion',
    'boton_texto',
    'boton_enlace',
    'estado'
]);

// ========================================
// TEXTOS QUE ACOMPAÑAN AL VIDEO EN LA PORTADA
// Todos opcionales. Una cadena vacía los borra (la web usa sus textos
// por defecto). El enlace del botón solo admite rutas internas de la
// web, como /catalogo: un enlace externo en la portada no lo decide
// un formulario.
// ========================================
const TEXTOS = [
    { campo: 'etiqueta', clave: 'etiqueta', max: 80, nombre: 'La etiqueta' },
    { campo: 'descripcion', clave: 'descripcion', max: 400, nombre: 'La descripción' },
    { campo: 'boton_texto', clave: 'botonTexto', max: 40, nombre: 'El texto del botón' },
    { campo: 'boton_enlace', clave: 'botonEnlace', max: 200, nombre: 'El enlace del botón' }
];

const RUTA_INTERNA = /^\/(?!\/)[A-Za-z0-9\-._~/?=&%#]*$/;

// Devuelve { error } o { datos } con solo los campos que llegaron.
const leerTextos = (body) => {
    const datos = {};

    for (const { campo, clave, max, nombre } of TEXTOS) {
        if (body[campo] === undefined) {
            continue;
        }

        if (typeof body[campo] !== 'string') {
            return { error: `${nombre} no es válido` };
        }

        const valor = body[campo].trim();

        if (valor.length > max) {
            return { error: `${nombre} no puede superar los ${max} caracteres` };
        }

        if (campo === 'boton_enlace' && valor && !RUTA_INTERNA.test(valor)) {
            return { error: 'El enlace del botón debe ser una ruta de la web, por ejemplo /catalogo' };
        }

        datos[clave] = valor || null;
    }

    return { datos };
};

const MENSAJE_SIN_VIDEO =
    'Debes subir un video para publicar el anuncio';

// ========================================
// BORRAR EL VIDEO ANTERIOR
// Se hace después de confirmar el guardado, envuelto en try/catch:
// si Cloudinary falla, el anuncio ya está correcto en la base y no
// vale la pena cancelar la operación por un archivo huérfano.
//
// Sin Cloudinary configurado el video vive en /uploads/videos, y ahí
// no hay public_id que borrar: hay que quitar el archivo del disco,
// o cada reemplazo deja 50 MB ocupa la carpeta para siempre.
// ========================================
const PREFIJO_VIDEO_LOCAL = '/uploads/videos/';

const borrarVideoLocal = (urlAnterior) => {
    if (typeof urlAnterior !== 'string' ||
        !urlAnterior.startsWith(PREFIJO_VIDEO_LOCAL)) {
        return;
    }

    const nombre = path.basename(urlAnterior);

    if (!nombre) {
        return;
    }

    try {
        const destino = path.join(
            carpetaVideos,
            nombre
        );

        if (fs.existsSync(destino)) {
            fs.unlinkSync(destino);
        }
    } catch (error) {
        console.error(
            '[anuncios] No se pudo borrar el video local:',
            error.message
        );
    }
};

const borrarVideoAnterior = async (urlAnterior) => {
    if (typeof urlAnterior !== 'string') {
        return;
    }

    if (urlAnterior.startsWith(PREFIJO_VIDEO_LOCAL)) {
        borrarVideoLocal(urlAnterior);
        return;
    }

    const publicId = publicIdDesdeUrl(urlAnterior);

    if (!publicId) {
        return;
    }

    try {
        await eliminarRecurso(
            publicId,
            tipoDesdeUrl(urlAnterior) || 'video'
        );
    } catch (error) {
        console.error(
            '[anuncios] No se pudo borrar el video anterior:',
            error.message
        );
    }
};

// ========================================
// LISTAR (panel)
// ========================================
const listarAnuncios = async (req, res) => {
    try {
        const anuncios = await obtenerTodos();

        res.json(anuncios);
    } catch (error) {
        console.error('[anuncios] Error al listar:', error.message);
        res.status(500).json({
            success: false,
            mensaje: 'Error al obtener los anuncios'
        });
    }
};

// ========================================
// OBTENER EL ACTIVO (web pública, sin token)
// ========================================
const obtenerAnuncioActivo = async (req, res) => {
    try {
        const anuncio = await obtenerActivo();

        res.json({
            success: true,
            anuncio
        });
    } catch (error) {
        console.error('[anuncios] Error al obtener el activo:', error.message);
        res.status(500).json({
            success: false,
            mensaje: 'Error al obtener el anuncio'
        });
    }
};

// ========================================
// CREAR
// ========================================
const crearAnuncio = async (req, res) => {
    try {
        const {
            titulo,
            estado
        } = req.body;

        // El middleware deja la URL resuelta cuando sube a Cloudinary. Sin
        // Cloudinary configurado deja el archivo en disco, y ahí la URL se
        // arma aquí, igual que hace libro.controller con las portadas:
        // /uploads está servido como estático en server.js.
        for (const campo of Object.keys(req.body || {})) {
            if (!CAMPOS_PERMITIDOS.has(campo)) {
                return res.status(400).json({
                    success: false,
                    mensaje: `Campo no permitido: ${campo}`
                });
            }
        }

        const videoUrl =
            req.file?.cloudinaryUrl ||
            (req.file?.filename
                ? `/uploads/videos/${req.file.filename}`
                : null);
        const publicId =
            req.file?.publicId ||
            null;

        if (typeof titulo !== 'string' || !titulo.trim()) {
            return res.status(400).json({
                success: false,
                mensaje: 'El título del anuncio es obligatorio'
            });
        }

        if (titulo.trim().length > 200) {
            return res.status(400).json({
                success: false,
                mensaje: 'El título no puede superar los 200 caracteres'
            });
        }

        if (!videoUrl) {
            return res.status(400).json({
                success: false,
                mensaje: MENSAJE_SIN_VIDEO
            });
        }

        if (estado !== undefined && !esEstadoValido(estado)) {
            return res.status(400).json({
                success: false,
                mensaje: 'El estado debe ser activo o inactivo'
            });
        }

        const textos = leerTextos(req.body);

        if (textos.error) {
            return res.status(400).json({
                success: false,
                mensaje: textos.error
            });
        }

        const anuncio = await crear({
            ...textos.datos,
            titulo: titulo.trim(),
            videoUrl,
            videoPublicId: publicId,
            estado: estado === undefined ? 1 : Number(estado)
        });

        res.status(201).json({
            success: true,
            mensaje: 'Anuncio publicado correctamente',
            anuncio
        });
    } catch (error) {
        console.error('[anuncios] Error al crear:', error.message);
        res.status(500).json({
            success: false,
            mensaje: 'Error al publicar el anuncio'
        });
    }
};

// ========================================
// ACTUALIZAR
// Solo se procesan los campos conocidos: el body es entrada del
// cliente y no puede mandar a escribir en columnas que no le tocan.
// ========================================
const actualizarAnuncio = async (req, res) => {
    try {
        const { id } = req.params;

        if (!validarId(id)) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de anuncio no válido'
            });
        }

        const existente = await obtenerPorId(id);

        if (!existente) {
            return res.status(404).json({
                success: false,
                mensaje: 'El anuncio no existe'
            });
        }

        const { titulo, estado } = req.body;

        for (const campo of Object.keys(req.body)) {
            if (!CAMPOS_PERMITIDOS.has(campo)) {
                return res.status(400).json({
                    success: false,
                    mensaje: `Campo no permitido: ${campo}`
                });
            }
        }

        if (titulo !== undefined) {
            if (typeof titulo !== 'string' || !titulo.trim()) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'El título del anuncio es obligatorio'
                });
            }

            if (titulo.trim().length > 200) {
                return res.status(400).json({
                    success: false,
                    mensaje: 'El título no puede superar los 200 caracteres'
                });
            }
        }

        if (estado !== undefined && !esEstadoValido(estado)) {
            return res.status(400).json({
                success: false,
                mensaje: 'El estado debe ser activo o inactivo'
            });
        }

        const textos = leerTextos(req.body);

        if (textos.error) {
            return res.status(400).json({
                success: false,
                mensaje: textos.error
            });
        }

        // Si no llega video nuevo se conserva el anterior: cambiar el
        // título o pausar un anuncio no puede dejarlos sin archivo.
        // Mismo criterio que en el alta: Cloudinary resuelve la URL, y sin
        // Cloudinary el archivo quedó en /uploads/videos.
        const videoNuevo =
            req.file?.cloudinaryUrl ||
            (req.file?.filename
                ? `/uploads/videos/${req.file.filename}`
                : null) ||
            null;

        const videoUrl =
            videoNuevo || existente.video_url;

        // El public_id solo se reemplaza si el archivo cambió de verdad.
        // Si el admin reenvía la misma URL a mano, se conserva el id
        // guardado para no perder la referencia al archivo de Cloudinary.
        const publicId = req.file?.publicId
            || (videoNuevo && videoNuevo !== existente.video_url
                ? null
                : existente.video_public_id);

        const cambioDeVideo =
            videoUrl !== existente.video_url;

        // Los textos que no llegan conservan su valor: pausar un anuncio
        // desde la tabla no puede borrar lo que se escribió en el formulario.
        const anuncio = await actualizar(id, {
            etiqueta: existente.etiqueta,
            descripcion: existente.descripcion,
            botonTexto: existente.boton_texto,
            botonEnlace: existente.boton_enlace,
            posterUrl: existente.poster_url,
            ...textos.datos,
            titulo: titulo === undefined
                ? existente.titulo
                : titulo.trim(),
            videoUrl,
            videoPublicId: publicId,
            estado: estado === undefined
                ? existente.estado
                : Number(estado)
        });

        if (cambioDeVideo) {
            await borrarVideoAnterior(
                existente.video_url
            );
        }

        res.json({
            success: true,
            mensaje: 'Anuncio actualizado correctamente',
            anuncio
        });
    } catch (error) {
        console.error('[anuncios] Error al actualizar:', error.message);
        res.status(500).json({
            success: false,
            mensaje: 'Error al actualizar el anuncio'
        });
    }
};

// ========================================
// ELIMINAR
// Pide contraseña como el resto de borrados del panel: el video hay que
// volver a subirlo y es el único respaldo si se borra por error.
// ========================================
const eliminarAnuncio = async (req, res) => {
    try {
        const { id } = req.params;
        // req.body llega undefined si la peticion no traia cuerpo, o si
        // traia un content-type que ningun parser reconoce. Sin este
        // defecto, un DELETE sin cuerpo revienta con un 500 en vez de
        // devolver un 400 explicando que falta la contrasena.
        const { password } = req.body || {};

        if (!validarId(id)) {
            return res.status(400).json({
                success: false,
                mensaje: 'ID de anuncio no válido'
            });
        }

        if (
            typeof password !== 'string' ||
            !password.trim()
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'La contraseña es obligatoria para eliminar un anuncio'
            });
        }

        const usuario =
            await usuarioModel.buscarPorIdConPassword(
                req.usuario.id_usuario
            );

        if (!usuario || Number(usuario.estado) !== 1) {
            return res.status(401).json({
                success: false,
                mensaje: 'No se pudo identificar a un administrador activo'
            });
        }

        const passwordCorrecta =
            await bcrypt.compare(
                password,
                usuario.password
            );

        if (!passwordCorrecta) {
            return res.status(401).json({
                success: false,
                mensaje: 'Contraseña incorrecta'
            });
        }

        const existente = await obtenerPorId(id);

        if (!existente) {
            return res.status(404).json({
                success: false,
                mensaje: 'El anuncio no existe'
            });
        }

        const borrado = await eliminar(id);

        if (!borrado) {
            return res.status(500).json({
                success: false,
                mensaje: 'No se pudo eliminar el anuncio'
            });
        }

        await borrarVideoAnterior(
            existente.video_url
        );

        res.json({
            success: true,
            mensaje: 'Anuncio eliminado correctamente'
        });
    } catch (error) {
        console.error('[anuncios] Error al eliminar:', error.message);
        res.status(500).json({
            success: false,
            mensaje: 'Error al eliminar el anuncio'
        });
    }
};

module.exports = {
    listarAnuncios,
    obtenerAnuncioActivo,
    crearAnuncio,
    actualizarAnuncio,
    eliminarAnuncio
};
