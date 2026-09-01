// =========================================================================
// MÓDULO DE PRESUPUESTOS Y CONFIGURACIÓN DE CATEGORÍAS
// =========================================================================

function renderizarInputsPresupuesto() {
  const contenedor = document.getElementById("contenedorInputsPresupuesto");
  if (!contenedor) return;
  contenedor.innerHTML = (categoriasMap.gasto || [])
    .map((cat) => {
      const limiteActual = presupuestos[cat] || "";
      return `
    <div class="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-azulcielo/20">
      <span class="text-xs font-bold text-slate-700 dark:text-crema truncate">${escapeHTML(cat)}</span>
      <div class="flex items-center gap-1.5 w-32 shrink-0">
        <span class="text-xs text-slate-400 font-bold">$</span>
        <input type="number" step="0.01" min="0" inputmode="decimal" data-categoria="${escapeHTML(cat)}" value="${limiteActual}" placeholder="Sin límite" class="input-presupuesto w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-azulcielo/30 p-2 rounded-lg text-slate-900 dark:text-crema text-xs font-bold text-right focus:border-azulelectrico focus:outline-none">
      </div>
    </div>
  `;
    })
    .join("");
}

function renderizarSeccionPresupuestos(gastosPorCat) {
  const grid = document.getElementById("gridPresupuestos");
  const contenedorAlertas = document.getElementById(
    "contenedorAlertasPresupuesto",
  );
  if (!grid) return;
  const categoriasConPresupuesto = Object.keys(presupuestos);

  if (!categoriasConPresupuesto.length) {
    if (contenedorAlertas) contenedorAlertas.classList.add("hidden");
    grid.innerHTML = `
    <div class="col-span-full text-center py-5 border border-dashed border-slate-300 dark:border-azulcielo/30 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/40">
      <p class="text-slate-500 dark:text-azulcielo text-xs mb-2">No has fijado límites de gasto mensual.</p>
      <button onclick="mostrarModalPresupuestos()" class="text-xs bg-azulelectrico text-slate-950 font-black px-3.5 py-1.5 rounded-xl transition shadow-md">
        Definir límites
      </button>
    </div>
  `;
    return;
  }

  let alertasHTML = "";

  grid.innerHTML = categoriasConPresupuesto
    .map((cat) => {
      const limite = presupuestos[cat];
      const gastado = gastosPorCat[cat] || 0;
      const porcentaje = Math.min(100, (gastado / limite) * 100);
      const restante = Math.max(0, limite - gastado);
      const excedido = gastado > limite;

      let colorBarra = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
      let colorTexto = "text-emerald-500";
      let badgeEstado =
        '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">Tranquilidad</span>';

      if (excedido) {
        colorBarra =
          "bg-coral shadow-[0_0_8px_rgba(255,102,72,0.8)] animate-pulse";
        colorTexto = "text-coral";
        badgeEstado =
          '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-coral/20 text-coral animate-pulse">Excedido</span>';
        alertasHTML += `
      <div class="p-3 rounded-2xl bg-coral/15 border border-coral text-coral text-xs font-bold flex items-center justify-between gap-2 shadow-sm">
        <span>⚠️ <strong>${escapeHTML(cat)}</strong> excedió su límite por <strong>$${(gastado - limite).toFixed(2)}</strong>.</span>
        <button onclick="filtrarPorCategoriaRapido('${escapeHTML(cat)}')" class="text-[11px] underline shrink-0 cursor-pointer">Ver</button>
      </div>
    `;
      } else if (porcentaje >= 80) {
        colorBarra = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]";
        colorTexto = "text-amber-500";
        badgeEstado =
          '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">Precaución</span>';
        alertasHTML += `
      <div class="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-between gap-2">
        <span>⚠️ <strong>${escapeHTML(cat)}</strong> ha alcanzado el <strong>${porcentaje.toFixed(0)}%</strong> de su presupuesto ($${gastado.toFixed(2)} de $${limite.toFixed(2)}).</span>
        <button onclick="filtrarPorCategoriaRapido('${escapeHTML(cat)}')" class="text-[11px] underline shrink-0 cursor-pointer">Ver</button>
      </div>
    `;
      } else if (porcentaje >= 50) {
        colorBarra = "bg-azulelectrico shadow-[0_0_8px_rgba(2,89,221,0.5)]";
        colorTexto = "text-azulelectrico";
        badgeEstado =
          '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-azulelectrico/10 text-azulelectrico">Medio</span>';
      }

      return `
    <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-azulcielo/20 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-slate-800 dark:text-crema truncate">${escapeHTML(cat)}</span>
        ${badgeEstado}
      </div>
      <div class="flex items-baseline justify-between text-xs">
        <span class="font-black ${colorTexto}">$${gastado.toFixed(2)}</span>
        <span class="text-slate-400 font-semibold text-[11px]">Máx: $${limite.toFixed(2)}</span>
      </div>
      <div class="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
        <div class="${colorBarra} h-full rounded-full transition-all duration-500" style="width: ${porcentaje}%"></div>
      </div>
      <div class="flex justify-between text-[10px] text-slate-500 dark:text-azulcielo font-semibold">
        <span>${porcentaje.toFixed(0)}% usado</span>
        <span>${excedido ? `+$${(gastado - limite).toFixed(2)}` : `-$${restante.toFixed(2)}`}</span>
      </div>
    </div>
  `;
    })
    .join("");

  if (contenedorAlertas) {
    if (alertasHTML) {
      contenedorAlertas.innerHTML = alertasHTML;
      contenedorAlertas.classList.remove("hidden");
    } else {
      contenedorAlertas.classList.add("hidden");
    }
  }
}

