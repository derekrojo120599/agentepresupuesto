// ---------- Módulo: Presupuestos ----------

    function renderizarInputsPresupuesto() {
      const contenedor = document.getElementById('contenedorInputsPresupuesto');
      contenedor.innerHTML = categoriasMap.gasto.map(cat => {
        const limiteActual = presupuestos[cat] || '';
        return `
          <div class="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-azulcielo/20">
            <span class="text-xs font-bold text-slate-700 dark:text-crema truncate">${escapeHTML(cat)}</span>
            <div class="flex items-center gap-1.5 w-32 shrink-0">
              <span class="text-xs text-slate-400 font-bold">$</span>
              <input type="number" step="1" min="0" data-categoria="${escapeHTML(cat)}" value="${limiteActual}" placeholder="Sin límite" class="input-presupuesto w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-azulcielo/30 p-2 rounded-lg text-slate-900 dark:text-crema text-xs font-bold text-right focus:border-azulelectrico focus:outline-none">
            </div>
          </div>
        `;
      }).join('');
    }

    document.getElementById('formConfigPresupuestos').addEventListener('submit', (e) => {
      e.preventDefault();
      const inputs = document.querySelectorAll('.input-presupuesto');
      presupuestos = {};

      inputs.forEach(inp => {
        const cat = inp.dataset.categoria;
        const val = parseFloat(inp.value);
        if (!isNaN(val) && val > 0) presupuestos[cat] = val;
      });

      guardarPresupuestosLocales();
      ocultarModalPresupuestos();
      actualizarInterfaz();
      mostrarToast('Presupuestos guardados', 'success');
    });

    function renderizarSeccionPresupuestos(gastosPorCat) {
      const grid = document.getElementById('gridPresupuestos');
      const contenedorAlertas = document.getElementById('contenedorAlertasPresupuesto');
      const categoriasConPresupuesto = Object.keys(presupuestos);

      if (!categoriasConPresupuesto.length) {
        contenedorAlertas.classList.add('hidden');
        grid.innerHTML = `
          <div class="col-span-full text-center py-5 border border-dashed border-slate-300 dark:border-azulcielo/30 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-950/40">
            <p class="text-slate-500 dark:text-azulcielo text-xs mb-2">No has fijado límites de gasto mensual.</p>
            <button onclick="mostrarModalPresupuestos()" class="text-xs bg-azulelectrico text-white font-bold px-3.5 py-1.5 rounded-xl transition shadow-md">
              Definir límites
            </button>
          </div>
        `;
        return;
      }

      let alertasHTML = '';

      grid.innerHTML = categoriasConPresupuesto.map(cat => {
        const limite = presupuestos[cat];
        const gastado = gastosPorCat[cat] || 0;
        const porcentaje = Math.min(100, (gastado / limite) * 100);
        const excedido = gastado > limite;
        const restante = Math.max(0, limite - gastado);

        let colorBarra = 'bg-emerald-500';
        let colorTexto = 'text-emerald-500';
        let badgeEstado = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">Normal</span>';

        if (excedido) {
          colorBarra = 'bg-coral';
          colorTexto = 'text-coral';
          badgeEstado = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-coral/20 text-coral animate-pulse">Excedido</span>';
          alertasHTML += `
            <div class="p-3 rounded-2xl bg-coral/15 border border-coral text-coral text-xs font-bold flex items-center justify-between gap-2">
              <span>⚠️ <strong>${escapeHTML(cat)}</strong> excedió su límite por <strong>$${(gastado - limite).toFixed(2)}</strong>.</span>
              <button onclick="filtrarPorCategoriaRapido('${escapeHTML(cat)}')" class="text-[11px] underline shrink-0 cursor-pointer">Ver</button>
            </div>
          `;
        } else if (porcentaje >= 80) {
          colorBarra = 'bg-amber-500';
          colorTexto = 'text-amber-500';
          badgeEstado = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500">80%+</span>';
          alertasHTML += `
            <div class="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-between gap-2">
              <span>⚠️ <strong>${escapeHTML(cat)}</strong> ha alcanzado el <strong>${porcentaje.toFixed(0)}%</strong> de su presupuesto ($${gastado.toFixed(2)} de $${limite.toFixed(2)}).</span>
              <button onclick="filtrarPorCategoriaRapido('${escapeHTML(cat)}')" class="text-[11px] underline shrink-0 cursor-pointer">Ver</button>
            </div>
          `;
        }

        return `
          <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-azulcielo/20 space-y-2 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-slate-800 dark:text-crema truncate">${escapeHTML(cat)}</span>
              ${badgeEstado}
            </div>
            <div class="flex items-baseline justify-between text-xs">
              <span class="font-black ${colorTexto}">$${gastado.toFixed(2)}</span>
              <span class="text-slate-400 font-semibold text-[11px]">Máx: $${limite.toFixed(2)}</span>
            </div>
            <div class="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div class="${colorBarra} h-full rounded-full transition-all duration-500" style="width: ${porcentaje}%"></div>
            </div>
            <div class="flex justify-between text-[10px] text-slate-500 dark:text-azulcielo font-semibold">
              <span>${porcentaje.toFixed(0)}% usado</span>
              <span>${excedido ? `+$${(gastado - limite).toFixed(2)}` : `-$${restante.toFixed(2)}`}</span>
            </div>
          </div>
        `;
      }).join('');

      if (alertasHTML) {
        contenedorAlertas.innerHTML = alertasHTML;
        contenedorAlertas.classList.remove('hidden');
      } else {
        contenedorAlertas.classList.add('hidden');
      }
    }\n