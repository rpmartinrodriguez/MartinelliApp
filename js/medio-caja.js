/* Clasificación de los movimientos de Caja sin cambiar importes históricos. */
(() => {
  // Movimientos previos sin medioPago se mantienen en efectivo de forma provisional,
  // excepto las transferencias de venta que quedaron identificadas explícitamente.
  window.medioPagoMovimientoCaja = t => {
    if (t?.medioPago === 'transferencia') return 'transferencia';
    if (t?.medioPago === 'efectivo') return 'efectivo';
    if (/^Entrega Venta \(Transf a /i.test(String(t?.descripcion || ''))) return 'transferencia';
    return 'efectivo';
  };
  window.medioCajaPendienteClasificacion = t =>
    !['efectivo','transferencia'].includes(t?.medioPago) &&
    !/^Entrega Venta \(Transf a /i.test(String(t?.descripcion || ''));

  window.elegirMedioCaja = medio => {
    const valor = medio === 'transferencia' ? 'transferencia' : 'efectivo';
    const input = document.getElementById('caja-medio');
    if(input) input.value = valor;
    document.querySelectorAll('input[name="caja-medio-visual"]').forEach(radio => {
      radio.checked = radio.value === valor;
    });
    for (const [id,activo] of [['caja-label-efectivo',valor === 'efectivo'],
                               ['caja-label-transferencia',valor === 'transferencia']]){
      const label = document.getElementById(id);
      if(!label) continue;
      label.style.borderColor = activo ? '#16a34a' : '#d4d4d8';
      label.style.backgroundColor = activo ? '#dcfce7' : 'transparent';
      label.style.color = activo ? '#166534' : '';
    }
  };
  window.seleccionarCajaUsuario = id => {
    window.state.cajaFiltroUsuario = String(id || '');
    window.renderCajaView?.();
  };
  window.filtrarMedioCaja = medio => {
    window.state.cajaFiltroMedio = ['efectivo','transferencia'].includes(medio) ? medio : 'todos';
    window.renderCajaView?.();
  };
})();
