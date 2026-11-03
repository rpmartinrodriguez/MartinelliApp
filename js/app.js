// ==========================================
// js/app.js
// ==========================================

// Generador de IDs simples
window.generateId = () => {
    return Math.random().toString(36).substr(2, 9);
};

// Actualizador Global de Vistas (Auto-Refresco Local)
window.reRenderActiveViews = () => {
    if (window.renderAutosView) window.renderAutosView();
    if (window.renderClientesView) window.renderClientesView();
    if (window.renderFormulariosView) window.renderFormulariosView();
    if (window.renderPersonalView) window.renderPersonalView();
    if (window.renderDashboard) window.renderDashboard();
    if (window.renderCajaView) window.renderCajaView();
    
    // Si hay un modal abierto, lo actualizamos también
    if (window.state && window.state.selectedAutoId && window.renderDetalleAuto && document.getElementById('modal-detalle-auto') && !document.getElementById('modal-detalle-auto').classList.contains('hidden')) {
        window.renderDetalleAuto();
    }
};

// --- FUNCIONES FIREBASE CRUD ---
window.fbAdd = async (coleccion, data) => {
    try {
        if (coleccion === 'autos') {
            data.createdAt ||= Date.now();
            data.updatedAt = Date.now();
        }
        const docRef = await window.addDoc(window.collection(window.db, coleccion), data);
        data.id = docRef.id;
        if (coleccion === 'autos') {
            try { await window.registrarNovedadFlota?.('alta', data, null); }
            catch (err) { console.warn('Vehículo guardado, pero no se pudo guardar la novedad de Flota', err); }
        }
        
        if(window.state[coleccion]) {
            window.state[coleccion].push(data);
        }
        
        // Magia: Forzamos el refresco visual al instante sin F5
        window.reRenderActiveViews();
        
        return docRef;
    } catch (e) {
        console.error("Error añadiendo documento: ", e);
        throw e;
    }
};

window.fbUpdate = async (coleccion, id, data) => {
    try {
        const anterior = coleccion === 'autos' ? window.state.autos.find(a=>a.id===id) : null;
        if (coleccion === 'autos') data.updatedAt = Date.now();
        const docRef = window.doc(window.db, coleccion, id);
        await window.updateDoc(docRef, data);
        if (coleccion === 'autos') {
            try { await window.registrarNovedadFlota?.('cambio', {...anterior,...data,id}, anterior); }
            catch (err) { console.warn('Vehículo actualizado, pero no se pudo registrar la novedad', err); }
        }
        
        if(window.state[coleccion]) {
            const index = window.state[coleccion].findIndex(item => item.id === id);
            if(index !== -1) {
                window.state[coleccion][index] = { ...window.state[coleccion][index], ...data };
            }
        }
        
        // Magia: Forzamos el refresco visual al instante sin F5
        window.reRenderActiveViews();
        
    } catch (e) {
        console.error("Error actualizando documento: ", e);
        throw e;
    }
};

window.fbDelete = async (coleccion, id) => {
    try {
        const anterior = coleccion === 'autos' ? window.state.autos.find(a=>a.id===id) : null;
        const docRef = window.doc(window.db, coleccion, id);
        await window.deleteDoc(docRef);
        if (coleccion === 'autos') {
            try { await window.registrarNovedadFlota?.('baja', null, anterior); }
            catch (err) { console.warn('Vehículo eliminado, pero no se pudo registrar la novedad', err); }
        }
        
        if(window.state[coleccion]) {
            window.state[coleccion] = window.state[coleccion].filter(item => item.id !== id);
        }
        
        // Magia: Forzamos el refresco visual al instante sin F5
        window.reRenderActiveViews();
        
    } catch (e) {
        console.error("Error eliminando documento: ", e);
        throw e;
    }
};

