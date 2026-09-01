// =========================================================================
// PUNTO DE ENTRADA PRINCIPAL & INICIALIZACIÓN DE LA APLICACIÓN
// =========================================================================

// ---------- Autenticación ----------

async function iniciarSesion(e) {
  e.preventDefault();
  const btn = document.getElementById("btnIngresar");
  const btnCrear = document.getElementById("btnCrearCuenta");
  btn.disabled = true;
  btnCrear.disabled = true;
  btn.textContent = "Ingresando...";

  try {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      mostrarAvisoAuth(
        error.message === "Invalid login credentials"
          ? "Correo o contraseña incorrectos."
          : "Error al iniciar sesión: " + error.message,
        "error",
      );
    } else {
      mostrarToast("¡Sesión iniciada!", "success");
    }
  } finally {
    btn.disabled = false;
    btnCrear.disabled = false;
    btn.textContent = "Ingresar";
  }
}

async function crearCuenta() {
  const btn = document.getElementById("btnIngresar");
  const btnCrear = document.getElementById("btnCrearCuenta");
  btn.disabled = true;
  btnCrear.disabled = true;
  btnCrear.textContent = "Creando...";

  try {
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;

    if (!email || password.length < 6) {
      mostrarAvisoAuth(
        "Ingresa un correo y contraseña de mín. 6 caracteres.",
        "error",
      );
      return;
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });
    if (error) {
      mostrarAvisoAuth("Error: " + error.message, "error");
      return;
    }

    if (data.session) {
      mostrarAvisoAuth("Cuenta creada correctamente.", "ok");
      mostrarToast("Cuenta creada con éxito", "success");
    } else {
      mostrarAvisoAuth(
        "Revisa tu correo para confirmar antes de ingresar.",
        "info",
      );
    }
  } finally {
    btn.disabled = false;
    btnCrear.disabled = false;
    btnCrear.textContent = "Crear cuenta";
  }
}

async function loginConGoogle() {
  const btnGoogle = document.getElementById("btnGoogleLogin");
  if (btnGoogle) btnGoogle.disabled = true;
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      mostrarAvisoAuth("Error con Google: " + error.message, "error");
    }
  } catch (err) {
    console.error(err);
  } finally {
    if (btnGoogle) btnGoogle.disabled = false;
  }
}

async function cerrarSesion() {
  if (canalRealtime) {
    supabaseClient.removeChannel(canalRealtime);
    canalRealtime = null;
  }
  await supabaseClient.auth.signOut();
  mostrarToast("Sesión cerrada", "info");
}

// ---------- Vinculación de Formularios y Eventos DOM ----------

