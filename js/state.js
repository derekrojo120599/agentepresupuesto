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

// ---------- Conversión Dinámica Multimoneda con Tasa Viva ----------

function obtenerMontoEnUSD(t, tasaViva = null) {
  if (!t) return 0;
  const tasa = tasaViva || tasaBinanceCompra;
  if (t.moneda === "BS" && t.monto_original && tasa && tasa > 0) {
    return Math.round((parseFloat(t.monto_original) / tasa) * 100) / 100;
  }
  return parseFloat(t.monto) || 0;
}
