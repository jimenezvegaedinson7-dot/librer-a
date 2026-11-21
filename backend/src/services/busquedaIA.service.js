const modelo = require('../models/busquedaIA.model');
const gemini = require('../integrations/gemini');
const { normalizar, fueraDeAlcance, interpretarLocal, validarPlan } = require('../utils/busquedaIA');

function filtrosDe(plan) {
    return {
        ids: plan.ids || [],
        autor: plan.autores[0] || null,
        categoria: plan.categorias[0] || null,
        palabras: plan.palabras,
        isbn: plan.isbn,
        minimo: plan.minimo,
        maximo: plan.maximo,
        stock: plan.stock,
        oferta: plan.oferta
    };
}

function crearBuscadorIA({ repositorio = modelo, interprete = gemini.interpretar } = {}) {
    return async function buscar({ consulta, tipo = 'todos', categoria = '', limite = 12 } = {}) {
        const texto = String(consulta || '').trim().slice(0, 200);
        if (!texto || fueraDeAlcance(normalizar(texto))) return { libros: [], origen: 'catalogo', plan: null };
        const facetas = await repositorio.facetas();
        const respuesta = await interprete({ consulta: texto, tipo, categoria, facetas });
        const planIA = validarPlan(respuesta.plan, facetas, { tipo, categoria });
        let plan = planIA;
        let origen = respuesta.plan ? 'gemini' : 'catalogo';
        let libros = await repositorio.buscar(filtrosDe(plan), plan.orden, limite);
        if (!libros.length && plan.palabras.length) {
            const titulos = await repositorio.titulos(plan.palabras);
            if (titulos.length) libros = await repositorio.buscar({ ids: titulos.slice(0, 8).map((t) => t.id_libro) }, 'relevancia', limite);
        }
        if (!libros.length && respuesta.plan) {
            plan = interpretarLocal({ consulta: texto, tipo, categoria, facetas });
            libros = await repositorio.buscar(filtrosDe(plan), plan.orden, limite);
            origen = 'catalogo';
        }
        return { libros, origen, plan };
    };
}

module.exports = { crearBuscadorIA, buscar: crearBuscadorIA() };
