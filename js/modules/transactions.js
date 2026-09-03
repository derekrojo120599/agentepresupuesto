// =========================================================================
// MÓDULO DE TRANSACCIONES (REGISTRO, EDICIÓN, ELIMINACIÓN Y VALIDACIÓN)
// =========================================================================

function seleccionarTipoMovimiento(tipo) {
  const tipoSelect = document.getElementById("tipo");
  if (tipoSelect) tipoSelect.value = tipo;
  sincronizarBotonesTipo();
  actualizarOpcionesCategoria();
  evaluarSeleccionesEspeciales();
  verificarMontoEnTiempoReal();
}

function sincronizarBotonesTipo() {
  const tipoSelect = document.getElementById("tipo");
  const tipo = tipoSelect ? tipoSelect.value || "gasto" : "gasto";
  const btnG = document.getElementById("btnTipoGasto");
  const btnI = document.getElementById("btnTipoIngreso");
  const btnA = document.getElementById("btnTipoAhorro");
  if (!btnG || !btnI || !btnA) return;

  const inactivoClase =
    "chip-tipo flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-crema hover:bg-slate-200/50 dark:hover:bg-slate-800/50 active:scale-95 cursor-pointer";

  btnG.className = inactivoClase;
  btnI.className = inactivoClase;
  btnA.className = inactivoClase;

  if (tipo === "gasto") {
    btnG.className =
      "chip-tipo flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 bg-rose-500 text-white shadow-md shadow-rose-500/25 active:scale-95 cursor-pointer";
  } else if (tipo === "ingreso") {
    btnI.className =
      "chip-tipo flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 bg-emerald-600 text-white shadow-md shadow-emerald-600/25 active:scale-95 cursor-pointer";
  } else if (tipo === "ahorro") {
    btnA.className =
      "chip-tipo flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 bg-amber-500 text-white shadow-md shadow-amber-500/25 active:scale-95 cursor-pointer";
  }
}

function actualizarOpcionesCategoria() {
  const tipoSelect = document.getElementById("tipo");
  const categoriaSelect = document.getElementById("categoria");
  if (!tipoSelect || !categoriaSelect) return;

  const tipo = tipoSelect.value || "gasto";
  const lista = categoriasMap[tipo] || [];
  categoriaSelect.innerHTML = lista
    .map(
      (cat) =>
        `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`,
    )
    .join("");
  evaluarSeleccionesEspeciales();
}

function evaluarSeleccionesEspeciales() {
  const tipoSelect = document.getElementById("tipo");
  const categoriaSelect = document.getElementById("categoria");
  const contenedorDeudaSelect = document.getElementById("contenedorDeudaSelect");
  const contenedorMetaAhorroSelect = document.getElementById("contenedorMetaAhorroSelect");
  const contenedorOrigenAhorroSelect = document.getElementById("contenedorOrigenAhorroSelect");
  const metaAhorroSelect = document.getElementById("metaAhorroSelect");
  if (!tipoSelect || !categoriaSelect) return;

  if (tipoSelect.value === "gasto" && categoriaSelect.value === "Pago de Deuda") {
    if (contenedorDeudaSelect) contenedorDeudaSelect.classList.remove("hidden");
    if (typeof actualizarSelectDeudas === "function") actualizarSelectDeudas();
  } else {
    if (contenedorDeudaSelect) contenedorDeudaSelect.classList.add("hidden");
  }

  const labelMetaSelect = document.getElementById("labelMetaAhorroSelect");
  const infoSaldoFondoAhorro = document.getElementById("infoSaldoFondoAhorro");
  const valorSaldoFondoAhorro = document.getElementById("valorSaldoFondoAhorro");

  if (tipoSelect.value === "ahorro") {
    if (contenedorMetaAhorroSelect) contenedorMetaAhorroSelect.classList.remove("hidden");
    if (typeof actualizarSelectMetas === "function") actualizarSelectMetas();

    const cat = (categoriaSelect.value || "").toLowerCase();
    const esRetiro =
      cat.includes("retirar") ||
      cat.includes("usar") ||
      cat.includes("retiro") ||
      cat.includes("gasto");

    if (labelMetaSelect) {
      labelMetaSelect.textContent = esRetiro
        ? "Retirar de la Meta / Fondo"
        : "Meta Asociada (Opcional)";
    }

    if (esRetiro) {
      if (contenedorOrigenAhorroSelect) contenedorOrigenAhorroSelect.classList.add("hidden");
      if (typeof obtenerFondosAhorroMapaActual === "function") {
        const fondosMapa = obtenerFondosAhorroMapaActual();
        const nombreMetaSel = (
          (metaAhorroSelect ? metaAhorroSelect.value : "") ||
          document.getElementById("descripcion")?.value ||
          "Ahorro General"
        ).trim();
        const saldoFondo = Math.max(0, fondosMapa[nombreMetaSel] || 0);

        if (infoSaldoFondoAhorro && valorSaldoFondoAhorro) {
          valorSaldoFondoAhorro.textContent = `$${saldoFondo.toFixed(2)}`;
          infoSaldoFondoAhorro.classList.remove("hidden");
        }
      }
    } else {
      if (contenedorOrigenAhorroSelect) contenedorOrigenAhorroSelect.classList.remove("hidden");
      if (infoSaldoFondoAhorro) infoSaldoFondoAhorro.classList.add("hidden");
    }
  } else {
    if (contenedorMetaAhorroSelect) contenedorMetaAhorroSelect.classList.add("hidden");
    if (contenedorOrigenAhorroSelect) contenedorOrigenAhorroSelect.classList.add("hidden");
    if (infoSaldoFondoAhorro) infoSaldoFondoAhorro.classList.add("hidden");
  }

  if (typeof verificarMontoEnTiempoReal === "function") {
    verificarMontoEnTiempoReal();
  }
}

