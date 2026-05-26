# Cierra servidores viejos en 3000/3001, borra .next y arranca dev.
$puertos = 3000, 3001

foreach ($puerto in $puertos) {
  $conexiones = Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conexiones) {
    if ($c.OwningProcess -and $c.OwningProcess -ne 0) {
      Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  }
}

Start-Sleep -Seconds 2

if (Test-Path .next) {
  Remove-Item -Recurse -Force .next
  Write-Host "Carpeta .next eliminada."
}

npm run dev
