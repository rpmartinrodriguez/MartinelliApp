// ==========================================
// js/render/renderAdmin.js
// ==========================================

window.renderResumenesView = () => {
    const container = document.getElementById('dashboard-content');
    
    if (!container) {
        return;
    }

    // Filtro de seguridad: Solo el Administrador puede ver los números sensibles
    if (window.state.currentUser?.rol !== 'Admin') {
        container.className = "flex justify-center items-center h-64";
        container.innerHTML = `
            <div class="text-center p-8 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-3xl w-full max-w-md">
                <i data-lucide="shield-alert" class="w-12 h-12 text-rose-500 mx-auto mb-4"></i>
                <h3 class="text-lg font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">Acceso Denegado</h3>
                <p class="text-sm font-bold text-rose-600 dark:text-rose-500 mt-2">Esta sección contiene datos financieros y es exclusiva para la administración.</p>
            </div>
        `;
        
        if (window.lucide) {
            window.lucide.createIcons();
        }
        return;
    }

    // Quitamos la grilla por defecto del contenedor para armar nuestro propio layout
    container.className = "flex flex-col space-y-8 w-full";

    // --- PROCESAMIENTO DE DATOS ---
    const now = new Date();
    const mesActual = now.getMonth();
    const añoActual = now.getFullYear();
    const todayStr = now.toISOString().split('T')[0];

    // 1. Análisis de Stock (Capital Inmovilizado)
    const autosDisponibles = (window.state.autos || []).filter(a => a.estado !== 'Vendido');
    const totalAutos = autosDisponibles.length;
    const costoTotalInvertido = autosDisponibles.reduce((acc, a) => acc + (Number(a.costo) || 0), 0);
    const valorTotalReventa = autosDisponibles.reduce((acc, a) => acc + (Number(a.precio) || 0), 0);
    const gananciaBrutaPotencial = valorTotalReventa - costoTotalInvertido;

    // 2. Análisis de Ventas (Mes Actual)
    const ventasMes = (window.state.ventas || []).filter(v => {
        const d = new Date(v.fecha);
        return d.getMonth() === mesActual && d.getFullYear() === añoActual;
    });
    const cantidadVentasMes = ventasMes.length;
    const facturacionMes = ventasMes.reduce((acc, v) => acc + (Number(v.montoTotal) || 0), 0);

    // 3. Ranking de Vendedores
    const rankingVendedores = {};
    (window.state.ventas || []).forEach(v => {
        if (!rankingVendedores[v.userId]) {
            rankingVendedores[v.userId] = { qty: 0, total: 0 };
        }
        rankingVendedores[v.userId].qty++;
        rankingVendedores[v.userId].total += (Number(v.montoTotal) || 0);
    });

    const topVendedores = Object.keys(rankingVendedores).map(uid => {
        const u = (window.state.usuarios || []).find(x => x.id === uid);
        return {
            nombre: u ? u.nombre : 'Usuario Eliminado',
            qty: rankingVendedores[uid].qty,
            total: rankingVendedores[uid].total
        };
    }).sort((a, b) => b.qty - a.qty).slice(0, 5); 

    const maxVentasTop = topVendedores.length > 0 ? topVendedores[0].qty : 1;

    // 4. Análisis de Caja Chica (Ingresos y Egresos del Mes)
    const transaccionesMes = (window.state.transacciones || []).filter(t => {
        // Incluye efectivo Y transferencias: la categoría define el gasto,
        // no el medio empleado para pagarlo.
        if (t.eliminado === true) return false;
        // No mezclar importes USD con los indicadores contables en pesos.
        if (t.moneda === 'USD') return false;
        const d = new Date(t.fecha);
        return d.getMonth() === mesActual && d.getFullYear() === añoActual;
    });
    
    const ingresosCajaMes = transaccionesMes.filter(t => t.tipo === 'ingreso').reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
    const gastosMes = transaccionesMes.filter(t => t.tipo === 'gasto');
    const totalGastosMes = gastosMes.reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
    const balanceCajaMes = ingresosCajaMes - totalGastosMes;

    const agrupacionGastos = {};
    gastosMes.forEach(g => {
        const cat = g.categoria || 'Sin Categoría';
        if (!agrupacionGastos[cat]) {
            agrupacionGastos[cat] = 0;
        }
        agrupacionGastos[cat] += (Number(g.valor) || 0);
    });

    const topGastos = Object.keys(agrupacionGastos).map(cat => {
        return { categoria: cat, monto: agrupacionGastos[cat] };
    }).sort((a, b) => b.monto - a.monto);

    // 5. Análisis CRM y Seguimiento Vendedores
    const leads = window.state.consultas || [];
    const totalLeads = leads.length;
    const activos = leads.filter(l => l.estadoLead !== 'Vendido');
    const leadsCalientes = activos.filter(l => window.calcularTermometroLead(l).estado === 'Caliente').length;
    const leadsTibios = activos.filter(l => window.calcularTermometroLead(l).estado === 'Tibio').length;
    const leadsFrios = activos.filter(l => window.calcularTermometroLead(l).estado === 'Frío').length;

    const porcCaliente = totalLeads > 0 ? (leadsCalientes / totalLeads) * 100 : 0;
    const porcTibio = totalLeads > 0 ? (leadsTibios / totalLeads) * 100 : 0;
    const porcFrio = totalLeads > 0 ? (leadsFrios / totalLeads) * 100 : 0;

    // Tasa de conversión mensual
    const leadsMes = leads.filter(l => {
        const d = new Date(l.fecha);
        return d.getMonth() === mesActual && d.getFullYear() === añoActual;
    });
    const conversionRate = leadsMes.length > 0 ? ((cantidadVentasMes / leadsMes.length) * 100).toFixed(1) : 0;

    // Rendimiento CRM por Vendedor (Auditoría de Seguimientos)
    const auditVendedores = [];
    const usuariosVendedores = (window.state.usuarios || []).filter(u => u.rol !== 'Admin');
    
    usuariosVendedores.forEach(u => {
        const leadsUsuario = leads.filter(l => l.userId === u.id);
        let conSeguimiento = 0;
        let conAtraso = 0;

        leadsUsuario.forEach(l => {
            if (l.historial && l.historial.length > 0) {
                // Chequeamos si tiene algún pendiente
                const pendientes = l.historial.filter(h => !h.completado && h.proximoContacto);
                if (pendientes.length > 0) {
                    conSeguimiento++;
                    // Chequeamos si alguno está vencido
                    const atrasados = pendientes.filter(h => h.proximoContacto < todayStr);
                    if (atrasados.length > 0) {
                        conAtraso++;
                    }
                }
            }
        });

        auditVendedores.push({
            nombre: u.nombre,
            rol: u.rol,
            totalLeads: leadsUsuario.length,
            agendados: conSeguimiento,
            atrasados: conAtraso
        });
    });

    // Ordenar auditoría (los que tienen más atrasos primero)
    auditVendedores.sort((a, b) => b.atrasados - a.atrasados);


    // --- CONSTRUCCIÓN DE LA INTERFAZ (HTML) ---
    
    const nombreMes = new Date().toLocaleString('es-AR', { month: 'long', year: 'numeric' });

    let html = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div class="bg-gradient-to-br from-neutral-900 to-black text-white p-6 rounded-3xl shadow-xl relative overflow-hidden transform hover:scale-[1.02] transition-transform">
                <div class="absolute -right-4 -bottom-4 opacity-10"><i data-lucide="vault" class="w-32 h-32"></i></div>
                <div class="relative z-10">
                    <p class="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1 flex items-center justify-between">
                        Capital en Calle (Stock)
                        <i data-lucide="info" class="w-4 h-4 cursor-help text-neutral-500 hover:text-white transition-colors" title="Cálculo: Suma de los valores de 'Costo (Oculto)' de todos los vehículos que figuran como Disponibles o A Ingresar. Muestra cuánta plata tienes inmovilizada en chapa."></i>
                    </p>
                    <h3 class="text-3xl font-black text-white">${window.formatMoney(costoTotalInvertido)}</h3>
                    <div class="mt-4 pt-4 border-t border-neutral-800">
                        <div class="flex justify-between items-center text-xs">
                            <span class="text-neutral-400 font-bold">Autos Físicos:</span>
                            <span class="font-black text-green-400">${totalAutos} Unidades</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm transform hover:scale-[1.02] transition-transform">
                <p class="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1 flex items-center justify-between">
                    <span class="flex items-center"><i data-lucide="trending-up" class="w-3 h-3 mr-1 text-green-500"></i> Ganancia Potencial</span>
                    <i data-lucide="info" class="w-4 h-4 cursor-help text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors" title="Cálculo: Suma del 'Precio Venta' menos la suma del 'Costo Oculto' de todos los vehículos en stock. Es la ganancia bruta esperada si vendes toda la flota al precio de lista."></i>
                </p>
                <h3 class="text-3xl font-black text-green-600 dark:text-green-500">${window.formatMoney(gananciaBrutaPotencial)}</h3>
                <div class="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-neutral-500 font-bold">Valorizado Público:</span>
                        <span class="font-black text-neutral-800 dark:text-neutral-200">${window.formatMoney(valorTotalReventa)}</span>
                    </div>
                </div>
            </div>

            <div class="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm transform hover:scale-[1.02] transition-transform">
                <p class="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1 flex items-center justify-between">
                    <span class="flex items-center capitalize"><i data-lucide="badge-dollar-sign" class="w-3 h-3 mr-1 text-blue-500"></i> Operado en ${nombreMes}</span>
                    <i data-lucide="info" class="w-4 h-4 cursor-help text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors" title="Cálculo: Suma del 'Monto Total' de las ventas concretadas durante este mes. Ojo: Es el volumen de la operación, incluye tasaciones de permutas y créditos otorgados."></i>
                </p>
                <h3 class="text-3xl font-black text-blue-600 dark:text-blue-500">${window.formatMoney(facturacionMes)}</h3>
                <div class="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-neutral-500 font-bold">Operaciones Cerradas:</span>
                        <span class="font-black text-neutral-800 dark:text-neutral-200">${cantidadVentasMes} Ventas</span>
                    </div>
                </div>
            </div>

            <div class="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm transform hover:scale-[1.02] transition-transform">
                <p class="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1 flex items-center justify-between">
                    <span class="flex items-center capitalize"><i data-lucide="arrow-down-right" class="w-3 h-3 mr-1 text-rose-500"></i> Gastos de ${nombreMes}</span>
                    <i data-lucide="info" class="w-4 h-4 cursor-help text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors" title="Cálculo: Suma de todos los movimientos tipo 'Egreso' cargados en Caja Chica durante este mes (incluye comisiones pagadas, gestoría, taller, etc)."></i>
                </p>
                <h3 class="text-3xl font-black text-rose-600 dark:text-rose-500">${window.formatMoney(totalGastosMes)}</h3>
                <div class="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-neutral-500 font-bold">Movimientos (Tickets):</span>
                        <span class="font-black text-neutral-800 dark:text-neutral-200">${gastosMes.length} Registros</span>
                    </div>
                </div>
            </div>

        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div class="lg:col-span-1 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm flex flex-col">
                <div class="flex justify-between items-start mb-6">
                    <h4 class="font-black text-lg uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center">
                        <i data-lucide="medal" class="w-5 h-5 mr-2 text-amber-500"></i> Top Vendedores
                    </h4>
                    <i data-lucide="info" class="w-4 h-4 cursor-help text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors" title="Muestra a los 5 empleados con más ventas cerradas históricamente. La barra mide el volumen de unidades vendidas."></i>
                </div>
    `;

    if (topVendedores.length === 0) {
        html += `<p class="text-neutral-500 text-sm font-bold text-center italic my-auto">Aún no hay ventas registradas.</p>`;
    } else {
        html += `<div class="space-y-5 flex-1">`;
        topVendedores.forEach((v, index) => {
            const porcentajeWidth = (v.qty / maxVentasTop) * 100;
            const medalColor = index === 0 ? 'text-yellow-400' : (index === 1 ? 'text-gray-400' : (index === 2 ? 'text-amber-700' : 'text-neutral-200 dark:text-neutral-800'));
            
            html += `
                <div>
                    <div class="flex justify-between items-end mb-1">
                        <div class="flex items-center space-x-2">
                            <i data-lucide="award" class="w-4 h-4 ${medalColor}"></i>
                            <span class="font-black text-sm text-neutral-800 dark:text-neutral-200">${v.nombre}</span>
                        </div>
                        <span class="font-black text-xs text-neutral-500">${v.qty} ventas</span>
                    </div>
                    <div class="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2.5 overflow-hidden">
                        <div class="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full" style="width: ${porcentajeWidth}%"></div>
                    </div>
                    <p class="text-[10px] font-bold text-neutral-400 text-right mt-1">Volumen Operado: ${window.formatMoney(v.total)}</p>
                </div>
            `;
        });
        html += `</div>`;
    }

    html += `
            </div>

            <div class="lg:col-span-1 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm flex flex-col">
                <div class="flex justify-between items-start mb-6">
                    <h4 class="font-black text-lg uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center">
                        <i data-lucide="pie-chart" class="w-5 h-5 mr-2 text-rose-500"></i> Fuga por Categorías
                    </h4>
                    <i data-lucide="info" class="w-4 h-4 cursor-help text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors" title="Lista de egresos de la Caja Chica de ESTE MES ordenados de mayor a menor. Te permite ver rápidamente en qué concepto se está yendo más dinero."></i>
                </div>
    `;

    if (topGastos.length === 0) {
        html += `<p class="text-neutral-500 text-sm font-bold text-center italic my-auto">Sin gastos en el mes actual.</p>`;
    } else {
        html += `<div class="space-y-4 overflow-y-auto no-scrollbar max-h-80 flex-1">`;
        topGastos.forEach(g => {
            const porcGasto = (g.monto / totalGastosMes) * 100;
            html += `
                <div class="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-xs font-black uppercase text-neutral-700 dark:text-neutral-300">${g.categoria}</span>
                        <span class="text-sm font-black text-rose-600 dark:text-rose-500">${window.formatMoney(g.monto)}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <div class="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5 overflow-hidden flex-1">
                            <div class="bg-rose-500 h-1.5 rounded-full" style="width: ${porcGasto}%"></div>
                        </div>
                        <span class="text-[10px] font-bold text-neutral-500 w-8 text-right">${porcGasto.toFixed(0)}%</span>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    }

    html += `
            </div>

            <div class="lg:col-span-1 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
                <div>
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-black text-lg uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center">
                            <i data-lucide="thermometer" class="w-5 h-5 mr-2 text-blue-500"></i> Termómetro CRM
                        </h4>
                        <i data-lucide="info" class="w-4 h-4 cursor-help text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors" title="Clasificación visual de TODOS los leads cargados en la base de datos según la prioridad asignada por los vendedores."></i>
                    </div>
                    <p class="text-xs font-bold text-neutral-500 mb-6">Temperatura de tu cartera total de clientes.</p>
                </div>
                
                <div class="flex items-end space-x-2 h-40 mb-6">
                    <div class="flex flex-col items-center flex-1 h-full justify-end">
                        <span class="text-xs font-black text-blue-500 mb-2">${leadsFrios}</span>
                        <div class="w-full bg-blue-500 rounded-t-lg transition-all duration-1000" style="height: ${porcFrio}%;"></div>
                        <span class="text-[10px] font-bold uppercase text-neutral-500 mt-2">Fríos</span>
                    </div>
                    <div class="flex flex-col items-center flex-1 h-full justify-end">
                        <span class="text-xs font-black text-amber-500 mb-2">${leadsTibios}</span>
                        <div class="w-full bg-amber-500 rounded-t-lg transition-all duration-1000" style="height: ${porcTibio}%;"></div>
                        <span class="text-[10px] font-bold uppercase text-neutral-500 mt-2">Tibios</span>
                    </div>
                    <div class="flex flex-col items-center flex-1 h-full justify-end">
                        <span class="text-xs font-black text-rose-500 mb-2">${leadsCalientes}</span>
                        <div class="w-full bg-rose-500 rounded-t-lg transition-all duration-1000" style="height: ${porcCaliente}%;"></div>
                        <span class="text-[10px] font-bold uppercase text-neutral-500 mt-2">Calientes</span>
                    </div>
                </div>

                <div class="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 p-4 rounded-2xl flex justify-between items-center">
                    <div>
                        <p class="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 tracking-widest">Total en Base de Datos</p>
                        <p class="font-black text-2xl text-blue-800 dark:text-blue-300">${totalLeads} Clientes</p>
                    </div>
                    <i data-lucide="database" class="w-8 h-8 text-blue-300 dark:text-blue-700 opacity-50"></i>
                </div>
            </div>

        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div class="lg:col-span-2 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h4 class="font-black text-lg uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center">
                            <i data-lucide="eye" class="w-5 h-5 mr-2 text-purple-500"></i> Auditoría de Seguimiento CRM
                        </h4>
                        <p class="text-xs font-bold text-neutral-500 mt-1">Evalúa si los vendedores están contactando a los leads asignados.</p>
                    </div>
                    <i data-lucide="info" class="w-4 h-4 cursor-help text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors" title="Muestra el total de clientes de cada vendedor, a cuántos le generaron una Alerta de Próximo Contacto (Agenda), y a cuántos NO llamaron en la fecha acordada (Atrasados)."></i>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="text-[10px] uppercase tracking-widest text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30">
                                <th class="px-4 py-3 font-bold rounded-tl-xl">Vendedor</th>
                                <th class="px-4 py-3 font-bold text-center">Clientes Totales</th>
                                <th class="px-4 py-3 font-bold text-center">Con Agenda Futura</th>
                                <th class="px-4 py-3 font-bold text-center rounded-tr-xl">Alertas Atrasadas</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800/50">
    `;

    if (auditVendedores.length === 0) {
        html += `<tr><td colspan="4" class="text-center py-6 text-neutral-500 text-sm font-bold italic">No hay vendedores para evaluar.</td></tr>`;
    } else {
        auditVendedores.forEach(a => {
            const atrasoClass = a.atrasados > 0 
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-black px-2 py-1 rounded-lg' 
                : 'text-neutral-400 font-bold';
                
            html += `
                <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td class="px-4 py-3">
                        <p class="font-black text-sm text-neutral-800 dark:text-neutral-200">${a.nombre}</p>
                        <p class="text-[10px] text-neutral-500 uppercase font-bold">${a.rol}</p>
                    </td>
                    <td class="px-4 py-3 text-center font-black text-neutral-600 dark:text-neutral-400">${a.totalLeads}</td>
                    <td class="px-4 py-3 text-center font-black text-amber-600 dark:text-amber-500">${a.agendados}</td>
                    <td class="px-4 py-3 text-center"><span class="${atrasoClass}">${a.atrasados}</span></td>
                </tr>
            `;
        });
    }

    html += `
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="lg:col-span-1 flex flex-col space-y-6">
                
                <div class="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 p-6 rounded-3xl shadow-sm flex-1">
                    <div class="flex justify-between items-start mb-4">
                        <h4 class="font-black text-sm uppercase tracking-wider text-neutral-800 dark:text-neutral-200 flex items-center">
                            <i data-lucide="target" class="w-4 h-4 mr-2 text-indigo-500"></i> Eficacia Mensual
                        </h4>
                        <i data-lucide="info" class="w-4 h-4 cursor-help text-neutral-400 hover:text-neutral-800 dark:hover:text-white transition-colors" title="Cálculo: (Ventas cerradas en el mes / Nuevos leads creados en el mes) * 100. Te dice qué tan efectivos son para cerrar los nuevos interesados que entran."></i>
                    </div>
                    
                    <div class="flex items-center justify-between mb-4">
                        <div class="text-center">
                            <p class="text-xs font-bold text-neutral-500 uppercase tracking-widest">Nuevos Leads</p>
                            <p class="text-2xl font-black text-neutral-800 dark:text-neutral-200">${leadsMes.length}</p>
                        </div>
                        <i data-lucide="arrow-right" class="w-5 h-5 text-neutral-300 dark:text-neutral-700"></i>
                        <div class="text-center">
                            <p class="text-xs font-bold text-neutral-500 uppercase tracking-widest">Ventas</p>
                            <p class="text-2xl font-black text-neutral-800 dark:text-neutral-200">${cantidadVentasMes}</p>
                        </div>
                    </div>
                    
                    <div class="bg-indigo-50 dark:bg-indigo-900/10 rounded-xl p-3 text-center border border-indigo-100 dark:border-indigo-800">
                        <p class="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Tasa de Conversión</p>
                        <p class="text-3xl font-black text-indigo-600 dark:text-indigo-400">${conversionRate}%</p>
                    </div>
                </div>

                <div class="bg-black text-white dark:bg-white dark:text-black p-6 rounded-3xl shadow-xl flex-1 relative overflow-hidden">
                    <div class="absolute -right-4 top-4 opacity-10"><i data-lucide="scale" class="w-24 h-24"></i></div>
                    <div class="flex justify-between items-start mb-4 relative z-10">
                        <h4 class="font-black text-sm uppercase tracking-wider flex items-center">
                            Flujo Real (Mes)
                        </h4>
                        <i data-lucide="info" class="w-4 h-4 cursor-help opacity-50 hover:opacity-100 transition-opacity" title="A diferencia de 'Lo Operado', esto suma el efectivo o transferencias reales que ingresaron a Caja Chica vs los egresos, dándote el flujo de dinero líquido del mes."></i>
                    </div>
                    
                    <div class="space-y-3 relative z-10">
                        <div class="flex justify-between items-center border-b border-neutral-800 dark:border-neutral-200 pb-2">
                            <span class="text-xs font-bold opacity-70">Ingresos:</span>
                            <span class="font-black text-green-400 dark:text-green-600">+ ${window.formatMoney(ingresosCajaMes)}</span>
                        </div>
                        <div class="flex justify-between items-center border-b border-neutral-800 dark:border-neutral-200 pb-2">
                            <span class="text-xs font-bold opacity-70">Egresos:</span>
                            <span class="font-black text-rose-400 dark:text-rose-600">- ${window.formatMoney(totalGastosMes)}</span>
                        </div>
                        <div class="flex justify-between items-center pt-2">
                            <span class="text-xs font-black uppercase tracking-widest">Balance:</span>
                            <span class="font-black text-xl ${balanceCajaMes >= 0 ? 'text-white dark:text-black' : 'text-rose-400 dark:text-rose-600'}">
                                ${window.formatMoney(balanceCajaMes)}
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    `;

    container.innerHTML = html;

    if (window.lucide) {
        window.lucide.createIcons();
    }
};

