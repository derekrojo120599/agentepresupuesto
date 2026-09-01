// =========================================================================
// GESTIÓN DE VENTANAS MODALES Y ALERTAS INTELIGENTES
// =========================================================================

function mostrarModalDeuda() {
  const el = document.getElementById("modalDeuda");
  if (el) el.classList.remove("hidden");
}

function ocultarModalDeuda() {
  const el = document.getElementById("modalDeuda");
  if (el) el.classList.add("hidden");
}

function mostrarModalPresupuestos() {
  if (typeof renderizarInputsPresupuesto === "function") {
    renderizarInputsPresupuesto();
  }
  const el = document.getElementById("modalPresupuestos");
  if (el) el.classList.remove("hidden");
}

function ocultarModalPresupuestos() {
  const el = document.getElementById("modalPresupuestos");
  if (el) el.classList.add("hidden");
}

function mostrarModalMetaAhorro(metaId = null) {
  const modal = document.getElementById("modalMetaAhorro");
  const form = document.getElementById("formMetaAhorro");
  if (form) form.reset();

  if (metaId) {
    const m = metasAhorro.find((x) => x.id === metaId);
    if (m) {
      document.getElementById("metaId").value = m.id;
      document.getElementById("metaNombre").value = m.nombre;
      document.getElementById("metaMonto").value = m.objetivo;
      document.getElementById("metaIcono").value = m.icono || "🎯";
      document.getElementById("metaFechaLimite").value = m.fechaLimite || "";
      document.getElementById("tituloModalMeta").innerHTML =
        "<span>✏️</span> Editar Meta";
    }
  } else {
    document.getElementById("metaId").value = "";
    document.getElementById("tituloModalMeta").innerHTML =
      "<span>🎯</span> Nueva Meta";
  }
  if (modal) modal.classList.remove("hidden");
}

function ocultarModalMetaAhorro() {
  const el = document.getElementById("modalMetaAhorro");
  if (el) el.classList.add("hidden");
}

function mostrarModalEditarMovimiento() {
  const el = document.getElementById("modalEditarMovimiento");
  if (el) el.classList.remove("hidden");
}

function ocultarModalEditarMovimiento() {
  const el = document.getElementById("modalEditarMovimiento");
  if (el) el.classList.add("hidden");
}

function mostrarModalIncremento() {
  const el = document.getElementById("modalIncrementoDeuda");
  if (el) el.classList.remove("hidden");
}

function ocultarModalIncremento() {
  const el = document.getElementById("modalIncrementoDeuda");
  if (el) el.classList.add("hidden");
}

function abrirModalCrearCategoria() {
  document.getElementById("catEditNombreOriginal").value = "";
  document.getElementById("catNombre").value = "";
  document.getElementById("catIcono").value = "�Y?���?";
  document.getElementById("catTipo").value = tipoConfigCategoriaActual;
  document.getElementById("tituloModalCategoria").innerHTML =
    "<span>�Y?���?</span> Nueva Categor��a";
  const el = document.getElementById("modalCategoria");
  if (el) el.classList.remove("hidden");
}

function abrirModalCrearCategoriaDesdePresupuestos() {
  tipoConfigCategoriaActual = "gasto";
  abrirModalCrearCategoria();
}

function abrirModalEditarCategoria(tipo, nombre) {
  document.getElementById("catEditNombreOriginal").value = nombre;
  document.getElementById("catNombre").value = nombre;
  document.getElementById("catIcono").value =
    categoriaIconosMap[nombre] || "🏷️";
  document.getElementById("catTipo").value = tipo;
  document.getElementById("tituloModalCategoria").innerHTML =
    "<span>✏️</span> Editar Categoría";
  const el = document.getElementById("modalCategoria");
  if (el) el.classList.remove("hidden");
}

function ocultarModalCategoria() {
  const el = document.getElementById("modalCategoria");
  if (el) el.classList.add("hidden");
}

function seleccionarEmojiCat(emoji) {
  const el = document.getElementById("catIcono");
  if (el) el.value = emoji;
}

function seleccionarEmojiMeta(emoji) {
  const el = document.getElementById("metaIcono");
  if (el) el.value = emoji;
}

function mostrarModalAlertaInteligente(tipo, titulo, mensaje) {
  const modal = document.getElementById("modalAlertaInteligente");
  const icono = document.getElementById("modalAlertaIcono");
  const tituloEl = document.getElementById("modalAlertaTitulo");
  const mensajeEl = document.getElementById("modalAlertaMensaje");
  if (!modal || !icono || !tituloEl || !mensajeEl) return;

  if (tipo === "exceso_presupuesto") {
    icono.className =
      "w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-2 bg-coral/15 text-coral shadow-[0_0_20px_rgba(244,63,94,0.3)]";
    icono.textContent = "🚨";
  } else if (tipo === "meta_superada") {
    icono.className =
      "w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-2 bg-emerald-500/15 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]";
    icono.textContent = "🏆";
  } else if (tipo === "advertencia") {
    icono.className =
      "w-16 h-16 mx-auto rounded-full flex items-center justify-center text-3xl mb-2 bg-amber-500/15 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]";
    icono.textContent = "⚠️";
  }

  tituloEl.textContent = titulo;
  mensajeEl.innerHTML = mensaje;

  modal.classList.remove("hidden");
}

function ocultarModalAlertaInteligente() {
  const modal = document.getElementById("modalAlertaInteligente");
  if (modal) modal.classList.add("hidden");
}

// Cierre global de modales con Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    ocultarModalDeuda();
    ocultarModalIncremento();
    ocultarModalAbono();
    ocultarModalEditarMovimiento();
    ocultarModalPresupuestos();
    ocultarModalMetaAhorro();
    ocultarModalCategoria();
    ocultarModalAlertaInteligente();
  }
});
