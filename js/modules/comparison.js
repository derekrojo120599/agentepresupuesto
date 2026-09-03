// =========================================================================
// MÓDULO DE COMPARACIÓN MENSUAL (GASTOS / INGRESOS POR CATEGORÍA)
// =========================================================================

let tipoComparacionActual = "gasto";

const NOMBRES_MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function formatearMesComparacion(mes) {
  if (!mes || !mes.includes("-")) return "—";
  const [ano, m] = mes.split("-").map(Number);
  if (m < 1 || m > 12) return "—";
  return `${NOMBRES_MESES[m - 1]} ${ano}`;
}

function obtenerMesAnteriorComparacion(mes) {
  if (!mes || !mes.includes("-")) return "";
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(ano, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function totalOperacionesPorMes(tipo, mes) {
  let total = 0;
  transacciones.forEach((t) => {
    if (t.tipo !== tipo) return;
    if (!(t.fecha || "").startsWith(mes)) return;
    total += typeof obtenerMontoEnUSD === "function" ? obtenerMontoEnUSD(t, tasaBinanceCompra) : (parseFloat(t.monto) || 0);
  });
  return total;
}

function montosPorCategoriaComparacion(tipo, mes) {
  const mapa = {};
  transacciones.forEach((t) => {
    if (t.tipo !== tipo) return;
    if (!(t.fecha || "").startsWith(mes)) return;
    const cat = t.categoria || "Sin categoría";
    mapa[cat] = (mapa[cat] || 0) + (typeof obtenerMontoEnUSD === "function" ? obtenerMontoEnUSD(t, tasaBinanceCompra) : (parseFloat(t.monto) || 0));
  });
  return mapa;
}

function calcularVariacion(actual, anterior) {
  if (anterior === 0 && actual === 0) return { pct: 0, delta: 0 };
  if (anterior === 0) return { pct: 100, delta: actual };
  const delta = actual - anterior;
  return { pct: (delta / anterior) * 100, delta };
}

function renderizarTarjetaResumenComparacion(titulo, icono, actual, anterior, colorClase) {
  const variacion = calcularVariacion(actual, anterior);
  const pctAbs = Math.abs(variacion.pct);
  const esAumento = variacion.delta >= 0;
  const colorVariacion = variacion.delta === 0
    ? "text-slate-400 dark:text-azulcielo/70"
    : esAumento
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-coral";

  const flecha = variacion.delta === 0
    ? "→"
    : esAumento
      ? "▲"
      : "▼";

  return `
    <div class="p-3.5 rounded-2xl border border-slate-200 dark:border-azulcielo/20 bg-slate-50 dark:bg-slate-950/60 flex flex-col justify-between gap-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-azulcielo flex items-center gap-1.5">
          <span>${icono}</span> ${titulo}
        </span>
      </div>
      <div class="flex items-end justify-between gap-2">
        <div class="min-w-0">
          <p class="text-lg sm:text-xl font-black ${colorClase} font-mono-num tabular-nums">$${actual.toFixed(2)}</p>
          <p class="text-[10px] text-slate-400 dark:text-azulcielo/70 font-semibold truncate">vs ${formatearMesComparacion(obtenerMesAnteriorComparacion(compararMesSeleccionado()))}</p>
        </div>
        <div class="text-right shrink-0">
          <span class="text-[11px] font-black ${colorVariacion}">${flecha} ${pctAbs.toFixed(1)}%</span>
          <p class="text-[10px] text-slate-400 dark:text-azulcielo/70 font-semibold">${variacion.delta >= 0 ? "+" : ""}$${variacion.delta.toFixed(2)}</p>
        </div>
      </div>
    </div>
  `;
}

function compararMesSeleccionado() {
  const el = document.getElementById("compararMes");
  return (el && el.value) || obtenerFechaLocalISO().slice(0, 7);
}

function renderizarResumenComparacion() {
  const contenedor = document.getElementById("resumenComparacion");
  if (!contenedor) return;
  const mes = compararMesSeleccionado();
  const mesAnterior = obtenerMesAnteriorComparacion(mes);

  const ingActual = totalOperacionesPorMes("ingreso", mes);
  const ingAnterior = totalOperacionesPorMes("ingreso", mesAnterior);
  const gasActual = totalOperacionesPorMes("gasto", mes);
  const gasAnterior = totalOperacionesPorMes("gasto", mesAnterior);
  const ahoActual = totalOperacionesPorMes("ahorro", mes);
  const ahoAnterior = totalOperacionesPorMes("ahorro", mesAnterior);

  contenedor.innerHTML =
    renderizarTarjetaResumenComparacion(
      "Ingresos",
      "🟢",
      ingActual,
      ingAnterior,
      "text-emerald-600 dark:text-emerald-400",
    ) +
    renderizarTarjetaResumenComparacion(
      "Gastos",
      "🔴",
      gasActual,
      gasAnterior,
      "text-coral",
    ) +
    renderizarTarjetaResumenComparacion(
      "Ahorro",
      "🏦",
      ahoActual,
      ahoAnterior,
      "text-azulcielo-dark dark:text-azulcielo",
    );
}

function renderizarComparacionPorCategoria() {
  const contenedor = document.getElementById("listaComparacion");
  if (!contenedor) return;

  const mes = compararMesSeleccionado();
  const mesAnterior = obtenerMesAnteriorComparacion(mes);
  const mapaActual = montosPorCategoriaComparacion(tipoComparacionActual, mes);
  const mapaAnterior = montosPorCategoriaComparacion(tipoComparacionActual, mesAnterior);

  const todasCategorias = Array.from(
    new Set([...Object.keys(mapaActual), ...Object.keys(mapaAnterior)]),
  ).sort();

  if (!todasCategorias.length) {
    const esGasto = tipoComparacionActual === "gasto";
    contenedor.innerHTML = `
      <div class="p-6 text-center text-slate-400 dark:text-azulcielo text-xs border border-dashed border-slate-200 dark:border-azulcielo/20 rounded-2xl">
        <span class="text-2xl block mb-2">${esGasto ? "🔴" : "🟢"}</span>
        No hay ${esGasto ? "gastos" : "ingresos"} registrados en ${formatearMesComparacion(mes)} ni en ${formatearMesComparacion(mesAnterior)}.
      </div>
    `;
    return;
  }

  const esGasto = tipoComparacionActual === "gasto";
  const colorBase = esGasto ? "text-coral" : "text-emerald-600 dark:text-emerald-400";
  const colorVariacionBuena = esGasto
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-emerald-600 dark:text-emerald-400";
  const colorVariacionMala = esGasto
    ? "text-coral"
    : "text-coral";

  contenedor.innerHTML = todasCategorias
    .map((cat) => {
      const actual = mapaActual[cat] || 0;
      const anterior = mapaAnterior[cat] || 0;
      const icono = categoriaIconosMap[cat] || "🏷️";
      const variacion = calcularVariacion(actual, anterior);
      const pctAbs = Math.abs(variacion.pct);

      let estadoClase = "text-slate-400 dark:text-azulcielo/70";
      let estadoTexto = "Sin cambios";
      let flecha = "→";

      if (variacion.delta !== 0) {
        if (esGasto) {
          if (variacion.delta < 0) {
            estadoClase = colorVariacionBuena;
            estadoTexto = "Menos gasto que el mes anterior";
            flecha = "▼";
          } else {
            estadoClase = colorVariacionMala;
            estadoTexto = "Más gasto que el mes anterior";
            flecha = "▲";
          }
        } else {
          if (variacion.delta > 0) {
            estadoClase = colorVariacionBuena;
            estadoTexto = "Más ingreso que el mes anterior";
            flecha = "▲";
          } else {
            estadoClase = colorVariacionMala;
            estadoTexto = "Menos ingreso que el mes anterior";
            flecha = "▼";
          }
        }
      }

      const maxVal = Math.max(actual, anterior, 1);
      const anchoActual = (actual / maxVal) * 100;
      const anchoAnterior = (anterior / maxVal) * 100;

      return `
    <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-azulcielo/20 space-y-2.5">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-azulcielo/20 flex items-center justify-center text-base shrink-0">${escapeHTML(icono)}</span>
          <div class="min-w-0">
            <h4 class="text-xs sm:text-sm font-bold text-slate-800 dark:text-crema truncate">${escapeHTML(cat)}</h4>
            <span class="text-[10px] font-bold ${estadoClase}">${flecha} ${pctAbs.toFixed(1)}% · ${estadoTexto}</span>
          </div>
        </div>
        <div class="text-right shrink-0">
          <p class="text-sm font-black ${colorBase} font-mono-num tabular-nums">$${actual.toFixed(2)}</p>
          <p class="text-[10px] text-slate-400 dark:text-azulcielo/70 font-semibold">$${anterior.toFixed(2)} ant.</p>
        </div>
      </div>

      <div class="space-y-1">
        <div class="flex items-center justify-between text-[10px] text-slate-400 dark:text-azulcielo/70 font-semibold">
          <span>${formatearMesComparacion(mes)}</span>
          <span>${formatearMesComparacion(mesAnterior)}</span>
        </div>
        <div class="relative h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div class="absolute top-0 left-0 h-full bg-slate-300 dark:bg-slate-600 rounded-full transition-all duration-500" style="width: ${anchoAnterior}%"></div>
          <div class="absolute top-0 left-0 h-full ${esGasto ? "bg-coral" : "bg-emerald-500"} rounded-full transition-all duration-500" style="width: ${anchoActual}%"></div>
        </div>
      </div>
    </div>
  `;
    })
    .join("");
}

function actualizarBotonesComparacion() {
  const btnGasto = document.getElementById("btnCompGasto");
  const btnIngreso = document.getElementById("btnCompIngreso");
  if (!btnGasto || !btnIngreso) return;

  const baseInactiva =
    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-azulcielo/20 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer";

  btnGasto.className =
    tipoComparacionActual === "gasto"
      ? "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-coral text-white shadow-sm cursor-pointer"
      : baseInactiva;

  btnIngreso.className =
    tipoComparacionActual === "ingreso"
      ? "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-emerald-600 text-white shadow-sm cursor-pointer"
      : baseInactiva;
}

function cambiarTipoComparacion(tipo) {
  tipoComparacionActual = tipo === "ingreso" ? "ingreso" : "gasto";
  actualizarBotonesComparacion();
  renderizarComparacionPorCategoria();
}

function renderizarComparacion() {
  const mesEl = document.getElementById("compararMes");
  if (mesEl && !mesEl.value) {
    mesEl.value = obtenerFechaLocalISO().slice(0, 7);
  }
  actualizarBotonesComparacion();
  renderizarResumenComparacion();
  renderizarComparacionPorCategoria();
}

// Vincular evento de cambio de mes cuando se carga el DOM
document.addEventListener("DOMContentLoaded", () => {
  const mesEl = document.getElementById("compararMes");
  if (mesEl) {
    mesEl.addEventListener("change", () => {
      renderizarResumenComparacion();
      renderizarComparacionPorCategoria();
    });
  }
});