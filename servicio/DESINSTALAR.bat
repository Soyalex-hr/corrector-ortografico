@echo off
title Desinstalar corrector local (LanguageTool)
net session >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Este desinstalador necesita permisos de administrador.
  echo  Cierra esta ventana, haz clic derecho en DESINSTALAR.bat
  echo  y elige "Ejecutar como administrador".
  echo.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0desinstalar-servicio.ps1"
echo.
pause
