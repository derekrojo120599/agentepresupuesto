// ---------- Módulo: Metas de Ahorro ----------

    document.getElementById('formMetaAhorro').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('metaId').value;
      const nombre = document.getElementById('metaNombre').value.trim();
      const objetivo = parseFloat(document.getElementById('metaMonto').value);
      const icono = document.getElementById('metaIcono').value;
      const fechaLimite = document.getElementById('metaFechaLimite').value;

      if (!nombre || isNaN(objetivo) || objetivo <= 0) {
        mostrarToast('Ingresa un nombre y monto válido', 'error');
        return;
      }

      if (id) {
        const idx = metasAhorro.findIndex(m => m.id === id);
        if (idx !== -1) metasAhorro[idx] = { ...metasAhorro[idx], nombre, objetivo, icono, fechaLimite };
      } else {
        metasAhorro.push({ id: 'meta_' + Date.now(), nombre, objetivo, icono, fechaLimite, creadoEn: Date.now() });
      }

      guardarMetasLocales();
      ocultarModalMetaAhorro();
      actualizarSelectMetas();
      actualizarInterfaz();
      mostrarToast('Meta de ahorro guardada', 'success');
    });

    function eliminarMetaAhorro(metaId) {
      if (!confirm('¿Eliminar esta meta? Los fondos registrados en transacciones no se borrarán.')) return;
      metasAhorro = metasAhorro.filter(m => m.id !== metaId);
      guardarMetasLocales();
      actualizarSelectMetas();
      actualizarInterfaz();
      mostrarToast('Meta eliminada', 'info');
    }

    function depositarEnMetaRapido(nombreMeta) {
      tipoSelect.value = 'ahorro';
      actualizarOpcionesCategoria();
      categoriaSelect.value = 'Depositar a Ahorro';
      document.getElementById('descripcion').value = nombreMeta;
      evaluarSeleccionesEspeciales();
      if (metaAhorroSelect) metaAhorroSelect.value = nombreMeta;
      abrirRegistroMobile();
    }

    function renderizarMetasAhorro(fondosMapa) {
      const grid = document.getElementById('gridMetasAhorro');
      if (!metasAhorro.length) {
        grid.innerHTML = `
          <div class="col-span-full text-center py-5 border border-dashed border-slate-300 dark:border-azulcielo/30 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/40">
            <p class="text-slate-500 dark:text-azulcielo text-xs mb-2">No has creado metas de ahorro.</p>
            <button onclick="mostrarModalMetaAhorro()" class="text-xs bg-azulcielo text-slate-950 font-bold px-3.5 py-1.5 rounded-xl transition shadow-md">
              Crear meta
            </button>
          </div>
        `;
        return;
      }

      grid.innerHTML = metasAhorro.map(meta => {
        const acumulado = Math.max(0, fondosMapa[meta.nombre] || 0);
        const porcentaje = Math.min(100, (acumulado / meta.objetivo) * 100);
        const completada = acumulado >= meta.objetivo;

        return `
          <div class="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border ${completada ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-[1.02]' : 'border-slate-200 dark:border-azulcielo/20 shadow-sm'} space-y-2.5 transition-all duration-300">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-xl p-2 rounded-xl ${completada ? 'bg-emerald-500/20 text-emerald-500' : 'bg-azulcielo/15 text-azulcielo'} shrink-0 transition-colors">${meta.icono || '🎯'}</span>
                <div class="min-w-0">
                  <h3 class="font-bold text-slate-900 dark:text-crema text-xs sm:text-sm truncate">${escapeHTML(meta.nombre)}</h3>
                  ${meta.fechaLimite ? `<p class="text-[10px] text-slate-400 truncate">Límite: ${escapeHTML(meta.fechaLimite)}</p>` : ''}
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button onclick="mostrarModalMetaAhorro('${meta.id}')" class="text-slate-400 hover:text-azulcielo p-1 text-xs">✏️</button>
                <button onclick="eliminarMetaAhorro('${meta.id}')" class="text-slate-400 hover:text-coral p-1 text-xs">🗑️</button>
              </div>
            </div>

            <div class="flex items-baseline justify-between text-xs">
              <span class="font-black ${completada ? 'text-emerald-500' : 'text-azulcielo-dark dark:text-azulcielo'} text-sm">$${acumulado.toFixed(2)}</span>
              <span class="text-slate-400 text-[11px] font-semibold">Obj: $${meta.objetivo.toFixed(2)}</span>
            </div>

            <div class="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden relative ${completada ? 'ring-1 ring-emerald-500/30' : ''}">
              <div class="${completada ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-azulelectrico'} h-full rounded-full transition-all duration-500 relative overflow-hidden" style="width: ${porcentaje}%">
                ${completada ? '<div class="absolute inset-0 bg-white/20 animate-pulse"></div>' : ''}
              </div>
            </div>

            <div class="flex items-center justify-between text-[11px] pt-1">
              <span class="font-bold ${completada ? 'text-emerald-500' : 'text-slate-500 dark:text-azulcielo'} text-[10px]">
                ${completada ? '🎉 ¡Completada!' : `${porcentaje.toFixed(0)}%`}
              </span>
              <button onclick="depositarEnMetaRapido('${escapeHTML(meta.nombre)}')" class="text-xs ${completada ? 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-azulcielo/20 hover:bg-azulcielo text-azulcielo-dark dark:text-azulcielo'} hover:text-slate-950 px-2.5 py-1 rounded-lg font-bold transition">
                + Abonar
              </button>
            </div>
          </div>
        `;
      }).join('');
    }\n