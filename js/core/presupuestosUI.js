/**
 * presupuestosUI.js
 * Módulo para calcular y renderizar el consumo de presupuestos mensuales
 * utilizando la arquitectura relacional (UUIDs) y la inmutabilidad de la moneda base (USD).
 */

import { AppState } from './state.js';
import { escapeHTML } from './coreUI.js';

// ==========================================
// 1. Cálculo de Consumo de Presupuesto
// ==========================================
/**
 * Filtra los gastos del mes y los agrupa por categoría, cruzándolos con los presupuestos.
 * @param {String} mesAnio - Cadena 'YYYY-MM'
 * @param {Array} transacciones - Historial completo en AppState
 * @param {Array} presupuestos - Límites mensuales establecidos en AppState
 * @returns {Object} - Objeto con datos consolidados
 */
export function calcularConsumoPresupuesto(mesAnio, transacciones, presupuestos) {
    const consumos = {};       // { categoria_id: monto_consumido_usd }
    const limites = {};        // { categoria_id: limite_establecido_usd }
    const presupuestados = []; // Array de objetos enriquecidos con su límite y consumo
    let gastosSinPresupuesto = 0;

    // 1. Extraer límites de presupuesto vigentes para este mes (o sin especificar mes para fallback general)
    // En este caso, asumimos que el modelo relacional usa mes_anio exacto.
    const presupuestosDelMes = presupuestos.filter(p => p.mes_anio === mesAnio);
    
    presupuestosDelMes.forEach(p => {
        limites[p.categoria_id] = parseFloat(p.monto_limite) || 0;
        consumos[p.categoria_id] = 0; // Inicializar en cero
    });

    // 2. Filtrar gastos válidos del mes y acumular consumos inmutables en USD
    const gastosDelMes = transacciones.filter(t => 
        t.tipo === 'gasto' && 
        !t.legacy && 
        !t._deleted && 
        t.fecha && t.fecha.startsWith(mesAnio)
    );

    gastosDelMes.forEach(t => {
        const mUSD = parseFloat(t.monto_usd_calculado) || 0;
        
        if (t.categoria_id && limites[t.categoria_id] !== undefined) {
            consumos[t.categoria_id] += mUSD;
        } else {
            // El gasto pertenece a una categoría que NO tiene presupuesto asignado este mes
            gastosSinPresupuesto += mUSD;
        }
    });

    // 3. Cruzar los datos y construir el arreglo para la UI
    presupuestosDelMes.forEach(p => {
        const catObj = AppState.categorias.find(c => c.id === p.categoria_id);
        const nombreCat = catObj ? catObj.nombre : "Categoría Desconocida";
        const iconoCat = catObj ? catObj.icono : "🏷️";
        
        const consumo = consumos[p.categoria_id];
        const limite = limites[p.categoria_id];
        
        presupuestados.push({
            categoria_id: p.categoria_id,
            nombre: nombreCat,
            icono: iconoCat,
            limite: limite,
            consumido: consumo,
            porcentaje: limite > 0 ? (consumo / limite) * 100 : 0
        });
    });

    // Ordenar de mayor a menor porcentaje de consumo
    presupuestados.sort((a, b) => b.porcentaje - a.porcentaje);

    return { presupuestados, gastosSinPresupuesto };
}