function verificarMontoEnTiempoReal() {
  const montoInput = document.getElementById("monto");
  const tipoSelect = document.getElementById("tipo");
  const categoriaSelect = document.getElementById("categoria");
  const metaAhorroSelect = document.getElementById("metaAhorroSelect");
  const origenAhorroSelect = document.getElementById("origenAhorro");
  const alertaMontoExcedido = document.getElementById("alertaMontoExcedido");
  const alertaAhorroExcesivo = document.getElementById("alertaAhorroExcesivo");
  const btnGuardarMovimiento = document.getElementById("btnGuardarMovimiento");
  const hintOrigenAhorro = document.getElementById("hintOrigenAhorro");

  if (!montoInput || !tipoSelect || !categoriaSelect) return;

  const montoRaw = (montoInput.value || "").replace(",", ".");
  const montoNum = parseFloat(montoRaw) || 0;
  const tipo = tipoSelect.value;
  const cat = (categoriaSelect.value || "").toLowerCase();
  const esRetiroAhorro =
    cat.includes("retirar") ||
    cat.includes("usar") ||
    cat.includes("retiro") ||
    cat.includes("gasto");
  const origenAhorroVal = origenAhorroSelect
    ? origenAhorroSelect.value
    : "balance";

  // Convertir monto a USD si se ingresó en Bs para las comparaciones de saldo y límites
  let monto = montoNum;
  if (monedaIngresoActual === "BS") {
    if (tasaBinanceCompra && tasaBinanceCompra > 0) {
      monto = montoNum / tasaBinanceCompra;
    } else if (montoNum > 0) {
      montoInput.classList.remove(
        "border-slate-300",
        "dark:border-azulcielo/30",
        "focus:border-azulelectrico",
        "border-amber-500",
        "focus:border-amber-500",
        "text-amber-500",
      );
      montoInput.classList.add("border-coral", "focus:border-coral", "text-coral");
      if (alertaMontoExcedido) {
        alertaMontoExcedido.textContent =
          "⚠️ No se ha podido obtener la tasa de cambio. Cambia a USD o verifica tu conexión.";
        alertaMontoExcedido.classList.remove("hidden");
      }
      if (alertaAhorroExcesivo) alertaAhorroExcesivo.classList.add("hidden");
      if (btnGuardarMovimiento) btnGuardarMovimiento.disabled = true;
      return;
    }
  }

  // Actualizar hint de texto
  if (hintOrigenAhorro) {
    if (origenAhorroVal === "balance") {
      hintOrigenAhorro.textContent =
        "Se descontará de tu balance disponible actual.";
    } else {
      hintOrigenAhorro.textContent =
        "No afectará tu balance. Se registrará como ahorro previo o externo.";
    }
  }

  // VALIDACIÓN 1: Retiro de Ahorro mayor al fondo acumulado
  if (tipo === "ahorro" && esRetiroAhorro && monto > 0) {
    const fondosMapa = typeof obtenerFondosAhorroMapaActual === "function"
      ? obtenerFondosAhorroMapaActual()
      : {};
    const nombreMetaSel = (
      (metaAhorroSelect ? metaAhorroSelect.value : "") ||
      document.getElementById("descripcion")?.value ||
      "Ahorro General"
    ).trim();
    const saldoDisponibleFondo = Math.max(0, fondosMapa[nombreMetaSel] || 0);

    const valorSaldoEl = document.getElementById("valorSaldoFondoAhorro");
    if (valorSaldoEl) {
      valorSaldoEl.textContent = `$${saldoDisponibleFondo.toFixed(2)}`;
    }

    if (monto > saldoDisponibleFondo) {
      montoInput.classList.remove(
        "border-slate-300",
        "dark:border-azulcielo/30",
        "focus:border-azulelectrico",
        "border-amber-500",
        "focus:border-amber-500",
        "text-amber-500",
      );
      montoInput.classList.add("border-coral", "focus:border-coral", "text-coral");
      if (alertaMontoExcedido) {
        alertaMontoExcedido.textContent = `⚠️ No puedes retirar más de lo ahorrado ($${saldoDisponibleFondo.toFixed(2)}) en "${nombreMetaSel}".`;
        alertaMontoExcedido.classList.remove("hidden");
      }
      if (alertaAhorroExcesivo) alertaAhorroExcesivo.classList.add("hidden");
      if (btnGuardarMovimiento) btnGuardarMovimiento.disabled = true;
      return;
    } else {
      montoInput.classList.add(
        "border-slate-300",
        "dark:border-azulcielo/30",
        "focus:border-azulelectrico",
      );
      montoInput.classList.remove(
        "border-coral",
        "focus:border-coral",
        "text-coral",
        "border-amber-500",
        "focus:border-amber-500",
        "text-amber-500",
      );
      if (alertaMontoExcedido) alertaMontoExcedido.classList.add("hidden");
      if (alertaAhorroExcesivo) alertaAhorroExcesivo.classList.add("hidden");
      if (btnGuardarMovimiento) btnGuardarMovimiento.disabled = false;
      return;
    }
  }

  // Determinar si debemos evaluar contra el balance
  const requiereValidacionBalance =
    (tipo === "gasto" && monto > 0) ||
    (tipo === "ahorro" &&
      !esRetiroAhorro &&
      origenAhorroVal === "balance" &&
      monto > 0);

  if (requiereValidacionBalance) {
    let balance = 0;
    transacciones.forEach((t) => {
      if (
        typeof transaccionesPendientesEliminar === "undefined" ||
        !transaccionesPendientesEliminar.has(t.id)
      ) {
        const m = parseFloat(t.monto) || 0;
        if (t.tipo === "ingreso") {
          balance += m;
        } else if (t.tipo === "gasto") {
          balance -= m;
        } else if (t.tipo === "ahorro") {
          const catT = (t.categoria || "").toLowerCase();
          const esRetiroT =
            catT.includes("retirar") ||
            catT.includes("usar") ||
            catT.includes("retiro") ||
            catT.includes("gasto");
          if (esRetiroT) {
            balance += m;
          } else if (t.origen_ahorro === "balance") {
            balance -= m;
          }
        }
      }
    });

    if (monto > balance) {
      montoInput.classList.remove(
        "border-slate-300",
        "dark:border-azulcielo/30",
        "focus:border-azulelectrico",
        "border-amber-500",
        "focus:border-amber-500",
        "text-amber-500",
      );
      montoInput.classList.add("border-coral", "focus:border-coral", "text-coral");
      if (alertaMontoExcedido) {
        alertaMontoExcedido.textContent =
          tipo === "ahorro"
            ? "⚠️ No tienes suficiente balance disponible para este ahorro."
            : "⚠️ Estás gastando más del saldo disponible (quedarás en saldo negativo).";
        alertaMontoExcedido.classList.remove("hidden");
      }
      if (alertaAhorroExcesivo) alertaAhorroExcesivo.classList.add("hidden");
      if (btnGuardarMovimiento) {
        btnGuardarMovimiento.disabled = tipo === "ahorro";
      }
    } else {
      montoInput.classList.add(
        "border-slate-300",
        "dark:border-azulcielo/30",
        "focus:border-azulelectrico",
      );
      montoInput.classList.remove(
        "border-coral",
        "focus:border-coral",
        "text-coral",
        "border-amber-500",
        "focus:border-amber-500",
        "text-amber-500",
      );
      if (alertaMontoExcedido) alertaMontoExcedido.classList.add("hidden");

      if (
        tipo === "ahorro" &&
        !esRetiroAhorro &&
        origenAhorroVal === "balance" &&
        monto > balance * 0.8
      ) {
        montoInput.classList.remove(
          "border-slate-300",
          "dark:border-azulcielo/30",
          "focus:border-azulelectrico",
        );
        montoInput.classList.add(
          "border-amber-500",
          "focus:border-amber-500",
          "text-amber-500",
        );
        if (alertaAhorroExcesivo) alertaAhorroExcesivo.classList.remove("hidden");
      } else {
        if (alertaAhorroExcesivo) alertaAhorroExcesivo.classList.add("hidden");
      }

      if (btnGuardarMovimiento) btnGuardarMovimiento.disabled = false;
    }
  } else {
    montoInput.classList.add(
      "border-slate-300",
      "dark:border-azulcielo/30",
      "focus:border-azulelectrico",
    );
    montoInput.classList.remove(
      "border-coral",
      "focus:border-coral",
      "text-coral",
      "border-amber-500",
      "focus:border-amber-500",
      "text-amber-500",
    );
    if (alertaMontoExcedido) alertaMontoExcedido.classList.add("hidden");
    if (alertaAhorroExcesivo) alertaAhorroExcesivo.classList.add("hidden");
    if (btnGuardarMovimiento) btnGuardarMovimiento.disabled = false;
  }
}

