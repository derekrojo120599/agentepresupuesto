// ---------- Sistema de Navegación por Pestañas ----------

    let pestanaActual = 'resumen';

    function cambiarPestana(tabName) {
      pestanaActual = tabName;
      localStorage.setItem('pestana_activa_presupuesto', tabName);

      const pestanas = ['resumen', 'registrar', 'historial', 'presupuestos', 'metas', 'deudas', 'configuracion'];
      pestanas.forEach(p => {
        const idContent = `tabContent${p.charAt(0).toUpperCase() + p.slice(1)}`;
        const idNav = `navTab${p.charAt(0).toUpperCase() + p.slice(1)}`;
        const el = document.getElementById(idContent);
        const btn = document.getElementById(idNav);

        if (el) {
          if (p === tabName) {
            el.classList.remove('hidden');
          } else {
            el.classList.add('hidden');
          }
        }

        if (btn) {
          if (p === tabName) {
            btn.className = 'tab-btn flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-azulelectrico text-white shadow-md shadow-azulelectrico/25';
          } else {
            btn.className = 'tab-btn flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition text-slate-600 dark:text-azulcielo hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-crema';
          }
        }

        const idMobileNav = `mobileNav${p.charAt(0).toUpperCase() + p.slice(1)}`;
        const mobileBtn = document.getElementById(idMobileNav);
        if (mobileBtn) {
          if (p === tabName) {
            mobileBtn.className = 'mobile-nav-btn flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition text-azulelectrico font-bold flex-1 bg-azulelectrico/10 dark:bg-azulelectrico/20 cursor-pointer';
          } else {
            mobileBtn.className = 'mobile-nav-btn flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition text-slate-500 dark:text-azulcielo font-semibold flex-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer';
          }
        }
      });

      const btnHeaderConfig = document.getElementById('btnHeaderConfiguracion');
      if (btnHeaderConfig) {
        if (tabName === 'configuracion') {
          btnHeaderConfig.className = 'p-2.5 rounded-xl border border-azulelectrico bg-azulelectrico text-white shadow-sm shadow-azulelectrico/30 transition active:scale-95 cursor-pointer';
        } else {
          btnHeaderConfig.className = 'p-2.5 rounded-xl border border-slate-200 dark:border-azulcielo/30 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-azulcielo hover:bg-slate-200 dark:hover:bg-slate-800 transition active:scale-95 shadow-sm cursor-pointer';
        }
      }

      if (tabName === 'resumen') {
        setTimeout(() => {
          if (graficoMultilineaChart) graficoMultilineaChart.resize();
        }, 50);
      } else if (tabName === 'configuracion') {
        renderizarConfiguracionCategorias();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    function inicializarPestanas() {
      const guardada = localStorage.getItem('pestana_activa_presupuesto');
      const pestanasValidas = ['resumen', 'registrar', 'historial', 'presupuestos', 'metas', 'deudas', 'configuracion'];
      if (guardada && pestanasValidas.includes(guardada)) {
        cambiarPestana(guardada);
      } else {
        cambiarPestana('resumen');
      }
    }

    function abrirRegistroMobile() {
      cambiarPestana('registrar');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        const m = document.getElementById('monto');
        if (m) m.focus();
      }, 150);
    }\n