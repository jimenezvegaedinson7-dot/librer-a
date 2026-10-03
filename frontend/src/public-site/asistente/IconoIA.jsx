import { useId } from 'react';

// ============================================================
// AVATAR DEL ASISTENTE
// Un hombre dibujado por piezas (cuerpo, cabeza, ojos, cejas, boca y
// cada brazo) para que cada una se mueva por separado, como una persona:
//   - En reposo respira, parpadea, mira a los lados, mueve la cabeza y
//     de vez en cuando levanta la mano para saludar.
//   - Con `pensando` inclina la cabeza, mira hacia arriba, se lleva la
//     mano al mentón y aparecen chispas de idea.
// El relieve sale de degradados (piel, pelo, camisa). Las animaciones
// están en formal.css y se apagan con prefers-reduced-motion.
// ============================================================
export default function IconoIA({ pensando = false }) {
    const id = useId().replace(/:/g, '');
    const g = (nombre) => `${nombre}-${id}`;
    const url = (nombre) => `url(#${g(nombre)})`;

    return (
        <span className={`icono-ia${pensando ? ' icono-ia--pensando' : ''}`} aria-hidden="true">
            <svg className="avatar-ia" viewBox="0 0 100 100" focusable="false">
                <defs>
                    <radialGradient id={g('piel')} cx="42%" cy="35%" r="70%">
                        <stop offset="0" stopColor="#ffd9b8" />
                        <stop offset="0.55" stopColor="#f2b88b" />
                        <stop offset="1" stopColor="#d48f62" />
                    </radialGradient>
                    <linearGradient id={g('cuello')} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#c98258" />
                        <stop offset="1" stopColor="#e3a77c" />
                    </linearGradient>
                    <linearGradient id={g('pelo')} x1="0" y1="0" x2="0.3" y2="1">
                        <stop offset="0" stopColor="#5a3a26" />
                        <stop offset="1" stopColor="#2a1910" />
                    </linearGradient>
                    <linearGradient id={g('camisa')} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#3f78b5" />
                        <stop offset="1" stopColor="#1d4673" />
                    </linearGradient>
                    <linearGradient id={g('manga')} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#3a72ae" />
                        <stop offset="1" stopColor="#33689f" />
                    </linearGradient>
                </defs>

                {/* Cuerpo: respira subiendo y bajando los hombros. */}
                <g className="avatar-ia__cuerpo">
                    <rect x="44" y="56" width="12" height="16" rx="5" fill={url('cuello')} />
                    <g transform="translate(0 -3)">
                    <path d="M14 100c0-17 13-26 36-26s36 9 36 26v3H14Z" fill={url('camisa')} />
                    <path d="M41 74.5 50 86l9-11.5c-2.6-.6-5.6-.9-9-.9s-6.4.3-9 .9Z" fill="#f4f7fb" />
                    <path d="M45.5 75.5 50 81l4.5-5.5" fill="none" stroke="#c9d6e4" strokeWidth="1.2" strokeLinejoin="round" />
                    <path d="M41 74.5 36 80l7 4 4-6.5ZM59 74.5 64 80l-7 4-4-6.5Z" fill="#e7edf4" />
                    </g>
                </g>

                {/* Brazo que saluda (derecha de quien mira). */}
                <g className="avatar-ia__brazo avatar-ia__brazo--saludo">
                    <rect x="70" y="75" width="10" height="24" rx="5" fill={url('manga')} />
                    <rect x="71.5" y="97" width="7" height="8" rx="3.5" fill={url('piel')} />
                    <g className="avatar-ia__mano">
                        <ellipse cx="75" cy="107.5" rx="4.6" ry="5" fill={url('piel')} />
                        <path d="M71.6 109v4.2M74 109.5v5.4M76.4 109.5v5.2M78.6 108.6v4M70.4 105.6l-2.8-1.8" stroke={url('piel')} strokeWidth="2.3" strokeLinecap="round" />
                    </g>
                </g>

                {/* Cabeza: se inclina, asiente y acompaña la mirada. */}
                <g className="avatar-ia__cabeza">
                    <ellipse cx="32.6" cy="43" rx="3.6" ry="5" fill="#e9a77a" />
                    <ellipse cx="67.4" cy="43" rx="3.6" ry="5" fill="#e9a77a" />
                    <ellipse cx="50" cy="41" rx="17.5" ry="19.5" fill={url('piel')} />
                    <path d="M32.5 41c-1.8-15 7.2-24 17.8-24 11.2 0 19.4 8.4 17.2 24-1.2-6.6-4.2-10.6-9-12.3-5.2 3-13.6 3.6-19.6 1.4-3.3 2.4-5.6 6-6.4 10.9Z" fill={url('pelo')} />
                    <path d="M40 22.5c4-3 10-3.8 15.2-2.2" fill="none" stroke="#7a5238" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
                    <g className="avatar-ia__cejas">
                        <path d="M39.6 34.2q4-2.4 7.6-.4M52.8 33.8q3.6-2 7.6.4" fill="none" stroke="#3a2416" strokeWidth="1.8" strokeLinecap="round" />
                    </g>
                    <g className="avatar-ia__ojos">
                        <ellipse cx="43.5" cy="40.4" rx="3" ry="3.3" fill="#fff" />
                        <ellipse cx="56.5" cy="40.4" rx="3" ry="3.3" fill="#fff" />
                        <g className="avatar-ia__pupilas">
                            <circle cx="43.7" cy="40.8" r="2" fill="#3b2516" />
                            <circle cx="56.7" cy="40.8" r="2" fill="#3b2516" />
                            <circle cx="44.4" cy="40" r="0.7" fill="#fff" />
                            <circle cx="57.4" cy="40" r="0.7" fill="#fff" />
                        </g>
                    </g>
                    <path d="M50.4 41.5q-1.8 5 .6 6" fill="none" stroke="#c98258" strokeWidth="1.3" strokeLinecap="round" />
                    <ellipse cx="40.5" cy="48" rx="3" ry="1.8" fill="#f19a8a" opacity="0.45" />
                    <ellipse cx="59.5" cy="48" rx="3" ry="1.8" fill="#f19a8a" opacity="0.45" />
                    <path className="avatar-ia__sonrisa" d="M44.6 51.2q5.4 5 10.8 0" fill="none" stroke="#9a4a3a" strokeWidth="1.8" strokeLinecap="round" />
                    <path className="avatar-ia__boca-pensar" d="M47.4 52.6q2.8-1.2 5.4.2" fill="none" stroke="#9a4a3a" strokeWidth="1.8" strokeLinecap="round" />
                </g>

                {/* Brazo que va al mentón al pensar (izquierda de quien mira). */}
                <g className="avatar-ia__brazo avatar-ia__brazo--pensar">
                    <rect x="20" y="75" width="10" height="24" rx="5" fill={url('manga')} />
                    <rect x="21.5" y="97" width="7" height="6" rx="3.5" fill={url('piel')} />
                    <ellipse cx="25" cy="105.5" rx="4.6" ry="4.8" fill={url('piel')} />
                </g>

                {/* Chispas de idea: aparecen al pensar. */}
                <g className="avatar-ia__ideas" fill="#f5c451">
                    <path d="M82 14c.6 3.8 2 5.2 5.8 5.8-3.8.6-5.2 2-5.8 5.8-.6-3.8-2-5.2-5.8-5.8 3.8-.6 5.2-2 5.8-5.8Z" />
                    <path d="M92 30c.3 2 1 2.7 3 3-2 .3-2.7 1-3 3-.3-2-1-2.7-3-3 2-.3 2.7-1 3-3Z" />
                    <circle cx="72" cy="10" r="1.6" />
                </g>
            </svg>
        </span>
    );
}
