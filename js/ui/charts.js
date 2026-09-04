// =========================================================================
// MÓDULO DE INTERFAZ, MÉTRICAS Y GRÁFICOS INTERACTIVOS (CHART.JS)
// =========================================================================

function actualizarInterfaz() {
  const mesFiltroEl = document.getElementById("mesFiltro");
  const mesSeleccionado = mesFiltroEl ? mesFiltroEl.value : "";
  const filtradasMes = transacciones.filter((t) =>
    (t.fecha || "").startsWith(mesSeleccionado),
  );

  let ingresosMes = 0,
    gastosMes = 0;
  let countIngresos = 0,
    countGastos = 0;
  const gastosPorCat = {};

  filtradasMes.forEach((t) => {
    const montoNum = parseFloat(t.monto) || 0;
    if (t.tipo === "ingreso") {
      ingresosMes += montoNum;
      countIngresos++;
    } else if (t.tipo === "gasto") {
      gastosMes += montoNum;
      countGastos++;
      gastosPorCat[t.categoria] =
        (gastosPorCat[t.categoria] || 0) + montoNum;
    }
  });

  let ahorroAcumuladoTotal = 0;
  const fondosAhorroMapa = {};

  // Inicializar fondos con las metas en su orden de creación
  metasAhorro.forEach((m) => {
    if (m.nombre) fondosAhorroMapa[m.nombre.trim()] = 0;
  });

  // Procesar transacciones en orden cronológico
  const transaccionesCronologicas = [...transacciones].sort((a, b) =>
    (a.fecha || "").localeCompare(b.fecha || ""),
  );

  transaccionesCronologicas.forEach((t) => {
    if (
      typeof transaccionesPendientesEliminar !== "undefined" &&
      transaccionesPendientesEliminar.has(t.id)
    )
      return;

    const montoNum = parseFloat(t.monto) || 0;
    if (t.tipo === "ahorro") {
      const fondoNombre = (t.descripcion || "Ahorro General").trim();
      if (fondosAhorroMapa[fondoNombre] === undefined)
        fondosAhorroMapa[fondoNombre] = 0;

      const cat = (t.categoria || "").toLowerCase().trim();
      if (
        cat.includes("retirar") ||
        cat.includes("usar") ||
        cat.includes("retiro") ||
        cat.includes("gasto")
      ) {
        ahorroAcumuladoTotal -= montoNum;
        fondosAhorroMapa[fondoNombre] -= montoNum;
      } else {
        ahorroAcumuladoTotal += montoNum;
        fondosAhorroMapa[fondoNombre] += montoNum;
      }
    }
  });

  const pagosMap = {};
  transacciones.forEach((t) => {
    const montoNum = parseFloat(t.monto) || 0;
    if (
      t.tipo === "gasto" &&
      t.categoria === "Pago de Deuda" &&
      t.deuda_id
    ) {
      pagosMap[t.deuda_id] = (pagosMap[t.deuda_id] || 0) + montoNum;
    }
  });

  let totalDeudaPendiente = 0;
  const tablaDeudas = document.getElementById("tablaDeudas");
  const listaDeudasMobile = document.getElementById("listaDeudasMobile");

  if (tablaDeudas && listaDeudasMobile) {
    if (!deudas.length) {
      tablaDeudas.innerHTML = `<tr><td colspan="5" class="p-5 text-center text-slate-400 text-xs">Sin deudas registradas.</td></tr>`;
      listaDeudasMobile.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-azulcielo/20 rounded-2xl">Sin deudas registradas.</div>`;
    } else {
      // Desktop
      tablaDeudas.innerHTML = deudas
        .map((d) => {
          const pagado = pagosMap[d.id] || 0;
          const restante = Math.max(0, d.montoInicial - pagado);
          totalDeudaPendiente += restante;
          const pagadoPct = Math.min(100, (pagado / d.montoInicial) * 100);

          return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <td class="p-3 font-semibold text-slate-800 dark:text-crema">
                <div class="flex items-center gap-2">
                  <span>${escapeHTML(d.nombre)}</span>
                  ${restante === 0 ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600">Liquidada</span>' : ""}
                </div>
                <div class="w-24 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                  <div class="bg-azulelectrico h-full rounded-full" style="width: ${pagadoPct}%"></div>
                </div>
              </td>
              <td class="p-3 text-right font-medium">$${d.montoInicial.toFixed(2)}</td>
              <td class="p-3 text-right text-azulelectrico font-bold">$${pagado.toFixed(2)}</td>
              <td class="p-3 text-right font-black ${restante === 0 ? "text-slate-400 line-through" : "text-coral"}">$${restante.toFixed(2)}</td>
              <td class="p-3 text-center">
                <div class="flex justify-center items-center gap-1">
                  <button onclick="abonarDeuda('${d.id}')" aria-label="Abonar a la deuda" class="text-[11px] font-bold px-2 py-1 rounded-lg bg-coral/10 text-coral hover:bg-coral hover:text-white transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-coral">💸 Abonar</button>
                  <button onclick="incrementarDeudaDirecta('${d.id}')" aria-label="Editar deuda" class="text-xs p-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-azulelectrico rounded-xl">✏️</button>
                  <button onclick="eliminarDeuda('${d.id}')" aria-label="Eliminar deuda" class="text-slate-500 hover:text-coral p-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-coral rounded-xl">🗑️</button>
                </div>
              </td>
            </tr>
          `;
        })
        .join("");

      // Mobile
      listaDeudasMobile.innerHTML = deudas
        .map((d) => {
          const pagado = pagosMap[d.id] || 0;
          const restante = Math.max(0, d.montoInicial - pagado);
          const pagadoPct = Math.min(100, (pagado / d.montoInicial) * 100);

          return `
            <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-azulcielo/20 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-900 dark:text-crema">${escapeHTML(d.nombre)}</span>
                <div class="flex items-center gap-1">
                  <button onclick="abonarDeuda('${d.id}')" aria-label="Abonar a la deuda" class="text-[11px] font-bold px-2 py-1 rounded-lg bg-coral/10 text-coral hover:bg-coral hover:text-white transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-coral">💸 Abonar</button>
                  <button onclick="incrementarDeudaDirecta('${d.id}')" aria-label="Editar deuda" class="text-xs p-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-azulelectrico rounded-xl">✏️</button>
                  <button onclick="eliminarDeuda('${d.id}')" aria-label="Eliminar deuda" class="text-xs p-1 text-coral cursor-pointer focus:outline-none focus:ring-2 focus:ring-coral rounded-xl">🗑️</button>
                </div>
              </div>
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-azulelectrico">Abonado: $${pagado.toFixed(2)}</span>
                <span class="${restante === 0 ? "text-emerald-500" : "text-coral"} font-bold">Resta: $${restante.toFixed(2)}</span>
              </div>
              <div class="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-azulelectrico h-full rounded-full" style="width: ${pagadoPct}%"></div>
              </div>
            </div>
          `;
        })
        .join("");
    }
  }

  // Comparativa con el mes anterior
  const [anoActual, mesActual] = (mesSeleccionado || "")
    .split("-")
    .map(Number);
  let compIngresoHTML = "";
  let compGastoHTML = "";
  let ingresosMesAnt = 0;
  let gastosMesAnt = 0;

  if (anoActual && mesActual) {
    const fechaMesAnt = new Date(anoActual, mesActual - 2, 1);
    const mesAnteriorStr = `${fechaMesAnt.getFullYear()}-${String(fechaMesAnt.getMonth() + 1).padStart(2, "0")}`;
    const filtradasMesAnt = transacciones.filter((t) =>
      (t.fecha || "").startsWith(mesAnteriorStr),
    );

    filtradasMesAnt.forEach((t) => {
      const m = parseFloat(t.monto) || 0;
      if (t.tipo === "ingreso") ingresosMesAnt += m;
      else if (t.tipo === "gasto") gastosMesAnt += m;
    });

    if (ingresosMesAnt > 0) {
      const diffIng =
        ((ingresosMes - ingresosMesAnt) / ingresosMesAnt) * 100;
      const colorDiff = diffIng >= 0 ? "text-emerald-500" : "text-coral";
      const iconoDiff = diffIng >= 0 ? "▲ +" : "▼ ";
      compIngresoHTML = ` · <span class="${colorDiff} font-bold">${iconoDiff}${Math.abs(diffIng).toFixed(0)}%</span>`;
    }

    if (gastosMesAnt > 0) {
      const diffGas = ((gastosMes - gastosMesAnt) / gastosMesAnt) * 100;
      if (diffGas <= 0) {
        compGastoHTML = `<br><span class="text-emerald-500 font-bold text-xs mt-1 block">¡Genial! Has gastado ${Math.abs(diffGas).toFixed(0)}% menos que el mes pasado.</span>`;
      } else {
        compGastoHTML = ` · <span class="text-coral font-bold">▲ +${Math.abs(diffGas).toFixed(0)}%</span>`;
      }
    }
  }

  // Actualizar tarjetas de Totales
  const totalIngEl = document.getElementById("totalIngresos");
  const subIngEl = document.getElementById("subIngresos");
  const totalGasEl = document.getElementById("totalGastos");
  const subGasEl = document.getElementById("subGastos");
  const totalAhoEl = document.getElementById("totalAhorro");
  const subAhoEl = document.getElementById("subAhorro");
  const totalDeuEl = document.getElementById("totalDeudas");
  const subDeuEl = document.getElementById("subDeudas");

  if (totalIngEl) totalIngEl.textContent = `$${ingresosMes.toFixed(2)}`;
  if (subIngEl) subIngEl.innerHTML = `${countIngresos} mov.${compIngresoHTML}`;
  if (totalGasEl) totalGasEl.textContent = `$${gastosMes.toFixed(2)}`;
  if (subGasEl) subGasEl.innerHTML = `${countGastos} mov.${compGastoHTML}`;
  if (totalAhoEl) totalAhoEl.textContent = `$${ahorroAcumuladoTotal.toFixed(2)}`;
  if (subAhoEl)
    subAhoEl.textContent = `${Object.keys(fondosAhorroMapa).length} fondo(s)`;
  if (totalDeuEl) totalDeuEl.textContent = `$${totalDeudaPendiente.toFixed(2)}`;
  if (subDeuEl) subDeuEl.textContent = `${deudas.length} acreedor(es)`;

  let balance = 0;
  transacciones.forEach((t) => {
    if (t.fecha && t.fecha.substring(0, 7) <= mesSeleccionado) {
      if (
        typeof transaccionesPendientesEliminar !== "undefined" &&
        transaccionesPendientesEliminar.has(t.id)
      )
        return;
      const m = parseFloat(t.monto) || 0;
      if (t.tipo === "ingreso") {
        balance += m;
      } else if (t.tipo === "gasto") {
        balance -= m;
      } else if (t.tipo === "ahorro" && t.origen_ahorro === "balance") {
        balance -= m;
      }
    }
  });

  const balanceEl = document.getElementById("balanceNeto");
  const balanceBsEl = document.getElementById("balanceNetoBs");
  const signoBal = balance < 0 ? "-" : "";
  const partesBal = Math.abs(balance).toFixed(2).split(".");
  const enterosBal = parseInt(partesBal[0], 10).toLocaleString("en-US");
  const centavosBal = partesBal[1];

  if (balanceEl) {
    balanceEl.innerHTML = `${signoBal}$${enterosBal}<span class="text-base sm:text-lg font-bold opacity-75">.${centavosBal}</span>`;
    balanceEl.className = `text-2xl sm:text-3xl font-black tracking-tight tabular-nums font-mono-num ${balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-coral"}`;
  }

  if (balanceBsEl) {
    if (tasaBinanceCompra) {
      const balBs = Math.abs(balance) * tasaBinanceCompra;
      balanceBsEl.textContent = `≈ ${signoBal}${balBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs. (Tasa ${fuenteTasaActual}: ${tasaBinanceCompra.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`;
      balanceBsEl.classList.remove("hidden");
    } else {
      balanceBsEl.classList.add("hidden");
    }
  }

  const tasaAhorro =
    ingresosMes > 0
      ? Math.max(0, ((ingresosMes - gastosMes) / ingresosMes) * 100)
      : 0;
  const tasaAhorroEl = document.getElementById("tasaAhorro");
  if (tasaAhorroEl) {
    tasaAhorroEl.textContent = `Tasa de Ahorro: ${tasaAhorro.toFixed(0)}%`;
  }

  const badgeSalud = document.getElementById("badgeSaludFinanciera");
  if (badgeSalud) {
    if (balance > 0 && tasaAhorro >= 15) {
      badgeSalud.innerHTML = "🟢 Excelente";
      badgeSalud.className =
        "text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30";
    } else if (balance >= 0) {
      badgeSalud.innerHTML = "🟡 Estable";
      badgeSalud.className =
        "text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30";
    } else {
      badgeSalud.innerHTML = "🔴 Déficit";
      badgeSalud.className =
        "text-[10px] font-black px-2 py-0.5 rounded-full bg-coral/20 text-coral border border-coral/40";
    }
  }

  let alertasGlobalesHTML = "";

  if (anoActual && mesActual) {
    if (ingresosMesAnt > 0 && ingresosMes > ingresosMesAnt) {
      alertasGlobalesHTML += `
        <div class="snap-center shrink-0 w-64 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-emerald-500/30 shadow-md flex flex-col gap-2 relative overflow-hidden">
          <div class="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div class="flex items-center gap-2.5 relative z-10">
            <div class="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0">🎉</div>
            <h4 class="font-bold text-sm text-slate-800 dark:text-crema truncate">¡Nuevos Ingresos!</h4>
          </div>
          <p class="text-[11px] text-slate-500 dark:text-azulcielo/80 relative z-10 leading-snug">Tus ingresos de este mes superan a los del mes pasado.</p>
        </div>
      `;
    }
    if (gastosMesAnt > 0) {
      if (gastosMes >= gastosMesAnt) {
        alertasGlobalesHTML += `
          <div class="snap-center shrink-0 w-64 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-coral/30 shadow-md flex flex-col gap-2 relative overflow-hidden">
            <div class="absolute -right-4 -top-4 w-16 h-16 bg-coral/10 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center gap-2.5 relative z-10">
              <div class="w-8 h-8 rounded-xl bg-coral/15 text-coral flex items-center justify-center text-lg shrink-0">⚠️</div>
              <h4 class="font-bold text-sm text-slate-800 dark:text-crema truncate">Gastos Elevados</h4>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-azulcielo/80 relative z-10 leading-snug">Atención: Has superado tus gastos del mes pasado.</p>
          </div>
        `;
      } else if (gastosMes >= gastosMesAnt * 0.9) {
        alertasGlobalesHTML += `
          <div class="snap-center shrink-0 w-64 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-amber-500/30 shadow-md flex flex-col gap-2 relative overflow-hidden">
            <div class="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center gap-2.5 relative z-10">
              <div class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0">⚠️</div>
              <h4 class="font-bold text-sm text-slate-800 dark:text-crema truncate">Cerca del Límite</h4>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-azulcielo/80 relative z-10 leading-snug">Estás muy cerca de igualar o superar tus gastos del mes pasado.</p>
          </div>
        `;
      }
    }
  }

  Object.keys(presupuestos).forEach((cat) => {
    const limite = presupuestos[cat];
    const gastado = gastosPorCat[cat] || 0;
    if (limite > 0) {
      if (gastado >= limite) {
        const excedidoPor = gastado - limite;
        alertasGlobalesHTML += `
          <div class="snap-center shrink-0 w-64 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-coral/30 shadow-md flex flex-col gap-2 relative overflow-hidden">
            <div class="absolute -right-4 -top-4 w-16 h-16 bg-coral/10 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center gap-2.5 relative z-10">
              <div class="w-8 h-8 rounded-xl bg-coral/15 text-coral flex items-center justify-center text-lg shrink-0">🚨</div>
              <h4 class="font-bold text-sm text-slate-800 dark:text-crema truncate">Presupuesto Excedido</h4>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-azulcielo/80 relative z-10 leading-snug">Has superado el límite en <strong>${escapeHTML(cat)}</strong> por <strong>$${excedidoPor.toFixed(2)}</strong>.</p>
          </div>
        `;
      } else if (gastado >= limite * 0.9) {
        alertasGlobalesHTML += `
          <div class="snap-center shrink-0 w-64 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-amber-500/30 shadow-md flex flex-col gap-2 relative overflow-hidden">
            <div class="absolute -right-4 -top-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center gap-2.5 relative z-10">
              <div class="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0">⚠️</div>
              <h4 class="font-bold text-sm text-slate-800 dark:text-crema truncate">Presupuesto al Borde</h4>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-azulcielo/80 relative z-10 leading-snug">Estás a punto de alcanzar el límite en <strong>${escapeHTML(cat)}</strong>.</p>
          </div>
        `;
      }
    }
  });

  metasAhorro.forEach((meta) => {
    const acumulado = Math.max(0, fondosAhorroMapa[meta.nombre] || 0);
    if (meta.objetivo > 0) {
      if (acumulado >= meta.objetivo) {
        const excedente = acumulado - meta.objetivo;
        const textoExtra =
          excedente > 0
            ? ` ¡Y la has superado por $${excedente.toFixed(2)}!`
            : " ¡Increíble!";
        alertasGlobalesHTML += `
          <div class="snap-center shrink-0 w-64 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-emerald-500/30 shadow-md flex flex-col gap-2 relative overflow-hidden">
            <div class="absolute -right-4 -top-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center gap-2.5 relative z-10">
              <div class="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-lg shrink-0">🏆</div>
              <h4 class="font-bold text-sm text-slate-800 dark:text-crema truncate">¡Meta Cumplida!</h4>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-azulcielo/80 relative z-10 leading-snug">Has alcanzado tu objetivo para <strong>${escapeHTML(meta.nombre)}</strong>.${textoExtra}</p>
          </div>
        `;
      } else if (acumulado >= meta.objetivo * 0.9) {
        alertasGlobalesHTML += `
          <div class="snap-center shrink-0 w-64 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-azulcielo/30 shadow-md flex flex-col gap-2 relative overflow-hidden">
            <div class="absolute -right-4 -top-4 w-16 h-16 bg-azulcielo/10 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center gap-2.5 relative z-10">
              <div class="w-8 h-8 rounded-xl bg-azulcielo/15 text-azulcielo-dark dark:text-azulcielo flex items-center justify-center text-lg shrink-0">🎯</div>
              <h4 class="font-bold text-sm text-slate-800 dark:text-crema truncate">¡Casi lo logras!</h4>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-azulcielo/80 relative z-10 leading-snug">A poco de cumplir <strong>${escapeHTML(meta.nombre)}</strong>. ¡Sigue así!</p>
          </div>
        `;
      }
    }
  });

  const contenedorAlertasGlobales = document.getElementById(
    "contenedorAlertasGlobales",
  );
  if (contenedorAlertasGlobales) {
    if (alertasGlobalesHTML) {
      contenedorAlertasGlobales.innerHTML = alertasGlobalesHTML;
      contenedorAlertasGlobales.classList.remove("hidden");
    } else {
      contenedorAlertasGlobales.innerHTML = "";
      contenedorAlertasGlobales.classList.add("hidden");
    }
  }

  if (typeof renderizarSeccionPresupuestos === "function") {
    renderizarSeccionPresupuestos(gastosPorCat);
  }
  if (typeof renderizarMetasAhorro === "function") {
    renderizarMetasAhorro(fondosAhorroMapa);
  }
  renderizarEstadisticasFinancieras(filtradasMes, fondosAhorroMapa);
  if (typeof renderizarHistorialFiltrado === "function") {
    renderizarHistorialFiltrado();
  }
}

function seleccionarMetricaEstadistica(metrica) {
  activeEstadisticaMetrica = metrica;
  actualizarEstilosBotonesMetrica();
  renderizarEstadisticasFinancieras(
    ultimasFiltradasMes,
    ultimosFondosAhorroMapa,
  );
}

function actualizarEstilosBotonesMetrica() {
  const btnAll = document.getElementById("btnMetricaAll");
  const btnInc = document.getElementById("btnMetricaIncomes");
  const btnExp = document.getElementById("btnMetricaExpenses");
  const btnSav = document.getElementById("btnMetricaSavings");

  if (!btnAll || !btnInc || !btnExp || !btnSav) return;

  const baseInactive =
    "metrica-chip px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-azulcielo/20 cursor-pointer";

  btnAll.className =
    activeEstadisticaMetrica === "all"
      ? "metrica-chip px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-azulelectrico text-slate-950 font-black shadow-sm shadow-azulelectrico/30 cursor-pointer"
      : `${baseInactive} hover:bg-azulelectrico/10 hover:text-azulelectrico`;

  btnInc.className =
    activeEstadisticaMetrica === "incomes"
      ? "metrica-chip px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-cyan-500 text-white shadow-sm shadow-cyan-500/30 cursor-pointer"
      : `${baseInactive} hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400`;

  btnExp.className =
    activeEstadisticaMetrica === "expenses"
      ? "metrica-chip px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-rose-500 text-white shadow-sm shadow-rose-500/30 cursor-pointer"
      : `${baseInactive} hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400`;

  btnSav.className =
    activeEstadisticaMetrica === "savings"
      ? "metrica-chip px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-amber-500 text-white shadow-sm shadow-amber-500/30 cursor-pointer"
      : `${baseInactive} hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400`;
}

function renderizarEstadisticasFinancieras(filtradasMes, fondosMapa) {
  ultimasFiltradasMes = filtradasMes || [];
  ultimosFondosAhorroMapa = fondosMapa || {};

  actualizarEstilosBotonesMetrica();

  const esOscuro = document.documentElement.classList.contains("dark");
  const colorTexto = esOscuro ? "#9cd3b0" : "#475569";
  const colorGrid = esOscuro
    ? "rgba(27, 71, 48, 0.3)"
    : "rgba(148, 163, 184, 0.18)";

  const mesFiltroEl = document.getElementById("mesFiltro");
  const mesSeleccionado =
    (mesFiltroEl ? mesFiltroEl.value : "") ||
    obtenerFechaLocalISO().slice(0, 7);
  const [anoStr, mesStr] = mesSeleccionado.split("-");
  const anoNum = parseInt(anoStr, 10) || new Date().getFullYear();
  const mesNum = parseInt(mesStr, 10) || new Date().getMonth() + 1;

  const diasEnMes = new Date(anoNum, mesNum, 0).getDate();
  const labelsDias = Array.from({ length: diasEnMes }, (_, i) =>
    String(i + 1),
  );

  const ingresosPorDia = new Array(diasEnMes).fill(0);
  const gastosPorDia = new Array(diasEnMes).fill(0);
  const ahorrosPorDia = new Array(diasEnMes).fill(0);

  let totalIngresos = 0;
  let totalGastos = 0;
  let totalAhorros = 0;

  const ingresosMap = {};
  const gastosMap = {};
  const ahorrosMap = {};

  ultimasFiltradasMes.forEach((t) => {
    const montoNum = parseFloat(t.monto) || 0;
    const diaIndex = parseInt((t.fecha || "").split("-")[2], 10) - 1;

    if (t.tipo === "ingreso") {
      totalIngresos += montoNum;
      ingresosMap[t.categoria] =
        (ingresosMap[t.categoria] || 0) + montoNum;
      if (diaIndex >= 0 && diaIndex < diasEnMes)
        ingresosPorDia[diaIndex] += montoNum;
    } else if (t.tipo === "gasto") {
      totalGastos += montoNum;
      gastosMap[t.categoria] = (gastosMap[t.categoria] || 0) + montoNum;
      if (diaIndex >= 0 && diaIndex < diasEnMes)
        gastosPorDia[diaIndex] += montoNum;
    } else if (t.tipo === "ahorro") {
      const fondo = (t.descripcion || "Ahorro General").trim();
      const cat = (t.categoria || "").toLowerCase();
      if (
        cat.includes("retirar") ||
        cat.includes("usar") ||
        cat.includes("retiro") ||
        cat.includes("gasto")
      ) {
        totalAhorros -= montoNum;
        ahorrosMap[fondo] = (ahorrosMap[fondo] || 0) - montoNum;
        if (diaIndex >= 0 && diaIndex < diasEnMes)
          ahorrosPorDia[diaIndex] -= montoNum;
      } else {
        totalAhorros += montoNum;
        ahorrosMap[fondo] = (ahorrosMap[fondo] || 0) + montoNum;
        if (diaIndex >= 0 && diaIndex < diasEnMes)
          ahorrosPorDia[diaIndex] += montoNum;
      }
    }
  });

  // Actualizar insignias de monto en la cabecera
  const bIng = document.getElementById("badgeMontoIngresos");
  const bGas = document.getElementById("badgeMontoGastos");
  const bSav = document.getElementById("badgeMontoAhorros");
  if (bIng)
    bIng.textContent = `($${totalIngresos.toLocaleString("en-US", { maximumFractionDigits: 0 })})`;
  if (bGas)
    bGas.textContent = `($${totalGastos.toLocaleString("en-US", { maximumFractionDigits: 0 })})`;
  if (bSav)
    bSav.textContent = `($${Math.max(0, totalAhorros).toLocaleString("en-US", { maximumFractionDigits: 0 })})`;

  const isAll = activeEstadisticaMetrica === "all";
  const isIncomes = activeEstadisticaMetrica === "incomes";
  const isExpenses = activeEstadisticaMetrica === "expenses";
  const isSavings = activeEstadisticaMetrica === "savings";

  const canvasMultilinea = document.getElementById("graficoMultilinea");
  if (!canvasMultilinea) return;
  const ctx = canvasMultilinea.getContext("2d");

  const gradIngresos = ctx.createLinearGradient(0, 0, 0, 240);
  gradIngresos.addColorStop(0, "rgba(6, 182, 212, 0.28)");
  gradIngresos.addColorStop(1, "rgba(6, 182, 212, 0.0)");

  const gradGastos = ctx.createLinearGradient(0, 0, 0, 240);
  gradGastos.addColorStop(0, "rgba(244, 63, 94, 0.28)");
  gradGastos.addColorStop(1, "rgba(244, 63, 94, 0.0)");

  const gradAhorros = ctx.createLinearGradient(0, 0, 0, 240);
  gradAhorros.addColorStop(0, "rgba(234, 179, 8, 0.28)");
  gradAhorros.addColorStop(1, "rgba(234, 179, 8, 0.0)");

  const datasets = [
    {
      label: "Ingresos",
      data: ingresosPorDia,
      borderColor:
        isIncomes || isAll
          ? "#06b6d4"
          : esOscuro
            ? "rgba(6, 182, 212, 0.15)"
            : "rgba(6, 182, 212, 0.22)",
      backgroundColor: isIncomes || isAll ? gradIngresos : "transparent",
      borderWidth: isIncomes ? 3.5 : isAll ? 2.5 : 1.5,
      pointRadius: isIncomes ? 4.5 : isAll ? 3 : 0,
      pointHoverRadius: 7,
      pointHoverBorderWidth: 4,
      pointHoverBorderColor: "rgba(6, 182, 212, 0.35)",
      pointBackgroundColor: "#06b6d4",
      pointBorderColor: esOscuro ? "#0C2417" : "#ffffff",
      pointBorderWidth: 2,
      fill: isIncomes || isAll,
      tension: 0.35,
    },
    {
      label: "Gastos",
      data: gastosPorDia,
      borderColor:
        isExpenses || isAll
          ? "#f43f5e"
          : esOscuro
            ? "rgba(244, 63, 94, 0.15)"
            : "rgba(244, 63, 94, 0.22)",
      backgroundColor: isExpenses || isAll ? gradGastos : "transparent",
      borderWidth: isExpenses ? 3.5 : isAll ? 2.5 : 1.5,
      pointRadius: isExpenses ? 4.5 : isAll ? 3 : 0,
      pointHoverRadius: 7,
      pointHoverBorderWidth: 4,
      pointHoverBorderColor: "rgba(244, 63, 94, 0.35)",
      pointBackgroundColor: "#f43f5e",
      pointBorderColor: esOscuro ? "#0C2417" : "#ffffff",
      pointBorderWidth: 2,
      fill: isExpenses || isAll,
      tension: 0.35,
    },
    {
      label: "Ahorro",
      data: ahorrosPorDia,
      borderColor:
        isSavings || isAll
          ? "#eab308"
          : esOscuro
            ? "rgba(234, 179, 8, 0.15)"
            : "rgba(234, 179, 8, 0.22)",
      backgroundColor: isSavings || isAll ? gradAhorros : "transparent",
      borderWidth: isSavings ? 3.5 : isAll ? 2.5 : 1.5,
      pointRadius: isSavings ? 4.5 : isAll ? 3 : 0,
      pointHoverRadius: 7,
      pointHoverBorderWidth: 4,
      pointHoverBorderColor: "rgba(234, 179, 8, 0.35)",
      pointBackgroundColor: "#eab308",
      pointBorderColor: esOscuro ? "#0C2417" : "#ffffff",
      pointBorderWidth: 2,
      fill: isSavings || isAll,
      tension: 0.35,
    },
  ];

  if (graficoMultilineaChart) graficoMultilineaChart.destroy();
  graficoMultilineaChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labelsDias,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      onClick: (e, elements) => {
        if (elements && elements.length > 0) {
          const datasetIdx = elements[0].datasetIndex;
          if (datasetIdx === 0)
            seleccionarMetricaEstadistica(
              activeEstadisticaMetrica === "incomes" ? "all" : "incomes",
            );
          else if (datasetIdx === 1)
            seleccionarMetricaEstadistica(
              activeEstadisticaMetrica === "expenses"
                ? "all"
                : "expenses",
            );
          else if (datasetIdx === 2)
            seleccionarMetricaEstadistica(
              activeEstadisticaMetrica === "savings" ? "all" : "savings",
            );
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: esOscuro ? "#0C2417" : "#ffffff",
          titleColor: esOscuro ? "#F0FDF4" : "#0f172a",
          bodyColor: esOscuro ? "#9cd3b0" : "#06160E",
          borderColor: esOscuro
            ? "rgba(27, 71, 48, 0.5)"
            : "rgba(163, 230, 53, 0.3)",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 12,
          boxPadding: 4,
          usePointStyle: true,
          titleFont: {
            size: 11,
            weight: "bold",
            family: "system-ui, sans-serif",
          },
          bodyFont: {
            size: 10.5,
            weight: "600",
            family: "system-ui, sans-serif",
          },
          callbacks: {
            title: (items) => `Día ${items[0]?.label || ""} del mes`,
            label: (ctx) => {
              const val = Number(ctx.raw || 0);
              const lbl = ctx.dataset.label || "";
              const icon =
                lbl === "Ingresos"
                  ? "🟢"
                  : lbl === "Gastos"
                    ? "🔴"
                    : "🟡";
              return ` ${icon} ${lbl}: $${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: colorTexto,
            font: {
              size: 9.5,
              weight: "bold",
              family: "system-ui, sans-serif",
            },
            maxTicksLimit: 12,
            callback: function (val) {
              return "D" + this.getLabelForValue(val);
            },
          },
          grid: { color: colorGrid },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: colorTexto,
            font: {
              size: 9,
              weight: "600",
              family: "system-ui, sans-serif",
            },
            callback: (val) => "$" + Number(val).toLocaleString("en-US"),
          },
          grid: { color: colorGrid },
        },
      },
    },
  });

  renderizarListaCategoriasDesglose(
    ingresosMap,
    gastosMap,
    ahorrosMap,
    totalIngresos,
    totalGastos,
    totalAhorros,
  );
}

function renderizarListaCategoriasDesglose(
  ingresosMap,
  gastosMap,
  ahorrosMap,
  totalIng,
  totalGas,
  totalAho,
) {
  const contenedor = document.getElementById("listaDesgloseCategorias");
  const titulo = document.getElementById("tituloDesgloseCategorias");
  const conteo = document.getElementById("conteoCategoriasDesglose");
  if (!contenedor || !titulo || !conteo) return;

  let items = [];

  if (activeEstadisticaMetrica === "incomes") {
    titulo.innerHTML = "<span>🟢</span> Desglose de Ingresos";
    items = Object.entries(ingresosMap)
      .filter(([_, m]) => m > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, monto]) => {
        const pct =
          totalIng > 0 ? ((monto / totalIng) * 100).toFixed(1) : "0.0";
        return {
          categoria: cat,
          tipo: "Ingreso",
          monto,
          porcentaje: pct,
          icono: categoriaIconosMap[cat] || "💼",
          badgeClase:
            "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20",
          barraClase: "bg-cyan-500",
        };
      });
  } else if (activeEstadisticaMetrica === "expenses") {
    titulo.innerHTML = "<span>🔴</span> Desglose de Gastos";
    items = Object.entries(gastosMap)
      .filter(([_, m]) => m > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, monto]) => {
        const pct =
          totalGas > 0 ? ((monto / totalGas) * 100).toFixed(1) : "0.0";
        return {
          categoria: cat,
          tipo: "Gasto",
          monto,
          porcentaje: pct,
          icono: categoriaIconosMap[cat] || "🛒",
          badgeClase:
            "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
          barraClase: "bg-rose-500",
        };
      });
  } else if (activeEstadisticaMetrica === "savings") {
    titulo.innerHTML = "<span>🟡</span> Fondos y Metas de Ahorro";
    const totalAhoPositivo = Math.max(1, totalAho);
    items = Object.entries(ahorrosMap)
      .filter(([_, m]) => m > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([fondo, monto]) => {
        const pct =
          totalAho > 0
            ? ((monto / totalAhoPositivo) * 100).toFixed(1)
            : "0.0";
        const metaAsoc = metasAhorro.find((m) => m.nombre === fondo);
        return {
          categoria: fondo,
          tipo: "Fondo de Ahorro",
          monto,
          porcentaje: pct,
          icono: metaAsoc?.icono || categoriaIconosMap[fondo] || "🏦",
          badgeClase:
            "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
          barraClase: "bg-amber-500",
        };
      });
  } else {
    titulo.innerHTML = "<span>📊</span> Resumen Combinado de Categorías";
    const flujoTotal = totalIng + totalGas + Math.max(0, totalAho);

    const listIng = Object.entries(ingresosMap)
      .filter(([_, m]) => m > 0)
      .map(([cat, monto]) => ({
        categoria: cat,
        tipo: "Ingreso",
        monto,
        porcentaje:
          flujoTotal > 0
            ? ((monto / flujoTotal) * 100).toFixed(1)
            : "0.0",
        icono: categoriaIconosMap[cat] || "💼",
        badgeClase:
          "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20",
        barraClase: "bg-cyan-500",
      }));

    const listGas = Object.entries(gastosMap)
      .filter(([_, m]) => m > 0)
      .map(([cat, monto]) => ({
        categoria: cat,
        tipo: "Gasto",
        monto,
        porcentaje:
          flujoTotal > 0
            ? ((monto / flujoTotal) * 100).toFixed(1)
            : "0.0",
        icono: categoriaIconosMap[cat] || "🛒",
        badgeClase:
          "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
        barraClase: "bg-rose-500",
      }));

    const listAho = Object.entries(ahorrosMap)
      .filter(([_, m]) => m > 0)
      .map(([fondo, monto]) => {
        const metaAsoc = metasAhorro.find((m) => m.nombre === fondo);
        return {
          categoria: fondo,
          tipo: "Ahorro",
          monto,
          porcentaje:
            flujoTotal > 0
              ? ((monto / flujoTotal) * 100).toFixed(1)
              : "0.0",
          icono: metaAsoc?.icono || categoriaIconosMap[fondo] || "🏦",
          badgeClase:
            "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
          barraClase: "bg-amber-500",
        };
      });

    items = [...listIng, ...listGas, ...listAho].sort(
      (a, b) => b.monto - a.monto,
    );
  }

  conteo.textContent = `${items.length} elemento(s)`;

  if (items.length === 0) {
    contenedor.innerHTML = `
      <div class="col-span-full p-6 text-center text-slate-400 dark:text-azulcielo text-xs border border-dashed border-slate-200 dark:border-azulcielo/20 rounded-2xl">
        <span>🔍</span> No hay movimientos registrados para esta métrica en el período seleccionado.
      </div>
    `;
    return;
  }

  contenedor.innerHTML = items
    .map(
      (item) => `
      <div class="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/70 dark:border-azulcielo/15 space-y-2 hover:border-azulelectrico/40 transition">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-azulcielo/20 flex items-center justify-center text-sm shrink-0">
              ${escapeHTML(item.icono)}
            </span>
            <div class="min-w-0">
              <p class="text-xs sm:text-sm font-bold text-slate-800 dark:text-crema truncate">${escapeHTML(item.categoria)}</p>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.badgeClase}">${escapeHTML(item.tipo)}</span>
            </div>
          </div>
          <div class="text-right shrink-0">
            <p class="text-xs sm:text-sm font-black text-slate-900 dark:text-crema">$${item.monto.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p class="text-[10px] font-bold text-slate-400 dark:text-azulcielo">${item.porcentaje}%</p>
          </div>
        </div>
        <div class="w-full bg-slate-200/80 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500 ${item.barraClase}" style="width: ${Math.min(100, Math.max(2, parseFloat(item.porcentaje)))}%"></div>
        </div>
      </div>
    `,
    )
    .join("");
}
