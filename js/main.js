// ---------- Inicialización & SW ----------

    inicializarTema();
    inicializarPestanas();
    inicializarEventosGenerales();
    actualizarIndicadorConexion();
    inicializarAutenticacion();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW err:', err));
      });
    }