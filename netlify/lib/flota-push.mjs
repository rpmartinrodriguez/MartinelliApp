/* Despacho de novedades de Flota a todos los dispositivos activos.
   Uso exclusivo del servidor: no incluir estas credenciales en el navegador. */
import admin from 'firebase-admin';
import webpush from 'web-push';
import { createHash } from 'node:crypto';

export function getDb() {
  if(!admin.apps.length) {
    const json=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if(!json)throw Error('FIREBASE_SERVICE_ACCOUNT_JSON faltante');
    admin.initializeApp({credential:admin.credential.cert(JSON.parse(json))});
  }
  return admin.firestore();
}

export function configurePush() {
  const variables=['VAPID_PUBLIC_KEY','VAPID_PRIVATE_KEY','VAPID_SUBJECT','FIREBASE_SERVICE_ACCOUNT_JSON'];
  if(variables.some(v=>!process.env[v]))throw Error('Variables VAPID/Firebase incompletas');
  webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
}

const digest=s=>createHash('sha256').update(s).digest('hex');
const descripcion=ev=>String(ev.descripcion||'Cambio en Flota').slice(0,190);

export async function repartirNovedadFlota(db, eventId, ev) {
  if(!ev || !['alta','cambio','baja'].includes(ev.accion))return {aceptadas:0,fallidas:0};
  const lista=await db.collection('push_subscriptions').where('activo','==',true).get();
  let aceptadas=0,fallidas=0,duplicadas=0;
  const items=lista.docs;
  for(let start=0;start<items.length;start+=12){
    await Promise.all(items.slice(start,start+12).map(async subDoc=>{
      const sub=subDoc.data();
      if(!sub.endpoint || !sub.keys?.auth || !sub.keys?.p256dh || !sub.userId)return;
      const envioRef=db.collection('push_flota_envios').doc(digest(eventId+'|'+subDoc.id));
      const now=Date.now();
      // Dedupe incluso si la tarea programada y el envío instantáneo coinciden.
      const puedeEnviar=await db.runTransaction(async tx=>{
        const old=await tx.get(envioRef);
        if(old.exists){
          const previous=old.data();
          if(previous.estado==='enviado' || now-Number(previous.iniciadoEn||0)<120000)return false;
        }
        tx.set(envioRef,{eventoId:eventId,usuarioId:sub.userId,dispositivoId:subDoc.id,
          estado:'enviando',iniciadoEn:now});
        return true;
      });
      if(!puedeEnviar){duplicadas++;return;}
      try {
        const payload={
          title:'Martinelli Autos · Novedades de Flota',
          body:descripcion(ev),
          url:'/?seccion=flota',
          tag:'flota-'+eventId
        };
        await webpush.sendNotification({endpoint:sub.endpoint,keys:sub.keys},
          JSON.stringify(payload),{TTL:3600,urgency:'normal'});
        aceptadas++;
        await envioRef.update({estado:'enviado',enviadoEn:Date.now()});
      } catch(err) {
        fallidas++;
        const status=Number(err?.statusCode||0);
        console.warn('Push Flota rechazada',status||String(err.message||err));
        if([404,410].includes(status))await subDoc.ref.delete().catch(()=>{});
        await envioRef.delete().catch(()=>{});
      }
    }));
  }
  return {aceptadas,fallidas,duplicadas,dispositivos:items.length};
}
