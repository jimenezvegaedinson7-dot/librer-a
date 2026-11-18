import {
    FaBook,
    FaBoxOpen,
    FaBullhorn,
    FaCartShopping,
    FaClock,
    FaClockRotateLeft,
    FaCreditCard,
    FaHourglassHalf,
    FaMoneyBillTrendUp,
    FaMoneyBillWave,
    FaStore,
    FaTags,
    FaTruck,
    FaUser,
    FaUserGroup,
    FaUsers,
    FaUserShield,
    FaWarehouse
} from 'react-icons/fa6';

const ESCENAS = new Map([
    [FaBook, 'libros'],
    [FaUser, 'personas'],
    [FaUserGroup, 'personas'],
    [FaUsers, 'personas'],
    [FaUserShield, 'personas'],
    [FaWarehouse, 'inventario'],
    [FaBoxOpen, 'inventario'],
    [FaCartShopping, 'inventario'],
    [FaCreditCard, 'pago'],
    [FaMoneyBillWave, 'pago'],
    [FaMoneyBillTrendUp, 'pago'],
    [FaStore, 'tienda'],
    [FaTruck, 'reparto'],
    [FaTags, 'etiquetas'],
    [FaBullhorn, 'anuncio'],
    [FaHourglassHalf, 'tiempo'],
    [FaClock, 'tiempo'],
    [FaClockRotateLeft, 'tiempo']
]);

