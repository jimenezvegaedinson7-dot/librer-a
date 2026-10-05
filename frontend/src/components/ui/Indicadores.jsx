import { Children } from 'react';

import { motion } from 'motion/react';

// Columnas según cuántas tarjetas haya, para que la fila quede completa.
const columnas = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'grid-cols-2 xl:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5',
};

// Fila de tarjetas KPI (StatCard) con la misma entrada escalonada del dashboard.
export function Indicadores({ etiqueta, children }) {
    const cantidad = Children.toArray(children).filter(Boolean).length;

    return (
        <motion.section
            aria-label={etiqueta}
            initial="oculto"
            animate="visible"
            variants={{ oculto: {}, visible: { transition: { staggerChildren: 0.06 } } }}
            className={`grid gap-3 sm:gap-4 ${cantidad >= 4 ? '' : 'grid-cols-1 '}${columnas[cantidad] || 'grid-cols-2 xl:grid-cols-4'} xl:gap-5`}
        >
            {children}
        </motion.section>
    );
}
