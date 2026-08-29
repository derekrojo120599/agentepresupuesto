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
    }\n