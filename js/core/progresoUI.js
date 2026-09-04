/**
 * progresoUI.js
 * Lógica para calcular y renderizar el progreso de Metas de Ahorro y Deudas usando UUIDs relacionales.
 */

import { AppState } from './state.js';
import { escapeHTML } from './coreUI.js'; // Asumimos que exportaste escapeHTML en coreUI.js

// ==========================================
// 1. Cálculo de Progreso
// ==========================================
/**
 * Calcula el progreso de items (Metas o Deudas) cruzando con las transacciones por UUID.
 * @param {Array} items - Arreglo de metas o deudas
 * @param {Array} transacciones - Historial completo de la app
 * @param {String} tipoRelacion - 'meta_id' o 'deuda_id'
 * @returns {Object} - Diccionario con la suma total abonada por cada UUID
 */
export function calcularProgresoGlobal(items, transacciones, tipoRelacion) {
    const sumatoria = {};

    // Inicializamos en 0 cada item conocido
    items.forEach(item => sumatoria[item.id] = 0);

    // Iteramos transacciones (omitiendo legacy/borradas)
    transacciones.filter(t => !t.legacy && !t._deleted).forEach(t => {
        const mUSD = parseFloat(t.monto_usd_calculado);
        
        // Sumamos al acumulado si el UUID de la transacción coincide con la clave relacional buscada
        if (tipoRelacion === 'meta_id' && t.tipo === 'ahorro' && t.meta_id) {
            if (sumatoria[t.meta_id] !== undefined) sumatoria[t.meta_id] += mUSD;
        } 
        else if (tipoRelacion === 'deuda_id' && t.tipo === 'abono_deuda' && t.deuda_id) {
            if (sumatoria[t.deuda_id] !== undefined) sumatoria[t.deuda_id] += mUSD;
        }
    });

    return sumatoria;
}

// ==========================================
// 2. Renderizado de Metas de Ahorro
// ==========================================
export function renderizarMetasAhorro() {
    const grid = document.getElementById('gridMetasAhorro');
    if (!grid) return;

    if (AppState.metasAhorro.length === 0) {
        grid.innerHTML = `<p class="text-xs text-slate-500 text-center py-4 w-full col-span-full">No has creado metas de ahorro aún.</p>`;
        return;
    }

    // Calcular el dinero abonado a cada meta UUID
    const progresos = calcularProgresoGlobal(AppState.metasAhorro, AppState.transacciones, 'meta_id');

    let html = '';

    AppState.metasAhorro.forEach(meta => {
        const acumulado = progresos[meta.id] || 0;
        const objetivo = parseFloat(meta.monto_objetivo) || 1; // Evitar división por cero
        let porcentaje = (acumulado / objetivo) * 100;
        if (porcentaje > 100) porcentaje = 100;

        const estaCompletada = porcentaje >= 100;
        const colorBarra = estaCompletada ? 'bg-emerald-500' : 'bg-azulcielo';
        const colorBgBarra = estaCompletada ? 'bg-emerald-500/20' : 'bg-azulcielo/20';

        html += `
        <div class="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-azulcielo/20 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div class="flex justify-between items-start mb-2 z-10">
                <div class="flex items-center gap-2">
                    <span class="text-xl">${meta.icono || '🎯'}</span>
                    <div>
                        <h3 class="text-xs font-bold text-slate-800 dark:text-crema truncate w-32">${escapeHTML(meta.nombre)}</h3>
                        <p class="text-[10px] text-slate-500">$${acumulado.toFixed(2)} / $${objetivo.toFixed(2)}</p>
                    </div>
                </div>
                <div class="flex items-center gap-1">
                    <button class="text-xs text-slate-400 hover:text-azulelectrico transition" onclick="editarMeta('${meta.id}')">✏️</button>
                    <button class="text-xs text-slate-400 hover:text-coral transition" onclick="eliminarMeta('${meta.id}')">🗑️</button>
                </div>
            </div>

            <!-- Barra de Progreso -->
            <div class="w-full h-2 rounded-full ${colorBgBarra} mt-2 z-10 relative overflow-hidden">
                <div class="h-full ${colorBarra} transition-all duration-500" style="width: ${porcentaje}%"></div>
            </div>
            
            <p class="text-[9px] text-right font-black mt-1 ${estaCompletada ? 'text-emerald-500' : 'text-azulcielo'}">${porcentaje.toFixed(0)}%</p>
            
            ${estaCompletada ? '<div class="absolute -right-4 -bottom-4 text-6xl opacity-10">🏆</div>' : ''}
        </div>`;
    });

    grid.innerHTML = html;
}

// ==========================================
// 3. Renderizado de Deudas
// ==========================================
export function renderizarDeudas() {
    const grid = document.getElementById('gridDeudas');
    if (!grid) return;

    if (AppState.deudas.length === 0) {
        grid.innerHTML = `<p class="text-xs text-slate-500 text-center py-4 w-full col-span-full">No tienes deudas activas.</p>`;
        return;
    }

    // Calcular el dinero abonado a cada deuda UUID
    const pagos = calcularProgresoGlobal(AppState.deudas, AppState.transacciones, 'deuda_id');

    let html = '';

    AppState.deudas.forEach(deuda => {
        const abonado = pagos[deuda.id] || 0;
        const totalDeuda = parseFloat(deuda.monto_inicial) || 1;
        let porcentajePagado = (abonado / totalDeuda) * 100;
        if (porcentajePagado > 100) porcentajePagado = 100;

        const saldoPendiente = Math.max(0, totalDeuda - abonado);
        const estaPagada = porcentajePagado >= 100;

        html += `
        <div class="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-coral/20 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div class="flex justify-between items-start mb-2 z-10">
                <div class="flex items-center gap-2">
                    <span class="text-xl">💸</span>
                    <div>
                        <h3 class="text-xs font-bold text-slate-800 dark:text-crema truncate w-32">${escapeHTML(deuda.nombre)}</h3>
                        <p class="text-[10px] text-slate-500">Pendiente: <strong class="${estaPagada ? 'text-emerald-500' : 'text-coral'}">$${saldoPendiente.toFixed(2)}</strong></p>
                    </div>
                </div>
                <div class="flex items-center gap-1">
                    ${!estaPagada ? `<button class="text-[10px] px-2 py-0.5 rounded bg-coral/10 text-coral hover:bg-coral hover:text-white transition font-bold" onclick="abrirAbonoDeuda('${deuda.id}')">Abonar</button>` : ''}
                    <button class="text-xs text-slate-400 hover:text-azulelectrico ml-1" onclick="editarDeuda('${deuda.id}')">✏️</button>
                </div>
            </div>

            <!-- Barra de Progreso de Pago -->
            <div class="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 mt-2 z-10 relative overflow-hidden">
                <div class="h-full bg-coral transition-all duration-500" style="width: ${porcentajePagado}%"></div>
            </div>
            
            <p class="text-[9px] text-right font-black mt-1 ${estaPagada ? 'text-emerald-500' : 'text-coral/80'}">${porcentajePagado.toFixed(0)}% Pagado</p>
        </div>`;
    });

    grid.innerHTML = html;
}