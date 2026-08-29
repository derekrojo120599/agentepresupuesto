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
    let usuarioActualId = null;\n