async function agregarTransaccion(e) {
  e.preventDefault();
  const form = e.target;
  const btn = bloquearBoton(form, "Guardando...");

  try {
    const tipoSelect = document.getElementById("tipo");
    const categoriaSelect = document.getElementById("categoria");
    const deudaObjetivoSelect = document.getElementById("deudaObjetivo");
    const metaAhorroSelect = document.getElementById("metaAhorroSelect");
    const origenAhorroSelect = document.getElementById("origenAhorro");

    const esPagoDeuda =
      tipoSelect.value === "gasto" &&
      categoriaSelect.value === "Pago de Deuda";
    const montoStr = (
      document.getElementById("monto").value || ""
    ).replace(",", ".");
    const montoIngresado = parseFloat(montoStr);

    if (isNaN(montoIngresado) || montoIngresado <= 0) {
      mostrarToast("Ingresa un monto válido mayor a 0", "error");
      return;
    }

    let monto = montoIngresado;
    let moneda = monedaIngresoActual || "USD";
    let montoOriginal = montoIngresado;
    let tasaRegistro = null;

    if (monedaIngresoActual === "BS") {
      if (!tasaBinanceCompra || tasaBinanceCompra <= 0) {
        mostrarToast(
          "No se pudo obtener la tasa para convertir Bs. Por favor ingresa el monto en USD o verifica tu conexión.",
          "error",
        );
        return;
      }
      tasaRegistro = tasaBinanceCompra;
      monto = Math.round((montoIngresado / tasaBinanceCompra) * 100) / 100;
    } else {
      monto = Math.round(montoIngresado * 100) / 100;
    }

    if (
      esPagoDeuda &&
      (!deudaObjetivoSelect.value || deudaObjetivoSelect.value === "")
    ) {
      mostrarToast("Selecciona una deuda válida", "error");
      return;
    }

    const esAhorro = tipoSelect.value === "ahorro";
    const cat = (categoriaSelect.value || "").toLowerCase();
    const esRetiroAhorro =
      cat.includes("retirar") ||
      cat.includes("usar") ||
      cat.includes("retiro") ||
      cat.includes("gasto");

    if (esAhorro && esRetiroAhorro) {
      const fondosMapa = typeof obtenerFondosAhorroMapaActual === "function"
        ? obtenerFondosAhorroMapaActual()
        : {};
      const nombreMetaSel = (
        (metaAhorroSelect ? metaAhorroSelect.value : "") ||
        document.getElementById("descripcion").value ||
        "Ahorro General"
      ).trim();
      const saldoDisponibleFondo = Math.max(0, fondosMapa[nombreMetaSel] || 0);

      if (monto > saldoDisponibleFondo) {
        mostrarToast(
          `No puedes retirar más de lo ahorrado ($${saldoDisponibleFondo.toFixed(2)}) en "${nombreMetaSel}".`,
          "error",
        );
        return;
      }
    }

    const descripcion = document.getElementById("descripcion").value.trim();
    if (!descripcion) {
      mostrarToast("Ingresa una descripción o concepto", "error");
      return;
    }

    const fecha =
      document.getElementById("fecha").value || obtenerFechaLocalISO();

    const nueva = {
      tipo: tipoSelect.value,
      monto: monto,
      moneda: moneda,
      monto_original: montoOriginal,
      tasa_registro: tasaRegistro,
      categoria: categoriaSelect.value,
      deuda_id: esPagoDeuda ? parseInt(deudaObjetivoSelect.value, 10) : null,
      origen_ahorro:
        esAhorro && !esRetiroAhorro
          ? origenAhorroSelect
            ? origenAhorroSelect.value
            : "balance"
          : null,
      descripcion: descripcion,
      fecha: fecha,
    };

    if (!navigator.onLine) {
      const tempId = -Date.now();
      transacciones.unshift({ ...nueva, id: tempId });
      encolarOperacion("insert", "transacciones", nueva);
      guardarCacheLocal();
      form.reset();
      document.getElementById("fecha").value = obtenerFechaLocalISO();
      actualizarOpcionesCategoria();
      actualizarInterfaz();
      mostrarToast("Guardado localmente", "info");

      verificarLimitesDespuesDeTransaccion(nueva);

      if (
        nueva.tipo === "ahorro" &&
        !nueva.categoria.toLowerCase().includes("retirar")
      ) {
        if (typeof confetti === "function") {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#0259DD", "#84AFFB", "#10b981", "#34d399"],
          });
        }
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
        "Fallo Supabase al guardar movimiento, guardando offline:",
        error,
      );
      const tempId = -Date.now();
      transacciones.unshift({ ...nueva, id: tempId });
      encolarOperacion("insert", "transacciones", nueva);
      guardarCacheLocal();
      form.reset();
      document.getElementById("fecha").value = obtenerFechaLocalISO();
      actualizarOpcionesCategoria();
      actualizarInterfaz();
      mostrarToast(
        "Guardado localmente. Se sincronizará en segundo plano",
        "warning",
      );

      verificarLimitesDespuesDeTransaccion(nueva);
      return;
    }

    form.reset();
    document.getElementById("fecha").value = obtenerFechaLocalISO();
    actualizarOpcionesCategoria();

    if (
      nueva.tipo === "ahorro" &&
      !nueva.categoria.toLowerCase().includes("retirar")
    ) {
      if (typeof confetti === "function") {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#0259DD", "#84AFFB", "#10b981", "#34d399"],
        });
      }
    }

    if (data && data[0]) {
      transacciones.unshift({ ...nueva, id: data[0].id });
      guardarCacheLocal();
      actualizarInterfaz();
    } else {
      await cargarDatosCloud();
    }

    mostrarToast("Movimiento registrado", "success");
    verificarLimitesDespuesDeTransaccion(nueva);
  } catch (err) {
    console.error("Error al agregar transacción:", err);
    mostrarToast(
      "Error al registrar movimiento: " + (err.message || ""),
      "error",
    );
  } finally {
    desbloquearBoton(btn);
  }
}

