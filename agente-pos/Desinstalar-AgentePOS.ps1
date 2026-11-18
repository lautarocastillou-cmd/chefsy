# Desinstalador de Agente POS.
# Detiene el agente, borra el arranque automatico y elimina la carpeta.

$ErrorActionPreference = "Continue"
$installDir = Join-Path $env:LOCALAPPDATA "AgentePOS"

Write-Host ""
Write-Host "Agente POS - desinstalador" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

Get-Process -Name "AgentePOS" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

# Acceso directo del menu inicio.
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup "Agente POS.lnk"
if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "Acceso directo de inicio eliminado."
}

# Entrada del registro Run (si se activo desde la bandeja).
try {
    $clave = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey("Software\Microsoft\Windows\CurrentVersion\Run", $true)
    if ($clave -and $clave.GetValue("AgentePOS")) {
        $clave.DeleteValue("AgentePOS")
        Write-Host "Inicio automatico con Windows eliminado."
    }
} catch { }

if (Test-Path $installDir) {
    Remove-Item $installDir -Recurse -Force
    Write-Host "Carpeta eliminada: $installDir"
} else {
    Write-Host "No habia carpeta de instalacion."
}

Write-Host ""
Write-Host "Agente POS desinstalado." -ForegroundColor Green
Write-Host ""