// --------------------------------------------------------
// RENDERIZADO DEL PANEL DE ADMINISTRACIÓN (USUARIOS Y SUCURSALES)
// --------------------------------------------------------
window.renderAdminView = () => {
    // Seguridad: Solo Admins
    if (window.state.currentUser?.rol !== 'Admin') {
        return;
    }
    
    // 1. Llenar Select de Sucursales en el formulario de creación de usuario
    const selectSuc = document.getElementById('new-user-suc');
    if (selectSuc) {
        selectSuc.innerHTML = window.state.sucursales.map(s => 
            `<option value="${s.id}">${s.nombre}</option>`
        ).join('');
    }

    // 2. Llenar la Lista de Usuarios del Sistema
    const usersList = document.getElementById('admin-users-list');
    if (usersList) {
        usersList.innerHTML = window.state.usuarios.map(u => {
            const suc = window.state.sucursales.find(s => s.id == u.sucursalId)?.nombre || 'Sin Asignar';
            return `
                <div class="flex justify-between items-center p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm hover:border-green-300 dark:hover:border-green-700 transition-colors">
                    <div>
                        <p class="font-black text-sm text-neutral-800 dark:text-neutral-100">${u.nombre}</p>
                        <p class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-0.5">${u.rol} • ${suc}</p>
                    </div>
                    <div class="flex space-x-1">
                        <button onclick="window.editUser('${u.id}')" class="p-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-lg hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar">
                            <i data-lucide="edit" class="w-4 h-4"></i>
                        </button>
                        <button onclick="window.deleteUser('${u.id}')" class="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors" title="Eliminar">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 3. Llenar la Lista de Sucursales
    const sucList = document.getElementById('admin-suc-list');
    if (sucList) {
        sucList.innerHTML = window.state.sucursales.map(s => `
            <div class="flex justify-between items-center p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-sm hover:border-green-300 dark:hover:border-green-700 transition-colors">
                <p class="font-black text-sm text-neutral-800 dark:text-neutral-100">${s.nombre}</p>
                <div class="flex space-x-1">
                    <button onclick="window.editSucursal('${s.id}')" class="p-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-lg hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>
                    <button onclick="window.deleteSucursal('${s.id}')" class="p-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors" title="Eliminar">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    if(window.lucide) {
        window.lucide.createIcons();
    }
};