function vincularEventosDOM() {
  const formAuth = document.getElementById("formAuth");
  if (formAuth) formAuth.addEventListener("submit", iniciarSesion);

  const btnCrearCuenta = document.getElementById("btnCrearCuenta");
  if (btnCrearCuenta) btnCrearCuenta.addEventListener("click", crearCuenta);

  const btnGoogle = document.getElementById("btnGoogleLogin");
  if (btnGoogle) btnGoogle.addEventListener("click", loginConGoogle);

  const montoInput = document.getElementById("monto");
  const tipoSelect = document.getElementById("tipo");
  const categoriaSelect = document.getElementById("categoria");
  const origenAhorroSelect = document.getElementById("origenAhorro");

  if (montoInput) montoInput.addEventListener("input", verificarMontoEnTiempoReal);
  if (tipoSelect) {
    tipoSelect.addEventListener("change", verificarMontoEnTiempoReal);
    tipoSelect.addEventListener("change", actualizarOpcionesCategoria);
  }
  if (origenAhorroSelect) origenAhorroSelect.addEventListener("change", verificarMontoEnTiempoReal);
  if (categoriaSelect) categoriaSelect.addEventListener("change", evaluarSeleccionesEspeciales);

  const formMovimiento = document.getElementById("formMovimiento");
  if (formMovimiento) {
    formMovimiento.addEventListener("submit", agregarTransaccion);
    formMovimiento.addEventListener("reset", () => {
      setTimeout(() => {
        seleccionarMonedaIngreso("USD");
        seleccionarTipoMovimiento("gasto");
        const fechaEl = document.getElementById("fecha");
        if (fechaEl) fechaEl.value = obtenerFechaLocalISO();
        actualizarConversionUI();
        verificarMontoEnTiempoReal();
      }, 10);
    });
  }

  const btnMonedaUSD = document.getElementById("btnMonedaUSD");
  const btnMonedaBS = document.getElementById("btnMonedaBS");
  if (btnMonedaUSD) btnMonedaUSD.addEventListener("click", () => seleccionarMonedaIngreso("USD"));
  if (btnMonedaBS) btnMonedaBS.addEventListener("click", () => seleccionarMonedaIngreso("BS"));
  if (montoInput) montoInput.addEventListener("input", actualizarConversionUI);

  const formNuevaDeuda = document.getElementById("formNuevaDeuda");
  if (formNuevaDeuda) formNuevaDeuda.addEventListener("submit", crearDeuda);

  const formIncrementoDeuda = document.getElementById("formIncrementoDeuda");
  if (formIncrementoDeuda) formIncrementoDeuda.addEventListener("submit", confirmarIncrementoDeuda);

  const formCategoria = document.getElementById("formCategoria");
  if (formCategoria) formCategoria.addEventListener("submit", guardarFormCategoria);

  const formConfigPresupuestos = document.getElementById("formConfigPresupuestos");
  if (formConfigPresupuestos) {
    formConfigPresupuestos.addEventListener("submit", (e) => {
      e.preventDefault();
      const inputs = document.querySelectorAll(".input-presupuesto");
      presupuestos = {};
      inputs.forEach((inp) => {
        const cat = inp.dataset.categoria;
        const val = parseFloat(inp.value);
        if (!isNaN(val) && val > 0) presupuestos[cat] = val;
      });
      guardarPresupuestosLocales();
      ocultarModalPresupuestos();
      actualizarInterfaz();
      mostrarToast("Presupuestos guardados", "success");
    });
  }

  const formMetaAhorro = document.getElementById("formMetaAhorro");
  if (formMetaAhorro) {
    formMetaAhorro.addEventListener("submit", (e) => {
      e.preventDefault();
      const id = document.getElementById("metaId").value;
      const nombre = document.getElementById("metaNombre").value.trim();
      const objetivo = parseFloat(document.getElementById("metaMonto").value);
      const icono = document.getElementById("metaIcono").value;
      const fechaLimite = document.getElementById("metaFechaLimite").value;

      if (!nombre || isNaN(objetivo) || objetivo <= 0) {
        mostrarToast("Ingresa un nombre y monto válido", "error");
        return;
      }

      if (id) {
        const idx = metasAhorro.findIndex((m) => m.id === id);
        if (idx !== -1)
          metasAhorro[idx] = {
            ...metasAhorro[idx],
            nombre,
            objetivo,
            icono,
            fechaLimite,
          };
      } else {
        metasAhorro.push({
          id: "meta_" + Date.now(),
          nombre,
          objetivo,
          icono,
          fechaLimite,
          creadoEn: Date.now(),
        });
      }

      guardarMetasLocales();
      ocultarModalMetaAhorro();
      actualizarSelectMetas();
      actualizarInterfaz();
      mostrarToast("Meta de ahorro guardada", "success");
    });
  }

  const formEditarMovimiento = document.getElementById("formEditarMovimiento");
  if (formEditarMovimiento) formEditarMovimiento.addEventListener("submit", confirmarEditarMovimiento);

  const editTipoSelect = document.getElementById("editTipo");
  const editCategoriaSelect = document.getElementById("editCategoria");
  if (editTipoSelect) editTipoSelect.addEventListener("change", () => actualizarOpcionesCategoriaEdit());
  if (editCategoriaSelect) editCategoriaSelect.addEventListener("change", () => evaluarSeleccionDeudaEdit());

  const mesFiltro = document.getElementById("mesFiltro");
  if (mesFiltro) {
    const hoy = new Date();
    mesFiltro.value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
    mesFiltro.addEventListener("change", () => {
      actualizarInterfaz();
      if (typeof window.inicializarTodosLosCustomSelects === "function") {
        setTimeout(() => window.inicializarTodosLosCustomSelects(), 50);
      }
    });
  }

  const fechaInput = document.getElementById("fecha");
  if (fechaInput) fechaInput.value = obtenerFechaLocalISO();

  const filtroCategoria = document.getElementById("filtroCategoria");
  if (filtroCategoria) filtroCategoria.addEventListener("change", renderizarHistorialFiltrado);

  const filtroAlcance = document.getElementById("filtroAlcance");
  if (filtroAlcance) {
    filtroAlcance.addEventListener("change", () => {
      renderizarHistorialFiltrado();
      if (document.getElementById("filtroAlcance").value === "dia") {
        if (typeof window.inicializarTodosLosCustomSelects === "function") {
          setTimeout(() => window.inicializarTodosLosCustomSelects(), 50);
        }
      }
    });
  }

  const filtroDia = document.getElementById("filtroDia");
  if (filtroDia) filtroDia.addEventListener("change", renderizarHistorialFiltrado);

  poblarSelectDias();
  actualizarOpcionesCategoria();
}

