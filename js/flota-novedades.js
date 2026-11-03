/* Novedades de Flota: se guarda el último aviso leído por usuario en Firestore.
   Funciona al ingresar con una sesión válida. Solo contiene datos de la Flota. */
(() => {
  const esc = value => String(value || '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tituloAuto = auto => [auto?.marca || '', auto?.modelo || '', auto?.patente ? '('+auto.patente+')' : ''].join(' ').replace(/\s+/g,' ').trim() || 'vehículo';
  let pendientes = [];
  let lecturaRef = null;
  let abierta = false;
  let consultando = false;
  let ultimaConsulta = 0;

  window.registrarNovedadFlota = async (accion, nuevo, anterior) => {
    const usuario = window.state?.currentUser;
    if(!usuario?.id)return;
    let descripcion = '';
    if(accion === 'alta') descripcion = 'Se incorporó a Flota: ' + tituloAuto(nuevo);
    else if(accion === 'baja') descripcion = 'Se quitó de Flota: ' + tituloAuto(anterior);
    else if(nuevo?.estado !== anterior?.estado)
      descripcion = 'Cambió el estado de ' + tituloAuto(nuevo) + ' a ' + (nuevo.estado || 'Sin especificar');
    else if(nuevo?.precio !== anterior?.precio)
      descripcion = 'Se actualizó el precio de ' + tituloAuto(nuevo);
    else descripcion = 'Se modificó la ficha de ' + tituloAuto(nuevo);
    const data = {accion,descripcion,fechaMs:Date.now(),usuarioId:usuario.id,vehiculoId:nuevo?.id||anterior?.id||''};
    await window.addDoc(window.collection(window.db,'flota_novedades'),data);
  };

  window.mostrarNovedadesFlotaAlEntrar = async () => {
    const usuario = window.state?.currentUser;
    if(!usuario || consultando || abierta)return;
    consultando = true;
    ultimaConsulta = Date.now();
    try {
      lecturaRef = window.doc(window.db,'flota_lecturas',usuario.id);
      const ultima = await window.fbGetDoc(lecturaRef);
      const desde = ultima.exists() ? Number(ultima.data().ultimaVistaMs || 0) : 0;
      const listado = window.fbQuery(
        window.collection(window.db,'flota_novedades'),
        window.fbWhere('fechaMs','>',desde),
        window.fbOrderBy('fechaMs','desc'),
        window.fbLimit(25)
      );
      const snapshot = await window.fbGetDocsFromServer(listado);
      pendientes = snapshot.docs.map(doc => ({id:doc.id,...doc.data()}));
      if (window.state?.currentUser?.id !== usuario.id)return;
      if(!pendientes.length) {
        if(!ultima.exists())await window.fbSetDoc(lecturaRef,{ultimaVistaMs:Date.now()});
        return;
      }
      const list=document.getElementById('flota-novedades-list');
      const count=document.getElementById('flota-novedades-count');
      const modal=document.getElementById('modal-novedades-flota');
      if(!list || !modal)return;
      if(count)count.textContent = pendientes.length === 25 ? 'Últimas 25 novedades' :
        pendientes.length + (pendientes.length===1?' novedad':' novedades');
      list.innerHTML = pendientes.map(ev => {
        const fecha = new Date(Number(ev.fechaMs)||Date.now()).toLocaleString('es-AR',
          {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
        return '<div class="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">'
          + '<p class="text-xs font-bold text-neutral-400 mb-1">'+esc(fecha)+'</p>'
          + '<p class="font-semibold text-sm text-neutral-800 dark:text-neutral-100">'+esc(ev.descripcion)+'</p></div>';
      }).join('');
      abierta=true;
      modal.classList.remove('hidden');
      window.lucide?.createIcons();
    } catch (e) {
      console.warn('No se pudieron consultar novedades de la Flota',e);
    } finally {consultando=false}
  };

  window.cerrarNovedadesFlota = async (verFlota=false) => {
    document.getElementById('modal-novedades-flota')?.classList.add('hidden');
    abierta=false;
    if(verFlota)window.switchTab?.('flota');
    if(!lecturaRef || !pendientes.length)return;
    const leidos = pendientes;
    pendientes=[];
    try {
      const maximo = Math.max(...leidos.map(x=>Number(x.fechaMs)||0));
      await window.fbSetDoc(lecturaRef,{ultimaVistaMs:maximo});
    } catch(e) {
      console.warn('No se pudo marcar Flota como leída: se mostrará nuevamente.',e);
    }
  };
  // Si el usuario vuelve a la PWA tras usar otras aplicaciones, revisar novedades
  // sin mostrar nada ya marcado como leído.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !window.state?.currentUser || Date.now() - ultimaConsulta < 30000)return;
    window.mostrarNovedadesFlotaAlEntrar();
  });
})();