// --- FIREBASE AUTH: cargar datos solo despues de una sesion real ---
window.bootApp = async (authUser) => {
    const loader = document.getElementById('app-loader');
    try {
        const profileRef = window.doc(window.db, 'usuarios', authUser.uid);
        const profile = await window.fbGetDoc(profileRef);
        if (!profile.exists() || profile.data().activo === false) {
            throw new Error('El usuario no tiene un perfil activo en la colección usuarios. Contactá al administrador.');
        }
        const p = profile.data();
        if (!['Admin','Encargado','Vendedor'].includes(p.rol)) {
            throw new Error('El usuario no tiene un rol válido.');
        }
        // El identificador siempre proviene de Authentication, nunca de localStorage.
        window.state.currentUser = { ...p, id: authUser.uid, email: authUser.email };
        const names = ['autos','usuarios','sucursales','transacciones',
                       'ventas','formularios','consultas','comisiones','cierres_personal'];
        // CRM con consulta acotada al rol: evita descargar carteras ajenas.
        const queryCRM = () => {
            const base = window.collection(window.db, 'consultas');
            if (p.rol === 'Admin') return base;
            if (p.rol === 'Encargado' && p.sucursalId)
                return window.fbQuery(base, window.fbWhere('sucursalId', '==', p.sucursalId));
            return window.fbQuery(base, window.fbWhere('userId', '==', authUser.uid));
        };
        const results = await Promise.all(names.map(name =>
            window.fbGetDocsFromServer(name === 'consultas' ? queryCRM() : window.collection(window.db, name))
        ));
        names.forEach((name, i) => {
            window.state[name] = results[i].docs.map(d => ({ id: d.id, ...d.data() }));
        });
        window.initSelects?.();
        window.launchApp?.();
        if (new URLSearchParams(location.search).get('seccion') === 'flota') {
            window.switchTab?.('flota');
        }
        // Mostrar cambios de Flota pendientes al iniciar sesión, nunca los de Caja/CRM.
        window.mostrarNovedadesFlotaAlEntrar?.();
        // Abrir la ficha al tocar una notificación, solo después de autenticar.
        const deepClient = new URLSearchParams(location.search).get("cliente");
        if (deepClient) setTimeout(() => { if (window.state.consultas?.some(c=>c.id===deepClient)) { window.switchTab?.("crm"); window.openDetalleLead?.(deepClient); } }, 550);
        // Escuchar cambios de flota y CRM en tiempo real (otros vendedores / otros dispositivos).
        window.crmLiveUnsub?.(); window.flotaLiveUnsub?.();
        window.crmLiveUnsub = window.fbOnSnapshot(queryCRM(), snapshot => {
            if(window.state.currentUser?.id !== authUser.uid)return;
            window.state.consultas = snapshot.docs.map(d => ({id:d.id,...d.data()}));
            window.reRenderActiveViews?.(); window.updateNotifications?.();
        }, err => console.error('CRM en tiempo real:',err));
        window.flotaLiveUnsub = window.fbOnSnapshot(window.collection(window.db,'autos'), snapshot => {
            if(window.state.currentUser?.id !== authUser.uid)return;
            window.state.autos = snapshot.docs.map(d => ({id:d.id,...d.data()}));
            window.reRenderActiveViews?.(); window.updateNotifications?.();
        }, err => console.error('Flota en tiempo real:',err));
    } catch (e) {
        console.error('Error al iniciar Martinelli:', e);
        window.state.currentUser = null;
        try { await window.fbSignOut(window.fbAuth); } catch (_) {}
        window.showLogin?.();
        const error = document.getElementById('login-error');
        if (error) {
            error.innerText = e.message || 'No fue posible iniciar la aplicación.';
            error.classList.remove('hidden');
        }
    } finally { loader?.classList.add('hidden'); }
};
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.firebaseReady;
        window.fbOnAuthStateChanged(window.fbAuth, async user => {
            if (user) {
                await window.bootApp(user);
            } else {
                window.crmLiveUnsub?.(); window.flotaLiveUnsub?.();
                window.crmLiveUnsub = null; window.flotaLiveUnsub = null;
                window.state.currentUser = null;
                document.getElementById('app-loader')?.classList.add('hidden');
                window.showLogin?.();
            }
        });
    } catch (e) {
        console.error('No se pudo inicializar Firebase:', e);
        document.getElementById('app-loader')?.classList.add('hidden');
        window.showLogin?.();
    }
});
