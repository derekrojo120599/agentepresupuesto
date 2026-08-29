// ---------- Filtros por Chips Táctiles (Sin barra de texto) ----------

    function seleccionarChipTipo(tipo) {
      filtroTipoActual = tipo;
      
      const chips = {
        '': document.getElementById('chipTipoTodos'),
        'gasto': document.getElementById('chipTipoGasto'),
        'ingreso': document.getElementById('chipTipoIngreso'),
        'ahorro': document.getElementById('chipTipoAhorro')
      };

      const claseActiva = 'chip-tipo px-3 py-1.5 rounded-xl text-xs font-bold bg-azulelectrico text-white shadow-sm transition shrink-0';
      const claseInactiva = 'chip-tipo px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-azulcielo border border-slate-200 dark:border-azulcielo/20 hover:bg-slate-200 dark:hover:bg-slate-800 transition shrink-0';

      Object.keys(chips).forEach(k => {
        chips[k].className = k === tipo ? claseActiva : claseInactiva;
      });

      actualizarOpcionesFiltroCategoria();
      renderizarHistorialFiltrado();
    }

    function actualizarOpcionesFiltroCategoria() {
      const select = document.getElementById('filtroCategoria');
      let opciones = '<option value="">Todas las categorías</option>';

      if (filtroTipoActual && categoriasMap[filtroTipoActual]) {
        categoriasMap[filtroTipoActual].forEach(c => {
          opciones += `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`;
        });
      } else {
        const todas = [...categoriasMap.ingreso, ...categoriasMap.gasto, ...categoriasMap.ahorro];
        [...new Set(todas)].forEach(c => {
          opciones += `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`;
        });
      }
      select.innerHTML = opciones;
    }

    function filtrarPorCategoriaRapido(cat) {
      cambiarPestana('historial');
      document.getElementById('filtroCategoria').value = cat;
      renderizarHistorialFiltrado();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function limpiarFiltros() {
      seleccionarChipTipo('');
      document.getElementById('filtroCategoria').value = '';
      document.getElementById('filtroAlcance').value = 'mes';
      renderizarHistorialFiltrado();
      mostrarToast('Filtros restablecidos', 'info');
    }

    function renderizarHistorialFiltrado() {
      const mesSeleccionado = document.getElementById('mesFiltro').value;
      const categoria = document.getElementById('filtroCategoria').value;
      const alcance = document.getElementById('filtroAlcance').value;

      const filtradas = transacciones.filter(t => {
        if (alcance === 'mes' && !t.fecha.startsWith(mesSeleccionado)) return false;
        if (filtroTipoActual && t.tipo !== filtroTipoActual) return false;
        if (categoria && t.categoria !== categoria) return false;
        return true;
      });

      document.getElementById('conteoFiltradas').textContent = `${filtradas.length} de ${transacciones.length} movimiento(s)`;

      let totalFlujo = 0;
      filtradas.forEach(t => {
        const m = parseFloat(t.monto);
        if (t.tipo === 'ingreso') totalFlujo += m;
        else if (t.tipo === 'gasto') totalFlujo -= m;
      });

      document.getElementById('resumenMontoFiltrado').textContent = `Neto: $${totalFlujo.toFixed(2)}`;

      const tablaDesktop = document.getElementById('tablaHistorial');
      const listaMobile = document.getElementById('listaHistorialMobile');

      if (!filtradas.length) {
        const vacioHTML = `<div class="p-6 text-center text-slate-400 text-xs">No hay movimientos en este filtro.</div>`;
        tablaDesktop.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-400 text-xs">No hay movimientos.</td></tr>`;
        listaMobile.innerHTML = vacioHTML;
        return;
      }

      // Render Desktop Tabla
      tablaDesktop.innerHTML = filtradas.map(t => {
        let badgeStyle = 'bg-coral/15 text-coral border-coral/30';
        let signo = '-';
        let colorMonto = 'text-coral';
        const montoNum = parseFloat(t.monto);

        if (t.tipo === 'ingreso') {
          badgeStyle = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
          signo = '+';
          colorMonto = 'text-emerald-600 dark:text-emerald-400';
        } else if (t.tipo === 'ahorro') {
          badgeStyle = 'bg-azulcielo/15 text-azulcielo-dark dark:text-azulcielo border-azulcielo/30';
          signo = t.categoria === 'Depositar a Ahorro' ? '+' : '-';
          colorMonto = 'text-azulcielo-dark dark:text-azulcielo';
        }

        return `
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
            <td class="p-3 font-medium text-slate-700 dark:text-crema text-xs">${escapeHTML(t.fecha)}</td>
            <td class="p-3"><span class="px-2 py-0.5 text-xs rounded-lg font-bold border ${badgeStyle}">${escapeHTML(t.tipo.toUpperCase())}</span></td>
            <td class="p-3 text-slate-600 dark:text-azulcielo font-semibold text-xs">${escapeHTML(t.categoria)}</td>
            <td class="p-3 text-slate-900 dark:text-crema font-medium text-xs">${escapeHTML(t.descripcion)}</td>
            <td class="p-3 text-right font-extrabold text-sm ${colorMonto}">${signo}$${montoNum.toFixed(2)}</td>
            <td class="p-3 text-center">
              <div class="flex items-center justify-center gap-1">
                <button onclick="duplicarTransaccion(${t.id})" class="text-slate-400 hover:text-azulelectrico p-1 cursor-pointer" title="Duplicar">📋</button>
                <button onclick="editarTransaccion(${t.id})" class="text-slate-400 hover:text-azulelectrico p-1 cursor-pointer" title="Editar">✏️</button>
                <button onclick="eliminarTransaccion(${t.id})" class="text-slate-400 hover:text-coral p-1 cursor-pointer" title="Eliminar">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Render Mobile Tarjetas Táctiles
      listaMobile.innerHTML = filtradas.map(t => {
        let signo = '-';
        let colorMonto = 'text-coral';
        let iconTipo = '🔴';
        const montoNum = parseFloat(t.monto);

        if (t.tipo === 'ingreso') {
          signo = '+';
          colorMonto = 'text-emerald-600 dark:text-emerald-400';
          iconTipo = '🟢';
        } else if (t.tipo === 'ahorro') {
          signo = t.categoria === 'Depositar a Ahorro' ? '+' : '-';
          colorMonto = 'text-azulcielo-dark dark:text-azulcielo';
          iconTipo = '🟡';
        }

        return `
          <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-azulcielo/20 flex items-center justify-between gap-2.5 active:scale-[0.99] transition">
            <div class="flex items-center gap-3 min-w-0">
              <span class="text-lg shrink-0">${iconTipo}</span>
              <div class="min-w-0">
                <p class="text-xs font-bold text-slate-900 dark:text-crema truncate">${escapeHTML(t.descripcion)}</p>
                <p class="text-[10px] text-slate-400 dark:text-azulcielo/70 flex items-center gap-1.5">
                  <span>${escapeHTML(t.categoria)}</span>
                  <span>•</span>
                  <span>${escapeHTML(t.fecha)}</span>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-sm font-black ${colorMonto}">${signo}$${montoNum.toFixed(2)}</span>
              <button onclick="duplicarTransaccion(${t.id})" class="text-slate-400 hover:text-azulelectrico p-1.5 cursor-pointer" title="Duplicar">📋</button>
              <button onclick="editarTransaccion(${t.id})" class="text-slate-400 hover:text-azulelectrico p-1.5 cursor-pointer" title="Editar">✏️</button>
              <button onclick="eliminarTransaccion(${t.id})" class="text-slate-400 hover:text-coral p-1.5 cursor-pointer" title="Eliminar">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
    }\n