    // =========================================================================
    const SUPABASE_URL = 'https://xqkbactszenwuxjeymuq.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_7Umv6z1GcKuL5KzPGfIG2w_3hFPivbA';

    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    let transacciones = [];
    let deudas = [];
    let presupuestos = {};
    let metasAhorro = [];
    let filtroTipoActual = '';

    let graficoMultilineaChart = null;
    let activeEstadisticaMetrica = 'all';
    let ultimasFiltradasMes = [];
    let ultimosFondosAhorroMapa = {};
    let tipoConfigCategoriaActual = 'gasto';

    const CATEGORIAS_DEFAULT = {
      ingreso: ['Cliente / Proyecto', 'Sueldo / Salario', 'Ventas', 'Inversión', 'Otros Ingresos'],
      gasto: ['Comida', 'Ocio', 'Pago de Deuda', 'Emergencia', 'Servicios', 'Herramientas / Software', 'Transporte', 'Salud', 'Educación', 'Otros Gastos'],
      ahorro: ['Depositar a Ahorro', 'Retirar / Usar Ahorro']
    };

    const CATEGORIA_ICONOS_DEFAULT = {
      'Cliente / Proyecto': '💼',
      'Sueldo / Salario': '💵',
      'Ventas': '📈',
      'Inversión': '📊',
      'Otros Ingresos': '💰',
      'Comida': '🍔',
      'Ocio': '🎮',
      'Pago de Deuda': '💳',
      'Emergencia': '🚨',
      'Servicios': '💡',
      'Herramientas / Software': '💻',
      'Transporte': '🚗',
      'Salud': '🏥',
      'Educación': '📚',
      'Otros Gastos': '🛒',
      'Depositar a Ahorro': '🏦',
      'Retirar / Usar Ahorro': '📤',
      'Ahorro General': '🪙'
    };

    const categoriaIconosMap = { ...CATEGORIA_ICONOS_DEFAULT };
    const categoriasMap = {
      ingreso: [...CATEGORIAS_DEFAULT.ingreso],
      gasto: [...CATEGORIAS_DEFAULT.gasto],
      ahorro: [...CATEGORIAS_DEFAULT.ahorro]
    };

    function claveCategorias() { return `categorias_presupuesto_${usuarioActualId || 'local'}`; }
    function claveIconos() { return `categoria_iconos_${usuarioActualId || 'local'}`; }

    function cargarCategoriasGuardadas() {
      try {
        const keyCats = claveCategorias();
        const keyIconos = claveIconos();
        const catsGuardadas = localStorage.getItem(keyCats) || localStorage.getItem('categorias_presupuesto_app');
        if (catsGuardadas) {
          const parsed = JSON.parse(catsGuardadas);
          if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.ingreso) && parsed.ingreso.length) categoriasMap.ingreso = parsed.ingreso;
            if (Array.isArray(parsed.gasto) && parsed.gasto.length) categoriasMap.gasto = parsed.gasto;
            if (Array.isArray(parsed.ahorro) && parsed.ahorro.length) categoriasMap.ahorro = parsed.ahorro;
          }
        }
        const iconosGuardados = localStorage.getItem(keyIconos) || localStorage.getItem('categoria_iconos_presupuesto_app');
        if (iconosGuardados) {
          const parsedIconos = JSON.parse(iconosGuardados);
          if (parsedIconos && typeof parsedIconos === 'object') {
            Object.assign(categoriaIconosMap, parsedIconos);
          }
        }
      } catch (err) {
        console.warn('Error al cargar categorías de storage:', err);
      }
    }

    function guardarCategoriasEnStorage() {
      try {
        localStorage.setItem(claveCategorias(), JSON.stringify(categoriasMap));
        localStorage.setItem(claveIconos(), JSON.stringify(categoriaIconosMap));
      } catch (e) {
        console.warn(e);
      }
      guardarCacheLocal();
      sincronizarAjustesUsuarioCloud();
    }

    // Sincronización en la Nube de Preferencias, Categorías, Metas y Presupuestos (Supabase User Metadata)
    async function sincronizarAjustesUsuarioCloud() {
      if (!usuarioActualId || !navigator.onLine) return;
      try {
        await supabaseClient.auth.updateUser({
          data: {
            categoriasMap,
            categoriaIconosMap,
            presupuestos,
            metasAhorro
          }
        });
      } catch (err) {
        console.warn('No se pudieron sincronizar los ajustes en la nube:', err);
      }
    }

    function cargarAjustesDeUserMetadata(user) {
      if (!user || !user.user_metadata) return;
      const meta = user.user_metadata;

      if (meta.categoriasMap && typeof meta.categoriasMap === 'object') {
        if (Array.isArray(meta.categoriasMap.ingreso) && meta.categoriasMap.ingreso.length) categoriasMap.ingreso = meta.categoriasMap.ingreso;
        if (Array.isArray(meta.categoriasMap.gasto) && meta.categoriasMap.gasto.length) categoriasMap.gasto = meta.categoriasMap.gasto;
        if (Array.isArray(meta.categoriasMap.ahorro) && meta.categoriasMap.ahorro.length) categoriasMap.ahorro = meta.categoriasMap.ahorro;
      }
      if (meta.categoriaIconosMap && typeof meta.categoriaIconosMap === 'object') {
        Object.assign(categoriaIconosMap, meta.categoriaIconosMap);
      }
      if (meta.presupuestos && typeof meta.presupuestos === 'object') {
        presupuestos = { ...meta.presupuestos };
      }
      if (Array.isArray(meta.metasAhorro)) {
        metasAhorro = [...meta.metasAhorro];
      }

      guardarCategoriasEnStorage();
      guardarPresupuestosLocales();
      guardarMetasLocales();
    }

    cargarCategoriasGuardadas();

    const tipoSelect = document.getElementById('tipo');
    const categoriaSelect = document.getElementById('categoria');
    const contenedorDeudaSelect = document.getElementById('contenedorDeudaSelect');
    const deudaObjetivoSelect = document.getElementById('deudaObjetivo');
    const contenedorMetaAhorroSelect = document.getElementById('contenedorMetaAhorroSelect');
    const metaAhorroSelect = document.getElementById('metaAhorroSelect');
    const avisoEstado = document.getElementById('avisoEstado');

    let canalRealtime = null;
    let sesionInicializada = false;
    let usuarioActualId = null;

    // ---------- Sistema de Tema Claro / Oscuro ----------

    function inicializarTema() {
      const temaGuardado = localStorage.getItem('tema_presupuesto');
      const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (temaGuardado === 'light') {
        aplicarTema('light');
      } else {
        aplicarTema('dark');
      }
    }

    function aplicarTema(modo) {
      const html = document.documentElement;
      const icono = document.getElementById('iconoTema');
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      const metaStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');

      if (modo === 'dark') {
        html.classList.add('dark');
        html.classList.remove('light');
        if (icono) icono.textContent = '🌙';
        if (metaTheme) metaTheme.setAttribute('content', '#020617');
        if (metaStatus) metaStatus.setAttribute('content', 'black-translucent');
        localStorage.setItem('tema_presupuesto', 'dark');
      } else {
        html.classList.remove('dark');
        html.classList.add('light');
        if (icono) icono.textContent = '☀️';
        if (metaTheme) metaTheme.setAttribute('content', '#f8fafc');
        if (metaStatus) metaStatus.setAttribute('content', 'default');
        localStorage.setItem('tema_presupuesto', 'light');
      }
      if (sesionInicializada) {
        actualizarInterfaz();
      }
    }

    function alternarTema() {
      const esOscuro = document.documentElement.classList.contains('dark');
      aplicarTema(esOscuro ? 'light' : 'dark');
    }

    // ---------- Toasts ----------

    function mostrarToast(mensaje, tipo = 'info', duracion = 3200) {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      
      const estilos = {
        success: 'bg-emerald-600 text-white border-emerald-500/30',
        error: 'bg-coral text-white border-coral-hover',
        info: 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700',
        warning: 'bg-amber-600 text-white border-amber-500'
      };

      const iconos = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
      };

      toast.className = `p-3.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center justify-between gap-3 pointer-events-auto border toast-enter ${estilos[tipo] || estilos.info}`;
      toast.innerHTML = `
        <div class="flex items-center gap-2.5">
          <span class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-black text-[10px]">${iconos[tipo] || '•'}</span>
          <span>${escapeHTML(mensaje)}</span>
        </div>
        <button type="button" class="text-white/70 hover:text-white font-bold text-sm" onclick="this.parentElement.remove()">✕</button>
      `;

      container.appendChild(toast);

      setTimeout(() => {
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
      }, duracion);
    }

    function mostrarToastDeshacer(mensaje, onUndo) {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = 'p-3.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center justify-between gap-3 pointer-events-auto border toast-enter bg-slate-900 dark:bg-slate-800 text-white border-slate-700';

      toast.innerHTML = `
        <div class="flex items-center gap-2.5">
          <span class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-black text-[10px]">🗑️</span>
          <span>${escapeHTML(mensaje)}</span>
        </div>
        <button type="button" class="btn-undo px-3 py-1 rounded-xl bg-azulelectrico hover:bg-azulelectrico-hover text-white text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm">
          Deshacer
        </button>
      `;

      const btnUndo = toast.querySelector('.btn-undo');
      btnUndo.addEventListener('click', () => {
        if (typeof onUndo === 'function') onUndo();
        toast.remove();
      });

      container.appendChild(toast);

      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(-10px)';
          setTimeout(() => toast.remove(), 300);
        }
      }, 5000);
    }

    function mostrarAvisoAuth(mensaje, tipo = 'error') {
      const avisoAuth = document.getElementById('avisoAuth');
      const estilos = {
        error: 'bg-coral/10 border-coral text-coral',
        info: 'bg-azulcielo/10 border-azulcielo text-azulcielo-dark dark:text-azulcielo',
        ok: 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
      };
      avisoAuth.className = `text-xs sm:text-sm p-3.5 rounded-2xl border ${estilos[tipo]}`;
      avisoAuth.textContent = mensaje;
      avisoAuth.classList.remove('hidden');
    }

    function mostrarAviso(mensaje, tipo = 'error') {
      const estilos = {
        error: 'bg-coral/15 border-coral text-coral',
        info: 'bg-azulcielo/15 border-azulcielo text-azulcielo-dark dark:text-azulcielo',
        ok: 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
      };
      avisoEstado.className = `text-xs sm:text-sm p-3.5 rounded-2xl border font-medium ${estilos[tipo]}`;
      avisoEstado.textContent = mensaje;
      avisoEstado.classList.remove('hidden');
      if (tipo !== 'error') {
        setTimeout(() => avisoEstado.classList.add('hidden'), 4000);
      }
    }

    function ocultarAviso() {
      avisoEstado.classList.add('hidden');
    }

    // ---------- Autenticación ----------

    async function iniciarSesion(e) {
      e.preventDefault();
      const btn = document.getElementById('btnIngresar');
      const btnCrear = document.getElementById('btnCrearCuenta');
      btn.disabled = true; btnCrear.disabled = true;
      btn.textContent = 'Ingresando...';

      try {
        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value;
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
          mostrarAvisoAuth(error.message === 'Invalid login credentials'
            ? 'Correo o contraseña incorrectos.'
            : 'Error al iniciar sesión: ' + error.message, 'error');
        } else {
          mostrarToast('¡Sesión iniciada!', 'success');
        }
      } finally {
        btn.disabled = false; btnCrear.disabled = false;
        btn.textContent = 'Ingresar';
      }
    }

    async function crearCuenta() {
      const btn = document.getElementById('btnIngresar');
      const btnCrear = document.getElementById('btnCrearCuenta');
      btn.disabled = true; btnCrear.disabled = true;
      btnCrear.textContent = 'Creando...';

      try {
        const email = document.getElementById('authEmail').value.trim();
        const password = document.getElementById('authPassword').value;

        if (!email || password.length < 6) {
          mostrarAvisoAuth('Ingresa un correo y contraseña de mín. 6 caracteres.', 'error');
          return;
        }

        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
          mostrarAvisoAuth('Error: ' + error.message, 'error');
          return;
        }

        if (data.session) {
          mostrarAvisoAuth('Cuenta creada correctamente.', 'ok');
          mostrarToast('Cuenta creada con éxito', 'success');
        } else {
          mostrarAvisoAuth('Revisa tu correo para confirmar antes de ingresar.', 'info');
        }
      } finally {
        btn.disabled = false; btnCrear.disabled = false;
        btnCrear.textContent = 'Crear cuenta';
      }
    }

    async function cerrarSesion() {
      if (canalRealtime) {
        supabaseClient.removeChannel(canalRealtime);
        canalRealtime = null;
      }
      await supabaseClient.auth.signOut();
      mostrarToast('Sesión cerrada', 'info');
    }

    document.getElementById('formAuth').addEventListener('submit', iniciarSesion);
    document.getElementById('btnCrearCuenta').addEventListener('click', crearCuenta);

    function suscribirRealtime() {
      if (canalRealtime) return;
      canalRealtime = supabaseClient
        .channel('cambios-presupuesto')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transacciones' }, cargarDatosCloud)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'deudas' }, cargarDatosCloud)
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            supabaseClient.removeChannel(canalRealtime);
            canalRealtime = null;
            setTimeout(() => { if (usuarioActualId) suscribirRealtime(); }, 3000);
          }
        });
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && usuarioActualId && navigator.onLine) {
        cargarDatosCloud();
      }
    });

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session) {
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('appContainer').classList.remove('hidden');
        document.getElementById('usuarioEmail').textContent = session.user.email;
        document.getElementById('formAuth').reset();
        document.getElementById('avisoAuth').classList.add('hidden');
        usuarioActualId = session.user.id;

        cargarCategoriasGuardadas();
        cargarPresupuestosYMetasLocales();
        if (session.user) {
          cargarAjustesDeUserMetadata(session.user);
        }

        if (!sesionInicializada) {
          sesionInicializada = true;
          inicializarPestanas();
          if (navigator.onLine) {
            cargarDatosCloud();
            suscribirRealtime();
          } else {
            cargarCacheLocal();
          }
          actualizarIndicadorConexion();
        }
      } else {
        document.getElementById('appContainer').classList.add('hidden');
        document.getElementById('authScreen').classList.remove('hidden');
        sesionInicializada = false;
        usuarioActualId = null;
        transacciones = [];
        deudas = [];
        presupuestos = {};
        metasAhorro = [];
      }
    });

    // ---------- Modo Offline ----------

    function claveCache() { return `presupuesto_cache_${usuarioActualId}`; }
    function claveCola() { return `presupuesto_cola_${usuarioActualId}`; }
    function clavePresupuestos() { return `presupuestos_cat_${usuarioActualId}`; }
    function claveMetas() { return `metas_ahorro_${usuarioActualId}`; }

    function guardarCacheLocal() {
      if (!usuarioActualId) return;
      try {
        localStorage.setItem(claveCache(), JSON.stringify({
          transacciones,
          deudas,
          presupuestos,
          metasAhorro,
          guardadoEn: Date.now()
        }));
      } catch (err) {
        console.error('No se pudo guardar la caché local:', err);
      }
    }

    function cargarCacheLocal() {
      if (!usuarioActualId) return;
      try {
        const crudo = localStorage.getItem(claveCache());
        if (!crudo) return;
        const cache = JSON.parse(crudo);
        transacciones = cache.transacciones || [];
        deudas = cache.deudas || [];
        presupuestos = cache.presupuestos || {};
        metasAhorro = cache.metasAhorro || [];
        actualizarOpcionesCategoria();
        actualizarInterfaz();
      } catch (err) {
        console.error('No se pudo leer la caché local:', err);
      }
    }

    function cargarPresupuestosYMetasLocales() {
      if (!usuarioActualId) return;
      try {
        const pCrudo = localStorage.getItem(clavePresupuestos());
        presupuestos = pCrudo ? JSON.parse(pCrudo) : {};
        const mCrudo = localStorage.getItem(claveMetas());
        metasAhorro = mCrudo ? JSON.parse(mCrudo) : [];
      } catch (e) {
        console.warn(e);
      }
    }

    function guardarPresupuestosLocales() {
      if (!usuarioActualId) return;
      localStorage.setItem(clavePresupuestos(), JSON.stringify(presupuestos));
      guardarCacheLocal();
      sincronizarAjustesUsuarioCloud();
    }

    function guardarMetasLocales() {
      if (!usuarioActualId) return;
      localStorage.setItem(claveMetas(), JSON.stringify(metasAhorro));
      guardarCacheLocal();
      sincronizarAjustesUsuarioCloud();
    }

    function obtenerCola() {
      if (!usuarioActualId) return [];
      try { return JSON.parse(localStorage.getItem(claveCola()) || '[]'); } catch { return []; }
    }

    function guardarCola(cola) {
      if (!usuarioActualId) return;
      localStorage.setItem(claveCola(), JSON.stringify(cola));
    }

    function encolarOperacion(accion, tabla, datos, id) {
      const cola = obtenerCola();
      cola.push({ accion, tabla, datos, id, creadoEn: Date.now() });
      guardarCola(cola);
      actualizarIndicadorConexion();
    }

    function actualizarIndicadorConexion() {
      const el = document.getElementById('indicadorConexion');
      const pendientes = obtenerCola().length;

      if (!navigator.onLine) {
        el.textContent = pendientes > 0 ? `🔴 Offline · ${pendientes} pend.` : '🔴 Offline';
        el.className = 'text-[11px] font-bold px-2 py-0.5 rounded-lg border bg-coral/15 border-coral text-coral';
        el.classList.remove('hidden');
      } else if (pendientes > 0) {
        el.textContent = `🟡 Sincronizando ${pendientes}...`;
        el.className = 'text-[11px] font-bold px-2 py-0.5 rounded-lg border bg-azulcielo/20 border-azulcielo text-azulcielo-dark dark:text-azulcielo';
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }

    async function sincronizarPendientes() {
      if (!usuarioActualId || !navigator.onLine) return;
      let cola = obtenerCola();
      if (cola.length === 0) return;

      actualizarIndicadorConexion();

      for (const op of cola) {
        try {
          if (op.accion === 'insert') {
            const { error } = await supabaseClient.from(op.tabla).insert([op.datos]);
            if (error) throw error;
          } else if (op.accion === 'update') {
            const { error } = await supabaseClient.from(op.tabla).update(op.datos).eq('id', op.id);
            if (error) throw error;
          } else if (op.accion === 'delete') {
            const { error } = await supabaseClient.from(op.tabla).delete().eq('id', op.id);
            if (error) throw error;
          } else if (op.accion === 'delete_by_deuda') {
            const { error } = await supabaseClient.from(op.tabla).delete().eq('deuda_id', op.id);
            if (error) throw error;
          }
          cola = cola.filter(o => o !== op);
          guardarCola(cola);
        } catch (err) {
          console.error(err);
          actualizarIndicadorConexion();
          return;
        }
      }

      mostrarToast('Cambios sincronizados con la nube', 'success');
      actualizarIndicadorConexion();
      await cargarDatosCloud();
      suscribirRealtime();
    }

    window.addEventListener('online', () => {
      actualizarIndicadorConexion();
      sincronizarPendientes();
    });
    window.addEventListener('offline', () => {
      actualizarIndicadorConexion();
      mostrarToast('Modo offline activo', 'info');
    });

    // ---------- Utilidades ----------

    function bloquearBoton(form, texto) {
      const btn = form.querySelector('button[type="submit"]');
      if (!btn) return null;
      btn.dataset.textoOriginal = btn.textContent;
      btn.disabled = true;
      btn.textContent = texto;
      return btn;
    }
    function desbloquearBoton(btn) {
      if (!btn) return;
      btn.disabled = false;
      btn.textContent = btn.dataset.textoOriginal || btn.textContent;
    }

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
    }

    // ---------- Categorías & Selectores ----------

    function actualizarOpcionesCategoria() {
      const tipo = tipoSelect.value;
      categoriaSelect.innerHTML = categoriasMap[tipo].map(cat => `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`).join('');
      evaluarSeleccionesEspeciales();
    }

    function evaluarSeleccionesEspeciales() {
      if (tipoSelect.value === 'gasto' && categoriaSelect.value === 'Pago de Deuda') {
        contenedorDeudaSelect.classList.remove('hidden');
        actualizarSelectDeudas();
      } else {
        contenedorDeudaSelect.classList.add('hidden');
      }

      if (tipoSelect.value === 'ahorro') {
        contenedorMetaAhorroSelect.classList.remove('hidden');
        actualizarSelectMetas();
      } else {
        contenedorMetaAhorroSelect.classList.add('hidden');
      }
    }

    function actualizarSelectDeudas() {
      deudaObjetivoSelect.innerHTML = deudas.length
        ? deudas.map(d => `<option value="${d.id}">${escapeHTML(d.nombre)}</option>`).join('')
        : '<option value="">No hay deudas registradas</option>';
    }

    function actualizarSelectMetas() {
      if (!metasAhorro.length) {
        metaAhorroSelect.innerHTML = '<option value="">Sin meta asignada (Ahorro General)</option>';
        return;
      }
      metaAhorroSelect.innerHTML = '<option value="">Sin meta asignada (Ahorro General)</option>' +
        metasAhorro.map(m => `<option value="${escapeHTML(m.nombre)}">${escapeHTML(m.icono || '🎯')} ${escapeHTML(m.nombre)} (Meta: $${m.objetivo.toFixed(2)})</option>`).join('');
    }

    metaAhorroSelect.addEventListener('change', () => {
      const val = metaAhorroSelect.value;
      if (val) document.getElementById('descripcion').value = val;
    });

    const hoy = new Date();
    document.getElementById('mesFiltro').value = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('fecha').value = hoy.toISOString().split('T')[0];

    tipoSelect.addEventListener('change', actualizarOpcionesCategoria);
    categoriaSelect.addEventListener('change', evaluarSeleccionesEspeciales);
    document.getElementById('formMovimiento').addEventListener('submit', agregarTransaccion);
    document.getElementById('formNuevaDeuda').addEventListener('submit', crearDeuda);
    document.getElementById('formIncrementoDeuda').addEventListener('submit', confirmarIncrementoDeuda);
    document.getElementById('formCategoria').addEventListener('submit', guardarFormCategoria);
    document.getElementById('mesFiltro').addEventListener('change', actualizarInterfaz);

    // Eventos de filtros
    document.getElementById('filtroCategoria').addEventListener('change', renderizarHistorialFiltrado);
    document.getElementById('filtroAlcance').addEventListener('change', renderizarHistorialFiltrado);

    actualizarOpcionesCategoria();

    // ---------- Modales ----------

    function mostrarModalDeuda() { document.getElementById('modalDeuda').classList.remove('hidden'); }
    function ocultarModalDeuda() { document.getElementById('modalDeuda').classList.add('hidden'); }

    function mostrarModalIncremento(id, nombre, montoInicial) {
      document.getElementById('incrementoDeudaId').value = id;
      document.getElementById('incrementoNombre').value = nombre;
      document.getElementById('incrementoMonto').value = montoInicial;
      document.getElementById('modalIncrementoDeuda').classList.remove('hidden');
    }
    function ocultarModalIncremento() { document.getElementById('modalIncrementoDeuda').classList.add('hidden'); }

    function mostrarModalPresupuestos() {
      renderizarInputsPresupuesto();
      document.getElementById('modalPresupuestos').classList.remove('hidden');
    }
    function ocultarModalPresupuestos() { document.getElementById('modalPresupuestos').classList.add('hidden'); }

    function mostrarModalMetaAhorro(metaId = null) {
      const modal = document.getElementById('modalMetaAhorro');
      const form = document.getElementById('formMetaAhorro');
      form.reset();
      
      if (metaId) {
        const m = metasAhorro.find(x => x.id === metaId);
        if (m) {
          document.getElementById('metaId').value = m.id;
          document.getElementById('metaNombre').value = m.nombre;
          document.getElementById('metaMonto').value = m.objetivo;
          document.getElementById('metaIcono').value = m.icono || '🎯';
          document.getElementById('metaFechaLimite').value = m.fechaLimite || '';
          document.getElementById('tituloModalMeta').innerHTML = '<span>✏️</span> Editar Meta';
        }
      } else {
        document.getElementById('metaId').value = '';
        document.getElementById('tituloModalMeta').innerHTML = '<span>🎯</span> Nueva Meta';
      }
      modal.classList.remove('hidden');
    }
    function ocultarModalMetaAhorro() { document.getElementById('modalMetaAhorro').classList.add('hidden'); }

    function ocultarModalEditarMovimiento() {
      document.getElementById('modalEditarMovimiento').classList.add('hidden');
    }

    function abrirModalCrearCategoria() {
      document.getElementById('catEditNombreOriginal').value = '';
      document.getElementById('catNombre').value = '';
      document.getElementById('catIcono').value = '🏷️';
      document.getElementById('catTipo').value = tipoConfigCategoriaActual;
      document.getElementById('tituloModalCategoria').innerHTML = '<span>🏷️</span> Nueva Categoría';
      document.getElementById('modalCategoria').classList.remove('hidden');
    }

    function abrirModalEditarCategoria(tipo, nombre) {
      document.getElementById('catEditNombreOriginal').value = nombre;
      document.getElementById('catNombre').value = nombre;
      document.getElementById('catIcono').value = categoriaIconosMap[nombre] || '🏷️';
      document.getElementById('catTipo').value = tipo;
      document.getElementById('tituloModalCategoria').innerHTML = '<span>✏️</span> Editar Categoría';
      document.getElementById('modalCategoria').classList.remove('hidden');
    }

    function ocultarModalCategoria() {
      document.getElementById('modalCategoria').classList.add('hidden');
    }

    function seleccionarEmojiCat(emoji) {
      document.getElementById('catIcono').value = emoji;
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ocultarModalDeuda();
        ocultarModalIncremento();
        ocultarModalEditarMovimiento();
        ocultarModalPresupuestos();
        ocultarModalMetaAhorro();
        ocultarModalCategoria();
      }
    });

    // ---------- Carga de Datos Cloud ----------

    async function cargarDatosCloud() {
      const { data: transData, error: errTrans } = await supabaseClient
        .from('transacciones')
        .select('*')
        .order('fecha', { ascending: false });

      const { data: deudasData, error: errDeudas } = await supabaseClient
        .from('deudas')
        .select('*');

      if (errTrans || errDeudas) {
        mostrarAviso('Mostrando datos almacenados localmente.', 'info');
        return;
      }

      // Sincronizar ajustes del usuario desde Supabase Auth Metadata (categorías, presupuestos, metas)
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user && user.user_metadata) {
          cargarAjustesDeUserMetadata(user);
        }
      } catch (e) {
        console.warn(e);
      }

      ocultarAviso();
      transacciones = transData || [];
      deudas = (deudasData || []).map(d => ({
        id: d.id,
        nombre: d.nombre,
        montoInicial: parseFloat(d.monto_inicial)
      }));

      guardarCacheLocal();
      actualizarOpcionesCategoria();
      actualizarOpcionesFiltroCategoria();
      actualizarInterfaz();
    }

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
    }

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
    }

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
    }

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
    }

    // ---------- Deudas CRUD ----------

    async function crearDeuda(e) {
      e.preventDefault();
      const form = e.target;
      const btn = bloquearBoton(form, 'Guardando...');

      try {
        const nombreIngresado = document.getElementById('deudaNombre').value.trim();
        const montoIngresado = parseFloat(document.getElementById('deudaMontoInicial').value);

        if (!nombreIngresado || isNaN(montoIngresado) || montoIngresado <= 0) {
          mostrarToast('Ingresa un nombre y monto válido', 'error');
          return;
        }

        if (!navigator.onLine) {
          const tempId = -Date.now();
          deudas.push({ id: tempId, nombre: nombreIngresado, montoInicial: montoIngresado });
          encolarOperacion('insert', 'deudas', { nombre: nombreIngresado, monto_inicial: montoIngresado });
          guardarCacheLocal();
          form.reset();
          ocultarModalDeuda();
          actualizarOpcionesCategoria();
          actualizarInterfaz();
          mostrarToast('Deuda guardada offline', 'info');
          return;
        }

        const existente = deudas.find(d => d.nombre.toLowerCase() === nombreIngresado.toLowerCase());
        let error;

        if (existente) {
          const nuevoMonto = existente.montoInicial + montoIngresado;
          ({ error } = await supabaseClient.from('deudas').update({ monto_inicial: nuevoMonto }).eq('id', existente.id));
        } else {
          ({ error } = await supabaseClient.from('deudas').insert([{ nombre: nombreIngresado, monto_inicial: montoIngresado }]));
        }

        if (error) {
          mostrarToast('Error al guardar deuda', 'error');
          return;
        }

        form.reset();
        ocultarModalDeuda();
        await cargarDatosCloud();
        mostrarToast('Deuda registrada', 'success');
      } finally {
        desbloquearBoton(btn);
      }
    }

    function incrementarDeudaDirecta(id) {
      const deuda = deudas.find(d => d.id === id);
      if (!deuda) return;
      mostrarModalIncremento(id, deuda.nombre, deuda.montoInicial);
    }

    async function confirmarIncrementoDeuda(e) {
      e.preventDefault();
      const form = e.target;
      const btn = bloquearBoton(form, 'Guardando...');

      try {
        const id = parseInt(document.getElementById('incrementoDeudaId').value);
        const nombre = document.getElementById('incrementoNombre').value.trim();
        const val = parseFloat(document.getElementById('incrementoMonto').value);

        if (!nombre || isNaN(val) || val < 0) {
          mostrarToast('Monto inválido', 'error');
          return;
        }

        const cambios = { nombre, monto_inicial: val };

        if (!navigator.onLine) {
          const idx = deudas.findIndex(d => d.id === id);
          if (idx !== -1) {
            deudas[idx].nombre = nombre;
            deudas[idx].montoInicial = val;
          }
          encolarOperacion('update', 'deudas', cambios, id);
          guardarCacheLocal();
          ocultarModalIncremento();
          actualizarInterfaz();
          mostrarToast('Deuda actualizada offline', 'info');
          return;
        }

        const { error } = await supabaseClient.from('deudas').update(cambios).eq('id', id);
        if (error) {
          mostrarToast('Error al actualizar', 'error');
          return;
        }

        ocultarModalIncremento();
        await cargarDatosCloud();
        mostrarToast('Deuda actualizada', 'success');
      } finally {
        desbloquearBoton(btn);
      }
    }

    async function eliminarDeuda(id) {
      if (!confirm('¿Eliminar esta deuda y sus pagos asociados?')) return;

      if (!navigator.onLine) {
        transacciones = transacciones.filter(t => t.deuda_id !== id);
        deudas = deudas.filter(d => d.id !== id);
        encolarOperacion('delete_by_deuda', 'transacciones', null, id);
        encolarOperacion('delete', 'deudas', null, id);
        guardarCacheLocal();
        actualizarInterfaz();
        mostrarToast('Deuda eliminada offline', 'info');
        return;
      }

      await supabaseClient.from('transacciones').delete().eq('deuda_id', id);
      await supabaseClient.from('deudas').delete().eq('id', id);
      await cargarDatosCloud();
      mostrarToast('Deuda eliminada', 'success');
    }

    // ---------- Transacciones CRUD ----------

    async function agregarTransaccion(e) {
      e.preventDefault();
      const form = e.target;
      const btn = bloquearBoton(form, 'Guardando...');

      try {
        const esPagoDeuda = tipoSelect.value === 'gasto' && categoriaSelect.value === 'Pago de Deuda';
        const monto = parseFloat(document.getElementById('monto').value);

        if (esPagoDeuda && (!deudaObjetivoSelect.value || deudaObjetivoSelect.value === '')) {
          mostrarToast('Selecciona una deuda válida', 'error');
          return;
        }

        if (isNaN(monto) || monto <= 0) {
          mostrarToast('Ingresa un monto válido', 'error');
          return;
        }

        const nueva = {
          tipo: tipoSelect.value,
          monto: monto,
          categoria: categoriaSelect.value,
          deuda_id: esPagoDeuda ? parseInt(deudaObjetivoSelect.value) : null,
          descripcion: document.getElementById('descripcion').value.trim(),
          fecha: document.getElementById('fecha').value
        };

        if (!navigator.onLine) {
          const tempId = -Date.now();
          transacciones.unshift({ ...nueva, id: tempId });
          encolarOperacion('insert', 'transacciones', nueva);
          guardarCacheLocal();
          form.reset();
          document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
          actualizarOpcionesCategoria();
          actualizarInterfaz();
          mostrarToast('Guardado localmente', 'info');
          return;
        }

        const { error } = await supabaseClient.from('transacciones').insert([nueva]);
        if (error) {
          mostrarToast('Error al guardar', 'error');
          return;
        }

        form.reset();
        document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
        actualizarOpcionesCategoria();
        await cargarDatosCloud();
        mostrarToast('Movimiento registrado', 'success');
      } finally {
        desbloquearBoton(btn);
      }
    }

    let temporizadorUndoTransaccion = null;
    let transaccionPendienteEliminar = null;

    function eliminarTransaccion(id) {
      const idx = transacciones.findIndex(t => t.id === id);
      if (idx === -1) return;

      const tEliminada = transacciones[idx];
      transaccionPendienteEliminar = { transaccion: tEliminada, index: idx };

      // Remover visualmente y actualizar interfaz al instante
      transacciones.splice(idx, 1);
      guardarCacheLocal();
      actualizarInterfaz();

      // Mostrar Toast interactivo con opción de Deshacer durante 5 segundos
      mostrarToastDeshacer('Transacción eliminada', () => {
        if (transaccionPendienteEliminar && transaccionPendienteEliminar.transaccion.id === id) {
          if (temporizadorUndoTransaccion) clearTimeout(temporizadorUndoTransaccion);
          transacciones.splice(transaccionPendienteEliminar.index, 0, transaccionPendienteEliminar.transaccion);
          transaccionPendienteEliminar = null;
          guardarCacheLocal();
          actualizarInterfaz();
          mostrarToast('Transacción restaurada', 'success');
        }
      });

      if (temporizadorUndoTransaccion) clearTimeout(temporizadorUndoTransaccion);
      temporizadorUndoTransaccion = setTimeout(async () => {
        if (transaccionPendienteEliminar && transaccionPendienteEliminar.transaccion.id === id) {
          transaccionPendienteEliminar = null;
          if (!navigator.onLine) {
            encolarOperacion('delete', 'transacciones', null, id);
          } else {
            await supabaseClient.from('transacciones').delete().eq('id', id);
          }
        }
      }, 5000);
    }

    function duplicarTransaccion(id) {
      const t = transacciones.find(x => x.id === id);
      if (!t) return;
      cambiarPestana('registrar');
      tipoSelect.value = t.tipo;
      actualizarOpcionesCategoria();
      categoriaSelect.value = t.categoria;
      document.getElementById('monto').value = parseFloat(t.monto);
      document.getElementById('descripcion').value = t.descripcion || '';
      document.getElementById('fecha').value = new Date().toISOString().split('T')[0];
      evaluarSeleccionesEspeciales();
      if (t.deuda_id && deudaObjetivoSelect) deudaObjetivoSelect.value = t.deuda_id;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      mostrarToast('Datos cargados para duplicar', 'info');
    }

    function sumarMontoRapido(val) {
      const input = document.getElementById('monto');
      const actual = parseFloat(input.value) || 0;
      input.value = (actual + val).toFixed(2);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function limpiarMontoRapido() {
      const input = document.getElementById('monto');
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function exportarHistorialCSV() {
      const mesSeleccionado = document.getElementById('mesFiltro').value;
      const categoria = document.getElementById('filtroCategoria').value;
      const alcance = document.getElementById('filtroAlcance').value;

      const filtradas = transacciones.filter(t => {
        if (alcance === 'mes' && !t.fecha.startsWith(mesSeleccionado)) return false;
        if (filtroTipoActual && t.tipo !== filtroTipoActual) return false;
        if (categoria && t.categoria !== categoria) return false;
        return true;
      });

      if (!filtradas.length) {
        mostrarToast('No hay movimientos para exportar con los filtros actuales', 'info');
        return;
      }

      let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
      csvContent += 'Fecha,Tipo,Categoría,Descripción,Monto\n';

      filtradas.forEach(t => {
        const fila = [
          `"${t.fecha}"`,
          `"${t.tipo.toUpperCase()}"`,
          `"${(t.categoria || '').replace(/"/g, '""')}"`,
          `"${(t.descripcion || '').replace(/"/g, '""')}"`,
          parseFloat(t.monto).toFixed(2)
        ].join(',');
        csvContent += fila + '\n';
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `reporte_presupuesto_${mesSeleccionado || 'general'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      mostrarToast('Reporte CSV descargado con éxito', 'success');
    }

    // ---------- Edición ----------

    const editTipoSelect = document.getElementById('editTipo');
    const editCategoriaSelect = document.getElementById('editCategoria');
    const editContenedorDeudaSelect = document.getElementById('editContenedorDeudaSelect');
    const editDeudaObjetivoSelect = document.getElementById('editDeudaObjetivo');

    function actualizarOpcionesCategoriaEdit(categoriaActual) {
      const tipo = editTipoSelect.value;
      editCategoriaSelect.innerHTML = categoriasMap[tipo].map(cat => `<option value="${escapeHTML(cat)}">${escapeHTML(cat)}</option>`).join('');
      if (categoriaActual && categoriasMap[tipo].includes(categoriaActual)) {
        editCategoriaSelect.value = categoriaActual;
      }
      evaluarSeleccionDeudaEdit();
    }

    function evaluarSeleccionDeudaEdit(deudaIdActual) {
      if (editTipoSelect.value === 'gasto' && editCategoriaSelect.value === 'Pago de Deuda') {
        editContenedorDeudaSelect.classList.remove('hidden');
        editDeudaObjetivoSelect.innerHTML = deudas.length
          ? deudas.map(d => `<option value="${d.id}">${escapeHTML(d.nombre)}</option>`).join('')
          : '<option value="">Sin deudas</option>';
        if (deudaIdActual) editDeudaObjetivoSelect.value = deudaIdActual;
      } else {
        editContenedorDeudaSelect.classList.add('hidden');
      }
    }

    editTipoSelect.addEventListener('change', () => actualizarOpcionesCategoriaEdit());
    editCategoriaSelect.addEventListener('change', () => evaluarSeleccionDeudaEdit());

    function editarTransaccion(id) {
      const t = transacciones.find(t => t.id === id);
      if (!t) return;

      document.getElementById('editId').value = t.id;
      editTipoSelect.value = t.tipo;
      document.getElementById('editMonto').value = parseFloat(t.monto);
      document.getElementById('editDescripcion').value = t.descripcion || '';
      document.getElementById('editFecha').value = t.fecha;

      actualizarOpcionesCategoriaEdit(t.categoria);
      evaluarSeleccionDeudaEdit(t.deuda_id);

      document.getElementById('modalEditarMovimiento').classList.remove('hidden');
    }

    async function confirmarEditarMovimiento(e) {
      e.preventDefault();
      const form = e.target;
      const btn = bloquearBoton(form, 'Guardando...');

      try {
        const id = parseInt(document.getElementById('editId').value);
        const esPagoDeuda = editTipoSelect.value === 'gasto' && editCategoriaSelect.value === 'Pago de Deuda';
        const monto = parseFloat(document.getElementById('editMonto').value);

        if (isNaN(monto) || monto <= 0) {
          mostrarToast('Monto inválido', 'error');
          return;
        }

        const cambios = {
          tipo: editTipoSelect.value,
          monto,
          categoria: editCategoriaSelect.value,
          deuda_id: esPagoDeuda ? parseInt(editDeudaObjetivoSelect.value) : null,
          descripcion: document.getElementById('editDescripcion').value.trim(),
          fecha: document.getElementById('editFecha').value
        };

        if (!navigator.onLine) {
          const idx = transacciones.findIndex(t => t.id === id);
          if (idx !== -1) transacciones[idx] = { ...transacciones[idx], ...cambios };
          encolarOperacion('update', 'transacciones', cambios, id);
          guardarCacheLocal();
          ocultarModalEditarMovimiento();
          actualizarInterfaz();
          mostrarToast('Actualizado offline', 'info');
          return;
        }

        await supabaseClient.from('transacciones').update(cambios).eq('id', id);
        ocultarModalEditarMovimiento();
        await cargarDatosCloud();
        mostrarToast('Movimiento actualizado', 'success');
      } finally {
        desbloquearBoton(btn);
      }
    }

    document.getElementById('formEditarMovimiento').addEventListener('submit', confirmarEditarMovimiento);

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

    // ---------- Inicialización & SW ----------

    inicializarTema();
    inicializarPestanas();
    inicializarTodosLosCustomSelects();
    actualizarIndicadorConexion();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW err:', err));
      });
    }