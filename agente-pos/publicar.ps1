# ─────────────────────────────────────────────────────
# agente-pos/publicar.ps1
# Compila el ejecutable portable y arma el paquete de distribucion
# en agente-pos/dist/: AgentePOS.exe + version.json (manifiesto con
# SHA-256 para un futuro servidor de auto-actualizacion).
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\publicar.ps1
#   powershell -ExecutionPolicy Bypass -File .\publicar.ps1 -Notas "Corrige..."
# ─────────────────────────────────────────────────────

[CmdletBinding()]
param(
    [string]$Notas = "Publicacion de Agente POS."
)

$ErrorActionPreference = "Stop"

$raiz = Split-Path -Parent $MyInvocation.MyCommand.Path
$srcDir = Join-Path $raiz "src"
$destinoDir = Join-Path $raiz "dist"
$exe = Join-Path $destinoDir "AgentePOS.exe"
$manifiesto = Join-Path $destinoDir "version.json"

$srcs = Get-ChildItem (Join-Path $srcDir "*.cs")
if (-not $srcs) {
    throw "No hay fuentes en $srcDir"
}

$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (-not (Test-Path $csc)) {
    throw "No se encontro el compilador de .NET Framework 4."
}

# Leer la version desde Estado.Version en Program.cs.
$textoFuente = ""
foreach ($archivo in $srcs) {
    $textoFuente += (Get-Content $archivo.FullName -Raw)
}
$versionMatch = [regex]::Match($textoFuente, 'Version\s*=\s*"([0-9]+\.[0-9]+\.[0-9]+)"')
if (-not $versionMatch.Success) {
    throw "No se pudo leer la version en Estado.Version."
}
$version = $versionMatch.Groups[1].Value

New-Item -ItemType Directory -Force -Path $destinoDir | Out-Null

Write-Host "Compilando v$version..." -ForegroundColor Cyan
$fuentes = $srcs | ForEach-Object FullName
& $csc /nologo /target:winexe /optimize+ /r:System.dll /r:System.Core.dll /r:System.Web.Extensions.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll /out:"$exe" $fuentes
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $exe)) {
    throw "Fallo la compilacion del agente."
}

$hash = (Get-FileHash $exe -Algorithm SHA256).Hash.ToLowerInvariant()
$bytes = (Get-Item $exe).Length

$datos = [ordered]@{
    version = $version
    sha256  = $hash
    bytes   = $bytes
    fecha   = (Get-Date).ToUniversalTime().ToString("o")
    notas   = $Notas
}

$json = $datos | ConvertTo-Json
[IO.File]::WriteAllText($manifiesto, $json, (New-Object System.Text.UTF8Encoding($false)))

# LEEME para distribucion por pendrive / descarga directa.
$leeme = "AGENTE POS v$version`n`nEjecutable portable: no requiere instalacion ni .NET adicional (usa el que trae Windows).`nDoble clic: queda en la bandeja. Panel: http://127.0.0.1:9191/panel`nInstalacion recomendada: Instalar-AgentePOS.ps1 (repo)."
[IO.File]::WriteAllText((Join-Path $destinoDir "LEEME.txt"), $leeme, (New-Object System.Text.UTF8Encoding($false)))

Write-Host ""
Write-Host "Paquete de distribucion:" -ForegroundColor Green
Write-Host "  Version:  $version"
Write-Host "  Archivo:  $exe ($bytes bytes)"
Write-Host "  SHA-256:  $hash"
Write-Host "  Manifiesto: $manifiesto"
Write-Host ""
Write-Host "Para actualizar agentes ya instalados, subi dist/ a tu servidor" -ForegroundColor Yellow
Write-Host "y defini origen_actualizacion en config.ini del cliente." -ForegroundColor Yellow
