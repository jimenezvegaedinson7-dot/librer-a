import { initMotionProfesional, observeMotionProfesional } from './motion-profesional';

const SECCIONES = '.categorias, .catalogo, .ofertas, .banda-catalogo, .como-comprar, .vitrina-seccion, .video-destacado';

function marcar(root) {
    // Nunca animar secciones completas: contienen carruseles, foco y controles.
    root.querySelectorAll(SECCIONES).forEach((sec) => {
        sec.removeAttribute('data-reveal');
        sec.querySelectorAll('h2:not(.visualmente-oculto), .seccion__entrada, .categorias__entrada').forEach((el) => {
            el.dataset.reveal ||= el.tagName === 'H2' ? 'clip-up' : 'fade-up';
            if (el.hasAttribute('data-revelar')) el.setAttribute('data-visto', '');
        });
    });
    const listas = '.categorias__rejilla, .catalogo__pista, .ofertas__rejilla, .proceso, .vitrina';
    root.querySelectorAll(listas).forEach((grupo) => {
        grupo.dataset.revealGroup = '';
        grupo.dataset.revealStagger = grupo.matches('.proceso') ? '0.09' : '0.065';
        grupo.setAttribute('data-visto', '');
        [...grupo.children].forEach((el) => {
            if (el.getAttribute('aria-hidden') === 'true' || el.matches('.libro--esqueleto')) return;
            el.dataset.reveal ||= grupo.matches('.categorias__rejilla') ? 'lift' : 'fade-up';
        });
    });
    root.querySelectorAll('.banda-catalogo__fondo').forEach((el) => { el.dataset.parallax = '0.18'; });
    root.querySelectorAll('.banda-catalogo .boton, .vitrina .boton, .enlace-mas, .categorias__todas').forEach((el) => {
        el.dataset.btnMagnetic = '';
    });
    // En páginas interiores, una sola llegada breve; los formularios permanecen quietos.
    root.querySelectorAll('main > .migas, main > section > .contenedor > .seccion__titulo').forEach((el) => {
        el.dataset.reveal ||= 'fade';
    });
}

export function aplicarAnimacionesGlobales(root) {
    marcar(root);
    const motion = initMotionProfesional(root);
    const desconectar = observeMotionProfesional(root, () => { marcar(root); motion.scan(); });
    return () => { desconectar(); motion.revert(); };
}
