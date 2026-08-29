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