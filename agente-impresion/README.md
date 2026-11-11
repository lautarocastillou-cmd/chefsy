# Chefsy Print Agent

Agente local para imprimir comandas **sin el diálogo de impresión** del navegador.

Es un proceso muy chico para Windows que:

- escucha **solo en `127.0.0.1:9187`**;
- recibe los bytes ESC/POS que ya genera Chefsy;
- los manda al spooler de Windows con formato `RAW`;
- no usa Node, Electron ni un navegador en segundo plano;
- no necesita permisos de administrador;
- arranca solo al iniciar sesión.

Consumo aproximado: un único proceso oculto, sin interfaz, de pocos MB de RAM.

---

## Requisitos

- Windows 10 u 11.
- .NET Framework 4.8 (viene instalado en Windows 10/11 actualizados).
- La impresora térmica instalada en Windows con un driver que acepte ESC/POS `RAW`.
  La mayoría de drivers POS-80, Xprinter, Epson, Unnion, etc. lo hacen.
- Chrome o Edge para usar Chefsy (el agente no depende del navegador, pero la app sí).

No instales el agente con una consola abierta como administrador: debe quedar en el
perfil del usuario que va a imprimir. Si lo instalás como admin, el arranque automático
queda en el perfil del administrador y no en el tuyo.

---

## Instalación

1. Abrí PowerShell en esta carpeta:

   ```powershell
   cd C:\ruta\a\chefsy\agente-impresion
   ```

2. Ejecutá el instalador:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\Instalar-AgenteImpresion.ps1
   ```

   Si querés indicar la impresora exacta de Windows:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\Instalar-AgenteImpresion.ps1 -Impresora "POS-80"
   ```

   Si no indicás ninguna, el agente usa la impresora predeterminada de Windows.

3. El instalador muestra un **token**. También lo deja en:

   ```text
   %LOCALAPPDATA%\ChefsyPrintAgent\LEEME.txt
   ```

4. En Chefsy entrá a **Configuración → Impresión → Agente local**:

   - activá el interruptor;
   - URL: `http://127.0.0.1:9187` (o el puerto que hayas elegido);
   - pegá el token;
   - tocá **Probar agente**.

5. Activá **Imprimir comandas automáticamente** si querés que las comandas salgan solas.

6. La primera vez, Chrome o Edge pueden pedir permiso para acceder a la red local.
   Elegí **Permitir**. Es el mismo permiso que usan otras apps de impresión locales.

---

## Cómo funciona

```text
Chefsy (navegador)
      |
      |  GET  /health       estado, impresora y cola
      |  GET  /config       tipografía guardada
      |  POST /config       guarda la tipografía
      |  GET  /diagnostico  chequeos de Windows y spooler
      |  POST /update       descarga y aplica una versión nueva
      |  POST /print        bytes ESC/POS + token
      v
ChefsyPrintAgent.exe
      |
      |  winspool.drv, datatype RAW
      v
Impresora térmica de Windows
```

El agente no arma el ticket: recibe exactamente los mismos bytes ESC/POS que Chefsy
ya usa para la impresión directa por USB, Serial, HID o Bluetooth. Por eso conserva
el formato, el corte de papel y el buzzer.

La tipografía (fuente, tamaño, interletrado e interlineado) se genera en el
navegador y se guarda en el agente con **Configuración → Impresión → Tipografía →
Sincronizar con el agente**. El agente la persiste en `tipografia.json` y la
informa en `/health` y `/config`, así sobrevive a limpiar el navegador y se puede
recuperar con **Traer del agente**.

La prioridad de impresión en la app es:

1. impresora directa conectada por WebUSB / Web Serial / WebHID / Bluetooth;
2. **agente local** si está activado (aunque falte configurar, no cae al diálogo);
3. diálogo del navegador/Windows como último respaldo.

Si el agente está activado y no responde, Chefsy **no abre el diálogo**: muestra un
aviso de error. Eso evita que aparezcan ventanas de impresión inesperadas en cocina.

---

## Configuración del agente

Archivo:

```text
%LOCALAPPDATA%\ChefsyPrintAgent\config.ini
```

Contenido:

```ini
puerto=9187
token=EL_TOKEN_GENERADO
impresora=
origen_actualizacion=https://chefsy.xyz
```

- `puerto`: puerto local. Si lo cambiás, actualizá también la URL en Chefsy.
- `token`: secreto que debe coincidir con el que pegás en Chefsy. No lo compartas.
- `impresora`: nombre exacto de la impresora de Windows. Si queda vacío, usa la
  impresora predeterminada.
- `origen_actualizacion`: de dónde descarga las actualizaciones. Por defecto
  `https://chefsy.xyz`. Solo acepta HTTPS (o `http://127.0.0.1`/`localhost` para
  pruebas). No lo cambies salvo que sepas lo que hacés.