function eliminarTransaccion(id) {
  const idx = transacciones.findIndex((t) => t.id === id);
  if (idx === -1) return;

  const tEliminada = transacciones[idx];

  // Remover visualmente y actualizar interfaz al instante
  transacciones.splice(idx, 1);
  guardarCacheLocal();
  actualizarInterfaz();

  // Borrar en Supabase de inmediato (no esperar 5s)
  // Si el usuario deshace, re-insertamos el registro
  let deshecho = false;

  if (!navigator.onLine) {
    encolarOperacion("delete", "transacciones", null, id);
  } else {
    supabaseClient.from("transacciones").delete().eq("id", id).then(({ error }) => {
      if (error && !deshecho) {
        console.warn("Error al eliminar en Supabase:", error);
      }
    });
  }

  // Mostrar Toast interactivo con opción de Deshacer durante 5 segundos
  mostrarToastDeshacer("Transacción eliminada", async () => {
    deshecho = true;
    // Restaurar localmente — recalcular la posición correcta
    const idxActual = transacciones.findIndex((t) => t.id === tEliminada.id);
    if (idxActual === -1) {
      // No existe aún (fue eliminada), insertar al inicio como era la posición relativa
      transacciones.splice(Math.min(idx, transacciones.length), 0, tEliminada);
    }
    // Si por alguna razón ya fue re-insertada (p. ej. Realtime), no duplicar
    guardarCacheLocal();
    actualizarInterfaz();

    // Re-insertar en Supabase
    if (navigator.onLine) {
      const datos = prepararTransaccionParaSupabase(tEliminada);
      // Usamos upsert para restaurar con el mismo id si la BD lo soporta,
      // de lo contrario hacemos insert normal
      const { error } = await supabaseClient
        .from("transacciones")
        .insert([datos])
        .select();
      if (error) {
        console.warn("No se pudo restaurar en Supabase:", error);
        mostrarToast("No se pudo restaurar en la nube, está guardado localmente", "warning");
      } else {
        mostrarToast("Transacción restaurada", "success");
      }
    } else {
      encolarOperacion("insert", "transacciones", prepararTransaccionParaSupabase(tEliminada));
      mostrarToast("Transacción restaurada localmente", "success");
    }
  });
}

