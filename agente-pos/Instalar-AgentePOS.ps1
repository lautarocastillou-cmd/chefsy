# Instalador de Agente POS - agente universal de impresion para comanderas.
# Compila un ejecutable portable con el compilador que ya trae Windows,
# lo deja en %LOCALAPPDATA%\AgentePOS y lo arranca al iniciar sesion.
# No requiere permisos de administrador y no usa Node.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\Instalar-AgentePOS.ps1
#   powershell -ExecutionPolicy Bypass -File .\Instalar-AgentePOS.ps1 -Puerto 9192 -Impresora "POS-80"

[CmdletBinding()]
param(
    [int]$Puerto = 0,
    [string]$Impresora = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$installDir = Join-Path $env:LOCALAPPDATA "AgentePOS"
$exePath = Join-Path $installDir "AgentePOS.exe"
$configPath = Join-Path $installDir "config.ini"
$logPath = Join-Path $installDir "agent.log"
$srcDir = Join-Path $scriptDir "src"

function Fallar([string]$texto) {
    Write-Host ""
    Write-Host $texto -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Agente POS - instalador" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan

if (-not (Test-Path $srcDir)) {
    Fallar "No se encontro la carpeta src junto a este instalador."
}

$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (-not (Test-Path $csc)) {
    Fallar "No se encontro el compilador de .NET Framework 4. Instala .NET Framework 4.8 y volve a intentar."
}

New-Item -ItemType Directory -Force -Path $installDir | Out-Null

# Conservar puerto, token e impresora si ya habia una instalacion.
$puertoActual = 0
$tokenActual = ""
$impresoraActual = ""
if (Test-Path $configPath) {
    foreach ($linea in Get-Content $configPath) {
        if ($linea -match '^\s*puerto\s*=\s*(\d+)\s*$') { $puertoActual = [int]$Matches[1] }
        if ($linea -match '^\s*token\s*=\s*(.+)\s*$') { $tokenActual = $Matches[1].Trim() }
        if ($linea -match '^\s*impresora\s*=\s*(.*)\s*$') { $impresoraActual = $Matches[1].Trim() }
    }
}

if ($Puerto -eq 0) {
    if ($puertoActual -gt 0) { $Puerto = $puertoActual } else { $Puerto = 9191 }
}
if ($Puerto -lt 1 -or $Puerto -gt 65535) {
    Fallar "El puerto indicado no es valido."
}
if ([string]::IsNullOrWhiteSpace($Impresora)) {
    $Impresora = $impresoraActual
}

# Detener una instancia anterior antes de reemplazar el ejecutable.
Get-Process -Name "AgentePOS" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

Write-Host "Compilando agente..."
$fuentes = Get-ChildItem (Join-Path $srcDir "*.cs") | ForEach-Object FullName
& $csc /nologo /target:winexe /optimize+ /r:System.dll /r:System.Core.dll /r:System.Web.Extensions.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll /out:"$exePath" $fuentes
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $exePath)) {
    Fallar "No se pudo compilar el agente. Revisa que Windows tenga .NET Framework 4.8."
}

# Generar token nuevo solo si no existe uno.
$token = $tokenActual
if ([string]::IsNullOrWhiteSpace($token)) {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $token = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

$lineas = @(
    "# Configuracion de Agente POS",
    "# No compartas este archivo: contiene el token de acceso.",
    "puerto=$Puerto",
    "token=$token",
    "impresora=$Impresora",
    "auto_sanar=1"
)
Set-Content -Path $configPath -Value $lineas -Encoding UTF8

# Arranque automatico al iniciar sesion, sin admin.
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup "Agente POS.lnk"
$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exePath
$shortcut.WorkingDirectory = $installDir
$shortcut.WindowStyle = 1
$shortcut.Description = "Agente POS"
$shortcut.Save()

try {
    Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $exePath; CurrentDirectory = $installDir } | Out-Null
} catch {
    Fallar "El agente se compilo pero no se pudo iniciar: $($_.Exception.Message)"
}

# Verificar que responda.
$estado = $null
$errorPrueba = ""
for ($i = 0; $i -lt 12; $i++) {
    Start-Sleep -Milliseconds 250
    try {
        $estado = Invoke-RestMethod -Uri "http://127.0.0.1:$Puerto/health" -Headers @{ "X-Pos-Token" = $token } -TimeoutSec 2
        break
    } catch {
        $errorPrueba = $_.Exception.Message
    }
}

$leeme = @(
    "AGENTE POS",
    "",
    "Puerto: $Puerto",
    "Token: $token",
    "Impresora configurada: $(if ([string]::IsNullOrWhiteSpace($Impresora)) { 'predeterminada de Windows (cambiala desde el panel)' } else { $Impresora })",
    "",
    "PANEL: doble clic en el icono de la bandeja, o abri http://127.0.0.1:$Puerto/panel",
    "Desde el panel: elegis impresora, imprimis prueba, sanas el servicio y ajustas tipografia.",
    "",
    "API universal (para conectar cualquier sistema POS):",
    "  POST http://127.0.0.1:$Puerto/print   con bytes crudos (ESC/POS) y header X-Pos-Token: $token",
    "  GET  http://127.0.0.1:$Puerto/health  para verificar estado",
    "",
    "Si la impresion falla con 'El servidor RPC no esta disponible', el agente",
    "puede reparar el servicio Cola de impresion solo: acepta el permiso de",
    "administrador cuando aparezca.",
    "",
    "Log: $logPath",
    "Para desinstalar: ejecuta Desinstalar-AgentePOS.ps1"
)
Set-Content -Path (Join-Path $installDir "LEEME.txt") -Value $leeme -Encoding UTF8

Write-Host ""
if ($null -eq $estado) {
    Write-Host "El agente no respondio en la verificacion." -ForegroundColor Yellow
    Write-Host "Revisa el log: $logPath" -ForegroundColor Yellow
    if (-not [string]::IsNullOrWhiteSpace($errorPrueba)) {
        Write-Host "Detalle: $errorPrueba" -ForegroundColor DarkYellow
    }
    exit 1
}

Write-Host "Agente instalado y funcionando (v$($estado.version))." -ForegroundColor Green
if ($estado.printer) {
    Write-Host "Impresora: $($estado.printer)"
} else {
    Write-Host "Falta elegir impresora: abri el panel y toca 'Usar en el agente'." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Token (tambien en LEEME.txt):" -ForegroundColor Cyan
Write-Host $token -ForegroundColor White
Write-Host ""
Write-Host "PANEL: http://127.0.0.1:$Puerto/panel" -ForegroundColor Cyan
Write-Host "(tambien se abre con doble clic en el icono de la bandeja)"
Write-Host ""
