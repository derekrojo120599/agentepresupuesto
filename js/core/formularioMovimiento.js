/**
 * formularioMovimiento.js
 * Puente entre el DOM del Formulario de "Nuevo Movimiento" y el motor Multimoneda/Sync.
 */

import { AppState } from './state.js';
import { generarTransaccionInmutable } from './multimoneda.js';
import { guardarOperacion } from './sync.js';

// NOTA: window.monedaIngresoActual se maneja en rateService.js y el DOM.
// window.tasaBinanceCompra contiene la tasa del día o minuto.

// =========================================================================
// 1. Poblado Dinámico de Selects de Cuentas, Metas y Deudas
// ==========================================
export function inicializarSelectsFormulario() {
    const origenSelect = document.getElementById("cuentaOrigenSelect");
    const destinoSelect = document.getElementById("cuentaDestinoSelect");
    const metaSelect = document.getElementById("metaAhorroSelect");
    const deudaSelect = document.getElementById("deudaObjetivo");

    // Llenar Cuentas (Billeteras)
    if (origenSelect && destinoSelect) {
        let opcionesCuentas = '<option value="" disabled selected>Selecciona una cuenta...</option>';
        if (AppState.cuentas.length === 0) {
            opcionesCuentas += '<option value="default_usd">Efectivo USD</option>';
            opcionesCuentas += '<option value="default_ves">Bancos Bs</option>';
        } else {
            AppState.cuentas.forEach(c => {
                opcionesCuentas += `<option value="${c.id}">${c.nombre} (${c.moneda})</option>`;
            });
        }
        origenSelect.innerHTML = opcionesCuentas;
        destinoSelect.innerHTML = opcionesCuentas;
    }

    // Llenar Metas de Ahorro
    if (metaSelect) {
        let opcionesMetas = '<option value="" selected>Ninguna meta específica</option>';
        AppState.metasAhorro.forEach(m => {
            opcionesMetas += `<option value="${m.id}">${m.icono || '🎯'} ${m.nombre}</option>`;
        });
        metaSelect.innerHTML = opcionesMetas;
    }

    // Llenar Deudas
    if (deudaSelect) {
        let opcionesDeudas = '<option value="" disabled selected>Selecciona a quién pagas...</option>';
        AppState.deudas.forEach(d => {
            opcionesDeudas += `<option value="${d.id}">${d.nombre}</option>`;
        });
        deudaSelect.innerHTML = opcionesDeudas;
    }
}

