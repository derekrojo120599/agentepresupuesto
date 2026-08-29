// ---------- Utilidades ----------

    function bloquearBoton(form, texto) {
      const btn = form.querySelector('button[type="submit"]');
      if (!btn) return null;
      btn.dataset.textoOriginal = btn.textContent;
      btn.disabled = true;
      btn.textContent = texto;
      return btn;
    }
    function desbloquearBoton(btn) {
      if (!btn) return;
      btn.disabled = false;
      btn.textContent = btn.dataset.textoOriginal || btn.textContent;
    }