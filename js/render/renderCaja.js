// ==========================================
// js/render/renderCaja.js
// ==========================================

window.renderCajaView = () => {
    const table = document.getElementById('caja-table');
    const statsContainer = document.getElementById('caja-stats');
    const filterContainer = document.getElementById('caja-filters-container');
    const btnPendientes = document.getElementById('btn-ver-pendientes');
    
    if (!table || !statsContainer) {
        return;
    }

    const currentRole = window.state.currentUser.rol;
    const currentUserId = window.state.currentUser.id;
    const currentSuc = window.state.currentUser.sucursalId;

    // 1. Mostrar botón de "Cobros Pendientes" solo si hay permisos
    if (currentRole === 'Admin' || currentRole === 'Encargado') {
        if (btnPendientes) {
            btnPendientes.classList.remove('hidden');
        }
    } else {
        if (btnPendientes) {
            btnPendientes.classList.add('hidden');
        }
    }

    // Selección por botones, usando nombres reales de Firebase.
    const safe = v => String(v ?? '').replace(/[&<>"']/g, k =>
        ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[k]));
    const users = (window.state.usuarios || []).slice();
    if(!users.some(u=>u.id===currentUserId))users.unshift(window.state.currentUser);
    const disponibles = currentRole === 'Admin' ? users :
        currentRole === 'Encargado' ? users.filter(u=>u.sucursalId===currentSuc && u.rol!=='Admin') :
        [window.state.currentUser];
    if(window.state.cajaFiltroUsuario && !disponibles.some(u=>u.id===window.state.cajaFiltroUsuario))
        window.state.cajaFiltroUsuario='';
    const signature=currentRole+':'+disponibles.map(u=>u.id+'|'+u.nombre).join(';');
    if(filterContainer && (filterContainer.dataset.signature!==signature || !document.getElementById('caja-filters-wrapper'))){
        const previousSearch=document.getElementById('search-caja')?.value || '';
        const previousManager=document.getElementById('caja-user-filter')?.value || '';
        const mkBtn=(id,name,rol='')=>`<button type="button" data-caja-usuario="${safe(id)}"
          onclick="window.seleccionarCajaUsuario(this.dataset.cajaUsuario)"
          class="rounded-xl px-3 py-2 text-xs font-bold border transition-colors">
          ${safe(name)}${rol?' · '+safe(rol):''}</button>`;
        const adminButtons=currentRole==='Admin' ?
          `<div><p class="text-[10px] uppercase font-black text-neutral-500 mb-2">Seleccionar caja</p>
          <div class="flex flex-wrap gap-2">${mkBtn('','Todas las cajas')}
          ${disponibles.map(u=>mkBtn(u.id,u.nombre||'Usuario',u.rol||'')).join('')}</div></div>` : '';
        const encargadoSelect=currentRole==='Encargado' && disponibles.length>1 ?
          `<select id="caja-user-filter" onchange="window.state.cajaFiltroUsuario=this.value;window.renderCajaView()"
          class="rounded-xl border p-2 bg-white dark:bg-neutral-900"><option value="">Todas las cajas visibles</option>
          ${disponibles.map(u=>`<option value="${safe(u.id)}">${safe(u.nombre)}</option>`).join('')}</select>` : '';
        filterContainer.innerHTML=`<div id="caja-filters-wrapper" class="flex flex-col gap-3 w-full mb-3">
          ${adminButtons}<div class="flex flex-wrap items-center gap-3">
          <input id="search-caja" type="text" oninput="window.renderCajaView()" placeholder="Buscar movimientos..."
            class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm w-full sm:w-64">
          ${encargadoSelect}
          <div class="flex flex-wrap gap-2" aria-label="Filtrar medio de pago">
          ${[['todos','Todos'],['efectivo','Efectivo'],['transferencia','Transferencias']].map(([v,label])=>
            `<button type="button" data-caja-medio-filtro="${v}" onclick="window.filtrarMedioCaja('${v}')"
               class="rounded-xl border px-3 py-2 text-xs font-bold">${label}</button>`).join('')}
          </div></div></div>`;
        filterContainer.dataset.signature=signature;
        filterContainer.classList.remove('hidden');
        document.getElementById('search-caja').value=previousSearch;
        if(document.getElementById('caja-user-filter'))document.getElementById('caja-user-filter').value=previousManager;
    }
    const selectedUserId = currentRole==='Admin' ? (window.state.cajaFiltroUsuario||'') :
        currentRole==='Encargado' ? (document.getElementById('caja-user-filter')?.value||window.state.cajaFiltroUsuario||'') : '';
    const searchQuery=(document.getElementById('search-caja')?.value||'').toLowerCase().trim();
    const filtroMedio=window.state.cajaFiltroMedio||'todos';
    document.querySelectorAll('[data-caja-usuario]').forEach(b=>{
      const active=b.dataset.cajaUsuario===selectedUserId;
      b.setAttribute('aria-pressed',String(active));
      b.className='rounded-xl px-3 py-2 text-xs font-bold border transition-colors '+(active?
        'bg-black text-white border-black dark:bg-white dark:text-black':
        'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700');
    });
    document.querySelectorAll('[data-caja-medio-filtro]').forEach(b=>{
      const active=b.dataset.cajaMedioFiltro===filtroMedio;
      b.setAttribute('aria-pressed',String(active));
      b.className='rounded-xl border px-3 py-2 text-xs font-bold '+(active?
        'bg-green-600 text-white border-green-600':
        'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700');
    });
    // Los saldos usan todos los movimientos autorizados de la caja seleccionada.
    const baseMovimientos=(window.state.transacciones||[]).filter(t=>{
      if(t.eliminado===true)return false;
      let visible=currentRole==='Admin'||(currentRole==='Vendedor'&&t.userId===currentUserId);
      if(currentRole==='Encargado'){
        const u=users.find(u=>u.id===t.userId);
        visible=!!(u&&u.sucursalId===currentSuc&&u.rol!=='Admin');
      }
      return visible&&(!selectedUserId||t.userId===selectedUserId);
    });
    let transacciones=baseMovimientos.filter(t=>{
      if(filtroMedio!=='todos'&&window.medioPagoMovimientoCaja(t)!==filtroMedio)return false;
      if(!searchQuery)return true;
      const a=t.autoId?window.state.autos.find(x=>x.id===t.autoId):null;
      return [t.descripcion,t.categoria,t.valor,t.tipoComprobante,t.numComprobante,
        a?[a.marca,a.modelo,a.patente].join(' '):'',window.medioPagoMovimientoCaja(t)]
        .join(' ').toLowerCase().includes(searchQuery);
    });

    // Ordenamos cronológicamente (las más antiguas primero para calcular el saldo progresivo)
    transacciones.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // Calcular saldos independientes del buscador y filtro de medio.
    // Movimientos históricos sin medio de pago explícito quedan en efectivo
    // provisionalmente, sin cambiar ningún dato guardado.
    let saldoARS=0, saldoEfectivo=0, saldoTransferencias=0, saldoUSD=0;
    let totalIngresos=0, totalEgresos=0, rowsHtml='';
    const admin=currentRole==='Admin';
    const montoMoneda=(monto,moneda)=>moneda==='USD'
      ? 'U$S '+new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}).format(monto)
      : window.formatMoney(monto);
    const saldoPorRegistro=new WeakMap();
    baseMovimientos.slice().sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).forEach(t=>{
      const monto=Number(t.valor)||0,signo=t.tipo==='ingreso'?1:-1;
      if(t.moneda==='USD'){
        saldoUSD+=signo*monto;
      }else{
        saldoARS+=signo*monto;
        if(window.medioPagoMovimientoCaja(t)==='transferencia')saldoTransferencias+=signo*monto;
        else saldoEfectivo+=signo*monto;
        if(signo>0)totalIngresos+=monto;else totalEgresos+=monto;
      }
      saldoPorRegistro.set(t,{
        cash:saldoEfectivo,transferencia:saldoTransferencias,usd:saldoUSD
      });
    });
    const legacyCount=baseMovimientos.filter(t=>
      t.moneda!=='USD'&&window.medioCajaPendienteClasificacion(t)).length;
    transacciones.forEach(t=>{
      const monto=Number(t.valor)||0,moneda=t.moneda==='USD'?'USD':'ARS';
      const medio=window.medioPagoMovimientoCaja(t);
      const saldoFilaDatos=saldoPorRegistro.get(t)||{cash:0,transferencia:0,usd:0};
      const saldoFila=moneda==='USD'
        ? (admin?montoMoneda(saldoFilaDatos.usd,'USD'):'<span class="text-xs text-neutral-400">Solo administrador</span>')
        : montoMoneda(medio==='transferencia'?saldoFilaDatos.transferencia:saldoFilaDatos.cash,'ARS');
      const marcaMedio=medio==='transferencia'
        ? '<span class="inline-block ml-2 text-[9px] text-indigo-700 dark:text-indigo-300 font-bold">TRANSFERENCIA</span>'
        : '<span class="inline-block ml-2 text-[9px] text-green-700 dark:text-green-400 font-bold">EFECTIVO</span>';
        const montoClass = t.tipo === 'ingreso' ? 'text-green-600 dark:text-green-500' : 'text-rose-600 dark:text-rose-500';
        const signo = t.tipo === 'ingreso' ? '+' : '-';
        
        const u = window.state.usuarios.find(x => x.id === t.userId);
        const userName = u ? u.nombre : 'Usuario Eliminado/Desconocido';
        
        let detalleAuto = '';
        if (t.autoId) {
            const auto = window.state.autos.find(x => x.id === t.autoId);
            if (auto) {
                detalleAuto = `
                    <span class="block text-[10px] text-green-600 dark:text-green-500 font-bold mt-1 uppercase tracking-widest flex items-center">
                        <i data-lucide="link" class="w-3 h-3 mr-1"></i> Ref: ${auto.marca} ${auto.modelo} (${auto.patente})
                    </span>
                `;
            }
        }

        let detalleFactura = '';
        if (t.tipoComprobante && t.tipoComprobante !== 'X') {
            detalleFactura = ` | FACT: ${t.tipoComprobante} ${t.numComprobante}`;
        }

        // MARCADOR DE AUDITORÍA: Leyenda "(EDITADO)" clickable
        const badgeEditado = t.editado ? `
            <span onclick="window.verHistorialEdicion('${t.id}')" class="ml-2 text-[9px] font-black tracking-widest text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30 px-2 py-0.5 rounded cursor-pointer hover:scale-105 transition-transform" title="Ver historial de cambios">
                (EDITADO)
            </span>
        ` : '';

        // BOTONES DE AUDITORÍA INTELIGENTES
        let btnAcciones = '';
        // Permiso de Edición: Admin, Encargado, o el propio creador del movimiento (Vendedor)
        if (currentRole === 'Admin' || currentRole === 'Encargado' || t.userId === currentUserId) {
            btnAcciones += `
                <button onclick="window.editTransaccion('${t.id}')" class="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors shadow-sm ml-2" title="Editar Movimiento">
                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                </button>
            `;
        }
        // Permiso de Eliminación: SOLO el Admin
        if (currentRole === 'Admin') {
            btnAcciones += `
                <button onclick="window.deleteTransaccion('${t.id}')" class="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors shadow-sm ml-1" title="Eliminar Movimiento">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            `;
        }

        rowsHtml = `
            <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group">
                <td class="px-6 py-4 text-xs font-bold text-neutral-500">
                    ${window.formatDate(t.fecha)}
                </td>
                <td class="px-6 py-4">
                    <p class="font-bold text-sm text-neutral-800 dark:text-neutral-200 flex items-center">
                        ${t.descripcion} ${badgeEditado}
                    </p>
                    <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                        ${t.categoria} ${marcaMedio} ${detalleFactura}
                    </p>
                    ${detalleAuto}
                </td>
                <td class="px-6 py-4 text-xs font-bold uppercase text-neutral-500">
                    ${userName}
                </td>
                <td class="px-6 py-4 text-right font-black ${montoClass}">
                    ${signo} ${montoMoneda(monto, moneda)}
                </td>
                <td class="px-6 py-4 text-right font-black text-lg text-neutral-800 dark:text-neutral-200 flex justify-end items-center">
                    ${saldoFila}
                    ${btnAcciones}
                </td>
            </tr>
        ` + rowsHtml; 
    });

    if (transacciones.length === 0) {
        rowsHtml = `
            <tr>
                <td colspan="5" class="text-center py-10 text-neutral-500 font-bold">
                    <div class="flex flex-col items-center justify-center">
                        <i data-lucide="inbox" class="w-8 h-8 mb-3 opacity-50"></i>
                        No se encontraron movimientos con esos filtros.
                    </div>
                </td>
            </tr>
        `;
    }

    table.innerHTML = rowsHtml;

    statsContainer.innerHTML = `
        <div class="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm transition-transform hover:scale-[1.02]">
            <p class="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 flex items-center">
                <i data-lucide="arrow-down-left" class="w-4 h-4 mr-2 text-green-500"></i> Ingresos Totales
            </p>
            <p class="text-2xl font-black text-green-600 dark:text-green-500">${window.formatMoney(totalIngresos)}<span class="block text-[10px] text-neutral-400 mt-2">Operaciones expresadas en pesos ($)</span></p>
        </div>
        
        <div class="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm transition-transform hover:scale-[1.02]">
            <p class="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2 flex items-center">
                <i data-lucide="arrow-up-right" class="w-4 h-4 mr-2 text-rose-500"></i> Egresos Totales
            </p>
            <p class="text-2xl font-black text-rose-600 dark:text-rose-500">${window.formatMoney(totalEgresos)}<span class="block text-[10px] text-neutral-400 mt-2">Operaciones expresadas en pesos ($)</span></p>
        </div>
        
        <div class="bg-black text-white dark:bg-white dark:text-black p-6 rounded-3xl shadow-xl flex flex-col justify-center relative overflow-hidden transition-transform hover:scale-[1.02]">
            <div class="absolute -right-4 -bottom-4 opacity-10">
                <i data-lucide="wallet" class="w-32 h-32"></i>
            </div>
            <p class="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-75 relative z-10">Saldo de Caja · Efectivo</p>
            <p class="text-4xl font-black relative z-10">${window.formatMoney(saldoEfectivo)}</p>
            <div class="mt-4 pt-3 border-t border-white/20 dark:border-black/20 relative z-10 flex justify-between gap-3">
              <div>
                <p class="text-[10px] uppercase font-bold opacity-70">Transferencias</p>
                <p class="text-lg font-black">${window.formatMoney(saldoTransferencias)}</p>
              </div>
              <div class="text-right">
                <p class="text-[10px] uppercase font-bold opacity-70">Total combinado</p>
                <p class="text-lg font-black">${window.formatMoney(saldoARS)}</p>
              </div>
            </div>
            ${admin ? `<div class="mt-3 pt-3 border-t border-white/20 dark:border-black/20 relative z-10">
              <p class="text-[10px] font-bold uppercase opacity-70">Saldo U$S · solo administración</p>
              <p class="text-xl font-black">${montoMoneda(saldoUSD,'USD')}</p></div>` : ''}
            ${legacyCount ? `<p class="text-[10px] mt-3 opacity-70 relative z-10">
              ${legacyCount} movimiento(s) histórico(s) sin medio identificado: asignados provisionalmente a efectivo.
              Podés revisarlos y editar el medio sin modificar el importe.</p>` : ''}
        </div>
    `;

    if (window.lucide) {
        window.lucide.createIcons();
    }
};

