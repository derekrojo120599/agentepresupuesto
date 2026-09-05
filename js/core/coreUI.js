/**
 * coreUI.js
 * Puente entre el estado (multimoneda/state) y la manipulación del DOM.
 */

import { AppState, guardarCacheLocal, notificarCambioEstado } from './state.js';
import { generarTransaccionInmutable, evaluarSituacionFinanciera } from './multimoneda.js';
import { guardarOperacion } from './sync.js';
import { renderizarHistorial } from './historialUI.js';

// Reemplazar o integrar con las variables existentes de tu index
// Asumimos que RateService.js provee la tasa de Binance
const getTasaBinance = () => {
    // Si usas el servicio anterior, o la guardas en AppState
    return window.tasaBinanceCompra || AppState.tasaBinanceVigente || 1;
};

// Helper simple para evitar XSS
export function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Función de renderizado de tarjetas de cuentas
export function renderizarTarjetasDeCuentas(estadoCuentas, perdidaCambiaria) {
    const contenedor = document.getElementById('contenedor-cuentas');
    if (!contenedor) return;

    contenedor.innerHTML = ''; // Limpiar contenedor
    
    // Contenedor principal de tarjetas usando Grid
    let htmlCuentas = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">';

    Object.values(estadoCuentas).forEach(cuenta => {
        const nombreSeguro = escapeHTML(cuenta.nombre || 'Cuenta Desconocida');
        const simbolo = cuenta.moneda === 'USD' ? '$' : 'Bs.';
        
        // Formateo del monto local (en miles y decimales)
        const parts = cuenta.saldoOriginal.toFixed(2).split(".");
        const enteros = parseInt(parts[0], 10).toLocaleString('en-US');
        const centavos = parts[1];
        
        // Asignación de estilos dinámicos basado en la moneda
        const isUSD = cuenta.moneda === 'USD';
        const gradiente = isUSD
            ? 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/30' 
            : 'from-azulelectrico/10 to-azulelectrico/5 border-azulelectrico/30';
        const colorTexto = isUSD ? 'text-emerald-600 dark:text-emerald-400' : 'text-azulelectrico';
        const textSymbol = isUSD ? '$' : 'Bs';

        htmlCuentas += `
            <div class="bg-gradient-to-br ${gradiente} border p-5 rounded-3xl shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:shadow-md transition duration-300">
                <div class="flex items-center justify-between z-10">
                    <span class="text-xs sm:text-sm font-bold text-slate-700 dark:text-crema">${nombreSeguro}</span>
                    <span class="text-[10px] font-black px-2 py-1 rounded-lg bg-white/60 dark:bg-slate-900/60 ${colorTexto}">
                        ${cuenta.moneda}
                    </span>
                </div>
                <div class="z-10 mt-2">
                    <p class="text-2xl sm:text-3xl font-black ${colorTexto} tabular-nums font-mono-num tracking-tight">
                        ${isUSD ? textSymbol : ''}${enteros}<span class="text-base sm:text-lg font-bold opacity-75">.${centavos}</span> ${!isUSD ? textSymbol : ''}
                    </p>
                </div>
            </div>
        `;
    });
    
    htmlCuentas += '</div>';

    // Agregar banner de pérdida cambiaria si aplica
    if (perdidaCambiaria > 0) {
        const parts = perdidaCambiaria.toFixed(2).split(".");
        const enteros = parseInt(parts[0], 10).toLocaleString('en-US');
        
        htmlCuentas += `
            <div class="mt-4 w-full bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center font-bold shrink-0 text-lg">📉</div>
                    <div>
                        <p class="text-xs font-bold text-rose-600 dark:text-rose-400">Pérdida por Devaluación</p>
                        <p class="text-[10px] text-slate-500 dark:text-rose-400/70 mt-0.5">Dinero disuelto por inflación en cuentas Bs</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-base sm:text-lg font-black text-rose-500 tabular-nums">-$${enteros}.${parts[1]}</p>
                </div>
            </div>
        `;
    }

    contenedor.innerHTML = htmlCuentas;
}

// ==========================================
// 1. Dashboard Principal (Renderizado)
// ==========================================
export function renderizarDashboard() {
    const tasa = getTasaBinance();
    
    // Aquí evaluamos la situación usando el nuevo módulo financiero
    const evaluacion = evaluarSituacionFinanciera(AppState.transacciones, AppState.cuentas, tasa);
    
    // Renderizamos las tarjetas modulares (reemplazando el Balance Neto Global)
    renderizarTarjetasDeCuentas(evaluacion.estadoCuentas, evaluacion.perdidaCambiaria);

    // Calcular ingresos y gastos del mes en curso (solo para display)
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

// Listeners Base
document.addEventListener('DOMContentLoaded', () => {
    const formMigracion = document.getElementById('formCorteMigracion');
    if (formMigracion) {
        formMigracion.addEventListener('submit', procesarMigracionCorte);
    }
    
    // Reaccionar cuando el estado global cambia
    document.addEventListener('appStateChanged', () => {
        renderizarDashboard();
        renderizarHistorial();
    });
});



