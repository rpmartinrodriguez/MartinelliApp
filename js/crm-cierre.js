/* Cierres CRM: vendidos asociados a ventas y cierres manuales sin venta.
   Conserva toda la ficha, la fecha original y el historial de seguimiento. */
(() => {
  const $ = id => document.getElementById(id);
  window.crmClienteCerrado = lead => Boolean(lead &&
    (lead.estadoLead==='Vendido' || lead.cierreCRM?.estado === 'Vendido' ||
     lead.cierreCRM?.estado === 'Frio'));
  const canEdit = lead => Boolean(lead && window.state?.currentUser &&
    (window.state.currentUser.rol==='Admin' || lead.userId===window.state.currentUser.id));
  const fechaHoy = () => window.fechaLocalHoy?.() ||
    new Date().toISOString().slice(0,10);
  const safe = value => String(value??'').replace(/[&<>"']/g,k=>({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[k]);

  // Se usa solo con una venta registrada, nunca por el mero estado Vendido
  // de un auto que podrían haber consultado varios clientes.
  window.cerrarClienteCRM = async ({clienteId,estado,autoId=null,ventaId=null,motivo='',fuente='manual'}) => {
    const lead=(window.state?.consultas||[]).find(c=>c.id===clienteId);
    if(!lead)throw new Error('No se encontró el cliente en tu cartera.');
    if(!canEdit(lead))throw new Error('Solo el vendedor responsable o administración puede cerrar este cliente.');
    if(!['Vendido','Frio'].includes(estado))throw new Error('Tipo de cierre desconocido.');
    if(estado==='Vendido' && (!ventaId || !autoId))
      throw new Error('Para cerrar como vendido se requiere una venta y vehículo vinculados.');
    if(estado==='Frio' && !String(motivo||'').trim())
      throw new Error('Indicá por qué se cierra sin venta.');
    if(lead.cierreCRM?.estado===estado && estado==='Frio')return; // Sin duplicar
    if(lead.estadoLead==='Vendido' && estado==='Frio')
      throw new Error('Una venta concretada no puede cerrarse como sin operación.');

    const actual=fechaHoy();
    const descripcion=estado==='Vendido'
      ? 'Venta concretada en Flota. Cliente cerrado y vinculado con la operación.'
      : 'Cliente cerrado sin venta (Frío): '+String(motivo).trim();
    const nueva={
      estadoLead:estado==='Vendido'?'Vendido':'Frío',
      cierreCRM:{
        estado,fecha:actual,motivo:String(motivo||'').trim().slice(0,400),
        autoId:estado==='Vendido'?autoId:null,
        ventaId:estado==='Vendido'?ventaId:null,
        usuarioId:window.state.currentUser.id,fuente
      },
      historial:[...(lead.historial||[]),{
        id:window.generateId?.()||String(Date.now()),
        fechaCarga:actual,texto:descripcion,proximoContacto:null,completado:true
      }]
    };
    await window.fbUpdate('consultas',clienteId,nueva);
    if(window.state?.selectedAutoId)window.renderDetalleAuto?.();
    window.renderClientesView?.();
    window.updateNotifications?.();
  };

  window.abrirCierreClienteCRM = id => {
    const lead=(window.state?.consultas||[]).find(c=>c.id===id);
    if(!lead || !canEdit(lead))return;
    if(window.crmClienteCerrado(lead)){
      alert('Este cliente ya está cerrado. Podés reactivarlo desde su ficha si fue un cierre sin venta.');
      return;
    }
    const motivo=prompt('Cerrar cliente como FRÍO / SIN VENTA.\n\nIngresá el motivo del cierre (por ejemplo, no responde o desistió):');
    if(motivo===null)return;
    if(!motivo.trim()){alert('Indicá un motivo para cerrar al cliente.');return;}
    if(!confirm('¿Confirmás cerrar a '+lead.nombre+' sin venta?\n\nSe conservará su historial y dejará de aparecer como oportunidad activa.'))return;
    window.cerrarClienteCRM({clienteId:id,estado:'Frio',motivo,fuente:'manual'})
      .then(()=>window.openDetalleLead?.(id))
      .catch(err=>alert('No se pudo cerrar el cliente: '+(err.message||err)));
  };

  window.reactivarClienteCRM = async id => {
    const lead=(window.state?.consultas||[]).find(c=>c.id===id);
    if(!canEdit(lead))return;
    if(lead.estadoLead==='Vendido' || lead.cierreCRM?.estado==='Vendido'){
      alert('El cliente ya tiene una venta registrada. Su cierre debe conservarse en el historial.');
      return;
    }
    if(lead.cierreCRM?.estado!=='Frio')return;
    if(!confirm('¿Querés reactivar al cliente '+lead.nombre+'? Su temperatura se volverá a calcular según la fecha de alta original.'))return;
    try{
      await window.fbUpdate('consultas',id,{
        cierreCRM:null,estadoLead:'Frío',
        historial:[...(lead.historial||[]),{
          id:window.generateId?.()||String(Date.now()),fechaCarga:fechaHoy(),
          texto:'Cliente reactivado en CRM.',proximoContacto:null,completado:true
        }]
      });
      window.openDetalleLead?.(id);
      window.updateNotifications?.();
    }catch(e){alert('No se pudo reactivar el cliente: '+(e.message||e));}
  };

  window.seleccionarClienteCRMVenta = id => {
    const lead=(window.state?.consultas||[]).find(c=>c.id===id);
    if(!lead)return;
    const nombre=$('vent-comp-nombre'),tel=$('vent-comp-tel');
    if(nombre)nombre.value=lead.nombre||'';
    if(tel)tel.value=lead.telefono||'';
  };

  // Al cambiar el nombre escrito, limpiar cualquier selección anterior. Así
  // jamás se vincula otra persona a una venta por coincidencia casual.
  window.invalidarVinculoCRMVenta=()=>{
    const sel=$('vent-crm-cliente');
    if(sel && sel.value)sel.value='';
  };
})();