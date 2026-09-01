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
let transaccionesPendientesEliminar = new Set();
let canalRealtime = null;

// Categorías activas mapeadas (combinación de default + personalizadas)
let categoriasMap = { ...CATEGORIAS_DEFAULT };
let categoriaIconosMap = { ...CATEGORIA_ICONOS_DEFAULT };