function duplicarTransaccion(id) {
  const t = transacciones.find((x) => x.id === id);
  if (!t) return;
  const tipoSelect = document.getElementById("tipo");
  const categoriaSelect = document.getElementById("categoria");
  const deudaObjetivoSelect = document.getElementById("deudaObjetivo");
  const origenAhorroSelect = document.getElementById("origenAhorro");

  cambiarPestana("registrar");
  if (tipoSelect) tipoSelect.value = t.tipo;
  sincronizarBotonesTipo();
  actualizarOpcionesCategoria();
  if (categoriaSelect) categoriaSelect.value = t.categoria;
  document.getElementById("monto").value = parseFloat(t.monto);
  document.getElementById("descripcion").value = t.descripcion || "";
  document.getElementById("fecha").value = obtenerFechaLocalISO();
  seleccionarMonedaIngreso("USD");
  actualizarConversionUI();
  evaluarSeleccionesEspeciales();
  if (t.deuda_id && deudaObjetivoSelect)
    deudaObjetivoSelect.value = t.deuda_id;
  if (t.origen_ahorro && origenAhorroSelect)
    origenAhorroSelect.value = t.origen_ahorro;
  window.scrollTo({ top: 0, behavior: "smooth" });
  mostrarToast("Datos cargados para duplicar", "info");
}

