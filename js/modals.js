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
    });\n