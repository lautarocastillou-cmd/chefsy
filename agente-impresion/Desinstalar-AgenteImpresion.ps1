# Desinstalador del agente local de impresion Chefsy.
# Detiene el proceso, quita el arranque automatico y borra la carpeta instalada.

$ErrorActionPreference = "Stop"
$installDir = Join-Path $env:LOCALAPPDATA "ChefsyPrintAgent"
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup "Chefsy Print Agent.lnk"

Write-Host ""
Write-Host "Chefsy Print Agent - desinstalador" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

Get-Process -Name "ChefsyPrintAgent" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

if (Test-Path $shortcutPath) {
    Remove-Item -Path $shortcutPath -Force
    Write-Host "Arranque automatico eliminado."
}

if (Test-Path $installDir) {
    Remove-Item -Path $installDir -Recurse -Force
    Write-Host "Carpeta del agente eliminada: $installDir"
}

Write-Host ""
Write-Host "Listo. El agente ya no esta instalado." -ForegroundColor Green
Write-Host "Si Chefsy lo tenia activado en esta PC, desactivalo en Configuracion -> Impresion -> Agente local."
Write-Host ""
