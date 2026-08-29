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
    }\n