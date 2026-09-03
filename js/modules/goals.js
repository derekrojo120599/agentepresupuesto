// =========================================================================
// MÓDULO DE METAS DE AHORRO Y FONDOS
// =========================================================================

function obtenerFondosAhorroMapaActual() {
  const fondosAhorroMapa = {};
  metasAhorro.forEach((m) => {
    if (m.nombre) fondosAhorroMapa[m.nombre.trim()] = 0;
  });

  const transaccionesCronologicas = [...transacciones].sort((a, b) =>
    (a.fecha || "").localeCompare(b.fecha || ""),
  );

  transaccionesCronologicas.forEach((t) => {
    if (
      typeof transaccionesPendientesEliminar !== "undefined" &&
      transaccionesPendientesEliminar.has(t.id)
    )
      return;

    const montoNum = typeof obtenerMontoEnUSD === "function" ? obtenerMontoEnUSD(t, tasaBinanceCompra) : (parseFloat(t.monto) || 0);
    if (t.tipo === "ahorro") {
      const fondoNombre = (t.descripcion || "Ahorro General").trim();
      if (fondosAhorroMapa[fondoNombre] === undefined)
        fondosAhorroMapa[fondoNombre] = 0;

      const cat = (t.categoria || "").toLowerCase();
      const esRetiro =
        cat.includes("retirar") ||
        cat.includes("usar") ||
        cat.includes("retiro") ||
        cat.includes("gasto");
      if (esRetiro) {
        fondosAhorroMapa[fondoNombre] -= montoNum;
      } else {
        fondosAhorroMapa[fondoNombre] += montoNum;
      }
    }
  });

  return fondosAhorroMapa;
}

function actualizarSelectMetas() {
  const select = document.getElementById("metaAhorroSelect");
  if (!select) return;

  const opciones = metasAhorro.map((m) => m.nombre);
  if (!opciones.includes("Ahorro General")) {
    opciones.unshift("Ahorro General");
  }

  select.innerHTML = opciones
    .map(
      (nombre) =>
        `<option value="${escapeHTML(nombre)}">${escapeHTML(nombre)}</option>`,
    )
    .join("");
}

function depositarEnMetaRapido(nombreMeta) {
  const tipoSelect = document.getElementById("tipo");
  const categoriaSelect = document.getElementById("categoria");
  const metaAhorroSelect = document.getElementById("metaAhorroSelect");

  if (tipoSelect) tipoSelect.value = "ahorro";
  if (typeof sincronizarBotonesTipo === "function") sincronizarBotonesTipo();
  if (typeof actualizarOpcionesCategoria === "function")
    actualizarOpcionesCategoria();
  if (categoriaSelect) categoriaSelect.value = "Depositar a Ahorro";
  document.getElementById("descripcion").value = nombreMeta;
  if (typeof evaluarSeleccionesEspeciales === "function")
    evaluarSeleccionesEspeciales();
  if (metaAhorroSelect) metaAhorroSelect.value = nombreMeta;
  if (typeof abrirRegistroMobile === "function") abrirRegistroMobile();
}

function eliminarMetaAhorro(metaId) {
  if (
    !confirm(
      "¿Eliminar esta meta? Los fondos registrados en transacciones no se borrarán.",
    )
  )
    return;
  metasAhorro = metasAhorro.filter((m) => m.id !== metaId);
  guardarMetasLocales();
  actualizarSelectMetas();
  actualizarInterfaz();
  mostrarToast("Meta eliminada", "info");
}

