/* Respaldo: cada cinco minutos busca novedades de Flota que no llegaron a push.
   Sólo corre automáticamente en el deploy de producción de Netlify. */
import { getDb, configurePush, repartirNovedadFlota } from '../lib/flota-push.mjs';

export default async ()=>{
  configurePush();
  const db=getDb();
  const now=Date.now();
  // Consulta retrospectiva por seguridad: permite recuperar eventos cuyo envío inmediato falló.
  const desde=now-6*60*60*1000;
  const query=await db.collection('flota_novedades')
    .where('fechaMs','>=',desde).orderBy('fechaMs','desc').limit(100).get();
  let eventos=0,aceptadas=0,fallidas=0;
  for(const doc of [...query.docs].reverse()){
    const r=await repartirNovedadFlota(db,doc.id,doc.data());
    eventos++;aceptadas+=r.aceptadas;fallidas+=r.fallidas;
  }
  console.log('Flota push respaldo',{eventos,aceptadas,fallidas});
};
export const config={schedule:'*/5 * * * *'};
