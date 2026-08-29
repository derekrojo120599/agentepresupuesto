// ---------- Actualización de la Interfaz ----------

    function actualizarInterfaz() {
      const mesSeleccionado = document.getElementById('mesFiltro').value;
      const filtradasMes = transacciones.filter(t => t.fecha.startsWith(mesSeleccionado));

      let ingresosMes = 0, gastosMes = 0;
      let countIngresos = 0, countGastos = 0;
      const gastosPorCat = {};

      filtradasMes.forEach(t => {
        const montoNum = parseFloat(t.monto);
        if (t.tipo === 'ingreso') {
          ingresosMes += montoNum;
          countIngresos++;
        } else if (t.tipo === 'gasto') {
          gastosMes += montoNum;
          countGastos++;
          gastosPorCat[t.categoria] = (gastosPorCat[t.categoria] || 0) + montoNum;
        }
      });

      let ahorroAcumuladoTotal = 0;
      const fondosAhorroMapa = {};

      // 1. Inicializar fondos con las metas en su orden de creación (de izquierda a derecha)
      metasAhorro.forEach(m => {
        if (m.nombre) fondosAhorroMapa[m.nombre.trim()] = 0;
      });

      // 2. Procesar transacciones en orden cronológico (de la más antigua a la más reciente)
      // para que las barras y fondos aparezcan de izquierda a derecha en orden temporal
      const transaccionesCronologicas = [...transacciones].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

      transaccionesCronologicas.forEach(t => {
        const montoNum = parseFloat(t.monto);
        if (t.tipo === 'ahorro') {
          const fondoNombre = (t.descripcion || 'Ahorro General').trim();
          if (fondosAhorroMapa[fondoNombre] === undefined) fondosAhorroMapa[fondoNombre] = 0;

          const cat = (t.categoria || '').toLowerCase().trim();
          if (cat.includes('retirar') || cat.includes('usar') || cat.includes('retiro') || cat.includes('gasto')) {
            ahorroAcumuladoTotal -= montoNum;
            fondosAhorroMapa[fondoNombre] -= montoNum;
          } else {
            // 'Depositar a Ahorro', 'Abono', o cualquier depósito suma al fondo
            ahorroAcumuladoTotal += montoNum;
            fondosAhorroMapa[fondoNombre] += montoNum;
          }
        }
      });

      const pagosMap = {};
      transacciones.forEach(t => {
        const montoNum = parseFloat(t.monto);
        if (t.tipo === 'gasto' && t.categoria === 'Pago de Deuda' && t.deuda_id) {
          pagosMap[t.deuda_id] = (pagosMap[t.deuda_id] || 0) + montoNum;
        }
      });

      let totalDeudaPendiente = 0;
      const tablaDeudas = document.getElementById('tablaDeudas');
      const listaDeudasMobile = document.getElementById('listaDeudasMobile');

      if (!deudas.length) {
        tablaDeudas.innerHTML = `<tr><td colspan="5" class="p-5 text-center text-slate-400 text-xs">Sin deudas registradas.</td></tr>`;
        listaDeudasMobile.innerHTML = `<div class="p-4 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-azulcielo/20 rounded-2xl">Sin deudas registradas.</div>`;
      } else {
        // Desktop
        tablaDeudas.innerHTML = deudas.map(d => {
          const pagado = pagosMap[d.id] || 0;
          const restante = Math.max(0, d.montoInicial - pagado);
          totalDeudaPendiente += restante;
          const pagadoPct = Math.min(100, (pagado / d.montoInicial) * 100);

          return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <td class="p-3 font-semibold text-slate-800 dark:text-crema">
                <div class="flex items-center gap-2">
                  <span>${escapeHTML(d.nombre)}</span>
                  ${restante === 0 ? '<span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600">Liquidada</span>' : ''}
                </div>
                <div class="w-24 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                  <div class="bg-azulelectrico h-full rounded-full" style="width: ${pagadoPct}%"></div>
                </div>
              </td>
              <td class="p-3 text-right font-medium">$${d.montoInicial.toFixed(2)}</td>
              <td class="p-3 text-right text-azulelectrico font-bold">$${pagado.toFixed(2)}</td>
              <td class="p-3 text-right font-black ${restante === 0 ? 'text-slate-400 line-through' : 'text-coral'}">$${restante.toFixed(2)}</td>
              <td class="p-3 text-center">
                <div class="flex justify-center items-center gap-1">
                  <button onclick="incrementarDeudaDirecta(${d.id})" class="text-xs p-1">✏️</button>
                  <button onclick="eliminarDeuda(${d.id})" class="text-slate-400 hover:text-coral p-1">🗑️</button>
                </div>
              </td>
            </tr>
          `;
        }).join('');

        // Mobile
        listaDeudasMobile.innerHTML = deudas.map(d => {
          const pagado = pagosMap[d.id] || 0;
          const restante = Math.max(0, d.montoInicial - pagado);
          const pagadoPct = Math.min(100, (pagado / d.montoInicial) * 100);

          return `
            <div class="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-azulcielo/20 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-900 dark:text-crema">${escapeHTML(d.nombre)}</span>
                <div class="flex items-center gap-1">
                  <button onclick="incrementarDeudaDirecta(${d.id})" class="text-xs p-1">✏️</button>
                  <button onclick="eliminarDeuda(${d.id})" class="text-xs p-1 text-coral">🗑️</button>
                </div>
              </div>
              <div class="flex justify-between text-xs font-semibold">
                <span class="text-azulelectrico">Abonado: $${pagado.toFixed(2)}</span>
                <span class="${restante === 0 ? 'text-emerald-500' : 'text-coral'} font-bold">Resta: $${restante.toFixed(2)}</span>
              </div>
              <div class="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div class="bg-azulelectrico h-full rounded-full" style="width: ${pagadoPct}%"></div>
              </div>
            </div>
          `;
        }).join('');
      }

      // Comparativa con el mes anterior
      const [anoActual, mesActual] = (mesSeleccionado || '').split('-').map(Number);
      let compIngresoHTML = '';
      let compGastoHTML = '';

      if (anoActual && mesActual) {
        const fechaMesAnt = new Date(anoActual, mesActual - 2, 1);
        const mesAnteriorStr = `${fechaMesAnt.getFullYear()}-${String(fechaMesAnt.getMonth() + 1).padStart(2, '0')}`;
        const filtradasMesAnt = transacciones.filter(t => t.fecha.startsWith(mesAnteriorStr));

        let ingresosMesAnt = 0, gastosMesAnt = 0;
        filtradasMesAnt.forEach(t => {
          const m = parseFloat(t.monto) || 0;
          if (t.tipo === 'ingreso') ingresosMesAnt += m;
          else if (t.tipo === 'gasto') gastosMesAnt += m;
        });

        if (ingresosMesAnt > 0) {
          const diffIng = ((ingresosMes - ingresosMesAnt) / ingresosMesAnt) * 100;
          const colorDiff = diffIng >= 0 ? 'text-emerald-500' : 'text-coral';
          const iconoDiff = diffIng >= 0 ? '▲ +' : '▼ ';
          compIngresoHTML = ` · <span class="${colorDiff} font-bold">${iconoDiff}${Math.abs(diffIng).toFixed(0)}%</span>`;
        }

        if (gastosMesAnt > 0) {
          const diffGas = ((gastosMes - gastosMesAnt) / gastosMesAnt) * 100;
          const colorDiff = diffGas <= 0 ? 'text-emerald-500' : 'text-coral';
          const iconoDiff = diffGas <= 0 ? '▼ ' : '▲ +';
          compGastoHTML = ` · <span class="${colorDiff} font-bold">${iconoDiff}${Math.abs(diffGas).toFixed(0)}%</span>`;
        }
      }

      // Totales
      document.getElementById('totalIngresos').textContent = `$${ingresosMes.toFixed(2)}`;
      document.getElementById('subIngresos').innerHTML = `${countIngresos} mov.${compIngresoHTML}`;

      document.getElementById('totalGastos').textContent = `$${gastosMes.toFixed(2)}`;
      document.getElementById('subGastos').innerHTML = `${countGastos} mov.${compGastoHTML}`;

      document.getElementById('totalAhorro').textContent = `$${ahorroAcumuladoTotal.toFixed(2)}`;
      document.getElementById('subAhorro').textContent = `${Object.keys(fondosAhorroMapa).length} fondo(s)`;

      document.getElementById('totalDeudas').textContent = `$${totalDeudaPendiente.toFixed(2)}`;
      document.getElementById('subDeudas').textContent = `${deudas.length} acreedor(es)`;

      let balance = 0;
      transacciones.forEach(t => {
        if (t.fecha.substring(0, 7) <= mesSeleccionado) {
          const m = parseFloat(t.monto);
          if (t.tipo === 'ingreso') balance += m;
          else if (t.tipo === 'gasto') balance -= m;
        }
      });
      const balanceEl = document.getElementById('balanceNeto');
      const signoBal = balance < 0 ? '-' : '';
      const partesBal = Math.abs(balance).toFixed(2).split('.');
      const enterosBal = parseInt(partesBal[0], 10).toLocaleString('en-US');
      const centavosBal = partesBal[1];
      balanceEl.innerHTML = `${signoBal}$${enterosBal}<span class="text-base sm:text-lg font-bold opacity-75">.${centavosBal}</span>`;
      balanceEl.className = `text-2xl sm:text-3xl font-black tracking-tight tabular-nums font-mono-num ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-coral'}`;

      const tasaAhorro = ingresosMes > 0 ? Math.max(0, ((ingresosMes - gastosMes) / ingresosMes) * 100) : 0;
      document.getElementById('tasaAhorro').textContent = `Tasa de Ahorro: ${tasaAhorro.toFixed(0)}%`;

      const badgeSalud = document.getElementById('badgeSaludFinanciera');
      if (badgeSalud) {
        if (balance > 0 && tasaAhorro >= 15) {
          badgeSalud.innerHTML = '🟢 Excelente';
          badgeSalud.className = 'text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
        } else if (balance >= 0) {
          badgeSalud.innerHTML = '🟡 Estable';
          badgeSalud.className = 'text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
        } else {
          badgeSalud.innerHTML = '🔴 Déficit';
          badgeSalud.className = 'text-[10px] font-black px-2 py-0.5 rounded-full bg-coral/20 text-coral border border-coral/40';
        }
      }

      renderizarSeccionPresupuestos(gastosPorCat);
      renderizarMetasAhorro(fondosAhorroMapa);
      renderizarEstadisticasFinancieras(filtradasMes, fondosAhorroMapa);
      renderizarHistorialFiltrado();
    }