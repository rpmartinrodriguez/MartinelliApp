// ==========================================
// js/controllers.js
// ==========================================

// --------------------------------------------------------
// 1. PERSISTENCIA Y UTILIDADES
// --------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    const savedView = localStorage.getItem('autosViewMode');
    if (savedView && window.state) {
        window.state.autosViewMode = savedView;
    }
});

window.setBtnLoader = (btn, isLoading) => {
    if (!btn) return;

    if (isLoading) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto"></i>';
        btn.disabled = true;
        btn.classList.add('opacity-75', 'cursor-not-allowed');
    } else {
        btn.innerHTML = btn.dataset.originalHtml || 'Guardar';
        btn.disabled = false;
        btn.classList.remove('opacity-75', 'cursor-not-allowed');
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
};

window.formatInputMoney = (input) => {
    let val = input.value.replace(/[^0-9]/g, '');
    if (val) {
        val = parseInt(val, 10);
        input.value = new Intl.NumberFormat('es-AR').format(val);
    }
};

// --------------------------------------------------------
// 2. ALGORITMO INTELIGENTE DE CRM (LEAD SCORING)
// --------------------------------------------------------

window.calcularTermometroLead = (lead) => {
    if (!lead) return { score: 0, estado: 'Frío', diasAntiguedad: 0 };
    // El estado se determina exclusivamente por la fecha original, no por el
    // número de llamadas, comentarios ni por la actividad del vendedor.
    const fecha = String(lead.fecha || '').slice(0, 10);
    const hoy = new Date();
    const diaActual = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const parts = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha.split('-').map(Number) : null;
    const diaAlta = parts ? Date.UTC(parts[0], parts[1] - 1, parts[2]) : diaActual;
    const diasAntiguedad = Math.max(0, Math.floor((diaActual - diaAlta) / 86400000));
    const estado = diasAntiguedad <= 7 ? 'Caliente' : diasAntiguedad <= 15 ? 'Tibio' : 'Frío';
    // Puntaje visual coherente con la clasificación por edad.
    const score = estado === 'Caliente' ? 90 : estado === 'Tibio' ? 55 : 20;
    return { score, estado, diasAntiguedad };
};

// --------------------------------------------------------
// 3. CONTROLADORES DE FLOTA Y AUTOS
// --------------------------------------------------------

window.openModalCreateAuto = () => { 
    window.state.editingAutoId = null; 
    document.getElementById('form-auto').reset(); 
    document.getElementById('modal-auto-title').innerText = "Alta Vehículo"; 
    window.openModal('modal-auto'); 
};

window.editAuto = (id) => { 
    const auto = window.state.autos.find(x => x.id === id); 
    window.state.editingAutoId = id; 
    
    document.getElementById('auto-marca').value = auto.marca; 
    document.getElementById('auto-modelo').value = auto.modelo; 
    document.getElementById('auto-color').value = auto.color || ''; 
    document.getElementById('auto-km').value = auto.km ? new Intl.NumberFormat('es-AR').format(auto.km) : ''; 
    document.getElementById('auto-anio').value = auto.año; 
    document.getElementById('auto-patente').value = auto.patente;
    document.getElementById('auto-instagram').value = auto.instagramUrl || ''; 
    document.getElementById('auto-precio').value = window.formatMoney(auto.precio).replace(/[^0-9]/g, ''); 
    document.getElementById('auto-costo').value = window.formatMoney(auto.costo || 0).replace(/[^0-9]/g, ''); 
    document.getElementById('auto-condicion').value = auto.condicion || 'Propio'; 
    document.getElementById('auto-sucursal').value = auto.sucursalId; 
    
    if (document.getElementById('auto-moneda')) {
        document.getElementById('auto-moneda').value = auto.moneda || 'ARS';
    }
    
    document.getElementById('modal-auto-title').innerText = "Editar Vehículo"; 
    
    window.closeModal('modal-detalle-auto'); 
    window.openModal('modal-auto'); 
};

window.deleteAuto = async (id) => { 
    if (confirm('¿Estás seguro de eliminar este vehículo de manera permanente? Esta acción no se puede deshacer.')) { 
        await window.fbDelete("autos", id); 
        window.closeModal('modal-detalle-auto'); 
    } 
};

window.handleAutoSubmit = async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    const btn = e.submitter || document.getElementById('modal-auto-submit');

    if (window.state.isSubmittingAuto || (btn && btn.disabled)) {
        return; 
    }
    
    window.state.isSubmittingAuto = true;
    
    if (btn) {
        window.setBtnLoader(btn, true);
    }
    
    try {
        const objAuto = { 
            marca: document.getElementById('auto-marca').value.toUpperCase(), 
            modelo: document.getElementById('auto-modelo').value.toUpperCase(), 
            color: document.getElementById('auto-color').value.toUpperCase(), 
            km: Number(document.getElementById('auto-km').value.replace(/[^0-9]/g, '')), 
            año: Number(document.getElementById('auto-anio').value), 
            patente: document.getElementById('auto-patente').value.toUpperCase(),
            instagramUrl: window.validarInstagramUrl(document.getElementById('auto-instagram').value), 
            precio: Number(document.getElementById('auto-precio').value.replace(/[^0-9]/g, '')), 
            costo: Number(document.getElementById('auto-costo').value.replace(/[^0-9]/g, '')), 
            condicion: document.getElementById('auto-condicion').value, 
            sucursalId: document.getElementById('auto-sucursal').value,
            moneda: document.getElementById('auto-moneda') ? document.getElementById('auto-moneda').value : 'ARS'
        };
        
        if (window.state.editingAutoId) { 
            await window.fbUpdate("autos", window.state.editingAutoId, objAuto); 
        } else { 
            objAuto.estado = 'Disponible';
            objAuto.createdAt = Date.now();
            objAuto.gastos = [];
            objAuto.documentacion = { 
                c08: false, 
                verificacion: false, 
                libreDeuda: false, 
                vtv: '' 
            };
            await window.fbAdd("autos", objAuto); 
        }
        
        window.closeModal('modal-auto'); 
        e.target.reset(); 
        window.initSelects();
        
    } catch(error) {
        console.error("Error al guardar auto:", error);
        alert("Hubo un error al guardar. Por favor, revisa tu conexión a internet e inténtalo de nuevo.");
    } finally {
        window.state.isSubmittingAuto = false; 
        if (btn) {
            window.setBtnLoader(btn, false);
        }
    }
};

window.openDetalleAuto = (id) => { 
    window.state.selectedAutoId = id; 
    window.state.daActiveSection = 'info'; 
    window.state.isVentaMode = false; 
    window.state.ventaData.tienePermuta = false; 
    
    if (window.renderDetalleAuto) {
        window.renderDetalleAuto(); 
    }
    
    window.openModal('modal-detalle-auto'); 
};

window.switchDASection = (section) => { 
    window.state.daActiveSection = section; 
    
    if (window.renderDetalleAuto) {
        window.renderDetalleAuto(); 
    }
};

window.toggleEstadoAuto = async (autoId) => {
    const auto = window.state.autos.find(x => x.id === autoId);
    
    if (!auto) return;
    if (auto.estado === 'Vendido' || auto.estado === 'Señado') return; 
    
    const nuevoEstado = auto.estado === 'Disponible' ? 'A Ingresar' : 'Disponible';
    
    if (confirm(`¿Estás seguro de cambiar el estado de este vehículo a ${nuevoEstado}?`)) {
        try {
            await window.fbUpdate("autos", autoId, { estado: nuevoEstado });
            
            if (window.renderDetalleAuto) {
                window.renderDetalleAuto();
            }
            if (window.renderAutosView) {
                window.renderAutosView();
            }
        } catch(err) {
            console.error("Error al cambiar estado:", err);
        }
    }
};

