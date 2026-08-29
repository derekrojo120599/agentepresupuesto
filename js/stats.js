// ---------- Estadísticas Financieras: Multilínea y Desglose ----------

    function seleccionarMetricaEstadistica(metrica) {
      activeEstadisticaMetrica = metrica;
      actualizarEstilosBotonesMetrica();
      renderizarEstadisticasFinancieras(ultimasFiltradasMes, ultimosFondosAhorroMapa);
    }

    function actualizarEstilosBotonesMetrica() {
      const btnAll = document.getElementById('btnMetricaAll');
      const btnInc = document.getElementById('btnMetricaIncomes');
      const btnExp = document.getElementById('btnMetricaExpenses');
      const btnSav = document.getElementById('btnMetricaSavings');

      if (!btnAll || !btnInc || !btnExp || !btnSav) return;

      const baseInactive = 'metrica-chip px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-azulcielo/20 cursor-pointer';

      btnAll.className = activeEstadisticaMetrica === 'all'
        ? 'metrica-chip px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-azulelectrico text-white shadow-sm shadow-azulelectrico/30 cursor-pointer'
        : `${baseInactive} hover:bg-azulelectrico/10 hover:text-azulelectrico`;

      btnInc.className = activeEstadisticaMetrica === 'incomes'
        ? 'metrica-chip px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-cyan-500 text-white shadow-sm shadow-cyan-500/30 cursor-pointer'
        : `${baseInactive} hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400`;

      btnExp.className = activeEstadisticaMetrica === 'expenses'
        ? 'metrica-chip px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-rose-500 text-white shadow-sm shadow-rose-500/30 cursor-pointer'
        : `${baseInactive} hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400`;

      btnSav.className = activeEstadisticaMetrica === 'savings'
        ? 'metrica-chip px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 bg-amber-500 text-white shadow-sm shadow-amber-500/30 cursor-pointer'
        : `${baseInactive} hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400`;
    }

    function renderizarEstadisticasFinancieras(filtradasMes, fondosMapa) {
      ultimasFiltradasMes = filtradasMes || [];
      ultimosFondosAhorroMapa = fondosMapa || {};

      actualizarEstilosBotonesMetrica();

      const esOscuro = document.documentElement.classList.contains('dark');
      const colorTexto = esOscuro ? '#84AFFB' : '#475569';
      const colorGrid = esOscuro ? 'rgba(132, 175, 251, 0.12)' : 'rgba(148, 163, 184, 0.18)';

      const mesSeleccionado = document.getElementById('mesFiltro')?.value || new Date().toISOString().slice(0, 7);
      const [anoStr, mesStr] = mesSeleccionado.split('-');
      const anoNum = parseInt(anoStr, 10) || new Date().getFullYear();
      const mesNum = parseInt(mesStr, 10) || (new Date().getMonth() + 1);

      const diasEnMes = new Date(anoNum, mesNum, 0).getDate();
      const labelsDias = Array.from({ length: diasEnMes }, (_, i) => String(i + 1));

      const ingresosPorDia = new Array(diasEnMes).fill(0);
      const gastosPorDia = new Array(diasEnMes).fill(0);
      const ahorrosPorDia = new Array(diasEnMes).fill(0);

      let totalIngresos = 0;
      let totalGastos = 0;
      let totalAhorros = 0;

      const ingresosMap = {};
      const gastosMap = {};
      const ahorrosMap = {};

      ultimasFiltradasMes.forEach(t => {
        const montoNum = parseFloat(t.monto) || 0;
        const diaIndex = parseInt((t.fecha || '').split('-')[2], 10) - 1;

        if (t.tipo === 'ingreso') {
          totalIngresos += montoNum;
          ingresosMap[t.categoria] = (ingresosMap[t.categoria] || 0) + montoNum;
          if (diaIndex >= 0 && diaIndex < diasEnMes) ingresosPorDia[diaIndex] += montoNum;
        } else if (t.tipo === 'gasto') {
          totalGastos += montoNum;
          gastosMap[t.categoria] = (gastosMap[t.categoria] || 0) + montoNum;
          if (diaIndex >= 0 && diaIndex < diasEnMes) gastosPorDia[diaIndex] += montoNum;
        } else if (t.tipo === 'ahorro') {
          const fondo = (t.descripcion || 'Ahorro General').trim();
          const cat = (t.categoria || '').toLowerCase();
          if (cat.includes('retirar') || cat.includes('usar') || cat.includes('retiro')) {
            totalAhorros -= montoNum;
            ahorrosMap[fondo] = (ahorrosMap[fondo] || 0) - montoNum;
            if (diaIndex >= 0 && diaIndex < diasEnMes) ahorrosPorDia[diaIndex] -= montoNum;
          } else {
            totalAhorros += montoNum;
            ahorrosMap[fondo] = (ahorrosMap[fondo] || 0) + montoNum;
            if (diaIndex >= 0 && diaIndex < diasEnMes) ahorrosPorDia[diaIndex] += montoNum;
          }
        }
      });

      // Actualizar insignias de monto en la cabecera
      const bIng = document.getElementById('badgeMontoIngresos');
      const bGas = document.getElementById('badgeMontoGastos');
      const bSav = document.getElementById('badgeMontoAhorros');
      if (bIng) bIng.textContent = `($${totalIngresos.toLocaleString('en-US', { maximumFractionDigits: 0 })})`;
      if (bGas) bGas.textContent = `($${totalGastos.toLocaleString('en-US', { maximumFractionDigits: 0 })})`;
      if (bSav) bSav.textContent = `($${Math.max(0, totalAhorros).toLocaleString('en-US', { maximumFractionDigits: 0 })})`;

      // Configurar datasets con atenuación y resaltado reactivo
      const isAll = activeEstadisticaMetrica === 'all';
      const isIncomes = activeEstadisticaMetrica === 'incomes';
      const isExpenses = activeEstadisticaMetrica === 'expenses';
      const isSavings = activeEstadisticaMetrica === 'savings';

      const canvasMultilinea = document.getElementById('graficoMultilinea');
      if (!canvasMultilinea) return;
      const ctx = canvasMultilinea.getContext('2d');

      // Degradados verticales de área
      const gradIngresos = ctx.createLinearGradient(0, 0, 0, 240);
      gradIngresos.addColorStop(0, 'rgba(6, 182, 212, 0.28)');
      gradIngresos.addColorStop(1, 'rgba(6, 182, 212, 0.0)');

      const gradGastos = ctx.createLinearGradient(0, 0, 0, 240);
      gradGastos.addColorStop(0, 'rgba(244, 63, 94, 0.28)');
      gradGastos.addColorStop(1, 'rgba(244, 63, 94, 0.0)');

      const gradAhorros = ctx.createLinearGradient(0, 0, 0, 240);
      gradAhorros.addColorStop(0, 'rgba(234, 179, 8, 0.28)');
      gradAhorros.addColorStop(1, 'rgba(234, 179, 8, 0.0)');

      const datasets = [
        {
          label: 'Ingresos',
          data: ingresosPorDia,
          borderColor: (isIncomes || isAll) ? '#06b6d4' : (esOscuro ? 'rgba(6, 182, 212, 0.15)' : 'rgba(6, 182, 212, 0.22)'),
          backgroundColor: (isIncomes || isAll) ? gradIngresos : 'transparent',
          borderWidth: isIncomes ? 3.5 : (isAll ? 2.5 : 1.5),
          pointRadius: isIncomes ? 4.5 : (isAll ? 3 : 0),
          pointHoverRadius: 7,
          pointHoverBorderWidth: 4,
          pointHoverBorderColor: 'rgba(6, 182, 212, 0.35)',
          pointBackgroundColor: '#06b6d4',
          pointBorderColor: esOscuro ? '#0f172a' : '#ffffff',
          pointBorderWidth: 2,
          fill: isIncomes || isAll,
          tension: 0.35
        },
        {
          label: 'Gastos',
          data: gastosPorDia,
          borderColor: (isExpenses || isAll) ? '#f43f5e' : (esOscuro ? 'rgba(244, 63, 94, 0.15)' : 'rgba(244, 63, 94, 0.22)'),
          backgroundColor: (isExpenses || isAll) ? gradGastos : 'transparent',
          borderWidth: isExpenses ? 3.5 : (isAll ? 2.5 : 1.5),
          pointRadius: isExpenses ? 4.5 : (isAll ? 3 : 0),
          pointHoverRadius: 7,
          pointHoverBorderWidth: 4,
          pointHoverBorderColor: 'rgba(244, 63, 94, 0.35)',
          pointBackgroundColor: '#f43f5e',
          pointBorderColor: esOscuro ? '#0f172a' : '#ffffff',
          pointBorderWidth: 2,
          fill: isExpenses || isAll,
          tension: 0.35
        },
        {
          label: 'Ahorro',
          data: ahorrosPorDia,
          borderColor: (isSavings || isAll) ? '#eab308' : (esOscuro ? 'rgba(234, 179, 8, 0.15)' : 'rgba(234, 179, 8, 0.22)'),
          backgroundColor: (isSavings || isAll) ? gradAhorros : 'transparent',
          borderWidth: isSavings ? 3.5 : (isAll ? 2.5 : 1.5),
          pointRadius: isSavings ? 4.5 : (isAll ? 3 : 0),
          pointHoverRadius: 7,
          pointHoverBorderWidth: 4,
          pointHoverBorderColor: 'rgba(234, 179, 8, 0.35)',
          pointBackgroundColor: '#eab308',
          pointBorderColor: esOscuro ? '#0f172a' : '#ffffff',
          pointBorderWidth: 2,
          fill: isSavings || isAll,
          tension: 0.35
        }
      ];

      if (graficoMultilineaChart) graficoMultilineaChart.destroy();
      graficoMultilineaChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labelsDias,
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          onClick: (e, elements) => {
            if (elements && elements.length > 0) {
              const datasetIdx = elements[0].datasetIndex;
              if (datasetIdx === 0) seleccionarMetricaEstadistica(activeEstadisticaMetrica === 'incomes' ? 'all' : 'incomes');
              else if (datasetIdx === 1) seleccionarMetricaEstadistica(activeEstadisticaMetrica === 'expenses' ? 'all' : 'expenses');
              else if (datasetIdx === 2) seleccionarMetricaEstadistica(activeEstadisticaMetrica === 'savings' ? 'all' : 'savings');
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: esOscuro ? '#0f172a' : '#ffffff',
              titleColor: esOscuro ? '#FFE1D7' : '#0f172a',
              bodyColor: esOscuro ? '#84AFFB' : '#0259DD',
              borderColor: esOscuro ? 'rgba(132, 175, 251, 0.25)' : 'rgba(2, 89, 221, 0.2)',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 12,
              boxPadding: 4,
              usePointStyle: true,
              titleFont: { size: 11, weight: 'bold', family: 'system-ui, sans-serif' },
              bodyFont: { size: 10.5, weight: '600', family: 'system-ui, sans-serif' },
              callbacks: {
                title: (items) => `Día ${items[0]?.label || ''} del mes`,
                label: (ctx) => {
                  const val = Number(ctx.raw || 0);
                  const lbl = ctx.dataset.label || '';
                  const icon = lbl === 'Ingresos' ? '🟢' : (lbl === 'Gastos' ? '🔴' : '🟡');
                  return ` ${icon} ${lbl}: $${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: {
                color: colorTexto,
                font: { size: 9.5, weight: 'bold', family: 'system-ui, sans-serif' },
                maxTicksLimit: 12,
                callback: function(val) {
                  return 'D' + this.getLabelForValue(val);
                }
              },
              grid: { color: colorGrid }
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: colorTexto,
                font: { size: 9, weight: '600', family: 'system-ui, sans-serif' },
                callback: (val) => '$' + Number(val).toLocaleString('en-US')
              },
              grid: { color: colorGrid }
            }
          }
        }
      });

      // Renderizar desglose reactivo de categorías inferior
      renderizarListaCategoriasDesglose(ingresosMap, gastosMap, ahorrosMap, totalIngresos, totalGastos, totalAhorros);
    }

    function renderizarListaCategoriasDesglose(ingresosMap, gastosMap, ahorrosMap, totalIng, totalGas, totalAho) {
      const contenedor = document.getElementById('listaDesgloseCategorias');
      const titulo = document.getElementById('tituloDesgloseCategorias');
      const conteo = document.getElementById('conteoCategoriasDesglose');
      if (!contenedor || !titulo || !conteo) return;

      let items = [];

      if (activeEstadisticaMetrica === 'incomes') {
        titulo.innerHTML = '<span>🟢</span> Desglose de Ingresos';
        items = Object.entries(ingresosMap)
          .filter(([_, m]) => m > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, monto]) => {
            const pct = totalIng > 0 ? ((monto / totalIng) * 100).toFixed(1) : '0.0';
            return {
              categoria: cat,
              tipo: 'Ingreso',
              monto,
              porcentaje: pct,
              icono: categoriaIconosMap[cat] || '💼',
              badgeClase: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
              barraClase: 'bg-cyan-500'
            };
          });
      } else if (activeEstadisticaMetrica === 'expenses') {
        titulo.innerHTML = '<span>🔴</span> Desglose de Gastos';
        items = Object.entries(gastosMap)
          .filter(([_, m]) => m > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([cat, monto]) => {
            const pct = totalGas > 0 ? ((monto / totalGas) * 100).toFixed(1) : '0.0';
            return {
              categoria: cat,
              tipo: 'Gasto',
              monto,
              porcentaje: pct,
              icono: categoriaIconosMap[cat] || '🛒',
              badgeClase: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
              barraClase: 'bg-rose-500'
            };
          });
      } else if (activeEstadisticaMetrica === 'savings') {
        titulo.innerHTML = '<span>🟡</span> Fondos y Metas de Ahorro';
        const totalAhoPositivo = Math.max(1, totalAho);
        items = Object.entries(ahorrosMap)
          .filter(([_, m]) => m > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([fondo, monto]) => {
            const pct = totalAho > 0 ? ((monto / totalAhoPositivo) * 100).toFixed(1) : '0.0';
            const metaAsoc = metasAhorro.find(m => m.nombre === fondo);
            return {
              categoria: fondo,
              tipo: 'Fondo de Ahorro',
              monto,
              porcentaje: pct,
              icono: metaAsoc?.icono || categoriaIconosMap[fondo] || '🏦',
              badgeClase: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
              barraClase: 'bg-amber-500'
            };
          });
      } else {
        titulo.innerHTML = '<span>📊</span> Resumen Combinado de Categorías';
        const flujoTotal = totalIng + totalGas + Math.max(0, totalAho);

        const listIng = Object.entries(ingresosMap).filter(([_, m]) => m > 0).map(([cat, monto]) => ({
          categoria: cat,
          tipo: 'Ingreso',
          monto,
          porcentaje: flujoTotal > 0 ? ((monto / flujoTotal) * 100).toFixed(1) : '0.0',
          icono: categoriaIconosMap[cat] || '💼',
          badgeClase: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
          barraClase: 'bg-cyan-500'
        }));

        const listGas = Object.entries(gastosMap).filter(([_, m]) => m > 0).map(([cat, monto]) => ({
          categoria: cat,
          tipo: 'Gasto',
          monto,
          porcentaje: flujoTotal > 0 ? ((monto / flujoTotal) * 100).toFixed(1) : '0.0',
          icono: categoriaIconosMap[cat] || '🛒',
          badgeClase: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
          barraClase: 'bg-rose-500'
        }));

        const listAho = Object.entries(ahorrosMap).filter(([_, m]) => m > 0).map(([fondo, monto]) => {
          const metaAsoc = metasAhorro.find(m => m.nombre === fondo);
          return {
            categoria: fondo,
            tipo: 'Ahorro',
            monto,
            porcentaje: flujoTotal > 0 ? ((monto / flujoTotal) * 100).toFixed(1) : '0.0',
            icono: metaAsoc?.icono || categoriaIconosMap[fondo] || '🏦',
            badgeClase: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
            barraClase: 'bg-amber-500'
          };
        });

        items = [...listIng, ...listGas, ...listAho].sort((a, b) => b.monto - a.monto);
      }

      conteo.textContent = `${items.length} elemento(s)`;

      if (items.length === 0) {
        contenedor.innerHTML = `
          <div class="col-span-full p-6 text-center text-slate-400 dark:text-azulcielo text-xs border border-dashed border-slate-200 dark:border-azulcielo/20 rounded-2xl">
            <span>🔍</span> No hay movimientos registrados para esta métrica en el período seleccionado.
          </div>
        `;
        return;
      }

      contenedor.innerHTML = items.map(item => `
        <div class="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/70 dark:border-azulcielo/15 space-y-2 hover:border-azulelectrico/40 transition">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-azulcielo/20 flex items-center justify-center text-sm shrink-0 shadow-sm">
                ${escapeHTML(item.icono)}
              </span>
              <div class="min-w-0">
                <p class="text-xs sm:text-sm font-bold text-slate-800 dark:text-crema truncate">${escapeHTML(item.categoria)}</p>
                <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-md ${item.badgeClase}">${escapeHTML(item.tipo)}</span>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs sm:text-sm font-black text-slate-900 dark:text-crema">$${item.monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p class="text-[10px] font-bold text-slate-400 dark:text-azulcielo">${item.porcentaje}%</p>
            </div>
          </div>
          <div class="w-full bg-slate-200/80 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500 ${item.barraClase}" style="width: ${Math.min(100, Math.max(2, parseFloat(item.porcentaje)))}%"></div>
          </div>
        </div>
      `).join('');
    }

    // Prevenir menú contextual de navegador en toques largos sobre botones y tarjetas
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest('button, select, canvas, .chip-tipo, [onclick], .custom-select-trigger, .custom-select-option-item')) {
        e.preventDefault();
      }
    });