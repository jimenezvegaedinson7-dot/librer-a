const modelo = require('../models/busquedaIA.model');
const gemini = require('../integrations/gemini');
const { normalizar, fueraDeAlcance, interpretarLocal, validarPlan } = require('../utils/busquedaIA');

function filtrosDe(plan, tipo = 'todos') {
    return {
        ids: plan.ids || [],
        autor: plan.autores[0] || null,
        categoria: plan.categorias[0] || null,
        palabras: plan.palabras,
        campo: tipo,
        isbn: plan.isbn,
        minimo: plan.minimo,
        maximo: plan.maximo,
        stock: plan.stock,
        oferta: plan.oferta
    };
}

function tieneFiltros(plan) {
    if (!plan) return false;
    return Boolean(
        (plan.ids || []).length ||
        (plan.autores || []).length ||
        (plan.categorias || []).length ||
        (plan.palabras || []).length ||
        plan.isbn ||
        plan.minimo ||
        plan.maximo ||
        plan.oferta
    );
}

function crearBuscadorIA({ repositorio = modelo, interprete = gemini.interpretar } = {}) {
    return async function buscar({ consulta, tipo = 'todos', categoria = '', limite = 12 } = {}) {
        const texto = String(consulta || '').trim().slice(0, 200);
        if (!texto || fueraDeAlcance(normalizar(texto))) return { libros: [], origen: 'catalogo', plan: null };
        const facetas = await repositorio.facetas();
        const respuesta = await interprete({ consulta: texto, tipo, categoria, facetas });
        const local = () => interpretarLocal({ consulta: texto, tipo, categoria, facetas });
        let plan = respuesta.plan ? validarPlan(respuesta.plan, facetas, { tipo, categoria }) : null;
        let origen = respuesta.plan ? 'gemini' : 'catalogo';
        if (!tieneFiltros(plan)) {
            const alterno = local();
            if (!tieneFiltros(alterno)) return { libros: [], origen: 'catalogo', plan: plan || alterno };
            plan = alterno;
            origen = 'catalogo';
        }
        let libros = await repositorio.buscar(filtrosDe(plan, tipo), plan.orden, limite);
        if (!libros.length && plan.palabras.length) {
            const encontrados = await repositorio.titulos(plan.palabras);
            if (encontrados.length) {
                const ids = encontrados.slice(0, 8).map((t) => t.id_libro);
                libros = await repositorio.buscar({ ids, campo: 'titulo' }, 'relevancia', limite);
            }
        }
        if (!libros.length && origen === 'gemini') {
            const alterno = local();
            if (tieneFiltros(alterno)) {
                plan = alterno;
                origen = 'catalogo';
                libros = await repositorio.buscar(filtrosDe(plan, tipo), plan.orden, limite);
                if (!libros.length && plan.palabras.length) {
                    const encontrados = await repositorio.titulos(plan.palabras);
                    if (encontrados.length) {
                        const ids = encontrados.slice(0, 8).map((t) => t.id_libro);
                        libros = await repositorio.buscar({ ids, campo: 'titulo' }, 'relevancia', limite);
                    }
                }
            }
        }
        return { libros, origen, plan };
    };
}

module.exports = { crearBuscadorIA, buscar: crearBuscadorIA() };