function editarTransaccion(id) {
  const t = transacciones.find((t) => t.id === id);
  if (!t) return;
  const editTipoSelect = document.getElementById("editTipo");

  document.getElementById("editId").value = t.id;
  if (editTipoSelect) editTipoSelect.value = t.tipo;
  document.getElementById("editMonto").value = parseFloat(t.monto);
  document.getElementById("editDescripcion").value = t.descripcion || "";
  document.getElementById("editFecha").value = t.fecha;

  actualizarOpcionesCategoriaEdit(t.categoria);
  evaluarSeleccionDeudaEdit(t.deuda_id, t.origen_ahorro);

  mostrarModalEditarMovimiento();
}

function actualizarOpcionesCategoriaEdit(categoriaActual) {
  const editTipoSelect = document.getElementById("editTipo");
  const editCategoriaSelect = document.getElementById("editCategoria");
  if (!editTipoSelect || !editCategoriaSelect) return;

  const tipo = editTipoSelect.value || "gasto";
  const lista = categoriasMap[tipo] || [];
  editCategoriaSelect.innerHTML = lista
    .map(
      (cat) =>
        `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`,
    )
    .join("");
  if (categoriaActual && lista.includes(categoriaActual)) {
    editCategoriaSelect.value = categoriaActual;
  }
  evaluarSeleccionDeudaEdit();
}

function evaluarSeleccionDeudaEdit(deudaIdActual, origenActual) {
  const editTipoSelect = document.getElementById("editTipo");
  const editCategoriaSelect = document.getElementById("editCategoria");
  const editContenedorDeudaSelect = document.getElementById(
    "editContenedorDeudaSelect",
  );
  const editDeudaObjetivoSelect = document.getElementById("editDeudaObjetivo");
  const editContenedorOrigenAhorroSelect = document.getElementById(
    "editContenedorOrigenAhorroSelect",
  );
  const editOrigenAhorroSelect = document.getElementById("editOrigenAhorro");

  if (!editTipoSelect || !editCategoriaSelect) return;

  if (
    editTipoSelect.value === "gasto" &&
    editCategoriaSelect.value === "Pago de Deuda"
  ) {
    if (editContenedorDeudaSelect)
      editContenedorDeudaSelect.classList.remove("hidden");
    if (editDeudaObjetivoSelect) {
      editDeudaObjetivoSelect.innerHTML = deudas.length
        ? deudas
            .map(
              (d) =>
                `<option value="${d.id}">${escapeHTML(d.nombre)}</option>`,
            )
            .join("")
        : '<option value="">Sin deudas</option>';
      if (deudaIdActual) editDeudaObjetivoSelect.value = deudaIdActual;
    }
  } else {
    if (editContenedorDeudaSelect)
      editContenedorDeudaSelect.classList.add("hidden");
  }

  if (editTipoSelect.value === "ahorro") {
    const cat = (editCategoriaSelect.value || "").toLowerCase();
    const esRetiro =
      cat.includes("retirar") ||
      cat.includes("usar") ||
      cat.includes("retiro") ||
      cat.includes("gasto");
    if (!esRetiro) {
      if (editContenedorOrigenAhorroSelect)
        editContenedorOrigenAhorroSelect.classList.remove("hidden");
      if (origenActual && editOrigenAhorroSelect) {
        editOrigenAhorroSelect.value = origenActual;
      }
    } else {
      if (editContenedorOrigenAhorroSelect)
        editContenedorOrigenAhorroSelect.classList.add("hidden");
    }
  } else {
    if (editContenedorOrigenAhorroSelect)
      editContenedorOrigenAhorroSelect.classList.add("hidden");
  }
}

