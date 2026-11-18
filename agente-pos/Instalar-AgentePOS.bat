@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "& { .\Instalar-AgentePOS.ps1 %* }"
