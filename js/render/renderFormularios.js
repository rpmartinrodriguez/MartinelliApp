// ==========================================
// js/render/renderFormularios.js
// ==========================================

// --------------------------------------------------------
// MOTOR DE TRADUCCIÓN DE NÚMEROS A LETRAS (Formal Legal)
// --------------------------------------------------------
window.numeroALetras = (numero) => {
    if (numero === undefined || numero === null || isNaN(numero) || numero === "") return "";
    
    let entero = Math.floor(numero);
    let centavos = Math.round((numero - entero) * 100);
    let letras = "";

    const Unidades = (num) => {
        switch(num) {
            case 1: return 'UN'; case 2: return 'DOS'; case 3: return 'TRES';
            case 4: return 'CUATRO'; case 5: return 'CINCO'; case 6: return 'SEIS';
            case 7: return 'SIETE'; case 8: return 'OCHO'; case 9: return 'NUEVE';
        }
        return '';
    }
    const Decenas = (num) => {
        let decena = Math.floor(num/10); 
        let unidad = num - (decena * 10);
        switch(decena) {
            case 1: 
                switch(unidad) { 
                    case 0: return 'DIEZ'; case 1: return 'ONCE'; case 2: return 'DOCE'; 
                    case 3: return 'TRECE'; case 4: return 'CATORCE'; case 5: return 'QUINCE'; 
                    default: return 'DIECI' + Unidades(unidad); 
                }
            case 2: 
                switch(unidad) { 
                    case 0: return 'VEINTE'; default: return 'VEINTI' + Unidades(unidad); 
                }
            case 3: return DecenasY('TREINTA', unidad);
            case 4: return DecenasY('CUARENTA', unidad);
            case 5: return DecenasY('CINCUENTA', unidad);
            case 6: return DecenasY('SESENTA', unidad);
            case 7: return DecenasY('SETENTA', unidad);
            case 8: return DecenasY('OCHENTA', unidad);
            case 9: return DecenasY('NOVENTA', unidad);
            case 0: return Unidades(unidad);
        }
    }
    const DecenasY = (strSin, numUnidades) => {
        if (numUnidades > 0) return strSin + ' Y ' + Unidades(numUnidades);
        return strSin;
    }
    const Centenas = (num) => {
        let centenas = Math.floor(num / 100); 
        let decenas = num - (centenas * 100);
        switch(centenas) {
            case 1: if (decenas > 0) return 'CIENTO ' + Decenas(decenas); return 'CIEN';
            case 2: return 'DOSCIENTOS ' + Decenas(decenas);
            case 3: return 'TRESCIENTOS ' + Decenas(decenas);
            case 4: return 'CUATROCIENTOS ' + Decenas(decenas);
            case 5: return 'QUINIENTOS ' + Decenas(decenas);
            case 6: return 'SEISCIENTOS ' + Decenas(decenas);
            case 7: return 'SETECIENTOS ' + Decenas(decenas);
            case 8: return 'OCHOCIENTOS ' + Decenas(decenas);
            case 9: return 'NOVECIENTOS ' + Decenas(decenas);
        }
        return Decenas(decenas);
    }
    const Seccion = (num, divisor, strSingular, strPlural) => {
        let cientos = Math.floor(num / divisor); 
        let resto = num - (cientos * divisor);
        let letras = '';
        if (cientos > 0) {
            if (cientos > 1) letras = Centenas(cientos) + ' ' + strPlural;
            else letras = strSingular;
        }
        if (resto > 0) letras += '';
        return letras;
    }
    const Miles = (num) => {
        let divisor = 1000; 
        let cientos = Math.floor(num / divisor); 
        let resto = num - (cientos * divisor);
        let strMiles = Seccion(num, divisor, 'UN MIL', 'MIL'); 
        let strCentenas = Centenas(resto);
        if(strMiles == '') return strCentenas;
        return strMiles + ' ' + strCentenas;
    }
    const Millones = (num) => {
        let divisor = 1000000;
        let millones = Math.floor(num / divisor);
        let resto = num - (millones * divisor);
        let strMillones = '';
        if (millones > 0) {
            if (millones === 1) {
                strMillones = 'UN MILLON';
            } else {
                strMillones = Miles(millones) + ' MILLONES';
            }
        }
        let strMiles = Miles(resto);
        if(strMillones == '') return strMiles;
        return (strMillones + ' ' + strMiles).trim();
    }

    if (entero === 0) {
        letras = "CERO";
    } else {
        letras = Millones(entero);
    }

    let strCentavos = centavos < 10 ? '0' + centavos : centavos;
    return letras.trim() + ` CON ${strCentavos}/100`;
};

// --------------------------------------------------------
// CÁLCULOS DINÁMICOS
// --------------------------------------------------------
window.calcRemanentePermuta = () => {
    const monto = Number(document.getElementById('bf-monto')?.value.replace(/[^0-9]/g, '') || 0);
    const tasado = Number(document.getElementById('bp-tasado')?.value.replace(/[^0-9]/g, '') || 0);
    const efectivo = Number(document.getElementById('bf-efectivo')?.value.replace(/[^0-9]/g, '') || 0);
    
    const diff = monto - tasado - efectivo;
    
    const remInput = document.getElementById('bf-remanente-num');
    const remLetras = document.getElementById('bf-remanente-letras');
    
    if (remInput) {
        remInput.value = window.formatMoney(diff);
    }
    
    if (remLetras && diff >= 0) {
        remLetras.value = window.numeroALetras(diff);
    }
};