async function confirmarEditarMovimiento(e) {
  e.preventDefault();
  const form = e.target;
  const btn = bloquearBoton(form, "Guardando...");

  try {
    const id = parseInt(document.getElementById("editId").value, 10);
    const editTipoSelect = document.getElementById("editTipo");
    const editCategoriaSelect = document.getElementById("editCategoria");
    const editDeudaObjetivoSelect = document.getElementById("editDeudaObjetivo");
    const editOrigenAhorroSelect = document.getElementById("editOrigenAhorro");

    const esPagoDeuda =
      editTipoSelect.value === "gasto" &&
      editCategoriaSelect.value === "Pago de Deuda";
    const montoStr = (
      document.getElementById("editMonto").value || ""
    ).replace(",", ".");
    const monto = parseFloat(montoStr);

    if (isNaN(monto) || monto <= 0) {
      mostrarToast("Monto inválido mayor a 0", "error");
      return;
    }

    const esAhorro = editTipoSelect.value === "ahorro";
    const cat = (editCategoriaSelect.value || "").toLowerCase();
    const esRetiroAhorro =
      cat.includes("retirar") ||
      cat.includes("usar") ||
      cat.includes("retiro") ||
      cat.includes("gasto");

    if (esAhorro && esRetiroAhorro) {
      const fondosMapa = typeof obtenerFondosAhorroMapaActual === "function"
        ? obtenerFondosAhorroMapaActual()
        : {};
      const desc = document.getElementById("editDescripcion").value.trim();
      const nombreMetaSel = desc || "Ahorro General";

      const tOriginal = transacciones.find((x) => x.id === id);
      const montoPrevio =
        tOriginal &&
        tOriginal.tipo === "ahorro" &&
        (tOriginal.categoria || "").toLowerCase().includes("retir")
          ? parseFloat(tOriginal.monto) || 0
          : 0;
      const saldoDisponibleFondo = Math.max(
        0,
        (fondosMapa[nombreMetaSel] || 0) + montoPrevio,
      );

      if (monto > saldoDisponibleFondo) {
        mostrarToast(
          `No puedes retirar más de lo ahorrado ($${saldoDisponibleFondo.toFixed(2)}) en "${nombreMetaSel}".`,
          "error",
        );
        return;
      }
    }

    const descripcion = document
      .getElementById("editDescripcion")
      .value.trim();
    if (!descripcion) {
      mostrarToast("Ingresa una descripción", "error");
      return;
    }

    const cambios = {
      tipo: editTipoSelect.value,
      monto,
      categoria: editCategoriaSelect.value,
      deuda_id: esPagoDeuda
        ? parseInt(editDeudaObjetivoSelect.value, 10)
        : null,
      origen_ahorro:
        esAhorro && !esRetiroAhorro
          ? editOrigenAhorroSelect
            ? editOrigenAhorroSelect.value
            : "balance"
          : null,
      descripcion: descripcion,
      fecha:
        document.getElementById("editFecha").value || obtenerFechaLocalISO(),
    };

    if (!navigator.onLine) {
      const idx = transacciones.findIndex((t) => t.id === id);
      if (idx !== -1)
        transacciones[idx] = { ...transacciones[idx], ...cambios };
      encolarOperacion("update", "transacciones", cambios, id);
      guardarCacheLocal();
      ocultarModalEditarMovimiento();
      actualizarInterfaz();
      mostrarToast("Actualizado offline", "info");
      return;
    }

    const datosSupabase = prepararTransaccionParaSupabase(cambios);
    const { error } = await supabaseClient
      .from("transacciones")
      .update(datosSupabase)
      .eq("id", id);

    if (error) {
      console.warn(
        "Fallo Supabase al actualizar movimiento, guardando offline:",
        error,
      );
      const idx = transacciones.findIndex((t) => t.id === id);
      if (idx !== -1)
        transacciones[idx] = { ...transacciones[idx], ...cambios };
      encolarOperacion("update", "transacciones", cambios, id);
      guardarCacheLocal();
      ocultarModalEditarMovimiento();
      actualizarInterfaz();
      mostrarToast("Actualizado localmente por fallo de red", "warning");
      return;
    }

    ocultarModalEditarMovimiento();
    await cargarDatosCloud();
    mostrarToast("Movimiento actualizado", "success");
  } catch (err) {
    console.error("Error al editar movimiento:", err);
    mostrarToast("Error al editar movimiento", "error");
  } finally {
    desbloquearBoton(btn);
  }
}

function verificarLimitesDespuesDeTransaccion(nueva) {
  const [anoStr, mesStr] = nueva.fecha.split("-");
  const mesTransStr = `${anoStr}-${mesStr.padStart(2, "0")}`;

  if (nueva.tipo === "gasto") {
    const limite = presupuestos[nueva.categoria];
    if (limite > 0) {
      let gastado = 0;
      transacciones.forEach((t) => {
        if (
          t.tipo === "gasto" &&
          t.categoria === nueva.categoria &&
          (t.fecha || "").startsWith(mesTransStr) &&
          (typeof transaccionesPendientesEliminar === "undefined" ||
            !transaccionesPendientesEliminar.has(t.id))
        ) {
          gastado += parseFloat(t.monto) || 0;
        }
      });

      const gastadoPrevio = gastado - parseFloat(nueva.monto);

      if (gastado > limite && gastadoPrevio <= limite) {
        mostrarModalAlertaInteligente(
          "exceso_presupuesto",
          "¡Presupuesto Excedido!",
          `Has gastado <strong>$${nueva.monto.toFixed(2)}</strong> en <strong>${escapeHTML(nueva.categoria)}</strong> y has superado tu límite mensual por <strong>$${(gastado - limite).toFixed(2)}</strong>.`,
        );
      } else if (gastado > limite * 0.9 && gastadoPrevio <= limite * 0.9) {
        mostrarModalAlertaInteligente(
          "advertencia",
          "Presupuesto al Borde",
          `Con este gasto, has consumido más del 90% de tu presupuesto mensual para <strong>${escapeHTML(nueva.categoria)}</strong>.`,
        );
      }
    }
  } else if (
    nueva.tipo === "ahorro" &&
    !nueva.categoria.toLowerCase().includes("retirar")
  ) {
    const nombreMeta = nueva.descripcion.trim();
    const metaObj = metasAhorro.find((m) => m.nombre === nombreMeta);

    if (metaObj && metaObj.objetivo > 0) {
      let acumulado = 0;
      transacciones.forEach((t) => {
        if (
          t.tipo === "ahorro" &&
          (t.descripcion || "").trim() === nombreMeta &&
          (typeof transaccionesPendientesEliminar === "undefined" ||
            !transaccionesPendientesEliminar.has(t.id))
        ) {
          const m = parseFloat(t.monto) || 0;
          if ((t.categoria || "").toLowerCase().includes("retir")) {
            acumulado -= m;
          } else {
            acumulado += m;
          }
        }
      });

      const acumuladoPrevio = acumulado - parseFloat(nueva.monto);
      if (acumulado >= metaObj.objetivo && acumuladoPrevio < metaObj.objetivo) {
        mostrarModalAlertaInteligente(
          "meta_superada",
          "¡Meta Cumplida! 🎉",
          `¡Felicidades! Has alcanzado tu objetivo de ahorro para <strong>${escapeHTML(metaObj.nombre)}</strong> acumulando <strong>$${acumulado.toFixed(2)}</strong>.`,
        );
      }
    }
  }
}

