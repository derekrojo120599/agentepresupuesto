/**
 * multimoneda.js
 * Módulo para cálculos financieros, evaluación de pérdida cambiaria y generación inmutable de transacciones.
 */

// 1. Multimoneda Inmutable: Crea el objeto de transacción congelando la tasa
export function generarTransaccionInmutable(datosInput, tasaActualBinance) {
    const { 
        tipo, montoIngresado, moneda, cuenta_origen_id, cuenta_destino_id, 
        categoria_id, meta_id, deuda_id, descripcion, fecha 
    } = datosInput;

    const monto_original = parseFloat(montoIngresado);
    let tasa_cambio = 1;
    let monto_usd_calculado = monto_original;

    if (moneda === 'VES') {
        tasa_cambio = parseFloat(tasaActualBinance);
        if (!tasa_cambio || tasa_cambio <= 0) throw new Error("Tasa de Binance inválida.");
        // Se congela el valor en dólares exacto del instante en que se hizo la operación
        monto_usd_calculado = monto_original / tasa_cambio;
    }

    // Generar UUID si no existe window.crypto.randomUUID (fallback)
    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    return {
        id: generateUUID(),
        tipo,
        cuenta_origen_id: cuenta_origen_id || null,
        cuenta_destino_id: cuenta_destino_id || null,
        categoria_id: categoria_id || null,
        meta_id: meta_id || null,                   // Relación exacta por ID
        deuda_id: deuda_id || null,
        monto_original,
        moneda,
        tasa_cambio,
        monto_usd_calculado,
        descripcion: descripcion || "",
        fecha: fecha || new Date().toISOString().split('T')[0],
        legacy: false,
        _isPending: true // Flag temporal para indicar que no ha subido a la nube
    };
}

// 2 y 3. Cálculo de Balance Real y Pérdida Cambiaria
export function evaluarSituacionFinanciera(transacciones, cuentas, tasaActualBinance) {
    // Inicializar saldos por cuenta
    const estadoCuentas = {};
    cuentas.forEach(c => {
        estadoCuentas[c.id] = { moneda: c.moneda, saldoOriginal: 0, aporteUSDHistorico: 0 };
    });

    // Excluir registros legacy (versión antigua) y eliminados lógicamente
    const txValidas = transacciones.filter(t => !t.legacy && !t._deleted);

    txValidas.forEach(t => {
        const montoOrig = parseFloat(t.monto_original);
        const montoUSD = parseFloat(t.monto_usd_calculado);

        // Dinero que sale (Restamos de la cuenta origen)
        if (t.cuenta_origen_id && estadoCuentas[t.cuenta_origen_id]) {
            estadoCuentas[t.cuenta_origen_id].saldoOriginal -= montoOrig;
            estadoCuentas[t.cuenta_origen_id].aporteUSDHistorico -= montoUSD;
        }

        // Dinero que entra (Sumamos a la cuenta destino)
        if (t.cuenta_destino_id && estadoCuentas[t.cuenta_destino_id]) {
            // Nota: Se asume que el montoOriginal ingresado corresponde a la cuenta destino.
            estadoCuentas[t.cuenta_destino_id].saldoOriginal += montoOrig;
            estadoCuentas[t.cuenta_destino_id].aporteUSDHistorico += montoUSD;
        }
    });

    let balanceRealActualUSD = 0;
    let patrimonioHistoricoUSD = 0;

    // Calcular la suma total consolidada
    Object.values(estadoCuentas).forEach(cuenta => {
        patrimonioHistoricoUSD += cuenta.aporteUSDHistorico;

        if (cuenta.moneda === 'USD') {
            balanceRealActualUSD += cuenta.saldoOriginal;
        } else if (cuenta.moneda === 'VES') {
            // Evaluamos los bolívares que quedan VIVOS en la cuenta, a la tasa de HOY.
            balanceRealActualUSD += (cuenta.saldoOriginal / tasaActualBinance);
        }
    });

    // La devaluación sufrida por tener dinero retenido en Bs mientras la tasa subió
    const perdidaCambiaria = patrimonioHistoricoUSD - balanceRealActualUSD;

    return {
        balanceRealActualUSD,
        patrimonioHistoricoUSD,
        perdidaCambiaria: Math.max(0, perdidaCambiaria), // Evitar negativos si hay revaluación atípica
        estadoCuentas
    };
}
