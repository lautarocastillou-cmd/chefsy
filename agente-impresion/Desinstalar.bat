@echo off
title Desinstalador Chefsy Print Agent
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\Desinstalar-AgenteImpresion.ps1" %*
pause
