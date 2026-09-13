import { useCallback, useEffect, useRef, useState } from 'react';

import { validarFormulario } from '../utils/validaciones';

// ============================================================
// HOOK: useFormulario
// Centraliza el estado de formularios con validación por campo,
// sanitización y manejo de errores de forma consistente.
// ============================================================
export function useFormulario({
    inicial,
    reglas = null,
    sanitizar = null,
}) {
    const [formulario, setFormulario] = useState(inicial);
    const [errores, setErrores] = useState({});
    const [tocados, setTocados] = useState({});
    const formularioRef = useRef(formulario);

    useEffect(() => {
        formularioRef.current = formulario;
    }, [formulario]);

    // Recalcular cuando cambian las reglas o el formulario inicial
    useEffect(() => {
        setFormulario(inicial);
        setErrores({});
        setTocados({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(inicial ?? {})]);

    const validarTodos = useCallback(() => {
        const { errores: e, valido } = validarFormulario(formularioRef.current, reglas);
        setErrores(e);
        return { errores: e, valido };
    }, [reglas]);

    const manejarCambio = useCallback(
        (e) => {
            const { name, value } = e.target;
            setFormulario((anterior) => {
                let nuevoValor = value;
                if (sanitizar?.[name]) nuevoValor = sanitizar[name](value);
                const siguiente = { ...anterior, [name]: nuevoValor };
                formularioRef.current = siguiente;
                return siguiente;
            });

            setTocados((prev) => ({ ...prev, [name]: true }));

            // Validar el campo individual (solo si ya fue tocado o tiene error)
            if (reglas?.[name] && (tocados[name] || errores[name])) {
                setErrores((prev) => {
                    for (const validador of reglas[name]) {
                        const mensaje = validador(
                            formularioRef.current[name],
                            formularioRef.current,
                        );
                        if (mensaje) return { ...prev, [name]: mensaje };
                    }
                    const copia = { ...prev };
                    delete copia[name];
                    return copia;
                });
            }
        },
        [reglas, errores, tocados, sanitizar],
    );

    const marcarErrores = useCallback(
        (nuevosErrores) => {
            setErrores((prev) => ({ ...prev, ...nuevosErrores }));
            setTocados((prev) => {
                const siguiente = { ...prev };
                for (const campo of Object.keys(nuevosErrores || {})) siguiente[campo] = true;
                return siguiente;
            });
        },
        [],
    );

    const restablecer = useCallback(() => {
        setFormulario(inicial);
        setErrores({});
        setTocados({});
        formularioRef.current = inicial;
    }, [inicial]);

    return {
        formulario,
        errores,
        tocados,
        setFormulario,
        manejarCambio,
        validarTodos,
        marcarErrores,
        restablecer,
    };
}