window.handleGastoTallerSubmit = async (e, autoId) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    const btn = e.submitter || e.target.querySelector('button[type="submit"]') || e.target.querySelector('button');

    if (window.state.isSubmittingGastoTaller || (btn && btn.disabled)) {
        return;
    }
    
    window.state.isSubmittingGastoTaller = true;
    
    if (btn) {
        window.setBtnLoader(btn, true);
    }

    try {
        const auto = window.state.autos.find(x => x.id === autoId);
        const desc = document.getElementById('gt-desc').value;
        const monto = Number(document.getElementById('gt-monto').value.replace(/[^0-9]/g, ''));
        const cat = document.getElementById('gt-cat').value;
        const esFueraDeCaja = document.getElementById('gt-fuera-caja').checked;
        const fDate = new Date().toISOString().split('T')[0];
        
        const txUnicoId = window.generateId ? window.generateId() : Date.now().toString();

        const nuevoGasto = { 
            id: txUnicoId, 
            txId: txUnicoId,
            fecha: fDate, 
            descripcion: desc, 
            categoria: cat, 
            monto: monto, 
            fueraDeCaja: esFueraDeCaja 
        };
        
        const nuevosGastos = [...(auto.gastos || []), nuevoGasto];
        
        await window.fbUpdate("autos", autoId, { gastos: nuevosGastos });

        if (!esFueraDeCaja) {
            const dataTx = {
                userId: window.state.currentUser.id, 
                sucursalId: window.state.currentUser.sucursalId, 
                fecha: fDate, 
                tipo: 'gasto',
                descripcion: `Gasto Taller: ${auto.marca} ${auto.modelo} - ${desc}`, 
                categoria: cat, 
                valor: monto, 
                autoId: autoId,
                tipoComprobante: 'X', 
                numComprobante: '', 
                iva: 0, 
                estadoCobro: 'disponible'
            };
            
            await window.fbAdd("transacciones", dataTx);
        }
        
        if (window.renderDetalleAuto) {
            window.renderDetalleAuto();
        }
        
    } catch(err) {
        console.error("Error al guardar gasto de taller:", err);
    } finally {
        window.state.isSubmittingGastoTaller = false;
        
        if (btn) {
            window.setBtnLoader(btn, false);
        }
    }
};

window.toggleDoc = async (id, key) => { 
    const auto = window.state.autos.find(x => x.id === id); 
    const docs = auto.documentacion; 
    docs[key] = !docs[key]; 
    
    await window.fbUpdate("autos", id, { documentacion: docs }); 
    
    if (window.renderDetalleAuto) {
        window.renderDetalleAuto(); 
    }
};

window.openModalIngreso = (id) => {
    window.state.pendingIngresoAutoId = id; 
    document.getElementById('ingreso-precio').value = ''; 
    document.getElementById('ingreso-aviso-gastos').classList.add('hidden'); 
    document.getElementById('btn-ingreso-gastos').classList.add('hidden'); 
    
    window.closeModal('modal-detalle-auto'); 
    window.openModal('modal-ingreso-auto');
};

window.confirmarIngresoAuto = async (event) => { 
    const precio = Number(document.getElementById('ingreso-precio').value.replace(/[^0-9]/g, '')); 
    const btn = event?.submitter || event?.target || document.querySelector('#modal-ingreso-auto button.bg-black');
    
    if (window.state.isConfirmandoIngreso || (btn && btn.disabled)) {
        return; 
    }
    
    window.state.isConfirmandoIngreso = true;

    if (precio > 0) { 
        if (btn) {
            window.setBtnLoader(btn, true);
        }
        
        try {
            await window.fbUpdate("autos", window.state.pendingIngresoAutoId, { 
                estado: 'Disponible', 
                precio: precio 
            }); 
            
            document.getElementById('ingreso-aviso-gastos').classList.remove('hidden'); 
            document.getElementById('btn-ingreso-gastos').classList.remove('hidden'); 
        } catch(err) {
            console.error("Error al confirmar ingreso:", err);
        } finally {
            if (btn) {
                window.setBtnLoader(btn, false);
            }
            window.state.isConfirmandoIngreso = false;
        }
    } else { 
        alert("Debe establecer un precio mayor a 0 para el vehículo."); 
        window.state.isConfirmandoIngreso = false; 
    } 
};

window.abrirCajaParaGastos = () => { 
    window.closeModal('modal-ingreso-auto'); 
    window.switchTab('caja'); 
    window.openModalCaja(); 
    
    setTimeout(() => { 
        document.getElementById('caja-auto').value = window.state.pendingIngresoAutoId; 
        window.elegirTipoCaja('gasto'); 
    }, 500); 
};

window.openModalSeñado = (autoId) => {
    window.state.señaAutoId = autoId;
    document.getElementById('form-seña').reset();
    
    window.closeModal('modal-detalle-auto');
    window.openModal('modal-señado');
};

window.confirmarSeñado = async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    const btn = e.submitter || document.querySelector('#form-seña button[type="submit"]');

    if (window.state.isSubmittingSeña || (btn && btn.disabled)) {
        return;
    }
    
    window.state.isSubmittingSeña = true;
    
    if (btn) {
        window.setBtnLoader(btn, true);
    }

    try {
        const autoId = window.state.señaAutoId;
        const clNombre = document.getElementById('s-cliente-nombre').value;
        const clTel = document.getElementById('s-cliente-tel').value;
        
        await window.fbUpdate("autos", autoId, {
            estado: 'Señado', 
            señadoPorNombre: window.state.currentUser.nombre, 
            señadoPorUserId: window.state.currentUser.id,
            señadoClienteNombre: clNombre, 
            señadoClienteTel: clTel
        });

        window.closeModal('modal-señado');
        
        if (window.renderAutosView) {
            window.renderAutosView();
        }
    } catch(err) {
        console.error("Error al señar vehículo:", err);
    } finally {
        window.state.isSubmittingSeña = false;
        if (btn) {
            window.setBtnLoader(btn, false);
        }
    }
};

window.quitarSeña = async (autoId) => {
    if (confirm("¿Estás seguro de cancelar la seña? El auto volverá a estar 'Disponible' para todos.")) {
        try {
            await window.fbUpdate("autos", autoId, { 
                estado: 'Disponible', 
                señadoPorNombre: null, 
                señadoPorUserId: null, 
                señadoClienteNombre: null, 
                señadoClienteTel: null 
            });
            
            window.closeModal('modal-detalle-auto');
            
            if (window.renderAutosView) {
                window.renderAutosView();
            }
        } catch(err) {
            console.error("Error al quitar seña:", err);
        }
    }
};

// --------------------------------------------------------
// 4. VENTA Y TRANSACCIONES MAESTRAS (CON INTELIGENCIA CRM)
// --------------------------------------------------------

