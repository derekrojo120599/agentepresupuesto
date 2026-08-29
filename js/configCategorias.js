// ---------- Módulo: Configuración de Categorías ----------

    function filtrarTipoConfigCategorias(tipo) {
      tipoConfigCategoriaActual = tipo;
      renderizarConfiguracionCategorias();
    }

    function actualizarBotonesTipoConfig() {
      const btnGasto = document.getElementById('btnConfigCatGasto');
      const btnIngreso = document.getElementById('btnConfigCatIngreso');
      const btnAhorro = document.getElementById('btnConfigCatAhorro');
      if (!btnGasto || !btnIngreso || !btnAhorro) return;

      const baseInactive = 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-azulcielo/20 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer';

      btnGasto.className = tipoConfigCategoriaActual === 'gasto'
        ? 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-coral text-white shadow-sm cursor-pointer'
        : baseInactive;

      btnIngreso.className = tipoConfigCategoriaActual === 'ingreso'
        ? 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-emerald-600 text-white shadow-sm cursor-pointer'
        : baseInactive;

      btnAhorro.className = tipoConfigCategoriaActual === 'ahorro'
        ? 'px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-amber-500 text-white shadow-sm cursor-pointer'
        : baseInactive;

      const cGas = document.getElementById('conteoCatGasto');
      const cIng = document.getElementById('conteoCatIngreso');
      const cAho = document.getElementById('conteoCatAhorro');
      if (cGas) cGas.textContent = `(${(categoriasMap.gasto || []).length})`;
      if (cIng) cIng.textContent = `(${(categoriasMap.ingreso || []).length})`;
      if (cAho) cAho.textContent = `(${(categoriasMap.ahorro || []).length})`;
    }

    function renderizarConfiguracionCategorias() {
      actualizarBotonesTipoConfig();
      const grid = document.getElementById('gridConfigCategorias');
      if (!grid) return;

      const lista = categoriasMap[tipoConfigCategoriaActual] || [];

      if (!lista.length) {
        grid.innerHTML = `
          <div class="col-span-full p-8 text-center text-slate-400 dark:text-azulcielo text-xs border border-dashed border-slate-200 dark:border-azulcielo/20 rounded-2xl space-y-2">
            <p class="text-xl">🏷️</p>
            <p class="font-bold">No hay categorías configuradas en este tipo</p>
            <button onclick="abrirModalCrearCategoria()" class="text-azulelectrico font-bold underline">Crear la primera</button>
          </div>
        `;
        return;
      }

      // Contar movimientos por categoría
      const conteoMovimientos = {};
      transacciones.forEach(t => {
        if (t.tipo === tipoConfigCategoriaActual && t.categoria) {
          conteoMovimientos[t.categoria] = (conteoMovimientos[t.categoria] || 0) + 1;
        }
      });

      const tipoBadgeColor = tipoConfigCategoriaActual === 'gasto'
        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
        : (tipoConfigCategoriaActual === 'ingreso'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20');

      const tipoNombre = tipoConfigCategoriaActual === 'gasto' ? 'Gasto' : (tipoConfigCategoriaActual === 'ingreso' ? 'Ingreso' : 'Ahorro');

      grid.innerHTML = lista.map(cat => {
        const icono = categoriaIconosMap[cat] || '🏷️';
        const movs = conteoMovimientos[cat] || 0;
        const catEscaped = escapeHTML(cat);

        return `
          <div class="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/80 dark:border-azulcielo/20 flex flex-col justify-between space-y-3 hover:border-azulelectrico/40 transition">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-azulcielo/20 flex items-center justify-center text-lg shrink-0 shadow-sm">
                  ${escapeHTML(icono)}
                </span>
                <div class="min-w-0">
                  <h4 class="text-xs sm:text-sm font-bold text-slate-800 dark:text-crema truncate">${catEscaped}</h4>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded border ${tipoBadgeColor}">${tipoNombre}</span>
                </div>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <button onclick="abrirModalEditarCategoria('${tipoConfigCategoriaActual}', '${catEscaped}')" class="p-1.5 rounded-lg text-slate-500 hover:text-azulelectrico hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-azulcielo/20 transition text-xs cursor-pointer" title="Editar">
                  ✏️
                </button>
                <button onclick="eliminarCategoriaConfig('${tipoConfigCategoriaActual}', '${catEscaped}')" class="p-1.5 rounded-lg text-slate-400 hover:text-coral hover:bg-white dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-azulcielo/20 transition text-xs cursor-pointer" title="Eliminar">
                  🗑️
                </button>
              </div>
            </div>

            <div class="text-[10px] text-slate-400 dark:text-azulcielo flex items-center justify-between pt-1 border-t border-slate-100 dark:border-azulcielo/10">
              <span>Uso en historial:</span>
              <span class="font-bold text-slate-700 dark:text-slate-300">${movs} movimiento(s)</span>
            </div>
          </div>
        `;
      }).join('');
    }

    function guardarFormCategoria(e) {
      e.preventDefault();
      const nombreOriginal = document.getElementById('catEditNombreOriginal').value.trim();
      const nuevoNombre = document.getElementById('catNombre').value.trim();
      const nuevoTipo = document.getElementById('catTipo').value;
      const nuevoIcono = document.getElementById('catIcono').value.trim() || '🏷️';

      if (!nuevoNombre) {
        mostrarToast('Ingresa un nombre para la categoría', 'error');
        return;
      }

      // Si es edición
      if (nombreOriginal) {
        const lista = categoriasMap[nuevoTipo] || [];
        const index = lista.indexOf(nombreOriginal);
        if (index !== -1) {
          lista[index] = nuevoNombre;
        } else {
          lista.push(nuevoNombre);
        }
        categoriaIconosMap[nuevoNombre] = nuevoIcono;

        // Actualizar transacciones existentes si cambió de nombre
        if (nombreOriginal !== nuevoNombre) {
          transacciones.forEach(t => {
            if (t.tipo === nuevoTipo && t.categoria === nombreOriginal) {
              t.categoria = nuevoNombre;
            }
          });
          // Actualizar presupuestos si existía
          if (presupuestos[nombreOriginal] !== undefined) {
            presupuestos[nuevoNombre] = presupuestos[nombreOriginal];
            delete presupuestos[nombreOriginal];
            guardarPresupuestosLocales();
          }
        }
        mostrarToast('Categoría actualizada', 'success');
      } else {
        // Creación
        if (!categoriasMap[nuevoTipo]) categoriasMap[nuevoTipo] = [];
        if (categoriasMap[nuevoTipo].includes(nuevoNombre)) {
          mostrarToast('Ya existe una categoría con este nombre', 'error');
          return;
        }
        categoriasMap[nuevoTipo].push(nuevoNombre);
        categoriaIconosMap[nuevoNombre] = nuevoIcono;
        tipoConfigCategoriaActual = nuevoTipo;
        mostrarToast('Categoría creada', 'success');
      }

      guardarCategoriasEnStorage();
      guardarCacheLocal();
      actualizarOpcionesCategoria();
      actualizarOpcionesFiltroCategoria();
      actualizarInterfaz();
      renderizarConfiguracionCategorias();
      ocultarModalCategoria();
    }

    function eliminarCategoriaConfig(tipo, nombre) {
      const lista = categoriasMap[tipo] || [];
      if (lista.length <= 1) {
        mostrarToast('Debe existir al menos una categoría en este tipo', 'error');
        return;
      }

      const conteoUso = transacciones.filter(t => t.tipo === tipo && t.categoria === nombre).length;
      let mensaje = `¿Eliminar la categoría "${nombre}"?`;
      if (conteoUso > 0) {
        const fallback = tipo === 'gasto' ? 'Otros Gastos' : (tipo === 'ingreso' ? 'Otros Ingresos' : 'Depositar a Ahorro');
        mensaje += `\nTiene ${conteoUso} movimiento(s) asociado(s) que se reasignarán a "${fallback}".`;
      }

      if (!confirm(mensaje)) return;

      const idx = lista.indexOf(nombre);
      if (idx !== -1) lista.splice(idx, 1);

      // Reasignar transacciones si usaban esta categoría
      if (conteoUso > 0) {
        const fallback = tipo === 'gasto' ? 'Otros Gastos' : (tipo === 'ingreso' ? 'Otros Ingresos' : 'Depositar a Ahorro');
        if (!lista.includes(fallback)) lista.push(fallback);
        transacciones.forEach(t => {
          if (t.tipo === tipo && t.categoria === nombre) {
            t.categoria = fallback;
          }
        });
      }

      if (presupuestos[nombre] !== undefined) {
        delete presupuestos[nombre];
        guardarPresupuestosLocales();
      }

      guardarCategoriasEnStorage();
      guardarCacheLocal();
      actualizarOpcionesCategoria();
      actualizarOpcionesFiltroCategoria();
      actualizarInterfaz();
      renderizarConfiguracionCategorias();
      mostrarToast('Categoría eliminada', 'info');
    }

    function restablecerCategoriasPorDefecto() {
      if (!confirm('¿Estás seguro de restablecer todas las categorías a sus valores por defecto?')) return;

      categoriasMap.ingreso = [...CATEGORIAS_DEFAULT.ingreso];
      categoriasMap.gasto = [...CATEGORIAS_DEFAULT.gasto];
      categoriasMap.ahorro = [...CATEGORIAS_DEFAULT.ahorro];
      Object.assign(categoriaIconosMap, CATEGORIA_ICONOS_DEFAULT);

      guardarCategoriasEnStorage();
      guardarCacheLocal();
      actualizarOpcionesCategoria();
      actualizarOpcionesFiltroCategoria();
      actualizarInterfaz();
      renderizarConfiguracionCategorias();
      mostrarToast('Categorías restablecidas por defecto', 'info');
    }\n