function filtrarTipoConfigCategorias(tipo) {
  tipoConfigCategoriaActual = tipo;
  renderizarConfiguracionCategorias();
}

function actualizarBotonesTipoConfig() {
  const btnGasto = document.getElementById("btnConfigCatGasto");
  const btnIngreso = document.getElementById("btnConfigCatIngreso");
  const btnAhorro = document.getElementById("btnConfigCatAhorro");
  if (!btnGasto || !btnIngreso || !btnAhorro) return;

  const baseInactive =
    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-azulcielo/20 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer";

  btnGasto.className =
    tipoConfigCategoriaActual === "gasto"
      ? "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-coral text-white shadow-sm cursor-pointer"
      : baseInactive;

  btnIngreso.className =
    tipoConfigCategoriaActual === "ingreso"
      ? "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-emerald-600 text-white shadow-sm cursor-pointer"
      : baseInactive;

  btnAhorro.className =
    tipoConfigCategoriaActual === "ahorro"
      ? "px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-amber-500 text-white shadow-sm cursor-pointer"
      : baseInactive;

  const cGas = document.getElementById("conteoCatGasto");
  const cIng = document.getElementById("conteoCatIngreso");
  const cAho = document.getElementById("conteoCatAhorro");
  if (cGas) cGas.textContent = `(${(categoriasMap.gasto || []).length})`;
  if (cIng)
    cIng.textContent = `(${(categoriasMap.ingreso || []).length})`;
  if (cAho) cAho.textContent = `(${(categoriasMap.ahorro || []).length})`;
}

