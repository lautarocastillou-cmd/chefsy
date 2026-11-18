# AGENTS.md — Agente POS

Instrucciones para agentes de IA (y humanos) que trabajen en este proyecto.

## Regla de oro de UI

**Toda la interfaz del panel usa EXCLUSIVAMENTE componentes shadcn/ui.**

- Los componentes viven en `panel/src/components/ui/` (Button, Card, Badge,
  Input, Label, Select, Switch, Separator...). Si falta uno, se agrega al
  catálogo (`npx shadcn@latest add <componente>` dentro de `panel/`) y se usa.
- **Prohibido**: CSS vanilla para componentes nuevos, HTML con estilos
  ad-hoc, librerías de UI alternativas (Bootstrap, MUI, etc.), íconos que no
  sean `lucide-react`, toasts que no sean `sonner`.
- El tema vive en `panel/src/globals.css` (tokens shadcn con acento naranja
  Chefsy). Cambiar estilos = cambiar tokens, no romper el catálogo.
- Íconos: solo `lucide-react`.

## Arquitectura del panel

1. El panel es una app React + Vite en `agente-pos/panel/`.
2. `npm run build` (dentro de `panel/`) produce **un solo HTML** (plugin
   `vite-plugin-singlefile`) y ejecuta `generar-panel.mjs`, que regenera
   `src/PanelHtml.cs` (el HTML se embebe en el ejecutable como string
   verbatim, duplicando comillas).
3. **No editar `src/PanelHtml.cs` a mano**: es generado. Cualquier cambio de
   UI se hace en `panel/src/` y se regenera.
4. Tras regenerar, recompilar el agente (ver `publicar.ps1` o README).

## Otros acuerdos

- El ejecutable es C# puro (.NET Framework 4, `csc` del sistema), sin
  dependencias externas; el costo de Node es solo de build del panel.
- Puerto por defecto 9191 (deja libre el 9187 del agente de Chefsy).
- Toda interacción con el spooler sin permisos; la elevación solo via
  `Sanador` (modo `--sanar` con UAC).
- El token del agente nunca se incrusta en la página servida a un `Origin`
  externo (ver guardia en `PanelHtml.Servir`).
