/* Índice privado de coincidencias de clientes por teléfono y nombre.
   No expone a los vendedores los datos de clientes de otras carteras.
   Habilitar las reglas nuevas y luego indexar registros históricos. */
(() => {
  const cleanPhone = p => window.normalizarTelefonoCRM(p);
  const cleanName = p => String(p || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/\s+/g,' ').trim();
  const hash = async (prefix, value) => {
    const b = new TextEncoder().encode('martinelli-crm-v1:' + prefix + ':' + value);
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)))
      .map(v => v.toString(16).padStart(2,'0')).join('');
  };
  const indexRef = async (kind, value) => window.doc(window.db, 'crm_indices', await hash(kind, value));
  const member = () => window.state?.currentUser;
  const matchLocal = (name, phone, except) => (window.state?.consultas || []).find(c =>
    c.id !== except && ((phone.length >= 9 && cleanPhone(c.telefono) === phone)
      || (name.length >= 6 && cleanName(c.nombre) === name && !phone)));
  const aviso = (message) => { const el = document.getElementById('gl-duplicado-aviso');
    if (el) { el.textContent = message || ''; el.classList.toggle('hidden', !message); } };
  window.consultarConflictoCRM = async (name, phone, except = null) => {
    const n = cleanName(name), p = cleanPhone(phone), u = member();
    if (!u || !window.fbGetDoc) return null;
    if (p.length >= 9) {
      const r = await indexRef('telefono',p), snap = await window.fbGetDoc(r);
      if (snap.exists() && snap.data().clienteId !== except) return {kind:'telefono',otro:snap.data().userId !== u.id};
    }
    if (n.length >= 6) {
      const r = await indexRef('nombre',n), snap = await window.fbGetDoc(r);
      if (snap.exists() && snap.data().clienteId !== except) return {kind:'nombre',otro:snap.data().userId !== u.id};
    }
    return null;
  };
  let checkingClient = 0;
  window.verificarClienteRemoto = async () => {
    const step=++checkingClient;
    const name=document.getElementById('gl-nombre')?.value || '';
    const phone=document.getElementById('gl-tel')?.value || '';
    if (!name && !phone) return;
    try {
      const result=await window.consultarConflictoCRM(name,phone);
      if(step!==checkingClient)return;
      const el=document.getElementById('gl-duplicado-aviso');
      if(!el)return;
      const text=result ? (result.kind==='telefono'
        ? 'Este teléfono ya fue registrado en el CRM' + (result.otro?' por otra cartera.':' en tu cartera.') 
        : 'Hay un cliente con ese nombre registrado. Comprobá que no sea la misma persona.') : '';
      el.textContent=text;el.classList.toggle('hidden',!text);
    }catch(e){ console.warn('No se pudo consultar duplicados:',e); }
  };
  window.comprobarClienteExistente = async (name, phone, except = null) => {
    const local = matchLocal(cleanName(name),cleanPhone(phone),except);
    const item = local ? {kind:'telefono',otro:local.userId!==member()?.id} :
      await window.consultarConflictoCRM(name,phone,except);
    if (!item) { aviso(''); return false; }
    if (item.kind === 'nombre') {
      const mensaje = 'Hay un registro previo con el mismo nombre. Verificá que no sea la misma persona. Si es otra persona, podés continuar con un teléfono diferente.';
      aviso(mensaje);
      return !window.confirm(mensaje + '\n\n¿Querés continuar?');
    }
    const mensaje = item.otro
      ? 'Ese teléfono ya está asignado a la cartera de otro vendedor. Solicitá revisión a administración.'
      : 'El teléfono ya está registrado. Abrí la ficha existente para continuar el seguimiento.';
    aviso(mensaje); alert(mensaje); return true;
  };
  window.crearClienteUnico = async (data) => {
    const u = member(); if (!u) throw Error('Ingresá antes de guardar.');
    const p = cleanPhone(data.telefono), n = cleanName(data.nombre);
    if (p.length < 9) throw Error('Ingresá un celular válido, con código de área.');
    const telefonoRef = await indexRef('telefono',p);
    const nombreRef = n.length >= 6 ? await indexRef('nombre',n) : null;
    const clienteRef = window.doc(window.collection(window.db,'consultas'));
    await window.fbRunTransaction(window.db,async tx => {
      const telDoc=await tx.get(telefonoRef);
      const nameDoc=nombreRef ? await tx.get(nombreRef): null;
      if(telDoc.exists()) throw Error('Este teléfono ya está registrado por otro usuario o en tu propia cartera.');
      tx.set(clienteRef,{...data,userId:u.id,sucursalId:u.sucursalId||null});
      tx.set(telefonoRef,{userId:u.id,clienteId:clienteRef.id,fecha:new Date().toISOString()});
      if(nombreRef && !nameDoc.exists())tx.set(nombreRef,{userId:u.id,clienteId:clienteRef.id,fecha:new Date().toISOString()});
    });
    (window.state.consultas ||= []).push({id:clienteRef.id,...data,userId:u.id,sucursalId:u.sucursalId||null});
    window.reRenderActiveViews?.(); window.updateNotifications?.();
    return {id:clienteRef.id};
  };
  window.actualizarClienteUnico = async (id,data) => {
    const actual=(window.state.consultas||[]).find(c=>c.id===id);
    if(!actual)throw Error('No se encontró el cliente.');
    const oldP=cleanPhone(actual.telefono),newP=cleanPhone(data.telefono||actual.telefono);
    const newName=cleanName(data.nombre||actual.nombre);
    if(newP.length<9)throw Error('Ingresá un celular válido.');
    const oldRef=oldP.length>=9?await indexRef('telefono',oldP):null;
    const newRef=await indexRef('telefono',newP);
    const nameRef=newName.length>=6?await indexRef('nombre',newName):null;
    const oldName=cleanName(actual.nombre),oldNameRef=oldName.length>=6?await indexRef('nombre',oldName):null;
    const clientRef=window.doc(window.db,'consultas',id);
    await window.fbRunTransaction(window.db,async tx=>{
      const newIndex=await tx.get(newRef);
      const oldIndex=oldRef && oldRef.path!==newRef.path? await tx.get(oldRef):null;
      const nameIndex=nameRef ? await tx.get(nameRef):null;
      const oldNameIndex=oldNameRef && oldNameRef.path!==nameRef?.path?await tx.get(oldNameRef):null;
      if(newIndex.exists() && newIndex.data().clienteId!==id)throw Error('El nuevo teléfono pertenece a otra cartera.');
      tx.update(clientRef,data);
      if(!newIndex.exists())tx.set(newRef,{userId:actual.userId,clienteId:id,fecha:new Date().toISOString()});
      if(oldIndex?.exists() && oldIndex.data().clienteId===id)tx.delete(oldRef);
      if(oldNameIndex?.exists() && oldNameIndex.data().clienteId===id)tx.delete(oldNameRef);
      if(nameRef && !nameIndex.exists())tx.set(nameRef,{userId:actual.userId,clienteId:id,fecha:new Date().toISOString()});
    });
    Object.assign(actual,data); window.reRenderActiveViews?.();
  };
  window.eliminarClienteUnico = async id => {
    const actual=(window.state.consultas||[]).find(c=>c.id===id);
    if(!actual) return;
    const p=cleanPhone(actual.telefono), idx=p.length>=9?await indexRef('telefono',p):null;
    const clientRef=window.doc(window.db,'consultas',id);
    const name=cleanName(actual.nombre),nameRef=name.length>=6?await indexRef('nombre',name):null;
    await window.fbRunTransaction(window.db,async tx=>{
      const data=idx?await tx.get(idx):null;
      const nameData=nameRef?await tx.get(nameRef):null;
      tx.delete(clientRef);
      if(data?.exists() && data.data().clienteId===id)tx.delete(idx);
      if(nameData?.exists() && nameData.data().clienteId===id)tx.delete(nameRef);
    });
    window.state.consultas=window.state.consultas.filter(c=>c.id!==id);
    window.reRenderActiveViews?.();
  };
  // Solo admin: tarea opcional de migración de datos previos, sin reemplazar carteras existentes.
  window.indexarCRMExistente = async () => {
    if(member()?.rol!=='Admin') return;
    if(!confirm('Preparar la detección de duplicados para clientes ya existentes. No se borrarán clientes. ¿Continuar?')) return;
    let ok=0,dup=0,errores=0;
    for(const c of [...(window.state.consultas||[])]) {
      const p=cleanPhone(c.telefono),n=cleanName(c.nombre);
      if(p.length<9){errores++;continue;}
      try {
        const pr=await indexRef('telefono',p),nr=n.length>=6?await indexRef('nombre',n):null;
        await window.fbRunTransaction(window.db,async tx=>{
          const current=await tx.get(pr), nameCurrent=nr?await tx.get(nr):null;
          if(current.exists()){dup++;return;}
          tx.set(pr,{userId:c.userId,clienteId:c.id,fecha:new Date().toISOString()});
          if(nr && !nameCurrent.exists())tx.set(nr,{userId:c.userId,clienteId:c.id,fecha:new Date().toISOString()});
          ok++;
        });
      }catch(e){console.warn('No se pudo indexar cliente',c.id,e);errores++;}
    }
    alert('Índice CRM: '+ok+' vinculados, '+dup+' ya existentes o repetidos, '+errores+' sin índice. Revisá teléfonos duplicados si existen.');
  };
})();
