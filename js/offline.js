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