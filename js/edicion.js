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

    document.getElementById('formEditarMovimiento').addEventListener('submit', confirmarEditarMovimiento);\n