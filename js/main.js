// ---------- Inicialización & SW ----------

    inicializarTema();
    inicializarPestanas();
    inicializarTodosLosCustomSelects();
    actualizarIndicadorConexion();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW err:', err));
      });
    }\n