// ---------- Módulo de Ajuste y Compensación por Devaluación Cambiaria ----------

async function ejecutarRegistroAjusteCambiario(montoAjuste, desc = "") {
  const monto = Math.round(montoAjuste * 100) / 100;
  if (isNaN(monto) || monto <= 0) {
    mostrarToast("Ingresa un monto válido mayor a 0", "error");
    return;
  }

  const descripcion =
    desc ||
    `Ajuste por devaluación cambiaria (${tasaBinanceCompra ? tasaBinanceCompra.toFixed(2) : ""} Bs/$)`;
  const fecha = obtenerFechaLocalISO();

  const nueva = {
    tipo: "gasto",
    monto: monto,
    moneda: "USD",
    categoria: "Ajuste Cambiario",
    deuda_id: null,
    origen_ahorro: null,
    descripcion: descripcion,
    fecha: fecha,
  };

  if (!navigator.onLine) {
    const tempId = -Date.now();
    transacciones.unshift({ ...nueva, id: tempId });
    encolarOperacion("insert", "transacciones", nueva);
    guardarCacheLocal();
    actualizarInterfaz();
    mostrarToast(
      `Ajuste de -$${monto.toFixed(2)} USD guardado localmente`,
      "success",
    );
    return;
  }

  const datosSupabase = prepararTransaccionParaSupabase(nueva);
  const { data, error } = await supabaseClient
    .from("transacciones")
    .insert([datosSupabase])
    .select();

  if (error) {
    console.warn(
      "Fallo Supabase al registrar ajuste, guardando offline:",
      error,
    );
    const tempId = -Date.now();
    transacciones.unshift({ ...nueva, id: tempId });
    encolarOperacion("insert", "transacciones", nueva);
    guardarCacheLocal();
    actualizarInterfaz();
    mostrarToast(
      `Ajuste de -$${monto.toFixed(2)} USD guardado localmente`,
      "warning",
    );
    return;
  }

  if (data && data[0]) {
    transacciones.unshift({ ...nueva, id: data[0].id });
  }
  guardarCacheLocal();
  await cargarDatosCloud();
  mostrarToast(
    `Ajuste de -$${monto.toFixed(2)} USD registrado con éxito`,
    "success",
  );
}

async function aplicarAjusteCambiarioSugerido() {
  const mesFiltroEl = document.getElementById("mesFiltro");
  const mesSeleccionado = mesFiltroEl ? mesFiltroEl.value : "";
  const impacto =
    typeof calcularImpactoDevaluacion === "function"
      ? calcularImpactoDevaluacion(mesSeleccionado)
      : { perdidaPendiente: 0 };

  if (impacto.perdidaPendiente <= 0) {
    mostrarToast("No hay pérdida cambiaria pendiente de ajustar", "info");
    return;
  }

  const btn = document.getElementById("btnAplicarAjusteRapido");
  if (btn) btn.disabled = true;

  try {
    await ejecutarRegistroAjusteCambiario(impacto.perdidaPendiente);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function confirmarAjusteCambiarioPersonalizado(e) {
  if (e) e.preventDefault();
  const inputMonto = document.getElementById("inputMontoAjusteCambiario");
  const monto = parseFloat((inputMonto?.value || "").replace(",", "."));

  if (isNaN(monto) || monto <= 0) {
    mostrarToast("Ingresa un monto válido mayor a 0", "error");
    return;
  }

  const btn = document.getElementById("btnConfirmarAjusteModal");
  if (btn) btn.disabled = true;

  try {
    await ejecutarRegistroAjusteCambiario(monto);
    if (typeof ocultarModalAjusteCambiario === "function") {
      ocultarModalAjusteCambiario();
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

window.aplicarAjusteCambiarioSugerido = aplicarAjusteCambiarioSugerido;
window.confirmarAjusteCambiarioPersonalizado =
  confirmarAjusteCambiarioPersonalizado;
