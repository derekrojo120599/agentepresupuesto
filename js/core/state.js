/**
 * state.js
 * Centralizador del Estado Global.
 */

export const AppState = {
    cuentas: [],
    categorias: [],
    presupuestos: [],
    deudas: [],
    metasAhorro: [],
    transacciones: [],
    colaOffline: [],
    tasaBinanceVigente: 1
};

// Cargar estado inicial desde caché local (Offline-First)
export function hidratarEstadoLocal() {
    try {
        const cache = localStorage.getItem('presupuesto_v4_cache');
        if (cache) {
            const parsed = JSON.parse(cache);
            Object.assign(AppState, parsed);
        }
    } catch (e) {
        console.error("Error al hidratar estado:", e);
    }
}

// Guardar el estado completo en el almacenamiento local
export function guardarCacheLocal() {
    try {
        // Filtramos para no guardar funciones ni estado UI efímero, solo data persistente
        const dataToCache = { ...AppState };
        delete dataToCache.tasaBinanceVigente; // La tasa no se cachea, siempre se busca fresca
        localStorage.setItem('presupuesto_v4_cache', JSON.stringify(dataToCache));
    } catch (e) {
        console.error("Error al guardar caché:", e);
    }
}

// Disparador genérico para que la Interfaz Reactiva se actualice sola
export function notificarCambioEstado() {
    document.dispatchEvent(new CustomEvent('appStateChanged', { detail: AppState }));
}

// 5. Snapshots Mensuales (Arranque de mes)
export function ejecutarCierreDeMes() {
    const ultimoCierreStr = localStorage.getItem('ultimo_cierre_mes');
    const hoy = new Date();
    
    // Ejecutar snapshot si estamos en el día 28 en adelante o si cambiamos de mes
    const esFinDeMes = hoy.getDate() >= 28; 
    let mesActual = hoy.getMonth();
    
    let mesUltimoCierre = ultimoCierreStr ? new Date(ultimoCierreStr).getMonth() : -1;

    // Si no se ha hecho el cierre este mes, procedemos:
    if (mesUltimoCierre !== mesActual) {
        if (esFinDeMes) {
            console.log("Ejecutando cierre de mes: Guardando snapshot del balance...");
            
            // Aquí consolidamos los balances. En un sistema real se guardaría en una tabla de 'snapshots_mensuales'
            const snapshot = {
                fecha: hoy.toISOString(),
                balances: AppState.cuentas.map(c => ({ id: c.id, moneda: c.moneda })),
                deudaTotal: AppState.deudas.reduce((acc, d) => acc + parseFloat(d.monto_inicial), 0)
                // Se guardaría en localStorage por ahora
            };

            let historicoSnapshots = JSON.parse(localStorage.getItem('snapshots_mensuales') || '[]');
            historicoSnapshots.push(snapshot);
            localStorage.setItem('snapshots_mensuales', JSON.stringify(historicoSnapshots));
            
            localStorage.setItem('ultimo_cierre_mes', hoy.toISOString());
        }
    }
}