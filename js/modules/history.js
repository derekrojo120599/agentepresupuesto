// =========================================================================
// MÓDULO DE HISTORIAL, FILTROS Y EXPORTACIÓN
// =========================================================================

function seleccionarChipTipo(tipo) {
  filtroTipoActual = tipo;

  const chips = {
    "": document.getElementById("chipTipoTodos"),
    gasto: document.getElementById("chipTipoGasto"),
    ingreso: document.getElementById("chipTipoIngreso"),
    ahorro: document.getElementById("chipTipoAhorro"),
  };

  const claseActiva =
    "chip-tipo px-3 py-1.5 rounded-xl text-xs font-black bg-azulelectrico text-slate-950 shadow-sm transition shrink-0 cursor-pointer";
  const claseInactiva =
    "chip-tipo px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-azulcielo border border-slate-200 dark:border-azulcielo/20 hover:bg-slate-200 dark:hover:bg-slate-800 transition shrink-0 cursor-pointer";

  Object.keys(chips).forEach((k) => {
    if (chips[k]) chips[k].className = k === tipo ? claseActiva : claseInactiva;
  });

  actualizarOpcionesFiltroCategoria();
  renderizarHistorialFiltrado();
}

function actualizarOpcionesFiltroCategoria() {
  const select = document.getElementById("filtroCategoria");
  if (!select) return;
  let opciones = '<option value="">Todas las categorías</option>';

  if (filtroTipoActual && categoriasMap[filtroTipoActual]) {
    categoriasMap[filtroTipoActual].forEach((c) => {
      opciones += `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`;
    });
  } else {
    const todas = [
      ...(categoriasMap.ingreso || []),
      ...(categoriasMap.gasto || []),
      ...(categoriasMap.ahorro || []),
    ];
    [...new Set(todas)].forEach((c) => {
      opciones += `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`;
    });
  }
  select.innerHTML = opciones;
}