Después de editar `config.ini`, reiniciá el agente:

```powershell
Get-Process ChefsyPrintAgent -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Process "$env:LOCALAPPDATA\ChefsyPrintAgent\ChefsyPrintAgent.exe"
```

Para ver qué impresora está usando:

```powershell
$token = (Get-Content "$env:LOCALAPPDATA\ChefsyPrintAgent\config.ini" |
  Select-String '^token=').Line.Replace('token=', '').Trim()

Invoke-RestMethod `
  -Uri "http://127.0.0.1:9187/health" `
  -Headers @{ "X-Chefsy-Token" = $token }
```

Respuesta esperada (v1.3.0):

```json
{
  "ok": true,
  "agente": true,
  "version": "1.3.0",
  "printer": "POS-80",
  "defaultPrinter": true,
  "puerto": "USB001",
  "driver": "POS-80",
  "trabajos": 0,
  "estado": "Lista",
  "offline": false,
  "papelAgotado": false,
  "atasco": false,
  "port": 9187,
  "uptimeSegundos": 120,
  "tipografia": { "configurada": true, "actualizada": "2026-11-10T22:44:46-03:00" }
}
```

Si no hay impresora predeterminada, `ok` será `false` y el campo `error` explica
el problema. El agente sigue instalado; solo hay que configurar la impresora.

### Tipografía (`tipografia.json`)

El archivo vive junto a `config.ini` y lo administra Chefsy. No hace falta editarlo
a mano: el agente recorta valores fuera de rango y rechaza JSON inválido con 400.

```json
{
  "comanda": { "fuente": "A", "ancho": 1, "alto": 1, "interletrado": 1, "interlineado": 8, "espacioItems": 1 },
  "ticket":  { "fuente": "A", "ancho": 1, "alto": 1, "interletrado": 1, "interlineado": 8, "espacioItems": 0 }
}
```

- `fuente`: `A` (12×24 dots, estándar) o `B` (9×17 dots, compacta).
- `ancho` / `alto`: multiplicador de 1 a 4.
- `interletrado`: dots extra entre caracteres (0 a 8).
- `interlineado`: dots extra entre líneas (0 a 60). El total impreso es
  alto de la fuente + este valor (por defecto 24 + 8 = 32 dots).
- `espacioItems`: líneas en blanco entre productos (0 a 3).

Para ver el diagnóstico completo que usa el solucionador de Chefsy:

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:9187/diagnostico" `
  -Headers @{ "X-Chefsy-Token" = $token } | ConvertTo-Json -Depth 5
```

### Actualización automática

Desde **Configuración → Impresión → Agente local → Actualizaciones** la web
compara la versión del agente con la publicada en
`https://chefsy.xyz/agente/version.json` y ofrece el botón **Actualizar**.

El flujo es:

1. La web llama a `POST /update` (con token). No manda ninguna URL.
2. El agente descarga el manifiesto y el `.exe` desde `origen_actualizacion`.
3. Verifica que la versión sea mayor, que el archivo empiece con `MZ` y que el
   **SHA-256** coincida con el manifiesto.
4. Guarda el actual en `ChefsyPrintAgent.exe.bak`, escribe `actualizar.cmd`,
   se cierra y el `.cmd` copia el nuevo binario y lo vuelve a iniciar.
5. `config.ini` y `tipografia.json` se conservan.

Si algo falla, el agente responde con el detalle (hash inválido, origen no
permitido, etc.) y **no reemplaza** nada. El backup queda para restaurar a mano:

```powershell
Get-Process ChefsyPrintAgent -ErrorAction SilentlyContinue | Stop-Process -Force
Copy-Item "$env:LOCALAPPDATA\ChefsyPrintAgent\ChefsyPrintAgent.exe.bak" `
          "$env:LOCALAPPDATA\ChefsyPrintAgent\ChefsyPrintAgent.exe" -Force
