/**
 * formularioMovimiento.js
 * Puente entre el DOM del Formulario de "Nuevo Movimiento" y el motor Multimoneda/Sync.
 */

import { AppState } from './state.js';
import { generarTransaccionInmutable } from './multimoneda.js';
import { guardarOperacion } from './sync.js';

// NOTA: window.monedaIngresoActual se maneja en rateService.js y el DOM.
// window.tasaBinanceCompra contiene la tasa del d√≠a o minuto.

// =========================================================================
// 1. Poblado Din√°mico de Selects de Cuentas, Metas y Deudas
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
        let opcionesMetas = '<option value="" selected>Ninguna meta espec√≠fica</option>';
        AppState.metasAhorro.forEach(m => {
            opcionesMetas += `<option value="${m.id}">${m.icono || 'üéØ'} ${m.nombre}</option>`;
        });
        metaSelect.innerHTML = opcionesMetas;
    }

    // Llenar Deudas
    if (deudaSelect) {
        let opcionesDeudas = '<option value="" disabled selected>Selecciona a qui√©n pagas...</option>';
        AppState.deudas.forEach(d => {
            opcionesDeudas += `<option value="${d.id}">${d.nombre}</option>`;
        });
        deudaSelect.innerHTML = opcionesDeudas;
    }
}

// ==========================================
// 2. Intercepci√≥n del Evento Submit
// ==========================================
export async function procesarSubmitMovimiento(event) {
    // 1. Evitar comportamiento por defecto del formulario (recarga de p√°gina)
    event.preventDefault();
    const form = event.target;
    
    // Obtener bot√≥n de submit para prevenir multi-click
    const btnSubmit = form.querySelector('button[type="submit"]');
    if (btnSubmit) btnSubmit.disabled = true;

    try {
        // 2. Extracci√≥n de valores puros del DOM
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
        
        let tasaAplicar = tasaActualBinance;

        // Detectar si es un UPDATE
        const editIdInput = document.getElementById("transaccionEditandoId");
        const esUpdate = editIdInput && editIdInput.value;

        if (esUpdate) {
            const txOriginal = AppState.transacciones.find(t => t.id === editIdInput.value);
            if (txOriginal) {
                // Si mantiene la misma moneda, respetamos la tasa histÛrica
                if (txOriginal.moneda === moneda) {
                    tasaAplicar = txOriginal.tasa_cambio || tasaActualBinance;
                }
            }
        }

        // 3. Validaciones estrictas
        if (!montoIngresado || parseFloat(montoIngresado) <= 0) {
            throw new Error("El monto debe ser mayor a 0.");
        }
        if (moneda === 'VES' && (!tasaAplicar || tasaAplicar <= 0)) {
            throw new Error("Tasa de Binance inv·lida para procesar BolÌvares. Verifica tu conexiÛn.");
        }
        if (tipoSelect === 'gasto' && !cuenta_origen_id) {
            throw new Error("Debes indicar de quÈ cuenta saliÛ el dinero.");
        }
        if (tipoSelect === 'ingreso' && !cuenta_destino_id) {
            throw new Error("Debes indicar a quÈ cuenta entrÛ el dinero.");
        }

        // 4. ConstrucciÛn del Payload usando el cerebro Multimoneda
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
        }, tasaAplicar);

        if (esUpdate) {
            payload.id = editIdInput.value;
            await guardarOperacion('transacciones', 'UPDATE', payload);
            editIdInput.value = "";
            if (window.mostrarToast) window.mostrarToast("Movimiento actualizado con Èxito", "success");
        } else {
            await guardarOperacion('transacciones', 'INSERT', payload);
            if (window.mostrarToast) window.mostrarToast("Movimiento registrado con Èxito", "success");
        }

        // 6. Limpiar UI
        form.reset();
        document.getElementById("fecha").value = new Date().toISOString().split('T')[0];
        if (window.mostrarToast) window.mostrarToast("Movimiento registrado con √©xito", "success");

        // Regresar la pantalla hacia arriba
        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
        console.error("Error al procesar el formulario:", error);
        if (window.mostrarToast) window.mostrarToast(error.message, "error");
    } finally {
        if (btnSubmit) btnSubmit.disabled = false;
    }
}

export function inicializarTogglesFormulario() {
    const tipoSelectDOM = document.getElementById("tipo");
    
    // Contenedores a mostrar/ocultar
    const contOrigen = document.getElementById("contenedorCuentaOrigen");
    const contDestino = document.getElementById("contenedorCuentaDestino");
    const contMetas = document.getElementById("contenedorMetaAhorroSelect");
    const contDeudas = document.getElementById("contenedorDeudaSelect");

    // Selects individuales (para required y reset)
    const origenSelect = document.getElementById("cuentaOrigenSelect");
    const destinoSelect = document.getElementById("cuentaDestinoSelect");
    const metaSelect = document.getElementById("metaAhorroSelect");
    const deudaSelect = document.getElementById("deudaObjetivo");

    if (!tipoSelectDOM) return;

    const actualizarVista = () => {
        const tipo = tipoSelectDOM.value;

        // 1. Reseteo Inicial (Ocultar y limpiar todo por defecto)
        contOrigen?.classList.add("hidden");
        contDestino?.classList.add("hidden");
        contMetas?.classList.add("hidden");
        contDeudas?.classList.add("hidden");

        if (origenSelect) { origenSelect.removeAttribute("required"); origenSelect.value = ""; }
        if (destinoSelect) { destinoSelect.removeAttribute("required"); destinoSelect.value = ""; }
        if (metaSelect) metaSelect.value = "";
        if (deudaSelect) { deudaSelect.removeAttribute("required"); deudaSelect.value = ""; }

        // 2. Aplicar Reglas de Visibilidad Estrictas
        if (tipo === "gasto") {
            contOrigen?.classList.remove("hidden");
            if (origenSelect) origenSelect.setAttribute("required", "true");
        } 
        else if (tipo === "ingreso") {
            contDestino?.classList.remove("hidden");
            if (destinoSelect) destinoSelect.setAttribute("required", "true");
        } 
        else if (tipo === "ahorro") {
            contDestino?.classList.remove("hidden");
            contMetas?.classList.remove("hidden");
            if (destinoSelect) destinoSelect.setAttribute("required", "true");
        } 
        else if (tipo === "abono_deuda") {
            contOrigen?.classList.remove("hidden");
            contDeudas?.classList.remove("hidden");
            if (origenSelect) origenSelect.setAttribute("required", "true");
            if (deudaSelect) deudaSelect.setAttribute("required", "true");
        }
    };

    // 3. Enlazar Listeners
    // Listener nativo al select
    tipoSelectDOM.addEventListener("change", actualizarVista);

    // Compatibilidad: Si existen "chips" de UI que cambian el select oculto
    const chipsUI = document.querySelectorAll('.chip-tipo');
    chipsUI.forEach(chip => {
        chip.addEventListener('click', () => {
            // Un micro-delay para permitir que la librer√≠a o script previo actualice el .value del <select>
            setTimeout(actualizarVista, 20); 
        });
    });

    // 4. Ejecuci√≥n inicial para arrancar en el estado correcto
    actualizarVista();
}

// Vinculaci√≥n al DOM
document.addEventListener('DOMContentLoaded', () => {
    inicializarSelectsFormulario();
    inicializarTogglesFormulario();

    const formMovimiento = document.getElementById("formMovimiento");
    if (formMovimiento) {
        formMovimiento.addEventListener('submit', procesarSubmitMovimiento);
    }
});


