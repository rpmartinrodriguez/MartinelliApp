// ==========================================
// js/render/renderCRM.js
// ==========================================

window.renderClientesView = () => {
    const table = document.getElementById('crm-table');
    
    if (!table) {
        return;
    }

    // 1. INYECTAR BUSCADOR DINÁMICAMENTE (Si no existe)
    const headerDiv = document.querySelector('#view-crm .mb-6');
    if (headerDiv && !document.getElementById('search-crm')) {
        headerDiv.className = "mb-6 flex flex-col sm:flex-row justify-between items-center gap-4";
        headerDiv.innerHTML = `
            <button onclick="window.abrirFormularioCliente()" class="bg-black text-white dark:bg-white dark:text-black px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg flex items-center w-full sm:w-auto justify-center shrink-0">
                <i data-lucide="user-plus" class="w-4 h-4 mr-2"></i> Nuevo Cliente
            </button>
            <div class="relative w-full sm:w-96">
                <i data-lucide="search" class="absolute left-4 top-3.5 w-4 h-4 text-neutral-400"></i>
                <input type="text" id="search-crm" onkeyup="window.renderClientesView()" oninput="window.renderClientesView()" placeholder="Buscar por nombre, teléfono o interés..." class="w-full pl-11 pr-4 py-2.5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-neutral-200 dark:border-neutral-700 rounded-xl outline-none font-bold text-sm focus:border-green-500 transition-colors shadow-sm">
            </div>
        `;
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    let leads = window.state.consultas || [];
    const query = (document.getElementById('search-crm')?.value || '').toLowerCase();

    // Filtro estricto por roles para privacidad del CRM
    if (window.state.currentUser.rol === 'Vendedor') {
        leads = leads.filter(c => c.userId === window.state.currentUser.id);
    } else if (window.state.currentUser.rol === 'Encargado') {
        const validUsers = window.state.usuarios
            .filter(u => u.sucursalId === window.state.currentUser.sucursalId && u.rol !== 'Admin')
            .map(u => u.id);
        
        leads = leads.filter(c => validUsers.includes(c.userId));
    }

    // Filtro del Buscador
    if (query) {
        leads = leads.filter(c => 
            (c.nombre || '').toLowerCase().includes(query) ||
            (c.telefono || '').toLowerCase().includes(query) ||
            (c.marcaInteres || '').toLowerCase().includes(query)
        );
    }

    // Ordenar los leads por fecha de creación (los más nuevos arriba)
    leads.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    // Estado vacío
    if (leads.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-10 text-neutral-500 font-bold">
                    <div class="flex flex-col items-center justify-center">
                        <i data-lucide="inbox" class="w-8 h-8 mb-3 opacity-50"></i>
                        ${query ? 'No se encontraron clientes con esa búsqueda.' : 'No hay clientes en tu cartera.'}
                    </div>
                </td>
            </tr>
        `;
        if (window.lucide) {
            window.lucide.createIcons();
        }
        return;
    }

    // Renderizado de la tabla con los leads
    let tableHtml = `
        <thead>
            <tr class="text-[10px] uppercase tracking-widest text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-800/30">
                <th class="px-6 py-4 font-bold rounded-tl-2xl">Cliente y Alta</th>
                <th class="px-6 py-4 font-bold">Interés / Auto</th>
                <th class="px-6 py-4 font-bold text-center">Score (Temp)</th>
                <th class="px-6 py-4 font-bold text-right rounded-tr-2xl">Próx. Contacto</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800/50">
    `;

    leads.forEach(c => {
        // Análisis Inteligente de Temperatura
        let analisis = window.calcularTermometroLead ? window.calcularTermometroLead(c) : { score: 50, estado: 'Tibio' };
        
        // Formatear fecha simple (DD/MM) para que no se corte en celulares
        const fechaFormat = c.fecha ? c.fecha.split('-').reverse().slice(0, 2).join('/') : '--/--';
        
        // Buscamos al creador del Lead
        const creador = (window.state.usuarios || []).find(u => u.id === c.userId);
        const nombreCreador = creador ? creador.nombre : 'Usuario Desconocido';
        
        // Buscamos si está asociado a un auto específico
        let autoVinculado = '';
        
        if (c.autoId) {
            const auto = window.state.autos.find(a => a.id === c.autoId);
            if (auto) {
                const estadoAuto = auto.estado === 'Vendido' ? '<span class="text-rose-500 ml-1">[VENDIDO]</span>' : '';
                autoVinculado = `
                    <div class="text-[10px] text-green-600 dark:text-green-400 font-bold mt-1 uppercase tracking-widest flex items-center">
                        <i data-lucide="link" class="w-3 h-3 mr-1"></i> Ref: ${auto.marca} ${auto.modelo} ${estadoAuto}
                    </div>
                `;
            }
        } else {
            const interesTexto = ((c.marcaInteres || '') + ' ' + (c.notas || '')).toLowerCase();
            const coincidencias = window.state.autos.filter(a => {
                return a.estado !== 'Vendido' && (
                    window.coincidenciasClientesFlota(c, [a]).length > 0
                );
            });

            if (coincidencias.length > 0 && c.estadoLead !== 'Vendido') {
                autoVinculado = `
                    <div class="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-1 uppercase tracking-widest flex items-center">
                        <i data-lucide="zap" class="w-3 h-3 mr-1 animate-pulse"></i> ¡Stock Disponible (${coincidencias.length})!
                    </div>
                `;
            }
        }

        // Colores según el Score Calculado (Forzar estado si ya se vendió por salón)
        let eClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'; // Frío
        let tColor = 'text-blue-500';
        
        if (c.estadoLead === 'Vendido') {
            eClass = 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
            tColor = 'text-purple-500';
            analisis.estado = 'Cerrado';
            analisis.score = 100;
        } else if (analisis.estado === 'Caliente') {
            eClass = 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800';
            tColor = 'text-rose-500';
        } else if (analisis.estado === 'Tibio') {
            eClass = 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
            tColor = 'text-amber-500';
        }

        // Buscar el próximo contacto pendiente en el historial
        const pendientes = (c.historial || [])
            .filter(h => !h.completado && h.proximoContacto)
            .sort((a,b) => new Date(a.proximoContacto) - new Date(b.proximoContacto));
        
        let prox = pendientes.length > 0 ? window.formatDate(pendientes[0].proximoContacto) : 'Sin agendar';
        if (c.estadoLead === 'Vendido') {
            prox = 'Vendido';
        }

        tableHtml += `
            <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer" onclick="window.openDetalleLead('${c.id}')">
                <td class="px-4 py-4 flex items-center space-x-3">
                    <div class="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1.5 text-center min-w-[50px] shadow-sm border border-neutral-200 dark:border-neutral-700">
                        <p class="text-[8px] font-black uppercase text-neutral-400 tracking-widest mb-0.5">Alta</p>
                        <p class="text-xs font-black text-neutral-700 dark:text-neutral-300">
                            ${fechaFormat}
                        </p>
                    </div>
                    <div>
                        <p class="font-black text-sm text-neutral-800 dark:text-neutral-200">
                            ${c.nombre}
                        </p>
                        <p class="text-[9px] text-neutral-500 font-bold tracking-widest uppercase mt-1">
                            ${c.telefono} • <span class="text-indigo-600 dark:text-indigo-400">Vend: ${nombreCreador}</span>
                        </p>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <p class="text-sm font-bold text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]">
                        ${c.marcaInteres || 'Consulta General'}
                    </p>
                    ${autoVinculado}
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="inline-flex flex-col items-center">
                        <span class="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${eClass} mb-1 shadow-sm">
                            ${analisis.estado}
                        </span>
                        <span class="text-[10px] font-bold ${tColor}">
                            ${analisis.score} pts
                        </span>
                    </div>
                </td>
                <td class="px-6 py-4 text-right">
                    <span class="text-xs font-black uppercase tracking-wider ${prox !== 'Sin agendar' ? 'text-neutral-800 dark:text-neutral-200' : 'text-neutral-400'}">
                        ${prox}
                    </span>
                </td>
            </tr>
        `;
    });

    tableHtml += `</tbody>`;
    table.innerHTML = tableHtml;

    if (window.lucide) {
        window.lucide.createIcons();
    }
};

window.openDetalleLead = (id) => {
    const lead = window.state.consultas.find(x => x.id === id);
    
    if (!lead) {
        return;
    }

    // Análisis en tiempo real
    let analisis = window.calcularTermometroLead ? window.calcularTermometroLead(lead) : { score: 50, estado: 'Tibio' };
    if (lead.estadoLead === 'Vendido') {
        analisis.estado = 'Cerrado';
        analisis.score = 100;
    }

    const creador = (window.state.usuarios || []).find(u => u.id === lead.userId);
    const nombreCreador = creador ? creador.nombre : 'Usuario Desconocido';

    let autoVinculado = '';
    
    if (lead.autoId) {
        const auto = window.state.autos.find(a => a.id === lead.autoId);
        if (auto) {
            autoVinculado = `
                <div class="mt-6 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 rounded-2xl shadow-sm">
                    <p class="text-[10px] font-bold text-green-700 dark:text-green-500 uppercase tracking-widest flex items-center mb-1">
                        <i data-lucide="link" class="w-3 h-3 mr-1"></i> Consulta original (Referencia):
                    </p>
                    <p class="text-sm font-black text-neutral-800 dark:text-neutral-200">
                        ${auto.marca} ${auto.modelo} (${auto.patente})
                    </p>
                    <p class="text-xs font-bold mt-1 ${auto.estado === 'Vendido' ? 'text-rose-500' : 'text-green-600'}">
                        Estado: ${auto.estado}
                    </p>
                </div>
            `;
        }
    } else if (lead.estadoLead !== 'Vendido') {
        const interesTexto = ((lead.marcaInteres || '') + ' ' + (lead.notas || '')).toLowerCase();
        const coincidencias = window.state.autos.filter(a => {
            return a.estado !== 'Vendido' && (
                window.coincidenciasClientesFlota(lead, [a]).length > 0
            );
        });

        if (coincidencias.length > 0) {
            let listaC = coincidencias.map(a => `
                <li class="text-sm font-black text-indigo-800 dark:text-indigo-300">
                    • ${a.marca} ${a.modelo} (${window.formatMoney(a.precio, a.moneda)})
                </li>
            `).join('');

            autoVinculado = `
                <div class="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl shadow-sm">
                    <p class="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center mb-2">
                        <i data-lucide="zap" class="w-4 h-4 mr-1 animate-pulse"></i> ¡Oportunidad de Cierre!
                    </p>
                    <p class="text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-2">
                        Tienes vehículos en stock que coinciden con el interés de este cliente:
                    </p>
                    <ul class="space-y-1">
                        ${listaC}
                    </ul>
                </div>
            `;
        }
    }

    let barColor = 'bg-blue-500';
    if (analisis.estado === 'Cerrado') barColor = 'bg-purple-500';
    else if (analisis.estado === 'Caliente') barColor = 'bg-rose-500';
    else if (analisis.estado === 'Tibio') barColor = 'bg-amber-500';

    const historial = lead.historial || [];

    // Panel de Información si se concretó la venta desde la Flota
    let panelCerradoInfo = '';
    if (lead.estadoLead === 'Vendido') {
        panelCerradoInfo = `
            <div class="mt-6 mb-6 p-5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl text-center shadow-inner relative overflow-hidden">
                <i data-lucide="award" class="absolute -right-4 -bottom-4 w-24 h-24 text-purple-200 dark:text-purple-800 opacity-30"></i>
                <i data-lucide="check-circle" class="w-10 h-10 text-purple-500 mx-auto mb-2 relative z-10"></i>
                <h5 class="font-black text-sm text-purple-800 dark:text-purple-400 uppercase tracking-wider relative z-10">
                    Cliente Cerrado (Vendido)
                </h5>
                <p class="text-xs font-bold text-purple-600 dark:text-purple-500 mt-1 relative z-10">
                    El sistema detectó que este cliente concretó una operación exitosa en el Salón.
                </p>
            </div>
        `;
    }

    let html = `
        <div class="mb-4 pb-4 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
            <p class="text-xs font-bold text-neutral-500">
                Alta: <span class="text-neutral-800 dark:text-neutral-200">${window.formatDate(lead.fecha)}</span>
            </p>
            <p class="text-[10px] font-bold text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                <i data-lucide="user" class="w-3 h-3 inline mr-1"></i> ${nombreCreador}
            </p>
        </div>

        ${panelCerradoInfo}

        <div class="mb-6 p-5 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-2xl">
            <div class="flex justify-between items-end mb-2">
                <div>
                    <p class="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Estado Calculado</p>
                    <h4 class="font-black text-xl uppercase ${barColor.replace('bg-', 'text-')}">${analisis.estado}</h4>
                </div>
                <div class="text-right">
                    <p class="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Score</p>
                    <h4 class="font-black text-2xl">${analisis.score} <span class="text-sm text-neutral-400">/ 100</span></h4>
                </div>
            </div>
            <div class="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3 overflow-hidden mt-3 shadow-inner">
                <div class="${barColor} h-3 rounded-full transition-all duration-1000 ease-out" style="width: ${analisis.score}%"></div>
            </div>
            <p class="text-[10px] font-bold text-neutral-400 mt-2 text-center uppercase tracking-widest flex items-center justify-center">
                <i data-lucide="cpu" class="w-3 h-3 mr-1"></i> Analizado por el sistema
            </p>
        </div>

        <form id="form-edit-lead" onsubmit="window.handleEditLeadSubmit(event, '${id}')" class="space-y-4 mb-6">
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 pl-1">
                        Nombre
                    </label>
                    <input id="edit-lead-nombre" required value="${lead.nombre}" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold focus:border-green-500 transition-colors" />
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 pl-1">
                        Teléfono
                    </label>
                    <input id="edit-lead-tel" required value="${lead.telefono}" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold focus:border-green-500 transition-colors" />
                </div>
            </div>
            
            <div>
                <label class="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 pl-1">
                    Interés Inicial
                </label>
                <input id="edit-lead-interes" disabled value="${lead.marcaInteres || 'No especificado'}" class="w-full rounded-xl px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 outline-none font-bold text-neutral-500 cursor-not-allowed" />
            </div>

            <div>
                <label class="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1 pl-1">
                    Notas Iniciales
                </label>
                <textarea id="edit-lead-nota" rows="2" placeholder="Notas iniciales..." class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none resize-none font-bold focus:border-green-500 transition-colors">${lead.notas || ''}</textarea>
            </div>
            
            <button type="submit" class="w-full py-3 bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 rounded-xl font-black uppercase tracking-wider text-xs hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors shadow-sm">
                Actualizar Datos de Contacto
            </button>
        </form>

        ${autoVinculado}

        <div class="border-t border-neutral-200 dark:border-neutral-800 pt-6 mt-6">
            <h4 class="font-black text-sm uppercase mb-4 text-neutral-500 tracking-wider flex items-center">
                <i data-lucide="history" class="w-4 h-4 mr-2"></i> Historial y Seguimiento
            </h4>
            
            ${lead.estadoLead !== 'Vendido' ? `
            <form onsubmit="window.handleAddLeadHistory(event, '${id}')" class="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/50 mb-6 shadow-sm">
                <textarea id="lh-texto" required rows="2" placeholder="Ej: Lo llamé y ofreció permuta por un Gol..." class="w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-700 outline-none resize-none font-bold text-sm mb-4 focus:border-amber-500 transition-colors"></textarea>
                
                <div class="flex items-center space-x-3">
                    <div class="flex-1">
                        <label class="block text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest mb-1">
                            Agendar Próximo Contacto
                        </label>
                        <input id="lh-fecha" type="date" required class="w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-700 outline-none font-bold text-sm focus:border-amber-500 transition-colors" />
                    </div>
                    <button type="submit" class="mt-5 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-black rounded-xl font-black uppercase tracking-wider text-xs shadow-md hover:scale-105 transition-all">
                        Registrar
                    </button>
                </div>
            </form>
            ` : ''}

            <div class="space-y-4 max-h-60 overflow-y-auto no-scrollbar pr-1">
    `;

    if (historial.length === 0) {
        html += `
            <div class="text-center py-6">
                <i data-lucide="message-square" class="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-2"></i>
                <p class="text-xs text-neutral-500 font-bold">
                    Aún no has registrado ningún seguimiento.<br>¡Háblale y suma puntos!
                </p>
            </div>
        `;
    } else {
        const histHTML = historial.slice().reverse().map(h => {
            const opacityClass = h.completado ? 'opacity-60' : '';
            const btnHecho = (!h.completado && lead.estadoLead !== 'Vendido') ? `
                <button type="button" onclick="window.markHistoryCompleted('${id}', '${h.id}')" class="px-3 py-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-green-200 dark:hover:bg-green-800 transition-colors shadow-sm flex items-center">
                    <i data-lucide="check" class="w-3 h-3 mr-1"></i> Hecho
                </button>
            ` : `
                <div class="flex items-center text-green-500 text-[10px] font-black uppercase tracking-wider bg-green-50 dark:bg-green-900/10 px-2 py-1 rounded">
                    <i data-lucide="check-check" class="w-3 h-3 mr-1"></i> Listo
                </div>
            `;

            let agendaInfo = '';
            if (h.proximoContacto) {
                const colorTexto = h.completado ? 'text-green-500' : (h.proximoContacto < new Date().toISOString().split('T')[0] ? 'text-rose-500' : 'text-amber-500');
                agendaInfo = `
                    <div class="flex items-center">
                        <span class="text-[10px] font-black uppercase tracking-wider mr-3 ${colorTexto}">
                            Agenda: ${window.formatDate(h.proximoContacto)}
                        </span>
                        ${btnHecho}
                    </div>
                `;
            }

            return `
                <div class="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex flex-col relative transition-opacity ${opacityClass}">
                    <p class="text-sm font-bold mb-3 text-neutral-800 dark:text-neutral-200 leading-relaxed">
                        ${h.texto}
                    </p>
                    
                    <div class="flex justify-between items-center mt-auto border-t border-neutral-100 dark:border-neutral-800 pt-3">
                        <span class="text-[10px] text-neutral-400 font-bold tracking-wider uppercase">
                            Carga: ${window.formatDate(h.fechaCarga)}
                        </span>
                        ${agendaInfo}
                    </div>
                </div>
            `;
        }).join('');
        
        html += histHTML;
    }

    html += `
            </div>
        </div>
    `;

    document.getElementById('lead-detail-content').innerHTML = html;
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
    
    window.openModal('modal-detalle-lead');
};
