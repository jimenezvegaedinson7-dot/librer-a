const express=require('express');
const rateLimit=require('express-rate-limit');
const {conversar}=require('../controllers/asistente.controller');
const router=express.Router();
const limite=rateLimit({windowMs:60000,limit:20,standardHeaders:true,legacyHeaders:false,
    message:{success:false,mensaje:'Has realizado muchas consultas. Espera un momento y vuelve a intentar.'}});
router.post('/',limite,conversar);
module.exports=router;
