import { writeFile } from 'node:fs/promises';

const API = process.env.API_URL || 'https://libreria-api-v9h0.onrender.com/api';
const SALIDA = new URL('../src/models/config/web/catalogoRespaldo.json', import.meta.url);
const CAMPOS = [
    'id_libro',
    'titulo',
    'autor',
    'categoria',
    'id_autor',
    'id_categoria',
    'isbn',
    'estado',
    'precio',
    'precio_final',
    'descuento_vigente',
    'descuento_porcentaje_efectivo',
    'portada',
    'stock',
    'es_nuevo',
    'mas_vendido',
    'creado_en'
];

const respuesta = await fetch(`${API}/libros?limit=3000`, { headers: { Accept: 'application/json' } });
if (!respuesta.ok) throw new Error(`No se pudo obtener el catálogo: HTTP ${respuesta.status}`);
const json = await respuesta.json();
const libros = (Array.isArray(json) ? json : json.data || json.libros || [])
    .filter((libro) => Number(libro.estado) === 1)
    .map((libro) => Object.fromEntries(CAMPOS.map((campo) => [campo, libro[campo] ?? null])));

if (!libros.length) throw new Error('La API devolvió un catálogo vacío');
await writeFile(SALIDA, `${JSON.stringify({ generadoEn: new Date().toISOString(), libros })}\n`, 'utf8');
console.log(`Respaldo real actualizado: ${libros.length} libros`);
