const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const startMarker = '    // =========================================================================\n    // CONFIGURACIÓN DE LA APLICACIÓN';
const startIndex = html.indexOf('// =========================================================================\r\n    // CONFIGURACIÓN DE LA APLICACIÓN');

if (startIndex === -1) {
    console.log("Could not find start marker via exact match. Using fallback.");
}

const lines = html.split(/\r?\n/);
let startLineIndex = -1;
let endLineIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// CONFIGURACIÓN DE LA APLICACIÓN')) {
    // find <script> before this
    for (let j = i; j >= 0; j--) {
      if (lines[j].includes('<script>')) {
        startLineIndex = j;
        break;
      }
    }
    break;
  }
}

for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].includes('</script>')) {
    endLineIndex = i;
    break;
  }
}

if (startLineIndex > -1 && endLineIndex > -1) {
  const scripts = [
    '  <script src="js/globals.js"></script>',
    '  <script src="js/theme.js"></script>',
    '  <script src="js/ui.js"></script>',
    '  <script src="js/auth.js"></script>',
    '  <script src="js/offline.js"></script>',
    '  <script src="js/utils.js"></script>',
    '  <script src="js/navigation.js"></script>',
    '  <script src="js/selectors.js"></script>',
    '  <script src="js/modals.js"></script>',
    '  <script src="js/data.js"></script>',
    '  <script src="js/presupuestos.js"></script>',
    '  <script src="js/metas.js"></script>',
    '  <script src="js/configCategorias.js"></script>',
    '  <script src="js/filtros.js"></script>',
    '  <script src="js/deudas.js"></script>',
    '  <script src="js/transacciones.js"></script>',
    '  <script src="js/edicion.js"></script>',
    '  <script src="js/render.js"></script>',
    '  <script src="js/stats.js"></script>',
    '  <script src="js/main.js"></script>'
  ].join('\n');

  const newHtml = lines.slice(0, startLineIndex).join('\n') + '\n' + scripts + '\n' + lines.slice(endLineIndex + 1).join('\n');
  fs.writeFileSync('index.html', newHtml);
  console.log('HTML updated! Replaced lines from', startLineIndex, 'to', endLineIndex);
} else {
  console.log('Could not find start/end lines', startLineIndex, endLineIndex);
}