function renderizarConfiguracionCategorias() {
  actualizarBotonesTipoConfig();
  const grid = document.getElementById("gridConfigCategorias");
  if (!grid) return;

  const lista = categoriasMap[tipoConfigCategoriaActual] || [];

  if (!lista.length) {
    grid.innerHTML = `
    <div class="col-span-full p-8 text-center text-slate-400 dark:text-azulcielo text-xs border border-dashed border-slate-200 dark:border-azulcielo/20 rounded-2xl space-y-2">
      <p class="text-xl">🏷️</p>
      <p class="font-bold">No hay categorías configuradas en este tipo</p>
      <button onclick="abrirModalCrearCategoria()" class="text-azulelectrico font-bold underline">Crear la primera</button>
    </div>
  `;
    return;
  }

  const conteoMovimientos = {};
  transacciones.forEach((t) => {
    if (t.tipo === tipoConfigCategoriaActual && t.categoria) {
      conteoMovimientos[t.categoria] =
        (conteoMovimientos[t.categoria] || 0) + 1;
    }
  });

  const tipoBadgeColor =
    tipoConfigCategoriaActual === "gasto"
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
      : tipoConfigCategoriaActual === "ingreso"
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";

  const tipoNombre =
    tipoConfigCategoriaActual === "gasto"
      ? "Gasto"
      : tipoConfigCategoriaActual === "ingreso"
        ? "Ingreso"
        : "Ahorro";

  grid.innerHTML = lista
    .map((cat) => {
      const icono = categoriaIconosMap[cat] || "🏷️";
      const movs = conteoMovimientos[cat] || 0;
      const catEscaped = escapeHTML(cat);

      return `
    <div class="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-azulcielo/20 flex flex-col justify-between space-y-3 hover:border-azulelectrico/40 transition">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-azulcielo/20 flex items-center justify-center text-lg shrink-0">
            ${escapeHTML(icono)}
          </span>
          <div class="min-w-0">
            <h4 class="text-xs sm:text-sm font-bold text-slate-800 dark:text-crema truncate">${catEscaped}</h4>
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${tipoBadgeColor}">${tipoNombre}</span>
          </div>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <button onclick="abrirModalEditarCategoria('${tipoConfigCategoriaActual}', '${catEscaped}')" class="p-1.5 rounded-lg text-slate-500 hover:text-azulelectrico hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-azulcielo/20 transition text-xs cursor-pointer" title="Editar">
            ✏️
          </button>
          <button onclick="eliminarCategoriaConfig('${tipoConfigCategoriaActual}', '${catEscaped}')" class="p-1.5 rounded-lg text-slate-400 hover:text-coral hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-azulcielo/20 transition text-xs cursor-pointer" title="Eliminar">
            🗑️
          </button>
        </div>
      </div>

      <div class="text-[10px] text-slate-400 dark:text-azulcielo flex items-center justify-between pt-1 border-t border-slate-100 dark:border-azulcielo/10">
        <span>Uso en historial:</span>
        <span class="font-bold text-slate-700 dark:text-slate-300">${movs} movimiento(s)</span>
      </div>
    </div>
  `;
    })
    .join("");
}

function guardarFormCategoria(e) {
  e.preventDefault();
  const nombreOriginal = document
    .getElementById("catEditNombreOriginal")
    .value.trim();
  const nuevoNombre = document.getElementById("catNombre").value.trim();
  const nuevoTipo = document.getElementById("catTipo").value || "gasto";
  const nuevoIcono =
    document.getElementById("catIcono").value.trim() || "🏷️";

  if (!nuevoNombre) {
    mostrarToast("Ingresa un nombre para la categoría", "error");
    return;
  }

  if (nombreOriginal) {
    ["ingreso", "gasto", "ahorro"].forEach((t) => {
      if (Array.isArray(categoriasMap[t])) {
        categoriasMap[t] = categoriasMap[t].filter(
          (c) => c !== nombreOriginal,
        );
      }
    });
    if (!categoriasMap[nuevoTipo]) categoriasMap[nuevoTipo] = [];
    categoriasMap[nuevoTipo].push(nuevoNombre);
    categoriaIconosMap[nuevoNombre] = nuevoIcono;

    if (nombreOriginal !== nuevoNombre) {
      transacciones.forEach((t) => {
        if (t.categoria === nombreOriginal) {
          t.categoria = nuevoNombre;
        }
      });
      if (presupuestos[nombreOriginal] !== undefined) {
        presupuestos[nuevoNombre] = presupuestos[nombreOriginal];
        delete presupuestos[nombreOriginal];
        guardarPresupuestosLocales();
      }
    }
    mostrarToast("Categoría actualizada", "success");
  } else {
    if (!categoriasMap[nuevoTipo]) categoriasMap[nuevoTipo] = [];
    if (categoriasMap[nuevoTipo].includes(nuevoNombre)) {
      mostrarToast("Ya existe una categoría con este nombre", "error");
      return;
    }
    categoriasMap[nuevoTipo].push(nuevoNombre);
    categoriaIconosMap[nuevoNombre] = nuevoIcono;
    tipoConfigCategoriaActual = nuevoTipo;
    mostrarToast("Categoría creada", "success");
  }

  guardarCategoriasEnStorage();
  guardarCacheLocal();
  actualizarOpcionesCategoria();
  if (typeof actualizarOpcionesFiltroCategoria === "function") {
    actualizarOpcionesFiltroCategoria();
  }
  actualizarInterfaz();
  renderizarConfiguracionCategorias();
  if (typeof renderizarInputsPresupuesto === "function") {
    renderizarInputsPresupuesto();
  }
  ocultarModalCategoria();
}

