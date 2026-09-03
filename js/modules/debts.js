// =========================================================================
// MÓDULO DE GESTIÓN DE DEUDAS Y AMORTIZACIONES
// =========================================================================

async function crearDeuda(e) {
  e.preventDefault();
  const form = e.target;
  const btn = bloquearBoton(form, "Guardando...");

  try {
    const nombreIngresado = document
      .getElementById("deudaNombre")
      .value.trim();
    const montoStr = (
      document.getElementById("deudaMontoInicial").value || ""
    ).replace(",", ".");
    const montoIngresado = parseFloat(montoStr);

    if (
      !nombreIngresado ||
      isNaN(montoIngresado) ||
      montoIngresado <= 0
    ) {
      mostrarToast("Ingresa un nombre y monto válido mayor a 0", "error");
      return;
    }

    if (!navigator.onLine) {
      const tempId = -Date.now();
      deudas.push({
        id: tempId,
        nombre: nombreIngresado,
        montoInicial: montoIngresado,
      });
      encolarOperacion("insert", "deudas", {
        nombre: nombreIngresado,
        monto_inicial: montoIngresado,
      });
      guardarCacheLocal();
      form.reset();
      ocultarModalDeuda();
      actualizarOpcionesCategoria();
      actualizarInterfaz();
      mostrarToast("Deuda guardada offline", "info");
      return;
    }

    const existente = deudas.find(
      (d) => d.nombre.toLowerCase() === nombreIngresado.toLowerCase(),
    );
    let error;

    if (existente) {
      const nuevoMonto = existente.montoInicial + montoIngresado;
      ({ error } = await supabaseClient
        .from("deudas")
        .update({ monto_inicial: nuevoMonto })
        .eq("id", existente.id));
    } else {
      ({ error } = await supabaseClient
        .from("deudas")
        .insert([
          { nombre: nombreIngresado, monto_inicial: montoIngresado },
        ]));
    }

    if (error) {
      console.warn("Fallo Supabase al guardar deuda, guardando offline:", error);
      const tempId = -Date.now();
      deudas.push({
        id: tempId,
        nombre: nombreIngresado,
        montoInicial: montoIngresado,
      });
      encolarOperacion("insert", "deudas", {
        nombre: nombreIngresado,
        monto_inicial: montoIngresado,
      });
      guardarCacheLocal();
      form.reset();
      ocultarModalDeuda();
      actualizarOpcionesCategoria();
      actualizarInterfaz();
      mostrarToast("Guardado localmente por fallo de red", "warning");
      return;
    }

    form.reset();
    ocultarModalDeuda();
    await cargarDatosCloud();
    mostrarToast("Deuda registrada", "success");
  } catch (err) {
    console.error("Error al guardar deuda:", err);
    mostrarToast("Error al registrar deuda: " + (err.message || ""), "error");
  } finally {
    desbloquearBoton(btn);
  }
}

function incrementarDeudaDirecta(id) {
  const deuda = deudas.find((d) => d.id === id);
  if (!deuda) return;
  abrirModalIncrementarDeuda(id, deuda.nombre, deuda.montoInicial);
}

function abrirModalIncrementarDeuda(id, nombre, montoActual) {
  document.getElementById("incrementoDeudaId").value = id;
  document.getElementById("incrementoNombre").value = nombre;
  document.getElementById("incrementoMonto").value = montoActual;
  mostrarModalIncremento();
}

async function confirmarIncrementoDeuda(e) {
  e.preventDefault();
  const form = e.target;
  const btn = bloquearBoton(form, "Guardando...");

  try {
    const id = parseInt(
      document.getElementById("incrementoDeudaId").value,
      10,
    );
    const nombre = document
      .getElementById("incrementoNombre")
      .value.trim();
    const valStr = (
      document.getElementById("incrementoMonto").value || ""
    ).replace(",", ".");
    const val = parseFloat(valStr);

    if (!nombre || isNaN(val) || val < 0) {
      mostrarToast("Monto inválido", "error");
      return;
    }

    const cambios = { nombre, monto_inicial: val };

    if (!navigator.onLine) {
      const idx = deudas.findIndex((d) => d.id === id);
      if (idx !== -1) {
        deudas[idx].nombre = nombre;
        deudas[idx].montoInicial = val;
      }
      encolarOperacion("update", "deudas", cambios, id);
      guardarCacheLocal();
      ocultarModalIncremento();
      actualizarInterfaz();
      mostrarToast("Deuda actualizada offline", "info");
      return;
    }

    const { error } = await supabaseClient
      .from("deudas")
      .update(cambios)
      .eq("id", id);
    if (error) {
      console.warn("Fallo Supabase al actualizar deuda, guardando offline:", error);
      const idx = deudas.findIndex((d) => d.id === id);
      if (idx !== -1) {
        deudas[idx].nombre = nombre;
        deudas[idx].montoInicial = val;
      }
      encolarOperacion("update", "deudas", cambios, id);
      guardarCacheLocal();
      ocultarModalIncremento();
      actualizarInterfaz();
      mostrarToast("Actualizado localmente por fallo de red", "warning");
      return;
    }

    ocultarModalIncremento();
    await cargarDatosCloud();
    mostrarToast("Deuda actualizada", "success");
  } catch (err) {
    console.error("Error al actualizar deuda:", err);
    mostrarToast("Error al actualizar deuda: " + (err.message || ""), "error");
  } finally {
    desbloquearBoton(btn);
  }
}

