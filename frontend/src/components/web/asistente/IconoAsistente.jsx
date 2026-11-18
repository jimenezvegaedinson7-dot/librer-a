import { useEffect, useId, useMemo, useRef } from 'react';
import fondoBiblioteca from './biblioteca-pastel.svg';

export default function IconoAsistente({ pensando = false }) {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const mirada = useRef(null);
    const retrasos = useMemo(() => {
        const semilla = [...uid].reduce((total, letra) => total + letra.charCodeAt(0), 0);
        return {
            parpadeo: `${((semilla % 45) / 10).toFixed(2)}s`,
            respiracion: `${((semilla % 30) / 10).toFixed(2)}s`,
        };
    }, [uid]);

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
        let cuadro = 0;
        const seguir = (evento) => {
            cancelAnimationFrame(cuadro);
            cuadro = requestAnimationFrame(() => {
                const grupo = mirada.current;
                const lienzo = grupo?.ownerSVGElement;
                if (!grupo || !lienzo) return;
                const caja = lienzo.getBoundingClientRect();
                if (!caja.width) return;
                const x = Math.max(-1, Math.min(1, ((evento.clientX - caja.left) / caja.width - 0.5) * 2));
                const y = Math.max(-1, Math.min(1, ((evento.clientY - caja.top) / caja.height - 0.5) * 2));
                grupo.setAttribute('transform', `translate(${(x * 1.5).toFixed(2)} ${(y * 1.1).toFixed(2)})`);
            });
        };
        window.addEventListener('pointermove', seguir, { passive: true });
        return () => {
            cancelAnimationFrame(cuadro);
            window.removeEventListener('pointermove', seguir);
        };
    }, []);

    return (
        <span
            className={`icono-asistente${pensando ? ' icono-asistente--pensando' : ''}`}
            aria-hidden="true"
        >
            <svg className="icono-asistente__glifo" viewBox="0 0 96 96" fill="none" focusable="false">
                <defs>
                    <radialGradient id={`piel-${uid}`} cx="43" cy="30" r="34" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#fbe0c1" />
                        <stop offset="0.62" stopColor="#f0c69c" />
                        <stop offset="1" stopColor="#dca678" />
                    </radialGradient>
                    <linearGradient id={`pelo-${uid}`} x1="33" y1="17" x2="64" y2="52" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#5b412c" />
                        <stop offset="0.55" stopColor="#3d2a1b" />
                        <stop offset="1" stopColor="#271a10" />
                    </linearGradient>
                    <linearGradient id={`saco-${uid}`} x1="22" y1="64" x2="74" y2="96" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#fff6e7" />
                        <stop offset="0.48" stopColor="#e5d0ad" />
                        <stop offset="1" stopColor="#b79a73" />
                    </linearGradient>
                    <linearGradient id={`camisa-${uid}`} x1="48" y1="64" x2="48" y2="84" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#ffffff" />
                        <stop offset="1" stopColor="#eae1cf" />
                    </linearGradient>
                    <linearGradient id={`corbata-${uid}`} x1="44" y1="68" x2="53" y2="90" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#d98b5c" />
                        <stop offset="1" stopColor="#ab5b36" />
                    </linearGradient>
                    <linearGradient id={`piel-der-${uid}`} x1="-6" y1="2" x2="7" y2="18" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#f7d6ae" />
                        <stop offset="0.45" stopColor="#e9ba90" />
                        <stop offset="1" stopColor="#d39c6d" />
                    </linearGradient>
                    <linearGradient id={`manga-${uid}`} x1="-6" y1="8" x2="7" y2="12" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#f4e6cd" />
                        <stop offset="0.55" stopColor="#e4cda6" />
                        <stop offset="1" stopColor="#b79a73" />
                    </linearGradient>
                    <linearGradient id={`piel-izq-${uid}`} x1="30" y1="76" x2="29" y2="88" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#f3cda6" />
                        <stop offset="1" stopColor="#d59f70" />
                    </linearGradient>
                    <radialGradient id={`iris-${uid}`} cx="0.42" cy="0.38" r="0.62">
                        <stop offset="0" stopColor="#96714a" />
                        <stop offset="0.55" stopColor="#513824" />
                        <stop offset="1" stopColor="#1f130a" />
                    </radialGradient>
                    <filter id={`suave-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1.6" />
                    </filter>
                </defs>
                <image className="icono-asistente__biblioteca" href={fondoBiblioteca} width="96" height="96" />
                <g transform="translate(-8.64 -1.84) scale(1.18)">

                <path d="M24.4 93.6c1-2.6 1.9-5.2 2.7-7.8" stroke="#eadcc0" strokeWidth="8" strokeLinecap="round" />
                <path d="M42.8 49.5h10.4v8.1c0 2.5 1.3 4.3 3.6 5.7L48 69l-8.8-5.7c2.3-1.4 3.6-3.2 3.6-5.7Z" fill="#e6b58a" />
                <path d="M52.6 54.4c.1 3.8-.9 6.3-3.2 8.1" stroke="#b97e55" strokeWidth="2.2" strokeLinecap="round" opacity="0.24" filter={`url(#suave-${uid})`} />
                <ellipse cx="48" cy="55.4" rx="7.2" ry="2.8" fill="#b97e55" opacity="0.32" filter={`url(#suave-${uid})`} />
                <g transform="translate(63 67)">
                    <g className="icono-asistente__saludo">
                        <path className="icono-asistente__manga" d="M-5.5-2C-8 1.5-6 7-1 16c2.6 3.8 8.3 3.4 10.8.2C11.5 12.6 8.8 6.7 6.8.8 4.7-3.8-1.6-4.7-5.5-2Z" fill={`url(#manga-${uid})`} />
                        <path d="M-3.6 2.4c-.4 3 1 7.6 3.8 12" stroke="#fff6e3" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
                        <g transform="translate(5 15)">
                            <circle className="icono-asistente__codo" r="5.5" fill="#dcc29d" />
                            <g className="icono-asistente__antebrazo">
                                <path d="M-5.1-1.3C-6.3 5-5.4 14-4 23l8 .2C5.3 14 6.3 5 5.1-1.3c-3.2 1.3-7 1.3-10.2 0Z" fill={`url(#manga-${uid})`} />
                                <path d="M-3.9 3c-.6 5 .1 11 .8 16" stroke="#fff6e3" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
                                <path d="M3.8 3c.4 5-.2 10-.8 16" stroke="#9e815f" strokeWidth="0.7" strokeLinecap="round" opacity="0.4" />
                                <path d="M-3.8 1.5c2 1.2 4.3 1.2 6.8.1" stroke="#baa07b" strokeWidth="0.65" strokeLinecap="round" opacity="0.35" />
                                <rect x="-4.5" y="21.7" width="9" height="3.4" rx="1.1" fill="#fff9ec" stroke="#bea887" strokeWidth="0.45" />
                                <g transform="translate(0 24.2)">
                                    <g className="icono-asistente__mano">
                                        <g transform="scale(-1 1)">
                                            <path
                                                d="M-3.4-.8c0 2.5-1 3-1.9 4.6l-1.8 3.7c-.7 1.5.7 2.7 1.9 1.9L-4 7.8l-.9 7.3c-.2 2 2.2 2.6 2.7.6l.9-4.5-.3 6.8c-.1 2 2.6 2.2 2.7.1l.5-6.5.4 5.4c.1 1.9 2.6 1.8 2.6-.2l-.1-5.9.7 4.2c.4 1.8 2.6 1.3 2.2-.5L6 8.5C5.5 5.6 4.3 4.2 3.4 2.3V-.8Z"
                                                fill={`url(#piel-der-${uid})`}
                                                stroke="#c99265"
                                                strokeWidth="0.4"
                                                strokeLinejoin="round"
                                            />
                                            <path d="M-3.8 5.2c2-1.8 4.6-1.5 6.7-.2M-3.6 7.2c2.1-1 4.5-.7 6.7 1M-4.6 4.8c1.2.6 1.6 1.6 1.6 2.8" stroke="#c18b61" strokeWidth="0.55" strokeLinecap="round" opacity="0.55" />
                                            <path d="M-2.5 1.6c.2 1.6-.6 2.8-1.3 3.6" stroke="#ffe5c7" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
                                        </g>
                                    </g>
                                </g>
                            </g>
                        </g>
                    </g>
                </g>
                <path className="icono-asistente__torso" d="M42.5 60.8c-7.4 1-15.6 4.8-19.1 10.1C20 76.1 20.6 86 21 96h54c.3-10.2-.1-20.8-3.7-25.1-3.5-4.2-11.6-8.6-17.8-10.1L48 67Z" fill={`url(#saco-${uid})`} />
                <path d="M27.8 69.1c-3.8 5.5-3.4 14.2-2.6 22.6" stroke="#fff9ec" strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
                <path d="M66.8 69.8c3.3 5.6 3.3 13.7 2.4 21.3" stroke="#9e815f" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
                <path d="m40.8 62.5 7.2 5 6.6-5L48 88Z" fill="#ad8e69" opacity="0.6" />
                <path d="M64.2 72.6c-1.4 3-1.9 6.3-1.6 9.8" stroke="#d8c5a5" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
                <path d="M31.8 72.6c1.4 3 1.9 6.3 1.6 9.8" stroke="#d8c5a5" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
                <g transform="rotate(-9 36 82)">
                    <rect x="26.6" y="76.2" width="18" height="11.4" rx="1.6" fill="#1c3a53" />
                    <rect x="26.6" y="76.2" width="3.4" height="11.4" rx="1.4" fill="#123047" />
                    <rect x="42.6" y="77" width="2" height="9.8" rx="1" fill="#fff9ec" />
                    <path d="M30.6 77.2v9.4" stroke="#d6a84b" strokeWidth="1" strokeLinecap="round" />
                    <path d="M33.4 80.2h7.2M33.4 83h5.4" stroke="#d6a84b" strokeWidth="0.9" strokeLinecap="round" opacity="0.85" />
                    <g stroke="#061a2b" strokeWidth="2.8" strokeLinecap="round" opacity="0.35" transform="translate(0.6 0.9)">
                        <path d="M26.9 79.6h3.9" />
                        <path d="M26.9 82.1h4.7" />
                        <path d="M26.9 84.5h4.3" />
                        <path d="M26.9 86.6h3.6" />
                    </g>
                    <ellipse cx="25.8" cy="82.3" rx="1.9" ry="3.5" fill={`url(#piel-izq-${uid})`} />
                    <g stroke={`url(#piel-izq-${uid})`} strokeLinecap="round">
                        <path d="M26.8 79.6h4.2" strokeWidth="2.5" />
                        <path d="M26.8 82.1h5" strokeWidth="2.6" />
                        <path d="M26.8 84.5h4.6" strokeWidth="2.5" />
                        <path d="M26.8 86.6h3.9" strokeWidth="2.3" />
                        <path d="M27.6 78.1 31.7 76.9" strokeWidth="2.8" />
                    </g>
                    <g stroke="#b9774e" strokeWidth="0.6" strokeLinecap="round" opacity="0.55">
                        <path d="M31.4 80.4c.3.2.6.4.8.8" />
                        <path d="M32.2 82.9c.3.2.5.4.7.7" />
                        <path d="M31.8 85.2c.3.2.5.4.6.7" />
                    </g>
                </g>

                <g
                    className="icono-asistente__cabeza"
                    style={{ animationDelay: retrasos.respiracion }}
                >
                    <ellipse cx="33.8" cy="41.6" rx="2.3" ry="3.7" fill="#eab98e" />
                    <ellipse cx="62.2" cy="41.6" rx="2.3" ry="3.7" fill="#eab98e" />
                    <path d="M35.4 40.9c-.4 1.3-.4 2.6 0 3.9" stroke="#cf9468" strokeWidth="1.1" strokeLinecap="round" />
                    <path d="M60.6 40.9c.4 1.3.4 2.6 0 3.9" stroke="#cf9468" strokeWidth="1.1" strokeLinecap="round" />
                    <path
                        d="M48 18.2c-9.2 0-14.6 6.3-14.6 15.2l.9 9.7c.4 4.8 3.4 8.3 7.1 11.1 1.9 1.5 4 2.5 6.6 2.5s4.7-1 6.6-2.5c3.7-2.8 6.7-6.3 7.1-11.1l.9-9.7c0-8.9-5.4-15.2-14.6-15.2Z"
                        fill={`url(#piel-${uid})`}
                    />
                    <path d="M59.8 29.4c2.3 9.4.6 17.7-6.6 23.7-1.4 1.2-3.1 2.1-5.2 2.8 3.9.1 7.1-2.9 9.5-5.6 3.9-4.5 4.4-11.9 3.8-16.9Z" fill="#b97e55" opacity="0.15" />
                    <path d="M36.4 32.7c0-4.2 1.9-7.3 5.3-9.3" stroke="#fff1d9" strokeWidth="1.6" strokeLinecap="round" opacity="0.38" />
                    <path d="M36.6 46.4c1.9 2.3 4.2 3.9 6.8 4.8" stroke="#d99f72" strokeWidth="1" strokeLinecap="round" opacity="0.32" />
                    <path d="M59.4 46.4c-1.9 2.3-4.2 3.9-6.8 4.8" stroke="#d99f72" strokeWidth="1" strokeLinecap="round" opacity="0.32" />
                    <ellipse cx="37.4" cy="44.8" rx="3.4" ry="2.2" fill="#e1956f" opacity="0.14" />
                    <ellipse cx="58.6" cy="44.8" rx="3.4" ry="2.2" fill="#e1956f" opacity="0.14" />
                    <path d="M43.8 54c1.4.7 2.8 1 4.2 1s2.8-.3 4.2-1" stroke="#cb9067" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />

                    <path d="M36.3 34.3c2-1.4 4.4-1.6 6.7-.6" stroke="#3f2b1c" strokeWidth="1.7" strokeLinecap="round" />
                    <path d="M53 33.7c2.3-.8 4.8-.5 6.8.9" stroke="#3f2b1c" strokeWidth="1.7" strokeLinecap="round" />

                    <g
                        className="icono-asistente__parpado"
                        style={{ animationDelay: retrasos.parpadeo }}
                    >
                        <g ref={mirada}>
                            <ellipse cx="40.8" cy="39.2" rx="3.6" ry="2.4" fill="#fff8f0" />
                            <ellipse cx="55.2" cy="39.2" rx="3.6" ry="2.4" fill="#fff8f0" />
                            <circle cx="40.9" cy="39.3" r="1.95" fill={`url(#iris-${uid})`} />
                            <circle cx="55.1" cy="39.3" r="1.95" fill={`url(#iris-${uid})`} />
                            <circle cx="40.6" cy="39.3" r="0.95" fill="#170e07" />
                            <circle cx="55.4" cy="39.3" r="0.95" fill="#170e07" />
                            <circle cx="41.6" cy="38.4" r="0.55" fill="#fffdf7" />
                            <circle cx="55.9" cy="38.4" r="0.55" fill="#fffdf7" />
                        </g>
                    </g>
                    <path d="M37.2 38.4c1.9-1.8 5.3-1.8 7.2 0" stroke="#6b4a33" strokeWidth="0.85" strokeLinecap="round" />
                    <path d="M51.6 38.4c1.9-1.8 5.3-1.8 7.2 0" stroke="#6b4a33" strokeWidth="0.85" strokeLinecap="round" />
                    <path d="M36.8 42.6c1.2.8 2.5 1.2 4 1.2s2.8-.4 4-1.2" stroke="#d3a074" strokeWidth="0.9" strokeLinecap="round" opacity="0.5" />
                    <path d="M51.2 42.6c1.2.8 2.5 1.2 4 1.2s2.8-.4 4-1.2" stroke="#d3a074" strokeWidth="0.9" strokeLinecap="round" opacity="0.5" />

                    <path d="M48.1 40.8c-.3 2.7-.2 4.6.7 5.8" stroke="#cf976d" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
                    <ellipse cx="45.8" cy="47.4" rx="0.8" ry="0.55" fill="#bd835a" opacity="0.5" />
                    <ellipse cx="50.2" cy="47.4" rx="0.8" ry="0.55" fill="#bd835a" opacity="0.5" />

                    <g className="icono-asistente__boca icono-asistente__boca--seria">
                        <path d="M43.3 50.5c2.8 2 6.2 2.1 9.5-.4" stroke="#a9684f" strokeWidth="1.25" strokeLinecap="round" />
                        <path d="M45.3 52.5c1.5.6 3.4.6 4.9-.1" stroke="#dba788" strokeWidth="0.8" strokeLinecap="round" />
                    </g>
                    <g className="icono-asistente__boca icono-asistente__boca--sonrisa">
                        <path d="M43.2 50.2c2.8 2.4 6.8 2.4 9.6 0" stroke="#b07154" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M45.4 52.2c1.7.8 3.5.8 5.2 0" stroke="#d9a083" strokeWidth="1" strokeLinecap="round" opacity="0.85" />
                    </g>

                    <path
                        d="M33 37.6c-3.8-6.3-2.7-15.3 2.5-19.5 2.8-2.4 6.3-3.5 10-3.2 3.3-3.7 10.3-1.2 14.4 3.2 6.9 4.4 7.1 13.3 2.9 19.8l-.7-9.6c-5.4 1.2-10.7-.4-15-3.1-3.1 3.9-7.5 6.1-12.4 6.7Z"
                        fill={`url(#pelo-${uid})`}
                    />
                    <path d="M35.3 26.8c4.2-2.2 8.5-5.9 10.4-9.8M39 27.3c4.2-1.7 7.3-4.9 9.2-8.3" stroke="#8a6441" strokeWidth="1.5" strokeLinecap="round" opacity="0.43" />
                    <path d="M49.5 17.3c3.8 1 7.3 3.4 9.9 6.5" stroke="#946d47" strokeWidth="2" strokeLinecap="round" opacity="0.33" />
                    <path d="M46.8 18.2c-.7 3.5-2.6 6.4-5.7 8.7M57.4 27.7c3.7 1.1 4.8 3.2 5.2 5.9" stroke="#22150d" strokeWidth="0.9" strokeLinecap="round" opacity="0.5" />

                    <g>
                        <rect x="34.9" y="35.5" width="11.6" height="8.2" rx="2.8" fill="#cfe0e8" fillOpacity="0.12" stroke="#3a2a1c" strokeWidth="0.95" />
                        <rect x="49.5" y="35.5" width="11.6" height="8.2" rx="2.8" fill="#cfe0e8" fillOpacity="0.12" stroke="#3a2a1c" strokeWidth="0.95" />
                        <path d="M46.5 38.1c.7-1 2.3-1 3 0" stroke="#3a2a1c" strokeWidth="1.05" strokeLinecap="round" fill="none" />
                        <path d="M34.9 38.3c-1.4-.3-2.4.2-3 1.4" stroke="#3a2a1c" strokeWidth="1.05" strokeLinecap="round" fill="none" />
                        <path d="M61.1 38.3c1.4-.3 2.4.2 3 1.4" stroke="#3a2a1c" strokeWidth="1.05" strokeLinecap="round" fill="none" />
                        <path d="M37.1 37.5c.9-1 2-1.6 3.2-1.9" stroke="#fffdf7" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
                        <path d="M51.7 37.5c.9-1 2-1.6 3.2-1.9" stroke="#fffdf7" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
                    </g>
                </g>

                <path d="m41.5 61.4 6.5 1.8 6.5-1.8L48 82Z" fill={`url(#camisa-${uid})`} />
                <path d="m41.5 60.8 6.5 3-3.3 5.2-5-6.2ZM54.5 60.8 48 63.8l3.3 5.2 5-6.2Z" fill="#fff9ec" stroke="#dfcdb0" strokeWidth="0.5" strokeLinejoin="round" />
                <path d="m40.5 61.6 5.2 8.5-2.8 4.2 4.3 7.7-13.7-11.4 2.8-2.5-1.5-2.7Z" fill="#f7efdf" stroke="#c4ac89" strokeWidth="0.55" strokeLinejoin="round" />
                <path d="m55.5 61.6-5.2 8.5 2.8 4.2-4.3 7.7 13.7-11.4-2.8-2.5 1.5-2.7Z" fill="#e9d8bb" stroke="#baa07b" strokeWidth="0.55" strokeLinejoin="round" />
                <path d="m46 64.2 4-.1.8 2.7-2.8 2-2.8-2Z" fill="#a75939" />
                <path d="m48 68.2 2.4 3.7L48 88l-2.4-16.1Z" fill={`url(#corbata-${uid})`} />
                <path d="m47.2 70.2.2 10.2" stroke="#f0b58a" strokeWidth="0.65" strokeLinecap="round" opacity="0.55" />
                <path d="M46 78.4h4" stroke="#d6a84b" strokeWidth="1" strokeLinecap="round" />
                <path d="m58.9 75.8 1.3-3 1.4 2 2-1.2.3 2.7Z" fill="#aa6245" />
                <path d="m57.5 76.4 7 .2" stroke="#9e815f" strokeWidth="0.8" strokeLinecap="round" />
                <circle cx="37.4" cy="70.3" r="1.05" fill="#d6a84b" />
                <path d="m37.1 69.9.6.8" stroke="#fff6dd" strokeWidth="0.45" strokeLinecap="round" />
                </g>
            </svg>
        </span>
    );
}