// ---------- Eventos Globales de Conectividad y Visibilidad ----------

window.addEventListener("online", () => {
  actualizarIndicadorConexion();
  sincronizarPendientes();
  obtenerTasaBinance();
});

window.addEventListener("offline", () => {
  actualizarIndicadorConexion();
  mostrarToast("Modo offline activo", "info");
});

document.addEventListener("visibilitychange", () => {
  if (
    document.visibilityState === "visible" &&
    usuarioActualId &&
    navigator.onLine
  ) {
    cargarDatosCloud();
  }
});

// Prevenir menú contextual de navegador en toques largos sobre botones y tarjetas
document.addEventListener("contextmenu", (e) => {
  if (
    e.target.closest(
      "button, select, canvas, .chip-tipo, [onclick], .custom-select-trigger, .custom-select-option-item",
    )
  ) {
    e.preventDefault();
  }
});

// ---------- Listener de Sesión Supabase ----------

supabaseClient.auth.onAuthStateChange((event, session) => {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  if (hashParams.get("error_description")) {
    mostrarAvisoAuth(
      "Error de acceso: " + decodeURIComponent(hashParams.get("error_description")),
      "error",
    );
    window.history.replaceState(null, null, window.location.pathname);
  }

  if (session) {
    try {
      const overlay = document.getElementById("loadingOverlay");
      const appContainer = document.getElementById("appContainer");
      const authScreen = document.getElementById("authScreen");
      const mobileNav = document.getElementById("mobileBottomNav");

      if (authScreen) authScreen.classList.add("hidden");

      if (!sesionInicializada && overlay) {
        overlay.classList.remove("hidden");
      }

      const emailEl = document.getElementById("usuarioEmail");
      if (emailEl) emailEl.textContent = session.user.email;

      const formAuth = document.getElementById("formAuth");
      if (formAuth) formAuth.reset();

      const avisoAuth = document.getElementById("avisoAuth");
      if (avisoAuth) avisoAuth.classList.add("hidden");

      usuarioActualId = session.user.id;

      cargarCategoriasGuardadas();
      cargarPresupuestosYMetasLocales();
      if (session.user) {
        cargarAjustesDeUserMetadata(session.user);
      }

      if (!sesionInicializada) {
        sesionInicializada = true;
        inicializarPestanas();

        const onDataReady = () => {
          if (overlay) {
            overlay.classList.add("opacity-0");
            setTimeout(() => {
              overlay.classList.add("hidden");
              overlay.classList.remove("opacity-0");
              if (appContainer) appContainer.classList.remove("hidden");
              if (mobileNav) {
                mobileNav.classList.remove("hidden");
                mobileNav.classList.add("flex");
              }
            }, 400);
          }
        };

        if (navigator.onLine) {
          cargarDatosCloud().then(() => {
            suscribirRealtime();
            onDataReady();
          });
        } else {
          cargarCacheLocal();
          onDataReady();
        }
        actualizarIndicadorConexion();
        sincronizarPendientes();
      } else {
        if (appContainer) appContainer.classList.remove("hidden");
        if (mobileNav) {
          mobileNav.classList.remove("hidden");
          mobileNav.classList.add("flex");
        }
      }
    } catch (errorLogueo) {
      console.error("Error inicializando sesión:", errorLogueo);
      mostrarAvisoAuth(
        "Error interno al cargar tus datos. Revisa la consola.",
        "error",
      );
    }
  } else {
    const appContainer = document.getElementById("appContainer");
    const mobileNav = document.getElementById("mobileBottomNav");
    const authScreen = document.getElementById("authScreen");

    if (appContainer) appContainer.classList.add("hidden");
    if (mobileNav) {
      mobileNav.classList.add("hidden");
      mobileNav.classList.remove("flex");
    }
    if (authScreen) authScreen.classList.remove("hidden");

    sesionInicializada = false;
    usuarioActualId = null;
    transacciones = [];
    deudas = [];
    presupuestos = {};
    metasAhorro = [];
  }
});

// ---------- Bootstrap Inicial ----------

document.addEventListener("DOMContentLoaded", () => {
  inicializarTema();
  inicializarPestanas();
  inicializarFlatpickrsGlobales();
  vincularEventosDOM();
  inicializarTodosLosCustomSelects();
  actualizarIndicadorConexion();
  obtenerTasaBinance();
});

// Registrar Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch((err) => console.warn("SW err:", err));
  });
}
