/* Prueba de Web Push: envia SOLO al dispositivo del usuario autenticado.
   No crea ventas, autos ni clientes. Solo el servidor conoce VAPID privada. */
import admin from 'firebase-admin';
import webpush from 'web-push';
import { createHash } from 'node:crypto';

const headers = { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' };
const reply = (status,body) => new Response(JSON.stringify(body),{status,headers});
const getDb = () => {
  if(!admin.apps.length) {
    admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))});
  }
  return admin.firestore();
};

export default async (request) => {
  if(request.method !== 'POST')return reply(405,{ok:false,message:'Utilizá el botón de prueba desde la aplicación.'});
  if(!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY ||
     !process.env.FIREBASE_SERVICE_ACCOUNT_JSON || !process.env.VAPID_SUBJECT) {
    return reply(503,{ok:false,message:'Falta completar la configuración de push en Netlify.'});
  }

  const token = /^Bearer (\S+)$/.exec(request.headers.get('authorization')||'')?.[1];
  if(!token)return reply(401,{ok:false,message:'Iniciá sesión antes de enviar la prueba.'});

  try {
    const db = getDb();
    // Verificar identidad en Firebase antes de leer la suscripción.
    const verified = await admin.auth().verifyIdToken(token);
    const uid = verified.uid;
    const profile = await db.collection('usuarios').doc(uid).get();
    if(!profile.exists || profile.data().activo !== true ||
       !['Admin','Encargado','Vendedor'].includes(profile.data().rol)) {
      return reply(403,{ok:false,message:'Tu usuario no está habilitado.'});
    }

    const body = await request.json().catch(()=>({}));
    const suffix = String(body?.subscriptionHash || '');
    if(!/^[a-f0-9]{32}$/.test(suffix)) {
      return reply(400,{ok:false,message:'No encontramos una suscripción válida en este dispositivo.'});
    }
    const subscriptionRef = db.collection('push_subscriptions').doc(uid + '_' + suffix);
    const subscriptionDoc = await subscriptionRef.get();
    if(!subscriptionDoc.exists || !subscriptionDoc.data().activo ||
       subscriptionDoc.data().userId !== uid) {
      return reply(404,{ok:false,message:'Este dispositivo no está registrado. Tocá primero Activar push.'});
    }
    const subscription = subscriptionDoc.data();
    if(!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return reply(422,{ok:false,message:'La suscripción guardada está incompleta. Activá las push nuevamente.'});
    }
    // Asegurar que el ID de documento provenga realmente del endpoint guardado.
    const expected = createHash('sha256').update(subscription.endpoint).digest('hex').slice(0,32);
    if(expected !== suffix)return reply(400,{ok:false,message:'La suscripción no coincide con el dispositivo.'});

    // Limitar pruebas a una por minuto y dispositivo.
    const control = db.collection('push_test_rate').doc(uid + '_' + suffix);
    const now = Date.now();
    const allowed = await db.runTransaction(async tx => {
      const old = await tx.get(control);
      if(old.exists && now - Number(old.data().ultimaPruebaMs||0) < 60000)return false;
      tx.set(control,{ultimaPruebaMs:now});
      return true;
    });
    if(!allowed)return reply(429,{ok:false,message:'Ya se envió una prueba recientemente. Intentá nuevamente en un minuto.'});

    webpush.setVapidDetails(process.env.VAPID_SUBJECT,process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
    const pushResponse = await webpush.sendNotification(
      {endpoint:subscription.endpoint,keys:subscription.keys},
      JSON.stringify({
        title:'Martinelli Autos · Prueba',
        body:'¡Las notificaciones push están funcionando en este dispositivo!',
        url:'/'
      }),
      {TTL:300,urgency:'high'}
    );
    console.log('Push de prueba aceptada:',{uid,code:pushResponse.statusCode});
    return reply(200,{ok:true,accepted:true,message:'El servicio push aceptó el envío de prueba a este dispositivo.'});
  } catch(e) {
    const status = Number(e?.statusCode||0);
    console.warn('Error en envío push de prueba',status||e.message);
    if([404,410].includes(status))return reply(410,{ok:false,message:'La suscripción del dispositivo venció. Volvé a tocar Activar push y repetí la prueba.'});
    if([401,403].includes(status))return reply(401,{ok:false,message:'Tu sesión o tu suscripción ya no es válida. Volvé a iniciar sesión.'});
    return reply(500,{ok:false,message:'No se pudo completar la prueba. Revisá los Logs de push-test en Netlify.'});
  }
};
