// =========================================================================
// SISTEMA DE NAVEGACIÓN POR PESTAÑAS Y DOCK MÓVIL
// =========================================================================

let pestanaActual = "resumen";

function cambiarPestana(tabName) {
  pestanaActual = tabName;
  localStorage.setItem("pestana_activa_presupuesto", tabName);

  const pestanas = [
    "resumen",
    "registrar",
    "historial",
    "presupuestos",
    "metas",
    "deudas",
    "comparar",
    "configuracion",
  ];
  pestanas.forEach((p) => {
    const idContent = `tabContent${p.charAt(0).toUpperCase() + p.slice(1)}`;
    const idNav = `navTab${p.charAt(0).toUpperCase() + p.slice(1)}`;
    const el = document.getElementById(idContent);
    const btn = document.getElementById(idNav);

    if (el) {
      if (p === tabName) {
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    }

    if (btn) {
      if (p === tabName) {
        btn.className =
          "tab-btn flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-azulelectrico text-white shadow-md shadow-azulelectrico/25";
      } else {
        btn.className =
          "tab-btn flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition text-slate-600 dark:text-azulcielo hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-crema";
      }
    }

    const idMobileNav = `mobileNav${p.charAt(0).toUpperCase() + p.slice(1)}`;
    const mobileBtn = document.getElementById(idMobileNav);
    if (mobileBtn) {
      if (p === tabName) {
        mobileBtn.className =
          "mobile-nav-btn flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition text-azulelectrico font-bold flex-1 bg-azulelectrico/10 dark:bg-azulelectrico/20 cursor-pointer";
      } else {
        mobileBtn.className =
          "mobile-nav-btn flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition text-slate-500 dark:text-azulcielo font-semibold flex-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer";
      }
    }
  });

  const btnHeaderConfig = document.getElementById("btnHeaderConfiguracion");
  if (btnHeaderConfig) {
    if (tabName === "configuracion") {
      btnHeaderConfig.className =
        "p-2.5 rounded-xl border border-azulelectrico bg-azulelectrico text-white shadow-sm shadow-azulelectrico/30 transition active:scale-95 cursor-pointer";
    } else {
      btnHeaderConfig.className =
        "p-2.5 rounded-xl border border-slate-200 dark:border-azulcielo/30 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-azulcielo hover:bg-slate-200 dark:hover:bg-slate-800 transition active:scale-95 shadow-sm cursor-pointer";
    }
  }

  if (tabName === "resumen") {
    setTimeout(() => {
      if (graficoMultilineaChart) graficoMultilineaChart.resize();
    }, 50);
  } else if (tabName === "configuracion") {
    if (typeof renderizarConfiguracionCategorias === "function") {
      renderizarConfiguracionCategorias();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (tabName === "comparar") {
    if (typeof renderizarComparacion === "function") {
      renderizarComparacion();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function inicializarPestanas() {
  const guardada = localStorage.getItem("pestana_activa_presupuesto");
  const pestanasValidas = [
    "resumen",
    "registrar",
    "historial",
    "presupuestos",
    "metas",
    "deudas",
    "comparar",
    "configuracion",
  ];
  if (guardada && pestanasValidas.includes(guardada)) {
    cambiarPestana(guardada);
  } else {
    cambiarPestana("resumen");
  }
}

function abrirRegistroMobile() {
  cambiarPestana("registrar");
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => {
    const m = document.getElementById("monto");
    if (m) m.focus();
  }, 150);
}

function actualizarIndicadorConexion() {
  const el = document.getElementById("indicadorConexion");
  if (!el) return;
  const pendientes = typeof obtenerCola === "function" ? obtenerCola().length : 0;

  // Permitir reintentar manualmente al hacer clic
  el.onclick = () => {
    if (pendientes > 0) {
      mostrarToast("Reintentando sincronización...", "info");
      if (typeof sincronizarPendientes === "function") sincronizarPendientes();
    }
  };
  el.style.cursor = pendientes > 0 ? "pointer" : "default";

  if (!navigator.onLine) {
    el.textContent =
      pendientes > 0 ? `🔴 Offline · ${pendientes} pend.` : "🔴 Offline";
    el.className =
      "text-[11px] font-bold px-2 py-0.5 rounded-lg border bg-coral/15 border-coral text-coral";
    el.classList.remove("hidden");
  } else if (pendientes > 0) {
    el.textContent = `🟡 Sincronizando ${pendientes}...`;
    el.className =
      "text-[11px] font-bold px-2 py-0.5 rounded-lg border bg-azulcielo/20 border-azulcielo text-azulcielo-dark dark:text-azulcielo";
    el.classList.remove("hidden");
  } else {
    el.classList.add("hidden");
  }
}

function bloquearBoton(form, texto) {
  const btn = form.querySelector('button[type=\"submit\"]');
  if (!btn) return null;
  btn.dataset.textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = texto;
  return btn;
}

function desbloquearBoton(btn) {
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = btn.dataset.textoOriginal || btn.textContent;
}

function obtenerFechaLocalISO() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