async function eliminarDeuda(id) {
  if (!confirm("¿Eliminar esta deuda y sus pagos asociados?")) return;

  if (!navigator.onLine) {
    transacciones = transacciones.filter((t) => t.deuda_id !== id);
    deudas = deudas.filter((d) => d.id !== id);
    encolarOperacion("delete_by_deuda", "transacciones", null, id);
    encolarOperacion("delete", "deudas", null, id);
    guardarCacheLocal();
    actualizarInterfaz();
    mostrarToast("Deuda eliminada offline", "info");
    return;
  }

  try {
    await supabaseClient.from("transacciones").delete().eq("deuda_id", id);
    await supabaseClient.from("deudas").delete().eq("id", id);
    await cargarDatosCloud();
    mostrarToast("Deuda eliminada", "success");
  } catch (err) {
    console.error("Error al eliminar deuda:", err);
    mostrarToast("Error al eliminar deuda", "error");
  }
}

function actualizarSelectDeudas() {
  const select = document.getElementById("deudaObjetivo");
  if (!select) return;
  select.innerHTML = deudas.length
    ? deudas
        .map(
          (d) => `<option value="${d.id}">${escapeHTML(d.nombre)}</option>`,
        )
        .join("")
    : '<option value="">Sin deudas registradas</option>';
}

function obtenerPagadoDeuda(id) {
  let pagado = 0;
  transacciones.forEach((t) => {
    if (
      t.tipo === "gasto" &&
      t.categoria === "Pago de Deuda" &&
      t.deuda_id === id
    ) {
      pagado += typeof obtenerMontoEnUSD === "function" ? obtenerMontoEnUSD(t, tasaBinanceCompra) : (parseFloat(t.monto) || 0);
    }
  });
  return pagado;
}

function abonarDeuda(id) {
  const deuda = deudas.find((d) => d.id === id);
  if (!deuda) return;

  const pagado = obtenerPagadoDeuda(id);
  const restante = Math.max(0, (deuda.montoInicial || 0) - pagado);

  document.getElementById("abonoDeudaId").value = id;
  document.getElementById("abonoNombre").value = deuda.nombre || "";
  document.getElementById("abonoMonto").value = "";
  document.getElementById("abonoDescripcion").value = "";
  const restanteEl = document.getElementById("abonoRestanteValor");
  if (restanteEl) restanteEl.textContent = `$${restante.toFixed(2)}`;
  mostrarModalAbono();
}

function mostrarModalAbono() {
  const el = document.getElementById("modalAbonoDeuda");
  if (el) el.classList.remove("hidden");
  setTimeout(() => {
    const monto = document.getElementById("abonoMonto");
    if (monto) monto.focus();
  }, 100);
}

function ocultarModalAbono() {
  const el = document.getElementById("modalAbonoDeuda");
  if (el) el.classList.add("hidden");
}

async function confirmarAbonoDeuda(e) {
  e.preventDefault();
  const form = e.target;
  const btn = bloquearBoton(form, "Abonando...");

  try {
    const id = parseInt(document.getElementById("abonoDeudaId").value, 10);
    const deuda = deudas.find((d) => d.id === id);
    if (!deuda) {
      mostrarToast("No se encontró la deuda", "error");
      return;
    }

    const montoStr = (
      document.getElementById("abonoMonto").value || ""
    ).replace(",", ".");
    const monto = Math.round((parseFloat(montoStr) || 0) * 100) / 100;

    if (isNaN(monto) || monto <= 0) {
      mostrarToast("Ingresa un monto válido mayor a 0", "error");
      return;
    }

    const pagado = obtenerPagadoDeuda(id);
    const restante = Math.max(0, (deuda.montoInicial || 0) - pagado);
    if (monto > restante + 0.001) {
      mostrarToast(
        `El abono supera el saldo restante ($${restante.toFixed(2)}).`,
        "error",
      );
      return;
    }

    const descripcion = (
      document.getElementById("abonoDescripcion").value || ""
    ).trim();
    const fecha = obtenerFechaLocalISO();

    const nueva = {
      tipo: "gasto",
      monto: monto,
      categoria: "Pago de Deuda",
      deuda_id: id,
      origen_ahorro: null,
      descripcion: descripcion || `Abono a ${deuda.nombre}`,
      fecha: fecha,
    };

    if (!navigator.onLine) {
      const tempId = -Date.now();
      transacciones.unshift({ ...nueva, id: tempId });
      encolarOperacion("insert", "transacciones", nueva);
      guardarCacheLocal();
      ocultarModalAbono();
      actualizarInterfaz();
      mostrarToast("Abono guardado localmente", "info");
      if (typeof verificarLimitesDespuesDeTransaccion === "function") {
        verificarLimitesDespuesDeTransaccion(nueva);
      }
      return;
    }

    const datosSupabase = prepararTransaccionParaSupabase(nueva);
    const { data, error } = await supabaseClient
      .from("transacciones")
      .insert([datosSupabase])
      .select();

    if (error) {
      console.warn(
        "Fallo Supabase al registrar abono, guardando offline:",
        error,
      );
      const tempId = -Date.now();
      transacciones.unshift({ ...nueva, id: tempId });
      encolarOperacion("insert", "transacciones", nueva);
      guardarCacheLocal();
      ocultarModalAbono();
      actualizarInterfaz();
      mostrarToast(
        "Abono guardado localmente. Se sincronizará en segundo plano",
        "warning",
      );
      if (typeof verificarLimitesDespuesDeTransaccion === "function") {
        verificarLimitesDespuesDeTransaccion(nueva);
      }
      return;
    }

    ocultarModalAbono();
    if (data && data[0]) {
      transacciones.unshift({ ...nueva, id: data[0].id });
      guardarCacheLocal();
      actualizarInterfaz();
    } else {
      await cargarDatosCloud();
    }
    mostrarToast("Abono registrado", "success");
    if (typeof verificarLimitesDespuesDeTransaccion === "function") {
      verificarLimitesDespuesDeTransaccion(nueva);
    }
  } catch (err) {
    console.error("Error al abonar deuda:", err);
    mostrarToast("Error al registrar el abono: " + (err.message || ""), "error");
  } finally {
    desbloquearBoton(btn);
  }
}