window.openModalPendientes = () => {
    const contenedor = document.getElementById('pendientes-list-content');
    
    if (!contenedor) {
        return;
    }

    let html = '';
    
    // Filtramos ventas que NO estén eliminadas lógicamente
    const ventasPendientes = window.state.ventas.filter(v => 
        !v.eliminado && (
            (v.credito && v.credito.pagadas < v.credito.cuotas) || 
            (v.pagare && v.pagare.pagadas < v.pagare.cuotas)
        )
    );

    if (ventasPendientes.length === 0) {
        html = `
            <div class="text-center py-10">
                <div class="w-16 h-16 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="check-circle" class="w-8 h-8"></i>
                </div>
                <p class="text-neutral-500 font-bold uppercase tracking-widest text-sm">Todo al día</p>
                <p class="text-xs text-neutral-400 mt-2">No hay cuotas pendientes de cobro en este momento.</p>
            </div>
        `;
    } else {
        html = `<div class="space-y-4">`;
        
        ventasPendientes.forEach(v => {
            html += `
                <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-5 rounded-2xl shadow-sm">
                    <div class="flex justify-between items-start mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                        <div>
                            <h4 class="font-black text-lg text-neutral-800 dark:text-neutral-200">${v.compradorNombre}</h4>
                            <p class="text-xs font-bold text-neutral-500 uppercase mt-1">Tel: ${v.compradorTelefono || 'S/N'}</p>
                        </div>
                        <span class="px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500 text-[10px] font-bold uppercase rounded tracking-widest">
                            Ref: ${v.autoDesc}
                        </span>
                    </div>
            `;
            
            if (v.credito && v.credito.pagadas < v.credito.cuotas) {
                const numCuota = v.credito.pagadas + 1;
                html += `
                    <div class="flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl mb-3 border border-neutral-100 dark:border-neutral-700">
                        <div>
                            <p class="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                                Cuota Crédito #${numCuota} de ${v.credito.cuotas}
                            </p>
                            <p class="font-black text-xl text-neutral-800 dark:text-neutral-200">
                                ${window.formatMoney(v.credito.valorCuota)}
                            </p>
                        </div>
                        <button onclick="window.cobrarCuotaVenta('${v.id}', 'credito')" class="px-5 py-3 bg-black text-white dark:bg-white dark:text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:scale-[1.02] transition-transform">
                            <span id="btn-txt-credito-${v.id}">Cobrar Cuota</span>
                        </button>
                    </div>
                `;
            }

            if (v.pagare && v.pagare.pagadas < v.pagare.cuotas) {
                const numCuota = v.pagare.pagadas + 1;
                html += `
                    <div class="flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-xl mb-3 border border-neutral-100 dark:border-neutral-700">
                        <div>
                            <p class="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                                Pagaré #${numCuota} de ${v.pagare.cuotas}
                            </p>
                            <p class="font-black text-xl text-neutral-800 dark:text-neutral-200">
                                ${window.formatMoney(v.pagare.valorCuota)}
                            </p>
                        </div>
                        <button onclick="window.cobrarCuotaVenta('${v.id}', 'pagare')" class="px-5 py-3 bg-black text-white dark:bg-white dark:text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:scale-[1.02] transition-transform">
                            <span id="btn-txt-pagare-${v.id}">Cobrar Pagaré</span>
                        </button>
                    </div>
                `;
            }

            html += `</div>`;
        });
        
        html += `</div>`;
    }

    contenedor.innerHTML = html;
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    window.openModal('modal-pendientes');
};
