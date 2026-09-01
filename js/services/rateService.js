// =========================================================================
// SERVICIO DE TASAS DE CAMBIO (BINANCE P2P / DOLAR PARALELO)
// =========================================================================

async function obtenerTasaBinance() {
  // Cargar tasa en caché local primero para disponibilidad inmediata
  try {
    const tasaGuardada = localStorage.getItem("ultima_tasa_binance");
    const fuenteGuardada = localStorage.getItem("ultima_fuente_tasa");
    if (fuenteGuardada) fuenteTasaActual = fuenteGuardada;
    if (tasaGuardada) {
      const parsed = parseFloat(tasaGuardada);
      if (!isNaN(parsed) && parsed > 0) {
        tasaBinanceCompra = parsed;
        if (typeof actualizarInterfaz === "function") actualizarInterfaz();
        if (typeof actualizarConversionUI === "function") actualizarConversionUI();
      }
    }
  } catch (e) {}

  let tasaObtenida = null;
  let fuenteDetectada = "Binance P2P";

  // Fuente 1: Al Cambio (GraphQL API)
  try {
    const res = await fetch("https://api.alcambio.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: "query getBinanceP2PAverages { getBinanceP2PAverages { sellAverage buyAverage } }"
      })
    });
    if (res.ok) {
      const data = await res.json();
      const binanceData = data?.data?.getBinanceP2PAverages;
      if (binanceData) {
        tasaObtenida = binanceData.buyAverage || binanceData.sellAverage;
        fuenteDetectada = "Al Cambio (Binance)";
      }
    }
  } catch (e) {
    console.warn("Fallo al consultar Al Cambio:", e);
  }

    // Fuente 2: DolarVZLA (Tasa BCV Oficial CDN) - Respaldo
  if (!tasaObtenida) {
    try {
      const res = await fetch('https://rates.dolarvzla.com/bcv/current.json');
      if (res.ok) {
        const data = await res.json();
        if (data?.current?.usd) {
          tasaObtenida = data.current.usd;
          fuenteDetectada = 'DolarVZLA (BCV Oficial)';
        }
      }
    } catch (e) {
      console.warn('Fallo al consultar DolarVZLA:', e);
    }
  }

  if (tasaObtenida && !isNaN(tasaObtenida) && tasaObtenida > 0) {
    tasaBinanceCompra = tasaObtenida;
    fuenteTasaActual = fuenteDetectada;
    try {
      localStorage.setItem("ultima_tasa_binance", String(tasaObtenida));
      localStorage.setItem("ultima_fuente_tasa", fuenteDetectada);
    } catch (e) {}
    if (typeof actualizarInterfaz === "function") actualizarInterfaz();
    if (typeof actualizarConversionUI === "function") {
      actualizarConversionUI();
    }
    if (typeof verificarMontoEnTiempoReal === "function") {
      verificarMontoEnTiempoReal();
    }
  } else if (!tasaBinanceCompra) {
    if (typeof actualizarConversionUI === "function") {
      const conversionMontoTexto = document.getElementById("conversionMontoTexto");
      if (conversionMontoTexto && monedaIngresoActual === "BS") {
        conversionMontoTexto.textContent = "Error al obtener la tasa. Revisa tu conexión.";
      }
    }
  }
}

function actualizarConversionUI() {
  const inputMonto = document.getElementById("monto");
  const conversionMonto = document.getElementById("conversionMonto");
  const conversionMontoTexto = document.getElementById("conversionMontoTexto");
  if (!inputMonto || !conversionMonto || !conversionMontoTexto) return;

  const valStr = (inputMonto.value || "").replace(",", ".");
  const valNum = parseFloat(valStr);

  if (isNaN(valNum) || valNum <= 0) {
    conversionMonto.classList.add("hidden");
    return;
  }

  if (!tasaBinanceCompra) {
    if (monedaIngresoActual === "BS") {
      conversionMontoTexto.textContent = "Obteniendo tasa de cambio...";
      conversionMonto.classList.remove("hidden");
    } else {
      conversionMonto.classList.add("hidden");
    }
    return;
  }

  if (monedaIngresoActual === "BS") {
    const usd = (valNum / tasaBinanceCompra).toFixed(2);
    conversionMontoTexto.innerHTML = `Equivale a <strong class="text-emerald-600 dark:text-emerald-400 font-black font-mono-num">$${parseFloat(usd).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD</strong> (Tasa ${fuenteTasaActual}: ${tasaBinanceCompra.toLocaleString("es-VE", { minimumFractionDigits: 2 })})`;
    conversionMonto.classList.remove("hidden");
  } else {
    const bs = (valNum * tasaBinanceCompra).toFixed(2);
    conversionMontoTexto.innerHTML = `Equivale a <strong class="text-azulcielo-dark dark:text-azulcielo font-black font-mono-num">${parseFloat(bs).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</strong> (Tasa ${fuenteTasaActual}: ${tasaBinanceCompra.toLocaleString("es-VE", { minimumFractionDigits: 2 })})`;
    conversionMonto.classList.remove("hidden");
  }
}

function seleccionarMonedaIngreso(moneda) {
  monedaIngresoActual = moneda;
  const btnMonedaUSD = document.getElementById("btnMonedaUSD");
  const btnMonedaBS = document.getElementById("btnMonedaBS");
  const simboloEl = document.getElementById("simboloMonedaInput");
  const inputMonto = document.getElementById("monto");
  if (!btnMonedaUSD || !btnMonedaBS) return;

  if (moneda === "USD") {
    btnMonedaUSD.className =
      "px-3 py-1 text-xs font-black rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-crema shadow-sm transition cursor-pointer";
    btnMonedaBS.className =
      "px-3 py-1 text-xs font-bold rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-crema transition cursor-pointer";
    if (simboloEl) simboloEl.textContent = "$";
    if (inputMonto) {
      inputMonto.classList.remove("pl-14", "sm:pl-16");
      inputMonto.classList.add("pl-9", "sm:pl-10");
    }
  } else {
    btnMonedaBS.className =
      "px-3 py-1 text-xs font-black rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-crema shadow-sm transition cursor-pointer";
    btnMonedaUSD.className =
      "px-3 py-1 text-xs font-bold rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-crema transition cursor-pointer";
    if (simboloEl) simboloEl.textContent = "Bs.";
    if (inputMonto) {
      inputMonto.classList.remove("pl-9", "sm:pl-10");
      inputMonto.classList.add("pl-14", "sm:pl-16");
    }
  }
  actualizarConversionUI();
  if (typeof verificarMontoEnTiempoReal === "function") {
    verificarMontoEnTiempoReal();
  }
}