const DIBUJOS = {
    libros: (
        <>
            <path d="M10 47h43v8H10a4 4 0 0 1 0-8Z" fill="var(--figura-acento)" />
            <path d="M14 49h37v4H14" fill="var(--figura-papel)" />
            <path d="M18 12h17a3 3 0 0 1 3 3v29H18a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4Z" fill="var(--figura-acento)" />
            <path d="M21 13v30M26 21h7M26 26h5" fill="none" stroke="var(--figura-papel)" />
            <path d="m39 19 10-3 8 27-11 3Z" fill="var(--figura-secundario)" />
            <path d="m42 25 9-3m-6 17 9-3" fill="none" stroke="var(--figura-papel)" />
            <path d="M9 57h48" fill="none" />
        </>
    ),
    personas: (
        <>
            <path d="M7 49v-8a10 10 0 0 1 20 0v8Z" fill="var(--figura-suave)" />
            <circle cx="17" cy="23" r="7" fill="var(--figura-papel)" />
            <path d="M39 49v-8a9 9 0 0 1 18 0v8Z" fill="var(--figura-secundario)" />
            <circle cx="48" cy="24" r="6" fill="var(--figura-papel)" />
            <path d="M19 55V43a13 13 0 0 1 26 0v12Z" fill="var(--figura-acento)" />
            <circle cx="32" cy="20" r="9" fill="var(--figura-papel)" />
            <path d="m28 35 4 5 4-5M25 47v8m14-8v8" fill="none" stroke="var(--figura-papel)" />
        </>
    ),
    inventario: (
        <>
            <path d="M7 25 31 14l25 11-24 12Z" fill="var(--figura-suave)" />
            <path d="M7 25v23l25 12V37Z" fill="var(--figura-acento)" />
            <path d="m32 37 24-12v23L32 60Z" fill="var(--figura-secundario)" />
            <path d="m19 20 24 12v10l-7 3V35L13 23" fill="var(--figura-papel)" />
            <path d="m12 43 9 4m-9 1 6 3" fill="none" stroke="var(--figura-papel)" />
            <path d="M29 8h21v12H29Z" fill="var(--figura-papel)" />
            <path d="M33 12h12m-12 4h7" fill="none" />
        </>
    ),
    pago: (
        <>
            <rect x="7" y="13" width="43" height="29" rx="4" fill="var(--figura-suave)" />
            <path d="M8 21h41v7H8Z" fill="var(--figura-trazo)" stroke="none" />
            <rect x="15" y="28" width="43" height="28" rx="4" fill="var(--figura-acento)" />
            <rect x="21" y="35" width="9" height="7" rx="1" fill="var(--figura-papel)" />
            <path d="M22 49h12m5 0h5" fill="none" stroke="var(--figura-papel)" />
            <circle cx="48" cy="39" r="4" fill="var(--figura-secundario)" />
        </>
    ),
    etiquetas: (
        <>
            <path d="m8 30 21-20h17l9 10v15L33 56Z" fill="var(--figura-suave)" />
            <path d="m10 36 23-22 17 2 5 18-23 23Z" fill="var(--figura-acento)" />
            <circle cx="43" cy="26" r="3" fill="var(--figura-papel)" />
            <path d="m45 24 8-10q6-7 3-9M23 37l11 11m-6-16 11 11" fill="none" />
            <path d="m16 36 5 5" stroke="var(--figura-papel)" />
        </>
    ),
    anuncio: (
        <>
            <path d="m22 37 6 17h9l-6-19" fill="var(--figura-secundario)" />
            <path d="M10 26h17v16H10a3 3 0 0 1-3-3V29a3 3 0 0 1 3-3Z" fill="var(--figura-acento)" />
            <path d="m27 26 23-13v42L27 42Z" fill="var(--figura-papel)" />
            <path d="M45 17v34" stroke="var(--figura-acento)" strokeWidth="5" />
            <path d="m55 24 5-3m-5 13h6m-6 10 5 3M13 31v6" fill="none" />
        </>
    ),
    tiempo: (
        <>
            <rect x="9" y="15" width="34" height="40" rx="3" fill="var(--figura-papel)" />
            <path d="M9 26h34V18a3 3 0 0 0-3-3H12a3 3 0 0 0-3 3Z" fill="var(--figura-acento)" />
            <path d="M18 10v10m16-10v10M16 33h5m5 0h5m-15 7h5m5 0h4m-14 7h5" fill="none" />
            <circle cx="44" cy="44" r="15" fill="var(--figura-suave)" />
            <path d="M44 34v10l7 4" fill="none" strokeWidth="2.5" />
        </>
    ),
    tienda: (
        <>
            <path d="M12 25h40v31H12Z" fill="var(--figura-papel)" />
            <path d="M12 11h40l6 14H6Z" fill="var(--figura-suave)" />
            <path d="m21 11-3 14h10l1-14m9 0 1 14h10l-4-14" fill="var(--figura-acento)" />
            <path d="M6 25v4a6 6 0 0 0 12 0 5 5 0 0 0 10 0 5.5 5.5 0 0 0 11 0 5 5 0 0 0 10 0 4.5 4.5 0 0 0 9 0v-4" fill="var(--figura-suave)" />
            <path d="M18 38h13v12H18Z" fill="var(--figura-secundario)" />
            <path d="M37 37h10v19H37Z" fill="var(--figura-acento)" />
            <path d="M8 57h48m-12-9v2" fill="none" />
        </>
    ),
    reparto: (
        <>
            <path d="M7 17h29v31H7Z" fill="var(--figura-acento)" />
            <path d="M36 29h13l9 11v8H36Z" fill="var(--figura-suave)" />
            <path d="M41 33h6l7 8H41Z" fill="var(--figura-papel)" />
            <path d="M13 24h17m-17 5h12M5 48h55" fill="none" />
            <circle cx="17" cy="49" r="7" fill="var(--figura-trazo)" />
            <circle cx="48" cy="49" r="7" fill="var(--figura-trazo)" />
            <circle cx="17" cy="49" r="3" fill="var(--figura-papel)" />
            <circle cx="48" cy="49" r="3" fill="var(--figura-papel)" />
        </>
    ),
    ficha: (
        <>
            <path d="M13 9h27l10 10v37H13Z" fill="var(--figura-papel)" />
            <path d="M40 9v10h10" fill="var(--figura-suave)" />
            <path d="M20 20h9m-9 7h20m-20 6h17" fill="none" />
            <path d="M8 52h20v6H8Z" fill="var(--figura-acento)" />
        </>
    )
};

export function IlustracionIndicador({ icono }) {
    const escena = ESCENAS.get(icono?.type) || 'ficha';

    return (
        <span className="indicador-ilustracion" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none" stroke="var(--figura-trazo)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" focusable="false">
                {DIBUJOS[escena]}
            </svg>
            {escena === 'ficha' && <span className="indicador-ilustracion__simbolo">{icono}</span>}
        </span>
    );
}