window.handleDAVentaSubmit = async (e, autoId) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    const btn = e.submitter || document.querySelector('#btn-submit-venta button');

    if (window.state.isSubmittingVenta || (btn && btn.disabled)) {
        return;
    }
    
    window.state.isSubmittingVenta = true;
    
    if (btn) {
        window.setBtnLoader(btn, true);
    }
    
    try {
        const auto = window.state.autos.find(x => x.id === autoId);
        const userQueRegistra = window.state.currentUser; 
        
        const adminUser = window.state.usuarios.find(u => u.rol === 'Admin') || userQueRegistra;
        
        // ==========================================
        // EXTRACCIÓN BLINDADA (Idéntica a formularios)
        // ==========================================
        const nombreComprador = document.getElementById('vent-comp-nombre')?.value || '';
        const telComprador = document.getElementById('vent-comp-tel')?.value || '';
        const dniComprador = document.getElementById('vent-comp-dni')?.value || '';
        const domComprador = document.getElementById('vent-comp-domicilio')?.value || '';
        const clienteCrmId = document.getElementById('vent-crm-cliente')?.value || '';
        const clienteCRM = clienteCrmId ? (window.state.consultas||[]).find(c=>c.id===clienteCrmId) : null;
        if(clienteCrmId && !clienteCRM)throw new Error('El cliente seleccionado ya no está disponible en el CRM.');
        if(clienteCRM && window.state.currentUser.rol!=='Admin' && clienteCRM.userId!==window.state.currentUser.id)
            throw new Error('Para asociar una venta solo podés seleccionar un cliente de tu propia cartera.');
        // No cerrar la ficha equivocada: ambos datos deben corresponder al cliente seleccionado.
        if(clienteCRM && (
            String(clienteCRM.nombre||'').trim().toLocaleLowerCase('es') !==
                nombreComprador.trim().toLocaleLowerCase('es') ||
            window.normalizarTelefonoCRM?.(clienteCRM.telefono) !==
                window.normalizarTelefonoCRM?.(telComprador)
        )) {
            throw new Error('El nombre o teléfono del comprador no coincide con el cliente seleccionado del CRM. Revisá la vinculación.');
        }

        const vEfectivo = document.getElementById('chk-efectivo')?.checked ? Number(document.getElementById('val-efectivo').value.replace(/[^0-9]/g, '')) : 0;
        const notaEfectivo = document.getElementById('nota-efectivo')?.value || 'Efectivo';
        
        const vTransferencia = document.getElementById('chk-transferencia')?.checked ? Number(document.getElementById('val-transferencia').value.replace(/[^0-9]/g, '')) : 0;
        const destTransferencia = document.getElementById('dest-transferencia')?.value || 'Transferencia';
        
        const vCredito = document.getElementById('chk-credito')?.checked ? Number(document.getElementById('val-credito').value.replace(/[^0-9]/g, '')) : 0;
        const cCredito = Number(document.getElementById('cuotas-credito')?.value || 0);
        const vPagare = document.getElementById('chk-pagare')?.checked ? Number(document.getElementById('val-pagare').value.replace(/[^0-9]/g, '')) : 0;
        const cPagare = Number(document.getElementById('cuotas-pagare')?.value || 0);
        
        const tienePermutaReal = document.getElementById('vent-hasperm')?.checked || false;
        
        // Datos del auto en permuta
        const pMarca = document.getElementById('p-marca')?.value || '';
        const pModelo = document.getElementById('p-modelo')?.value || '';
        const pAnio = document.getElementById('p-anio')?.value || '';
        const pPat = document.getElementById('p-pat')?.value || '';
        const vPermuta = tienePermutaReal ? Number(document.getElementById('p-valor').value.replace(/[^0-9]/g, '')) : 0;
        
        const sumatoriaPagos = vEfectivo + vTransferencia + vCredito + vPagare + vPermuta;
        
        if (sumatoriaPagos <= 0) {
            alert("Debes especificar al menos una forma de pago válida o tasación de permuta mayor a $0.");
            window.state.isSubmittingVenta = false;
            if (btn) window.setBtnLoader(btn, false);
            return;
        }

        const totalVentaOperacion = sumatoriaPagos > 0 ? sumatoriaPagos : auto.precio;
        const fDate = new Date().toISOString().split('T')[0];

        // --- CAJA ADMIN ---
        if (vEfectivo > 0) {
            await window.fbAdd("transacciones", {
                fecha: fDate, tipo: 'ingreso', valor: vEfectivo, categoria: 'Venta Vehículos',
                descripcion: `Entrega Venta (Efectivo): ${auto.marca} ${auto.modelo} (${notaEfectivo})`,
                userId: adminUser.id, sucursalId: adminUser.sucursalId, tipoComprobante: 'X', numComprobante: '', iva: 0, estadoCobro: 'disponible', fechaAcreditacion: null
            });
        }
        if (vTransferencia > 0) {
            await window.fbAdd("transacciones", {
                fecha: fDate, tipo: 'ingreso', valor: vTransferencia, categoria: 'Venta Vehículos',
                descripcion: `Entrega Venta (Transf a ${destTransferencia}): ${auto.marca} ${auto.modelo}`,
                userId: adminUser.id, sucursalId: adminUser.sucursalId, tipoComprobante: 'X', numComprobante: '', iva: 0, estadoCobro: 'disponible', fechaAcreditacion: null
            });
        }

        // --- OBJETOS DEUDA ---
        let objCredito = null;
        if (vCredito > 0 && cCredito > 0) objCredito = { montoTotal: vCredito, cuotas: cCredito, pagadas: 0, valorCuota: vCredito / cCredito };
        let objPagare = null;
        if (vPagare > 0 && cPagare > 0) objPagare = { montoTotal: vPagare, cuotas: cPagare, pagadas: 0, valorCuota: vPagare / cPagare };

        let metodosUsados = [];
        if (vEfectivo > 0) metodosUsados.push('Efectivo');
        if (vTransferencia > 0) metodosUsados.push('Transferencia');
        if (vCredito > 0) metodosUsados.push('Crédito');
        if (vPagare > 0) metodosUsados.push('Pagaré');
        if (vPermuta > 0) metodosUsados.push('Permuta');
        
        // --- HISTORIAL VENTAS ---
        const ventaRef = await window.fbAdd("ventas", {
            fecha: fDate, autoDesc: `${auto.marca} ${auto.modelo} (${auto.patente})`,
            autoId, clienteCrmId: clienteCrmId || null,
            precioListaOriginal: auto.precio, montoTotal: totalVentaOperacion, 
            desglose: { efectivo: vEfectivo, transferencia: vTransferencia, credito: vCredito, pagare: vPagare, permuta: vPermuta },
            compradorNombre: nombreComprador, compradorTelefono: telComprador, compradorDNI: dniComprador, compradorDomicilio: domComprador,
            metodoPago: metodosUsados.join(' + '), credito: objCredito, pagare: objPagare,
            userId: userQueRegistra.id, sucursalId: userQueRegistra.sucursalId,
            tienePermuta: tienePermutaReal,
            detallePermuta: tienePermutaReal ? `${pMarca} ${pModelo}` : null
        });

        // --- INGRESO AUTO PERMUTA ---
        if (tienePermutaReal) {
            await window.fbAdd("autos", { 
                marca: pMarca.toUpperCase(), 
                modelo: pModelo.toUpperCase(), 
                color: document.getElementById('p-color')?.value.toUpperCase() || '',
                km: Number(document.getElementById('p-km')?.value.replace(/[^0-9]/g, '') || 0), 
                año: Number(pAnio), 
                patente: pPat.toUpperCase(),
                precio: 0, costo: vPermuta, condicion: document.getElementById('p-condicion')?.value || 'Propio', 
                estado: 'A Ingresar', sucursalId: auto.sucursalId, gastos: [], documentacion: { c08: false, verificacion: false, libreDeuda: false, vtv: '' } 
            });
        }
        
        await window.fbUpdate("autos", autoId, { estado: 'Vendido' }); 
        
        // --- CIERRE CRM VINCULADO ---
        // La venta ya existe: cerrar solo al comprador seleccionado por ID.
        // No cerrar a todos los interesados en este auto ni buscar por nombre.
        if(clienteCRM) {
            try {
                await window.cerrarClienteCRM({
                    clienteId:clienteCRM.id,estado:'Vendido',autoId,
                    ventaId:ventaRef.id,fuente:'venta-flota',
                    motivo:`Compra de ${auto.marca} ${auto.modelo} (${auto.patente||''})`
                });
            }catch(crmErr) {
                console.error('Venta guardada; falló el cierre del cliente CRM:',crmErr);
                alert('La venta quedó registrada, pero no se pudo cerrar la ficha del CRM. Revisá la venta y completá el vínculo desde administración.');
            }
        }

        // =========================================================
        // 8. UNIFICADOR ESTRICTO DE BOLETOS (Formato Clave a Clave)
        // =========================================================
        const cuotasMax = Math.max(cCredito, cPagare);
        const tipoBoleto = tienePermutaReal ? 'Boleto Venta con Permuta' : 'Boleto Compra Venta';
        
        const safeLetras = (num) => window.numeroALetras ? window.numeroALetras(num) : '';

        const boletoData = {
            tipo: tipoBoleto, 
            fecha: fDate, 
            estado: 'Pendiente', 
            autoIdAsociado: autoId,
            
            vendedor: 'MARTINELLI AUTOS', 
            vendedorDomicilio: '', 
            vendedorLoc: '', 
            vendedorTel: '',

            comprador: nombreComprador, 
            dni: dniComprador,
            telefono: telComprador,
            domicilio: domComprador, 
            locComp: '',

            categoria: 'Automóvil', 
            tipoVehiculo: 'Sedán',
            marca: auto.marca, 
            modelo: auto.modelo, 
            año: auto.año, 
            dominio: auto.patente, 
            motor: '', 
            chasis: '', 
            locPat: '',

            monto: totalVentaOperacion.toString(), 
            montoLetras: safeLetras(totalVentaOperacion),
            observaciones: ''
        };

        if (tienePermutaReal) {
            boletoData.efectivo = (vEfectivo + vTransferencia).toString(); 
            boletoData.p_marca = pMarca.toUpperCase();
            boletoData.p_modelo = pModelo.toUpperCase();
            boletoData.p_anio = pAnio;
            boletoData.p_dominio = pPat.toUpperCase();
            boletoData.p_motor = '';
            boletoData.p_chasis = '';
            boletoData.p_locPat = '';
            
            boletoData.p_tasado = vPermuta.toString();
            boletoData.p_tasadoLetras = safeLetras(vPermuta);
            
            const remanente = totalVentaOperacion - vPermuta - (vEfectivo + vTransferencia);
            boletoData.remanenteLetras = remanente > 0 ? safeLetras(remanente) : '';
            
            let det = [];
            if(vCredito > 0) det.push(`Crédito (${cCredito} cuotas)`);
            if(vPagare > 0) det.push(`Pagaré (${cPagare} cuotas)`);
            boletoData.detalleRemanente = det.length > 0 ? 'Saldo a cancelar mediante: ' + det.join(' + ') : '';
        } else {
            boletoData.formaPago = metodosUsados.join(' + ');
            boletoData.diasTransf = '15';
            boletoData.ciudadFirma = '';
        }

        await window.fbAdd("formularios", boletoData);
        
        window.closeModal('modal-detalle-auto');
        window.switchTab('formularios');
        
    } catch(err) {
        console.error("Error en venta:", err);
    } finally {
        window.state.isSubmittingVenta = false;
        if (btn) window.setBtnLoader(btn, false);
    }
};

