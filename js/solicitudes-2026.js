/* Martinelli Autos - Mejoras preparadas en rama de prueba, nov. 2026 */
(() => {
  const $ = id => document.getElementById(id);
  const normalizar = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const telefono = v => {
    let n = String(v || '').replace(/\D/g, '');
    if (n.startsWith('00')) n = n.slice(2);
    if (n.startsWith('549')) n = n.slice(3);
    else if (n.startsWith('54')) n = n.slice(2);
    if (n.startsWith('0')) n = n.slice(1);
    // Se admite formato argentino 03446 15 123456, +54 9 3446 123456, o 3446 123456.
    n = n.replace(/^(\d{2,4})15(?=\d{6,8}$)/, '$1');
    if (n.startsWith('15') && n.length > 10) n = n.slice(2);
    return n;
  };
  window.normalizarTelefonoCRM = telefono;
  window.whatsappCliente = v => {
    const n = telefono(v);
    return n.length >= 9 ? 'https://wa.me/549' + n : '';
  };
  window.validarInstagramUrl = value => {
    const val = String(value || '').trim();
    if (!val) return '';
    try {
      const u = new URL(val);
      if (u.protocol !== 'https:' || !['instagram.com','www.instagram.com','m.instagram.com'].includes(u.hostname)) {
        throw new Error('Dominio no admitido');
      }
      return u.href;
    } catch (_) {
      throw new Error('El enlace debe ser una URL https://www.instagram.com/... válida.');
    }
  };
  window.instagramLinkAuto = auto => {
    let url = '';
    try { url = window.validarInstagramUrl(auto?.instagramUrl || auto?.linkInstagram || ''); } catch (_) { return ''; }
    if (!url) return '';
    // SVG fijo: no depende de Lucide ni de los estilos de la tarjeta/modal.
    return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" '
      + 'style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;'
      + 'background:#fff;color:#111;border:1px solid #d4d4d8;border-radius:10px;flex-shrink:0" '
      + 'title="Ver publicación de Instagram" aria-label="Abrir publicación de Instagram">'
      + '<svg xmlns="http://www.w3.org/2000/svg" width="21" height="21" viewBox="0 0 24 24" '
      + 'fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '
      + 'aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/>'
      + '<circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#111" stroke="none"/></svg></a>';
  };
  window.fechaLocalHoy = () => {
    const d = new Date();
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  };
  window.abrirFormularioCliente = (autoId = '') => {
    const form = $('form-cliente-unificado');
    form?.reset();
    const sel = $('gl-auto');
    if (sel) {
      sel.innerHTML = '<option value="">Sin vehículo asociado</option>';
      (window.state?.autos || []).filter(a => a.estado !== 'Vendido').forEach(a => {
        const o = document.createElement('option');
        o.value = a.id; o.textContent = a.marca + ' ' + a.modelo + ' · ' + (a.patente || '');
        sel.appendChild(o);
      });
      if (autoId) sel.value = autoId;
    }
    if (autoId) {
      const a = (window.state?.autos || []).find(a => a.id === autoId);
      if (a && $('gl-interes')) $('gl-interes').value = a.marca + ' ' + a.modelo;
      window.closeModal?.('modal-detalle-auto');
    }
    const aviso = $('gl-duplicado-aviso');
    aviso?.classList.add('hidden');
    $('gl-whatsapp')?.classList.add('hidden');
    window.openModal?.('modal-nuevo-lead');
    window.lucide?.createIcons();
  };
  window.actualizarContactoCliente = () => {
    const a = $('gl-whatsapp');
    if (a) {
      const href = window.whatsappCliente($('gl-tel')?.value);
      a.classList.toggle('hidden', !href);
      if (href) a.href = href;
    }
    window.verificarDuplicadoCliente?.();
  };
  window.verificarDuplicadoCliente = () => {
    const nombre = normalizar($('gl-nombre')?.value);
    const tel = telefono($('gl-tel')?.value);
    const u = window.state?.currentUser?.id;
    const matches = (window.state?.consultas || []).filter(c =>
      (tel.length >= 9 && telefono(c.telefono) === tel) ||
      (nombre.length >= 6 && normalizar(c.nombre) === nombre)
    );
    const mismoTel = matches.find(c => tel.length >= 9 && telefono(c.telefono) === tel);
    const otraCartera = matches.some(c => c.userId && c.userId !== u);
    const aviso = $('gl-duplicado-aviso');
    if (aviso) {
      aviso.classList.toggle('hidden', !matches.length);
      aviso.textContent = matches.length ? (otraCartera
        ? 'Atención: estos datos ya figuran en la cartera de otro vendedor. Evitá duplicar el contacto.'
        : mismoTel ? 'Este teléfono ya figura en el CRM.' : 'Hay un cliente con el mismo nombre. Verificá si es la misma persona.') : '';
    }
    return matches;
  };
  window.comprobarClienteExistente = async (nombre, numero, excluirId = null) => {
    const cel = telefono(numero);
    const n = normalizar(nombre);
    const duplicado = (window.state?.consultas || []).find(c => c.id !== excluirId && (
      (cel.length >= 9 && telefono(c.telefono) === cel) ||
      (n.length >= 6 && normalizar(c.nombre) === n && !cel)
    ));
    if (!duplicado) return false;
    alert(duplicado.userId !== window.state.currentUser.id
      ? 'Este cliente ya está registrado en la cartera de otro vendedor. Consultá con administración para evitar superponer gestiones.'
      : 'Este contacto ya existe en tu CRM. Abrí su ficha para agregar seguimiento.');
    return true;
  };
  // Solo coincidencias útiles: modelo completo o marca y modelo presentes.
  window.coincidenciasClientesFlota = (cliente, autos = window.state?.autos || []) => {
    if (!cliente || cliente.estadoLead === 'Vendido') return [];
    const texto = ' ' + normalizar([cliente.marcaInteres,cliente.notas,
      ...(cliente.historial || []).map(h => h.texto)].join(' ')) + ' ';
    return autos.filter(auto => {
      if (!auto || auto.estado === 'Vendido') return false;
      if (cliente.autoId === auto.id) return true;
      const marca = normalizar(auto.marca), modelo = normalizar(auto.modelo);
      const modelTokens = modelo.split(' ').filter(t => t.length >= 3 && !['manual','automatico','sedan','hatchback','full','base'].includes(t));
      const hayMarca = !!(marca && texto.includes(' ' + marca + ' '));
      const modelos = modelTokens.filter(token => texto.includes(' ' + token + ' '));
      return modelos.length > 0 && (hayMarca || modelos.some(t => t.length >= 5));
    });
  };
  window.elegirTipoCaja = (tipo) => {
    const gasto = tipo === 'gasto';
    const input = document.getElementById('caja-tipo');
    if (input) input.value = gasto ? 'gasto' : 'ingreso';
    const modal = document.getElementById('modal-caja');
    if (modal) modal.dataset.tipo = gasto ? 'gasto' : 'ingreso';
    const radios = document.querySelectorAll('input[name="caja-tipo-visual"]');
    radios.forEach(radio => { radio.checked = radio.value === (gasto ? 'gasto' : 'ingreso'); });
    for (const [id,active,color] of [
      ['caja-label-ingreso',!gasto,'green'],
      ['caja-label-gasto',gasto,'red']
    ]) {
      const el=document.getElementById(id);
      if(!el)continue;
      el.style.borderColor=active ? (color==='green'?'#16a34a':'#dc2626'):'#d4d4d8';
      el.style.backgroundColor=active ? (color==='green'?'#dcfce7':'#fee2e2'):'transparent';
      el.style.color=active ? (color==='green'?'#166534':'#991b1b'):'';
    }
  };
  window.actualizarFacturaCaja = () => {
    const activo = !!$('caja-facturada')?.checked, tipo = $('caja-comprobante');
    $('caja-factura-campos')?.classList.toggle('hidden', !activo);
    if (tipo && !['A','B','C'].includes(tipo.value)) tipo.value = 'A';
    const esA = activo && tipo?.value === 'A';
    $('caja-iva-container')?.classList.toggle('hidden', !esA);
    const iva = $('caja-iva');
    if (iva) {
      const total = Number(($('caja-monto')?.value || '').replace(/\D/g, '')) || 0;
      iva.value = esA && total ? String(Math.round(total * 21 / 121)) : '';
      iva.readOnly = true;
      iva.required = false;
    }
  };
  // Avisa oportunidades en la campanita, únicamente en la cartera visible.
  const previo = window.updateNotifications;
  window.updateNotifications = () => {
    previo?.();
    if (!window.state?.currentUser) return;
    const u = window.state.currentUser;
    const visibles = (window.state.consultas || []).filter(c => u.rol === 'Admin' ||
      c.userId === u.id || (u.rol === 'Encargado' && c.sucursalId === u.sucursalId));
    const oportunidades = visibles.flatMap(c => window.coincidenciasClientesFlota(c).map(a => ({c,a})));
    const badge = $('notif-badge'), list = $('notif-list');
    if (!list) return;
    if (oportunidades.length) {
      badge?.classList.remove('hidden');
      const html = oportunidades.slice(0,15).map(({c,a}) => {
        const cc = encodeURIComponent(c.id);
        return '<button type="button" onclick="window.openDetalleLead(decodeURIComponent(\'' + cc +
        '\'))" class="block w-full text-left px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20">' +
          '<span class="text-xs font-black text-indigo-600">Coincidencia con la flota</span>' +
          '<span class="block text-sm font-bold">' + c.nombre.replace(/[&<>"]/g, '') + '</span>' +
          '<span class="block text-xs text-neutral-500">Busca ' + a.marca.replace(/[&<>"]/g,'') + ' ' +
          a.modelo.replace(/[&<>"]/g,'') + '</span></button>';
      }).join('');
      list.insertAdjacentHTML('afterbegin',html);
    }
  };
})();