function renderizarMetasAhorro(fondosMapa) {
  const grid = document.getElementById("gridMetasAhorro");
  if (!grid) return;

  if (!metasAhorro.length) {
    grid.innerHTML = `
    <div class="col-span-full text-center py-5 border border-dashed border-slate-300 dark:border-azulcielo/30 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/40">
      <p class="text-slate-500 dark:text-azulcielo text-xs mb-2">No has creado metas de ahorro.</p>
      <button onclick="mostrarModalMetaAhorro()" class="text-xs bg-azulcielo text-slate-950 font-bold px-3.5 py-1.5 rounded-xl transition shadow-md">
        Crear meta
      </button>
    </div>
  `;
    return;
  }

  grid.innerHTML = metasAhorro
    .map((meta) => {
      const acumulado = Math.max(0, fondosMapa[meta.nombre] || 0);
      const porcentaje = Math.min(100, (acumulado / meta.objetivo) * 100);
      const completada = acumulado >= meta.objetivo;

      let textoProyeccion = "";
      if (!completada && acumulado > 0) {
        const restante = meta.objetivo - acumulado;
        textoProyeccion = `<p class="text-[10px] text-azulcielo font-medium bg-azulcielo/10 px-2 py-1 rounded-lg mt-1 inline-block">Te faltan $${restante.toFixed(2)} para lograrlo 🚀</p>`;
      } else if (completada) {
        textoProyeccion = `<p class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg mt-1 inline-block">¡Meta alcanzada, sigue así! 🎉</p>`;
      } else {
        textoProyeccion = `<p class="text-[10px] text-slate-400 font-medium mt-1">¡Abona por primera vez para comenzar! 💪</p>`;
      }

      return `
    <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border ${completada ? "border-emerald-500/50 scale-[1.01]" : "border-slate-200 dark:border-azulcielo/20"} space-y-2.5 transition-all duration-300">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="text-xl p-2 rounded-xl ${completada ? "bg-emerald-500/20 text-emerald-500" : "bg-azulcielo/15 text-azulcielo"} shrink-0 transition-colors">${meta.icono || "🎯"}</span>
          <div class="min-w-0">
            <h3 class="font-bold text-slate-900 dark:text-crema text-xs sm:text-sm truncate">${escapeHTML(meta.nombre)}</h3>
            ${meta.fechaLimite ? `<p class="text-[10px] text-slate-400 truncate">Límite: ${escapeHTML(meta.fechaLimite)}</p>` : ""}
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="mostrarModalMetaAhorro('${meta.id}')" class="text-slate-400 hover:text-azulcielo p-1 text-xs cursor-pointer">✏️</button>
          <button onclick="eliminarMetaAhorro('${meta.id}')" class="text-slate-400 hover:text-coral p-1 text-xs cursor-pointer">🗑️</button>
        </div>
      </div>

      <div class="flex items-baseline justify-between text-xs">
        <span class="font-black ${completada ? "text-emerald-500" : "text-azulcielo-dark dark:text-azulcielo"} text-sm">$${acumulado.toFixed(2)}</span>
        <span class="text-slate-400 text-[11px] font-semibold">Obj: $${meta.objetivo.toFixed(2)}</span>
      </div>

      <div class="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden relative ${completada ? "ring-1 ring-emerald-500/30" : ""}">
        <div class="${completada ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-azulelectrico"} h-full rounded-full transition-all duration-500 relative overflow-hidden" style="width: ${porcentaje}%">
          ${completada ? '<div class="absolute inset-0 bg-white/20 animate-pulse"></div>' : ""}
        </div>
      </div>
      
      ${textoProyeccion}

      <div class="flex items-center justify-between text-[11px] pt-1">
        <span class="font-bold ${completada ? "text-emerald-500" : "text-slate-500 dark:text-azulcielo"} text-[10px]">
          ${completada ? "🎉 ¡Completada!" : `${porcentaje.toFixed(0)}%`}
        </span>
        <button onclick="depositarEnMetaRapido('${escapeHTML(meta.nombre)}')" class="text-xs ${completada ? "bg-emerald-500/20 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400" : "bg-azulcielo/20 hover:bg-azulcielo text-azulcielo-dark dark:text-azulcielo"} hover:text-slate-950 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer">
          + Abonar
        </button>
      </div>
    </div>
  `;
    })
    .join("");
}
