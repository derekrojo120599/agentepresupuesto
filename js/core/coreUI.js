/**
 * coreUI.js
 * Puente entre el estado (multimoneda/state) y la manipulación del DOM.
 */

import { AppState, guardarCacheLocal, notificarCambioEstado } from './state.js';
import { generarTransaccionInmutable, evaluarSituacionFinanciera } from './multimoneda.js';
import { guardarOperacion } from './sync.js';

// Reemplazar o integrar con las variables existentes de tu index
// Asumimos que RateService.js provee la tasa de Binance
const getTasaBinance = () => {
    // Si usas el servicio anterior, o la guardas en AppState
    return window.tasaBinanceCompra || AppState.tasaBinanceVigente || 1;
};

// ==========================================
// 1. Dashboard Principal (Renderizado)
// ==========================================
export function renderizarDashboard() {
    const tasa = getTasaBinance();
    
    // Aquí evaluamos la situación usando el nuevo módulo financiero
    const evaluacion = evaluarSituacionFinanciera(AppState.transacciones, AppState.cuentas, tasa);
    
    // Actualizar elementos nativos del DOM
    const balanceEl = document.getElementById("balanceNeto");
    const balanceBsEl = document.getElementById("balanceNetoBs"); // Si quieres mostrar el equivalente
    const perdidaEl = document.getElementById("totalPerdidaCambiaria");
    
    if (balanceEl) {
        // Formatear: ej. $1,500.00 -> $1,500.<span class="...">00</span>
        const parts = evaluacion.balanceRealActualUSD.toFixed(2).split(".");
        balanceEl.innerHTML = `$${parseInt(parts[0]).toLocaleString('en-US')}<span class="text-base sm:text-lg font-bold opacity-75">.${parts[1]}</span>`;
    }

    if (perdidaEl) {
        perdidaEl.textContent = `$${evaluacion.perdidaCambiaria.toFixed(2)}`;
    }

    // Calcular ingresos y gastos del mes en curso (solo para display, no afecta balance neto total)
    const mesActualStr = new Date().toISOString().substring(0, 7);
    let ingresosMes = 0;
    let gastosMes = 0;

    AppState.transacciones.filter(t => !t.legacy && !t._deleted).forEach(t => {
        if (t.fecha && t.fecha.substring(0, 7) === mesActualStr) {
            const mUSD = parseFloat(t.monto_usd_calculado);
            if (t.tipo === 'ingreso') ingresosMes += mUSD;
            if (t.tipo === 'gasto') gastosMes += mUSD;
        }
    });

    const ingEl = document.getElementById("totalIngresos");
    const gasEl = document.getElementById("totalGastos");
    if (ingEl) ingEl.textContent = `$${ingresosMes.toFixed(2)}`;
    if (gasEl) gasEl.textContent = `$${gastosMes.toFixed(2)}`;

    // Renderizar historial
    renderizarHistorial();
}

// ==========================================
// 2. Progreso de Metas y Deudas
// ==========================================
export function calcularProgresoMetasYDeudas() {
    // Para las metas (sumar transacciones de tipo 'ahorro' que apunten a ese meta_id)
    const progresoMetas = {};
    const progresoDeudas = {};

    AppState.transacciones.filter(t => !t.legacy && !t._deleted).forEach(t => {
        const mUSD = parseFloat(t.monto_usd_calculado);
        
        if (t.tipo === 'ahorro' && t.meta_id) {
            progresoMetas[t.meta_id] = (progresoMetas[t.meta_id] || 0) + mUSD;
        }
        if (t.tipo === 'abono_deuda' && t.deuda_id) {
            progresoDeudas[t.deuda_id] = (progresoDeudas[t.deuda_id] || 0) + mUSD;
        }
    });

    return { progresoMetas, progresoDeudas };
}

// ==========================================
// 3. Modal de Migración (Corte de Cuenta)
// ==========================================
export function verificarMigracionLegacy() {
    // Si no hay transacciones, es un usuario nuevo, no hacer nada.
    if (!AppState.transacciones || AppState.transacciones.length === 0) return;

    // Buscar si existen transacciones viejas marcadas como legacy
    const tieneLegacy = AppState.transacciones.some(t => t.legacy === true || t.legacy === 'true');
    
    // Buscar si ya hizo la migración (tiene un registro con "Saldo Inicial")
    const tieneCorteMigracion = AppState.transacciones.some(t => t.descripcion === 'Saldo Inicial de Migración');

    if (tieneLegacy && !tieneCorteMigracion) {
        // Bloquear UI y pedir saldos actuales
        const modal = document.getElementById('modalMigracionCorte');
        if (modal) {
            modal.classList.remove('hidden');
            // Evitar scroll de fondo
            document.body.style.overflow = 'hidden';
        }
    }
}

