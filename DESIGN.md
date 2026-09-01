# DESIGN.md — Sistema de Diseño

## 1. Paleta de Colores (Tokens)

### Colores de Identidad y Estado
- **Azul Eléctrico (Primario / Énfasis):**
  - Base: `#0259DD` (`rgb(2, 89, 221)`)
  - Hover: `#0249B5`
  - Superficie / Fondo suave: `rgba(2, 89, 221, 0.15)`
- **Azul Cielo (Secundario / Acentos / Modo Oscuro):**
  - Base: `#84AFFB` (`rgb(132, 175, 251)`)
  - Claro: `#B3CDFC`
  - Oscuro: `#5A90E8`
- **Coral (Pérdidas / Gastos / Deudas / Alertas):**
  - Base: `#FF6648` (`rgb(255, 102, 72)`)
  - Hover: `#E05337`
  - Superficie / Fondo suave: `rgba(255, 102, 72, 0.15)`
- **Verde Esmeralda (Ingresos / Positivo / Metas Cumplidas):**
  - Base: `#10B981` (Emerald 500)
  - Superficie / Fondo suave: `rgba(16, 185, 129, 0.15)`
- **Crema (Texto y Resaltados en Oscuro):**
  - Base: `#FFE1D7`

### Superficies y Fondos
- **Modo Oscuro (Predeterminado):**
  - Fondo de Aplicación: `#020617` (Slate 950)
  - Superficies de Tarjeta / Contenedores: `#0F172A` (Slate 900)
  - Bordes / Separadores: `rgba(132, 175, 251, 0.20)`
- **Modo Claro:**
  - Fondo de Aplicación: `#F8FAFC` (Slate 50)
  - Superficies de Tarjeta / Contenedores: `#FFFFFF`
  - Bordes / Separadores: `#E2E8F0` (Slate 200)

## 2. Tipografía y Jerarquía Numérica
- **Fuente Principal:** `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Números Financieros:** `tabular-nums` / `font-mono-num` (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`) para evitar bailes visuales en cifras decimales.
- **Jerarquía:**
  - Balance Hero: `text-2xl sm:text-3xl font-black`
  - Métricas Secundarias: `text-xl sm:text-2xl font-black`
  - Títulos de Sección: `text-sm sm:text-base font-bold`
  - Etiquetas / Metadatos: `text-[11px] sm:text-xs font-semibold`

## 3. Radios y Espaciado (Layout)
- **Radios de Tarjetas:** `rounded-2xl` (16px) en móvil, `rounded-3xl` (24px) en desktop.
- **Radios de Botones / Inputs:** `rounded-xl` (12px) o `rounded-2xl` (16px).
- **Dock Móvil:** `fixed bottom-0`, con respeto estricto de `safe-area-inset-bottom` (`safe-bottom`).
- **Regla contra "Nested Cards":** No encapsular tarjetas dentro de tarjetas con el mismo borde o sombra. Utilizar espaciado, divisores tenues (`border-slate-100 dark:border-azulcielo/15`) o cambios de tono sutiles en lugar de múltiples capas elevadas.

## 4. Accesibilidad y Contraste (WCAG AA)
- Contraste mínimo de 4.5:1 para texto regular y 3:1 para texto grande o badges.
- En modo oscuro, evitar textos en `#000000` o `#475569` sobre fondos oscuros; utilizar `text-slate-100`, `text-crema` o `text-azulcielo`.
- En modo claro, usar `text-slate-900`, `text-slate-700` o `text-slate-500`.

## 5. Componentes Táctiles
- **Botones y Selectores:** Mínimo 44px de área táctil interactiva (`min-h-[44px]` o `p-3`).
- **Custom Select / Bottom Sheet:** Reemplaza el selector nativo del sistema operativo en móvil para una experiencia fluida, rápida y coherente con el tema de la aplicación.
