// ==========================================
// js/render/renderFacturas.js
// ==========================================

window.renderFacturasView = () => { 
  if (window.state.currentUser?.rol !== 'Admin') return; 
  
  const facturas = (window.state.transacciones || []).filter(t => ['A','B','C'].includes(t.tipoComprobante)); 
  const totalEmitido = facturas.reduce((a,c) => a + c.valor, 0); 
  const factA = facturas.filter(f => f.tipoComprobante === 'A');
    const factBC = facturas.filter(f => f.tipoComprobante === 'B' || f.tipoComprobante === 'C');
    const totalIva = factA.reduce((a,c) => a + (Number(c.iva) || 0), 0);
    const totalNetoA = factA.reduce((a,c) => a + (Number(c.valor) || 0) - (Number(c.iva) || 0), 0);
    const totalBC = factBC.reduce((a,c) => a + (Number(c.valor) || 0), 0);
    const totalB = factBC.filter(f => f.tipoComprobante === 'B').reduce((a,c) => a + (Number(c.valor) || 0), 0);
    const totalC = factBC.filter(f => f.tipoComprobante === 'C').reduce((a,c) => a + (Number(c.valor) || 0), 0); 
  
  const fs = document.getElementById('facturas-summary');
  if (fs) {
    fs.innerHTML = `
      <div class="p-8 bg-black dark:bg-neutral-800 rounded-3xl text-white shadow-xl border border-neutral-800 dark:border-neutral-700">
        <p class="text-neutral-400 text-sm font-bold uppercase tracking-wider mb-2">Monto Facturado (Global)</p>
        <p class="text-5xl font-black">${window.formatMoney(totalEmitido)}</p>
      </div>
      <div class="p-8 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <p class="text-neutral-500 dark:text-neutral-400 text-sm font-bold uppercase tracking-wider mb-2">IVA contenido en facturas A (21%)</p>
        <p class="text-5xl font-black text-neutral-900 dark:text-white">${window.formatMoney(totalIva)}
<p class="text-xs mt-3 opacity-70">Neto A: ${window.formatMoney(totalNetoA)} · B: ${window.formatMoney(totalB)} · C: ${window.formatMoney(totalC)} (sin IVA discriminado)</p></p>
      </div>
    `; 
  }
  
  const table = document.getElementById('facturas-table'); 
  if (!table) return;
  
  if (facturas.length === 0) { 
    table.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-8 text-neutral-500 font-bold">
          No hay facturas registradas en el sistema.
        </td>
      </tr>
    `; 
  } else { 
    table.innerHTML = facturas.slice().reverse().map(f => { 
      const u = window.state.usuarios.find(x => x.id === f.userId); 
      return `
        <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
          <td class="px-6 py-4">
            <span class="inline-block bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 font-bold text-[10px] uppercase px-2 py-1 rounded mb-1">
              Tipo ${f.tipoComprobante}
            </span>
            <p class="font-mono text-sm font-bold">${f.numComprobante || 'S/N'}</p>
          </td>
          <td class="px-6 py-4 text-sm text-neutral-500">${window.formatDate(f.fecha)}</td>
          <td class="px-6 py-4">
            <p class="font-bold">${f.descripcion}</p>
            <p class="text-xs text-neutral-400 mt-1">Por: ${u ? u.nombre : '-'}</p>
          </td>
          <td class="px-6 py-4 text-right font-black text-lg">${window.formatMoney(f.valor)}</td>
          <td class="px-6 py-4 text-center">
            ${f.tipoComprobante === 'A' ? `
              <button onclick="window.openDetalleFactura('${f.id}')" class="text-xs font-bold uppercase tracking-wider bg-black text-white dark:bg-neutral-700 px-4 py-2 rounded-xl hover:bg-neutral-800 transition-colors">
                Ver Detalle
              </button>
            ` : `
              <span class="text-neutral-300 dark:text-neutral-700">-</span>
            `}
          </td>
        </tr>
      `; 
    }).join(''); 
  } 
};

window.openDetalleFactura = (id) => { 
  const t = window.state.transacciones.find(x => x.id === id); 
  if (!t) return;
  const subtotal = t.valor - (t.iva || 0); 
  
  document.getElementById('factura-detail-content').innerHTML = `
    <div class="text-center mb-8">
      <div class="w-16 h-16 bg-black text-white flex items-center justify-center text-3xl font-black mx-auto mb-3 rounded-2xl shadow-md border border-neutral-800">A</div>
      <p class="font-mono text-neutral-500 font-bold">${t.numComprobante}</p>
    </div>
    <div class="space-y-4 mb-8">
      <div class="flex justify-between text-sm">
        <span class="text-neutral-500 font-bold uppercase tracking-wider">Fecha:</span> 
        <span class="font-bold">${window.formatDate(t.fecha)}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-neutral-500 font-bold uppercase tracking-wider">Operación:</span> 
        <span class="font-bold text-right">${t.descripcion}</span>
      </div>
    </div>
    <div class="border-t border-neutral-200 dark:border-neutral-700 pt-6 space-y-3">
      <div class="flex justify-between text-sm">
        <span class="text-neutral-500 font-bold uppercase tracking-wider">Subtotal:</span> 
        <span class="font-bold text-lg">${window.formatMoney(subtotal)}</span>
      </div>
      <div class="flex justify-between text-sm">
        <span class="text-neutral-500 font-bold uppercase tracking-wider">IVA:</span> 
        <span class="font-bold text-lg">${window.formatMoney(t.iva)}</span>
      </div>
      <div class="flex justify-between text-xl mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <span class="font-black uppercase tracking-wider">Total:</span> 
        <span class="font-black text-2xl text-green-600 dark:text-green-500">${window.formatMoney(t.valor)}</span>
      </div>
    </div>
  `; 
  window.openModal('modal-detalle-factura'); 
};
