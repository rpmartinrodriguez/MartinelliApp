/* Netlify Scheduled Function: procesa oportunidades y seguimientos hasta cada 10 min.
   Requiere FIREBASE_SERVICE_ACCOUNT_JSON y VAPID_* configuradas como secretos. */
import admin from 'firebase-admin';
import webpush from 'web-push';
import { createHash } from 'node:crypto';
const norm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const matches = (c,a) => {
  if(c.estadoLead==='Vendido'||a.estado==='Vendido')return false;
  if(c.autoId && c.autoId===a.id)return true;
  const txt=' '+norm([c.marcaInteres,c.notas,...(c.historial||[]).map(h=>h.texto)].join(' '))+' ';
  const marca=norm(a.marca), modelo=norm(a.modelo);
  const tokens=modelo.split(' ').filter(t=>t.length>=3 &&
    !['manual','automatico','sedan','hatchback','full','base'].includes(t));
  const marcaCoincide=Boolean(marca && txt.includes(' '+marca+' '));
  const coincidentes=tokens.filter(t=>txt.includes(' '+t+' '));
  return coincidentes.length>0 && (marcaCoincide || coincidentes.some(t=>t.length>=5));
};
const getDb=()=>{
  if(!admin.apps.length){
    const json=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if(!json)throw Error('FIREBASE_SERVICE_ACCOUNT_JSON faltante');
    admin.initializeApp({credential:admin.credential.cert(JSON.parse(json))});
  }
  return admin.firestore();
};
const hash=s=>createHash('sha256').update(s).digest('hex');
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export default async () => {
  if(!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.FIREBASE_SERVICE_ACCOUNT_JSON || !process.env.VAPID_SUBJECT){
    console.warn('Push sin credenciales configuradas'); return;
  }
  const db=getDb();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,process.env.VAPID_PRIVATE_KEY);
  const date=today(),now=Date.now();
  const jobRef=db.collection('push_jobs').doc('crm-stock');
  const oldJob=await jobRef.get();
  const last=oldJob.exists ? oldJob.data() : {};
  const desde=Number(last.lastStockScan || now-24*60*60*1000);
  const horaArg=Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hour12:false,
    timeZone:'America/Argentina/Buenos_Aires'}).format(new Date()));
  const recordatoriosDiarios=horaArg >= 9 && last.ultimaFechaRecordatorios!==date;
  // No volver a leer todo el CRM cada diez minutos si no hay autos nuevos.
  const autosSnap=await db.collection('autos').where('createdAt','>',desde)
    .where('createdAt','<=',now).limit(200).get();
  const autos=autosSnap.docs.map(d=>({id:d.id,...d.data()}));
  if(!autos.length && !recordatoriosDiarios){
    await jobRef.set({lastStockScan:now},{merge:true}); return;
  }
  const leadsSnap=await db.collection('consultas').limit(2000).get();
  const clientes=leadsSnap.docs.map(d=>({id:d.id,...d.data()}));
  const events=[];
  for(const c of clientes){
    if(!c.userId)continue;
    for(const a of autos)if(matches(c,a))
      events.push({userId:c.userId,key:'stock:'+c.id+':'+a.id,title:'Vehículo disponible',
        body:'Un '+a.marca+' '+a.modelo+' coincide con el interés de '+c.nombre+'.',url:'/?cliente='+encodeURIComponent(c.id)});
    if(recordatoriosDiarios) for(const h of (c.historial||[]))if(!h.completado && h.proximoContacto && h.proximoContacto<=date)
      events.push({userId:c.userId,key:'seguimiento:'+c.id+':'+h.id+':'+date,title:'Seguimiento de cliente',
        body:'Tenés que contactar a '+c.nombre+'.',url:'/?cliente='+encodeURIComponent(c.id)});
  }
  const subs=new Map();
  let enviados=0;
  for(const ev of events.slice(0,200)){
    if(!subs.has(ev.userId)){
      const snap=await db.collection('push_subscriptions').where('userId','==',ev.userId).get();
      subs.set(ev.userId,snap.docs.filter(d=>d.data().activo).map(d=>({ref:d.ref,...d.data()})));
    }
    const list=subs.get(ev.userId);
    if(!list.length)continue;
    const ref=db.collection('push_envios').doc(hash(ev.userId+'|'+ev.key));
    const claim=await db.runTransaction(async tx=>{
      const old=await tx.get(ref); if(old.exists)return false;
      tx.create(ref,{userId:ev.userId,key:ev.key,estado:'procesando',creadoEn:now});return true;
    });
    if(!claim)continue;
    let count=0;
    for(const sub of list){
      try{
        await webpush.sendNotification({endpoint:sub.endpoint,keys:sub.keys},
          JSON.stringify({title:ev.title,body:ev.body,url:ev.url}),{TTL:3600});
        count++;
      }catch(e){
        console.warn('Push rechazada:',e.statusCode||e.message);
        if([404,410].includes(e.statusCode))await sub.ref.delete().catch(()=>{});
      }
    }
    if(count>0){enviados+=count;await ref.update({estado:'enviado',enviadoEn:Date.now(),dispositivos:count});}
    else await ref.delete().catch(()=>{});
  }
  await jobRef.set({lastStockScan:now,...(recordatoriosDiarios?{ultimaFechaRecordatorios:date}:{})},{merge:true});
  console.log('Push entregadas al servicio:',enviados);
};
export const config={schedule:'*/10 * * * *'};
