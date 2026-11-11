@echo off
title Instalador Chefsy Print Agent
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\Instalar-AgenteImpresion.ps1" %*
pause
