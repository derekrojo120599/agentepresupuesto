// =========================================================================
// SERVICIO DE ALMACENAMIENTO LOCAL Y MODO OFFLINE
// =========================================================================

function claveCache() {
  return `presupuesto_cache_${usuarioActualId}`;
}
function claveCola() {
  return `presupuesto_cola_${usuarioActualId}`;
}
function clavePresupuestos() {
  return `presupuestos_cat_${usuarioActualId}`;
}
function claveMetas() {
  return `metas_ahorro_${usuarioActualId}`;
}
function claveCategorias() {
  return `categorias_presupuesto_${usuarioActualId || "local"}`;
}
function claveIconos() {
  return `categoria_iconos_${usuarioActualId || "local"}`;
}

function guardarCacheLocal() {
  if (!usuarioActualId) return;
  try {
    localStorage.setItem(
      claveCache(),
      JSON.stringify({
        transacciones,
        deudas,
        presupuestos,
        metasAhorro,
        guardadoEn: Date.now(),
      }),
    );
  } catch (err) {
    console.error("No se pudo guardar la caché local:", err);
  }
}

function cargarCacheLocal() {
  if (!usuarioActualId) return;
  try {
    const crudo = localStorage.getItem(claveCache());
    if (!crudo) return;
    const cache = JSON.parse(crudo);
    transacciones = cache.transacciones || [];
    deudas = cache.deudas || [];
    presupuestos = cache.presupuestos || {};
    metasAhorro = cache.metasAhorro || [];
    actualizarOpcionesCategoria();
    actualizarInterfaz();
  } catch (err) {
    console.error("No se pudo leer la caché local:", err);
  }
}

function cargarPresupuestosYMetasLocales() {
  if (!usuarioActualId) return;
  try {
    const pCrudo = localStorage.getItem(clavePresupuestos());
    presupuestos = pCrudo ? JSON.parse(pCrudo) : {};
    const mCrudo = localStorage.getItem(claveMetas());
    metasAhorro = mCrudo ? JSON.parse(mCrudo) : [];
  } catch (e) {
    console.warn(e);
  }
}

function guardarPresupuestosLocales() {
  if (!usuarioActualId) return;
  localStorage.setItem(clavePresupuestos(), JSON.stringify(presupuestos));
  guardarCacheLocal();
  sincronizarAjustesUsuarioCloud();
}

function guardarMetasLocales() {
  if (!usuarioActualId) return;
  localStorage.setItem(claveMetas(), JSON.stringify(metasAhorro));
  guardarCacheLocal();
  sincronizarAjustesUsuarioCloud();
}

function cargarCategoriasGuardadas() {
  try {
    const keyCats = claveCategorias();
    const keyIconos = claveIconos();
    const catsGuardadas =
      localStorage.getItem(keyCats) ||
      localStorage.getItem("categorias_presupuesto_app");
    if (catsGuardadas) {
      const parsed = JSON.parse(catsGuardadas);
      if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.ingreso) && parsed.ingreso.length)
          categoriasMap.ingreso = parsed.ingreso;
        if (Array.isArray(parsed.gasto) && parsed.gasto.length)
          categoriasMap.gasto = parsed.gasto;
        if (Array.isArray(parsed.ahorro) && parsed.ahorro.length)
          categoriasMap.ahorro = parsed.ahorro;
      }
    }
    const iconosGuardados =
      localStorage.getItem(keyIconos) ||
      localStorage.getItem("categoria_iconos_presupuesto_app");
    if (iconosGuardados) {
      const parsedIconos = JSON.parse(iconosGuardados);
      if (parsedIconos && typeof parsedIconos === "object") {
        Object.assign(categoriaIconosMap, parsedIconos);
      }
    }
  } catch (err) {
    console.warn("Error al cargar categorías de storage:", err);
  }
}

function guardarCategoriasEnStorage() {
  try {
    localStorage.setItem(claveCategorias(), JSON.stringify(categoriasMap));
    localStorage.setItem(claveIconos(), JSON.stringify(categoriaIconosMap));
  } catch (e) {
    console.warn(e);
  }
  guardarCacheLocal();
  sincronizarAjustesUsuarioCloud();
}

function obtenerCola() {
  if (!usuarioActualId) return [];
  try {
    return JSON.parse(localStorage.getItem(claveCola()) || "[]");
  } catch {
    return [];
  }
}

function guardarCola(cola) {
  if (!usuarioActualId) return;
  localStorage.setItem(claveCola(), JSON.stringify(cola));
}

function encolarOperacion(accion, tabla, datos, id) {
  const cola = obtenerCola();
  cola.push({ accion, tabla, datos, id, creadoEn: Date.now() });
  guardarCola(cola);
  actualizarIndicadorConexion();
}
