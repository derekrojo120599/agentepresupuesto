// =========================================================================
// CONFIGURACIÓN GLOBAL & CONSTANTES DE LA APLICACIÓN
// =========================================================================

const SUPABASE_URL = "https://xqkbactszenwuxjeymuq.supabase.co";
const SUPABASE_KEY = "sb_publishable_7Umv6z1GcKuL5KzPGfIG2w_3hFPivbA";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const CATEGORIAS_DEFAULT = {
  ingreso: [
    "Cliente / Proyecto",
    "Sueldo / Salario",
    "Ventas",
    "Inversión",
    "Otros Ingresos",
  ],
  gasto: [
    "Comida",
    "Ocio",
    "Pago de Deuda",
    "Emergencia",
    "Servicios",
    "Herramientas / Software",
    "Transporte",
    "Salud",
    "Educación",
    "Otros Gastos",
  ],
  ahorro: ["Depositar a Ahorro", "Retirar / Usar Ahorro"],
};

const CATEGORIA_ICONOS_DEFAULT = {
  "Cliente / Proyecto": "💼",
  "Sueldo / Salario": "💵",
  Ventas: "📈",
  Inversión: "📊",
  "Otros Ingresos": "💰",
  Comida: "🍔",
  Ocio: "🎮",
  "Pago de Deuda": "💳",
  Emergencia: "🚨",
  Servicios: "💡",
  "Herramientas / Software": "💻",
  Transporte: "🚗",
  Salud: "🏥",
  Educación: "📚",
  "Otros Gastos": "📦",
  "Depositar a Ahorro": "🏦",
  "Retirar / Usar Ahorro": "💸",
};

const selectTitlesMap = {
  tipo: { title: "Tipo de Operación", icon: "🔄" },
  categoria: { title: "Seleccionar Categoría", icon: "🏷️" },
  deudaObjetivo: { title: "Deuda a Pagar", icon: "💳" },
  metaAhorroSelect: { title: "Meta de Ahorro Asociada", icon: "🎯" },
  origenAhorro: { title: "Origen del Dinero", icon: "🏦" },
  filtroCategoria: { title: "Filtrar por Categoría", icon: "🔍" },
  filtroAlcance: { title: "Período del Historial", icon: "📅" },
  metaIcono: { title: "Ícono del Objetivo", icon: "🎨" },
  editTipo: { title: "Tipo de Operación", icon: "🔄" },
  editCategoria: { title: "Seleccionar Categoría", icon: "🏷️" },
  editDeudaObjetivo: { title: "Deuda a Pagar", icon: "💳" },
  editOrigenAhorro: { title: "Origen del Dinero", icon: "🏦" },
  catTipo: { title: "Tipo de Operación", icon: "🔄" },
};
