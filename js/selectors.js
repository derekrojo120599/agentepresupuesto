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

    function inicializarEventosGenerales() {
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
    }