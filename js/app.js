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

async function solicitarRecuperacionClave(e) {
  if (e) e.preventDefault();
  const inputEmail = document.getElementById("emailRecuperacion");
  const email = (inputEmail ? inputEmail.value : "").trim();
  const btn = document.getElementById("btnEnviarRecuperacion");

  if (!email) {
    mostrarToast("Por favor ingresa tu correo electrónico", "error");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Enviando...";
  }

  try {
    const redirectUrl = window.location.origin + window.location.pathname;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      mostrarToast("Error: " + error.message, "error");
      mostrarAvisoAuth("Error al recuperar clave: " + error.message, "error");
    } else {
      ocultarModalRecuperarClave();
      mostrarToast("¡Correo de recuperación enviado!", "success");
      mostrarAvisoAuth(
        "Te enviamos un enlace por correo para restablecer tu contraseña. Revisa la bandeja de entrada o spam.",
        "ok",
      );
    }
  } catch (err) {
    console.error("Error al solicitar recuperación:", err);
    mostrarToast("Error al procesar la solicitud", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Enviar enlace";
    }
  }
}

async function guardarNuevaClave(e) {
  if (e) e.preventDefault();
  const pass1 = (document.getElementById("nuevaClaveAuth")?.value || "").trim();
  const pass2 = (document.getElementById("confirmarNuevaClaveAuth")?.value || "").trim();
  const btn = document.getElementById("btnGuardarNuevaClave");

  if (!pass1 || pass1.length < 6) {
    mostrarToast("La contraseña debe tener al menos 6 caracteres", "error");
    return;
  }

  if (pass1 !== pass2) {
    mostrarToast("Las contraseñas no coinciden", "error");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Guardando...";
  }

  try {
    const { error } = await supabaseClient.auth.updateUser({
      password: pass1,
    });

    if (error) {
      mostrarToast("Error al actualizar contraseña: " + error.message, "error");
    } else {
      esRecuperandoClave = false;
      ocultarModalNuevaClave();
      mostrarToast("¡Contraseña actualizada con éxito!", "success");
      if (window.location.hash || window.location.search.includes("type=recovery")) {
        window.history.replaceState(null, null, window.location.pathname);
      }
    }
  } catch (err) {
    console.error("Error al actualizar contraseña:", err);
    mostrarToast("Error al actualizar contraseña", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Guardar Contraseña";
    }
  }
}

window.solicitarRecuperacionClave = solicitarRecuperacionClave;
window.guardarNuevaClave = guardarNuevaClave;

function actualizarUIPerfilUsuario(user = null) {
  const emailEl = document.getElementById("usuarioEmail");
  const nombreEl = document.getElementById("usuarioNombre");
  const configEmail = document.getElementById("configEmailUsuario");
  const configNombre = document.getElementById("configNombrePerfil");

  const email = user?.email || (emailEl ? emailEl.textContent.trim() : "");
  if (emailEl && email) emailEl.textContent = email;
  if (configEmail && email) configEmail.value = email;

  if (nombreEl) {
    if (nombrePerfilUsuario) {
      nombreEl.textContent = `${nombrePerfilUsuario} • `;
      nombreEl.classList.remove("hidden");
    } else {
      nombreEl.textContent = "";
      nombreEl.classList.add("hidden");
    }
  }

  if (configNombre) {
    configNombre.value = nombrePerfilUsuario || "";
  }
}

async function guardarNombrePerfil(e) {
  if (e) e.preventDefault();
  const inputNombre = document.getElementById("configNombrePerfil");
  const btn = document.getElementById("btnGuardarNombrePerfil");
  const nuevoNombre = (inputNombre ? inputNombre.value : "").trim();

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Guardando...";
  }

  try {
    const { data, error } = await supabaseClient.auth.updateUser({
      data: {
        nombrePerfil: nuevoNombre,
      },
    });

    if (error) {
      mostrarToast("Error al guardar nombre: " + error.message, "error");
    } else {
      nombrePerfilUsuario = nuevoNombre;
      actualizarUIPerfilUsuario(data?.user);
      mostrarToast("¡Nombre de perfil guardado con éxito!", "success");
    }
  } catch (err) {
    console.error("Error al actualizar nombre de perfil:", err);
    mostrarToast("Error al guardar perfil", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Guardar Nombre";
    }
  }
}

async function cambiarClaveDesdeConfig(e) {
  if (e) e.preventDefault();
  const p1 = (document.getElementById("configNuevaClave")?.value || "").trim();
  const p2 = (document.getElementById("configConfirmarNuevaClave")?.value || "").trim();
  const btn = document.getElementById("btnActualizarClaveConfig");

  if (!p1 || p1.length < 6) {
    mostrarToast("La nueva contraseña debe tener al menos 6 caracteres", "error");
    return;
  }

  if (p1 !== p2) {
    mostrarToast("Las contraseñas no coinciden", "error");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Actualizando...";
  }

  try {
    const { error } = await supabaseClient.auth.updateUser({
      password: p1,
    });

    if (error) {
      mostrarToast("Error al actualizar contraseña: " + error.message, "error");
    } else {
      mostrarToast("¡Contraseña actualizada con éxito!", "success");
      const form = document.getElementById("formCambiarClaveConfig");
      if (form) form.reset();
    }
  } catch (err) {
    console.error("Error al cambiar contraseña:", err);
    mostrarToast("Error al actualizar contraseña", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Actualizar Contraseña";
    }
  }
}

window.actualizarUIPerfilUsuario = actualizarUIPerfilUsuario;
window.guardarNombrePerfil = guardarNombrePerfil;
window.cambiarClaveDesdeConfig = cambiarClaveDesdeConfig;

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

  const btnOlvidoClave = document.getElementById("btnOlvidoClave");
  if (btnOlvidoClave) btnOlvidoClave.addEventListener("click", mostrarModalRecuperarClave);

  const formRecuperarClave = document.getElementById("formRecuperarClave");
  if (formRecuperarClave) formRecuperarClave.addEventListener("submit", solicitarRecuperacionClave);

  const formNuevaClave = document.getElementById("formNuevaClave");
  if (formNuevaClave) formNuevaClave.addEventListener("submit", guardarNuevaClave);

  const formPerfil = document.getElementById("formPerfilUsuario");
  if (formPerfil) formPerfil.addEventListener("submit", guardarNombrePerfil);

  const formCambiarClave = document.getElementById("formCambiarClaveConfig");
  if (formCambiarClave) formCambiarClave.addEventListener("submit", cambiarClaveDesdeConfig);

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

  const esLinkRecuperacion =
    event === "PASSWORD_RECOVERY" ||
    window.location.hash.includes("type=recovery") ||
    window.location.search.includes("type=recovery");

  if (esLinkRecuperacion) {
    esRecuperandoClave = true;
    setTimeout(() => {
      mostrarModalNuevaClave();
    }, 100);
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
        actualizarUIPerfilUsuario(session.user);
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
              if (esRecuperandoClave) {
                mostrarModalNuevaClave();
              }
            }, 400);
          } else if (esRecuperandoClave) {
            mostrarModalNuevaClave();
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
        if (esRecuperandoClave) {
          mostrarModalNuevaClave();
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
  if (
    window.location.hash.includes("type=recovery") ||
    window.location.search.includes("type=recovery")
  ) {
    esRecuperandoClave = true;
    setTimeout(() => {
      mostrarModalNuevaClave();
    }, 200);
  }
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