// --------------------------------------------------------
// 5. CONTROLADORES DE FORMULARIOS Y BOLETOS
// --------------------------------------------------------

window.guardarYImprimirFormulario = async (autoIdAsociado) => {
    if (window.state.isSubmittingBoleto) return;

    if (autoIdAsociado && typeof autoIdAsociado === 'object') {
        autoIdAsociado = null;
    }

    window.state.isSubmittingBoleto = true;
    
    const dataToSave = { ...window.state.tempFormData, estado: 'Completado' };
    const formId = dataToSave.id; 

    delete dataToSave.id;
    
    Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === undefined) {
            dataToSave[key] = null;
        }
    });

    const btn = document.querySelector('#form-real-boleto button[type="submit"]') || document.querySelector('#modal-asociar-form button.bg-black');
    if (btn) window.setBtnLoader(btn, true);

    try {
        if (autoIdAsociado) {
            dataToSave.autoIdAsociado = autoIdAsociado;
            await window.fbUpdate("autos", autoIdAsociado, { estado: 'Vendido' });
        }

        if (formId) {
            await window.fbUpdate("formularios", formId, dataToSave);
            
            const idx = window.state.formularios.findIndex(f => f.id === formId);
            if (idx !== -1) {
                window.state.formularios[idx] = { ...window.state.formularios[idx], ...dataToSave, id: formId };
            }
        } else {
            await window.fbAdd("formularios", dataToSave);
        }

        window.closeModal('modal-asociar-form');
        window.closeModal('modal-boleto');

        if (window.imprimirBoletoHtml) {
            window.imprimirBoletoHtml(formId || dataToSave);
        }

    } catch (err) {
        console.error("Error guardando el formulario", err);
        alert("Ocurrió un error al guardar. Verifica la consola.");
    } finally {
        window.state.isSubmittingBoleto = false;
        if (btn) window.setBtnLoader(btn, false);
        if (window.renderFormulariosView) window.renderFormulariosView();
    }
};

window.vincularYGuardarFormulario = () => {
    const sel = document.getElementById('asoc-auto-select');
    if (sel && sel.value) {
        window.guardarYImprimirFormulario(sel.value);
    } else {
        alert("Debes seleccionar un vehículo de la lista para vincularlo.");
    }
};

window.ignorarYGuardarFormulario = () => {
    window.guardarYImprimirFormulario(null);
};

// --------------------------------------------------------
// 6. CONTROLADORES DE CRM (LEADS Y CONSULTAS)
// --------------------------------------------------------

window.handleGlobalLeadSubmit = async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    const btn = e.submitter || e.target.querySelector('button[type="submit"]');

    if (window.state.isSubmittingLead || (btn && btn.disabled)) {
        return;
    }
    
    window.state.isSubmittingLead = true;
    
    if (btn) {
        window.setBtnLoader(btn, true);
    }
    
    try {
        if (await window.comprobarClienteExistente(document.getElementById("gl-nombre").value, document.getElementById("gl-tel").value)) return;
        await window.crearClienteUnico({
            autoId: document.getElementById("gl-auto")?.value || null,
            nombre: document.getElementById('gl-nombre').value,
            telefono: document.getElementById('gl-tel').value,
            marcaInteres: document.getElementById('gl-interes').value,
            estadoLead: 'Caliente',
            notas: document.getElementById('gl-nota').value,
            fecha: window.fechaLocalHoy(),
            userId: window.state.currentUser.id,
            sucursalId: window.state.currentUser.sucursalId,
            historial: [] 
        });
        
        window.closeModal('modal-nuevo-lead');
        e.target.reset();
        
        if (window.renderClientesView) {
            window.renderClientesView();
        }
        
        if(window.updateNotifications) {
            window.updateNotifications();
        }
        
    } catch(err) {
        console.error("Error guardando cliente:", err);
        alert("No se pudo guardar el cliente: " + (err.message || "revisá la conexión."));
    } finally {
        window.state.isSubmittingLead = false;
        
        if (btn) {
            window.setBtnLoader(btn, false);
        }
    }
};

window.handleDA_CRMSubmit = async (e, autoId) => { 
    e.preventDefault();
    e.stopImmediatePropagation();
    
    const btn = e.submitter || e.target.querySelector('button[type="submit"]');

    if (window.state.isSubmittingDALead || (btn && btn.disabled)) {
        return;
    }
    
    window.state.isSubmittingDALead = true;
    
    if (btn) {
        window.setBtnLoader(btn, true);
    }
    
    try {
        const auto = window.state.autos.find(x => x.id === autoId);
        
        if (await window.comprobarClienteExistente(document.getElementById('dac-nombre').value,document.getElementById('dac-tel').value)) return;
        await window.crearClienteUnico({ 
            autoId: autoId, 
            marcaInteres: `${auto.marca} ${auto.modelo}`, 
            nombre: document.getElementById('dac-nombre').value, 
            telefono: document.getElementById('dac-tel').value, 
            notas: document.getElementById('dac-nota').value, 
            fecha: window.fechaLocalHoy(),
            userId: window.state.currentUser.id, 
            sucursalId: window.state.currentUser.sucursalId, 
            historial: []
        }); 
        
        document.getElementById('dac-nombre').value = ''; 
        document.getElementById('dac-tel').value = ''; 
        document.getElementById('dac-nota').value = '';
        
        if (window.renderDetalleAuto) {
            window.renderDetalleAuto();
        }
        
        if (window.renderClientesView) {
            window.renderClientesView();
        }
        
        if(window.updateNotifications) {
            window.updateNotifications();
        }
        
    } catch (err) {
        console.error("Error guardando cliente del vehículo:", err);
        alert("No se pudo guardar el cliente: " + (err.message || "revisá la conexión."));
    } finally {
        window.state.isSubmittingDALead = false;
        
        if (btn) {
            window.setBtnLoader(btn, false);
        }
    }
};

