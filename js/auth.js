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

    function inicializarAutenticacion() {
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
    }