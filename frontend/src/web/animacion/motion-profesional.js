import { gsap } from './scroll';
import './motion-profesional.css';

// El libro, la navegación y las pantallas operativas tienen su propia coreografía.
const EXCLUIDOS = '.portada3d, .navegacion-publica, .barra-movil, .asistente-tienda, [role="dialog"]';
const SELECTOR = '[data-reveal], [data-parallax], [data-btn-magnetic]';
const numero = (valor, defecto, maximo) => {
    const n = Number(valor ?? defecto);
    return Number.isFinite(n) ? Math.min(maximo, Math.max(0, n)) : defecto;
};

function entrada(el, movil) {
    const tipo = el.dataset.reveal;
    const distancia = numero(el.dataset.revealDistance, movil ? 18 : 32, 64);
    const desde = { opacity: 0, y: distancia };
    if (tipo === 'fade') desde.y = 0;
    if (tipo === 'fade-down') desde.y = -distancia;
    if (tipo === 'fade-left' || tipo === 'fade-right') {
        desde.y = 0;
        desde.x = distancia * (tipo === 'fade-left' ? 1 : -1);
    }
    if (tipo === 'scale' || tipo === 'lift') desde.scale = 0.97;
    if (tipo === 'clip-up') {
        desde.opacity = 0.35;
        desde.y = distancia * 0.6;
        desde.clipPath = 'inset(0% 0% 100% 0%)';
    }
    if (tipo === 'clip-left') desde.clipPath = 'inset(0% 100% 0% 0%)';
    if (tipo === 'reveal-blur' && !movil) desde.filter = 'blur(3px)';
    return desde;
}

export function initMotionProfesional(root) {
    let escanear = () => {};
    const media = gsap.matchMedia();
    media.add({
        reducido: '(prefers-reduced-motion: reduce)',
        movil: '(max-width: 900px)',
        puntero: '(hover: hover) and (pointer: fine)',
        normal: '(prefers-reduced-motion: no-preference)',
    }, (contexto) => {
        const { reducido, movil, puntero } = contexto.conditions;
        const registrados = new Map();
        const eventos = new AbortController();
        const observador = new IntersectionObserver((entradas) => {
            entradas.forEach(({ target, isIntersecting }) => {
                if (!isIntersecting) return;
                observador.unobserve(target);
                if (target.dataset.motionState !== 'waiting') return;
                contexto.add(() => {
                    const desde = entrada(target, movil);
                    const grupo = target.closest('[data-reveal-group]');
                    const indice = grupo ? [...grupo.querySelectorAll('[data-reveal]')].indexOf(target) : 0;
                    const delay = numero(target.dataset.revealDelay, 0, 0.2)
                        + Math.min(Math.max(0, indice) * numero(grupo?.dataset.revealStagger, 0.065, 0.12), 0.28);
                    target.dataset.motionState = 'running';
                    const animacion = gsap.fromTo(target, desde, {
                        opacity: 1, x: 0, y: 0, scale: 1,
                        ...(desde.clipPath ? { clipPath: 'inset(0% 0% 0% 0%)' } : {}),
                        ...(desde.filter ? { filter: 'blur(0px)' } : {}),
                        duration: target.dataset.reveal.startsWith('clip') ? 0.85 : 0.65,
                        delay, ease: 'expo.out', overwrite: 'auto',
                        clearProps: 'opacity,transform,clipPath,filter',
                        onComplete: () => {
                            target.dataset.motionState = 'done';
                            target.dataset.revealDone = 'true';
                        },
                    });
                    registrados.get(target)?.push(animacion);
                });
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

        const foco = (e) => {
            const el = e.target.closest('[data-reveal]');
            if (!el || !root.contains(el)) return;
            gsap.killTweensOf(el);
            gsap.set(el, { clearProps: 'opacity,transform,clipPath,filter' });
            el.dataset.motionState = 'done';
            observador.unobserve(el);
        };
        root.addEventListener('focusin', foco, { signal: eventos.signal });

        escanear = () => {
            // Datos asíncronos y cambios de ruta no duplican tweens ni listeners.
            for (const [el, animaciones] of registrados) {
                if (root.contains(el)) continue;
                observador.unobserve(el);
                animaciones.forEach((a) => { a.scrollTrigger?.kill(); a.kill(); });
                registrados.delete(el);
            }
            root.querySelectorAll(SELECTOR).forEach((el) => {
                if (el.closest(EXCLUIDOS) || registrados.has(el)) return;
                const animaciones = [];
                registrados.set(el, animaciones);
                if (reducido) {
                    el.dataset.motionState = 'done';
                    return;
                }
                if (el.hasAttribute('data-reveal')) {
                    el.dataset.motionState = 'waiting';
                    observador.observe(el); // Visible por defecto hasta entrar realmente en vista.
                }
                contexto.add(() => {
                    if (el.hasAttribute('data-parallax') && !movil) {
                        const recorrido = numero(el.dataset.parallax, 0.15, 0.5) * 100;
                        animaciones.push(gsap.fromTo(el, { y: -recorrido }, {
                            y: recorrido, ease: 'none',
                            scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: 0.7 },
                        }));
                    }
                    if (el.hasAttribute('data-btn-magnetic') && puntero && !movil) {
                        const icono = el.querySelector('svg');
                        if (!icono) return;
                        // Se mueve el icono, nunca el área que el lector intenta pulsar.
                        const x = gsap.quickTo(icono, 'x', { duration: 0.25, ease: 'power3.out' });
                        const y = gsap.quickTo(icono, 'y', { duration: 0.25, ease: 'power3.out' });
                        animaciones.push(x.tween, y.tween);
                        el.addEventListener('pointermove', (e) => {
                            const r = el.getBoundingClientRect();
                            x(Math.max(-4, Math.min(4, (e.clientX - r.left - r.width / 2) * 0.12)));
                            y(Math.max(-3, Math.min(3, (e.clientY - r.top - r.height / 2) * 0.1)));
                        }, { signal: eventos.signal });
                        el.addEventListener('pointerleave', () => { x(0); y(0); }, { signal: eventos.signal });
                    }
                });
            });
        };
        escanear();
        return () => {
            observador.disconnect();
            eventos.abort();
            registrados.forEach((_, el) => {
                delete el.dataset.motionState;
                delete el.dataset.revealDone;
            });
            escanear = () => {};
        };
    }, root);
    return { scan: () => escanear(), revert: () => media.revert() };
}

export function observeMotionProfesional(root, actualizar) {
    let cuadro = 0;
    const observer = new MutationObserver((mutaciones) => {
        if (!mutaciones.some((m) => !m.target.closest?.('.asistente-tienda')
            && [...m.addedNodes, ...m.removedNodes].some((node) => node.nodeType === 1))) return;
        if (!cuadro) cuadro = requestAnimationFrame(() => { cuadro = 0; actualizar(); });
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => { observer.disconnect(); cancelAnimationFrame(cuadro); };
}