// Vincular submit del formulario de abono
document.addEventListener("DOMContentLoaded", () => {
  const formAbono = document.getElementById("formAbonoDeuda");
  if (formAbono) {
    formAbono.addEventListener("submit", confirmarAbonoDeuda);
  }
});

function renderizarDeudas(deudasConCalculo) {
  const grid = document.getElementById("gridDeudas");
  if (!grid) return;
  if (!deudasConCalculo.length) {
    grid.innerHTML = `
    <div class="col-span-full text-center py-6 border border-dashed border-slate-300 dark:border-azulcielo/30 rounded-2xl p-6 bg-slate-50/50 dark:bg-slate-950/40">
      <p class="text-slate-500 dark:text-azulcielo text-xs sm:text-sm mb-3">No tienes deudas activas registradas.</p>
      <button onclick="mostrarModalDeuda()" class="text-xs bg-coral text-white font-bold px-4 py-2 rounded-xl transition shadow-md shadow-coral/20 hover:bg-coral-hover">
        + Registrar primera deuda
      </button>
    </div>
  `;
    return;
  }

  grid.innerHTML = deudasConCalculo
    .map((d) => {
      const pagado = d.montoPagado || 0;
      const total = d.montoInicial || 0;
      const porcentaje =
        total > 0 ? Math.min(100, (pagado / total) * 100) : 100;
      const restante = Math.max(0, total - pagado);

      return `
    <div class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-azulcielo/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5 relative">
      <div class="flex justify-between items-start">
        <div>
          <h4 class="font-bold text-slate-900 dark:text-crema text-sm sm:text-base">${escapeHTML(d.nombre)}</h4>
          <span class="text-[11px] font-bold text-slate-400 dark:text-azulcielo/80">Inicial: $${total.toFixed(2)}</span>
        </div>
        <div class="flex items-center gap-1">
          <button onclick="abonarDeuda(${d.id})" class="text-[11px] font-bold px-2 py-1 rounded-lg bg-coral/10 text-coral hover:bg-coral hover:text-white transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-coral" title="Abonar a la deuda">💸 Abonar</button>
          <button onclick="incrementarDeudaDirecta(${d.id})" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-azulelectrico rounded-lg text-xs font-bold transition cursor-pointer" title="Modificar monto inicial o nombre">
            ✏️
          </button>
          <button onclick="eliminarDeuda(${d.id})" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-coral rounded-lg text-xs font-bold transition cursor-pointer" title="Eliminar Deuda">
            🗑️
          </button>
        </div>
      </div>

      <div class="space-y-1.5">
        <div class="flex justify-between text-xs font-bold">
          <span class="text-slate-500 dark:text-azulcielo">Progreso Pagado</span>
          <span class="text-emerald-600 dark:text-emerald-400 font-mono-num">${porcentaje.toFixed(1)}%</span>
        </div>
        <div class="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div class="bg-gradient-to-r from-emerald-500 to-azulelectrico h-full rounded-full transition-all duration-500" style="width: ${porcentaje}%"></div>
        </div>
      </div>

      <div class="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-azulcielo/15 text-xs">
        <div>
          <span class="text-[10px] block text-slate-400 uppercase font-bold tracking-wider">Abonado</span>
          <span class="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono-num">+$${pagado.toFixed(2)}</span>
        </div>
        <div class="text-right">
          <span class="text-[10px] block text-slate-400 uppercase font-bold tracking-wider">Resta por pagar</span>
          <span class="font-extrabold text-coral font-mono-num text-sm">$${restante.toFixed(2)}</span>
        </div>
      </div>
    </div>
  `;
    })
    .join("");
}
