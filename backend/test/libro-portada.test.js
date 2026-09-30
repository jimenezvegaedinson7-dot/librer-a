const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
let fallo = true;
const borradas = [];
const dobles = {
    '../src/models/libro.model.js': {obtenerPorId:async () => ({id_libro:1,titulo:'Audit',isbn:'old',precio:10,id_autor:1,id_categoria:1,estado:1,portada:'old'}),
        actualizar:async () => { if(fallo) throw Object.assign(new Error('duplicate'),{code:'23505'}); return 1; }},
    '../src/models/autor.model.js': {obtenerPorId:async () => ({id_autor:1})},
    '../src/models/categoria.model.js': {obtenerPorId:async () => ({id_categoria:1})},
    '../src/models/historial.model.js': {crear:async () => 1},
    '../src/utils/cloudinary.js': {publicIdDesdeUrl:url => url, eliminarImagen:async id => borradas.push(id)}
};
for(const [archivo,exports] of Object.entries(dobles)) {
    const id=path.resolve(__dirname,archivo); require.cache[id]={id,filename:id,loaded:true,exports};
}
const {actualizarLibro}=require('../src/controllers/libro.controller');
async function editar() {
    const res={statusCode:200,status(code){this.statusCode=code;return this;},json(data){this.body=data;return this;}};
    await actualizarLibro({params:{id:'1'},body:{isbn:'duplicado'},usuario:{id_usuario:1},file:{cloudinaryUrl:'new'}},res);
    return res;
}
test('ISBN duplicado con nueva portada nunca borra la portada vigente',async () => {
    assert.equal((await editar()).statusCode,409); assert.ok(!borradas.includes('old'));
});
test('portada anterior se elimina solo después de guardar correctamente',async () => {
    fallo=false; borradas.length=0; assert.equal((await editar()).statusCode,200); assert.deepEqual(borradas,['old']);
});
