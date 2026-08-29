// ---------- Toasts ----------

    function mostrarToast(mensaje, tipo = 'info', duracion = 3200) {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      
      const estilos = {
        success: 'bg-emerald-600 text-white border-emerald-500/30',
        error: 'bg-coral text-white border-coral-hover',
        info: 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700',
        warning: 'bg-amber-600 text-white border-amber-500'
      };

      const iconos = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
      };

      toast.className = `p-3.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center justify-between gap-3 pointer-events-auto border toast-enter ${estilos[tipo] || estilos.info}`;
      toast.innerHTML = `
        <div class="flex items-center gap-2.5">
          <span class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-black text-[10px]">${iconos[tipo] || '•'}</span>
          <span>${escapeHTML(mensaje)}</span>
        </div>
        <button type="button" class="text-white/70 hover:text-white font-bold text-sm" onclick="this.parentElement.remove()">✕</button>
      `;

      container.appendChild(toast);

      setTimeout(() => {
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
      }, duracion);
    }

    function mostrarToastDeshacer(mensaje, onUndo) {
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = 'p-3.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center justify-between gap-3 pointer-events-auto border toast-enter bg-slate-900 dark:bg-slate-800 text-white border-slate-700';

      toast.innerHTML = `
        <div class="flex items-center gap-2.5">
          <span class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center font-black text-[10px]">🗑️</span>
          <span>${escapeHTML(mensaje)}</span>
        </div>
        <button type="button" class="btn-undo px-3 py-1 rounded-xl bg-azulelectrico hover:bg-azulelectrico-hover text-white text-xs font-bold transition active:scale-95 cursor-pointer shadow-sm">
          Deshacer
        </button>
      `;

      const btnUndo = toast.querySelector('.btn-undo');
      btnUndo.addEventListener('click', () => {
        if (typeof onUndo === 'function') onUndo();
        toast.remove();
      });

      container.appendChild(toast);

      setTimeout(() => {
        if (toast.parentNode) {
          toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(-10px)';
          setTimeout(() => toast.remove(), 300);
        }
      }, 5000);
    }

    function mostrarAvisoAuth(mensaje, tipo = 'error') {
      const avisoAuth = document.getElementById('avisoAuth');
      const estilos = {
        error: 'bg-coral/10 border-coral text-coral',
        info: 'bg-azulcielo/10 border-azulcielo text-azulcielo-dark dark:text-azulcielo',
        ok: 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
      };
      avisoAuth.className = `text-xs sm:text-sm p-3.5 rounded-2xl border ${estilos[tipo]}`;
      avisoAuth.textContent = mensaje;
      avisoAuth.classList.remove('hidden');
    }

    function mostrarAviso(mensaje, tipo = 'error') {
      const estilos = {
        error: 'bg-coral/15 border-coral text-coral',
        info: 'bg-azulcielo/15 border-azulcielo text-azulcielo-dark dark:text-azulcielo',
        ok: 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
      };
      avisoEstado.className = `text-xs sm:text-sm p-3.5 rounded-2xl border font-medium ${estilos[tipo]}`;
      avisoEstado.textContent = mensaje;
      avisoEstado.classList.remove('hidden');
      if (tipo !== 'error') {
        setTimeout(() => avisoEstado.classList.add('hidden'), 4000);
      }
    }

    function ocultarAviso() {
      avisoEstado.classList.add('hidden');
    }\n