function eliminarCategoriaConfig(tipo, nombre) {
  const lista = categoriasMap[tipo] || [];
  if (lista.length <= 1) {
    mostrarToast(
      "Debe existir al menos una categoría en este tipo",
      "error",
    );
    return;
  }

  const conteoUso = transacciones.filter(
    (t) => t.tipo === tipo && t.categoria === nombre,
  ).length;
  let mensaje = `¿Eliminar la categoría "${nombre}"?`;
  if (conteoUso > 0) {
    const fallback =
      tipo === "gasto"
        ? "Otros Gastos"
        : tipo === "ingreso"
          ? "Otros Ingresos"
          : "Depositar a Ahorro";
    mensaje += `\nTiene ${conteoUso} movimiento(s) asociado(s) que se reasignarán a "${fallback}".`;
  }

  if (!confirm(mensaje)) return;

  const idx = lista.indexOf(nombre);
  if (idx !== -1) lista.splice(idx, 1);

  if (conteoUso > 0) {
    const fallback =
      tipo === "gasto"
        ? "Otros Gastos"
        : tipo === "ingreso"
          ? "Otros Ingresos"
          : "Depositar a Ahorro";
    if (!lista.includes(fallback)) lista.push(fallback);
    transacciones.forEach((t) => {
      if (t.tipo === tipo && t.categoria === nombre) {
        t.categoria = fallback;
      }
    });
  }

  if (presupuestos[nombre] !== undefined) {
    delete presupuestos[nombre];
    guardarPresupuestosLocales();
  }

  guardarCategoriasEnStorage();
  guardarCacheLocal();
  actualizarOpcionesCategoria();
  if (typeof actualizarOpcionesFiltroCategoria === "function") {
    actualizarOpcionesFiltroCategoria();
  }
  actualizarInterfaz();
  renderizarConfiguracionCategorias();
  mostrarToast("Categoría eliminada", "info");
}

function restablecerCategoriasPorDefecto() {
  if (
    !confirm(
      "¿Estás seguro de restablecer todas las categorías a sus valores por defecto?",
    )
  )
    return;

  categoriasMap.ingreso = [...CATEGORIAS_DEFAULT.ingreso];
  categoriasMap.gasto = [...CATEGORIAS_DEFAULT.gasto];
  categoriasMap.ahorro = [...CATEGORIAS_DEFAULT.ahorro];
  Object.assign(categoriaIconosMap, CATEGORIA_ICONOS_DEFAULT);

  guardarCategoriasEnStorage();
  guardarCacheLocal();
  actualizarOpcionesCategoria();
  if (typeof actualizarOpcionesFiltroCategoria === "function") {
    actualizarOpcionesFiltroCategoria();
  }
  actualizarInterfaz();
  renderizarConfiguracionCategorias();
  mostrarToast("Categorías restablecidas por defecto", "info");
}