window.handleEditLeadSubmit = async (e, id) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    const btn = e.submitter || document.querySelector('#form-edit-lead button[type="submit"]');

    if (window.state.isEditingLead || (btn && btn.disabled)) {
        return;
    }
    
    window.state.isEditingLead = true;
    
    if (btn) {
        window.setBtnLoader(btn, true);
    }
    
    try {
        const nombreLead = document.getElementById('edit-lead-nombre').value;
        const telefonoLead = document.getElementById('edit-lead-tel').value;
        const notasLead = document.getElementById('edit-lead-nota').value;
        if (await window.comprobarClienteExistente(nombreLead, telefonoLead, id)) return;
        
        await window.actualizarClienteUnico(id, { 
            nombre: nombreLead, 
            telefono: telefonoLead, 
            notas: notasLead
        });
        
        if (window.renderClientesView) {
            window.renderClientesView();
        }
        
        if (window.state.selectedAutoId && window.renderDetalleAuto) {
            window.renderDetalleAuto();
        }
        
        alert("Datos base actualizados correctamente.");
        
    } catch(err) {
        console.error("Error editando lead:", err);
    } finally {
        window.state.isEditingLead = false;
        
        if (btn) {
            window.setBtnLoader(btn, false);
        }
    }
};

window.deleteLead = async (id) => {
    if (confirm('¿Estás seguro de eliminar permanentemente a este interesado de tu cartera?')) {
        try {
            await window.eliminarClienteUnico(id);
            
            window.closeModal('modal-detalle-lead');
            
            if (window.renderClientesView) {
                window.renderClientesView();
            }
            
            if (window.state.selectedAutoId && window.renderDetalleAuto) {
                window.renderDetalleAuto();
            }
            
            if(window.updateNotifications) {
                window.updateNotifications();
            }
            
        } catch (err) {
            console.error("Error eliminando lead:", err);
        }
    }
};

window.handleAddLeadHistory = async (e, leadId) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    const btn = e.submitter || e.target.querySelector('button[type="submit"]');
    
    if(btn) {
        window.setBtnLoader(btn, true);
    }

    try {
        const lead = window.state.consultas.find(c => c.id === leadId);
        
        if(!lead) {
            return;
        }
        
        const texto = document.getElementById('lh-texto').value;
        const prox = document.getElementById('lh-fecha').value;
        
        const nuevoHistorial = { 
            id: window.generateId ? window.generateId() : Date.now().toString(), 
            fechaCarga: new Date().toISOString().split('T')[0], 
            texto: texto, 
            proximoContacto: prox || null, 
            completado: false 
        };
        
        const list = [...(lead.historial || []), nuevoHistorial];
        
        await window.fbUpdate("consultas", leadId, { historial: list });
        
        if(window.openDetalleLead) {
            window.openDetalleLead(leadId);
        }
        
        if(window.renderClientesView) {
            window.renderClientesView();
        }
        
        if(window.updateNotifications) {
            window.updateNotifications();
        }
        
    } catch(err) {
        console.error("Error agregando historial al lead:", err);
    } finally {
        if(btn) {
            window.setBtnLoader(btn, false);
        }
    }
};

window.markHistoryCompleted = async (leadId, histId) => {
    try {
        const lead = window.state.consultas.find(c => c.id === leadId);
        
        if(!lead) {
            return;
        }
        
        const list = (lead.historial || []).map(h => {
            if(h.id === histId) {
                return { ...h, completado: true };
            }
            return h;
        });
        
        await window.fbUpdate("consultas", leadId, { historial: list });
        
        if(window.openDetalleLead) {
            window.openDetalleLead(leadId);
        }
        
        if(window.renderClientesView) {
            window.renderClientesView();
        }
        
        if(window.updateNotifications) {
            window.updateNotifications();
        }
        
    } catch(err) {
        console.error("Error marcando historial como completado:", err);
    }
};

// --------------------------------------------------------
// 7. CONTROLADORES DE ADMINISTRACIÓN Y SUCURSALES
// --------------------------------------------------------

window.handleSaveSucursal = async (e) => { 
    e.preventDefault();
    e.stopImmediatePropagation();
    
    const btn = e.submitter || document.getElementById('new-suc-submit');

    if (window.state.isSubmittingSucursal || (btn && btn.disabled)) {
        return;
    }
    
    window.state.isSubmittingSucursal = true;
    
    if (btn) {
        window.setBtnLoader(btn, true);
    }
    
    try {
        const nombreSuc = document.getElementById('new-suc-name').value; 
        
        if (window.state.editingSucursalId) { 
            await window.fbUpdate("sucursales", window.state.editingSucursalId, { nombre: nombreSuc }); 
        } else { 
            await window.fbAdd("sucursales", { nombre: nombreSuc }); 
        } 
        
        window.resetSucForm(); 
        
    } catch (err) {
        console.error("Error guardando sucursal:", err);
    } finally {
        window.state.isSubmittingSucursal = false;
        
        if (btn) {
            window.setBtnLoader(btn, false);
        }
    }
};

window.editSucursal = (id) => { 
    window.state.editingSucursalId = id; 
    const sucursal = window.state.sucursales.find(s => s.id === id);
    
    document.getElementById('new-suc-name').value = sucursal.nombre; 
    document.getElementById('new-suc-cancel').classList.remove('hidden'); 
};

window.deleteSucursal = async (id) => { 
    if (confirm('¿Eliminar esta sucursal permanentemente?')) {
        await window.fbDelete("sucursales", id); 
    }
};

window.resetSucForm = () => { 
    window.state.editingSucursalId = null; 
    document.getElementById('new-suc-name').value = ''; 
    document.getElementById('new-suc-cancel').classList.add('hidden'); 
};

