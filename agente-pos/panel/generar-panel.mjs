// Genera agente-pos/src/PanelHtml.cs a partir del build del panel.
// El HTML producido por vite (un solo archivo, JS+CSS inline) se embebe
// como string literal verbatim de C#: cada comilla doble se duplica para
// respetar la sintaxis de @"...".
// Ejecutar despues de `vite build` (npm run build ya lo encadena).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const panelDist = path.join(aqui, 'dist', 'index.html');
const destino = path.join(aqui, '..', 'src', 'PanelHtml.cs');

if (!fs.existsSync(panelDist)) {
  console.error('No existe ' + panelDist + '. Corré primero: npm run build (vite).');
  process.exit(1);
}

const html = fs.readFileSync(panelDist, 'utf8');
const escapado = html.replace(/"/g, '""');

// El marcador __REEMPLAZO__ no debe aparecer en el HTML del panel; si
// apareciera, el .Replace del servidor lo romperia. Verificacion barata:
if (!html.includes('__TOKEN__') || !html.includes('__PUERTO__')) {
  console.error('El HTML compilado no contiene los marcadores __TOKEN__/__PUERTO__. Revisá panel/index.html.');
  process.exit(1);
}

const fuente = `using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Sockets;

namespace AgentePOS
{
    // ─────────────────────────────────────────────────────────────────────
    // ARCHIVO GENERADO AUTOMATICAMENTE — no editar a mano.
    // Panel construido con React + shadcn/ui (agente-pos/panel) y embebido
    // como un solo HTML. Para regenerar: npm run build en agente-pos/panel.
    // ─────────────────────────────────────────────────────────────────────
    internal static class PanelHtml
    {
        public static void Servir(NetworkStream stream, Dictionary<string, string> headers)
        {
            string origin = null;
            if (headers != null)
            {
                headers.TryGetValue("Origin", out origin);
            }

            var propio = "http://127.0.0.1:" + Estado.Puerto.ToString(CultureInfo.InvariantCulture);
            var incrustarToken = string.IsNullOrEmpty(origin)
                || string.Equals(origin.TrimEnd('/'), propio, StringComparison.OrdinalIgnoreCase);

            var html = Plantilla
                .Replace("__TOKEN__", incrustarToken ? Estado.Token : "")
                .Replace("__PUERTO__", Estado.Puerto.ToString(CultureInfo.InvariantCulture));

            ServidorHttp.ResponderHtml(stream, 200, html, headers);
        }

        private const string Plantilla = @"${escapado}";
    }
}
`;

fs.writeFileSync(destino, fuente, 'utf8');

const kb = (fuente.length / 1024).toFixed(1);
console.log('PanelHtml.cs generado (' + kb + ' KB). Recompilá el agente.');
