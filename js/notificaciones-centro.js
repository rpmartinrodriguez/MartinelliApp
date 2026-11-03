/* Centro unificado de notificaciones de Martinelli.
   Vistas por usuario en Firestore; seguimientos realizados en CRM.
   No elimina historiales ni modifica datos sensibles de otras carteras. */
(() => {
  const MAX_VISTAS = 300;
  let uidActual = '';
  let vistas = new Set();
  let pendientes = new Map();
  let cargando = false;

  const $ = id => document.getElementById(id);
  const escapar = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[ch]);
  const hoyLocal = () => {
    const d = new Date();
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  };

  function validarSesion() {
    const id=window.state?.currentUser?.id || '';
    if(id!==uidActual){
      uidActual=id;
      vistas=new Set();
      pendientes.clear();
      if(id){
        try{
          vistas=new Set(JSON.parse(localStorage.getItem('martinelli_notifs_'+id)||'[]'));
        }catch(_){vistas=new Set();}
      }
    }
    return id;
  }

  function cerrar() {
    $('notif-dropdown')?.classList.add('hidden');
    $('notif-toggle')?.setAttribute('aria-expanded','false');
  }
  window.cerrarPanelNotificaciones=cerrar;
  window.togglePanelNotificaciones=event=>{
    event?.stopPropagation();
    const drop=$('notif-dropdown');
    if(!drop)return;
    drop.classList.toggle('hidden');
    $('notif-toggle')?.setAttribute('aria-expanded',String(!drop.classList.contains('hidden')));
  };

  function leadsVisibles() {
    const usuario=window.state?.currentUser;
    const leads=window.state?.consultas||[];
    if(!usuario)return [];
    if(usuario.rol==='Admin')return leads;
    if(usuario.rol==='Encargado')return leads.filter(c=>c.userId===usuario.id||
      (usuario.sucursalId && c.sucursalId===usuario.sucursalId));
    return leads.filter(c=>c.userId===usuario.id);
  }

  function recopilar() {
    const usuario=window.state?.currentUser;
    if(!usuario)return [];
    const resultado=[];
    const today=hoyLocal();
    for(const lead of leadsVisibles()){
      if(window.crmClienteCerrado?.(lead))continue;
      for(const h of lead.historial||[]){
        if(!h.completado && h.proximoContacto && h.proximoContacto<=today){
          resultado.push({
            id:'seguimiento:'+lead.id+':'+h.id, tipo:'seguimiento',
            titulo:'Contactar a '+(lead.nombre||'cliente'),
            texto:h.texto||'Seguimiento pendiente',
            detalle:h.proximoContacto<today?'Atrasado desde '+h.proximoContacto:'Para hoy',
            leadId:lead.id,historialId:h.id,orden:'0'+h.proximoContacto,
            puedeRealizar:usuario.rol==='Admin'||lead.userId===usuario.id
          });
        }
      }
      for(const auto of (window.coincidenciasClientesFlota?.(lead)||[])){
        resultado.push({
          id:'interes:'+lead.id+':'+auto.id,tipo:'interes',
          titulo:'Vehículo que busca '+(lead.nombre||'cliente'),
          texto:[auto.marca,auto.modelo].filter(Boolean).join(' '),
          detalle:'Coincidencia con la Flota',leadId:lead.id,orden:'1'
        });
      }
    }
    if(usuario.rol==='Admin'){
      for(const venta of window.state?.ventas||[]){
        const metodo=venta.metodoPago||'';
        if(venta.eliminado===true || (!metodo.includes('Crédito')&&!metodo.includes('Pagaré')))continue;
        const total=Number(venta.cuotasTotales||0),pagadas=Number(venta.cuotasPagadas||0);
        if(total<=pagadas)continue;
        const fecha=new Date((venta.fecha||'')+'T00:00:00');
        if(Number.isNaN(fecha.getTime()))continue;
        fecha.setMonth(fecha.getMonth()+total);
        const dias=Math.ceil((fecha-new Date())/86400000);
        if(dias<0||dias>60)continue;
        const etapa=dias<=20?'20':'60';
        resultado.push({
          id:'recompra:'+venta.id+':'+etapa,tipo:'recompra',
          titulo:'Posible recompra: '+(venta.compradorNombre||'Cliente'),
          texto:venta.autoDesc||'Vehículo vendido',
          detalle:etapa==='20'?'Menos de 20 días para finalizar':'Aproximadamente 2 meses para finalizar',
          ventaId:venta.id,telefono:venta.compradorTelefono||'',orden:'2'
        });
      }
    }
    return resultado.sort((a,b)=>a.orden.localeCompare(b.orden));
  }

  window.updateNotifications=()=>{
    if(!validarSesion() || !$('notif-list'))return;
    const items=recopilar();
    pendientes=new Map(items.map(x=>[x.id,x]));
    const activas=items.filter(x=>!vistas.has(x.id));
    const badge=$('notif-badge');
    badge?.classList.toggle('hidden',activas.length===0);
    const list=$('notif-list');
    if(!activas.length){
      list.innerHTML='<div class="p-6 text-center text-sm text-neutral-500">No tenés notificaciones pendientes.</div>';
      $('notif-mark-all')?.classList.add('hidden');
      return;
    }
    $('notif-mark-all')?.classList.remove('hidden');
    const visibles=activas.slice(0,60);
    list.innerHTML=visibles.map(x=>{
      const titulo=escapar(x.titulo),texto=escapar(x.texto),detalle=escapar(x.detalle);
      const id=escapar(x.id);
      const color=x.tipo==='seguimiento'?'text-amber-600':x.tipo==='interes'?'text-indigo-600':'text-green-600';
      return '<div class="flex gap-2 p-3 border-b border-neutral-100 dark:border-neutral-800">'
        +'<button type="button" data-notif-action="abrir" data-notif-id="'+id+'" '
        +'class="min-w-0 flex-1 text-left hover:opacity-75" title="Abrir detalle y cerrar la campanita">'
        +'<span class="block text-xs font-black '+color+'">'+detalle+'</span>'
        +'<span class="block text-sm font-bold text-neutral-900 dark:text-neutral-100">'+titulo+'</span>'
        +'<span class="block text-xs text-neutral-500 mt-1">'+texto+'</span></button>'
        +'<div class="flex flex-col gap-2 shrink-0">'
        +'<button type="button" data-notif-action="vista" data-notif-id="'+id+'" '
        +'class="rounded-lg px-2 py-1 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" '
        +'title="Marcar notificación como vista" aria-label="Marcar notificación como vista">'
        +'<i data-lucide="check" class="w-4 h-4"></i></button>'
        +(x.tipo==='seguimiento' && x.puedeRealizar
          ? '<button type="button" data-notif-action="realizada" data-notif-id="'+id+'" '
            +'class="rounded-lg px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-[10px] font-bold" '
            +'title="Marcar el seguimiento como realizado en CRM">Realizado</button>'
          : '')
        +'</div></div>';
    }).join('')+(activas.length>60?
      '<div class="p-3 text-xs text-center text-neutral-500">Mostrando 60 avisos. Marcá los atendidos para ver el resto.</div>':'');
    window.lucide?.createIcons();
  };
  // Reemplaza el render anterior de recompra para que no borre las alertas del CRM.
  window.checkNotifications=()=>window.updateNotifications?.();

  async function marcarVistas(ids) {
    const uid=validarSesion();
    if(!uid || !ids.length)return;
    const ref=window.doc(window.db,'notificaciones_vistas',uid);
    const añadidas=ids.filter(id=>pendientes.has(id));
    if(!añadidas.length)return;
    // Transacción: evita perder los checks de otro teléfono del mismo empleado.
    try {
      let finales=[];
      await window.fbRunTransaction(window.db,async tx=>{
        const actual=await tx.get(ref);
        const previas=actual.exists() && Array.isArray(actual.data().ids)?actual.data().ids:[];
        finales=[...new Set([...previas,...añadidas])].slice(-MAX_VISTAS);
        tx.set(ref,{ids:finales,actualizadoMs:Date.now()});
      });
      vistas=new Set([...vistas,...finales]);
      localStorage.setItem('martinelli_notifs_'+uid,JSON.stringify([...vistas].slice(-MAX_VISTAS)));
      window.updateNotifications();
    } catch(error) {
      console.error('No se pudo marcar una notificación como vista:',error);
      alert('No se pudo guardar el visto. Revisá las reglas de Firestore de notificaciones.');
    }
  }
  window.marcarTodasNotificacionesVistas=()=>marcarVistas(
    [...pendientes.keys()].filter(id=>!vistas.has(id))
  );

  window.cargarNotificacionesVistas=async()=>{
    const uid=validarSesion();
    if(!uid || cargando)return;
    cargando=true;
    try {
      const ref=window.doc(window.db,'notificaciones_vistas',uid);
      const doc=await window.fbGetDoc(ref);
      if(validarSesion()!==uid)return;
      if(doc.exists()){
        vistas=new Set([...vistas,...(Array.isArray(doc.data().ids)?doc.data().ids:[])]);
        localStorage.setItem('martinelli_notifs_'+uid,JSON.stringify([...vistas].slice(-MAX_VISTAS)));
      }
      window.updateNotifications();
      // Sincronizar las palomitas si este usuario abrió la app en más de un equipo.
      window.notificacionesLecturaUnsub?.();
      window.notificacionesLecturaUnsub=window.fbOnSnapshot(ref,snapshot=>{
        if(validarSesion()!==uid)return;
        if(snapshot.exists() && Array.isArray(snapshot.data().ids)){
          vistas=new Set([...vistas,...snapshot.data().ids]);
          localStorage.setItem('martinelli_notifs_'+uid,JSON.stringify([...vistas].slice(-MAX_VISTAS)));
          window.updateNotifications();
        }
      },error=>console.warn('No se pudo sincronizar la lectura de notificaciones:',error));
    }catch(error){
      console.warn('No se pudieron cargar los vistos de notificaciones:',error);
    }finally{cargando=false;}
  };

  window.abrirNotificacion= id=>{
    const item=pendientes.get(id);
    if(!item)return;
    cerrar();
    if(item.tipo==='seguimiento'||item.tipo==='interes'){
      window.switchTab?.('crm');
      window.openDetalleLead?.(item.leadId);
    } else if(item.tipo==='recompra'){
      window.switchTab?.('ventas');
      if(item.telefono){
        const href=window.formatWhatsAppLink?.(item.telefono,'');
        if(href)window.open(href,'_blank','noopener,noreferrer');
      }
    }
  };

  window.realizarSeguimientoNotificacion=async id=>{
    const item=pendientes.get(id);
    if(!item || item.tipo!=='seguimiento' || !item.puedeRealizar)return;
    try {
      // No se confunde "visto" con "realizado": esta acción actualiza el CRM.
      await window.markHistoryCompleted(item.leadId,item.historialId);
      const lead=window.state?.consultas?.find(c=>c.id===item.leadId);
      const historia=lead?.historial?.find(h=>h.id===item.historialId);
      if(!historia?.completado)throw new Error('No pudo confirmarse el seguimiento realizado');
      cerrar();
      window.updateNotifications();
    }catch(e){
      alert('No se pudo marcar como realizado. Verificá tu permiso sobre el cliente.');
    }
  };

  document.addEventListener('DOMContentLoaded',()=>{
    $('notif-list')?.addEventListener('click',event=>{
      const btn=event.target.closest('[data-notif-action]');
      if(!btn)return;
      const id=btn.dataset.notifId;
      if(btn.dataset.notifAction==='vista')marcarVistas([id]);
      else if(btn.dataset.notifAction==='realizada')window.realizarSeguimientoNotificacion(id);
      else window.abrirNotificacion(id);
    });
    document.addEventListener('pointerdown',event=>{
      if(!$('notif-container')?.contains(event.target))cerrar();
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape')cerrar();
    });
  });
})();