// Solo expone la clave pública VAPID, nunca la privada.
export default async () => new Response(JSON.stringify({
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  configured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.FIREBASE_SERVICE_ACCOUNT_JSON && process.env.VAPID_SUBJECT)
}), { headers: { 'content-type':'application/json; charset=utf-8','cache-control':'no-store' } });
