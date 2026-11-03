import { useCallback, useEffect, useRef, useState } from 'react';
import { imprimirDocumento } from '../utils/imprimirDocumento';

export function useImpresion(documentoRef) {
    const enCurso = useRef(false);
    const activo = useRef(true);
    const [imprimiendo, setImprimiendo] = useState(false);
    const [errorImpresion, setErrorImpresion] = useState('');
    useEffect(() => {
        activo.current = true;
        return () => { activo.current = false; };
    }, []);
    const imprimir = useCallback(async () => {
        if (enCurso.current || !documentoRef.current) return;
        enCurso.current = true;
        setImprimiendo(true);
        setErrorImpresion('');
        try {
            await imprimirDocumento(documentoRef.current);
        } catch {
            if (activo.current) setErrorImpresion('No se pudo abrir la impresión. Inténtalo de nuevo.');
        } finally {
            enCurso.current = false;
            if (activo.current) setImprimiendo(false);
        }
    }, [documentoRef]);
    return { imprimir, imprimiendo, errorImpresion };
}