// Vinculado al form del HTML
export async function procesarMigracionCorte(event) {
    event.preventDefault();
    const usdVal = parseFloat(document.getElementById('migracionUSD').value) || 0;
    const vesVal = parseFloat(document.getElementById('migracionVES').value) || 0;
    const tasa = getTasaBinance();

    const btn = event.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
        // En tu esquema nuevo, todo debería ir a cuentas.
        // Si no existen, creamos las cuentas por defecto temporalmente en el estado:
        let idCuentaUSD = AppState.cuentas.find(c => c.moneda === 'USD')?.id;
        let idCuentaVES = AppState.cuentas.find(c => c.moneda === 'VES')?.id;

        if (!idCuentaUSD) {
            const nuevaCtaUSD = { id: crypto.randomUUID(), nombre: "Cuenta Dólares", moneda: "USD" };
            await guardarOperacion('cuentas', 'INSERT', nuevaCtaUSD);
            idCuentaUSD = nuevaCtaUSD.id;
        }
        if (!idCuentaVES) {
            const nuevaCtaVES = { id: crypto.randomUUID(), nombre: "Cuenta Bolívares", moneda: "VES" };
            await guardarOperacion('cuentas', 'INSERT', nuevaCtaVES);
            idCuentaVES = nuevaCtaVES.id;
        }

        const hoy = new Date().toISOString().split('T')[0];

        if (usdVal > 0) {
            const txUSD = generarTransaccionInmutable({
                tipo: 'ingreso',
                montoIngresado: usdVal,
                moneda: 'USD',
                cuenta_destino_id: idCuentaUSD,
                descripcion: 'Saldo Inicial de Migración',
                fecha: hoy
            }, tasa);
            await guardarOperacion('transacciones', 'INSERT', txUSD);
        }

        if (vesVal > 0) {
            const txVES = generarTransaccionInmutable({
                tipo: 'ingreso',
                montoIngresado: vesVal,
                moneda: 'VES',
                cuenta_destino_id: idCuentaVES,
                descripcion: 'Saldo Inicial de Migración',
                fecha: hoy
            }, tasa);
            await guardarOperacion('transacciones', 'INSERT', txVES);
        }

        // Marcar todas las anteriores como legacy estrictamente por si acaso
        AppState.transacciones.forEach(t => {
            if (t.descripcion !== 'Saldo Inicial de Migración') {
                t.legacy = true;
            }
        });
        guardarCacheLocal();

        document.getElementById('modalMigracionCorte').classList.add('hidden');
        document.body.style.overflow = '';
        if (window.mostrarToast) window.mostrarToast("Saldos migrados correctamente.", "success");
        renderizarDashboard();
        
    } catch (e) {
        console.error("Error en migración:", e);
        if (window.mostrarToast) window.mostrarToast("Error procesando migración.", "error");
        if (btn) btn.disabled = false;
    }
}

// ==========================================
// 4. Historial (Renderizado Legacy vs Nuevo)
// ==========================================
export function renderizarHistorial() {
    const contenedor = document.getElementById("listaTransaccionesMobile"); // o tbody de tabla
    if (!contenedor) return;

    // Solo un ejemplo rápido de separación visual
    let htmlContent = "";
    
    // Sort transactions by date descending
    const txSorted = [...AppState.transacciones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    txSorted.forEach(t => {
        const isLegacy = t.legacy;
        const colorClass = isLegacy ? 'opacity-50 grayscale bg-slate-100 dark:bg-slate-800/40' : 'bg-white dark:bg-slate-900';
        const badgeTag = isLegacy ? '<span class="text-[9px] bg-slate-200 text-slate-500 px-1 rounded ml-2">ANTIGUO</span>' : '';
        
        // El monto a mostrar:
        const showVal = `$${parseFloat(t.monto_usd_calculado || t.monto || 0).toFixed(2)}`;

        htmlContent += `
        <div class="p-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center ${colorClass}">
            <div>
                <p class="text-xs font-bold text-slate-800 dark:text-slate-200">${t.descripcion || 'Sin descripción'} ${badgeTag}</p>
                <p class="text-[10px] text-slate-500">${t.fecha}</p>
            </div>
            <div class="flex items-center gap-2">
                <span class="font-bold text-sm text-slate-900 dark:text-white">${showVal}</span>
                ${!isLegacy ? `
                    <button class="text-xs text-azulelectrico" onclick="alert('Editar ${t.id}')">✏️</button>
                ` : ''}
            </div>
        </div>
        `;
    });

    contenedor.innerHTML = htmlContent;
}

// Listeners Base
document.addEventListener('DOMContentLoaded', () => {
    const formMigracion = document.getElementById('formCorteMigracion');
    if (formMigracion) {
        formMigracion.addEventListener('submit', procesarMigracionCorte);
    }
    
    // Reaccionar cuando el estado global cambia
    document.addEventListener('appStateChanged', () => {
        renderizarDashboard();
    });
});