function filtrarPorCategoriaRapido(cat) {
  cambiarPestana("historial");
  const filtroCat = document.getElementById("filtroCategoria");
  if (filtroCat) filtroCat.value = cat;
  renderizarHistorialFiltrado();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function limpiarFiltros() {
  seleccionarChipTipo("");
  const filtroCat = document.getElementById("filtroCategoria");
  const filtroAlcance = document.getElementById("filtroAlcance");
  const filtroDia = document.getElementById("filtroDia");

  if (filtroCat) filtroCat.value = "";
  if (filtroAlcance) filtroAlcance.value = "mes";
  if (filtroDia) {
    filtroDia.value = String(new Date().getDate()).padStart(2, "0");
  }
  renderizarHistorialFiltrado();
  mostrarToast("Filtros restablecidos", "info");
}

function renderizarHistorialFiltrado() {
  const mesFiltroEl = document.getElementById("mesFiltro");
  const filtroCatEl = document.getElementById("filtroCategoria");
  const filtroAlcanceEl = document.getElementById("filtroAlcance");
  const filtroDiaEl = document.getElementById("filtroDia");

  const mesSeleccionado = mesFiltroEl ? mesFiltroEl.value : "";
  const categoria = filtroCatEl ? filtroCatEl.value : "";
  const alcance = filtroAlcanceEl ? filtroAlcanceEl.value : "mes";
  const diaFiltro = filtroDiaEl ? filtroDiaEl.value : "";

  const contenedorDia = document.getElementById("contenedorFiltroDia");
  if (contenedorDia) {
    if (alcance === "dia") {
      contenedorDia.classList.remove("hidden");
      contenedorDia.classList.add("block");
    } else {
      contenedorDia.classList.add("hidden");
      contenedorDia.classList.remove("block");
    }
  }

  const filtradas = transacciones
    .filter((t) => {
      if (alcance === "mes" && !(t.fecha || "").startsWith(mesSeleccionado))
        return false;
      if (
        alcance === "dia" &&
        t.fecha !== `${mesSeleccionado}-${diaFiltro}`
      )
        return false;
      if (filtroTipoActual && t.tipo !== filtroTipoActual) return false;
      if (categoria && t.categoria !== categoria) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.fecha !== b.fecha) {
        return new Date(b.fecha) - new Date(a.fecha);
      }
      return Math.abs(b.id) - Math.abs(a.id);
    });

  const conteoFiltradasEl = document.getElementById("conteoFiltradas");
  if (conteoFiltradasEl) {
    conteoFiltradasEl.textContent = `${filtradas.length} de ${transacciones.length} movimiento(s)`;
  }

  let totalFlujo = 0;
  let totalIngresosHistorial = 0;
  let totalGastosHistorial = 0;
  let totalAhorrosHistorial = 0;

  filtradas.forEach((t) => {
    const m = typeof obtenerMontoEnUSD === "function" ? obtenerMontoEnUSD(t, tasaBinanceCompra) : (parseFloat(t.monto) || 0);
    if (t.tipo === "ingreso") {
      totalFlujo += m;
      totalIngresosHistorial += m;
    } else if (t.tipo === "gasto") {
      totalFlujo -= m;
      totalGastosHistorial += m;
    } else if (t.tipo === "ahorro") {
      const cat = (t.categoria || "").toLowerCase();
      if (
        cat.includes("retirar") ||
        cat.includes("usar") ||
        cat.includes("retiro") ||
        cat.includes("gasto")
      ) {
        totalAhorrosHistorial -= m;
      } else {
        totalAhorrosHistorial += m;
      }
    }
  });

  const resumenMontoFiltradoEl = document.getElementById(
    "resumenMontoFiltrado",
  );
  if (resumenMontoFiltradoEl) {
    resumenMontoFiltradoEl.textContent = `Neto: $${totalFlujo.toFixed(2)}`;
  }

  const tablaDesktop = document.getElementById("tablaHistorial");
  const listaMobile = document.getElementById("listaHistorialMobile");
  if (!tablaDesktop || !listaMobile) return;

  if (!filtradas.length) {
    const vacioHTML = `<div class="p-6 text-center text-slate-400 text-xs">No hay movimientos en este filtro.</div>`;
    tablaDesktop.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 text-xs">No hay movimientos.</td></tr>`;
    listaMobile.innerHTML = vacioHTML;
    return;
  }

  // Render Desktop Tabla
  tablaDesktop.innerHTML = filtradas
    .map((t) => {
      let badgeStyle = "bg-coral/15 text-coral border-coral/30";
      let signo = "-";
      let colorMonto = "text-coral";
      const montoNum = typeof obtenerMontoEnUSD === "function" ? obtenerMontoEnUSD(t, tasaBinanceCompra) : (parseFloat(t.monto) || 0);

      if (t.tipo === "ingreso") {
        badgeStyle =
          "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
        signo = "+";
        colorMonto = "text-emerald-600 dark:text-emerald-400";
      } else if (t.tipo === "ahorro") {
        const catAhorro = (t.categoria || "").toLowerCase();
        const esRetiroAhorro =
          catAhorro.includes("retirar") ||
          catAhorro.includes("usar") ||
          catAhorro.includes("retiro") ||
          catAhorro.includes("gasto");
        badgeStyle =
          "bg-azulcielo/15 text-azulcielo-dark dark:text-azulcielo border-azulcielo/30";
        signo = esRetiroAhorro ? "-" : "+";
        colorMonto = "text-azulcielo-dark dark:text-azulcielo";
      }

      let tagOrigenHTML = "";
      if (t.tipo === "ahorro" && !esRetiroAhorro) {
        if (t.origen_ahorro === "balance") {
          tagOrigenHTML = ` <span class="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Descontado del Balance">De Balance</span>`;
        } else {
          tagOrigenHTML = ` <span class="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Dinero externo / pre-existente">Externo</span>`;
        }
      }

      let detalleBsHTML = "";
      if (t.moneda === "BS" && t.monto_original) {
        const bsNum = parseFloat(t.monto_original);
        detalleBsHTML = `<span class="block text-[10px] font-semibold text-slate-400 dark:text-azulcielo/70 font-mono-num">≈ ${bsNum.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span>`;
      }

      return `
    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
      <td class="p-3 font-medium text-slate-700 dark:text-crema text-xs">${escapeHTML(t.fecha)}</td>
      <td class="p-3"><span class="px-2 py-0.5 text-xs rounded-lg font-bold border ${badgeStyle}">${escapeHTML(t.tipo.toUpperCase())}</span></td>
      <td class="p-3 text-slate-600 dark:text-azulcielo font-semibold text-xs">${escapeHTML(t.categoria)}${tagOrigenHTML}</td>
      <td class="p-3 text-slate-900 dark:text-crema font-medium text-xs">${escapeHTML(t.descripcion)}</td>
      <td class="p-3 text-right font-extrabold text-sm ${colorMonto}">
        <div>${signo}$${montoNum.toFixed(2)}</div>
        ${detalleBsHTML}
      </td>
      <td class="p-3 text-center">
        <div class="flex items-center justify-center gap-1">
          <button onclick="duplicarTransaccion(${t.id})" class="text-slate-400 hover:text-azulelectrico p-1 cursor-pointer" title="Duplicar">📋</button>
          <button onclick="editarTransaccion(${t.id})" class="text-slate-500 focus:outline-none focus:ring-2 focus:ring-azulelectrico rounded-xl hover:text-azulelectrico p-1 cursor-pointer" title="Editar" aria-label="Editar transacción">✏️</button>
          <button onclick="eliminarTransaccion(${t.id})" class="text-slate-500 focus:outline-none focus:ring-2 focus:ring-coral rounded-xl hover:text-coral p-1 cursor-pointer" title="Eliminar" aria-label="Eliminar transacción">🗑️</button>
        </div>
      </td>
    </tr>
  `;
    })
    .join("");

  // Render Mobile Tarjetas Táctiles
  listaMobile.innerHTML = filtradas
    .map((t) => {
      let signo = "-";
      let colorMonto = "text-coral";
      let iconTipo = "🔴";
      const montoNum = typeof obtenerMontoEnUSD === "function" ? obtenerMontoEnUSD(t, tasaBinanceCompra) : (parseFloat(t.monto) || 0);

      if (t.tipo === "ingreso") {
        signo = "+";
        colorMonto = "text-emerald-600 dark:text-emerald-400";
        iconTipo = "🟢";
      } else if (t.tipo === "ahorro") {
        const catAhorroM = (t.categoria || "").toLowerCase();
        const esRetiroM =
          catAhorroM.includes("retirar") ||
          catAhorroM.includes("usar") ||
          catAhorroM.includes("retiro") ||
          catAhorroM.includes("gasto");
        signo = esRetiroM ? "-" : "+";
        colorMonto = "text-azulcielo-dark dark:text-azulcielo";
        iconTipo = "🟡";
      }

      let tagOrigenMobile = "";
      if (t.tipo === "ahorro" && !esRetiroM) {
        if (t.origen_ahorro === "balance") {
          tagOrigenMobile = ` <span>•</span> <span class="font-bold text-emerald-600 dark:text-emerald-400">De Balance</span>`;
        } else {
          tagOrigenMobile = ` <span>•</span> <span class="font-bold text-amber-600 dark:text-amber-400">Externo</span>`;
        }
      }

      let detalleBsMobile = "";
      if (t.moneda === "BS" && t.monto_original) {
        const bsNum = parseFloat(t.monto_original);
        detalleBsMobile = `<span class="block text-[9.5px] font-semibold text-slate-400 dark:text-azulcielo/70 font-mono-num text-right">≈ ${bsNum.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span>`;
      }

      return `
    <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-azulcielo/20 flex items-center justify-between gap-2.5 active:scale-[0.99] transition">
      <div class="flex items-center gap-3 min-w-0">
        <span class="text-lg shrink-0">${iconTipo}</span>
        <div class="min-w-0">
          <p class="text-xs font-bold text-slate-900 dark:text-crema truncate">${escapeHTML(t.descripcion)}</p>
          <p class="text-[10px] text-slate-400 dark:text-azulcielo/70 flex items-center gap-1.5">
            <span>${escapeHTML(t.categoria)}</span>
            ${tagOrigenMobile}
            <span>•</span>
            <span>${escapeHTML(t.fecha)}</span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <div class="text-right">
          <span class="text-sm font-black ${colorMonto}">${signo}$${montoNum.toFixed(2)}</span>
          ${detalleBsMobile}
        </div>
        <button onclick="duplicarTransaccion(${t.id})" class="text-slate-400 hover:text-azulelectrico p-1.5 cursor-pointer" title="Duplicar">📋</button>
        <button onclick="editarTransaccion(${t.id})" class="text-slate-500 focus:outline-none focus:ring-2 focus:ring-azulelectrico rounded-xl hover:text-azulelectrico p-1.5 cursor-pointer" title="Editar" aria-label="Editar transacción">✏️</button>
        <button onclick="eliminarTransaccion(${t.id})" class="text-slate-500 focus:outline-none focus:ring-2 focus:ring-coral rounded-xl hover:text-coral p-1.5 cursor-pointer" title="Eliminar" aria-label="Eliminar transacción">🗑️</button>
      </div>
    </div>
  `;
    })
    .join("");

  const trTotales = `
    <tr class="bg-slate-100/50 dark:bg-slate-800/30 border-t-2 border-slate-200 dark:border-azulcielo/30">
      <td colspan="4" class="p-3 text-right font-black text-slate-800 dark:text-crema text-xs uppercase tracking-wider">
        Total del Periodo:
      </td>
      <td class="p-3 text-right">
        <div class="flex flex-col gap-0.5 text-xs font-bold">
          <span class="text-emerald-600 dark:text-emerald-400">+$${totalIngresosHistorial.toFixed(2)} Ingresos</span>
          <span class="text-coral">-$${totalGastosHistorial.toFixed(2)} Gastos</span>
          <span class="text-azulcielo-dark dark:text-azulcielo">${totalAhorrosHistorial >= 0 ? "+" : ""}$${totalAhorrosHistorial.toFixed(2)} Ahorro</span>
        </div>
      </td>
      <td></td>
    </tr>
  `;
  tablaDesktop.innerHTML += trTotales;

  const divTotalesMobile = `
    <div class="mt-3 p-4 bg-slate-100/50 dark:bg-slate-800/30 border-2 border-dashed border-slate-200 dark:border-azulcielo/30 rounded-2xl flex flex-col gap-1.5 items-end">
      <span class="text-[10px] font-black text-slate-500 dark:text-azulcielo/80 uppercase tracking-wider w-full text-right border-b border-slate-200 dark:border-azulcielo/20 pb-1 mb-1">Totales del Filtro</span>
      <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400">+$${totalIngresosHistorial.toFixed(2)} Ingresos</span>
      <span class="text-xs font-bold text-coral">-$${totalGastosHistorial.toFixed(2)} Gastos</span>
      <span class="text-xs font-bold text-azulcielo-dark dark:text-azulcielo">${totalAhorrosHistorial >= 0 ? "+" : ""}$${totalAhorrosHistorial.toFixed(2)} Ahorro</span>
    </div>
  `;
  listaMobile.innerHTML += divTotalesMobile;
}