window.handleSaveUser = async e => {
    e.preventDefault();
    e.stopImmediatePropagation();
    const btn = e.submitter || document.getElementById('new-user-submit');
    if (window.state.isSubmittingUser || (btn && btn.disabled)) return;
    window.state.isSubmittingUser = true;
    if (btn) window.setBtnLoader(btn, true);
    try {
        if (window.state.currentUser?.rol !== 'Admin') throw new Error('Solo el administrador puede administrar usuarios.');
        const nombre = document.getElementById('new-user-name').value.trim();
        const email = document.getElementById('new-user-email').value.trim().toLowerCase();
        const rol = document.getElementById('new-user-rol').value;
        const sucursalId = document.getElementById('new-user-suc').value || null;
        const password = document.getElementById('new-user-pwd').value;
        if (!nombre || !email || !['Admin','Encargado','Vendedor'].includes(rol)) throw new Error('Verificá los datos del usuario.');
        if (window.state.editingUserId) {
            const original = window.state.usuarios.find(u => u.id === window.state.editingUserId);
            if (!original) throw new Error('Usuario no encontrado.');
            if (original.email?.toLowerCase() !== email) throw new Error('El correo de ingreso no se puede modificar desde este formulario.');
            if (original.id === window.state.currentUser.id && rol !== 'Admin') throw new Error('No podés quitarte tu propio permiso de administrador.');
            await window.fbUpdate('usuarios', original.id, { nombre, rol, sucursalId });
        } else {
            if (password.length < 6) throw new Error('La contraseña debe tener al menos seis caracteres.');
            const uid = await window.fbCreateStaff(email, password, { nombre, rol, sucursalId });
            const user = { id: uid, nombre, email, rol, sucursalId, activo: true };
            window.state.usuarios.push(user);
            window.reRenderActiveViews?.();
        }
        window.resetUserForm();
        window.renderAdminView?.();
    } catch (err) {
        console.error('Error al guardar usuario:', err);
        alert('No se pudo guardar el usuario: ' + (err?.message || 'Error de Firebase'));
    } finally {
        window.state.isSubmittingUser = false;
        if (btn) window.setBtnLoader(btn, false);
    }
};
window.editUser = id => {
    const u = window.state.usuarios.find(x => x.id === id);
    if (!u) return;
    window.state.editingUserId = id;
    document.getElementById('new-user-name').value = u.nombre || '';
    const emailInput = document.getElementById('new-user-email');
    emailInput.value = u.email || '';
    emailInput.readOnly = true;
    document.getElementById('new-user-rol').value = u.rol;
    document.getElementById('new-user-suc').value = u.sucursalId || '';
    const pwd = document.getElementById('new-user-pwd');
    pwd.value = '';
    pwd.required = false;
    pwd.disabled = true;
    document.getElementById('new-user-auth-help').innerText = 'Editar perfil: la contraseña se cambia desde el correo de recuperación, no aquí.';
    document.getElementById('new-user-cancel').classList.remove('hidden');
};
window.deleteUser = async id => {
    if (id === window.state.currentUser.id) return alert('No podés eliminar tu propio usuario.');
    if (!confirm('¿Deshabilitar el acceso de este usuario? Su cuenta de Authentication seguirá existiendo, pero no podrá entrar al sistema.')) return;
    try {
        await window.fbUpdate('usuarios', id, { activo: false });
        window.renderAdminView?.();
        alert('Acceso deshabilitado. El historial se conserva.');
    } catch (err) { alert('No se pudo deshabilitar: ' + err.message); }
};
window.resetUserForm = () => {
    window.state.editingUserId = null;
    document.getElementById('new-user-name').value = '';
    const email = document.getElementById('new-user-email');
    email.value = '';
    email.readOnly = false;
    const pwd = document.getElementById('new-user-pwd');
    pwd.value = '';
    pwd.disabled = false;
    pwd.required = true;
    document.getElementById('new-user-auth-help').innerText = 'Los usuarios se crean en Firebase Authentication. La contraseña nunca se guarda en Firestore.';
    document.getElementById('new-user-cancel').classList.add('hidden');
};

// --------------------------------------------------------
// 8. CONTROLADORES DE CAJA CHICA Y COBROS PENDIENTES
// --------------------------------------------------------

window.agregarCategoria = async () => { 
    const n = prompt('Ingrese el nombre de la nueva categoría:'); 
    
    if (n && n.trim() !== '') { 
        window.state.categoriasGasto.push(n.trim()); 
        window.initSelects(); 
    } 
};

window.handleComprobanteChange = () => window.actualizarFacturaCaja();
window.marcarCobrado = async (id) => { 
    await window.fbUpdate("transacciones", id, { estadoCobro: 'disponible' }); 
    window.closeModal('modal-pendientes'); 
};

window.openModalCaja = () => {
    window.state.editingTransaccionId = null;
    document.getElementById('form-caja').reset();
    document.getElementById('caja-moneda').value = 'ARS';
    const fecha = document.getElementById('caja-fecha');
    if (fecha) fecha.value = window.fechaLocalHoy();
    window.elegirTipoCaja('ingreso');
    window.actualizarFacturaCaja();
    const currentUser = window.state.currentUser;
    const selectedId = currentUser.rol === 'Admin'
        ? document.getElementById('caja-user-filter')?.value
        : null;
    const targetUser = selectedId
        ? window.state.usuarios.find(u => u.id === selectedId)
        : currentUser;

    // Fijamos el destinatario al abrir el formulario, aunque se refresque la tabla.
    window.state.cajaTargetUserId = targetUser?.id || currentUser.id;
    const info = document.getElementById('caja-destino-info');
    if (info) {
        info.textContent = 'Caja de destino: ' + (targetUser?.nombre || currentUser.nombre) +
            (currentUser.rol === 'Admin' && !selectedId ? ' (sin usuario filtrado: caja del administrador)' : '');
    }
    const title = document.getElementById('modal-caja-title');
    if(title) title.innerText = "Nuevo Movimiento de Caja";
    window.openModal('modal-caja');
};

window.editTransaccion = (id) => {
    const t = window.state.transacciones.find(x => x.id === id);
    if (!t) return;
    
    window.state.editingTransaccionId = id;
    
    document.getElementById('caja-fecha').value = t.fecha;
    document.getElementById('caja-moneda').value = t.moneda === 'USD' ? 'USD' : 'ARS';
    window.elegirTipoCaja(t.tipo);
    document.getElementById('caja-desc').value = t.descripcion;
    document.getElementById('caja-cat').value = t.categoria;
    document.getElementById('caja-monto').value = window.formatMoney(t.valor).replace(/[^0-9]/g, '');
    
    if (document.getElementById('caja-auto')) {
        document.getElementById('caja-auto').value = t.autoId || '';
    }
    if (document.getElementById('caja-comprobante')) {
        document.getElementById('caja-comprobante').value = t.tipoComprobante || 'X';
        const facturada = document.getElementById('caja-facturada');
        if (facturada) facturada.checked = ['A','B','C'].includes(t.tipoComprobante);
        window.actualizarFacturaCaja();
    }
    if (document.getElementById('caja-comp-num')) {
        document.getElementById('caja-comp-num').value = t.numComprobante || '';
    }
    if (document.getElementById('caja-iva')) {
        document.getElementById('caja-iva').value = t.iva ? window.formatMoney(t.iva).replace(/[^0-9]/g, '') : '';
    }

    const title = document.getElementById('modal-caja-title');
    if(title) title.innerText = "Editar Movimiento de Caja";
    
    window.openModal('modal-caja');
};

// --- BORRADO LÓGICO DE CAJA CHICA ---
window.deleteTransaccion = async (id) => {
    if (!confirm("⚠️ ADVERTENCIA CRÍTICA: Estás a punto de ELIMINAR un movimiento contable.\n\nEste movimiento desaparecerá de la caja y no sumará al saldo, pero quedará un registro oculto en la base de datos (Categoría: BORRADOS) por seguridad.\n\n¿Estás absolutamente seguro de continuar?")) {
        return;
    }

    try {
        const t = window.state.transacciones.find(x => x.id === id);
        if (!t) return;

        if (t.tipo === 'gasto' && t.autoId) {
            const auto = window.state.autos.find(x => x.id === t.autoId);
            if (auto) {
                const gastosLimpios = (auto.gastos || []).filter(g => g.txId !== id && g.id !== id);
                await window.fbUpdate("autos", t.autoId, { gastos: gastosLimpios });
            }
        }

        // BORRADO LÓGICO
        await window.fbUpdate("transacciones", id, { 
            eliminado: true,
            categoriaOriginal: t.categoria || '',
            categoria: 'BORRADOS', 
            borradoPor: window.state.currentUser.nombre,
            fechaBorrado: new Date().toISOString()
        });
        
    } catch (err) {
        console.error("Error eliminando transacción de caja:", err);
        alert("Hubo un error al eliminar el movimiento.");
    }
};