// --------------------------------------------------------
// VISTA Y RENDERIZADO
// --------------------------------------------------------
window.renderFormulariosView = () => {
    const headerDiv = document.querySelector('#view-formularios .flex.justify-between.items-center');
    if (headerDiv) {
        headerDiv.innerHTML = `
            <p class="text-sm font-bold text-neutral-500">Boletos y Formularios.</p>
            <div class="flex space-x-2">
                <button onclick="window.openModalBoleto('simple')" class="bg-black text-white dark:bg-white dark:text-black px-4 py-2.5 rounded-xl font-bold text-sm shadow-md hover:scale-105 transition-transform flex items-center">
                    <i data-lucide="file-text" class="w-4 h-4 mr-2"></i> Compra Venta
                </button>
                <button onclick="window.openModalBoleto('permuta')" class="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 hover:scale-105 transition-transform flex items-center">
                    <i data-lucide="repeat" class="w-4 h-4 mr-2"></i> Con Permuta
                </button>
            </div>
        `;
    }

    const tbody = document.getElementById('formularios-table');
    if (!tbody) return;

    const formularios = window.state.formularios || [];
    
    if (formularios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-10 text-neutral-500 font-bold">
                    <div class="flex flex-col items-center justify-center">
                        <i data-lucide="file-x-2" class="w-8 h-8 mb-3 opacity-50"></i>
                        Aún no hay boletos generados en el sistema.
                    </div>
                </td>
            </tr>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    const isAdmin = window.state.currentUser?.rol === 'Admin';

    tbody.innerHTML = formularios.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(f => {
        const badgeClass = f.tipo.includes('Permuta') 
            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' 
            : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300';

        const btnEliminar = isAdmin ? `
            <button onclick="window.eliminarFormulario('${f.id}')" class="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors shadow-sm" title="Eliminar">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        ` : '';

        const btnVincular = !f.autoIdAsociado ? `
            <button onclick="window.abrirAsociarVehiculo('${f.id}')" class="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-lg transition-colors mr-1 shadow-sm" title="Vincular a Vehículo de Flota">
                <i data-lucide="link" class="w-4 h-4"></i>
            </button>
        ` : `
            <button onclick="window.abrirAsociarVehiculo('${f.id}')" class="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg transition-colors mr-1 shadow-sm" title="Vehículo ya vinculado (Click para cambiar)">
                <i data-lucide="link-2" class="w-4 h-4"></i>
            </button>
        `;

        return `
            <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <td class="px-6 py-4 text-sm font-bold text-neutral-800 dark:text-neutral-200">
                    ${window.formatDate(f.fecha)}
                </td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${badgeClass}">
                        ${f.tipo}
                    </span>
                </td>
                <td class="px-6 py-4">
                    <p class="font-black text-sm text-neutral-800 dark:text-neutral-200">${f.comprador}</p>
                    <p class="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5 font-bold">
                        Ref: ${f.marca} ${f.modelo} (${f.dominio})
                    </p>
                </td>
                <td class="px-6 py-4 text-center whitespace-nowrap">
                    <button onclick="window.imprimirBoletoHtml('${f.id}')" class="p-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg transition-colors mr-1 shadow-sm" title="Imprimir / Ver">
                        <i data-lucide="printer" class="w-4 h-4"></i>
                    </button>
                    <button onclick="window.editarFormulario('${f.id}')" class="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors mr-1 shadow-sm" title="Editar Formulario">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>
                    ${btnVincular}
                    ${btnEliminar}
                </td>
            </tr>
        `;
    }).join('');

    if (window.lucide) {
        window.lucide.createIcons();
    }
};

window.abrirAsociarVehiculo = (formId) => {
    const f = window.state.formularios.find(x => x.id === formId);
    if (!f) return;
    
    window.state.tempFormData = { ...f }; 
    
    const selectBox = document.getElementById('asoc-auto-select');
    if(selectBox) {
        selectBox.innerHTML = `<option value="">-- Seleccionar Automóvil --</option>` + 
        window.state.autos.filter(a => a.estado !== 'Vendido').map(a => `<option value="${a.id}">${a.marca} ${a.modelo} (${a.patente})</option>`).join(''); 
    }
    
    const cont = document.getElementById('asoc-select-container');
    if(cont) {
        cont.classList.remove('hidden'); 
    }
    
    window.openModal('modal-asociar-form');
};

window.eliminarFormulario = async (id) => {
    if (confirm("¿Estás seguro de eliminar este formulario permanentemente?")) {
        try {
            await window.fbDelete("formularios", id);
            if (window.renderFormulariosView) {
                window.renderFormulariosView();
            }
        } catch (err) {
            console.error("Error eliminando formulario:", err);
            alert("No se pudo eliminar el formulario.");
        }
    }
};

window.openModalBoleto = (tipo) => {
    window.state.tempFormData = { autoIdAsociado: null };
    const content = document.getElementById('boleto-form-content');
    const title = document.getElementById('boleto-title');
    
    if (!content || !title) return;

    if (tipo === 'simple') {
        title.innerText = "Boleto Compra Venta";
        content.innerHTML = `
            <form onsubmit="window.preGuardarBoleto(event, 'simple')" class="space-y-6">
                <div class="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                    <h4 class="font-black text-sm uppercase tracking-widest text-neutral-400 mb-4">Datos del Vendedor</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input id="bf-vendedor" required placeholder="Nombre Vendedor / Razón Social" value="MARTINELLI AUTOS" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                        <input id="bf-vendedor-domicilio" required placeholder="Domicilio Vendedor" value="" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                        <input id="bf-vendedor-loc" required placeholder="Localidad Vendedor" value="" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                        <input id="bf-vendedor-tel" required placeholder="Teléfono Vendedor" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                    </div>
                </div>

                <div class="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                    <h4 class="font-black text-sm uppercase tracking-widest text-neutral-400 mb-4">Datos del Comprador</h4>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <input id="bf-comprador" required placeholder="Nombre Comprador" class="col-span-2 w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                        <input id="bf-dni" required placeholder="DNI" class="col-span-2 md:col-span-1 w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                        <input id="bf-telefono" required placeholder="Teléfono Comprador" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                        <input id="bf-domicilio" required placeholder="Domicilio Comprador" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                        <input id="bf-loc-comp" required placeholder="Localidad Comprador" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                    </div>
                </div>

                <div class="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                    <h4 class="font-black text-sm uppercase tracking-widest text-neutral-400 mb-4">Vehículo a Vender</h4>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <input id="bf-marca" required placeholder="Marca" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold uppercase" />
                        <input id="bf-modelo" required placeholder="Modelo" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold uppercase" />
                        <input id="bf-tipo" required placeholder="Tipo (Ej: Sedán)" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold uppercase" />
                        <input id="bf-categoria" placeholder="Categoría (Ej: Automóvil)" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold uppercase" />
                        <input id="bf-anio" required type="number" placeholder="Año" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                        <input id="bf-dominio" required placeholder="Dominio/Patente" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold uppercase" />
                        <input id="bf-motor" placeholder="Nº Motor" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold uppercase" />
                        <input id="bf-chasis" placeholder="Nº Chasis" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold uppercase" />
                    </div>
                </div>

                <div class="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                    <h4 class="font-black text-sm uppercase tracking-widest text-neutral-400 mb-4">Condiciones de Venta</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input id="bf-monto" required oninput="window.formatInputMoney(this); document.getElementById('bf-monto-letras').value = window.numeroALetras(Number(this.value.replace(/[^0-9]/g, '')))" placeholder="Monto Total ($)" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-black text-lg" />
                        <input id="bf-monto-letras" required placeholder="Monto Total (En Letras)" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold uppercase" />
                        <div class="md:col-span-2">
                            <input id="bf-formapago" required placeholder="Detalle Forma de Pago (Ej: Efectivo en este acto, sirviendo el presente de suficiente recibo)" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                        </div>
                        <input id="bf-dias-transf" required type="number" placeholder="Días hábiles p/ Transferencia (Ej: 10)" value="15" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                        <input id="bf-ciudad-firma" required placeholder="Ciudad de Firma" value="" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                        <div class="md:col-span-2">
                            <textarea id="bf-obs" rows="2" placeholder="Observaciones Generales..." class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none resize-none font-bold"></textarea>
                        </div>
                    </div>
                </div>

                <div class="flex space-x-4 pt-4">
                    <button type="button" onclick="window.closeModal('modal-boleto')" class="flex-1 py-4 bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 rounded-xl font-black uppercase tracking-widest">Cancelar</button>
                    <button type="submit" class="flex-1 py-4 bg-black text-white dark:bg-white dark:text-black rounded-xl font-black uppercase tracking-widest shadow-lg">Generar Boleto</button>
                </div>
            </form>
        `;
    } else {
        title.innerText = "Boleto Venta con Permuta";
        content.innerHTML = `
            <form onsubmit="window.preGuardarBoleto(event, 'permuta')" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="space-y-6">
                        <div class="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                            <h4 class="font-black text-sm uppercase tracking-widest text-neutral-400 mb-4">Datos Vendedor</h4>
                            <input id="bf-vendedor" required placeholder="Vendedor / Razón Social" value="MARTINELLI AUTOS" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                        </div>
                        
                        <div class="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                            <h4 class="font-black text-sm uppercase tracking-widest text-neutral-400 mb-4">Datos Comprador</h4>
                            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <input id="bf-comprador" required placeholder="Nombre Comprador" class="col-span-2 w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                                <input id="bf-dni" required placeholder="DNI" class="col-span-2 md:col-span-1 w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                                <input id="bf-telefono" required placeholder="Teléfono" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                                <input id="bf-domicilio" required placeholder="Calle y Altura" class="col-span-2 md:col-span-1 w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                                <input id="bf-loc-comp" required placeholder="Localidad" class="col-span-2 md:col-span-1 w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                            </div>
                        </div>

                        <div class="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                            <h4 class="font-black text-sm uppercase tracking-widest text-neutral-400 mb-4">Vehículo a Entregar (Venta)</h4>
                            <div class="grid grid-cols-2 gap-4">
                                <input id="bf-marca" required placeholder="Marca" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold uppercase" />
                                <input id="bf-modelo" required placeholder="Modelo" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold uppercase" />
                                <input id="bf-anio" required type="number" placeholder="Año" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold" />
                                <input id="bf-dominio" required placeholder="Dominio/Patente" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold uppercase" />
                                <input id="bf-motor" placeholder="Nº Motor" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold uppercase" />
                                <input id="bf-chasis" placeholder="Nº Chasis" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold uppercase" />
                                <input id="bf-loc-pat" placeholder="Radicación (Ej: )" class="col-span-2 w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold uppercase" />
                                
                                <div class="col-span-2 border-t border-neutral-100 dark:border-neutral-800 pt-4 mt-2">
                                    <input id="bf-monto" required oninput="window.formatInputMoney(this); document.getElementById('bf-monto-letras').value = window.numeroALetras(Number(this.value.replace(/[^0-9]/g, ''))); window.calcRemanentePermuta()" placeholder="Precio Total del Vehículo ($)" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-black mb-3" />
                                    <input id="bf-monto-letras" required placeholder="Precio Total (En Letras)" class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none font-bold uppercase" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <div class="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
                            <h4 class="font-black text-sm uppercase tracking-widest text-indigo-800 dark:text-indigo-400 mb-4 flex items-center">
                                <i data-lucide="repeat" class="w-4 h-4 mr-2"></i> Vehículo en Permuta
                            </h4>
                            <div class="grid grid-cols-2 gap-4">
                                <input id="bp-marca" required placeholder="Marca Permuta" class="w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-800 outline-none font-bold uppercase" />
                                <input id="bp-modelo" required placeholder="Modelo Permuta" class="w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-800 outline-none font-bold uppercase" />
                                <input id="bp-anio" required type="number" placeholder="Año Permuta" class="w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-800 outline-none font-bold" />
                                <input id="bp-dominio" required placeholder="Dominio Permuta" class="w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-800 outline-none font-bold uppercase" />
                                <input id="bp-motor" placeholder="Nº Motor Permuta" class="w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-800 outline-none font-bold uppercase" />
                                <input id="bp-chasis" placeholder="Nº Chasis Permuta" class="w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-800 outline-none font-bold uppercase" />
                                <input id="bp-loc-pat" placeholder="Radicación Permuta" class="col-span-2 w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-800 outline-none font-bold uppercase" />
                                
                                <div class="col-span-2 border-t border-indigo-200 dark:border-indigo-800/50 pt-4 mt-2">
                                    <input id="bp-tasado" required oninput="window.formatInputMoney(this); document.getElementById('bp-tasado-letras').value = window.numeroALetras(Number(this.value.replace(/[^0-9]/g, ''))); window.calcRemanentePermuta()" placeholder="Valor de Tasación / Toma ($)" class="w-full rounded-xl px-4 py-3 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 outline-none font-black text-indigo-700 dark:text-indigo-400 mb-3" />
                                    <input id="bp-tasado-letras" required placeholder="Valor Tasación (En Letras)" class="w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-indigo-200 dark:border-indigo-800 outline-none font-bold uppercase" />
                                </div>
                            </div>
                        </div>

                        <div class="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-2xl border border-amber-200 dark:border-amber-800/50 shadow-sm">
                            <h4 class="font-black text-sm uppercase tracking-widest text-amber-800 dark:text-amber-400 mb-4 flex items-center">
                                <i data-lucide="wallet" class="w-4 h-4 mr-2"></i> Saldo Remanente
                            </h4>
                            <div class="space-y-4">
                                <input id="bf-efectivo" oninput="window.formatInputMoney(this); window.calcRemanentePermuta()" placeholder="Monto entregado en Efectivo en este acto ($)" class="w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-700 outline-none font-bold" />
                                <div class="flex items-center space-x-2">
                                    <span class="text-xs font-bold uppercase text-amber-700 dark:text-amber-500">Saldo a favor vendedor:</span>
                                    <input id="bf-remanente-num" disabled class="flex-1 rounded-xl px-4 py-2 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-600 outline-none font-black text-amber-800 dark:text-amber-400 text-right" />
                                </div>
                                <input id="bf-remanente-letras" placeholder="Saldo Remanente (En Letras)" class="w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-700 outline-none font-bold uppercase" />
                                <textarea id="bf-detalle-remanente" rows="2" placeholder="Detalle de pago del saldo (Ej: 12 Cuotas, Transferencia posterior, etc)" class="w-full rounded-xl px-4 py-3 bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-700 outline-none resize-none font-bold"></textarea>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                    <h4 class="font-black text-sm uppercase tracking-widest text-neutral-400 mb-4">Observaciones Finales</h4>
                    <textarea id="bf-obs" rows="2" placeholder="Cualquier aclaración extra para el boleto..." class="w-full rounded-xl px-4 py-3 bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 outline-none resize-none font-bold"></textarea>
                </div>

                <div class="flex space-x-4 pt-4">
                    <button type="button" onclick="window.closeModal('modal-boleto')" class="flex-1 py-4 bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200 rounded-xl font-black uppercase tracking-widest">Cancelar</button>
                    <button type="submit" class="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-lg">Generar Boleto P/Permuta</button>
                </div>
            </form>
        `;
    }

    window.openModal('modal-boleto');
    if (window.lucide) window.lucide.createIcons();
};

window.editarFormulario = (id) => {
    const f = window.state.formularios.find(x => x.id === id);
    if (!f) return;

    const tipo = f.tipo.includes('Permuta') ? 'permuta' : 'simple';
    
    // Limpiador blindado de números
    const formatNum = (val) => {
        if (val === undefined || val === null || val === '') return '';
        const cleaned = String(val).replace(/[^0-9]/g, '');
        if (!cleaned) return '';
        return new Intl.NumberFormat('es-AR').format(parseInt(cleaned, 10));
    };
    
    // Traductor automático: Si no hay letras guardadas, las genera al instante
    const getLetras = (val, prevLetras) => {
        if (prevLetras && prevLetras.trim() !== '') return prevLetras;
        if (!val) return '';
        const cleaned = String(val).replace(/[^0-9]/g, '');
        if (!cleaned) return '';
        return window.numeroALetras(Number(cleaned));
    };
    
    window.openModalBoleto(tipo);

    setTimeout(() => {
        window.state.tempFormData.id = f.id;
        window.state.tempFormData.autoIdAsociado = f.autoIdAsociado;

        if (tipo === 'simple') {
            document.getElementById('bf-vendedor').value = f.vendedor || 'MARTINELLI AUTOS';
            document.getElementById('bf-vendedor-domicilio').value = f.vendedorDomicilio || '';
            document.getElementById('bf-vendedor-loc').value = f.vendedorLoc || '';
            document.getElementById('bf-vendedor-tel').value = f.vendedorTel || '';
            
            // Asignaciones directas del comprador
            document.getElementById('bf-comprador').value = f.comprador || '';
            document.getElementById('bf-dni').value = f.dni || '';
            document.getElementById('bf-domicilio').value = f.domicilio || '';
            document.getElementById('bf-loc-comp').value = f.locComp || '';
            document.getElementById('bf-telefono').value = f.telefono || '';
            
            document.getElementById('bf-categoria').value = f.categoria || 'Automóvil';
            document.getElementById('bf-marca').value = f.marca || '';
            document.getElementById('bf-modelo').value = f.modelo || '';
            document.getElementById('bf-tipo').value = f.tipoVehiculo || 'Sedán';
            document.getElementById('bf-anio').value = f.año || '';
            document.getElementById('bf-motor').value = f.motor || '';
            document.getElementById('bf-chasis').value = f.chasis || '';
            document.getElementById('bf-dominio').value = f.dominio || '';
            
            document.getElementById('bf-monto').value = formatNum(f.monto);
            document.getElementById('bf-monto-letras').value = getLetras(f.monto, f.montoLetras);
            
            document.getElementById('bf-formapago').value = f.formaPago || '';
            document.getElementById('bf-dias-transf').value = f.diasTransf || '15';
            document.getElementById('bf-ciudad-firma').value = f.ciudadFirma || '';
            document.getElementById('bf-obs').value = f.observaciones || '';
        } else {
            document.getElementById('bf-vendedor').value = f.vendedor || 'MARTINELLI AUTOS';
            
            // Asignaciones directas del comprador
            document.getElementById('bf-comprador').value = f.comprador || '';
            document.getElementById('bf-dni').value = f.dni || '';
            document.getElementById('bf-telefono').value = f.telefono || '';
            document.getElementById('bf-domicilio').value = f.domicilio || '';
            document.getElementById('bf-loc-comp').value = f.locComp || '';
            
            document.getElementById('bf-marca').value = f.marca || '';
            document.getElementById('bf-modelo').value = f.modelo || '';
            document.getElementById('bf-anio').value = f.año || '';
            document.getElementById('bf-dominio').value = f.dominio || '';
            document.getElementById('bf-motor').value = f.motor || '';
            document.getElementById('bf-chasis').value = f.chasis || '';
            document.getElementById('bf-loc-pat').value = f.locPat || '';
            
            document.getElementById('bf-monto').value = formatNum(f.monto);
            document.getElementById('bf-monto-letras').value = getLetras(f.monto, f.montoLetras);
            
            document.getElementById('bf-efectivo').value = formatNum(f.efectivo);
            
            document.getElementById('bp-marca').value = f.p_marca || '';
            document.getElementById('bp-modelo').value = f.p_modelo || '';
            document.getElementById('bp-anio').value = f.p_anio || '';
            document.getElementById('bp-dominio').value = f.p_dominio || '';
            document.getElementById('bp-motor').value = f.p_motor || '';
            document.getElementById('bp-chasis').value = f.p_chasis || '';
            document.getElementById('bp-loc-pat').value = f.p_locPat || '';
            
            document.getElementById('bp-tasado').value = formatNum(f.p_tasado);
            document.getElementById('bp-tasado-letras').value = getLetras(f.p_tasado, f.p_tasadoLetras);
            
            window.calcRemanentePermuta();
            
            if (f.remanenteLetras) document.getElementById('bf-remanente-letras').value = f.remanenteLetras;
            if (f.detalleRemanente) document.getElementById('bf-detalle-remanente').value = f.detalleRemanente;
            document.getElementById('bf-obs').value = f.observaciones || '';
        }
    }, 100);
};

window.preGuardarBoleto = (e, tipo) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    let baseData = {};
    const fechaHoy = new Date().toISOString().split('T')[0];
    
    if (tipo === 'simple') { 
        baseData = {
            tipo: 'Boleto Compra Venta', 
            fecha: fechaHoy, 
            vendedor: document.getElementById('bf-vendedor').value,
            vendedorDomicilio: document.getElementById('bf-vendedor-domicilio').value, 
            vendedorLoc: document.getElementById('bf-vendedor-loc').value,
            vendedorTel: document.getElementById('bf-vendedor-tel').value, 
            comprador: document.getElementById('bf-comprador').value,
            dni: document.getElementById('bf-dni').value,
            domicilio: document.getElementById('bf-domicilio').value, 
            locComp: document.getElementById('bf-loc-comp').value,
            telefono: document.getElementById('bf-telefono').value, 
            categoria: document.getElementById('bf-categoria').value,
            marca: document.getElementById('bf-marca').value, 
            modelo: document.getElementById('bf-modelo').value,
            tipoVehiculo: document.getElementById('bf-tipo').value, 
            año: document.getElementById('bf-anio').value,
            motor: document.getElementById('bf-motor').value, 
            chasis: document.getElementById('bf-chasis').value,
            dominio: document.getElementById('bf-dominio').value.toUpperCase(), 
            monto: document.getElementById('bf-monto').value.replace(/[^0-9]/g, ''),
            montoLetras: document.getElementById('bf-monto-letras').value, 
            formaPago: document.getElementById('bf-formapago').value,
            diasTransf: document.getElementById('bf-dias-transf').value, 
            ciudadFirma: document.getElementById('bf-ciudad-firma').value,
            observaciones: document.getElementById('bf-obs').value, 
            estado: 'Pendiente' 
        };
    } else { 
        baseData = {
            tipo: 'Boleto Venta con Permuta', 
            fecha: fechaHoy, 
            vendedor: document.getElementById('bf-vendedor').value,
            comprador: document.getElementById('bf-comprador').value, 
            dni: document.getElementById('bf-dni').value,
            telefono: document.getElementById('bf-telefono').value, 
            domicilio: document.getElementById('bf-domicilio').value,
            locComp: document.getElementById('bf-loc-comp').value,
            marca: document.getElementById('bf-marca').value, 
            modelo: document.getElementById('bf-modelo').value,
            año: document.getElementById('bf-anio').value, 
            dominio: document.getElementById('bf-dominio').value.toUpperCase(),
            motor: document.getElementById('bf-motor').value, 
            chasis: document.getElementById('bf-chasis').value,
            locPat: document.getElementById('bf-loc-pat').value, 
            monto: document.getElementById('bf-monto').value.replace(/[^0-9]/g, ''),
            montoLetras: document.getElementById('bf-monto-letras').value, 
            efectivo: document.getElementById('bf-efectivo').value.replace(/[^0-9]/g, ''),
            p_marca: document.getElementById('bp-marca').value, 
            p_modelo: document.getElementById('bp-modelo').value,
            p_anio: document.getElementById('bp-anio').value, 
            p_dominio: document.getElementById('bp-dominio').value.toUpperCase(),
            p_motor: document.getElementById('bp-motor').value, 
            p_chasis: document.getElementById('bp-chasis').value,
            p_locPat: document.getElementById('bp-loc-pat').value, 
            p_tasado: document.getElementById('bp-tasado').value.replace(/[^0-9]/g, ''),
            p_tasadoLetras: document.getElementById('bp-tasado-letras').value, 
            remanenteLetras: document.getElementById('bf-remanente-letras').value,
            detalleRemanente: document.getElementById('bf-detalle-remanente').value, 
            observaciones: document.getElementById('bf-obs').value,
            estado: 'Pendiente' 
        };
    }
    
    const autoId = window.state.tempFormData?.autoIdAsociado || null; 
    const formId = window.state.tempFormData?.id || null;
    
    window.state.tempFormData = { ...baseData, autoIdAsociado: autoId, id: formId };
    
    if (autoId || formId) { 
        window.guardarYImprimirFormulario(autoId); 
    } else { 
        const selectBox = document.getElementById('asoc-auto-select');
        if(selectBox) {
            selectBox.innerHTML = `<option value="">-- Seleccionar Automóvil --</option>` + 
            window.state.autos.filter(a => a.estado !== 'Vendido').map(a => `<option value="${a.id}">${a.marca} ${a.modelo} (${a.patente})</option>`).join(''); 
        }
        
        window.closeModal('modal-boleto'); 
        const cont = document.getElementById('asoc-select-container');
        if(cont) {
            cont.classList.remove('hidden'); 
        }
        window.openModal('modal-asociar-form'); 
    }
};