// ==========================================
// 2. Renderizado de Interfaz (DOM)
// ==========================================
export function renderizarPresupuestos() {
    const grid = document.getElementById('gridPresupuestos');
    if (!grid) return;

    // Obtener mes actual
    const hoy = new Date();
    const mesAnio = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

    // Validar si el estado tiene la estructura de arrays (fallback preventivo)
    const presupuestosArray = Array.isArray(AppState.presupuestos) ? AppState.presupuestos : [];

    const calculo = calcularConsumoPresupuesto(mesAnio, AppState.transacciones, presupuestosArray);

    if (calculo.presupuestados.length === 0 && calculo.gastosSinPresupuesto === 0) {
        grid.innerHTML = `<p class="text-xs text-slate-500 text-center py-4 w-full col-span-full">No has establecido presupuestos para este mes.</p>`;
        document.getElementById('contenedorAlertasPresupuesto')?.classList.add('hidden');
        return;
    }

    let html = '';
    let alertasHTML = '';

    // Renderizar tarjetas presupuestadas
    calculo.presupuestados.forEach(item => {
        const { nombre, icono, limite, consumido, porcentaje } = item;
        
        let colorBarra = 'bg-azulelectrico';
        let colorFondoBarra = 'bg-slate-200 dark:bg-slate-800';
        let textoStatus = `<span class="text-[10px] text-slate-500">Quedan <strong class="text-azulelectrico dark:text-azulcielo">$${(limite - consumido).toFixed(2)}</strong></span>`;

        // Reglas de negocio de UI para presupuestos
        if (porcentaje >= 100) {
            colorBarra = 'bg-rose-500'; // Sobrepasó
            colorFondoBarra = 'bg-rose-500/20';
            const sobregiro = consumido - limite;
            textoStatus = `<span class="text-[10px] font-black text-rose-500">Sobregiro: -$${sobregiro.toFixed(2)}</span>`;
            
            alertasHTML += `
            <div class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2">
                <span class="text-rose-500">⚠️</span>
                <p class="text-[10px] text-rose-600 dark:text-rose-400 font-bold leading-tight mt-0.5">Has superado tu límite en <strong>${escapeHTML(nombre)}</strong> por $${sobregiro.toFixed(2)}.</p>
            </div>`;
        } 
        else if (porcentaje >= 80) {
            colorBarra = 'bg-amber-500'; // Peligro
            colorFondoBarra = 'bg-amber-500/20';
            textoStatus = `<span class="text-[10px] text-amber-600 dark:text-amber-400 font-bold">¡Cerca del límite! (Quedan $${(limite - consumido).toFixed(2)})</span>`;
        }

        const widthBarra = Math.min(porcentaje, 100);

        html += `
        <div class="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-azulcielo/20 shadow-sm relative overflow-hidden flex flex-col justify-between group">
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-xl shrink-0">${icono}</span>
                    <h3 class="text-xs font-bold text-slate-800 dark:text-crema truncate w-24 sm:w-32">${escapeHTML(nombre)}</h3>
                </div>
                <div class="text-right">
                    <p class="text-sm font-black text-slate-900 dark:text-white tabular-nums">$${consumido.toFixed(2)}</p>
                    <p class="text-[9px] text-slate-400 font-bold uppercase tracking-wide">de $${limite.toFixed(2)}</p>
                </div>
            </div>

            <!-- Barra de Progreso -->
            <div class="w-full h-2 rounded-full ${colorFondoBarra} mt-1 relative overflow-hidden">
                <div class="h-full ${colorBarra} transition-all duration-500" style="width: ${widthBarra}%"></div>
            </div>
            
            <div class="flex justify-between items-center mt-2">
                ${textoStatus}
                <span class="text-[10px] font-black ${porcentaje >= 100 ? 'text-rose-500' : 'text-slate-400'}">${porcentaje.toFixed(0)}%</span>
            </div>
        </div>`;
    });

    // Anexar tarjeta para gastos NO presupuestados si existen
    if (calculo.gastosSinPresupuesto > 0) {
        html += `
        <div class="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 shadow-none flex flex-col justify-center items-center text-center">
            <span class="text-2xl opacity-50 mb-1">👻</span>
            <p class="text-sm font-black text-slate-600 dark:text-slate-400 tabular-nums mb-0.5">$${calculo.gastosSinPresupuesto.toFixed(2)}</p>
            <p class="text-[10px] font-bold text-slate-500 dark:text-slate-500 px-2 leading-tight">Gastos sin presupuesto asignado este mes.</p>
        </div>`;
    }

    grid.innerHTML = html;

    // Inyectar Alertas (si existen sobregiros)
    const contenedorAlertas = document.getElementById('contenedorAlertasPresupuesto');
    if (contenedorAlertas) {
        if (alertasHTML) {
            contenedorAlertas.innerHTML = alertasHTML;
            contenedorAlertas.classList.remove('hidden');
        } else {
            contenedorAlertas.innerHTML = '';
            contenedorAlertas.classList.add('hidden');
        }
    }
}