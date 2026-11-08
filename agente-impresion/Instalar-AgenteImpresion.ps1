# Instalador del agente local de impresion Chefsy.
# Compila un ejecutable chico con el compilador que ya trae Windows,
# lo deja en %LOCALAPPDATA%\ChefsyPrintAgent y lo arranca al iniciar sesion.
# No requiere permisos de administrador y no usa Node.

[CmdletBinding()]
param(
    [int]$Puerto = 0,
    [string]$Impresora = ""
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$installDir = Join-Path $env:LOCALAPPDATA "ChefsyPrintAgent"
$exePath = Join-Path $installDir "ChefsyPrintAgent.exe"
$configPath = Join-Path $installDir "config.ini"
$logPath = Join-Path $installDir "agent.log"
$sourcePath = Join-Path $scriptDir "ChefsyPrintAgent.cs"

function Fallar([string]$texto) {
    Write-Host ""
    Write-Host $texto -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Chefsy Print Agent - instalador" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

if (-not (Test-Path $sourcePath)) {
    Fallar "No se encontro ChefsyPrintAgent.cs junto a este instalador."
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
    if ($puertoActual -gt 0) { $Puerto = $puertoActual } else { $Puerto = 9187 }
}
if ($Puerto -lt 1 -or $Puerto -gt 65535) {
    Fallar "El puerto indicado no es valido."
}
if ([string]::IsNullOrWhiteSpace($Impresora)) {
    $Impresora = $impresoraActual
}

# Detener una instancia anterior antes de reemplazar el ejecutable.
Get-Process -Name "ChefsyPrintAgent" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

Write-Host "Compilando agente..."
& $csc /nologo /target:winexe /optimize+ /r:System.dll /r:System.Core.dll /out:"$exePath" "$sourcePath"
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
    "# Configuracion del agente de impresion Chefsy",
    "# No compartas este archivo: contiene el token de acceso.",
    "puerto=$Puerto",
    "token=$token",
    "impresora=$Impresora"
)
Set-Content -Path $configPath -Value $lineas -Encoding UTF8

# Arranque automatico al iniciar sesion, sin admin.
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup "Chefsy Print Agent.lnk"
$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exePath
$shortcut.WorkingDirectory = $installDir
$shortcut.WindowStyle = 1
$shortcut.Description = "Chefsy Print Agent"
$shortcut.Save()

try {
    Start-Process -FilePath $exePath -WorkingDirectory $installDir
} catch {
    Fallar "El agente se compilo pero no se pudo iniciar: $($_.Exception.Message)"
}

# Verificar que responda. Si no hay impresora predeterminada, el agente
# igual queda instalado y lo informa; se puede configurar despues.
$estado = $null
$errorPrueba = ""
for ($i = 0; $i -lt 12; $i++) {
    Start-Sleep -Milliseconds 250
    try {
        $estado = Invoke-RestMethod -Uri "http://127.0.0.1:$Puerto/health" -Headers @{ "X-Chefsy-Token" = $token } -TimeoutSec 2
        break
    } catch {
        $errorPrueba = $_.Exception.Message
    }
}

$leeme = @(
    "CHEFSY PRINT AGENT",
    "",
    "Puerto: $Puerto",
    "Token: $token",
    "Impresora configurada: $(if ([string]::IsNullOrWhiteSpace($Impresora)) { 'predeterminada de Windows' } else { $Impresora })",
    "",
    "En Chefsy: Configuracion -> Impresion -> Agente local.",
    "Activa el interruptor, pega la URL http://127.0.0.1:$Puerto y este token.",
    "Si Chrome o Edge pide permiso para acceder a la red local, elegi Permitir.",
    "",
    "Log: $logPath",
    "Para desinstalar: ejecuta Desinstalar-AgenteImpresion.ps1"
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

if ($estado.ok) {
    Write-Host "Agente instalado y funcionando." -ForegroundColor Green
    Write-Host "Impresora: $($estado.printer)"
} else {
    Write-Host "Agente instalado, pero falta configurar la impresora." -ForegroundColor Yellow
    Write-Host "Detalle: $($estado.error)" -ForegroundColor DarkYellow
    Write-Host "Podes indicar el nombre exacto al reinstalar:"
    Write-Host "  .\Instalar-AgenteImpresion.ps1 -Impresora `"NOMBRE EXACTO`""
}

Write-Host ""
Write-Host "Token para configurar en Chefsy:" -ForegroundColor Cyan
Write-Host $token -ForegroundColor White
Write-Host ""
Write-Host "URL del agente: http://127.0.0.1:$Puerto"
Write-Host "Tambien quedo guardado en: $(Join-Path $installDir 'LEEME.txt')"
Write-Host ""
Write-Host "Siguiente paso: Chefsy -> Configuracion -> Impresion -> Agente local."
Write-Host "Activa el interruptor, pega la URL y el token, y toca 'Probar agente'."
Write-Host ""
