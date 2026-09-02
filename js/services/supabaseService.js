// =========================================================================
// SERVICIO DE SINCRONIZACIÓN Y BASE DE DATOS SUPABASE
// =========================================================================

let sincronizandoCloudTimeout = null;
let cargandoAjustesCloud = false;
let promesaCargaInicial = null;

function prepararTransaccionParaSupabase(t) {
  if (!t) return t;
  return {
    tipo: t.tipo,
    monto: t.monto,
    categoria: t.categoria,
    deuda_id: t.deuda_id !== undefined ? t.deuda_id : null,
    descripcion: t.descripcion || "",
    fecha: t.fecha,
  };
}

async function sincronizarPendientes() {
  if (!usuarioActualId || !navigator.onLine) return;
  let cola = obtenerCola();
  if (cola.length === 0) return;

  actualizarIndicadorConexion();

  for (const op of cola) {
    try {
      if (op.accion === "insert") {
        let datosParaEnviar = op.datos;
        if (op.tabla === "transacciones" && datosParaEnviar) {
          datosParaEnviar = prepararTransaccionParaSupabase(datosParaEnviar);
        }
        const { error } = await supabaseClient
          .from(op.tabla)
          .insert([datosParaEnviar]);
        if (error) throw error;
      } else if (op.accion === "update") {
        let datosParaEnviar = op.datos;
        if (op.tabla === "transacciones" && datosParaEnviar) {
          datosParaEnviar = prepararTransaccionParaSupabase(datosParaEnviar);
        }
        const { error } = await supabaseClient
          .from(op.tabla)
          .update(datosParaEnviar)
          .eq("id", op.id);
        if (error) throw error;
      } else if (op.accion === "delete") {
        const { error } = await supabaseClient
          .from(op.tabla)
          .delete()
          .eq("id", op.id);
        if (error) throw error;
      } else if (op.accion === "delete_by_deuda") {
        const { error } = await supabaseClient
          .from(op.tabla)
          .delete()
          .eq("deuda_id", op.id);
        if (error) throw error;
      }
      cola = cola.filter((o) => o !== op);
      guardarCola(cola);
    } catch (err) {
      console.error("Error al sincronizar operación pendiente:", err);

      op.intentos = (op.intentos || 0) + 1;

      // Si el error tiene un código de validación o falló 3 veces, lo descartamos
      if (
        err.code ||
        (err.message && err.message.includes("JSON")) ||
        op.intentos >= 3
      ) {
        console.warn(
          "Descartando operación inválida o tras múltiples intentos fallidos:",
          op,
        );
        cola = cola.filter((o) => o !== op);
        guardarCola(cola);
        continue;
      } else {
        guardarCola(cola);
        actualizarIndicadorConexion();
        return;
      }
    }
  }

  mostrarToast("Cambios sincronizados con la nube", "success");
  actualizarIndicadorConexion();
  await cargarDatosCloud();
  suscribirRealtime();
}

async function cargarDatosCloud() {
  if (promesaCargaInicial) return promesaCargaInicial;

  promesaCargaInicial = (async () => {
    try {
      const { data: transData, error: errTrans } = await supabaseClient
        .from("transacciones")
        .select("*")
        .order("fecha", { ascending: false })
        .order("id", { ascending: false });

      const { data: deudasData, error: errDeudas } = await supabaseClient
        .from("deudas")
        .select("*");

      if (errTrans || errDeudas) {
        mostrarAviso("Mostrando datos almacenados localmente.", "info");
        return;
      }

      // Sincronizar ajustes del usuario desde Supabase Auth Metadata
      try {
        const {
          data: { user },
        } = await supabaseClient.auth.getUser();
        if (user && user.user_metadata) {
          cargarAjustesDeUserMetadata(user);
        }
      } catch (e) {
        console.warn(e);
      }

      ocultarAviso();
      const fetchedTransacciones = transData || [];
      transacciones = fetchedTransacciones.filter(
        (t) =>
          typeof transaccionesPendientesEliminar === "undefined" ||
          !transaccionesPendientesEliminar.has(t.id),
      );

      deudas = (deudasData || []).map((d) => ({
        id: d.id,
        nombre: d.nombre,
        montoInicial: parseFloat(d.monto_inicial),
      }));

      guardarCacheLocal();
      actualizarOpcionesCategoria();
      if (typeof actualizarOpcionesFiltroCategoria === "function") {
        actualizarOpcionesFiltroCategoria();
      }
      actualizarInterfaz();
    } finally {
      promesaCargaInicial = null;
    }
  })();

  return promesaCargaInicial;
}

function suscribirRealtime() {
  if (canalRealtime) return;
  canalRealtime = supabaseClient
    .channel("cambios-presupuesto")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "transacciones" },
      cargarDatosCloud,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "deudas" },
      cargarDatosCloud,
    )
    .subscribe((status) => {
      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        supabaseClient.removeChannel(canalRealtime);
        canalRealtime = null;
        setTimeout(() => {
          if (usuarioActualId) suscribirRealtime();
        }, 3000);
      }
    });
}

function sincronizarAjustesUsuarioCloud() {
  if (!usuarioActualId || !navigator.onLine || cargandoAjustesCloud) return;
  if (sincronizandoCloudTimeout) clearTimeout(sincronizandoCloudTimeout);
  sincronizandoCloudTimeout = setTimeout(async () => {
    try {
      await supabaseClient.auth.updateUser({
        data: {
          categoriasMap,
          categoriaIconosMap,
          presupuestos,
          metasAhorro,
          nombrePerfil: nombrePerfilUsuario,
        },
      });
    } catch (err) {
      console.warn("No se pudieron sincronizar los ajustes en la nube:", err);
    }
  }, 400);
}

function cargarAjustesDeUserMetadata(user) {
  if (!user || !user.user_metadata) return;
  const meta = user.user_metadata;

  cargandoAjustesCloud = true;
  try {
    if (meta.nombrePerfil && typeof meta.nombrePerfil === "string") {
      nombrePerfilUsuario = meta.nombrePerfil.trim();
    }
    if (meta.categoriasMap && typeof meta.categoriasMap === "object") {
      if (
        Array.isArray(meta.categoriasMap.ingreso) &&
        meta.categoriasMap.ingreso.length
      )
        categoriasMap.ingreso = meta.categoriasMap.ingreso;
      if (
        Array.isArray(meta.categoriasMap.gasto) &&
        meta.categoriasMap.gasto.length
      )
        categoriasMap.gasto = meta.categoriasMap.gasto;
      if (
        Array.isArray(meta.categoriasMap.ahorro) &&
        meta.categoriasMap.ahorro.length
      )
        categoriasMap.ahorro = meta.categoriasMap.ahorro;
    }
    if (
      meta.categoriaIconosMap &&
      typeof meta.categoriaIconosMap === "object"
    ) {
      Object.assign(categoriaIconosMap, meta.categoriaIconosMap);
    }
    if (meta.presupuestos && typeof meta.presupuestos === "object") {
      presupuestos = { ...meta.presupuestos };
    }
    if (Array.isArray(meta.metasAhorro)) {
      metasAhorro = [...meta.metasAhorro];
    }
  } finally {
    cargandoAjustesCloud = false;
  }
}
