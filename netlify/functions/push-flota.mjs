/* Envío inmediato al guardar una modificación de Flota.
   Sólo acepta eventos registrados por el usuario autenticado. */
import admin from 'firebase-admin';
import { getDb, configurePush, repartirNovedadFlota } from '../lib/flota-push.mjs';
const respond=(status,data)=>new Response(JSON.stringify(data),{status,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export default async request=>{
  if(request.method!=='POST')return respond(405,{ok:false,message:'Método no permitido'});
  const token=/^Bearer (\S+)$/.exec(request.headers.get('authorization')||'')?.[1];
  if(!token)return respond(401,{ok:false,message:'Iniciá sesión para enviar novedades'});
  try {
    configurePush();
    const db=getDb();
    const auth=await admin.auth().verifyIdToken(token);
    const profile=await db.collection('usuarios').doc(auth.uid).get();
    if(!profile.exists || profile.data().activo!==true ||
       !['Admin','Encargado','Vendedor'].includes(profile.data().rol))
      return respond(403,{ok:false,message:'Usuario inactivo o sin permiso'});
    const {eventoId}=await request.json();
    if(typeof eventoId!=='string' || !/^[A-Za-z0-9]{12,40}$/.test(eventoId))
      return respond(400,{ok:false,message:'Identificador de evento incorrecto'});
    const evento=await db.collection('flota_novedades').doc(eventoId).get();
    if(!evento.exists || evento.data().usuarioId!==auth.uid)
      return respond(403,{ok:false,message:'El evento no corresponde a este usuario'});
    const edad=Date.now()-Number(evento.data().fechaMs||0);
    if(edad< -60000 || edad>120000)return respond(400,{ok:false,message:'Evento fuera de plazo'});
    const result=await repartirNovedadFlota(db,eventoId,evento.data());
    console.log('Flota push inmediata',result);
    return respond(200,{ok:true,...result});
  }catch(err){
    console.error('Error push Flota inmediata',err?.message||err);
    return respond(500,{ok:false,message:'No se pudo completar el envío inmediato; se reintentará automáticamente'});
  }
};
