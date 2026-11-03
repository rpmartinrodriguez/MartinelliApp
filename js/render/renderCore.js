// ==========================================
// js/render/renderCore.js
// ==========================================

window.renderAllViews = () => { 
  if(!window.state.currentUser) return; 
  
  try { if(window.renderDolarWidget) window.renderDolarWidget(); } catch(e) { console.error("Error Dólar:", e); }
  try { if(window.renderCajaView) window.renderCajaView(); } catch(e) { console.error("Error Caja:", e); }
  try { if(window.renderVentasView) window.renderVentasView(); } catch(e) { console.error("Error Ventas:", e); }
  try { if(window.renderFacturasView) window.renderFacturasView(); } catch(e) { console.error("Error Facturas:", e); }
  try { if(window.renderAutosView) window.renderAutosView(); } catch(e) { console.error("Error Autos:", e); }
  try { if(window.renderClientesView) window.renderClientesView(); } catch(e) { console.error("Error CRM:", e); }
  try { if(window.renderFormulariosView) window.renderFormulariosView(); } catch(e) { console.error("Error Formularios:", e); }
  try { if(window.renderPersonalView) window.renderPersonalView(); } catch(e) { console.error("Error Personal:", e); }
  try { if(window.renderResumenesView) window.renderResumenesView(); } catch(e) { console.error("Error Resúmenes:", e); }
  try { if(window.renderAdminView) window.renderAdminView(); } catch(e) { console.error("Error Admin:", e); }
  
  try { if(window.checkNotifications) window.checkNotifications(); } catch(e) {}
  if(window.lucide) window.lucide.createIcons(); 
};

window.initSelects = () => { 
  const elCat = document.getElementById('caja-cat');
  if (elCat) {
    elCat.innerHTML = (window.state.categoriasGasto || [])
      .slice()
      .sort((a, b) => String(a || '').localeCompare(String(b || '')))
      .map(c => `<option value="${c}">${c}</option>`)
      .join(''); 
  }
  
  const elSuc = document.getElementById('auto-sucursal');
  if (elSuc) {
    elSuc.innerHTML = (window.state.sucursales || [])
      .slice()
      .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || '')))
      .map(s => `<option value="${s.id}">${s.nombre}</option>`)
      .join(''); 
  }
  
  const elAuto = document.getElementById('caja-auto');
  if (elAuto) {
    elAuto.innerHTML = `<option value="">-- Gasto General de Agencia --</option>` + 
      (window.state.autos || [])
      .slice()
      .sort((a, b) => String(a.marca || '').localeCompare(String(b.marca || '')) || String(a.modelo || '').localeCompare(String(b.modelo || '')))
      .map(a => {
        const pFmt = a.moneda === 'USD' 
          ? 'U$S ' + window.formatMoney(a.precio).replace(/[^0-9.,]/g, '').trim() 
          : window.formatMoney(a.precio);
        return `<option value="${a.id}">${a.marca} ${a.modelo} (${a.patente}) - ${pFmt}</option>`;
      })
      .join(''); 
  }
  
  const elFecha = document.getElementById('caja-fecha');
  if (elFecha) {
    elFecha.value = new Date().toISOString().split('T')[0]; 
  }
};

window.checkNotifications = () => {
  if(!window.state.currentUser || window.state.currentUser.rol !== 'Admin') {
    const nc = document.getElementById('notif-container');
    // La campanita con alertas del CRM y push también corresponde a Vendedores/Encargados.
    if (nc) nc.classList.toggle('hidden', !window.state.currentUser);
    return;
  }
  
  const nc = document.getElementById('notif-container');
  if (nc) nc.classList.remove('hidden');
  
  const notifs = [];
  const today = new Date();
  
  (window.state.ventas || []).forEach(v => {
    const metodos = v.metodoPago || '';
    if (metodos.includes('Crédito') || metodos.includes('Pagaré')) {
      const cuotasT = v.cuotasTotales || 0;
      const cuotasP = v.cuotasPagadas || 0;
      const pendientes = cuotasT - cuotasP;
      
      if (pendientes <= 0) return; 
      
      const fechaFin = new Date(v.fecha + 'T00:00:00');
      fechaFin.setMonth(fechaFin.getMonth() + cuotasT);
      
      const diffDays = Math.ceil((fechaFin - today) / (1000 * 60 * 60 * 24));

      if (diffDays <= 60 && diffDays > 20) {
        notifs.push({ v, msg: 'Aprox. 2 meses para finalizar.', days: diffDays });
      } else if (diffDays <= 20 && diffDays >= 0) {
        notifs.push({ v, msg: '¡Menos de 20 días para terminar!', days: diffDays });
      }
    }
  });
  
  const badge = document.getElementById('notif-badge');
  const list = document.getElementById('notif-list');
  
  if (!badge || !list) return;

  if (notifs.length > 0) {
    badge.classList.remove('hidden');
    list.innerHTML = notifs.map(n => `
      <div class="p-4 border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
        <p class="font-bold text-sm">${n.v.compradorNombre || 'Sin Nombre'}</p>
        <p class="text-xs text-neutral-500 mb-3">${n.v.autoDesc || '-'} • <span class="text-amber-600 dark:text-amber-400 font-bold">${n.msg}</span></p>
        <a href="${window.formatWhatsAppLink(n.v.compradorTelefono || '', '')}" target="_blank" class="text-[10px] font-bold uppercase text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded flex w-fit items-center hover:bg-green-100 transition">
          <i data-lucide="message-circle" class="w-3.5 h-3.5 mr-1.5"></i> Ofrecer Recompra
        </a>
      </div>
    `).join('');
  } else {
    badge.classList.add('hidden');
    list.innerHTML = `
      <div class="p-6 text-center text-sm text-neutral-500">
        No hay alertas de recompra en este momento.
      </div>
    `;
  }
};
