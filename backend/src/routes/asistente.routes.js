const express=require('express');
const rateLimit=require('express-rate-limit');
const {conversar,obtenerMemoria,guardarMemoria,borrarMemoria}=require('../controllers/asistente.controller');
const verificarToken=require('../middlewares/auth.middleware');
const {verificarRol}=require('../middlewares/rol.middleware');
const {ROLES}=require('../utils/roles');
const router=express.Router();
const limite=rateLimit({windowMs:60000,limit:20,standardHeaders:true,legacyHeaders:false,
    message:{success:false,mensaje:'Has realizado muchas consultas. Espera un momento y vuelve a intentar.'}});
router.post('/',limite,conversar);
// Memoria por cliente (requiere sesión de cliente).
const limiteMemoria=rateLimit({windowMs:60000,limit:30,standardHeaders:true,legacyHeaders:false,
    message:{success:false,mensaje:'Demasiadas solicitudes. Espera un momento.'}});
const soloCliente=[limiteMemoria,verificarToken,verificarRol(ROLES.CLIENTE)];
router.get('/memoria',...soloCliente,obtenerMemoria);
router.put('/memoria',...soloCliente,guardarMemoria);
router.delete('/memoria',...soloCliente,borrarMemoria);
module.exports=router;
