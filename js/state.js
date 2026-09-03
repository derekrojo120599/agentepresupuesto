// =========================================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// =========================================================================

let transacciones = [];
let deudas = [];
let presupuestos = {};
let metasAhorro = [];
let categoriasPersonalizadas = {};
let filtroTipoActual = "";

let tasaBinanceCompra = null;
let fuenteTasaActual = "Binance P2P";
let monedaIngresoActual = "USD"; // "USD" o "BS"

let graficoMultilineaChart = null;
let activeEstadisticaMetrica = "all";
let ultimasFiltradasMes = [];
let ultimosFondosAhorroMapa = {};
let tipoConfigCategoriaActual = "gasto";

let usuarioActualId = null;
let sesionInicializada = false;
let esRecuperandoClave = false;
let nombrePerfilUsuario = "";
let transaccionesPendientesEliminar = new Set();
let canalRealtime = null;

// Categorías activas mapeadas (combinación de default + personalizadas)
let categoriasMap = { ...CATEGORIAS_DEFAULT };
let categoriaIconosMap = { ...CATEGORIA_ICONOS_DEFAULT };

// ---------- Funciones Utilitarias de Cálculo Cambiario Multimoneda ----------

function obtenerMesActualISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function obtenerMontoUSD(t) {
  if (!t) return 0;
  const montoBase = parseFloat(t.monto) || 0;
  if (t.moneda !== "BS" || !t.monto_original) {
    return montoBase;
  }

  const mesTx = (t.fecha || "").substring(0, 7);
  const mesEnCurso = obtenerMesActualISO();

  // Si la transacción es del mes en curso, se recalcula dinámicamente con la tasa viva actual
  if (mesTx === mesEnCurso && tasaBinanceCompra && tasaBinanceCompra > 0) {
    return Math.round((parseFloat(t.monto_original) / tasaBinanceCompra) * 100) / 100;
  }

  // Para meses pasados o cerrados, se mantiene el valor histórico congelado
  return montoBase;
}