window.verHistorialEdicion = (id) => {
    const t = window.state.transacciones.find(x => x.id === id);
    if (!t || !t.historialEdiciones || t.historialEdiciones.length === 0) {
        alert("No hay historial detallado para este movimiento.");
        return;
    }
    
    let html = `<div class="space-y-4">`;
    
    t.historialEdiciones.forEach((h) => {
        html += `
            <div class="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                <p class="text-xs font-bold text-neutral-500 mb-2 border-b border-neutral-200 dark:border-neutral-700 pb-2 flex justify-between items-center">
                    <span>Modificado el ${window.formatDate(h.fechaCambio.split('T')[0])}</span>
                    <span class="text-amber-600 dark:text-amber-400 font-black"><i data-lucide="user" class="w-3 h-3 inline mr-1"></i>${h.modificadoPor}</span>
                </p>
                <div class="grid grid-cols-2 gap-2 text-sm mt-3">
                    <p class="text-neutral-500">Valor Anterior:</p>
                    <p class="font-black text-right">${window.formatMoney(h.datosAnteriores.monto)}</p>
                    <p class="text-neutral-500">Detalle Anterior:</p>
                    <p class="font-bold text-right">${h.datosAnteriores.descripcion}</p>
                    <p class="text-neutral-500">Categoría:</p>
                    <p class="font-bold text-right uppercase text-[10px] tracking-widest">${h.datosAnteriores.categoria}</p>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    
    let modal = document.getElementById('modal-historial-caja');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-historial-caja';
        modal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm hidden fade-in';
        modal.innerHTML = `
            <div class="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh] mx-4">
                <div class="p-6 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-amber-50 dark:bg-amber-900/10">
                    <h3 class="text-sm font-black uppercase tracking-widest text-amber-800 dark:text-amber-400 flex items-center">
                        <i data-lucide="history" class="w-4 h-4 mr-2"></i> Auditoría de Edición
                    </h3>
                    <button onclick="document.getElementById('modal-historial-caja').classList.add('hidden')" class="p-2 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors shadow-sm text-neutral-500">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
                <div id="historial-caja-content" class="p-6 overflow-y-auto no-scrollbar"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('historial-caja-content').innerHTML = html;
    if(window.lucide) window.lucide.createIcons();
    modal.classList.remove('hidden');
};

window.handleCajaSubmit = async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    const btn = e.submitter || e.target.querySelector('button[type="submit"]') || e.target.querySelector('button');

    if (window.state.isSubmittingCaja || (btn && btn.disabled)) {
        return;
    }

    if (window.state.editingTransaccionId) {
        if (!confirm("⚠️ ADVERTENCIA: Estás a punto de modificar un movimiento contable. El registro de este cambio quedará guardado permanentemente en el sistema de auditoría. ¿Deseas continuar?")) {
            return;
        }
    }
    
    window.state.isSubmittingCaja = true;
    
    if (btn) {
        window.setBtnLoader(btn, true);
    }
    
    try {
        const autoIdSel = document.getElementById('caja-auto').value || null;
        const tipoTx = document.getElementById('caja-tipo').value;
        const descTx = document.getElementById('caja-desc').value;
        const catTx = document.getElementById('caja-cat').value;
        const montoTx = Number(document.getElementById('caja-monto').value.replace(/[^0-9]/g, ''));
        const monedaTx = document.getElementById('caja-moneda').value === 'USD' ? 'USD' : 'ARS';
        const fDate = document.getElementById('caja-fecha').value;

        const selectedTarget = window.state.currentUser.rol === 'Admin' && !window.state.editingTransaccionId
            ? window.state.usuarios.find(u => u.id === window.state.cajaTargetUserId)
            : null;
        if (window.state.currentUser.rol === 'Admin' && !window.state.editingTransaccionId &&
            window.state.cajaTargetUserId && !selectedTarget &&
            window.state.cajaTargetUserId !== window.state.currentUser.id) {
            throw new Error('La caja seleccionada ya no existe. Volvé a abrir el formulario.');
        }
        const targetUser = selectedTarget || window.state.currentUser;
        const data = {
            userId: targetUser.id,
            sucursalId: targetUser.sucursalId || null,
            registradoPorId: window.state.currentUser.id,
            registradoPorNombre: window.state.currentUser.nombre,
            fecha: fDate, 
            tipo: tipoTx,
            descripcion: descTx, 
            categoria: catTx,
            valor: montoTx,
            moneda: monedaTx,
            autoId: autoIdSel, 
            tipoComprobante: document.getElementById('caja-facturada')?.checked ? document.getElementById('caja-comprobante').value : 'X',
            numComprobante: document.getElementById('caja-facturada')?.checked ? document.getElementById('caja-comp-num').value : '', 
            iva: document.getElementById('caja-facturada')?.checked && document.getElementById('caja-comprobante').value === 'A' ? Math.round(montoTx * 21 / 121) : 0,
            estadoCobro: 'disponible'
        };

        let txId = window.state.editingTransaccionId;
        const oldTx = txId ? window.state.transacciones.find(t => t.id === txId) : null;
        const oldAutoId = oldTx ? oldTx.autoId : null;

        if (txId && oldTx) {
            const historial = oldTx.historialEdiciones ? [...oldTx.historialEdiciones] : [];
            historial.push({
                fechaCambio: new Date().toISOString(),
                modificadoPor: window.state.currentUser.nombre,
                datosAnteriores: {
                    fecha: oldTx.fecha,
                    descripcion: oldTx.descripcion,
                    categoria: oldTx.categoria,
                    monto: oldTx.valor
                }
            });

            data.editado = true;
            data.fechaEdicion = new Date().toISOString();
            data.historialEdiciones = historial;
            data.userId = oldTx.userId;
            data.sucursalId = oldTx.sucursalId;
            data.registradoPorId = oldTx.registradoPorId || window.state.currentUser.id;
            data.registradoPorNombre = oldTx.registradoPorNombre || window.state.currentUser.nombre;

            await window.fbUpdate("transacciones", txId, data);
        } else {
            const docRef = await window.fbAdd("transacciones", data);
            txId = docRef ? docRef.id : data.id; 
        }

        if (txId && oldAutoId && oldAutoId !== autoIdSel) {
            const oldAuto = window.state.autos.find(x => x.id === oldAutoId);
            if (oldAuto) {
                const gastosLimpios = (oldAuto.gastos || []).filter(g => g.txId !== txId && g.id !== txId);
                await window.fbUpdate("autos", oldAutoId, { gastos: gastosLimpios });
            }
        }

        if (tipoTx === 'gasto' && autoIdSel) {
            const auto = window.state.autos.find(x => x.id === autoIdSel);
            if (auto) {
                let gastosActuales = auto.gastos || [];
                const gastoIndex = gastosActuales.findIndex(g => g.txId === txId || g.id === txId);
                
                const objGasto = { 
                    id: txId, 
                    txId: txId,
                    fecha: fDate, 
                    descripcion: descTx, 
                    categoria: catTx, 
                    monto: montoTx, 
                    fueraDeCaja: false 
                };

                if (gastoIndex >= 0) {
                    gastosActuales[gastoIndex] = objGasto;
                } else {
                    gastosActuales.push(objGasto);
                }
                
                await window.fbUpdate("autos", autoIdSel, { gastos: gastosActuales });
            }
        }
        
        window.closeModal('modal-caja');
        e.target.reset();
        window.state.editingTransaccionId = null;
        window.state.cajaTargetUserId = null;

    } catch(err) {
        console.error("Error guardando transaccion de caja:", err);
        alert("No se pudo guardar el movimiento de caja. " + (err?.message || 'Revisá la conexión y los permisos de Firebase.'));
    } finally {
        window.state.isSubmittingCaja = false;
        if (btn) window.setBtnLoader(btn, false);
    }
};

window.cobrarCuotaVenta = async (ventaId, tipo) => {
    if (window.state.isCobrandoCuota) {
        return;
    }
    
    window.state.isCobrandoCuota = true;
    const venta = window.state.ventas.find(x => x.id === ventaId);
    
    if (!venta) { 
        window.state.isCobrandoCuota = false; 
        return; 
    }

    const userQueRegistra = window.state.currentUser;
    let montoACobrar = 0; 
    let numeroDeCuota = 0; 
    let datosDeActualizacion = {};

    if (tipo === 'credito' && venta.credito) {
        montoACobrar = venta.credito.valorCuota; 
        numeroDeCuota = venta.credito.pagadas + 1;
        datosDeActualizacion = { credito: { ...venta.credito, pagadas: numeroDeCuota } };
    } else if (tipo === 'pagare' && venta.pagare) {
        montoACobrar = venta.pagare.valorCuota; 
        numeroDeCuota = venta.pagare.pagadas + 1;
        datosDeActualizacion = { pagare: { ...venta.pagare, pagadas: numeroDeCuota } };
    }

    if (montoACobrar > 0) {
        const fechaHoy = new Date().toISOString().split('T')[0];
        const btnId = tipo === 'credito' ? `btn-txt-credito-${ventaId}` : `btn-txt-pagare-${ventaId}`;
        const btnDOM = document.getElementById(btnId)?.parentElement;
        
        if (btnDOM) {
            window.setBtnLoader(btnDOM, true);
        }

        try {
            await window.fbAdd("transacciones", { 
                fecha: fechaHoy, 
                descripcion: `Cobro Cuota ${numeroDeCuota} (${tipo === 'credito' ? 'Crédito' : 'Pagaré'}): ${venta.compradorNombre} - ${venta.autoDesc}`, 
                tipo: 'ingreso', 
                categoria: 'Venta Vehículos', 
                valor: montoACobrar, 
                userId: userQueRegistra.id, 
                sucursalId: userQueRegistra.sucursalId, 
                tipoComprobante: 'X', 
                numComprobante: '', 
                iva: 0, 
                estadoCobro: 'disponible', 
                fechaAcreditacion: null 
            });
            
            await window.fbUpdate("ventas", ventaId, datosDeActualizacion);
            
            window.closeModal('modal-pendientes');
            alert(`Cuota #${numeroDeCuota} cobrada con éxito e ingresada a la caja.`);
            
        } catch(e) {
            console.error("Error cobrando cuota:", e);
        } finally {
            if (btnDOM) {
                window.setBtnLoader(btnDOM, false);
            }
            window.state.isCobrandoCuota = false; 
        }
    } else {
        window.state.isCobrandoCuota = false; 
    }
};

// --------------------------------------------------------
// 9. CONTROLADORES DE COMISIONES Y CIERRES DE MES
// --------------------------------------------------------

window.openModalAsignarBono = () => { 
    document.getElementById('form-comision').reset(); 
    document.getElementById('comision-venta-id').value = ""; 
    window.openModal('modal-comision'); 
};

window.handleComisionSubmit = async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    const btn = e.submitter || e.target.querySelector('button[type="submit"]');

    if (window.state.isSubmittingComision || (btn && btn.disabled)) {
        return;
    }
    
    window.state.isSubmittingComision = true;
    
    if (btn) {
        window.setBtnLoader(btn, true);
    }
    
    try {
        const usrId = document.getElementById('comision-user').value;
        const montoBono = Number(document.getElementById('comision-monto').value.replace(/[^0-9]/g, ''));
        const descripcionBono = document.getElementById('comision-desc') ? document.getElementById('comision-desc').value : 'Carga Manual';
        const ventaIdAsoc = document.getElementById('comision-venta-id').value;
        
        if (!usrId || montoBono <= 0) { 
            alert("Complete los datos. El monto debe ser mayor a 0."); 
            window.state.isSubmittingComision = false; 
            
            if (btn) {
                window.setBtnLoader(btn, false);
            }
            return; 
        }
        
        await window.fbAdd("comisiones", { 
            userId: usrId, 
            ventaId: ventaIdAsoc || null, 
            monto: montoBono, 
            descripcion: descripcionBono,
            estado: 'Pendiente', 
            fecha: new Date().toISOString().split('T')[0] 
        });
        
        window.closeModal('modal-comision'); 
        alert("Carga registrada y asignada correctamente a la cuenta del empleado.");
        
        if (window.renderPersonalView) {
            window.renderPersonalView();
        }
        
    } catch(err) {
        console.error("Error asignando comision:", err);
    } finally {
        window.state.isSubmittingComision = false;
        
        if (btn) {
            window.setBtnLoader(btn, false);
        }
    }
};

