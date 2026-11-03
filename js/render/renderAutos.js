// ==========================================
// js/render/renderAutos.js
// ==========================================

window.toggleAutosViewMode = (mode) => { 
  window.state.autosViewMode = mode; 
  localStorage.setItem('autosViewMode', mode);
  window.renderAutosView(); 
};

window.renderAutosView = () => {
  const container = document.getElementById('autos-container');
  if (!container) return;

  let searchWrapper = document.getElementById('search-autos-wrapper');
  if (!searchWrapper && container.parentNode) {
      searchWrapper = document.createElement('div');
      searchWrapper.id = 'search-autos-wrapper';
      searchWrapper.className = 'mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 w-full fade-in';
      
      searchWrapper.innerHTML = `
          <div class="relative w-full sm:w-96">
              <i data-lucide="search" class="absolute left-4 top-3.5 w-4 h-4 text-neutral-400"></i>
              <input type="text" id="search-autos" oninput="window.renderAutosView()" placeholder="Buscar marca, modelo, patente, estado..." class="w-full pl-11 pr-4 py-2.5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold outline-none focus:border-green-500 transition-colors shadow-sm">
          </div>
      `;
      
      const btnGrid = document.getElementById('btn-view-grid');
      const btnList = document.getElementById('btn-view-list');
      
      if (btnGrid && btnList) {
          const tglWrap = document.createElement('div');
          tglWrap.className = 'flex space-x-2 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md p-1 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 shrink-0';
          tglWrap.appendChild(btnGrid);
          tglWrap.appendChild(btnList);
          searchWrapper.appendChild(tglWrap);
      }

      container.parentNode.insertBefore(searchWrapper, container);
      if (window.lucide) window.lucide.createIcons();
  }

  const btnGrid = document.getElementById('btn-view-grid');
  const btnList = document.getElementById('btn-view-list');
  
  if (btnGrid) {
    btnGrid.className = window.state.autosViewMode === 'grid' 
      ? 'p-2 rounded-lg bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white transition-colors' 
      : 'p-2 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors';
  }
  
  if (btnList) {
    btnList.className = window.state.autosViewMode === 'list' 
      ? 'p-2 rounded-lg bg-white dark:bg-neutral-700 shadow-sm text-neutral-900 dark:text-white transition-colors' 
      : 'p-2 rounded-lg text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors';
  }
  
  let autosValidos = (window.state.autos || []).filter(a => a.estado !== 'Vendido');
  
  const searchInput = document.getElementById('search-autos');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';

  if (query) {
      autosValidos = autosValidos.filter(a => 
          (a.marca || '').toLowerCase().includes(query) ||
          (a.modelo || '').toLowerCase().includes(query) ||
          (a.patente || '').toLowerCase().includes(query) ||
          (a.estado || '').toLowerCase().includes(query) ||
          (a.año || '').toString().includes(query) ||
          (a.color || '').toLowerCase().includes(query)
      );
  }

  autosValidos.sort((a, b) => String(a.marca || '').localeCompare(String(b.marca || '')) || String(a.modelo || '').localeCompare(String(b.modelo || '')));
  
  if (autosValidos.length === 0) { 
    container.innerHTML = `
      <div class="col-span-full py-16 text-center text-neutral-500 font-bold bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-[2rem] shadow-sm">
        <i data-lucide="car" class="w-12 h-12 mx-auto mb-4 opacity-30"></i>
        ${query ? `No encontramos vehículos que coincidan con "<strong>${query}</strong>".` : 'No hay vehículos en la flota.'}
      </div>
    `; 
    if (window.lucide) window.lucide.createIcons();
    return; 
  }

  let leadsPermitidos = window.state.consultas || [];
  if (window.state.currentUser.rol === 'Vendedor') {
    leadsPermitidos = leadsPermitidos.filter(c => c.userId === window.state.currentUser.id);
  } else if (window.state.currentUser.rol === 'Encargado') {
    const validUsers = (window.state.usuarios || []).filter(u => u.sucursalId === window.state.currentUser.sucursalId && u.rol !== 'Admin').map(u => u.id);
    leadsPermitidos = leadsPermitidos.filter(c => validUsers.includes(c.userId));
  }

  if (window.state.autosViewMode === 'grid') {
    let gridHtml = `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 fade-in">`;
    
    autosValidos.forEach(auto => {
      const totalGastos = auto.gastos?.reduce((s, g) => s + Number(g.monto), 0) || 0; 
      const sName = window.state.sucursales.find(x => x.id === auto.sucursalId)?.nombre || 'Sin Asignar';
      
      let bClass = 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'; 
      if (auto.estado === 'Disponible') {
        bClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500'; 
      } else if (auto.estado === 'A Ingresar') {
        bClass = 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500 border border-amber-300 dark:border-amber-700';
      } else if (auto.estado === 'Señado') {
        bClass = 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-300 dark:border-purple-700';
      }
      
      const precioFmt = auto.moneda === 'USD' 
        ? 'U$S ' + window.formatMoney(auto.precio).replace(/[^0-9.,]/g, '').trim() 
        : window.formatMoney(auto.precio);
        
      const kmFmt = auto.km ? new Intl.NumberFormat('es-AR').format(auto.km) : 0;

      const interesados = leadsPermitidos.filter(c => window.coincidenciasClientesFlota(c, [auto]).length > 0);
      const badgeInteresados = interesados.length > 0 
          ? `<div class="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg flex items-center z-20 animate-pulse"><i data-lucide="zap" class="w-3 h-3 mr-1"></i> ${interesados.length} INTERESADOS</div>` 
          : '';

      gridHtml += `
        <div onclick="window.openDetalleAuto('${auto.id}')" class="group cursor-pointer bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-[2.5rem] p-2 shadow-sm hover:shadow-lg transition-all hover:border-green-500/50 relative overflow-hidden">
          <div class="bg-neutral-50/50 dark:bg-neutral-800/50 rounded-[2rem] p-6 h-full flex flex-col relative">
            ${badgeInteresados}
            <div class="absolute top-2 right-2 z-30">${window.instagramLinkAuto?.(auto)}</div>
            <div class="flex justify-between items-start mb-4">
              <div class="flex flex-col space-y-1 mt-1">
                <div class="flex items-center space-x-2">
                  <span class="px-3 py-1 text-[10px] font-bold uppercase rounded-xl ${bClass}">
                    ${auto.estado}
                  </span>
                  ${auto.estado !== 'Señado' ? `
                    <button onclick="event.stopPropagation(); window.toggleEstadoAuto('${auto.id}')" class="p-1 bg-white/50 dark:bg-neutral-800/50 hover:bg-white dark:hover:bg-neutral-700 rounded-full transition-colors shadow-sm" title="Alternar Estado">
                      <i data-lucide="refresh-cw" class="w-3 h-3 text-neutral-600 dark:text-neutral-300"></i>
                    </button>
                  ` : ''}
                </div>
                <span class="text-xs text-neutral-500 font-bold ml-1">
                  <i data-lucide="map-pin" class="w-3 h-3 inline"></i> ${sName} | <span class="uppercase text-[10px]">${auto.condicion || 'Propio'}</span>
                </span>
              </div>
              <div class="bg-white dark:bg-neutral-900 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <span class="font-mono text-sm font-bold uppercase">${auto.patente}</span>
              </div>
            </div>
            <div class="mb-4">
              <h3 class="text-2xl font-black uppercase">
                ${auto.marca} <br/>
                <span class="text-neutral-500">${auto.modelo}</span>
              </h3>
              <p class="text-sm text-neutral-400 mt-1 font-bold uppercase">
                Año ${auto.año} • ${auto.color || ''} • ${kmFmt} km
              </p>
            </div>
            <div class="mt-auto space-y-3">
              <div class="flex justify-between items-center p-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                <span class="text-xs font-bold text-neutral-500 uppercase">Precio</span>
                <span class="text-lg font-black whitespace-nowrap">${precioFmt}</span>
              </div>
              <div class="flex justify-between items-center px-2">
                <span class="text-xs text-neutral-500 font-bold">
                  <i data-lucide="wrench" class="w-3 h-3 inline"></i> Inversión Acumulada
                </span>
                <span class="text-sm font-bold">${window.formatMoney(totalGastos)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    
    gridHtml += `</div>`;
    container.innerHTML = gridHtml;
    
  } else {
    let listHtml = `
      <div class="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 rounded-[2rem] shadow-sm overflow-hidden fade-in">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-xs uppercase tracking-widest text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-800/30">
                <th class="px-6 py-4 font-bold">Vehículo</th>
                <th class="px-6 py-4 font-bold">Patente</th>
                <th class="px-6 py-4 font-bold">Detalles</th>
                <th class="px-6 py-4 font-bold">Estado</th>
                <th class="px-6 py-4 font-bold text-right">Precio Venta</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800/50">
    `;
    
    autosValidos.forEach(auto => {
      let bClass = 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'; 
      if (auto.estado === 'Disponible') {
        bClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500'; 
      } else if (auto.estado === 'A Ingresar') {
        bClass = 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500';
      } else if (auto.estado === 'Señado') {
        bClass = 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      }
      
      const precioFmt = auto.moneda === 'USD' 
        ? 'U$S ' + window.formatMoney(auto.precio).replace(/[^0-9.,]/g, '').trim() 
        : window.formatMoney(auto.precio);
        
      const kmFmt = auto.km ? new Intl.NumberFormat('es-AR').format(auto.km) : 0;

      const interesados = leadsPermitidos.filter(c => window.coincidenciasClientesFlota(c, [auto]).length > 0);
      const interesIcon = interesados.length > 0 ? `<i data-lucide="zap" class="w-3 h-3 text-indigo-500 inline ml-2 animate-pulse" title="${interesados.length} Interesados"></i>` : '';

      listHtml += `
        <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors" onclick="window.openDetalleAuto('${auto.id}')">
          <td class="px-6 py-4">
            <p class="font-bold uppercase">${auto.marca} ${auto.modelo} ${interesIcon} ${window.instagramLinkAuto?.(auto)}</p>
            <p class="text-xs text-neutral-500 font-bold mt-1">Año ${auto.año}</p>
          </td>
          <td class="px-6 py-4 font-mono text-sm font-bold uppercase">${auto.patente}</td>
          <td class="px-6 py-4 text-xs text-neutral-600 dark:text-neutral-400 font-bold uppercase">
            ${auto.color || '-'} • ${kmFmt} km • <span>${auto.condicion || 'Propio'}</span>
          </td>
          <td class="px-6 py-4 flex items-center h-full pt-6">
            <span class="px-2 py-1 text-[10px] font-bold uppercase rounded-md ${bClass}">
              ${auto.estado}
            </span>
            ${auto.estado !== 'Señado' ? `
              <button onclick="event.stopPropagation(); window.toggleEstadoAuto('${auto.id}')" class="ml-2 p-1.5 text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors" title="Cambiar Estado">
                <i data-lucide="refresh-cw" class="w-4 h-4"></i>
              </button>
            ` : ''}
          </td>
          <td class="px-6 py-4 text-right font-black text-lg whitespace-nowrap">
            ${precioFmt}
          </td>
        </tr>
      `;
    });
    
    listHtml += `</tbody></table></div></div>`;
    container.innerHTML = listHtml;
  }
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

window.renderDetalleAuto = () => {
  const auto = window.state.autos.find(x => x.id === window.state.selectedAutoId); 
  if (!auto) return;
  
  const totalInv = auto.gastos?.reduce((ac, g) => ac + g.monto, 0) || 0;
  
  document.getElementById('da-header-actions').innerHTML = `
    ${window.instagramLinkAuto?.(auto)}
    <button onclick="window.toggleEstadoAuto('${auto.id}')" class="px-3 py-1 bg-amber-500 text-black text-[10px] font-black rounded-lg uppercase mr-2 hover:scale-105 transition-transform">
      Cambiar a ${auto.estado === 'Disponible' ? 'A Ingresar' : 'Disponible'}
    </button>
    <button type="button" onclick="window.editAuto('${auto.id}')" class="p-2 hover:bg-neutral-100 dark:bg-neutral-800 rounded-full transition">
      <i data-lucide="edit-2" class="w-4 h-4"></i>
    </button>
    <button type="button" onclick="window.deleteAuto('${auto.id}')" class="p-2 hover:bg-rose-50 dark:bg-rose-900/30 text-rose-500 rounded-full transition">
      <i data-lucide="trash-2" class="w-4 h-4"></i>
    </button>
    <div class="w-px h-6 bg-neutral-200 dark:bg-neutral-700 mx-2"></div>
    <button type="button" onclick="window.closeModal('modal-detalle-auto')" class="bg-neutral-100 dark:bg-neutral-800 p-2 rounded-full">
      <i data-lucide="x" class="w-5 h-5"></i>
    </button>
  `;
  
  let html = '';

  let leadsPermitidos = window.state.consultas || [];
  if (window.state.currentUser.rol === 'Vendedor') {
    leadsPermitidos = leadsPermitidos.filter(c => c.userId === window.state.currentUser.id);
  } else if (window.state.currentUser.rol === 'Encargado') {
    const validUsers = (window.state.usuarios || []).filter(u => u.sucursalId === window.state.currentUser.sucursalId && u.rol !== 'Admin').map(u => u.id);
    leadsPermitidos = leadsPermitidos.filter(c => validUsers.includes(c.userId));
  }

  const interesados = leadsPermitidos.filter(c => window.coincidenciasClientesFlota(c, [auto]).length > 0);
  
  if (!window.state.isVentaMode) {
    let badgeClass = auto.estado === 'Señado' ? 'bg-purple-800 text-white dark:bg-purple-300 dark:text-purple-900' : 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900';
    const precioFmt = auto.moneda === 'USD' ? 'U$S ' + window.formatMoney(auto.precio).replace(/[^0-9.,]/g, '').trim() : window.formatMoney(auto.precio);
    const kmFmt = auto.km ? new Intl.NumberFormat('es-AR').format(auto.km) : 0;
    
    html += `
      <div class="bg-black text-white dark:bg-white dark:text-black rounded-[2rem] p-8 mb-6 relative overflow-hidden border border-neutral-800 dark:border-neutral-200">
        <div class="flex justify-between items-start relative z-10">
          <div>
            <span class="${badgeClass} text-[10px] uppercase px-3 py-1 rounded-lg font-bold">
              ${auto.estado}
            </span>
            <span class="ml-2 bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 text-[10px] uppercase px-3 py-1 rounded-lg font-bold">
              ${auto.condicion || 'Propio'}
            </span>
            <h2 class="text-3xl font-black mt-3 uppercase">
              ${auto.marca} ${auto.modelo}
            </h2>
            <p class="text-sm mt-1 opacity-80 font-bold uppercase">
              Año ${auto.año} • ${auto.color||''} • ${kmFmt} km
            </p>
          </div>
          <div class="text-right">
            <p class="text-xs uppercase font-bold opacity-60">
              Precio Venta
            </p>
            <p class="text-3xl font-black mt-1 whitespace-nowrap">
              ${precioFmt}
            </p>
            ${totalInv > 0 ? `
              <p class="text-[10px] font-bold mt-2 text-rose-400 dark:text-rose-600 uppercase tracking-widest">
                + Gastos Aplicados: ${window.formatMoney(totalInv)}
              </p>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    if (interesados.length > 0) {
        html += `
            <div onclick="window.switchDASection('crm')" class="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex justify-between items-center group shadow-sm">
                <div>
                    <p class="text-xs font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-widest flex items-center">
                        <i data-lucide="users" class="w-4 h-4 mr-2"></i> Interesados CRM
                    </p>
                    <p class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                        Tienes ${interesados.length} cliente(s) buscando este modelo. ¡Click para verlos!
                    </p>
                </div>
                <div class="w-8 h-8 bg-indigo-200 dark:bg-indigo-800 rounded-full flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors text-indigo-700 dark:text-indigo-300">
                    <i data-lucide="chevron-right" class="w-4 h-4"></i>
                </div>
            </div>
        `;
    }

    if (auto.estado === 'Señado') {
      html += `
        <div class="mt-6 p-4 bg-purple-900/30 border border-purple-500/30 rounded-2xl mb-6">
          <p class="text-xs text-purple-200 dark:text-purple-600 font-bold uppercase mb-1">
            Vehículo Reservado
          </p>
          <p class="text-sm font-bold">
            Señado por: <span class="font-black">${auto.señadoPorNombre || 'Vendedor'}</span>
          </p>
          <p class="text-sm">
            Cliente: <span class="font-black">${auto.señadoClienteNombre || '-'}</span> (${auto.señadoClienteTel || '-'})
          </p>
        </div>
      `;
    }
    
    if (window.state.currentUser.rol === 'Admin' && auto.costo > 0) { 
      const costoFmt = auto.moneda === 'USD' ? 'U$S ' + window.formatMoney(auto.costo).replace(/[^0-9.,]/g, '').trim() : window.formatMoney(auto.costo);
      html += `
        <p class="mt-4 text-xs font-bold text-neutral-400 mb-6">
          Costo Base Original: ${costoFmt}
        </p>
      `; 
    }
    
    if (auto.estado === 'A Ingresar') {
      html += `
        <div class="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <button onclick="window.openModalIngreso('${auto.id}')" class="w-full py-4 bg-amber-500 text-black font-black rounded-2xl shadow hover:bg-amber-400 transition-all">
            Marcar como Disponible / Fijar Precio
          </button>
        </div>
      `;
    } else if (auto.estado !== 'Vendido' && (window.state.currentUser.rol === 'Admin' || window.state.currentUser.rol === 'Vendedor' || window.state.currentUser.rol === 'Encargado')) { 
      if (auto.estado === 'Disponible') {
        html += `
          <div class="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex space-x-3 mb-6">
            <button onclick="window.state.isVentaMode=true; window.renderDetalleAuto()" class="flex-1 py-4 bg-green-600 text-white dark:bg-green-500 dark:text-black font-black rounded-2xl shadow hover:bg-green-700 transition-all text-sm md:text-base">
              Cerrar Venta
            </button>
            <button onclick="window.openModalSeñado('${auto.id}')" class="flex-1 py-4 bg-purple-600 text-white dark:bg-purple-500 dark:text-black font-black rounded-2xl shadow hover:bg-purple-700 transition-all text-sm md:text-base">
              Señar
            </button>
          </div>
        `; 
      } else if (auto.estado === 'Señado') {
        html += `
          <div class="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 flex space-x-3 mb-6">
            <button onclick="window.state.isVentaMode=true; window.renderDetalleAuto()" class="flex-1 py-4 bg-green-600 text-white dark:bg-green-500 dark:text-black font-black rounded-2xl shadow hover:bg-green-700 transition-all text-sm md:text-base">
              Cerrar Venta
            </button>
            <button onclick="window.quitarSeña('${auto.id}')" class="flex-1 py-4 bg-rose-600 text-white dark:bg-rose-500 dark:text-black font-black rounded-2xl shadow hover:bg-rose-700 transition-all text-sm md:text-base">
              Cancelar Seña
            </button>
          </div>
        `; 
      }
    }
    
    html += `
      <div class="flex space-x-4 border-b border-neutral-200 dark:border-neutral-800 mb-6 overflow-x-auto no-scrollbar">
        <button onclick="window.switchDASection('crm')" class="pb-3 font-bold border-b-2 flex items-center ${window.state.daActiveSection === 'crm' ? 'border-green-600 text-green-600' : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'}">
          <i data-lucide="users" class="w-4 h-4 mr-2"></i> Leads
        </button>
        <button onclick="window.switchDASection('doc')" class="pb-3 font-bold border-b-2 flex items-center ${window.state.daActiveSection === 'doc' ? 'border-green-600 text-green-600' : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'}">
          <i data-lucide="file-check" class="w-4 h-4 mr-2"></i> Papeles
        </button>
        <button onclick="window.switchDASection('taller')" class="pb-3 font-bold border-b-2 flex items-center ${window.state.daActiveSection === 'taller' ? 'border-green-600 text-green-600' : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'}">
          <i data-lucide="wrench" class="w-4 h-4 mr-2"></i> Taller
        </button>
      </div>
    `;
    
    if (window.state.daActiveSection === 'doc') {
      html += `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${[{k:'c08', l:'08 Firmado'},{k:'verificacion', l:'Verificación (12D)'},{k:'libreDeuda', l:'Libre Deuda'}].map(i => `
            <div onclick="window.toggleDoc('${auto.id}','${i.k}')" class="p-5 rounded-2xl border-2 flex items-center space-x-4 cursor-pointer transition-colors ${auto.documentacion[i.k] ? 'border-green-600 bg-green-50/50 dark:bg-green-900/10' : 'border-neutral-200 dark:border-neutral-700'}">
              <div class="w-6 h-6 rounded-full flex items-center justify-center ${auto.documentacion[i.k] ? 'bg-green-600 text-white' : 'bg-neutral-200 dark:bg-neutral-800'}">
                ${auto.documentacion[i.k] ? '<i data-lucide="check" class="w-4 h-4"></i>' : ''}
              </div>
              <span class="font-bold">${i.l}</span>
            </div>
          `).join('')}
        </div>
      `;
    } else if (window.state.daActiveSection === 'crm') {
       let leadsAuto = leadsPermitidos.filter(c => c.autoId === auto.id);
       leadsAuto = leadsAuto.sort((x,y) => new Date(y.fecha) - new Date(x.fecha));

       let potencialesHtml = '';
       if (interesados.length > 0) {
           potencialesHtml = `
                <div class="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-800 mb-6">
                    <h4 class="text-sm font-black text-indigo-800 dark:text-indigo-300 flex items-center uppercase tracking-wider mb-4">
                        <i data-lucide="zap" class="w-4 h-4 mr-2"></i> Coincidencias CRM
                    </h4>
                    <div class="space-y-2">
                        ${interesados.map(c => {
                            const analisis = window.calcularTermometroLead ? window.calcularTermometroLead(c) : { score: 50, estado: 'Tibio' };
                            const barColor = analisis.estado === 'Caliente' ? 'bg-rose-500' : (analisis.estado === 'Tibio' ? 'bg-amber-500' : 'bg-blue-500');
                            return `
                                <div onclick="window.closeModal('modal-detalle-auto'); window.openDetalleLead('${c.id}')" class="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center justify-between hover:border-indigo-400 transition-all cursor-pointer">
                                    <div>
                                        <p class="text-sm font-black text-neutral-800 dark:text-neutral-100">${c.nombre}</p>
                                        <p class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">${c.telefono}</p>
                                    </div>
                                    <div class="flex items-center space-x-2">
                                        <span class="text-[9px] font-black uppercase text-neutral-500">${analisis.estado}</span>
                                        <div class="w-10 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                                            <div class="${barColor} h-full" style="width: ${analisis.score}%"></div>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
           `;
       }
       
       let listHtml = '';
       if (leadsAuto.length > 0) {
         listHtml = leadsAuto.map(c => {
           const autor = (window.state.usuarios || []).find(u => u.id === c.userId);
           const nombreAutor = autor ? autor.nombre : 'Desconocido';
           const txtAutor = window.state.currentUser.rol !== 'Vendedor' 
             ? ` • <span class="text-amber-600 dark:text-amber-400 font-bold">Por: ${nombreAutor}</span>` 
             : '';
           
           const analisis = window.calcularTermometroLead ? window.calcularTermometroLead(c) : { score: 50, estado: 'Tibio' };
           const colorEst = analisis.estado === 'Caliente' ? 'text-rose-500 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20' : (analisis.estado === 'Tibio' ? 'text-amber-500 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' : 'text-blue-500 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20');

           return `
             <div onclick="window.closeModal('modal-detalle-auto'); window.openDetalleLead('${c.id}')" class="p-3 border-b border-neutral-100 dark:border-neutral-700 flex justify-between items-center hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors">
               <div>
                 <p class="text-sm font-bold flex items-center">
                    ${c.nombre || 'Sin Nombre'}
                    <span class="ml-2 text-[9px] font-black uppercase px-2 py-0.5 rounded border ${colorEst}">${analisis.estado}</span>
                 </p>
                 <p class="text-xs text-neutral-500">${c.telefono || '-'} • ${window.formatDate(c.fecha)}${txtAutor}</p>
               </div>
               <p class="text-xs text-neutral-500 italic max-w-[120px] truncate text-right">"${c.notas || ''}"</p>
             </div>
           `;
         }).join('');
       } else {
         listHtml = `
           <p class="text-xs text-neutral-500 py-2 p-4">
             No hay leads manuales registrados para este vehículo.
           </p>
         `;
       }
      
       html += `
         <div>
           ${potencialesHtml}
           <button type="button" onclick="window.abrirFormularioCliente('${auto.id}')" class="w-full py-3 bg-black text-white dark:bg-white dark:text-black rounded-xl font-bold mb-4">Agregar Cliente</button>
           <div class="mt-4">
             <h5 class="font-bold text-xs uppercase mb-2 text-neutral-500 tracking-wider">
               Clientes vinculados
             </h5>
             <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
               ${listHtml}
             </div>
           </div>
         </div>
       `;
    } else if (window.state.daActiveSection === 'taller') {
       html += `
         <form onsubmit="window.handleGastoTallerSubmit(event, '${auto.id}')" class="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-2xl mb-6">
           <div class="grid grid-cols-2 gap-3 mb-3">
             <input id="gt-desc" placeholder="Reparación..." required class="bg-white dark:bg-neutral-900 p-2 rounded-lg text-sm border dark:border-neutral-700 font-bold" />
             <input id="gt-monto" oninput="window.formatInputMoney(this)" placeholder="Monto ($)" required class="bg-white dark:bg-neutral-900 p-2 rounded-lg text-sm border dark:border-neutral-700 font-bold" />
             <select id="gt-cat" class="bg-white dark:bg-neutral-900 p-2 rounded-lg text-sm border dark:border-neutral-700 font-bold">
               ${window.state.categoriasGasto.map(c => `<option value="${c}">${c}</option>`).join('')}
             </select>
             <label class="flex items-center text-xs font-bold cursor-pointer">
               <input type="checkbox" id="gt-fuera-caja" class="mr-2 w-4 h-4 text-green-600 rounded" /> Gasto por fuera de caja
             </label>
           </div>
           <button type="submit" class="w-full py-2 bg-black text-white dark:bg-white dark:text-black rounded-lg font-bold hover:scale-[1.02] transition-transform">Cargar Gasto</button>
         </form>
       `;
       
       if (!auto.gastos || auto.gastos.length === 0) {
         html += `<p class="text-neutral-500 text-sm font-bold text-center py-6">No hay gastos de taller registrados para este vehículo.</p>`;
       } else {
         html += `
           <div class="space-y-3">
             ${auto.gastos.slice().reverse().map(g => `
               <div class="flex justify-between items-center p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                 <div>
                   <p class="font-bold text-sm">${g.descripcion} ${g.fueraDeCaja ? '<span class="text-amber-600 dark:text-amber-400 text-[10px] ml-2 font-black tracking-widest bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded">[FUERA DE CAJA]</span>' : ''}</p>
                   <p class="text-xs text-neutral-500 mt-1 uppercase tracking-wider">${g.categoria} • ${window.formatDate(g.fecha)}</p>
                 </div>
                 <span class="font-black text-rose-600 dark:text-rose-400">${window.formatMoney(g.monto)}</span>
               </div>
             `).join('')}
           </div>
         `;
       }
    }
  } else {
    if (window.state.currentUser.rol === 'Admin') {
      const gananciaFmt = auto.moneda === 'USD' ? 'U$S ' + window.formatMoney(auto.precio - ((auto.costo||0) + totalInv)).replace(/[^0-9.,]/g, '').trim() : window.formatMoney(auto.precio - ((auto.costo||0) + totalInv));
      html += `
        <div class="bg-black dark:bg-white text-white dark:text-black rounded-[2rem] p-6 mb-6 flex justify-between shadow-xl border border-neutral-800 dark:border-neutral-200">
          <div>
            <p class="text-xs uppercase opacity-70 mb-1 font-bold">Costo Inversión Total</p>
            <p class="text-xl font-bold">${auto.moneda === 'USD' ? 'U$S ' : ''}${window.formatMoney((auto.costo||0) + totalInv).replace('$', '').trim()}</p>
          </div>
          <div class="text-right">
            <p class="text-xs uppercase opacity-70 mb-1 font-bold">Ganancia Bruta Est.</p>
            <p class="text-xl font-black text-green-400 dark:text-green-600">${gananciaFmt}</p>
          </div>
        </div>
      `;
    }
    
    html += `
      <form id="btn-submit-venta" onsubmit="window.handleDAVentaSubmit(event, '${auto.id}')">
        <div class="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-[2rem] border border-neutral-200 dark:border-neutral-700 mb-6">
          <h4 class="font-bold mb-4 text-sm uppercase text-neutral-500 tracking-wider">Datos Comprador</h4>
          <div class="mb-4">
            <label for="vent-crm-lead-id" class="block text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-300 mb-2">Vincular esta venta con un cliente del CRM (opcional)</label>
            <select id="vent-crm-lead-id" onchange="window.seleccionarCompradorCRM(this.value)"
              class="w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-800 font-bold text-sm">
              <option value="">Venta sin cliente del CRM vinculado</option>
              ${leadsPermitidos.filter(c => (window.state.currentUser.rol === 'Admin' || c.userId === window.state.currentUser.id)
                && c.estadoLead !== 'Vendido').map(c => `<option value="${c.id}">${window.escaparTextoCRM(c.nombre)} · ${window.escaparTextoCRM(c.telefono||'Sin teléfono')}${c.estadoLead === 'Cerrado' ? ' · Frío (archivado)' : ''}</option>`).join('')}
            </select>
            <p class="text-[10px] text-neutral-500 mt-1">Seleccioná el cliente para cerrar su gestión automáticamente como Vendido. Se vincula por ID, no por coincidencia de nombre.</p>
          </div>
          <div class="mb-4">
            <label for="vent-crm-cliente" class="block text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-2">Vincular comprador con cliente del CRM (opcional)</label>
            <select id="vent-crm-cliente" onchange="window.seleccionarClienteCRMVenta(this.value)" class="w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none font-bold text-sm focus:border-green-500">
              <option value="">No vinculado / comprador nuevo</option>
              ${leadsPermitidos.filter(c => !window.crmClienteCerrado?.(c) &&
                (window.state.currentUser.rol==='Admin' || c.userId===window.state.currentUser.id))
                .map(c=>'<option value="'+c.id+'">'+String(c.nombre||'').replace(/[&<>"]/g,'')+' · '+String(c.telefono||'').replace(/[&<>"]/g,'')+'</option>').join('')}
            </select>
            <p class="text-[10px] text-neutral-500 mt-2">Al confirmar la venta se cerrará únicamente el cliente seleccionado, conservando su historial.</p>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="col-span-2">
                <datalist id="crm-leads-list">
                    ${leadsPermitidos.filter(c => c.estadoLead !== 'Vendido').map(c => `<option value="${window.escaparTextoCRM(c.nombre)}">${window.escaparTextoCRM(c.telefono)}</option>`).join('')}
                </datalist>
                <input id="vent-comp-nombre" list="crm-leads-list" oninput="window.invalidarVinculoCRMVenta?.(); window.autoFillComprador(this.value)" required placeholder="Nombre y Apellido" class="w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none font-bold focus:border-green-500" />
                <p class="text-[10px] text-neutral-500 mt-1 font-bold px-1">Para vincular la venta al CRM, seleccioná el cliente en el campo superior. Escribir un nombre no vincula automáticamente.</p>
            </div>
            <input id="vent-comp-tel" required placeholder="Teléfono" class="col-span-2 w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none font-bold focus:border-green-500" />
            <input id="vent-comp-dni" required placeholder="D.N.I" class="col-span-2 md:col-span-1 w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none font-bold focus:border-green-500" />
            <input id="vent-comp-domicilio" required placeholder="Domicilio" class="col-span-2 md:col-span-3 w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none font-bold focus:border-green-500" />
          </div>
        </div>
        
        <div class="bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-[2rem] border border-neutral-200 dark:border-neutral-700 mb-6">
          <h4 class="font-bold mb-4 text-sm uppercase text-neutral-500 tracking-wider">Formas de Pago Aplicadas</h4>
          
          <label class="flex items-center space-x-2 mb-2 font-bold cursor-pointer">
            <input type="checkbox" id="chk-efectivo" onchange="document.getElementById('div-efectivo').classList.toggle('hidden', !this.checked)" class="w-5 h-5 text-green-600 rounded"> 
            <span>Efectivo (Ingresa a Caja Central/Admin)</span>
          </label>
          <div id="div-efectivo" class="hidden pl-8 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 fade-in">
            <input id="val-efectivo" type="text" oninput="window.formatInputMoney(this)" placeholder="Monto en Efectivo ($)" class="rounded-xl px-4 py-3 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-bold text-lg outline-none focus:border-green-500">
            <input id="nota-efectivo" type="text" placeholder="Nota / Entregado por..." class="rounded-xl px-4 py-3 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:border-green-500 font-bold">
          </div>

          <label class="flex items-center space-x-2 mb-2 font-bold cursor-pointer">
            <input type="checkbox" id="chk-transferencia" onchange="document.getElementById('div-transferencia').classList.toggle('hidden', !this.checked)" class="w-5 h-5 text-green-600 rounded"> 
            <span>Transferencia (Ingresa a Caja Central/Admin)</span>
          </label>
          <div id="div-transferencia" class="hidden pl-8 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 fade-in">
            <input id="val-transferencia" type="text" oninput="window.formatInputMoney(this)" placeholder="Monto Transferido ($)" class="rounded-xl px-4 py-3 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-bold text-lg outline-none focus:border-green-500">
            <input id="dest-transferencia" type="text" placeholder="Destino (Ej: Bco Galicia, MercadoPago)" class="rounded-xl px-4 py-3 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 outline-none focus:border-green-500 font-bold">
          </div>
          
          <label class="flex items-center space-x-2 mb-2 font-bold cursor-pointer">
            <input type="checkbox" id="chk-credito" onchange="document.getElementById('div-credito').classList.toggle('hidden', !this.checked)" class="w-5 h-5 text-green-600 rounded"> 
            <span>Crédito Pre-Aprobado (Cobro en Caja)</span>
          </label>
          <div id="div-credito" class="hidden pl-8 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl fade-in">
            <input id="val-credito" type="text" oninput="window.formatInputMoney(this)" placeholder="Monto Total a Financiar ($)" class="col-span-2 rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-700 bg-white dark:bg-neutral-900 font-bold outline-none focus:border-green-500">
            <input id="cuotas-credito" type="number" placeholder="Cant. Cuotas" class="rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-700 bg-white dark:bg-neutral-900 font-bold outline-none focus:border-green-500">
            <input id="venc-credito" type="date" class="rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-700 bg-white dark:bg-neutral-900 text-xs font-bold outline-none focus:border-green-500" title="1º Vencimiento">
          </div>
          
          <label class="flex items-center space-x-2 mb-2 font-bold cursor-pointer">
            <input type="checkbox" id="chk-pagare" onchange="document.getElementById('div-pagare').classList.toggle('hidden', !this.checked)" class="w-5 h-5 text-green-600 rounded"> 
            <span>Pagaré Personal (Cobro en Caja)</span>
          </label>
          <div id="div-pagare" class="hidden pl-8 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl fade-in">
            <input id="val-pagare" type="text" oninput="window.formatInputMoney(this)" placeholder="Monto Total a Financiar ($)" class="col-span-2 rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-700 bg-white dark:bg-neutral-900 font-bold outline-none focus:border-green-500">
            <input id="cuotas-pagare" type="number" placeholder="Cant. Cuotas" class="rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-700 bg-white dark:bg-neutral-900 font-bold outline-none focus:border-green-500">
            <input id="venc-pagare" type="date" class="rounded-xl px-4 py-3 border border-amber-200 dark:border-amber-700 bg-white dark:bg-neutral-900 text-xs font-bold outline-none focus:border-green-500" title="1º Vencimiento">
          </div>
        </div>
        
        <div class="mb-8">
            <label class="flex items-center space-x-3 cursor-pointer bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900/40 shadow-sm">
                <input type="checkbox" id="vent-hasperm" class="w-6 h-6 text-indigo-600 rounded cursor-pointer focus:ring-indigo-500" onchange="document.getElementById('permuta-fields').classList.toggle('hidden', !this.checked); window.state.ventaData.tienePermuta=this.checked;" ${window.state.ventaData.tienePermuta ? 'checked' : ''} />
                <span class="font-black text-indigo-800 dark:text-indigo-300 uppercase tracking-widest text-sm flex items-center">
                    <i data-lucide="repeat" class="w-5 h-5 mr-2"></i> Recibir Vehículo en Permuta
                </span>
            </label>
          
          <div id="permuta-fields" class="${window.state.ventaData.tienePermuta ? '' : 'hidden'} bg-neutral-50 dark:bg-neutral-800/50 p-6 rounded-[2rem] border border-neutral-200 dark:border-neutral-700 mt-4 fade-in">
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <input id="p-marca" placeholder="Marca" class="rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none font-bold focus:border-green-500 uppercase" />
              <input id="p-modelo" placeholder="Modelo" class="rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none font-bold focus:border-green-500 uppercase" />
              <input id="p-color" placeholder="Color" class="rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none font-bold focus:border-green-500 uppercase" />
              <input id="p-km" type="text" oninput="window.formatInputMoney(this)" placeholder="Km" class="rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none font-bold focus:border-green-500" />
              <input id="p-anio" type="number" placeholder="Año" class="rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none font-bold focus:border-green-500" />
              <input id="p-pat" placeholder="Patente" class="rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 uppercase outline-none font-bold focus:border-green-500" />
              <select id="p-condicion" class="rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none font-bold focus:border-green-500">
                <option value="Propio">Propio</option>
                <option value="Consignación">Consignación</option>
              </select>
              <div class="col-span-2 mt-2">
                <label class="block text-xs font-bold uppercase mb-2 text-neutral-500">Valor Real de Toma / Costo ($)</label>
                <input id="p-valor" type="text" oninput="window.formatInputMoney(this)" placeholder="Ingresará a la flota con este costo base" class="w-full rounded-xl px-4 py-4 text-lg font-black bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-500" />
              </div>
            </div>
          </div>
        </div>
        <button type="submit" class="w-full py-5 bg-green-600 text-white font-black text-lg rounded-2xl shadow-xl hover:bg-green-700 hover:scale-[1.01] transition-transform flex justify-center items-center">
          <span id="txt-submit-venta">Confirmar Cierre de Venta</span>
        </button>
      </form>
    `;
  }
  
  document.getElementById('da-content').innerHTML = html;
  if(window.lucide) window.lucide.createIcons();
};

window.seleccionarCompradorCRM = id => {
    const lead = (window.state.consultas || []).find(c => c.id === id);
    if (!lead) return;
    const nombre = document.getElementById('vent-comp-nombre');
    const telefono = document.getElementById('vent-comp-tel');
    if (nombre) nombre.value = lead.nombre || '';
    if (telefono) telefono.value = lead.telefono || '';
};

// Elegir un nombre del datalist no establece identidad: nunca cerrar un homónimo.
window.autoFillComprador = nombre => {
    const seleccionado = document.getElementById('vent-crm-lead-id');
    if (seleccionado?.value) {
        const lead = (window.state.consultas || []).find(c => c.id === seleccionado.value);
        if (lead && nombre !== lead.nombre) seleccionado.value = '';
    }
};

window.exportarFlotaExcel = () => {
    let autosValidos = (window.state.autos || []).filter(a => a.estado !== 'Vendido');
    autosValidos.sort((a, b) => String(a.marca || '').localeCompare(String(b.marca || '')) || String(a.modelo || '').localeCompare(String(b.modelo || '')));

    if (autosValidos.length === 0) {
        alert("No hay vehículos en stock para exportar.");
        return;
    }

    // Usamos punto y coma (;) para compatibilidad nativa con Excel en español
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Marca;Modelo;Año;Patente;KM;Color;Condición;Estado;Costo;Precio Venta;Moneda\n";

    autosValidos.forEach(a => {
        const cleanStr = (str) => `"${String(str || '').replace(/"/g, '""')}"`;
        
        const row = [
            cleanStr(a.marca),
            cleanStr(a.modelo),
            a.año || '',
            cleanStr(a.patente),
            a.km || 0,
            cleanStr(a.color),
            cleanStr(a.condicion),
            cleanStr(a.estado),
            a.costo || 0,
            a.precio || 0,
            cleanStr(a.moneda || 'ARS')
        ];
        
        csvContent += row.join(";") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
    link.setAttribute("download", `Stock_Flota_${fecha}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

window.imprimirFlota = () => {
   const globalLogo = document.getElementById('print-logo');
   if(globalLogo) globalLogo.classList.add('hidden');

   let printHtml = `
     <style>
       @media print {
         @page { margin: 0.2cm; }
         body { margin: 0; padding: 0; }
       }
     </style>
     <h2 class="text-center font-black text-xl mb-2 mt-2 uppercase">Flota y Stock Actual</h2>
     <table class="w-full text-left border-collapse border border-black text-[12px]">
        <thead>
          <tr class="bg-gray-200 border-b border-black uppercase">
            <th class="p-1 border-r border-black font-bold">Vehículo</th>
            <th class="p-1 border-r border-black font-bold text-center">Año</th>
            <th class="p-1 border-r border-black font-bold text-center">Patente</th>
            <th class="p-1 border-r border-black font-bold text-center">KM</th>
            <th class="p-1 border-r border-black font-bold text-center">Color</th>
            <th class="p-1 border-r border-black font-bold text-center">Condición</th>
            <th class="p-1 text-right font-bold">Precio</th>
          </tr>
        </thead>
        <tbody>
   `;
   
   (window.state.autos || []).filter(a => a.estado !== 'Vendido').sort((a,b) => String(a.marca || '').localeCompare(String(b.marca || '')) || String(a.modelo || '').localeCompare(String(b.modelo || ''))).forEach(a => {
     const precioFmt = a.moneda === 'USD' ? 'U$S ' + window.formatMoney(a.precio).replace(/[^0-9.,]/g, '').trim() : window.formatMoney(a.precio);
     const kmFmt = a.km ? new Intl.NumberFormat('es-AR').format(a.km) : '-';
     
     printHtml += `
       <tr class="border-b border-black">
         <td class="p-1 border-r border-black font-bold uppercase">${a.marca} ${a.modelo}</td>
         <td class="p-1 border-r border-black text-center">${a.año}</td>
         <td class="p-1 border-r border-black text-center uppercase">${a.patente}</td>
         <td class="p-1 border-r border-black text-center">${kmFmt}</td>
         <td class="p-1 border-r border-black text-center uppercase">${a.color || '-'}</td>
         <td class="p-1 border-r border-black text-center uppercase">${a.condicion || '-'}</td>
         <td class="p-1 text-right font-bold whitespace-nowrap">${precioFmt}</td>
       </tr>
     `;
   });
   
   printHtml += `</tbody></table>`;
   
   document.getElementById('print-content').innerHTML = printHtml;
   document.getElementById('app-wrapper').classList.add('hidden'); 
   document.getElementById('print-section').classList.remove('hidden');
   
   setTimeout(() => { 
     window.print(); 
     document.getElementById('print-section').classList.add('hidden'); 
     document.getElementById('app-wrapper').classList.remove('hidden'); 
     if(globalLogo) globalLogo.classList.remove('hidden');
   }, 500);
};
