function validarPassword(password) {
    const texto = String(password || '');
    if (texto.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
    if (!/[a-zA-Z]/.test(texto)) return 'La contraseña debe contener al menos una letra';
    if (!/\d/.test(texto)) return 'La contraseña debe contener al menos un número';
    return true;
}

function datosPublicos(usuario) {
    return {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        telefono: usuario.telefono,
        foto_perfil: usuario.foto_perfil,
        rol: usuario.rol,
        estado: usuario.estado,
        fecha_registro: usuario.fecha_registro,
        two_factor_enabled: usuario.two_factor_enabled
    };
}

module.exports = { validarPassword, datosPublicos };
