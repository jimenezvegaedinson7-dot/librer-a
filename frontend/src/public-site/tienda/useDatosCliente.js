import { useEffect, useMemo, useState } from 'react';
import { clienteApi } from './clienteApi';

// Solo datos del perfil validado y compras propias devueltas por la API.
// No se consultan las credenciales ni los datos del administrador.
export function useDatosCliente(tienda) {
    const [compra, setCompra] = useState(null);
    useEffect(() => {
        if (!tienda.usuario || tienda.revisando || tienda.errorSesion) return undefined;
        let activo = true;
        clienteApi.compras(tienda.sesion).then(json => {
            if (!activo) return;
            const compras = (Array.isArray(json.data) ? json.data : [])
                .filter(v => ['pagada', 'entregada'].includes(v.estado))
                .sort((a, b) => Number(b.id_venta) - Number(a.id_venta));
            setCompra(compras[0] || null);
        }).catch(() => { if (activo) setCompra(null); });
        return () => { activo = false; };
    }, [tienda.sesion, tienda.revisando, tienda.errorSesion, tienda.usuario]);
    return useMemo(() => {
        if (tienda.revisando || tienda.errorSesion || !tienda.usuario) return {};
        const u = tienda.usuario;
        return {
            nombre: [u.nombre, u.apellido].filter(Boolean).join(' ').trim(),
            email: u.email || '', telefono: u.telefono || '',
            documento: u.documento_identidad || compra?.cliente_documento || '',
            tipoDocumento: u.tipo_documento || compra?.cliente_tipo_documento || 'DNI',
            direccion: u.direccion || (compra?.tipo_entrega === 'domicilio' ? compra.direccion : '') || '',
        };
    }, [tienda.usuario, tienda.revisando, tienda.errorSesion, compra]);
}