Start-Process "$env:LOCALAPPDATA\ChefsyPrintAgent\ChefsyPrintAgent.exe"
```

> [!IMPORTANT]
> La **primera** instalación de v1.3.0 (o superior) debe hacerse con
> `Instalar-AgenteImpresion.ps1`: las versiones anteriores no tienen `/update`.
> A partir de ahí, todas las actualizaciones se hacen desde la web.
>
> Para publicar una versión nueva: subí el número en `ChefsyPrintAgent.cs` y
> ejecutá `scripts/publicar-agente.ps1`. Ese script compila, calcula el SHA-256
> y actualiza `public/agente/version.json`. Después, commit y deploy.

---

## Solución de problemas

### Usar el solucionador de Chefsy

En **Configuración → Impresión → Agente local** tocá **Solucionar problemas**.
El solucionador:

1. verifica que la página pueda acceder a la red local;
2. valida la URL y reintenta la conexión (hasta 3 intentos, con `localhost` y
   `127.0.0.1` como alternativas);
3. comprueba el token (distingue 401 de “no responde”);
4. pide al agente su diagnóstico de impresora, cola, spooler, disco y tipografía;
5. muestra cada chequeo con detalle, solución sugerida, opción de copiar el
   informe y de mandar un ticket de prueba.

### Chefsy dice "No se pudo conectar con el agente local"

1. Verificá que el proceso esté corriendo:

   ```powershell
   Get-Process ChefsyPrintAgent
   ```

2. Probá el health con el token (comando de arriba).
3. Revisá el log:

   ```text
   %LOCALAPPDATA%\ChefsyPrintAgent\agent.log
   ```

4. Si Chrome/Edge bloqueó la red local, revisá el permiso del sitio. En Chrome:
   ícono del candado → Configuración del sitio → **Acceso a red local** → Permitir.
   Cerrá y abrí la pestaña si el navegador ya había bloqueado el pedido.

### El agente responde pero la impresora no imprime

- Confirmá que la impresora imprime desde Windows (Configuración → Impresoras).
- Verificá que el nombre en `config.ini` sea exacto.
- El driver debe aceptar ESC/POS `RAW`. Si tu driver no lo acepta, probá con el
  driver genérico POS/ESC-POS del fabricante.
- Probá **Imprimir Ticket Prueba** desde Chefsy.
- Revisá `agent.log`: si dice `No se pudo abrir la impresora`, el nombre no coincide.
  Si dice `Windows no pudo iniciar el trabajo`, el driver o la cola están bloqueados.

### El puerto 9187 está ocupado

Cambiá `puerto` en `config.ini`, reiniciá el agente y actualizá la URL en Chefsy.
También podés reinstalar con otro puerto:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Instalar-AgenteImpresion.ps1 -Puerto 9188
```

### Quiero actualizar el agente

Ejecutá el instalador otra vez. Conserva el token, el puerto y la impresora
configurada. Si querés cambiar la impresora, pasá `-Impresora "NOMBRE"`.

### Quiero que arranque antes de iniciar sesión

No es necesario para el uso normal. El agente corre en la sesión del usuario para
poder acceder a las impresoras de ese usuario. Si lo convertís en servicio de Windows,
tenés que revisar permisos de impresora y sesión; no está soportado por este instalador.

---

## Seguridad

- Escucha **solo en loopback** (`127.0.0.1`), no en la red local.
- Exige el header `X-Chefsy-Token` en `/health` y `/print`.
- El token se genera al azar con `RNGCryptoServiceProvider`.
- No acepta conexiones remotas, no abre firewall y no usa HTTPS porque el tráfico
  nunca sale de la PC.
- `config.ini` contiene el token: no lo subas a git ni lo compartas.
- Cualquier persona con acceso a tu sesión de Windows puede leer el token y el log.

---

## Desinstalación

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Desinstalar-AgenteImpresion.ps1
```

Borra el proceso, el arranque automático y la carpeta
`%LOCALAPPDATA%\ChefsyPrintAgent`. Después desactivá el agente en Chefsy.

---

## Detalles técnicos

- Código: `ChefsyPrintAgent.cs`
- Compilador: `csc.exe` de .NET Framework 4.8, incluido en Windows.
- Salida: `%LOCALAPPDATA%\ChefsyPrintAgent\ChefsyPrintAgent.exe` (~30 KB).
- Endpoints (todos requieren `X-Chefsy-Token` salvo `OPTIONS`):
  - `GET /health` → estado, impresora, puerto, cola, estado del spooler y tipografía.
  - `GET /config` → tipografía guardada.
  - `POST /config` → guarda la tipografía (JSON, máx. 32 KB).
  - `GET /diagnostico` → chequeos detallados de Windows, impresora y disco.
  - `POST /update` → descarga y aplica una actualización verificada.
  - `POST /print` → cuerpo binario ESC/POS; header opcional `X-Chefsy-Printer`.
  - `OPTIONS` → preflight CORS / Private Network Access.
- Respuestas JSON y `Access-Control-Allow-Private-Network: true` para que Chrome
  y Edge permitan el pedido desde una página HTTPS a `127.0.0.1`.
- La app incluye `http://127.0.0.1:*` en el `connect-src` de su CSP
  (`next.config.mjs`). Si se despliega otra copia de Chefsy, esa regla también
  tiene que estar presente o el navegador bloqueará el agente antes del CORS.
- Un solo hilo atiende los pedidos en orden. No hay pool de threads ni dependencias.
