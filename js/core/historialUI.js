/**
 * historialUI.js
 * Función para renderizar el Historial de Transacciones con la nueva arquitectura relacional multimoneda.
 */

import { AppState } from './state.js';
import { escapeHTML } from './coreUI.js';

// Funciones auxiliares de mapeo relacional
function obtenerNombreCategoria(id) {
    if (!id) return "Sin Categoría";
    const cat = AppState.categorias?.find(c => c.id === id);
    return cat ? `${cat.icono || '🏷️'} ${cat.nombre}` : "Categoría Eliminada";
}

function obtenerNombreCuenta(id) {
    if (!id) return null;
    const cuenta = AppState.cuentas?.find(c => c.id === id);
    return cuenta ? cuenta.nombre : "Cuenta Eliminada";
}

// Función principal de renderizado
export function renderizarHistorial(transacciones = AppState.transacciones) {
    const tablaDesktop = document.getElementById("tablaHistorial");
    const listaMobile = document.getElementById("listaHistorialMobile");
    
    if (!tablaDesktop || !listaMobile) return;

    let htmlDesktop = "";
    let htmlMobile = "";

    // Filtramos eliminados lógicos y ordenamos por fecha descendente
    const txSorted = [...transacciones]
        .filter(t => !t._deleted)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (txSorted.length === 0) {
        const emptyMsg = `<tr><td colspan="6" class="text-center p-6 text-slate-500 text-sm">No hay transacciones registradas.</td></tr>`;
        tablaDesktop.innerHTML = emptyMsg;
        listaMobile.innerHTML = `<p class="text-center p-4 text-slate-500 text-sm">No hay transacciones registradas.</p>`;
        return;
    }

    txSorted.forEach(t => {
        const isLegacy = t.legacy === true || t.legacy === 'true';
        
        // Clases visuales para aislar legacy
        const rowClass = isLegacy ? "opacity-60 grayscale bg-slate-50 dark:bg-slate-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition bg-white dark:bg-slate-900";
        const tagLegacy = isLegacy ? `<span class="ml-2 text-[8px] font-black bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-widest border border-slate-300">Antiguo</span>` : "";

        // Formateo Multimoneda
        const montoOrig = parseFloat(t.monto_original || t.monto || 0).toFixed(2);
        const moneda = t.moneda || 'USD';
        const simbolo = moneda === 'USD' ? '$' : 'Bs';
        
        const usdFijo = parseFloat(t.monto_usd_calculado || t.monto || 0).toFixed(2);
        const tasaStr = parseFloat(t.tasa_cambio || 1).toLocaleString('es-VE', { minimumFractionDigits: 2 });
        
        const esConversion = moneda !== 'USD' && !isLegacy;
        const textoSecundarioMoneda = esConversion 
            ? `<span class="block text-[9px] text-slate-500 font-medium mt-0.5">~ $${usdFijo} | Tasa: ${tasaStr}</span>`
            : `<span class="block text-[9px] text-slate-400 font-medium mt-0.5">Valor Base Fijo</span>`;

        // Contexto de Partida Doble
        let colorMonto = "text-slate-700 dark:text-crema";
        let signoMonto = "";
        let insigniaTipo = "";
        let contextoCuentas = "";

        if (t.tipo === 'ingreso') {
            colorMonto = "text-emerald-600 dark:text-emerald-400";
            signoMonto = "+";
            insigniaTipo = `<span class="px-2 py-0.5 text-[10px] rounded-lg font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">INGRESO</span>`;
            contextoCuentas = `<span class="block text-[10px] text-emerald-600/80 mt-0.5 font-semibold">⬇ Entró a: ${obtenerNombreCuenta(t.cuenta_destino_id) || 'N/A'}</span>`;
        
        } else if (t.tipo === 'gasto') {
            colorMonto = "text-coral";
            signoMonto = "-";
            insigniaTipo = `<span class="px-2 py-0.5 text-[10px] rounded-lg font-bold border border-coral/30 bg-coral/10 text-coral">GASTO</span>`;
            contextoCuentas = `<span class="block text-[10px] text-coral/80 mt-0.5 font-semibold">⬆ Salió de: ${obtenerNombreCuenta(t.cuenta_origen_id) || 'N/A'}</span>`;
        
        } else if (t.tipo === 'ahorro') {
            colorMonto = "text-amber-500";
            signoMonto = "-"; // Porque sale del balance hacia la meta
            insigniaTipo = `<span class="px-2 py-0.5 text-[10px] rounded-lg font-bold border border-amber-500/30 bg-amber-500/10 text-amber-500">AHORRO</span>`;
            contextoCuentas = `<span class="block text-[10px] text-amber-500/80 mt-0.5 font-semibold">⬆ Salió de: ${obtenerNombreCuenta(t.cuenta_origen_id) || 'N/A'}</span>`;
            
        } else if (t.tipo === 'abono_deuda') {
            colorMonto = "text-azulelectrico";
            signoMonto = "-";
            insigniaTipo = `<span class="px-2 py-0.5 text-[10px] rounded-lg font-bold border border-azulelectrico/30 bg-azulelectrico/10 text-azulelectrico">PAGO DEUDA</span>`;
            contextoCuentas = `<span class="block text-[10px] text-azulelectrico/80 mt-0.5 font-semibold">⬆ Salió de: ${obtenerNombreCuenta(t.cuenta_origen_id) || 'N/A'}</span>`;
        }

        // Construir Botones de Acción (ocultos si es legacy)
        const accionesHTML = isLegacy ? `<span class="text-[10px] text-slate-400 italic">Solo lectura</span>` : `
            <div class="flex items-center justify-center gap-2">
                <button onclick="window.editarTransaccionUUID('${t.id}')" class="text-slate-400 hover:text-azulelectrico p-1.5 cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition" title="Editar">✏️</button>
                <button onclick="window.eliminarTransaccionUUID('${t.id}')" class="text-slate-400 hover:text-coral p-1.5 cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition" title="Eliminar">🗑️</button>
            </div>
        `;

        // 1. Inyección Desktop
        htmlDesktop += `
        <tr class="${rowClass}">
            <td class="p-3 font-medium text-slate-700 dark:text-crema text-xs">${escapeHTML(t.fecha)}</td>
            <td class="p-3">${insigniaTipo}</td>
            <td class="p-3 text-slate-700 dark:text-crema text-xs font-bold">
                ${obtenerNombreCategoria(t.categoria_id)}
                ${contextoCuentas}
            </td>
            <td class="p-3 text-slate-800 dark:text-crema font-medium text-xs">
                ${escapeHTML(t.descripcion)} ${tagLegacy}
            </td>
            <td class="p-3 text-right">
                <span class="font-extrabold text-sm ${colorMonto}">${signoMonto}${simbolo}${montoOrig}</span>
                ${textoSecundarioMoneda}
            </td>
            <td class="p-3 text-center w-24">
                ${accionesHTML}
            </td>
        </tr>`;

        // 2. Inyección Mobile (Tarjeta táctil)
        htmlMobile += `
        <div class="p-4 border border-slate-200 dark:border-azulcielo/20 rounded-2xl ${rowClass} shadow-sm">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <span class="text-[10px] text-slate-500 font-bold">${escapeHTML(t.fecha)}</span>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-crema mt-0.5 leading-tight">${escapeHTML(t.descripcion)} ${tagLegacy}</h4>
                </div>
                <div class="text-right">
                    <span class="font-black text-sm ${colorMonto}">${signoMonto}${simbolo}${montoOrig}</span>
                    ${textoSecundarioMoneda}
                </div>
            </div>
            
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                <div class="space-y-1">
                    <div class="text-[11px] font-bold text-slate-600 dark:text-azulcielo">${obtenerNombreCategoria(t.categoria_id)}</div>
                    ${contextoCuentas}
                </div>
                <div class="shrink-0 ml-2">
                    ${accionesHTML}
                </div>
            </div>
        </div>`;
    });

    tablaDesktop.innerHTML = htmlDesktop;
    listaMobile.innerHTML = htmlMobile;
}