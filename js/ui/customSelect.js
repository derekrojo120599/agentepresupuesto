// =========================================================================
// UTILIDADES BASE & SISTEMA DE SELECTS PERSONALIZADOS (Custom Select / Dropdown / Bottom Sheet)
// =========================================================================

function escapeHTML(str) {
  return String(str ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

let activeCustomSelect = null;
let activeCustomOverlay = null;
let activeCustomDropdown = null;
let customHighlightedIndex = -1;
let lastRecordedWindowWidth = window.innerWidth;

// Interceptar setters de HTMLSelectElement para sincronizar automáticamente .value y .selectedIndex
(function interceptSelectProperties() {
  const origValueDesc = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "value",
  );
  if (origValueDesc && origValueDesc.set) {
    Object.defineProperty(HTMLSelectElement.prototype, "value", {
      get() {
        return origValueDesc.get.call(this);
      },
      set(val) {
        origValueDesc.set.call(this, val);
        if (typeof this._customSelectSync === "function") {
          this._customSelectSync();
        }
      },
      configurable: true,
      enumerable: true,
    });
  }

  const origIndexDesc = Object.getOwnPropertyDescriptor(
    HTMLSelectElement.prototype,
    "selectedIndex",
  );
  if (origIndexDesc && origIndexDesc.set) {
    Object.defineProperty(HTMLSelectElement.prototype, "selectedIndex", {
      get() {
        return origIndexDesc.get.call(this);
      },
      set(idx) {
        origIndexDesc.set.call(this, idx);
        if (typeof this._customSelectSync === "function") {
          this._customSelectSync();
        }
      },
      configurable: true,
      enumerable: true,
    });
  }
})();

function esDispositivoMovil() {
  return window.innerWidth < 640;
}

function inicializarCustomSelect(select) {
  if (!select || select._customSelectWrapper || select.id === "tipo") return;

  // Ocultar el <select> nativo para eliminar el picker del SO, manteniendo su funcionalidad en formularios
  select.classList.add("sr-only");
  select.setAttribute("aria-hidden", "true");
  select.tabIndex = -1;
  select.style.cssText =
    "position: absolute !important; opacity: 0 !important; pointer-events: none !important; width: 0 !important; height: 0 !important; margin: 0 !important; padding: 0 !important; border: none !important;";

  // Crear el contenedor de reemplazo visual
  const wrapper = document.createElement("div");
  wrapper.className = "custom-select-wrapper relative w-full";
  wrapper.dataset.customSelectId = select.id || "";

  // Determinar clases de borde y tamaño según el contexto
  const isFilter = select.id.startsWith("filtro");
  const isDebt = select.id.toLowerCase().includes("deuda");
  const isMeta = select.id === "metaAhorroSelect";
  const isModal =
    select.id.startsWith("edit") || select.id === "metaIcono";

  let borderClasses =
    "border-slate-300 dark:border-azulcielo/30 focus:border-azulelectrico focus:ring-azulelectrico/20";
  if (isDebt) {
    borderClasses =
      "border-coral/50 focus:border-coral focus:ring-coral/20";
  } else if (isMeta) {
    borderClasses =
      "border-azulcielo/50 focus:border-azulelectrico focus:ring-azulelectrico/20";
  } else if (isFilter) {
    borderClasses =
      "border-slate-200 dark:border-azulcielo/30 focus:border-azulelectrico focus:ring-azulelectrico/20";
  }

  let paddingClasses = "p-3 text-sm";
  if (isFilter) paddingClasses = "p-2 text-xs";
  else if (isModal) paddingClasses = "p-2.5 text-sm";

  let fontClasses = "font-semibold";
  if (select.id === "tipo" || select.id === "editTipo")
    fontClasses = "font-bold";

  // Botón disparador personalizado (Trigger)
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.id = `custom-trigger-${select.id || Math.random().toString(36).substring(2, 9)}`;
  trigger.className = `custom-select-trigger w-full bg-slate-50 dark:bg-slate-950 border ${borderClasses} ${paddingClasses} ${fontClasses} rounded-xl text-slate-900 dark:text-crema flex items-center justify-between gap-2 text-left cursor-pointer transition focus:outline-none focus:ring-2 select-none shadow-sm hover:border-azulelectrico/50 active:scale-[0.99]`;
  trigger.setAttribute("role", "combobox");
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const labelSpan = document.createElement("span");
  labelSpan.className =
    "custom-select-label truncate flex items-center gap-1.5 min-w-0";

  const chevronSpan = document.createElement("span");
  chevronSpan.className =
    "custom-select-chevron shrink-0 text-slate-400 dark:text-azulcielo transition-transform duration-200 pointer-events-none";
  chevronSpan.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>`;

  trigger.appendChild(labelSpan);
  trigger.appendChild(chevronSpan);

  // Reemplazar visualmente en el árbol DOM
  select.parentNode.insertBefore(wrapper, select);
  wrapper.appendChild(select);
  wrapper.appendChild(trigger);

  select._customSelectWrapper = wrapper;
  select._customSelectTrigger = trigger;
  select._customSelectLabel = labelSpan;

  // Función de sincronización de texto seleccionado
  const syncLabel = () => {
    const selectedOpt = select.options[select.selectedIndex];
    if (selectedOpt) {
      labelSpan.textContent = selectedOpt.text;
    } else if (select.options.length > 0) {
      labelSpan.textContent = select.options[0].text;
    } else {
      labelSpan.textContent = "Sin opciones";
    }
  };

  select._customSelectSync = syncLabel;
  syncLabel();

  // Observador de cambios dinámicos en las opciones (innerHTML, appendChild, etc.)
  const observer = new MutationObserver(() => {
    syncLabel();
    if (
      activeCustomSelect === select &&
      (activeCustomOverlay || activeCustomDropdown)
    ) {
      renderizarOpcionesCustomSelect(select);
    }
  });
  observer.observe(select, {
    childList: true,
    subtree: true,
    attributes: true,
  });

  // Eventos de apertura e interacción
  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    alternarCustomSelect(select);
  });

  trigger.addEventListener("keydown", (e) => {
    if (
      e.key === "Enter" ||
      e.key === " " ||
      e.key === "ArrowDown" ||
      e.key === "ArrowUp"
    ) {
      e.preventDefault();
      abrirCustomSelect(select);
    }
  });
}

function abrirCustomSelect(select) {
  if (activeCustomSelect === select) return;
  cerrarCustomSelectActivo();

  activeCustomSelect = select;
  const trigger = select._customSelectTrigger;
  if (trigger) {
    trigger.setAttribute("aria-expanded", "true");
    const chevron = trigger.querySelector(".custom-select-chevron");
    if (chevron) chevron.style.transform = "rotate(180deg)";
  }

  if (esDispositivoMovil()) {
    abrirBottomSheet(select);
  } else {
    abrirDropdownFlotante(select);
  }
}

function cerrarCustomSelectActivo() {
  if (!activeCustomSelect) return;

  const trigger = activeCustomSelect._customSelectTrigger;
  if (trigger) {
    trigger.setAttribute("aria-expanded", "false");
    const chevron = trigger.querySelector(".custom-select-chevron");
    if (chevron) chevron.style.transform = "";
  }

  if (activeCustomOverlay) {
    activeCustomOverlay.remove();
    activeCustomOverlay = null;
    document.body.style.overflow = "";
  }
  if (activeCustomDropdown) {
    activeCustomDropdown.remove();
    activeCustomDropdown = null;
  }

  activeCustomSelect = null;
  customHighlightedIndex = -1;
}

function alternarCustomSelect(select) {
  if (activeCustomSelect === select) {
    cerrarCustomSelectActivo();
  } else {
    abrirCustomSelect(select);
  }
}

// Modal Bottom Sheet para pantallas móviles
function abrirBottomSheet(select) {
  const meta = selectTitlesMap[select.id] || {
    title:
      select
        .closest("div")
        ?.querySelector("label")
        ?.textContent?.trim() || "Seleccionar Opción",
    icon: "✨",
  };

  // Bloquear scroll de fondo en móvil para evitar saltos
  document.body.style.overflow = "hidden";

  const overlay = document.createElement("div");
  overlay.className =
    "custom-select-bottomsheet-overlay fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[100] flex items-end justify-center p-0 fade-in";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const sheet = document.createElement("div");
  sheet.className =
    "bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-azulcielo/30 rounded-t-3xl p-5 pb-8 w-full max-w-lg space-y-3.5 shadow-2xl slide-up max-h-[85vh] flex flex-col";
  sheet.style.paddingBottom =
    "max(2rem, env(safe-area-inset-bottom, 20px))";

  // Píldora táctil indicadora de arrastre (Drag handle)
  const handle = document.createElement("div");
  handle.className =
    "w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto -mt-1 mb-1 shrink-0";
  sheet.appendChild(handle);

  // Cabecera con título, ícono y botón de cierre
  const header = document.createElement("div");
  header.className =
    "flex items-center justify-between border-b border-slate-100 dark:border-azulcielo/20 pb-3 shrink-0";
  header.innerHTML = `
    <div class="flex items-center gap-2 min-w-0">
      <span class="text-lg shrink-0">${meta.icon}</span>
      <h3 class="text-sm font-bold text-slate-900 dark:text-crema truncate">${escapeHTML(meta.title)}</h3>
    </div>
    <button type="button" class="btn-close-sheet p-1.5 text-slate-400 hover:text-coral dark:hover:text-coral transition font-bold text-lg leading-none shrink-0 cursor-pointer" aria-label="Cerrar">✕</button>
  `;
  sheet.appendChild(header);

  // Buscador interno rápido si hay más de 5 opciones
  if (select.options.length > 5) {
    const searchBox = document.createElement("div");
    searchBox.className = "relative shrink-0";
    searchBox.innerHTML = `
      <input type="text" placeholder="Buscar opción..." class="custom-select-search w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-azulcielo/20 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-crema focus:outline-none focus:border-azulelectrico transition" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
    `;
    sheet.appendChild(searchBox);
  }

  // Lista deslizable con scroll suave táctil
  const listContainer = document.createElement("div");
  listContainer.className =
    "custom-select-options-list flex-1 overflow-y-auto space-y-1.5 pr-0.5 no-scrollbar";
  listContainer.style.webkitOverflowScrolling = "touch";
  listContainer.style.overscrollBehavior = "contain";
  listContainer.setAttribute("role", "listbox");
  sheet.appendChild(listContainer);

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  activeCustomOverlay = overlay;

  renderizarOpcionesCustomSelect(select, listContainer);

  // Filtro de búsqueda en tiempo real
  const searchInput = sheet.querySelector(".custom-select-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderizarOpcionesCustomSelect(
        select,
        listContainer,
        e.target.value,
      );
    });
  }

  // Cierre al pulsar botón o tocar backdrop
  header
    .querySelector(".btn-close-sheet")
    .addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      cerrarCustomSelectActivo();
    });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      cerrarCustomSelectActivo();
    }
  });
}

// Menú flotante desplegable para pantallas Desktop
function abrirDropdownFlotante(select) {
  const trigger = select._customSelectTrigger;
  const rect = trigger.getBoundingClientRect();

  const dropdown = document.createElement("div");
  dropdown.className =
    "custom-select-desktop-dropdown fixed z-[100] bg-white dark:bg-slate-900 border border-slate-200 dark:border-azulcielo/30 rounded-2xl shadow-2xl p-2 max-h-64 overflow-y-auto space-y-1 fade-in";
  dropdown.setAttribute("role", "listbox");

  // Posicionamiento dinámico adaptativo
  const espacioAbajo = window.innerHeight - rect.bottom;
  const alturaEstimada = Math.min(select.options.length * 40 + 24, 260);

  let top = rect.bottom + 6;
  if (espacioAbajo < alturaEstimada && rect.top > alturaEstimada) {
    top = rect.top - alturaEstimada - 6;
  }

  dropdown.style.top = `${top}px`;
  dropdown.style.left = `${rect.left}px`;
  dropdown.style.width = `${Math.max(rect.width, 200)}px`;

  // Buscador rápido si hay más de 5 opciones
  if (select.options.length > 5) {
    const searchBox = document.createElement("div");
    searchBox.className =
      "pb-1.5 mb-1 border-b border-slate-100 dark:border-azulcielo/20";
    searchBox.innerHTML = `
      <input type="text" placeholder="Filtrar..." class="custom-select-search w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-azulcielo/20 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-crema focus:outline-none focus:border-azulelectrico transition">
    `;
    dropdown.appendChild(searchBox);
  }

  const listContainer = document.createElement("div");
  listContainer.className = "space-y-1";
  dropdown.appendChild(listContainer);

  document.body.appendChild(dropdown);
  activeCustomDropdown = dropdown;

  renderizarOpcionesCustomSelect(select, listContainer);

  const searchInput = dropdown.querySelector(".custom-select-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderizarOpcionesCustomSelect(
        select,
        listContainer,
        e.target.value,
      );
    });
    setTimeout(() => searchInput.focus(), 50);
  }

  // Cerrar al hacer clic fuera
  setTimeout(() => {
    function handleOutsideClick(e) {
      if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
        cerrarCustomSelectActivo();
        document.removeEventListener("click", handleOutsideClick);
      }
    }
    document.addEventListener("click", handleOutsideClick);
  }, 10);
}

// Renderizado de las opciones con estilos seleccionados y checkmark ✓
function renderizarOpcionesCustomSelect(select, container, query = "") {
  if (!container) {
    if (activeCustomOverlay)
      container = activeCustomOverlay.querySelector(
        ".custom-select-options-list",
      );
    else if (activeCustomDropdown)
      container =
        activeCustomDropdown.querySelector(".space-y-1") ||
        activeCustomDropdown;
  }
  if (!container) return;

  container.innerHTML = "";
  const normalQuery = (query || "").toLowerCase().trim();

  const optionsArray = Array.from(select.options).filter((opt) => {
    if (!normalQuery) return true;
    return (
      opt.text.toLowerCase().includes(normalQuery) ||
      opt.value.toLowerCase().includes(normalQuery)
    );
  });

  if (optionsArray.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.className =
      "p-4 text-center text-xs text-slate-400 dark:text-azulcielo italic";
    emptyMsg.textContent = query
      ? "No hay coincidencias"
      : "No hay opciones disponibles";
    container.appendChild(emptyMsg);
    return;
  }

  const isMobileView = esDispositivoMovil();
  const padding = isMobileView ? "p-3.5" : "p-2.5";
  const textSize = isMobileView ? "text-sm" : "text-xs sm:text-sm";

  optionsArray.forEach((opt, idx) => {
    const isSelected = opt.selected || opt.value === select.value;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.value = opt.value;
    btn.dataset.index = idx;
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", isSelected ? "true" : "false");

    if (isSelected) {
      btn.className = `custom-select-option-item w-full text-left ${padding} rounded-xl flex items-center justify-between ${textSize} font-bold bg-azulelectrico/10 text-azulelectrico dark:bg-azulelectrico/20 dark:text-crema border border-azulelectrico/30 shadow-sm transition active:scale-[0.99] cursor-pointer`;
      btn.innerHTML = `
        <span class="truncate pr-2">${escapeHTML(opt.text)}</span>
        <span class="w-5 h-5 rounded-full bg-azulelectrico text-slate-950 flex items-center justify-center text-[11px] font-black shrink-0 ml-2 shadow-sm">✓</span>
      `;
    } else {
      btn.className = `custom-select-option-item w-full text-left ${padding} rounded-xl flex items-center justify-between ${textSize} font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 active:bg-slate-200 dark:active:bg-slate-700 active:scale-[0.99] border border-transparent transition cursor-pointer`;
      btn.innerHTML = `
        <span class="truncate pr-2">${escapeHTML(opt.text)}</span>
      `;
    }

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      seleccionarOpcionCustom(select, opt.value);
    });

    container.appendChild(btn);
  });
}

function seleccionarOpcionCustom(select, value) {
  select.value = value;
  if (typeof select._customSelectSync === "function") {
    select._customSelectSync();
  }

  // Disparar eventos change e input nativos
  select.dispatchEvent(new Event("change", { bubbles: true }));
  select.dispatchEvent(new Event("input", { bubbles: true }));

  const trigger = select._customSelectTrigger;
  cerrarCustomSelectActivo();
  if (!esDispositivoMovil() && trigger) trigger.focus();
}

// Navegación por teclado global (Escape, Flechas Arriba/Abajo, Enter)
window.addEventListener("keydown", (e) => {
  if (!activeCustomSelect) return;

  if (e.key === "Escape") {
    e.preventDefault();
    const trigger = activeCustomSelect._customSelectTrigger;
    cerrarCustomSelectActivo();
    if (!esDispositivoMovil() && trigger) trigger.focus();
    return;
  }

  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const container =
      activeCustomOverlay?.querySelector(".custom-select-options-list") ||
      activeCustomDropdown;
    if (!container) return;

    const buttons = Array.from(
      container.querySelectorAll(".custom-select-option-item"),
    );
    if (buttons.length === 0) return;

    if (customHighlightedIndex === -1) {
      customHighlightedIndex = buttons.findIndex(
        (b) => b.dataset.value === activeCustomSelect.value,
      );
      if (customHighlightedIndex === -1) customHighlightedIndex = 0;
    }

    if (e.key === "ArrowDown") {
      customHighlightedIndex =
        (customHighlightedIndex + 1) % buttons.length;
    } else {
      customHighlightedIndex =
        (customHighlightedIndex - 1 + buttons.length) % buttons.length;
    }

    buttons[customHighlightedIndex]?.focus();
    buttons[customHighlightedIndex]?.scrollIntoView({ block: "nearest" });
    return;
  }

  if (e.key === "Tab") {
    cerrarCustomSelectActivo();
  }
});

// Cerrar al redimensionar ventana
window.addEventListener("resize", () => {
  if (Math.abs(window.innerWidth - lastRecordedWindowWidth) > 60) {
    lastRecordedWindowWidth = window.innerWidth;
    if (activeCustomSelect) {
      cerrarCustomSelectActivo();
    }
  }
});

// Sincronizar selectores al reiniciar formularios
document.addEventListener("reset", (e) => {
  setTimeout(() => {
    const form = e.target;
    if (form && form.querySelectorAll) {
      form.querySelectorAll("select").forEach((sel) => {
        if (typeof sel._customSelectSync === "function")
          sel._customSelectSync();
      });
    }
  }, 0);
});

// Inicializar todos los selects de la app
window.inicializarTodosLosCustomSelects = function () {
  document.querySelectorAll("select").forEach((select) => {
    inicializarCustomSelect(select);
  });
};

// Inicializar Flatpickr SOLO UNA VEZ al arrancar la app
function inicializarFlatpickrsGlobales() {
  flatpickr("#fecha", { locale: "es", disableMobile: false });
  flatpickr("#editFecha", { locale: "es", disableMobile: false });
  flatpickr("#metaFechaLimite", { locale: "es", disableMobile: false });

  flatpickr("#mesFiltro", {
    locale: "es",
    plugins: [
      new monthSelectPlugin({
        shorthand: true,
        dateFormat: "Y-m",
        altFormat: "F Y",
        theme: "dark",
      }),
    ],
    disableMobile: false,
  });
}