// ==========================================
// 2. Intercepción del Evento Submit
// ==========================================
export async function procesarSubmitMovimiento(event) {
    // 1. Evitar comportamiento por defecto del formulario (recarga de página)
    event.preventDefault();
    const form = event.target;
    
    // Obtener botón de submit para prevenir multi-click
    const btnSubmit = form.querySelector('button[type="submit"]');
    if (btnSubmit) btnSubmit.disabled = true;

    try {
        // 2. Extracción de valores puros del DOM
        const tipoSelect = document.getElementById("tipo").value;
        const categoria_id = document.getElementById("categoria").value; // Asumiendo que ahora usamos ID o un value estricto
        const descripcion = document.getElementById("descripcion").value.trim();
        const fecha = document.getElementById("fecha").value;
        const montoIngresado = document.getElementById("monto").value;
        
        // Cuentas, deudas, metas
        const cuenta_origen_id = document.getElementById("cuentaOrigenSelect")?.value;
        const cuenta_destino_id = document.getElementById("cuentaDestinoSelect")?.value;
        const meta_id = document.getElementById("metaAhorroSelect")?.value;
        const deuda_id = document.getElementById("deudaObjetivo")?.value;

        // Moneda activa seleccionada por el usuario (variable global del proyecto original)
        const moneda = window.monedaIngresoActual || "USD"; 
        
        // Obtener tasa actual inyectada por rateService
        const tasaActualBinance = window.tasaBinanceCompra || 1;

        // 3. Validaciones estrcitas
        if (!montoIngresado || parseFloat(montoIngresado) <= 0) {
            throw new Error("El monto debe ser mayor a 0.");
        }
        if (moneda === 'VES' && (!tasaActualBinance || tasaActualBinance <= 0)) {
            throw new Error("Tasa de Binance inválida para procesar Bolívares. Verifica tu conexión.");
        }
        if (tipoSelect === 'gasto' && !cuenta_origen_id) {
            throw new Error("Debes indicar de qué cuenta salió el dinero.");
        }
        if (tipoSelect === 'ingreso' && !cuenta_destino_id) {
            throw new Error("Debes indicar a qué cuenta entró el dinero.");
        }

        // 4. Construcción del Payload usando el cerebro Multimoneda
        // Delega la responsabilidad de congelar la tasa y los ID relacionales.
        const payload = generarTransaccionInmutable({
            tipo: tipoSelect,
            montoIngresado: montoIngresado,
            moneda: moneda,
            cuenta_origen_id: (tipoSelect === 'gasto' || tipoSelect === 'abono_deuda') ? cuenta_origen_id : null,
            cuenta_destino_id: (tipoSelect === 'ingreso' || tipoSelect === 'ahorro') ? cuenta_destino_id : null,
            categoria_id: categoria_id,
            meta_id: tipoSelect === 'ahorro' ? meta_id : null,
            deuda_id: (tipoSelect === 'gasto' || tipoSelect === 'abono_deuda') ? deuda_id : null,
            descripcion: descripcion,
            fecha: fecha
        }, tasaActualBinance);

        // 5. Envío al sistema Offline-First/Sync
        await guardarOperacion('transacciones', 'INSERT', payload);

        // 6. Limpiar UI
        form.reset();
        document.getElementById("fecha").value = new Date().toISOString().split('T')[0];
        if (window.mostrarToast) window.mostrarToast("Movimiento registrado con éxito", "success");

        // Regresar la pantalla hacia arriba
        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
        console.error("Error al procesar el formulario:", error);
        if (window.mostrarToast) window.mostrarToast(error.message, "error");
    } finally {
        if (btnSubmit) btnSubmit.disabled = false;
    }
}

// Vinculación al DOM y Lógica de UI Interactiva (Mostrar/Ocultar Cuentas)
document.addEventListener('DOMContentLoaded', () => {
    inicializarSelectsFormulario();

    const formMovimiento = document.getElementById("formMovimiento");
    if (formMovimiento) {
        // Enlazar Evento de Submit interceptando la forma tradicional
        formMovimiento.addEventListener('submit', procesarSubmitMovimiento);
    }

    // Escuchar el cambio de tipo de movimiento para alternar cuentas Origen/Destino
    const tipoSelectDOM = document.getElementById("tipo");
    if (tipoSelectDOM) {
        const toggleCuentas = () => {
            const tipo = tipoSelectDOM.value;
            const contOrigen = document.getElementById("contenedorCuentaOrigen");
            const contDestino = document.getElementById("contenedorCuentaDestino");
            const origenSelect = document.getElementById("cuentaOrigenSelect");
            const destinoSelect = document.getElementById("cuentaDestinoSelect");

            if (tipo === "ingreso") {
                contOrigen.classList.add("hidden");
                contDestino.classList.remove("hidden");
                origenSelect.removeAttribute("required");
                destinoSelect.setAttribute("required", "true");
            } else if (tipo === "gasto" || tipo === "abono_deuda") {
                contOrigen.classList.remove("hidden");
                contDestino.classList.add("hidden");
                origenSelect.setAttribute("required", "true");
                destinoSelect.removeAttribute("required");
            } else if (tipo === "ahorro" || tipo === "transferencia") {
                // Ahorro ahora es conceptualmente un movimiento entre cuentas (o desde cuenta a Meta)
                // Se asume que sale de una cuenta para irse a la bolsa de ahorro.
                contOrigen.classList.remove("hidden");
                contDestino.classList.add("hidden"); // En tu diseño el ahorro no suma a otra billetera bancaria, se queda flotando en metas
                origenSelect.setAttribute("required", "true");
                destinoSelect.removeAttribute("required");
            }
        };

        // Enlazar mutaciones a los botones (chips) que controlan el select oculto
        document.querySelectorAll('.chip-tipo').forEach(btn => {
            btn.addEventListener('click', () => setTimeout(toggleCuentas, 50)); // Pequeño delay para que el select cambie
        });
        tipoSelectDOM.addEventListener('change', toggleCuentas);
        toggleCuentas(); // Call inicial
    }
});