window.imprimirBoletoHtml = (id) => {
    const data = window.state.formularios.find(x => x.id === id);
    if (!data) return;

    const printContent = document.getElementById('print-content');
    
    const globalLogo = document.getElementById('print-logo');
    if(globalLogo) globalLogo.classList.remove('hidden');

    let html = ``; // La hoja A4 y sus márgenes se definen globalmente en style.css.
    
    const sUpper = (val) => (val || '').toString().toUpperCase();
    const sStr = (val) => (val || '').toString();
    
    const sMoney = (val) => {
        if (!val) return '0';
        const cleaned = String(val).replace(/[^0-9]/g, '');
        if (!cleaned) return '0';
        return new Intl.NumberFormat('es-AR').format(parseInt(cleaned, 10));
    };

    if (data.tipo.includes('Permuta')) {
        html += `
            <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #000; text-align: justify;">
                <h2 style="text-align: center; text-transform: uppercase; text-decoration: underline; margin-bottom: 16px; font-size: 18px;">BOLETO DE COMPRA VENTA AUTOMOTOR CON PERMUTA</h2>
                
                <p>En la ciudad de <strong></strong>, Provincia de Entre Ríos, a los <strong>${window.formatDate(data.fecha)}</strong>, entre el señor/a <strong>${sUpper(data.vendedor)}</strong>, en adelante denominado "EL VENDEDOR", y el señor/a <strong>${sUpper(data.comprador)}</strong>, D.N.I. N° <strong>${sStr(data.dni)}</strong>, domiciliado en calle <strong>${sStr(data.domicilio)}</strong> de la localidad de <strong>${sUpper(data.locComp)}</strong>, teléfono <strong>${sStr(data.telefono)}</strong>, en adelante denominado "EL COMPRADOR", convienen en celebrar el presente contrato de Compra-Venta, sujeto a las siguientes cláusulas y condiciones:</p>

                <p><strong>PRIMERA:</strong> EL VENDEDOR vende y EL COMPRADOR compra un vehículo usado, cuyas características son las siguientes:<br>
                Marca: <strong>${sUpper(data.marca)}</strong> - Modelo: <strong>${sUpper(data.modelo)}</strong> - Año: <strong>${sStr(data.año)}</strong><br>
                Dominio: <strong>${sUpper(data.dominio)}</strong> - Motor N°: <strong>${sUpper(data.motor) || 'S/D'}</strong> - Chasis N°: <strong>${sUpper(data.chasis) || 'S/D'}</strong><br>
                Radicación actual: <strong>${sUpper(data.locPat) || 'S/D'}</strong>. En el estado en que se encuentra y que EL COMPRADOR declara conocer y aceptar, prestando plena conformidad.</p>

                <p><strong>SEGUNDA:</strong> El precio total y convenido de esta operación se fija en la suma de Pesos <strong>$ ${sMoney(data.monto)}</strong> (Son Pesos: <strong>${sUpper(data.montoLetras)}</strong>), que serán abonados de la siguiente forma:</p>
                
                <ul style="list-style-type: none; padding-left: 20px;">
                    <li><strong>A)</strong> La suma de Pesos <strong>$ ${sMoney(data.efectivo)}</strong> en dinero en efectivo, sirviendo el presente de suficiente recibo.</li>
                    <li><strong>B)</strong> EL COMPRADOR entrega en concepto de Permuta/Parte de pago, y EL VENDEDOR acepta, un vehículo de las siguientes características:<br>
                    Marca: <strong>${sUpper(data.p_marca)}</strong> - Modelo: <strong>${sUpper(data.p_modelo)}</strong> - Año: <strong>${sStr(data.p_anio)}</strong><br>
                    Dominio: <strong>${sUpper(data.p_dominio)}</strong> - Motor N°: <strong>${sUpper(data.p_motor) || 'S/D'}</strong> - Chasis N°: <strong>${sUpper(data.p_chasis) || 'S/D'}</strong>. Dicha unidad se tasa de común acuerdo en la suma de Pesos <strong>$ ${sMoney(data.p_tasado)}</strong> (Son Pesos: <strong>${sUpper(data.p_tasadoLetras)}</strong>).</li>
                    <li><strong>C)</strong> El saldo remanente de Pesos <strong>${sUpper(data.remanenteLetras) || 'CERO CON 00/100'}</strong> se cancelará de la siguiente manera: <strong>${sStr(data.detalleRemanente) || 'No aplica'}</strong>.</li>
                </ul>

                <p><strong>TERCERA:</strong> EL COMPRADOR asume a partir de la fecha y hora de entrega de la unidad toda responsabilidad civil y/o penal por accidentes, daños o perjuicios ocasionados con el vehículo, como así también las infracciones de tránsito que se cometieran.</p>

                <p><strong>CUARTA:</strong> Ambos vehículos objeto de este contrato se entregan con la documentación pertinente para su transferencia. Las partes se comprometen a realizar la transferencia de dominio dentro de los 15 días hábiles de la firma del presente. Todos los gastos de transferencia serán a cargo exclusivo de la parte compradora, salvo pacto en contrario.</p>
                
                ${data.observaciones ? `<p><strong>OBSERVACIONES:</strong> ${sStr(data.observaciones)}</p>` : ''}

                <p style="margin-top: 40px;">En prueba de conformidad, se firman dos (2) ejemplares de un mismo tenor y a un solo efecto en el lugar y fecha arriba indicados.</p>

                <div style="margin-top: 80px; display: flex; justify-content: space-around;">
                    <div style="text-align: center;">
                        <p style="border-top: 1px solid #000; padding-top: 5px; width: 250px;">Firma Vendedor</p>
                    </div>
                    <div style="text-align: center;">
                        <p style="border-top: 1px solid #000; padding-top: 5px; width: 250px;">Firma Comprador</p>
                        <p style="font-size: 12px; margin-top: 5px;">Aclaración / DNI:</p>
                    </div>
                </div>
            </div>
        `;
    } else {
        html += `
            <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #000; text-align: justify;">
                <h2 style="text-align: center; text-transform: uppercase; text-decoration: underline; margin-bottom: 16px; font-size: 18px;">BOLETO DE COMPRA VENTA AUTOMOTOR</h2>
                
                <p>En la ciudad de <strong>${sUpper(data.ciudadFirma)}</strong>, a los <strong>${window.formatDate(data.fecha)}</strong>, entre <strong>${sUpper(data.vendedor)}</strong>, domiciliado en <strong>${sStr(data.vendedorDomicilio)}</strong> de la localidad de <strong>${sStr(data.vendedorLoc)}</strong>, teléfono <strong>${sStr(data.vendedorTel)}</strong>, por una parte, en adelante "EL VENDEDOR", y por la otra parte el señor/a <strong>${sUpper(data.comprador)}</strong>, D.N.I. N° <strong>${sStr(data.dni)}</strong>, domiciliado en calle <strong>${sStr(data.domicilio)}</strong> de la localidad de <strong>${sStr(data.locComp)}</strong>, teléfono <strong>${sStr(data.telefono)}</strong>, en adelante "EL COMPRADOR", convienen en celebrar el presente boleto de compraventa, sujeto a las siguientes cláusulas:</p>

                <p><strong>PRIMERA:</strong> EL VENDEDOR vende y EL COMPRADOR adquiere un vehículo usado cuyas características son:<br>
                Tipo: <strong>${sUpper(data.tipoVehiculo) || 'S/D'}</strong> - Categoría: <strong>${sUpper(data.categoria) || 'S/D'}</strong><br>
                Marca: <strong>${sUpper(data.marca)}</strong> - Modelo: <strong>${sUpper(data.modelo)}</strong> - Año: <strong>${sStr(data.año)}</strong><br>
                Dominio: <strong>${sUpper(data.dominio)}</strong> - Motor N°: <strong>${sUpper(data.motor) || 'S/D'}</strong> - Chasis N°: <strong>${sUpper(data.chasis) || 'S/D'}</strong>.<br>
                El vehículo se entrega en el estado general que se encuentra, siendo conocido y aceptado por el comprador, quien declara haberlo revisado a su entera satisfacción.</p>

                <p><strong>SEGUNDA:</strong> El precio total y definitivo de esta venta se conviene en la suma de Pesos <strong>$ ${sMoney(data.monto)}</strong> (Son Pesos: <strong>${sUpper(data.montoLetras)}</strong>). Dicho importe es abonado de la siguiente manera: <strong>${sStr(data.formaPago)}</strong>.</p>

                <p><strong>TERCERA:</strong> El comprador se hace cargo a partir del momento de la firma y entrega de la unidad, de toda responsabilidad civil y/o penal derivada de accidentes de tránsito, daños a terceros, infracciones municipales o policiales, asumiendo la guarda del mismo.</p>

                <p><strong>CUARTA:</strong> El comprador asume la obligación de realizar la transferencia de dominio a su nombre o de quien indique en el plazo perentorio de <strong>${sStr(data.diasTransf)}</strong> días hábiles, siendo todos los gastos, aranceles y honorarios que demande la misma por su exclusiva cuenta y orden.</p>
                
                ${data.observaciones ? `<p><strong>OBSERVACIONES:</strong> ${sStr(data.observaciones)}</p>` : ''}

                <p style="margin-top: 40px;">De plena conformidad, se leen y firman dos (2) ejemplares de idéntico tenor en el lugar y fecha consignados en el encabezamiento.</p>

                <div style="margin-top: 80px; display: flex; justify-content: space-around;">
                    <div style="text-align: center;">
                        <p style="border-top: 1px solid #000; padding-top: 5px; width: 250px;">Firma Vendedor</p>
                    </div>
                    <div style="text-align: center;">
                        <p style="border-top: 1px solid #000; padding-top: 5px; width: 250px;">Firma Comprador</p>
                        <p style="font-size: 12px; margin-top: 5px;">Aclaración / DNI:</p>
                    </div>
                </div>
            </div>
        `;
    }

    printContent.innerHTML = html;
    
    document.getElementById('app-wrapper').classList.add('hidden');
    document.getElementById('print-section').classList.remove('hidden');
    
    setTimeout(() => {
        window.print();
        document.getElementById('print-section').classList.add('hidden');
        document.getElementById('app-wrapper').classList.remove('hidden');
    }, 500);
};
