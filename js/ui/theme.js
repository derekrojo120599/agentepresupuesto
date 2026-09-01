// =========================================================================
// GESTIÓN DE TEMA CLARO / OSCURO
// =========================================================================

function inicializarTema() {
  const temaGuardado = localStorage.getItem("tema_presupuesto");
  if (temaGuardado === "light") {
    aplicarTema("light");
  } else {
    aplicarTema("dark");
  }
}

function aplicarTema(modo) {
  const html = document.documentElement;
  const icono = document.getElementById("iconoTema");
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  const metaStatus = document.querySelector(
    'meta[name="apple-mobile-web-app-status-bar-style"]',
  );

  if (modo === "dark") {
    html.classList.add("dark");
    html.classList.remove("light");
    if (icono) icono.textContent = "🌙";
    if (metaTheme) metaTheme.setAttribute("content", "#020617");
    if (metaStatus) metaStatus.setAttribute("content", "black-translucent");
    localStorage.setItem("tema_presupuesto", "dark");
  } else {
    html.classList.remove("dark");
    html.classList.add("light");
    if (icono) icono.textContent = "☀️";
    if (metaTheme) metaTheme.setAttribute("content", "#f8fafc");
    if (metaStatus) metaStatus.setAttribute("content", "default");
    localStorage.setItem("tema_presupuesto", "light");
  }
  if (sesionInicializada && typeof actualizarInterfaz === "function") {
    actualizarInterfaz();
  }
}

function alternarTema() {
  const esOscuro = document.documentElement.classList.contains("dark");
  aplicarTema(esOscuro ? "light" : "dark");
}
