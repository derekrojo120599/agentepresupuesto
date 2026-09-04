/**
 * sync.js
 * Servicio de sincronización "Optimistic UI" con LocalStorage y Supabase.
 */
import { AppState, guardarCacheLocal, notificarCambioEstado } from './state.js';

// NOTA: Se asume que supabaseClient está disponible globalmente o se importa
// import { supabaseClient } from '../services/supabaseService.js'; 
// Para mantener compatibilidad con el entorno actual que usa variables globales:
const getSupabase = () => window.supabaseClient;

// 4. Offline-First: Guardar movimiento
export async function guardarOperacion(tabla, accion, payload) {
    const supabase = getSupabase();

    // 1. Optimistic UI: Insertar en memoria local primero
    if (accion === 'INSERT' && tabla === 'transacciones') {
        AppState.transacciones.unshift(payload);
    } else if (accion === 'INSERT' && tabla === 'cuentas') {
        AppState.cuentas.push(payload);
    }
    // Lógica similar para UPDATE/DELETE en memoria local...
    
    // 2. Encolar la petición de red (Action Queue)
    AppState.colaOffline.push({
        tabla,
        accion,
        datos: payload,
        timestamp: Date.now()
    });

    // 3. Guardar persistencia local y redibujar DOM
    guardarCacheLocal();
    notificarCambioEstado(); 

    // 4. Intentar sincronización background (Si estamos online, limpia la cola)
    if (navigator.onLine && supabase) {
        await procesarColaOffline();
    }
}

// Procesar cola pendiente enviando a Supabase
export async function procesarColaOffline() {
    const supabase = getSupabase();
    if (!navigator.onLine || AppState.colaOffline.length === 0 || !supabase) return;

    // Clonamos la cola para evitar problemas de concurrencia mientras iteramos
    const operaciones = [...AppState.colaOffline];
    
    for (const op of operaciones) {
        try {
            // Filtrar propiedades internas (limpiar flag '_isPending')
            const payload = { ...op.datos };
            delete payload._isPending;

            let error = null;
            if (op.accion === 'INSERT') {
                const { error: err } = await supabase.from(op.tabla).insert([payload]);
                error = err;
            } else if (op.accion === 'UPDATE') {
                const { error: err } = await supabase.from(op.tabla).update(payload).eq('id', payload.id);
                error = err;
            } else if (op.accion === 'DELETE') {
                const { error: err } = await supabase.from(op.tabla).delete().eq('id', op.datos.id);
                error = err;
            }

            if (error) throw error;

            // Operación exitosa, la eliminamos de la cola
            AppState.colaOffline = AppState.colaOffline.filter(o => o.timestamp !== op.timestamp);
            
            // Si era un insert local pendiente, quitarle el estado pendiente
            if (op.accion === 'INSERT' && op.tabla === 'transacciones') {
                const memItem = AppState.transacciones.find(t => t.id === op.datos.id);
                if (memItem) delete memItem._isPending;
            }

        } catch (error) {
            console.error("Fallo al sincronizar operación:", op, error);
            // Si el error es de red, no hacemos nada y quedará para la próxima.
            
            // Si es un error 400 (mal formato/Constraint de PostgreSQL)
            // hay que sacarlo de la cola para que no tranque el sistema (Loop infinito).
            if (error.code && (error.code.startsWith('23') || error.code.startsWith('22'))) { 
                console.warn("Operación descartada por error de integridad (Constraint):", error.message);
                AppState.colaOffline = AppState.colaOffline.filter(o => o.timestamp !== op.timestamp);
            }
        }
    }
    
    // Asegurarnos de que el status de la cola se guarde
    guardarCacheLocal();
    notificarCambioEstado();
}