function exportarHistorialCSV() {
  const mesSeleccionado = document.getElementById("mesFiltro").value;
  const categoria = document.getElementById("filtroCategoria").value;
  const alcance = document.getElementById("filtroAlcance").value;
  const diaFiltro = document.getElementById("filtroDia").value;

  const filtradas = transacciones.filter((t) => {
    if (alcance === "mes" && !(t.fecha || "").startsWith(mesSeleccionado))
      return false;
    if (
      alcance === "dia" &&
      t.fecha !== `${mesSeleccionado}-${diaFiltro}`
    )
      return false;
    if (filtroTipoActual && t.tipo !== filtroTipoActual) return false;
    if (categoria && t.categoria !== categoria) return false;
    return true;
  });

  if (!filtradas.length) {
    mostrarToast(
      "No hay movimientos para exportar con los filtros actuales",
      "info",
    );
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
  csvContent += "Fecha,Tipo,Categoría,Descripción,Monto\n";

  filtradas.forEach((t) => {
    const fila = [
      `"${t.fecha}"`,
      `"${t.tipo.toUpperCase()}"`,
      `"${(t.categoria || "").replace(/"/g, '""')}"`,
      `"${(t.descripcion || "").replace(/"/g, '""')}"`,
      parseFloat(t.monto).toFixed(2),
    ].join(",");
    csvContent += fila + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `reporte_presupuesto_${mesSeleccionado || "general"}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  mostrarToast("Reporte CSV descargado con éxito", "success");
}

function poblarSelectDias() {
  const selectDia = document.getElementById("filtroDia");
  if (!selectDia) return;
  selectDia.innerHTML = "";
  for (let i = 1; i <= 31; i++) {
    const dia = String(i).padStart(2, "0");
    selectDia.innerHTML += `<option value="${dia}">Día ${dia}</option>`;
  }
  selectDia.value = String(new Date().getDate()).padStart(2, "0");
}
