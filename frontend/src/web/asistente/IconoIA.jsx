export default function IconoIA({ pensando = false }) {
    return (
        <span className={`icono-ia${pensando ? ' icono-ia--pensando' : ''}`} aria-hidden="true">
            <svg className="icono-ia__libro" viewBox="0 0 72 72" fill="none" focusable="false">
                <path d="M13 24c8-3 16-2 23 2 7-4 15-5 23-2v29c-9-2-16-1-23 3-7-4-14-5-23-3V24Z" fill="#d6a84b" />
                <path d="M17 20c7-1 13 1 19 5v27c-6-4-12-6-19-5V20Z" fill="#fff9ec" />
                <path d="M55 20c-7-1-13 1-19 5v27c6-4 12-6 19-5V20Z" fill="#f0e5cf" />
                <path d="M36 25v27" stroke="#ad9265" strokeWidth="1.5" strokeLinecap="round" />
                <g className="icono-ia__renglones" stroke="#ad9265" strokeWidth="1.5" strokeLinecap="round">
                    <path d="m22 29 8 2m-8 4 8 2m-8 4 5 1m15-11 8-2m-8 8 8-2m-8 8 5-1" />
                </g>
                <path d="M45 20v13l3-2 3 1V19.5" fill="#c4774d" />
            </svg>
        </span>
    );
}
