# ─────────────────────────────────────────────────────
# scripts/publicar-agente.ps1
# Compila el agente de impresión y publica el binario + manifiesto
# en public/agente/. El manifiesto lo lee la web para mostrar la
# versión disponible y lo usa el agente para autoactualizarse.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\scripts\publicar-agente.ps1
#   powershell -ExecutionPolicy Bypass -File .\scripts\publicar-agente.ps1 -Notas "Corrige..."
#
# Después de ejecutarlo, commitear public/agente/ y desplegar.
# ─────────────────────────────────────────────────────

[CmdletBinding()]
param(
    [string]$Notas = "Actualizacion del agente de impresion."
)

$ErrorActionPreference = "Stop"

$raiz = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$fuente = Join-Path $raiz "agente-impresion\ChefsyPrintAgent.cs"
$destinoDir = Join-Path $raiz "public\agente"
$exe = Join-Path $destinoDir "ChefsyPrintAgent.exe"
$manifiesto = Join-Path $destinoDir "version.json"

if (-not (Test-Path $fuente)) {
    throw "No se encontró $fuente"
}

$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) {
    $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe"
}
if (-not (Test-Path $csc)) {
    throw "No se encontró el compilador de .NET Framework 4."
}

$textoFuente = Get-Content $fuente -Raw
$versionMatch = [regex]::Match($textoFuente, 'Version\s*=\s*"([0-9]+\.[0-9]+\.[0-9]+)"')
if (-not $versionMatch.Success) {
    throw "No se pudo leer la versión del agente en ChefsyPrintAgent.cs"
}
$version = $versionMatch.Groups[1].Value

New-Item -ItemType Directory -Force -Path $destinoDir | Out-Null

Write-Host "Compilando v$version..." -ForegroundColor Cyan
& $csc /nologo /target:winexe /optimize+ /r:System.dll /r:System.Core.dll /r:System.Web.Extensions.dll /out:"$exe" "$fuente"
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $exe)) {
    throw "Falló la compilación del agente."
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

Write-Host ""
Write-Host "Agente publicado:" -ForegroundColor Green
Write-Host "  Versión:  $version"
Write-Host "  Archivo:  $exe ($bytes bytes)"
Write-Host "  SHA-256:  $hash"
Write-Host "  Manifiesto: $manifiesto"
Write-Host ""
Write-Host "Siguiente paso: commitear public/agente/ y desplegar en Vercel." -ForegroundColor Yellow
Write-Host "El agente descarga desde https://chefsy.xyz/agente/ChefsyPrintAgent.exe" -ForegroundColor Yellow