window.openModalComisionPorVenta = (ventaId) => {
    const venta = window.state.ventas.find(x => x.id === ventaId);
    
    if (!venta) {
        return;
    }
    
    document.getElementById('form-comision').reset(); 
    document.getElementById('comision-venta-id').value = ventaId; 
    document.getElementById('comision-desc').value = `Bono por Venta: ${venta.autoDesc}`;
    
    window.closeModal('modal-detalle-venta');
    window.openModal('modal-comision'); 
};

window.liquidarPersonal = async (userId) => {
    if (window.state.isCerrandoPagos) {
        return;
    }
    
    const empleado = window.state.usuarios.find(x => x.id === userId);
    
    if(!empleado) {
        return;
    }

    const pendientes = window.state.comisiones.filter(c => c.estado === 'Pendiente' && c.userId === userId);
    const montoLiquidacion = pendientes.reduce((acc, curr) => acc + curr.monto, 0);

    if (montoLiquidacion <= 0) {
        return alert("Este empleado no tiene comisiones pendientes de cobro.");
    }
    
    if (!confirm(`¿Estás seguro de liquidar ${window.formatMoney(montoLiquidacion)} a ${empleado.nombre}?\n\nAl confirmar, este monto se descontará automáticamente como 'Gasto' en la Caja Chica.`)) {
        return;
    }

    window.state.isCerrandoPagos = true;
    
    try {
        const fechaHoy = new Date().toISOString().split('T')[0];
        const adminUser = window.state.usuarios.find(user => user.rol === 'Admin') || window.state.currentUser;

        const dataCierre = { 
            fecha: fechaHoy, 
            cantidadMovimientos: pendientes.length, 
            total: montoLiquidacion, 
            userId: adminUser.id, 
            empleadoLiquidado: empleado.nombre 
        };
        
        const docRef = await window.fbAdd("cierres_personal", dataCierre);
        const cierreOficialId = docRef ? docRef.id : window.generateId ? window.generateId() : Date.now().toString();

        await window.fbAdd("transacciones", {
            fecha: fechaHoy, 
            descripcion: `Liquidación de Personal: ${empleado.nombre}`, 
            tipo: 'gasto', 
            categoria: 'Liquidación Personal',
            valor: montoLiquidacion, 
            userId: adminUser.id, 
            sucursalId: adminUser.sucursalId, 
            tipoComprobante: 'X', 
            numComprobante: '', 
            iva: 0, 
            estadoCobro: 'disponible'
        });

        for (let comision of pendientes) {
            await window.fbUpdate("comisiones", comision.id, { 
                estado: 'Pagada', 
                fechaPago: fechaHoy, 
                cierreId: cierreOficialId 
            });
        }

        window.closeModal('modal-detalle-personal');
        alert(`¡Éxito! El pago de ${window.formatMoney(montoLiquidacion)} a ${empleado.nombre} fue registrado y descontado de la caja.`);
        
        if (window.renderPersonalView) {
            window.renderPersonalView();
        }
        
    } catch(err) {
        console.error("Error procesando pago de empleado:", err);
        alert("Hubo un error al procesar el pago.");
    } finally {
        window.state.isCerrandoPagos = false; 
    }
};
